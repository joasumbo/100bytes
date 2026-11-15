import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { WinmaxClient } from './winmax.client';

type Modo = 'full' | 'incremental';
type Origem = 'schedule' | 'manual';

/**
 * Conector Winmax → base de dados do site.
 *
 * - Completa: armazéns, terminais, famílias e todos os artigos (páginas de 50).
 *   Artigos que deixam de vir ficam com present = false.
 * - Incremental: só artigos alterados desde a última sincronização bem
 *   sucedida (filtro LastChangeDateAfter), com margem de segurança.
 *
 * Não toca nos produtos do site (tabela products): escreve só nas tabelas winmax_*.
 *
 * Agenda (variáveis de ambiente, em minutos):
 *   WINMAX_SYNC_ENABLED=false            desliga a agenda (a manual continua)
 *   WINMAX_SYNC_INTERVAL_MIN=5           incremental
 *   WINMAX_FULL_SYNC_INTERVAL_MIN=30     completa
 */
@Injectable()
export class WinmaxSyncService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly log = new Logger('WinmaxSync');
  private aCorrer: Promise<unknown> | null = null;
  private timers: NodeJS.Timeout[] = [];

  constructor(
    private readonly prisma: PrismaService,
    private readonly winmax: WinmaxClient,
    private readonly config: ConfigService,
  ) {}

  get running() {
    return this.aCorrer !== null;
  }

  // ─── Agenda ──────────────────────────────────────────────────────────────

  async onApplicationBootstrap() {
    // Execuções interrompidas por um restart ficam marcadas como erro
    await this.prisma.winmaxSyncRun.updateMany({
      where: { status: 'running' },
      data: {
        status: 'error',
        error: 'Interrompida (reinício do servidor)',
        finishedAt: new Date(),
      },
    });

    if (!this.winmax.configured) {
      this.log.warn('Credenciais WINMAX_* em falta: conector desligado.');
      return;
    }
    if (
      String(this.config.get('WINMAX_SYNC_ENABLED') ?? 'true').toLowerCase() ===
      'false'
    ) {
      this.log.log('Agenda desligada (WINMAX_SYNC_ENABLED=false).');
      return;
    }

    const min = (k: string, def: number) =>
      Math.max(1, Number(this.config.get(k)) || def) * 60_000;
    const inc = min('WINMAX_SYNC_INTERVAL_MIN', 5);
    const full = min('WINMAX_FULL_SYNC_INTERVAL_MIN', 30);

    this.timers.push(setTimeout(() => this.agendada('full'), 20_000));
    this.timers.push(setInterval(() => this.agendada('incremental'), inc));
    this.timers.push(setInterval(() => this.agendada('full'), full));
    this.log.log(
      `Agenda ativa: incremental a cada ${inc / 60_000} min, completa a cada ${full / 60_000} min.`,
    );
  }

  onApplicationShutdown() {
    this.timers.forEach((t) => clearTimeout(t));
  }

  private agendada(modo: Modo) {
    // start() devolve null se já houver uma execução: não se sobrepõem
    this.start(modo, 'schedule')?.catch(() => undefined);
  }

  // ─── Execução ────────────────────────────────────────────────────────────

  /** Inicia uma sincronização. Devolve null se já houver uma a correr. */
  start(modo: Modo, origem: Origem): Promise<{ id: string }> | null {
    if (this.running) return null;
    const p = this.executar(modo, origem).finally(() => (this.aCorrer = null));
    this.aCorrer = p;
    return p;
  }

  private async executar(pedido: Modo, origem: Origem) {
    // A incremental precisa de uma completa anterior; sem ela, faz completa
    const ultimaOk = await this.prisma.winmaxSyncRun.findFirst({
      where: { status: 'ok' },
      orderBy: { startedAt: 'desc' },
    });
    const modo: Modo = pedido === 'incremental' && !ultimaOk ? 'full' : pedido;

    const run = await this.prisma.winmaxSyncRun.create({
      data: { mode: modo, trigger: origem },
    });
    const t0 = Date.now();
    try {
      let artigos = 0;
      let paginas = 0;

      if (modo === 'full') {
        await this.syncWarehouses();
        await this.syncTerminals();
        await this.syncFamilies();
        const vistos = new Set<string>();
        ({ artigos, paginas } = await this.syncArtigos(undefined, vistos));
        if (vistos.size > 0) {
          await this.prisma.winmaxArticle.updateMany({
            where: { code: { notIn: [...vistos] }, present: true },
            data: { present: false },
          });
        }
      } else {
        // Margem de 2 h: cobre diferenças de fuso horário do servidor Winmax.
        // Reprocessar artigos é inofensivo (upsert).
        const desde = new Date(
          ultimaOk!.startedAt.getTime() - 2 * 60 * 60 * 1000,
        );
        ({ artigos, paginas } = await this.syncArtigos(desde));
      }

      await this.prisma.winmaxSyncRun.update({
        where: { id: run.id },
        data: {
          status: 'ok',
          articles: artigos,
          pages: paginas,
          finishedAt: new Date(),
        },
      });
      if (modo === 'full' || artigos > 0) {
        this.log.log(
          `Sincronização ${modo} ok: ${artigos} artigos em ${((Date.now() - t0) / 1000).toFixed(1)} s.`,
        );
      }
      await this.limparHistorico();
    } catch (e: any) {
      this.log.error(`Sincronização ${modo} falhou: ${e?.message ?? e}`);
      await this.prisma.winmaxSyncRun.update({
        where: { id: run.id },
        data: {
          status: 'error',
          error: String(e?.message ?? e).slice(0, 1000),
          finishedAt: new Date(),
        },
      });
    }
    return { id: run.id };
  }

  // ─── Passos ──────────────────────────────────────────────────────────────

  private async syncArtigos(desde?: Date, vistos?: Set<string>) {
    let pagina = 1;
    let total = 1;
    let artigos = 0;
    do {
      const r = await this.winmax.getArticles({
        page: pagina,
        changedAfter: desde,
      });
      total = r.totalPages;
      if (r.items.length > 0) {
        await this.gravarArtigos(r.items);
        artigos += r.items.length;
        r.items.forEach((a) => vistos?.add(String(a.ArticleCode)));
      }
      pagina++;
    } while (pagina <= total);
    return { artigos, paginas: total };
  }

  private async gravarArtigos(items: any[]) {
    const agora = new Date();
    const ops = items.flatMap((a) => {
      const code = String(a.ArticleCode);
      const preco = escolherPreco(a.Prices?.Price ?? []);
      const stocks: {
        warehouseCode: number;
        quantity: number;
        location: string | null;
      }[] = (a.Stocks?.Stock ?? []).map((s: any) => ({
        warehouseCode: Number(s.WarehouseCode),
        quantity: num(s.CurrentStock) ?? 0,
        location: s.Location ? String(s.Location) : null,
      }));
      // Armazém 0 = total calculado pelo Winmax; se faltar, soma os restantes
      const total =
        stocks.find((s) => s.warehouseCode === 0)?.quantity ??
        stocks.reduce((t, s) => t + s.quantity, 0);

      const dados = {
        designation: String(a.Designation ?? ''),
        familyCode: str(a.FamilyCode),
        subFamilyCode: str(a.SubFamilyCode),
        subSubFamilyCode: str(a.SubSubFamilyCode),
        subSubSubFamilyCode: str(a.SubSubSubFamilyCode),
        sellUnit: str(a.SellUnitCode),
        saftType: str(a.SAFTType),
        currency: str(preco?.CurrencyCode),
        priceWithTax: num(preco?.SalesPrice1WithTaxesFees),
        priceWithoutTax: num(preco?.SalesPrice1WithoutTaxesFees),
        costPrice: num(preco?.NetCostPrice),
        stockTotal: total,
        imageUrl: str(a.ImageHTTPPath),
        lastSellDate: data(a.LastSellDate),
        lastPurchaseDate: data(a.LastPurchaseDate),
        present: true,
        syncedAt: agora,
      };

      return [
        this.prisma.winmaxArticle.upsert({
          where: { code },
          create: { code, ...dados },
          update: dados,
        }),
        this.prisma.winmaxStock.deleteMany({ where: { articleCode: code } }),
        this.prisma.winmaxStock.createMany({
          data: stocks
            .filter((s) => s.warehouseCode !== 0)
            .map((s) => ({ articleCode: code, ...s })),
        }),
      ];
    });
    await this.prisma.$transaction(ops);
  }

  private async syncWarehouses() {
    const lista = await this.winmax.getWarehouses();
    const agora = new Date();
    await this.prisma.$transaction(
      lista.map((w) =>
        this.prisma.winmaxWarehouse.upsert({
          where: { code: w.code },
          create: { ...w, syncedAt: agora },
          update: { name: w.name, syncedAt: agora },
        }),
      ),
    );
  }

  private async syncTerminals() {
    const lista = await this.winmax.getTerminals();
    const agora = new Date();
    await this.prisma.$transaction(
      lista.map((t) =>
        this.prisma.winmaxTerminal.upsert({
          where: { code: t.code },
          create: { ...t, syncedAt: agora },
          update: { name: t.name, syncedAt: agora },
        }),
      ),
    );
  }

  private async syncFamilies() {
    const linhas: {
      id: string;
      level: number;
      code: string;
      name: string;
      parentId: string | null;
    }[] = [];
    const niveis = ['SubFamilies', 'SubSubFamilies', 'SubSubSubFamilies'];
    const filhos = ['SubFamily', 'SubSubFamily', 'SubSubSubFamily'];

    const visitar = (no: any, nivel: number, pai: string | null) => {
      const id = pai ? `${pai}.${no.Code}` : String(no.Code);
      linhas.push({
        id,
        level: nivel + 1,
        code: String(no.Code),
        name: String(no.Designation ?? ''),
        parentId: pai,
      });
      if (nivel < 3)
        (no[niveis[nivel]]?.[filhos[nivel]] ?? []).forEach((f: any) =>
          visitar(f, nivel + 1, id),
        );
    };

    let pagina = 1;
    let total = 1;
    do {
      const r = await this.winmax.getFamilies(pagina);
      total = r.totalPages || 1;
      r.items.forEach((f) => visitar(f, 0, null));
      pagina++;
    } while (pagina <= total);

    const agora = new Date();
    await this.prisma.$transaction([
      this.prisma.winmaxFamily.deleteMany({}),
      this.prisma.winmaxFamily.createMany({
        data: linhas.map((l) => ({ ...l, syncedAt: agora })),
      }),
    ]);
  }

  /** Mantém só as 500 execuções mais recentes. */
  private async limparHistorico() {
    const antigas = await this.prisma.winmaxSyncRun.findMany({
      orderBy: { startedAt: 'desc' },
      skip: 500,
      select: { id: true },
    });
    if (antigas.length)
      await this.prisma.winmaxSyncRun.deleteMany({
        where: { id: { in: antigas.map((r) => r.id) } },
      });
  }
}

/** Preço da tabela 1 em kwanzas, grupo A; senão o primeiro disponível. */
function escolherPreco(precos: any[]) {
  return (
    precos.find(
      (p) => p.CurrencyCode === 'AOA' && (p.GroupPrice ?? 'A') === 'A',
    ) ??
    precos.find((p) => p.CurrencyCode === 'AOA') ??
    precos[0]
  );
}

function num(v: unknown): number | null {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function str(v: unknown): string | null {
  return v === undefined || v === null || v === '' ? null : String(v);
}

function data(v: unknown): Date | null {
  if (!v) return null;
  const d = new Date(String(v).length === 10 ? `${v}T00:00:00Z` : String(v));
  return isNaN(d.getTime()) ? null : d;
}
