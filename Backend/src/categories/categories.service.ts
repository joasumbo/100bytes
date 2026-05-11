import {
  Injectable, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { slugify } from '../common/slugify';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  private async uniqueSlug(base: string, excludeId?: string): Promise<string> {
    let slug = slugify(base);
    let suffix = 1;
    while (true) {
      const candidate = suffix === 1 ? slug : `${slug}-${suffix}`;
      const found = await this.prisma.category.findFirst({
        where: { slug: candidate, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
      });
      if (!found) return candidate;
      suffix++;
    }
  }

  async findAll() {
    const categories = await this.prisma.category.findMany({
      orderBy: [{ parentId: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        _count: { select: { children: true, products: true } },
        parent: { select: { id: true, name: true } },
      },
    });
    return { categories };
  }

  async create(dto: CreateCategoryDto) {
    const slug = await this.uniqueSlug(dto.name);
    const category = await this.prisma.category.create({
      data: {
        name: dto.name.trim(),
        slug,
        description: dto.description?.trim() || null,
        parentId: dto.parentId || null,
        active: dto.active ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
      include: {
        _count: { select: { children: true } },
        parent: { select: { id: true, name: true } },
      },
    });
    return { category };
  }

  async update(id: string, dto: UpdateCategoryDto) {
    if (dto.parentId === id) {
      throw new BadRequestException('Uma categoria não pode ser subcategoria de si mesma.');
    }

    const existing = await this.prisma.category.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Categoria não encontrada.');

    const slug = existing.name !== dto.name.trim() ? await this.uniqueSlug(dto.name, id) : existing.slug;

    const category = await this.prisma.category.update({
      where: { id },
      data: {
        name: dto.name.trim(),
        slug,
        description: dto.description?.trim() || null,
        parentId: dto.parentId || null,
        active: dto.active ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
      include: {
        _count: { select: { children: true } },
        parent: { select: { id: true, name: true } },
      },
    });
    return { category };
  }

  async remove(id: string) {
    const childCount = await this.prisma.category.count({ where: { parentId: id } });
    if (childCount > 0) {
      throw new BadRequestException('Não é possível eliminar uma categoria com subcategorias. Elimine as subcategorias primeiro.');
    }
    await this.prisma.category.delete({ where: { id } });
    return { ok: true };
  }
}
