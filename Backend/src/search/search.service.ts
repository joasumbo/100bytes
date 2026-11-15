import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Pesquisa inteligente com Meilisearch.
 *
 * - Tolerante a erros ("logitec" → Logitech), sem acentos, prefixos ("thinkp").
 * - Sinónimos em português (rato = mouse, portátil = laptop…).
 * - Ordenação: relevância do texto, depois produtos com stock e popularidade
 *   (vistas, carrinho e compras dos últimos 30 dias, a partir da tabela events).
 * - Se o Meilisearch não estiver disponível, a pesquisa usa o Postgres.
 *
 * Variáveis: MEILI_URL, MEILI_KEY (se faltarem, só Postgres).
 * O índice é reconstruído no arranque e a cada 5 minutos (≈ centenas de produtos).
 */

const INDICE = 'products';

const SINONIMOS: string[][] = [
  ['rato', 'mouse'],
  ['portatil', 'portátil', 'laptop', 'notebook', 'computador portatil'],
  ['desktop', 'computador de secretaria', 'pc', 'cpu', 'torre'],
  ['all in one', 'aio', 'tudo em um'],
  ['telemovel', 'telemóvel', 'smartphone', 'celular', 'telefone'],
  ['auriculares', 'auscultadores', 'headset', 'fones', 'headphones', 'earbuds'],
  ['coluna', 'colunas', 'altifalante', 'speaker', 'som'],
  ['monitor', 'ecra', 'ecrã', 'tela', 'display'],
  ['teclado', 'keyboard'],
  ['impressora', 'printer', 'multifuncoes', 'multifunções'],
  ['tinteiro', 'toner', 'cartucho', 'tinta'],
  ['pendrive', 'pen drive', 'pen', 'usb flash'],
  ['disco', 'hd', 'hdd', 'ssd', 'armazenamento'],
  ['carregador', 'charger', 'fonte'],
  ['mochila', 'bolsa', 'mala'],
  ['router', 'roteador', 'wifi', 'wi-fi', 'wireless', 'sem fios'],
  ['camara', 'câmara', 'camera', 'câmera', 'cctv'],
  ['ups', 'no-break', 'nobreak'],
  ['cabo', 'cablagem'],
  ['memoria', 'memória', 'ram'],
];

type Doc = {
  id: string;
  name: string;
  slug: string;
  reference: string;
  mpn: string | null;
  brand: string | null;
  category: string | null;
  categorySlug: string | null;
  categoryParent: string | null;
  description: string;
  specs: string;
  basePrice: number;
  salePrice: number | null;
  price: number;
  imageKeys: string[];
  stock: number;
  trackStock: boolean;
  inStock: number;
  popularity: number;
  createdAt: number;
};

@Injectable()
export class SearchService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly log = new Logger('Search');
  private timer: NodeJS.Timeout | null = null;
  private pronto = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private get url() {
    return this.config.get<string>('MEILI_URL');
  }

  get ativo() {
    return Boolean(this.url) && this.pronto;
  }

  async onApplicationBootstrap() {
    if (!this.url) {
      this.log.warn('MEILI_URL em falta: pesquisa só pelo Postgres.');
      return;
    }
    setTimeout(() => this.reindexar().catch(() => undefined), 3000);
    this.timer = setInterval(() => this.reindexar().catch(() => undefined), 5 * 60 * 1000);
  }

  onApplicationShutdown() {
    if (this.timer) clearInterval(this.timer);
  }

  // ─── Meilisearch (REST) ──────────────────────────────────────────────────

  private async meili<T = any>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
    const res = await fetch(`${this.url}${path}`, {
      method: init?.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.get('MEILI_KEY') && { Authorization: `Bearer ${this.config.get('MEILI_KEY')}` }),
      },
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`Meilisearch ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return (res.status === 204 ? null : res.json()) as Promise<T>;
  }

  /** Reconstrói o índice com todos os produtos visíveis. */
  async reindexar() {
    if (!this.url) return { indexed: 0 };
    const docs = await this.documentos();

    await this.meili(`/indexes/${INDICE}/settings`, {
      method: 'PATCH',
      body: {
        searchableAttributes: ['name', 'brand', 'reference', 'mpn', 'category', 'categoryParent', 'specs', 'description'],
        filterableAttributes: ['categorySlug', 'brand', 'price', 'inStock'],
        sortableAttributes: ['price', 'createdAt', 'popularity'],
        displayedAttributes: ['*'],
        rankingRules: ['words', 'typo', 'proximity', 'attribute', 'sort', 'exactness', 'inStock:desc', 'popularity:desc'],
        synonyms: sinonimos(),
        typoTolerance: { minWordSizeForTypos: { oneTypo: 4, twoTypos: 8 } },
        pagination: { maxTotalHits: 2000 },
      },
    }).catch(async (e) => {
      // Índice ainda não existe: criar e repetir
      if (/index_not_found|404/.test(String(e))) {
        await this.meili('/indexes', { method: 'POST', body: { uid: INDICE, primaryKey: 'id' } });
        await new Promise((r) => setTimeout(r, 1000));
        return this.reindexar();
      }
      throw e;
    });

    // Substitui todos os documentos
    await this.meili(`/indexes/${INDICE}/documents`, { method: 'DELETE' });
    if (docs.length) await this.meili(`/indexes/${INDICE}/documents?primaryKey=id`, { method: 'POST', body: docs });
    this.pronto = true;
    return { indexed: docs.length };
  }

  private async documentos(): Promise<Doc[]> {
    const desde = new Date(Date.now() - 30 * 24 * 3600 * 1000);
    const [produtos, popularidade] = await Promise.all([
      this.prisma.product.findMany({
        where: { active: true },
        include: {
          brand: { select: { name: true } },
          category: { select: { name: true, slug: true, parent: { select: { name: true } } } },
        },
      }),
      this.prisma.event.groupBy({
        by: ['productId', 'type'],
        where: { productId: { not: null }, createdAt: { gte: desde }, type: { in: ['view', 'add_to_cart', 'purchase', 'search_click'] } },
        _count: true,
      }),
    ]);

    const pesos: Record<string, number> = { view: 1, search_click: 2, add_to_cart: 4, purchase: 10 };
    const pop = new Map<string, number>();
    for (const p of popularidade) {
      if (p.productId) pop.set(p.productId, (pop.get(p.productId) ?? 0) + p._count * (pesos[p.type] ?? 0));
    }

    const codigos = produtos.map((p) => p.winmaxCode).filter((c): c is string => !!c);
    const infos = codigos.length
      ? await this.prisma.winmaxArticleInfo.findMany({ where: { articleCode: { in: codigos } }, select: { articleCode: true, specs: true, mpn: true } })
      : [];
    const porCodigo = new Map(infos.map((i) => [i.articleCode, i]));

    return produtos.map((p) => {
      const info = p.winmaxCode ? porCodigo.get(p.winmaxCode) : undefined;
      const preco = p.salePrice ?? p.basePrice;
      const temStock = !p.trackStock || p.stock > 0;
      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        reference: p.reference,
        mpn: info?.mpn ?? null,
        brand: p.brand?.name ?? null,
        category: p.category?.name ?? null,
        categorySlug: p.category?.slug ?? null,
        categoryParent: p.category?.parent?.name ?? null,
        description: (p.description ?? '').slice(0, 1500),
        specs: textoSpecs(info?.specs),
        basePrice: p.basePrice,
        salePrice: p.salePrice,
        price: preco,
        imageKeys: p.imageKeys,
        stock: p.stock,
        trackStock: p.trackStock,
        inStock: temStock ? 1 : 0,
        popularity: pop.get(p.id) ?? 0,
        createdAt: p.createdAt.getTime(),
      };
    });
  }

  // ─── Pesquisa ────────────────────────────────────────────────────────────

  async pesquisar(o: { q: string; page: number; perPage: number; categorySlug?: string; brand?: string; sort?: string; minPrice?: number; maxPrice?: number }) {
    const q = o.q.trim();
    if (this.ativo) {
      try {
        const filtros: string[] = [];
        if (o.categorySlug) filtros.push(`categorySlug = "${esc(o.categorySlug)}"`);
        if (o.brand) filtros.push(`brand = "${esc(o.brand)}"`);
        if (o.minPrice != null) filtros.push(`price >= ${Number(o.minPrice)}`);
        if (o.maxPrice != null) filtros.push(`price <= ${Number(o.maxPrice)}`);
        const sort = o.sort === 'price_asc' ? ['price:asc'] : o.sort === 'price_desc' ? ['price:desc'] : o.sort === 'newest' ? ['createdAt:desc'] : undefined;
        const corpo = (estrategia: string) => ({
            q,
            matchingStrategy: estrategia,
            page: o.page,
            hitsPerPage: o.perPage,
            filter: filtros.length ? filtros : undefined,
            sort,
            facets: ['brand', 'categorySlug'],
            attributesToHighlight: ['name'],
            highlightPreTag: '<mark>',
            highlightPostTag: '</mark>',
        });
        const procurar = (estrategia: string) =>
          this.meili<any>(`/indexes/${INDICE}/search`, { method: 'POST', body: corpo(estrategia) });
        // Primeiro exige todas as palavras; sem resultados, aceita parciais
        let r = await procurar('all');
        if (!r.totalHits && q.includes(' ')) r = await procurar('last');
        return {
          engine: 'meilisearch',
          total: r.totalHits ?? 0,
          page: r.page,
          perPage: r.hitsPerPage,
          products: r.hits.map(produtoDeDoc),
          facets: r.facetDistribution ?? {},
        };
      } catch (e: any) {
        this.log.warn(`Meilisearch falhou, a usar Postgres: ${e?.message ?? e}`);
      }
    }
    return this.pesquisarPostgres(q, o.page, o.perPage);
  }

  /** Sugestões enquanto se escreve: até 6 produtos e as categorias com resultados. */
  async sugerir(q: string) {
    const r = await this.pesquisar({ q, page: 1, perPage: 6 });
    const cats = Object.entries((r.facets as any)?.categorySlug ?? {})
      .sort((a: any, b: any) => b[1] - a[1])
      .slice(0, 3)
      .map(([slug, n]) => ({ slug, count: n }));
    const nomes = cats.length
      ? await this.prisma.category.findMany({ where: { slug: { in: cats.map((c) => c.slug) } }, select: { slug: true, name: true } })
      : [];
    return {
      products: r.products,
      categories: cats.map((c) => ({ ...c, name: nomes.find((n) => n.slug === c.slug)?.name ?? c.slug })),
      total: r.total,
    };
  }

  private async pesquisarPostgres(q: string, page: number, perPage: number) {
    const termos = q.split(/\s+/).filter(Boolean).slice(0, 6);
    const where = {
      active: true,
      AND: termos.map((t) => ({
        OR: [
          { name: { contains: t, mode: 'insensitive' as const } },
          { reference: { contains: t, mode: 'insensitive' as const } },
          { brand: { name: { contains: t, mode: 'insensitive' as const } } },
          { category: { name: { contains: t, mode: 'insensitive' as const } } },
        ],
      })),
    };
    const [total, lista] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        include: { brand: { select: { name: true } }, category: { select: { name: true, slug: true } } },
        orderBy: [{ stock: 'desc' }, { name: 'asc' }],
        skip: (page - 1) * perPage,
        take: perPage,
      }),
    ]);
    return { engine: 'postgres', total, page, perPage, products: lista, facets: {} };
  }
}

function sinonimos() {
  const out: Record<string, string[]> = {};
  for (const grupo of SINONIMOS) for (const p of grupo) out[p] = grupo.filter((x) => x !== p);
  return out;
}

function textoSpecs(specs: unknown) {
  if (!specs || typeof specs !== 'object') return '';
  const partes: string[] = [];
  for (const grupo of Object.values(specs as Record<string, Record<string, string>>)) {
    for (const [k, v] of Object.entries(grupo ?? {})) {
      if (!/^(sim|não|nao)$/i.test(String(v))) partes.push(`${k} ${v}`);
      else if (/^sim$/i.test(String(v))) partes.push(k);
    }
  }
  return partes.join(' · ').slice(0, 2000);
}

function esc(s: string) {
  return s.replace(/["\\]/g, '');
}

/** Documento do índice → mesmo formato que /api/products (usado pela loja). */
function produtoDeDoc(d: any) {
  return {
    id: d.id,
    name: d.name,
    nameHighlighted: d._formatted?.name ?? null,
    slug: d.slug,
    reference: d.reference,
    basePrice: d.basePrice,
    salePrice: d.salePrice,
    imageKeys: d.imageKeys,
    stock: d.stock,
    trackStock: d.trackStock,
    createdAt: new Date(d.createdAt).toISOString(),
    brand: d.brand ? { name: d.brand } : null,
    category: d.categorySlug ? { name: d.category, slug: d.categorySlug } : null,
  };
}
