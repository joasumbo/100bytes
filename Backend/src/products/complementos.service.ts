import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * "Completa a tua compra": acessórios sugeridos para um produto.
 *
 * 1. Primeiro os definidos à mão no admin (bundle_items com produto ligado).
 * 2. Depois regras por tipo de produto (portátil → rato, mochila, disco…),
 *    escolhendo um produto por tipo de acessório:
 *      - ativo, com stock e com foto, mais barato do que o principal;
 *      - prefere a mesma marca, o mesmo tamanho (ex.: 15.6") e os mais vendidos.
 * Devolve no máximo 3.
 */

type Candidato = {
  id: string;
  name: string;
  slug: string;
  basePrice: number;
  salePrice: number | null;
  imageKeys: string[];
  brandId: string | null;
  stock: number;
  category: { name: string; slug: string } | null;
  texto: string; // nome + categoria, normalizado
};

/** Tipos de produto principal (o que o cliente está a ver). */
const PRINCIPAIS: [string, RegExp][] = [
  ['impressora', /\b(impressora|multifuncoes|laserjet|deskjet|officejet|smart tank|ecotank)\b/],
  ['portatil', /\b(portatil|laptop|notebook|macbook|elitebook|probook|thinkpad|latitude|ideapad|vivobook|zenbook|pavilion x360|computadores portateis)\b/],
  ['desktop', /\b(desktop|all in one|aio|mini ?pc|optiplex|thinkcentre|workstation|cpu dell|cpu hp|cpu lenovo)\b/],
  ['monitor', /\bmonitor\b/],
  ['rede', /\b(router|switch|access point|acess point|repetidor|firewall|antena)\b/],
  ['telemovel', /\b(smartphone|telemovel|iphone|galaxy|tablet|ipad)\b/],
  ['cctv', /\b(camera|camara|dvr|nvr|video porteiro|cctv)\b/],
  ['tv', /\b(tv|televisor|projector|projetor)\b/],
];

/** Tipos de acessório e como reconhecê-los. */
const ACESSORIOS: Record<string, RegExp> = {
  rato: /\b(rato|mouse)\b/,
  mochila: /\b(mochila|bolsa|sleeve|mala)\b/,
  disco_externo: /\b(disco externo|hd externo|ssd externo|disco duro externo|caixa ext)\b/,
  pendrive: /\b(pen ?drive|pendrive|flash drive)\b/,
  teclado: /\bteclado\b/,
  auriculares: /\b(auricular|auriculares|auscultador|auscultadores|headset|airpod|earbuds)\b/,
  cabo_video: /\b(hdmi|display ?port|displayport)\b/,
  suporte: /\bsuporte\b/,
  ups: /(^|\s)ups\s+(apc|eaton|pulsar|wintech|smart|back|online|line|\d)/,
  cabo_rede: /\b(cabo (de )?rede|patch cord|cat ?5e?|cat ?6a?|rj45)\b/,
  toner: /\b(toner|tinteiro|cartucho|garrafa de tinta)\b/,
  papel: /\b(papel a4|resma|papel fotografico)\b/,
  cabo_impressora: /\bcabo usb .*impressora|impressora .*cabo\b/,
  capa: /\b(capa|pelicula|protector de ecra|protetor de ecra)\b/,
  carregador: /\b(carregador|power bank|powerbank)\b/,
  disco: /\b(disco duro|hdd|ssd)\b/,
};

/** Para cada tipo de produto, os acessórios a sugerir (por ordem). */
const REGRAS: Record<string, string[]> = {
  portatil: ['rato', 'mochila', 'disco_externo', 'pendrive', 'auriculares'],
  desktop: ['teclado', 'rato', 'ups', 'cabo_video', 'auriculares'],
  monitor: ['cabo_video', 'suporte', 'teclado', 'rato'],
  impressora: ['toner', 'papel', 'cabo_impressora'],
  rede: ['cabo_rede', 'ups'],
  telemovel: ['capa', 'carregador', 'auriculares'],
  cctv: ['disco', 'cabo_rede', 'ups'],
  tv: ['cabo_video', 'suporte'],
};

/** Acessórios que são o próprio aparelho: não aceitar cabos, adaptadores, peças. */
const SO_APARELHO = /\b(cabo|adaptador|conversor|caixa|bateria|fonte|ficha|uniao|bloco|tomada|regua)\b/;
const APARELHOS = new Set(['ups', 'disco', 'rato', 'teclado', 'disco_externo', 'pendrive', 'auriculares', 'mochila', 'carregador']);

/** Palavras que nunca são acessórios a sugerir (ex.: sacos de oferta). */
const EXCLUIR = /\b(presente|oferta|reparacao|servico|instalacao|formacao)\b/;

const MAX = 3;
const CACHE_MS = 5 * 60 * 1000;

function normalizar(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9.+"' ]+/g, ' ')
    .replace(/\s+/g, ' ');
}

/** Tamanho de ecrã/mochila no nome (ex.: 15.6, 14), para combinar portátil e mochila. */
function tamanho(t: string) {
  const m = t.match(/\b(1[0-7](?:[.,]\d)?)\s*("|pol|polegadas|'')?/);
  return m ? m[1].replace(',', '.') : null;
}

@Injectable()
export class ComplementosService {
  private cache: { em: number; produtos: Candidato[]; vendas: Map<string, number> } | null = null;

  constructor(private readonly prisma: PrismaService) {}

  private async dados() {
    if (this.cache && Date.now() - this.cache.em < CACHE_MS) return this.cache;
    const [lista, vendidos] = await Promise.all([
      this.prisma.product.findMany({
        where: { active: true },
        select: {
          id: true,
          name: true,
          slug: true,
          basePrice: true,
          salePrice: true,
          imageKeys: true,
          brandId: true,
          stock: true,
          trackStock: true,
          category: { select: { name: true, slug: true } },
        },
      }),
      this.prisma.orderItem.groupBy({ by: ['productId'], _sum: { qty: true } }).catch(() => []),
    ]);
    const produtos: Candidato[] = lista
      .filter((p) => p.imageKeys.length > 0 && (!p.trackStock || p.stock > 0))
      .map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        basePrice: p.basePrice,
        salePrice: p.salePrice,
        imageKeys: p.imageKeys,
        brandId: p.brandId,
        stock: p.stock,
        category: p.category,
        texto: normalizar(`${p.name} ${p.category?.name ?? ''}`),
      }));
    const vendas = new Map<string, number>();
    for (const v of vendidos as { productId: string | null; _sum: { qty: number | null } }[]) {
      if (v.productId) vendas.set(v.productId, v._sum.qty ?? 0);
    }
    this.cache = { em: Date.now(), produtos, vendas };
    return this.cache;
  }

  /**
   * Destaques do topo da página inicial, sempre atualizados:
   *  - novidade: o produto mais recente com foto e stock;
   *  - procurado: o mais visto/adicionado ao carrinho nos últimos 14 dias
   *    (eventos); sem dados, o de maior valor em stock.
   */
  async destaques() {
    const { produtos } = await this.dados();
    if (!produtos.length) return { novidade: null, procurado: null };
    // "Chegou agora": última compra ao fornecedor no Winmax (senão, data de criação)
    const datas = await this.prisma.product.findMany({
      where: { id: { in: produtos.map((p) => p.id) } },
      select: { id: true, createdAt: true, winmaxCode: true },
    });
    const codigos = datas.map((d) => d.winmaxCode).filter((c): c is string => !!c);
    const compras = codigos.length
      ? await this.prisma.winmaxArticle.findMany({ where: { code: { in: codigos } }, select: { code: true, lastPurchaseDate: true } })
      : [];
    const compraPorCodigo = new Map(compras.map((c) => [c.code, c.lastPurchaseDate?.getTime() ?? 0]));
    const chegada = new Map(datas.map((d) => [d.id, (d.winmaxCode && compraPorCodigo.get(d.winmaxCode)) || d.createdAt.getTime()]));
    const limpar = (p: Candidato | undefined) => {
      if (!p) return null;
      const { texto: _t, ...resto } = p;
      return resto;
    };

    // Só produtos acima do preço mediano: o topo da página pede artigos apelativos
    const precos = produtos.map((p) => p.salePrice ?? p.basePrice).sort((a, b) => a - b);
    const mediana = precos[Math.floor(precos.length / 2)] ?? 0;
    const apelativos = produtos.filter((p) => (p.salePrice ?? p.basePrice) >= mediana);
    const novidade = [...apelativos].sort(
      (a, b) => (chegada.get(b.id) ?? 0) - (chegada.get(a.id) ?? 0) || (b.salePrice ?? b.basePrice) - (a.salePrice ?? a.basePrice),
    )[0];

    const desde = new Date(Date.now() - 14 * 24 * 3600 * 1000);
    const ev = await this.prisma.event
      .groupBy({
        by: ['productId', 'type'],
        where: { productId: { not: null }, createdAt: { gte: desde }, type: { in: ['view', 'add_to_cart', 'purchase'] } },
        _count: true,
      })
      .catch(() => []);
    const pesos: Record<string, number> = { view: 1, add_to_cart: 4, purchase: 10 };
    const pontos = new Map<string, number>();
    for (const e of ev) {
      if (e.productId) pontos.set(e.productId, (pontos.get(e.productId) ?? 0) + e._count * (pesos[e.type] ?? 0));
    }
    const candidatos = produtos.filter((p) => p.id !== novidade.id);
    const procurado =
      [...candidatos].sort((a, b) => (pontos.get(b.id) ?? 0) - (pontos.get(a.id) ?? 0)).find((p) => (pontos.get(p.id) ?? 0) > 0) ??
      [...candidatos].sort((a, b) => (b.salePrice ?? b.basePrice) * b.stock - (a.salePrice ?? a.basePrice) * a.stock)[0];

    return { novidade: limpar(novidade), procurado: limpar(procurado) };
  }

  /**
   * Semelhantes e substitutos calculados pela camada Python (recs/similares.py),
   * só com produtos ativos, com foto e (substitutos) com stock.
   */
  async relacionados(productId: string, limite = 10) {
    const linhas = await this.prisma.productRelation.findMany({
      where: { productId },
      orderBy: { score: 'desc' },
    });
    if (!linhas.length) return { similar: [], substitute: [] };
    const { produtos } = await this.dados();
    const porId = new Map(produtos.map((p) => [p.id, p]));
    const escolher = (kind: string) =>
      linhas
        .filter((l) => l.kind === kind && porId.has(l.relatedId))
        .slice(0, limite)
        .map((l) => {
          const { texto: _t, ...p } = porId.get(l.relatedId)!;
          return { ...p, score: l.score };
        });
    return { similar: escolher('similar'), substitute: escolher('substitute') };
  }

  async sugerir(productId: string) {
    const principal = await this.prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        basePrice: true,
        salePrice: true,
        brandId: true,
        category: { select: { name: true } },
        bundleItems: {
          where: { linkedId: { not: null } },
          orderBy: { sortOrder: 'asc' },
          select: { linkedId: true },
        },
      },
    });
    if (!principal) throw new NotFoundException('Produto não encontrado.');

    const { produtos, vendas } = await this.dados();
    const porId = new Map(produtos.map((p) => [p.id, p]));
    const escolhidos: (Candidato & { motivo: string })[] = [];
    const usados = new Set<string>([principal.id]);

    // 1. Definidos à mão no admin
    for (const b of principal.bundleItems) {
      const p = b.linkedId ? porId.get(b.linkedId) : undefined;
      if (p && !usados.has(p.id) && escolhidos.length < MAX) {
        escolhidos.push({ ...p, motivo: 'manual' });
        usados.add(p.id);
      }
    }

    // 2. Regras por tipo
    const textoPrincipal = normalizar(`${principal.name} ${principal.category?.name ?? ''}`);
    const tipo = PRINCIPAIS.find(([, re]) => re.test(textoPrincipal))?.[0];
    const precoPrincipal = principal.salePrice ?? principal.basePrice;
    const tamPrincipal = tamanho(textoPrincipal);

    const cobertos = new Set<string>();
    const cobrir = (p: Candidato) =>
      Object.entries(ACESSORIOS).forEach(([t, r]) => r.test(p.texto) && cobertos.add(t));
    escolhidos.forEach((p) => cobrir(p));

    for (const acessorio of tipo ? REGRAS[tipo] : []) {
      if (escolhidos.length >= MAX) break;
      if (cobertos.has(acessorio)) continue;
      const re = ACESSORIOS[acessorio];
      const candidatos = produtos.filter((p) => {
        if (usados.has(p.id) || !re.test(p.texto) || EXCLUIR.test(p.texto)) return false;
        if (APARELHOS.has(acessorio) && SO_APARELHO.test(p.texto)) return false;
        const preco = p.salePrice ?? p.basePrice;
        return preco > 0 && preco < precoPrincipal;
      });
      if (!candidatos.length) continue;

      const pontuar = (p: Candidato) => {
        let s = 0;
        if (principal.brandId && p.brandId === principal.brandId) s += 3;
        if (tamPrincipal && tamanho(p.texto) === tamPrincipal) s += 2;
        s += Math.min(2, (vendas.get(p.id) ?? 0) / 5);
        s += Math.min(1, p.stock / 20);
        return s;
      };
      candidatos.sort((a, b) => pontuar(b) - pontuar(a) || (a.salePrice ?? a.basePrice) - (b.salePrice ?? b.basePrice));
      escolhidos.push({ ...candidatos[0], motivo: acessorio });
      usados.add(candidatos[0].id);
      cobrir(candidatos[0]);
    }

    return {
      type: tipo ?? null,
      items: escolhidos.map(({ texto: _t, ...p }) => p),
    };
  }
}
