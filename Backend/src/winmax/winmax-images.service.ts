import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { R2Service } from '../r2/r2.service';
import { gtinValido, marcaEModelos } from './winmax-marcas';
import { WinmaxCatalogService } from './winmax-catalog.service';

/**
 * Fotos dos artigos do Winmax.
 *
 * Procura automática, por esta ordem:
 *   1. foto carregada no próprio Winmax (ImageHTTPPath);
 *   2. catálogo Icecat pelo EAN (só códigos de barras com dígito de controlo válido;
 *      muitos "códigos de barras" no Winmax são códigos internos);
 *   3. catálogo Icecat pela marca + código do fabricante tirados do nome do artigo.
 * As fotos são copiadas para o R2 (CDN próprio). O resto faz-se por upload no admin.
 *
 * ICECAT_USER no .env (por omissão o utilizador público "openIcecat-live",
 * que cobre as marcas do Open Icecat).
 */

const MAX_FOTOS = 5;

type Icecat = {
  icecatId: number | null;
  title: string | null;
  brand: string | null;
  mpn: string | null;
  description: string | null;
  specs: Record<string, Record<string, string>> | null;
  imagens: string[];
};

@Injectable()
export class WinmaxImagesService implements OnApplicationBootstrap {
  private readonly log = new Logger('WinmaxImages');
  private aCorrer = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly r2: R2Service,
    private readonly config: ConfigService,
    private readonly catalogo: WinmaxCatalogService,
  ) {}

  get running() {
    return this.aCorrer;
  }

  async onApplicationBootstrap() {
    await this.prisma.winmaxImageJob.updateMany({
      where: { status: 'running' },
      data: {
        status: 'error',
        error: 'Interrompida (reinício do servidor)',
        finishedAt: new Date(),
      },
    });
  }

  // ─── Procura automática em lote ──────────────────────────────────────────

  /** Artigos com stock, sem fotos e ainda não procurados (ou todos, com force). */
  async iniciarLote(
    force = false,
  ): Promise<{ id: string; total: number } | null> {
    if (this.aCorrer) return null;
    const codigos = await this.prisma.winmaxArticle.findMany({
      where: {
        present: true,
        stockTotal: { gt: 0 },
        images: { none: {} },
        ...(force ? {} : { info: null }),
      },
      select: { code: true },
      orderBy: { designation: 'asc' },
    });
    const job = await this.prisma.winmaxImageJob.create({
      data: { total: codigos.length },
    });
    this.aCorrer = true;
    this.correrLote(
      job.id,
      codigos.map((c) => c.code),
    ).finally(() => (this.aCorrer = false));
    return { id: job.id, total: codigos.length };
  }

  private async correrLote(jobId: string, codigos: string[]) {
    let processados = 0;
    let encontrados = 0;
    try {
      for (const code of codigos) {
        const n = await this.procurar(code).catch(() => 0);
        processados++;
        if (n > 0) encontrados++;
        if (processados % 5 === 0 || processados === codigos.length) {
          await this.prisma.winmaxImageJob.update({
            where: { id: jobId },
            data: { processed: processados, found: encontrados },
          });
        }
        await pausa(250); // ser simpático com o Icecat
      }
      await this.prisma.winmaxImageJob.update({
        where: { id: jobId },
        data: {
          status: 'ok',
          processed: processados,
          found: encontrados,
          finishedAt: new Date(),
        },
      });
      this.log.log(
        `Procura de fotos: ${encontrados}/${processados} artigos com foto.`,
      );
      // Artigos que ganharam foto passam a aparecer no site
      if (encontrados > 0) await this.catalogo.publicar();
    } catch (e: any) {
      await this.prisma.winmaxImageJob.update({
        where: { id: jobId },
        data: {
          status: 'error',
          error: String(e?.message ?? e).slice(0, 1000),
          finishedAt: new Date(),
        },
      });
    }
  }

  // ─── Procura de um artigo ────────────────────────────────────────────────

  /** Procura fotos para um artigo. Devolve o número de fotos adicionadas. */
  async procurar(code: string): Promise<number> {
    const art = await this.prisma.winmaxArticle.findUnique({
      where: { code },
      include: { images: true },
    });
    if (!art) throw new NotFoundException('Artigo não encontrado.');

    let adicionadas = 0;
    let posicao = art.images.length;

    // 1. Foto no próprio Winmax
    if (art.imageUrl && !art.images.some((i) => i.source === 'winmax')) {
      const url = new URL(
        art.imageUrl,
        this.config.get<string>('WINMAX_URL'),
      ).toString();
      if (await this.copiarImagem(code, url, 'winmax', posicao)) {
        adicionadas++;
        posicao++;
      }
    }

    // 2 e 3. Icecat
    let info: Icecat | null = null;
    let matchedBy: string | null = null;
    let erro: string | null = null;
    try {
      if (gtinValido(art.barcode)) {
        info = await this.icecat({ GTIN: art.barcode });
        if (info) matchedBy = 'ean';
      }
      if (!info) {
        const mm = marcaEModelos(art.designation);
        for (const modelo of mm?.modelos ?? []) {
          const r = await this.icecat({
            Brand: mm!.marca,
            ProductCode: modelo,
          });
          // Confirmar que é mesmo da marca (evita falsos positivos)
          if (r && r.brand && marcaIgual(r.brand, mm!.marca)) {
            info = r;
            matchedBy = 'model';
            break;
          }
          await pausa(150);
        }
      }
    } catch (e: any) {
      erro = String(e?.message ?? e).slice(0, 500);
    }

    if (info) {
      for (const url of info.imagens.slice(0, MAX_FOTOS - posicao)) {
        if (await this.copiarImagem(code, url, 'icecat', posicao)) {
          adicionadas++;
          posicao++;
        }
      }
    }

    const dados = {
      status: erro ? 'error' : info ? 'found' : 'not_found',
      matchedBy,
      brand: info?.brand ?? null,
      mpn: info?.mpn ?? null,
      icecatId: info?.icecatId ?? null,
      title: info?.title ?? null,
      description: info?.description ?? null,
      specs: (info?.specs ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      error: erro,
      lookedUpAt: new Date(),
    };
    await this.prisma.winmaxArticleInfo.upsert({
      where: { articleCode: code },
      create: { articleCode: code, ...dados },
      update: dados,
    });
    return adicionadas;
  }

  // ─── Gestão manual ───────────────────────────────────────────────────────

  async upload(code: string, file: Express.Multer.File) {
    const art = await this.prisma.winmaxArticle.findUnique({
      where: { code },
      include: { _count: { select: { images: true } } },
    });
    if (!art) throw new NotFoundException('Artigo não encontrado.');
    if (!file.mimetype.startsWith('image/'))
      throw new BadRequestException('Apenas imagens.');
    if (file.size > 5 * 1024 * 1024)
      throw new BadRequestException('Máximo 5 MB por imagem.');
    if (art._count.images >= MAX_FOTOS)
      throw new BadRequestException(`Máximo ${MAX_FOTOS} fotos por artigo.`);

    const key = `winmax/${chave(code)}/${Date.now()}.${extensao(file.mimetype)}`;
    await this.r2.upload(key, file.buffer, file.mimetype);
    const img = await this.prisma.winmaxArticleImage.create({
      data: {
        articleCode: code,
        key,
        source: 'upload',
        position: art._count.images,
      },
    });
    return { image: { ...img, url: this.r2.publicUrl(key) } };
  }

  async remover(code: string, id: string) {
    const img = await this.prisma.winmaxArticleImage.findFirst({
      where: { id, articleCode: code },
    });
    if (!img) throw new NotFoundException('Foto não encontrada.');
    await this.r2.delete(img.key);
    await this.prisma.winmaxArticleImage.delete({ where: { id } });
    await this.reordenar(code);
    return { ok: true };
  }

  /** Torna uma foto a principal (posição 0). */
  async principal(code: string, id: string) {
    const imgs = await this.prisma.winmaxArticleImage.findMany({
      where: { articleCode: code },
      orderBy: { position: 'asc' },
    });
    if (!imgs.some((i) => i.id === id))
      throw new NotFoundException('Foto não encontrada.');
    const ordem = [
      imgs.find((i) => i.id === id)!,
      ...imgs.filter((i) => i.id !== id),
    ];
    await this.prisma.$transaction(
      ordem.map((img, pos) =>
        this.prisma.winmaxArticleImage.update({
          where: { id: img.id },
          data: { position: pos },
        }),
      ),
    );
    return { ok: true };
  }

  url(key: string) {
    return this.r2.publicUrl(key);
  }

  // ─── Auxiliares ──────────────────────────────────────────────────────────

  private async reordenar(code: string) {
    const imgs = await this.prisma.winmaxArticleImage.findMany({
      where: { articleCode: code },
      orderBy: { position: 'asc' },
    });
    await this.prisma.$transaction(
      imgs.map((img, pos) =>
        this.prisma.winmaxArticleImage.update({
          where: { id: img.id },
          data: { position: pos },
        }),
      ),
    );
  }

  /** Descarrega uma imagem e guarda-a no R2. */
  private async copiarImagem(
    code: string,
    url: string,
    source: string,
    position: number,
  ) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      const tipo = (res.headers.get('content-type') ?? '').split(';')[0].trim();
      if (!res.ok || !tipo.startsWith('image/')) return false;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.byteLength < 1000 || buf.byteLength > 8 * 1024 * 1024)
        return false;
      const key = `winmax/${chave(code)}/${Date.now()}-${position}.${extensao(tipo)}`;
      await this.r2.upload(key, buf, tipo);
      await this.prisma.winmaxArticleImage.create({
        data: { articleCode: code, key, source, sourceUrl: url, position },
      });
      return true;
    } catch (e: any) {
      this.log.warn(`Falha a copiar imagem de ${code}: ${e?.message ?? e}`);
      return false;
    }
  }

  /** Consulta o Icecat. Devolve null se o produto não existir ou não estiver disponível. */
  private async icecat(params: Record<string, string>): Promise<Icecat | null> {
    const q = new URLSearchParams({
      UserName: this.config.get<string>('ICECAT_USER') || 'openIcecat-live',
      Language: 'pt',
      ...params,
    });
    const res = await fetch(`https://live.icecat.biz/api/?${q}`, {
      signal: AbortSignal.timeout(30_000),
    });
    const j: any = await res.json().catch(() => null);
    const d = j?.data;
    if (!d?.GeneralInfo) return null;

    const imagens = [
      d.Image?.HighPic || d.Image?.Pic500x500,
      ...(Array.isArray(d.Gallery)
        ? d.Gallery.map((g: any) => g.Pic || g.Pic500x500)
        : []),
    ].filter(
      (u: unknown): u is string =>
        typeof u === 'string' && u.startsWith('http'),
    );
    const unicas = [...new Set(imagens)];
    if (unicas.length === 0) return null;

    const specs: Record<string, Record<string, string>> = {};
    for (const g of Array.isArray(d.FeaturesGroups) ? d.FeaturesGroups : []) {
      const grupo = g?.FeatureGroup?.Name?.Value ?? 'Geral';
      for (const f of Array.isArray(g?.Features) ? g.Features : []) {
        const nome = f?.Feature?.Name?.Value;
        const valor = f?.PresentationValue;
        if (nome && valor) (specs[grupo] ??= {})[nome] = String(valor);
      }
    }

    const gi = d.GeneralInfo;
    return {
      icecatId: Number(gi.IcecatId) || null,
      title: gi.Title ?? null,
      brand: gi.Brand ?? null,
      mpn: gi.BrandPartCode ?? null,
      description:
        gi.Description?.LongDesc ||
        gi.SummaryDescription?.LongSummaryDescription ||
        null,
      specs: Object.keys(specs).length ? specs : null,
      imagens: unicas,
    };
  }
}

function marcaIgual(a: string, b: string) {
  const n = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  return n(a).includes(n(b)) || n(b).includes(n(a));
}

function chave(code: string) {
  return code.replace(/[^A-Za-z0-9_-]/g, '_');
}

function extensao(mime: string) {
  const m: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  };
  return m[mime] ?? 'jpg';
}

function pausa(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
