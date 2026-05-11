import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { R2Service } from '../r2/r2.service';
import { slugify } from '../common/slugify';
import { CreateProductDto, UpdateProductDto, ListProductsDto } from './dto/product.dto';
import * as path from 'path';

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private r2: R2Service,
  ) {}

  // ─── Slug único ─────────────────────────────────────────────────────────────
  private async uniqueSlug(base: string, excludeId?: string): Promise<string> {
    let slug = slugify(base);
    let suffix = 0;
    while (true) {
      const candidate = suffix === 0 ? slug : `${slug}-${suffix}`;
      const found = await this.prisma.product.findUnique({
        where: { slug: candidate },
        select: { id: true },
      });
      if (!found || found.id === excludeId) return candidate;
      suffix++;
    }
  }

  private async generateReference(): Promise<string> {
    const count = await this.prisma.product.count();
    const padded = String(count + 1).padStart(5, '0');
    const candidate = `PRD-${padded}`;
    const exists = await this.prisma.product.findUnique({
      where: { reference: candidate },
      select: { id: true },
    });
    if (!exists) return candidate;
    return `PRD-${Date.now().toString(36).toUpperCase().slice(-6)}`;
  }

  // ─── LIST ────────────────────────────────────────────────────────────────────
  async findAll(query: ListProductsDto) {
    const {
      search = '',
      categoryId = '',
      brandId = '',
      active,
      featured,
      stockStatus,
      page = '1',
      perPage = '24',
      mode,
    } = query;

    const pageNum = Math.max(1, parseInt(page));
    const perPageNum = Math.min(100, parseInt(perPage));

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { reference: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (categoryId) where.categoryId = categoryId;
    if (brandId) where.brandId = brandId;
    if (active === 'true') where.active = true;
    if (active === 'false') where.active = false;
    if (featured === 'true') where.featured = true;
    if (stockStatus === 'out') { where.trackStock = true; where.stock = 0; }
    else if (stockStatus === 'low') { where.trackStock = true; where.stock = { gt: 0, lte: 5 }; }
    else if (stockStatus === 'ok') { where.trackStock = true; where.stock = { gt: 5 }; }

    if (mode === 'search') {
      const products = await this.prisma.product.findMany({
        where,
        select: { id: true, name: true, reference: true, basePrice: true, imageKeys: true },
        orderBy: { name: 'asc' },
        take: 20,
      });
      return { products };
    }

    const [total, products] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          brand: { select: { id: true, name: true, logoKey: true } },
          _count: { select: { bundleItems: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * perPageNum,
        take: perPageNum,
      }),
    ]);

    return { products, total, page: pageNum, perPage: perPageNum, pages: Math.ceil(total / perPageNum) };
  }

  // ─── GET ONE ─────────────────────────────────────────────────────────────────
  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true, slug: true, parentId: true } },
        brand: { select: { id: true, name: true, logoKey: true } },
        bundleItems: {
          include: { linked: { select: { id: true, name: true, reference: true, imageKeys: true } } },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
    if (!product) throw new NotFoundException('Produto não encontrado.');
    return { product };
  }

  // ─── CREATE ───────────────────────────────────────────────────────────────────
  async create(dto: CreateProductDto) {
    const slug = await this.uniqueSlug(dto.name);
    const reference = dto.reference?.trim() || (await this.generateReference());

    if (dto.reference) {
      const exists = await this.prisma.product.findUnique({ where: { reference }, select: { id: true } });
      if (exists) throw new BadRequestException('Referência já existe.');
    }

    if (dto.featured === true) {
      await this.prisma.product.updateMany({ where: { featured: true }, data: { featured: false } });
    }

    const product = await this.prisma.product.create({
      data: {
        name: dto.name.trim(),
        slug,
        reference,
        description: dto.description?.trim() || null,
        costPrice: dto.costPrice ?? null,
        basePrice: dto.basePrice,
        hasIva: dto.hasIva ?? true,
        ivaRate: dto.ivaRate ?? 14,
        hasIec: dto.hasIec ?? false,
        iecRate: dto.iecRate ?? 0,
        salePrice: dto.salePrice ?? null,
        trackStock: dto.trackStock ?? true,
        stock: dto.stock ?? 0,
        stockAlert: dto.stockAlert ?? 5,
        categoryId: dto.categoryId || null,
        brandId: dto.brandId || null,
        active: dto.active ?? true,
        featured: dto.featured ?? false,
        ...(dto.bundleItems?.length
          ? {
              bundleItems: {
                create: dto.bundleItems.map((item, i) => ({
                  linkedId: item.linkedId || null,
                  name: item.name,
                  price: item.price,
                  discountPct: item.discountPct ?? 0,
                  sortOrder: item.sortOrder ?? i,
                })),
              },
            }
          : {}),
      },
    });

    return { product };
  }

  // ─── UPDATE ───────────────────────────────────────────────────────────────────
  async update(id: string, dto: UpdateProductDto) {
    const existing = await this.prisma.product.findUnique({
      where: { id },
      select: { id: true, name: true, reference: true },
    });
    if (!existing) throw new NotFoundException('Produto não encontrado.');

    if (dto.reference && dto.reference !== existing.reference) {
      const ref = await this.prisma.product.findUnique({ where: { reference: dto.reference }, select: { id: true } });
      if (ref && ref.id !== id) throw new BadRequestException('Referência já existe.');
    }

    const slug = dto.name.trim() !== existing.name ? await this.uniqueSlug(dto.name, id) : undefined;

    if (dto.featured === true) {
      await this.prisma.product.updateMany({ where: { featured: true, NOT: { id } }, data: { featured: false } });
    }

    const product = await this.prisma.$transaction(async (tx) => {
      if (dto.bundleItems !== undefined) {
        await tx.bundleItem.deleteMany({ where: { parentId: id } });
      }
      return tx.product.update({
        where: { id },
        data: {
          name: dto.name.trim(),
          ...(slug && { slug }),
          ...(dto.reference && { reference: dto.reference.trim() }),
          description: dto.description?.trim() || null,
          costPrice: dto.costPrice ?? null,
          basePrice: dto.basePrice,
          hasIva: dto.hasIva ?? true,
          ivaRate: dto.ivaRate ?? 14,
          hasIec: dto.hasIec ?? false,
          iecRate: dto.iecRate ?? 0,
          salePrice: dto.salePrice ?? null,
          trackStock: dto.trackStock ?? true,
          stock: dto.stock ?? 0,
          stockAlert: dto.stockAlert ?? 5,
          categoryId: dto.categoryId || null,
          brandId: dto.brandId || null,
          active: dto.active ?? true,
          featured: dto.featured ?? false,
          ...(dto.bundleItems
            ? {
                bundleItems: {
                  create: dto.bundleItems.map((item, i) => ({
                    linkedId: item.linkedId || null,
                    name: item.name,
                    price: item.price,
                    discountPct: item.discountPct ?? 0,
                    sortOrder: item.sortOrder ?? i,
                  })),
                },
              }
            : {}),
        },
      });
    });

    return { product };
  }

  // ─── IMAGES ──────────────────────────────────────────────────────────────────
  async uploadImage(id: string, file: Express.Multer.File, slot: number, oldKey?: string) {
    const product = await this.prisma.product.findUnique({ where: { id }, select: { id: true, imageKeys: true } });
    if (!product) throw new NotFoundException('Produto não encontrado.');

    if (!file.mimetype.startsWith('image/')) throw new BadRequestException('Apenas imagens.');
    if (file.size > 5 * 1024 * 1024) throw new BadRequestException('Máximo 5 MB por imagem.');

    const currentKeys = [...(product.imageKeys ?? [])];
    if (currentKeys.length >= 4 && slot >= currentKeys.length) {
      throw new BadRequestException('Máximo 4 imagens por produto.');
    }

    const keyToDelete = oldKey || currentKeys[slot];
    if (keyToDelete) await this.r2.delete(keyToDelete);

    const ext = path.extname(file.originalname).replace('.', '') || 'jpg';
    const newKey = `products/${id}/${Date.now()}-${slot}.${ext}`;
    await this.r2.upload(newKey, file.buffer, file.mimetype);

    while (currentKeys.length <= slot) currentKeys.push('');
    currentKeys[slot] = newKey;
    const imageKeys = currentKeys.filter(Boolean);

    await this.prisma.product.update({ where: { id }, data: { imageKeys } });

    return { imageKey: newKey, imageUrl: this.r2.publicUrl(newKey), imageKeys };
  }

  async deleteImage(id: string, key: string) {
    const product = await this.prisma.product.findUnique({ where: { id }, select: { imageKeys: true } });
    if (!product) throw new NotFoundException('Produto não encontrado.');

    await this.r2.delete(key);
    const imageKeys = (product.imageKeys ?? []).filter((k) => k !== key);
    await this.prisma.product.update({ where: { id }, data: { imageKeys } });

    return { ok: true, imageKeys };
  }

  // ─── SHEET ───────────────────────────────────────────────────────────────────
  async uploadSheet(id: string, file: Express.Multer.File) {
    const product = await this.prisma.product.findUnique({ where: { id }, select: { id: true, sheetKey: true } });
    if (!product) throw new NotFoundException('Produto não encontrado.');

    const allowed = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowed.includes(file.mimetype) && !file.originalname.match(/\.(pdf|doc|docx)$/i)) {
      throw new BadRequestException('Apenas PDF ou Word.');
    }
    if (file.size > 10 * 1024 * 1024) throw new BadRequestException('Máximo 10 MB.');

    if (product.sheetKey) await this.r2.delete(product.sheetKey);

    const ext = path.extname(file.originalname).replace('.', '') || 'pdf';
    const key = `products/${id}/sheet-${Date.now()}.${ext}`;
    await this.r2.upload(key, file.buffer, file.mimetype);

    await this.prisma.product.update({ where: { id }, data: { sheetKey: key } });
    return { sheetKey: key, sheetUrl: this.r2.publicUrl(key) };
  }

  async deleteSheet(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id }, select: { sheetKey: true } });
    if (!product) throw new NotFoundException('Produto não encontrado.');
    if (product.sheetKey) await this.r2.delete(product.sheetKey);
    await this.prisma.product.update({ where: { id }, data: { sheetKey: null } });
    return { ok: true };
  }
}
