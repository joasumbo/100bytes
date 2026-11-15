import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { slugify } from '../common/slugify';
import { marcaDoNome } from './winmax-marcas';

/**
 * Publica os artigos do Winmax como produtos do site (tabela products).
 *
 * Visível quando: existe no Winmax, tem stock > 0, tem pelo menos uma foto e preço.
 * Se deixar de cumprir, o produto fica oculto (active = false); nunca é apagado,
 * porque pode haver encomendas ligadas a ele.
 *
 * O Winmax manda em: nome, preço (com IVA), custo, stock, fotos e visibilidade.
 * O admin manda em: descrição, categoria, marca e destaque — preenchidos na
 * criação e depois respeitados.
 */
@Injectable()
export class WinmaxCatalogService {
  private readonly log = new Logger('WinmaxCatalog');
  private aCorrer: Promise<unknown> | null = null;

  constructor(private readonly prisma: PrismaService) {}

  /** Publica todos os artigos (ou só os códigos indicados). Não corre duas vezes em simultâneo. */
  async publicar(codigos?: string[]) {
    while (this.aCorrer) await this.aCorrer.catch(() => undefined);
    const p = this.executar(codigos);
    this.aCorrer = p;
    try {
      return await p;
    } finally {
      this.aCorrer = null;
    }
  }

  private async executar(codigos?: string[]) {
    const jaPublicados = await this.prisma.product.findMany({
      where: { winmaxCode: codigos ? { in: codigos } : { not: null } },
      select: {
        id: true,
        winmaxCode: true,
        categoryId: true,
        brandId: true,
        description: true,
      },
    });
    const porCodigo = new Map(jaPublicados.map((p) => [p.winmaxCode!, p]));

    const artigos = await this.prisma.winmaxArticle.findMany({
      where: {
        ...(codigos ? { code: { in: codigos } } : {}),
        OR: [
          { present: true, stockTotal: { gt: 0 }, images: { some: {} } },
          { code: { in: [...porCodigo.keys()] } },
        ],
      },
      include: {
        images: { orderBy: { position: 'asc' }, take: 4 },
        info: true,
      },
    });

    const familias = new Map(
      (
        await this.prisma.winmaxFamily.findMany({
          where: { level: { lte: 2 } },
        })
      ).map((f) => [f.id, f]),
    );
    const cacheCat = new Map<string, string>();
    const cacheMarca = new Map<string, string>();
    const marcas = await this.prisma.brand.findMany({
      select: { id: true, name: true },
    });

    let criados = 0;
    let atualizados = 0;
    let ocultos = 0;

    for (const a of artigos) {
      const preco = a.priceWithTax ?? 0;
      const visivel =
        a.present && a.stockTotal > 0 && a.images.length > 0 && preco > 0;
      const dados = {
        name: a.designation.trim(),
        basePrice: preco,
        hasIva: false, // o preço do Winmax já inclui IVA
        ivaRate: 14,
        costPrice: a.costPrice,
        stock: Math.max(0, Math.floor(a.stockTotal)),
        trackStock: true,
        imageKeys: a.images.map((i) => i.key),
        active: visivel,
      };

      const existente = porCodigo.get(a.code);
      if (existente) {
        await this.prisma.product.update({
          where: { id: existente.id },
          data: {
            ...dados,
            // Só preenche o que o admin ainda não definiu
            ...(!existente.description &&
              a.info?.description && {
                description: textoSimples(a.info.description),
              }),
            ...(!existente.categoryId && {
              categoryId: await this.categoria(a, familias, cacheCat),
            }),
            ...(!existente.brandId && {
              brandId: await this.marca(a, marcas, cacheMarca),
            }),
          },
        });
        atualizados++;
        if (!visivel) ocultos++;
      } else if (visivel) {
        await this.prisma.product.create({
          data: {
            ...dados,
            winmaxCode: a.code,
            reference: await this.referencia(a.code),
            slug: await this.slugUnico(a.designation, a.code),
            description: a.info?.description
              ? textoSimples(a.info.description)
              : null,
            categoryId: await this.categoria(a, familias, cacheCat),
            brandId: await this.marca(a, marcas, cacheMarca),
          },
        });
        criados++;
      }
    }

    if (criados || (!codigos && atualizados)) {
      this.log.log(
        `Catálogo: ${criados} criados, ${atualizados} atualizados (${ocultos} ocultos).`,
      );
    }
    return { created: criados, updated: atualizados, hidden: ocultos };
  }

  // ─── Auxiliares ──────────────────────────────────────────────────────────

  /** Categoria do site a partir da família (nível 1) e subfamília (nível 2) do Winmax. */
  private async categoria(
    a: { familyCode: string | null; subFamilyCode: string | null },
    familias: Map<
      string,
      { id: string; name: string; parentId: string | null }
    >,
    cache: Map<string, string>,
  ): Promise<string | null> {
    if (!a.familyCode) return null;
    const nivel2 = a.subFamilyCode
      ? `${a.familyCode}.${a.subFamilyCode}`
      : null;
    const alvo = nivel2 && familias.has(nivel2) ? nivel2 : a.familyCode;
    return this.garantirCategoria(alvo, familias, cache);
  }

  private async garantirCategoria(
    familiaId: string,
    familias: Map<
      string,
      { id: string; name: string; parentId: string | null }
    >,
    cache: Map<string, string>,
  ): Promise<string | null> {
    if (cache.has(familiaId)) return cache.get(familiaId)!;
    const fam = familias.get(familiaId);
    if (!fam) return null;

    let cat = await this.prisma.category.findUnique({
      where: { winmaxFamilyId: familiaId },
      select: { id: true },
    });
    if (!cat) {
      const parentId = fam.parentId
        ? await this.garantirCategoria(fam.parentId, familias, cache)
        : null;
      const nome = fam.name.trim();
      cat = await this.prisma.category.create({
        data: {
          name: nome,
          slug: await this.slugCategoria(nome),
          parentId,
          winmaxFamilyId: familiaId,
        },
        select: { id: true },
      });
    }
    cache.set(familiaId, cat.id);
    return cat.id;
  }

  /** Marca existente com o mesmo nome; se não existir, cria-a. */
  private async marca(
    a: { designation: string; info: { brand: string | null } | null },
    marcas: { id: string; name: string }[],
    cache: Map<string, string>,
  ): Promise<string | null> {
    const nome = (a.info?.brand || marcaDoNome(a.designation))
      ?.replace(/\s+Technology$/i, '')
      .trim();
    if (!nome) return null;
    const chave = normalizar(nome);
    if (cache.has(chave)) return cache.get(chave)!;

    let marca = marcas.find((m) => normalizar(m.name) === chave);
    if (!marca) {
      marca = await this.prisma.brand.create({
        data: { name: nome, slug: await this.slugMarca(nome) },
        select: { id: true, name: true },
      });
      marcas.push(marca);
    }
    cache.set(chave, marca.id);
    return marca.id;
  }

  private async referencia(code: string) {
    const ocupada = await this.prisma.product.findUnique({
      where: { reference: code },
      select: { id: true },
    });
    return ocupada ? `WMX-${code}` : code;
  }

  private async slugUnico(nome: string, code: string) {
    const base = slugify(nome) || 'produto';
    for (const cand of [base, `${base}-${slugify(code)}`]) {
      if (
        !(await this.prisma.product.findUnique({
          where: { slug: cand },
          select: { id: true },
        }))
      )
        return cand;
    }
    return `${base}-${Date.now().toString(36)}`;
  }

  private async slugCategoria(nome: string) {
    const base = slugify(nome) || 'categoria';
    for (let i = 0; i < 50; i++) {
      const cand = i === 0 ? base : `${base}-${i + 1}`;
      if (
        !(await this.prisma.category.findUnique({
          where: { slug: cand },
          select: { id: true },
        }))
      )
        return cand;
    }
    return `${base}-${Date.now().toString(36)}`;
  }

  private async slugMarca(nome: string) {
    const base = slugify(nome) || 'marca';
    for (let i = 0; i < 50; i++) {
      const cand = i === 0 ? base : `${base}-${i + 1}`;
      if (
        !(await this.prisma.brand.findUnique({
          where: { slug: cand },
          select: { id: true },
        }))
      )
        return cand;
    }
    return `${base}-${Date.now().toString(36)}`;
  }

  /** Resumo para o admin. */
  async resumo() {
    const [total, visiveis] = await Promise.all([
      this.prisma.product.count({ where: { winmaxCode: { not: null } } }),
      this.prisma.product.count({
        where: { winmaxCode: { not: null }, active: true },
      }),
    ]);
    return { products: total, visible: visiveis };
  }
}

function normalizar(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** HTML do Icecat → texto simples (a página de produto não interpreta HTML). */
function textoSimples(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|li|div)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
