import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { PushService, kz, luanda } from './push.service';

/**
 * Automações das notificações (correm a cada 5 minutos, sem se sobreporem):
 *  - Produto do dia (dias de semana configuráveis, à hora definida)
 *  - Feriados de Angola (substituem o produto do dia)
 *  - Carrinho abandonado (pôs no carrinho e não finalizou)
 *  - Interesse por categoria (viu vários produtos da mesma categoria)
 *  - Campanhas agendadas no admin
 * As de marketing respeitam o limite por aparelho e o horário permitido.
 */

const DIAS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

/** Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher) */
function pascoa(ano: number) {
  const a = ano % 19, b = Math.floor(ano / 100), c = ano % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(ano, mes - 1, dia));
}
const somar = (d: Date, dias: number) => new Date(d.getTime() + dias * 86400000).toISOString().slice(0, 10);

/** Feriados nacionais de Angola com a mensagem a enviar (null = data a respeitar, sem mensagem) */
export function feriados(ano: number): Record<string, { nome: string; titulo: string; corpo: string } | null> {
  const p = pascoa(ano);
  const d = (mm: number, dd: number) => `${ano}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
  return {
    [d(1, 1)]: { nome: 'Ano Novo', titulo: 'Feliz Ano Novo', corpo: 'A equipa da 100 bytes deseja-lhe um excelente ano. Conte connosco em ' + ano + '.' },
    [d(2, 4)]: { nome: 'Dia do Início da Luta Armada', titulo: '4 de Fevereiro', corpo: 'Celebramos o Dia do Início da Luta Armada de Libertação Nacional.' },
    [somar(p, -47)]: { nome: 'Carnaval', titulo: 'Bom Carnaval', corpo: 'Aproveite o dia. Quando voltar, as novidades da semana esperam por si na 100 bytes.' },
    [d(3, 8)]: { nome: 'Dia Internacional da Mulher', titulo: 'Feliz Dia da Mulher', corpo: 'Hoje celebramos todas as mulheres. Veja ideias de presente na 100 bytes.' },
    [d(3, 23)]: { nome: 'Dia da Libertação da África Austral', titulo: '23 de Março', corpo: 'Celebramos o Dia da Libertação da África Austral.' },
    [d(4, 4)]: { nome: 'Dia da Paz', titulo: 'Feliz Dia da Paz', corpo: 'Celebramos o Dia da Paz e da Reconciliação Nacional.' },
    [somar(p, -2)]: null, // Sexta-feira Santa
    [d(5, 1)]: { nome: 'Dia do Trabalhador', titulo: 'Feliz Dia do Trabalhador', corpo: 'Obrigado a todos os que constroem Angola todos os dias. Equipe o seu trabalho na 100 bytes.' },
    [d(9, 17)]: { nome: 'Dia do Herói Nacional', titulo: '17 de Setembro', corpo: 'Celebramos o Dia do Fundador da Nação e do Herói Nacional.' },
    [d(11, 2)]: null, // Dia dos Finados
    [d(11, 11)]: { nome: 'Dia da Independência', titulo: 'Feliz Dia da Independência', corpo: 'Celebramos Angola. Veja as novidades da semana na 100 bytes.' },
    [d(12, 25)]: { nome: 'Natal', titulo: 'Feliz Natal', corpo: 'A equipa da 100 bytes deseja-lhe um Feliz Natal, com saúde e alegria.' },
  };
}

@Injectable()
export class PushAutomacoesService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly log = new Logger('PushAutomacoes');
  private timer: NodeJS.Timeout | null = null;
  private aCorrer = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
    private readonly config: ConfigService,
  ) {}

  onApplicationBootstrap() {
    if (String(this.config.get('PUSH_AUTOMACOES') ?? 'true').toLowerCase() === 'false') {
      this.log.log('Automações desligadas (PUSH_AUTOMACOES=false).');
      return;
    }
    this.timer = setInterval(() => this.ciclo().catch((e) => this.log.warn('Ciclo falhou: ' + e?.message)), 5 * 60 * 1000);
    setTimeout(() => this.ciclo().catch(() => undefined), 60 * 1000);
  }

  onApplicationShutdown() {
    if (this.timer) clearInterval(this.timer);
  }

  async ciclo() {
    if (!this.push.ativo || this.aCorrer) return;
    this.aCorrer = true;
    try {
      const def = await this.push.definicoes();
      const agora = luanda();
      await this.campanhasAgendadas();
      if (agora.hora >= def.horaDiario) await this.diarioOuFeriado(def, agora);
      if (agora.hora >= def.inicio && agora.hora < def.fim) {
        if (def.carrinho) await this.carrinhos(def);
        if (def.interesse) await this.interesse(def);
      }
    } finally {
      this.aCorrer = false;
    }
  }

  private async ativas() {
    return this.prisma.pushSubscription.findMany({ where: { active: true } });
  }

  // ── Produto do dia / feriado ──
  private async diarioOuFeriado(def: Awaited<ReturnType<PushService['definicoes']>>, agora: ReturnType<typeof luanda>) {
    const lista = feriados(agora.ano);
    if (agora.data in lista) {
      const f = lista[agora.data];
      if (!f || !def.feriados || agora.hora >= def.fim) return;
      const subs = await this.push.semMarketingRecente(await this.ativas(), def.limiteHoras);
      if (!subs.length) return; // sem aparelhos: tenta no próximo ciclo
      if (!(await this.push.marcarFeito('feriado:' + agora.data))) return;
      const n = await this.push.enviar(subs, 'feriado', { titulo: f.titulo, corpo: f.corpo, url: '/novidades', ref: agora.data, tag: 'feriado' });
      this.log.log(`Feriado (${f.nome}): ${n} enviadas.`);
      return;
    }
    if (!def.diario || !def.diasDiario.includes(agora.diaSemana) || agora.hora >= def.fim) return;
    const subs = await this.push.semMarketingRecente(await this.ativas(), def.limiteHoras);
    if (!subs.length) return; // sem aparelhos: tenta no próximo ciclo
    const p = await this.produtoDoDia(agora.diaSemana);
    if (!p) return;
    if (!(await this.push.marcarFeito('diario:' + agora.data))) return;
    const info = this.push.produtoInfo(p);
    const preco = kz(p.salePrice ?? p.basePrice);
    const dia = DIAS[agora.diaSemana];
    const frases: Record<number, string> = {
      1: `Segunda-feira com novidade: ${p.name} por ${preco}.`,
      2: `Terça-feira chegou e o ${p.name} está ao melhor preço na 100 bytes: ${preco}.`,
      3: `A meio da semana, ${p.name} por ${preco}. Disponível na 100 bytes.`,
      4: `Quinta-feira é dia de ${p.category?.name ?? 'novidades'}: ${p.name} por ${preco}.`,
      5: `Sexta-feira chegou! Leve o ${p.name} por ${preco} e comece bem o fim de semana.`,
      6: `Sábado é bom para equipar a casa ou o escritório: ${p.name} por ${preco}.`,
      0: `Domingo tranquilo? Veja o ${p.name} por ${preco} na 100 bytes.`,
    };
    const n = await this.push.enviar(subs, 'diario', { titulo: dia + ' na 100 bytes', corpo: frases[agora.diaSemana], url: info.url, imagem: info.imagem, ref: p.id, tag: 'diario' });
    this.log.log(`Produto do dia (${p.name}): ${n} enviadas.`);
  }

  /** Categoria rodada pelo dia da semana (entre as com mais stock); produto não repetido nos últimos 30 dias */
  private async produtoDoDia(diaSemana: number) {
    const cats = await this.prisma.product.groupBy({
      by: ['categoryId'],
      where: { active: true, stock: { gt: 0 }, categoryId: { not: null }, imageKeys: { isEmpty: false } },
      _sum: { stock: true },
      orderBy: { _sum: { stock: 'desc' } },
      take: 7,
    });
    if (!cats.length) return null;
    const recentes = await this.prisma.pushSend.findMany({
      where: { kind: 'diario', sentAt: { gte: new Date(Date.now() - 30 * 86400000) } },
      select: { ref: true },
      distinct: ['ref'],
    });
    const evitar = recentes.map((r) => r.ref).filter(Boolean) as string[];
    for (let k = 0; k < cats.length; k++) {
      const cat = cats[(diaSemana + k) % cats.length];
      const p = await this.prisma.product.findFirst({
        where: { active: true, stock: { gt: 0 }, categoryId: cat.categoryId, imageKeys: { isEmpty: false }, id: { notIn: evitar } },
        orderBy: [{ createdAt: 'desc' }],
        select: { id: true, name: true, slug: true, imageKeys: true, basePrice: true, salePrice: true, category: { select: { slug: true, name: true } } },
      });
      if (p) return p;
    }
    return null;
  }

  // ── Carrinho abandonado ──
  private async carrinhos(def: Awaited<ReturnType<PushService['definicoes']>>) {
    const ate = new Date(Date.now() - def.carrinhoHoras * 3600 * 1000);
    const desde = new Date(Date.now() - 48 * 3600 * 1000);
    const adicoes = await this.prisma.event.findMany({
      where: { type: 'add_to_cart', createdAt: { gte: desde } },
      select: { sessionId: true, productId: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    if (!adicoes.length) return;
    // por sessão: a última adição e os produtos
    const porSessao = new Map<string, { ultima: Date; produtos: string[] }>();
    for (const a of adicoes) {
      const s = porSessao.get(a.sessionId) || { ultima: a.createdAt, produtos: [] };
      if (a.productId && !s.produtos.includes(a.productId)) s.produtos.push(a.productId);
      porSessao.set(a.sessionId, s);
    }
    const candidatas = [...porSessao.entries()].filter(([, s]) => s.ultima <= ate).map(([id]) => id);
    if (!candidatas.length) return;
    const compras = await this.prisma.event.findMany({
      where: { type: 'purchase', sessionId: { in: candidatas }, createdAt: { gte: desde } },
      select: { sessionId: true, createdAt: true },
    });
    const subs = await this.prisma.pushSubscription.findMany({ where: { active: true, sessionId: { in: candidatas } } });
    const ja = await this.prisma.pushSend.findMany({
      where: { kind: 'carrinho', subscriptionId: { in: subs.map((s) => s.id) }, sentAt: { gte: new Date(Date.now() - 72 * 3600 * 1000) } },
      select: { subscriptionId: true },
    });
    const jaSet = new Set(ja.map((j) => j.subscriptionId));
    const livres = await this.push.semMarketingRecente(subs.filter((s) => !jaSet.has(s.id)), def.limiteHoras);
    let n = 0;
    for (const sub of livres) {
      const s = porSessao.get(sub.sessionId!);
      if (!s) continue;
      if (compras.some((c) => c.sessionId === sub.sessionId && c.createdAt >= s.ultima)) continue; // já comprou
      const p = await this.prisma.product.findFirst({
        where: { id: { in: s.produtos }, active: true },
        select: { id: true, name: true, slug: true, imageKeys: true, category: { select: { slug: true } } },
      });
      if (!p) continue;
      const mais = s.produtos.length - 1;
      n += await this.push.enviar([sub], 'carrinho', {
        titulo: 'Ainda está a pensar?',
        corpo: `O ${p.name}${mais > 0 ? ` e mais ${mais} ${mais === 1 ? 'artigo' : 'artigos'}` : ''} continua no seu carrinho. Finalize quando quiser.`,
        url: '/checkout',
        imagem: this.push.produtoInfo(p).imagem,
        ref: sub.sessionId,
        tag: 'carrinho',
      });
    }
    if (n) this.log.log(`Carrinhos abandonados: ${n} enviadas.`);
  }

  // ── Interesse por categoria ──
  private async interesse(def: Awaited<ReturnType<PushService['definicoes']>>) {
    const ate = new Date(Date.now() - def.interesseHoras * 3600 * 1000);
    const desde = new Date(Date.now() - 24 * 3600 * 1000);
    const subs = await this.prisma.pushSubscription.findMany({ where: { active: true, sessionId: { not: null } } });
    if (!subs.length) return;
    const sessoes = subs.map((s) => s.sessionId!) ;
    const vistas = await this.prisma.event.findMany({
      where: { type: 'view', sessionId: { in: sessoes }, productId: { not: null }, createdAt: { gte: desde } },
      select: { sessionId: true, productId: true, createdAt: true },
    });
    if (!vistas.length) return;
    const prods = await this.prisma.product.findMany({
      where: { id: { in: [...new Set(vistas.map((v) => v.productId!))] } },
      select: { id: true, categoryId: true },
    });
    const catDe = new Map(prods.map((p) => [p.id, p.categoryId]));
    const livres = await this.push.semMarketingRecente(subs, def.limiteHoras);
    let n = 0;
    for (const sub of livres) {
      const minhas = vistas.filter((v) => v.sessionId === sub.sessionId);
      if (!minhas.length) continue;
      const ultima = minhas.reduce((m, v) => (v.createdAt > m ? v.createdAt : m), minhas[0].createdAt);
      if (ultima > ate) continue; // ainda há pouco tempo
      // categoria mais vista (pelo menos 2 vistas)
      const conta = new Map<string, number>();
      minhas.forEach((v) => { const c = catDe.get(v.productId!); if (c) conta.set(c, (conta.get(c) || 0) + 1); });
      const [catId, vezes] = [...conta.entries()].sort((a, b) => b[1] - a[1])[0] || [];
      if (!catId || vezes < 2) continue;
      const ja = await this.prisma.pushSend.findFirst({
        where: { kind: 'interesse', subscriptionId: sub.id, ref: catId, sentAt: { gte: new Date(Date.now() - 7 * 86400000) } },
      });
      if (ja) continue;
      const comprou = await this.prisma.event.findFirst({ where: { type: 'purchase', sessionId: sub.sessionId!, createdAt: { gte: ultima } } });
      if (comprou) continue;
      const vistos = minhas.map((v) => v.productId!);
      const p = await this.prisma.product.findFirst({
        where: { active: true, stock: { gt: 0 }, categoryId: catId, imageKeys: { isEmpty: false }, id: { notIn: vistos } },
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, slug: true, imageKeys: true, basePrice: true, salePrice: true, category: { select: { slug: true, name: true } } },
      }) ?? await this.prisma.product.findFirst({
        where: { active: true, stock: { gt: 0 }, categoryId: catId, imageKeys: { isEmpty: false } },
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, slug: true, imageKeys: true, basePrice: true, salePrice: true, category: { select: { slug: true, name: true } } },
      });
      if (!p) continue;
      const info = this.push.produtoInfo(p);
      n += await this.push.enviar([sub], 'interesse', {
        titulo: `Ainda à procura de ${p.category?.name ?? 'equipamento'}?`,
        corpo: `${p.name} por ${kz(p.salePrice ?? p.basePrice)}, disponível na 100 bytes.`,
        url: info.url,
        imagem: info.imagem,
        ref: catId,
        tag: 'interesse',
      });
    }
    if (n) this.log.log(`Interesse por categoria: ${n} enviadas.`);
  }

  // ── Campanhas ──
  private async campanhasAgendadas() {
    const prontas = await this.prisma.pushCampaign.findMany({ where: { status: 'agendada', scheduledAt: { lte: new Date() } } });
    for (const c of prontas) await this.enviarCampanha(c.id).catch((e) => this.log.warn('Campanha falhou: ' + e?.message));
  }

  async destinatarios(segmento: string) {
    if (segmento === 'clientes') return this.prisma.pushSubscription.findMany({ where: { active: true, customerId: { not: null } } });
    if (segmento.startsWith('categoria:')) {
      const slug = segmento.slice('categoria:'.length);
      const cat = await this.prisma.category.findFirst({ where: { slug }, select: { id: true } });
      if (!cat) return [];
      const vistas = await this.prisma.event.findMany({
        where: { type: { in: ['view', 'add_to_cart', 'purchase'] }, createdAt: { gte: new Date(Date.now() - 30 * 86400000) }, productId: { not: null } },
        select: { sessionId: true, productId: true },
      });
      const naCat = new Set((await this.prisma.product.findMany({ where: { categoryId: cat.id }, select: { id: true } })).map((p) => p.id));
      const sessoes = [...new Set(vistas.filter((v) => naCat.has(v.productId!)).map((v) => v.sessionId))];
      return this.prisma.pushSubscription.findMany({ where: { active: true, sessionId: { in: sessoes } } });
    }
    return this.prisma.pushSubscription.findMany({ where: { active: true } });
  }

  async enviarCampanha(id: string) {
    const c = await this.prisma.pushCampaign.findUnique({ where: { id } });
    if (!c || c.status === 'enviada' || c.status === 'a_enviar') return { enviadas: 0 };
    await this.prisma.pushCampaign.update({ where: { id }, data: { status: 'a_enviar' } });
    const subs = await this.destinatarios(c.segment);
    const n = await this.push.enviar(subs, 'campanha', { titulo: c.title, corpo: c.body, url: c.url, imagem: c.image, campanhaId: c.id, ref: c.id, tag: 'campanha:' + c.id });
    await this.prisma.pushCampaign.update({ where: { id }, data: { status: 'enviada', sentAt: new Date() } });
    this.log.log(`Campanha "${c.title}": ${n} enviadas.`);
    return { enviadas: n };
  }
}
