import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { R2Service } from '../r2/r2.service';

/**
 * Categorias em destaque na página inicial (as que têm mais produtos visíveis)
 * e imagem automática para cada uma.
 *
 * Imagem: a foto oficial do produto de maior valor da categoria (fundo branco),
 * copiada para o R2 em categories/<slug>-<data>.<ext> e guardada em
 * categories.imageKey. Só é escolhida quando a categoria ainda não tem imagem,
 * por isso uma imagem posta à mão no admin nunca é substituída.
 */
@Injectable()
export class CategoriasDestaqueService {
  private readonly log = new Logger('CategoriasDestaque');
  private aGerar = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly r2: R2Service,
  ) {}

  /** ordem "produtos" (mais artigos visíveis) ou "stock" (mais unidades em stock, vindas do Winmax) */
  async destaque(limite = 20, ordem: 'produtos' | 'stock' = 'produtos') {
    const contagens = await this.prisma.product.groupBy({
      by: ['categoryId'],
      where: { active: true, categoryId: { not: null }, imageKeys: { isEmpty: false } },
      _count: true,
      _sum: { stock: true },
      orderBy: ordem === 'stock' ? { _sum: { stock: 'desc' } } : { _count: { categoryId: 'desc' } },
      take: limite,
    });
    const ids = contagens.map((c) => c.categoryId!).filter(Boolean);
    const categorias = await this.prisma.category.findMany({
      where: { id: { in: ids }, active: true },
      select: { id: true, name: true, slug: true, imageKey: true },
    });
    const porId = new Map(categorias.map((c) => [c.id, c]));
    const lista = contagens
      .map((c) => {
        const cat = porId.get(c.categoryId!);
        return cat ? { ...cat, count: c._count, stock: c._sum.stock ?? 0, image: cat.imageKey ? this.r2.publicUrl(cat.imageKey) : null } : null;
      })
      .filter((c): c is NonNullable<typeof c> => !!c);

    // Categorias sem imagem: gerar em segundo plano (a próxima visita já as mostra)
    if (lista.some((c) => !c.imageKey)) this.gerarImagens(lista.filter((c) => !c.imageKey).map((c) => c.id)).catch(() => undefined);
    return { categories: lista };
  }

  /** Atribui imagem às categorias indicadas (ou a todas as que têm produtos e não têm imagem). */
  async gerarImagens(ids?: string[]) {
    if (this.aGerar) return { updated: 0 };
    this.aGerar = true;
    let atualizadas = 0;
    try {
      const alvo = await this.prisma.category.findMany({
        where: { imageKey: null, ...(ids ? { id: { in: ids } } : {}) },
        select: { id: true, slug: true },
      });
      for (const cat of alvo) {
        const produto = await this.prisma.product.findFirst({
          where: { categoryId: cat.id, active: true, imageKeys: { isEmpty: false } },
          orderBy: [{ basePrice: 'desc' }],
          select: { imageKeys: true },
        });
        const origem = produto?.imageKeys[0];
        if (!origem) continue;
        try {
          const res = await fetch(this.r2.publicUrl(origem), { signal: AbortSignal.timeout(30000) });
          const tipo = (res.headers.get('content-type') || 'image/jpeg').split(';')[0];
          if (!res.ok || !tipo.startsWith('image/')) continue;
          const buf = Buffer.from(await res.arrayBuffer());
          const ext = { 'image/png': 'png', 'image/webp': 'webp' }[tipo] ?? 'jpg';
          const key = `categories/${cat.slug}-${Date.now()}.${ext}`;
          await this.r2.upload(key, buf, tipo);
          await this.prisma.category.update({ where: { id: cat.id }, data: { imageKey: key } });
          atualizadas++;
        } catch (e: any) {
          this.log.warn(`Imagem da categoria ${cat.slug} falhou: ${e?.message ?? e}`);
        }
      }
      if (atualizadas) this.log.log(`${atualizadas} categorias receberam imagem automática.`);
    } finally {
      this.aGerar = false;
    }
    return { updated: atualizadas };
  }
}
