import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { R2Service } from '../r2/r2.service';
import { slugify } from '../common/slugify';
import { CreateBrandDto, UpdateBrandDto } from './dto/brand.dto';

@Injectable()
export class BrandsService {
  constructor(
    private prisma: PrismaService,
    private r2: R2Service,
  ) {}

  private async uniqueSlug(base: string, excludeId?: string): Promise<string> {
    let slug = slugify(base);
    let suffix = 1;
    while (true) {
      const candidate = suffix === 1 ? slug : `${slug}-${suffix}`;
      const found = await this.prisma.brand.findFirst({
        where: { slug: candidate, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
      });
      if (!found) return candidate;
      suffix++;
    }
  }

  async findPublic() {
    const brands = await this.prisma.brand.findMany({
      where: { active: true, NOT: { logoKey: null } },
      orderBy: { name: 'asc' },
      select: {
        id: true, name: true, slug: true, logoKey: true,
        products: {
          where: { active: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { imageKeys: true },
        },
      },
    });
    return { brands };
  }

  async findAll() {
    const brands = await this.prisma.brand.findMany({ orderBy: { name: 'asc' } });
    return { brands };
  }

  async create(dto: CreateBrandDto) {
    const slug = await this.uniqueSlug(dto.name);
    const brand = await this.prisma.brand.create({
      data: {
        name: dto.name.trim(),
        slug,
        country: dto.country?.trim() || null,
        active: dto.active ?? true,
      },
    });
    return { brand };
  }

  async update(id: string, dto: UpdateBrandDto) {
    const existing = await this.prisma.brand.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Marca não encontrada.');

    const slug = existing.name !== dto.name.trim() ? await this.uniqueSlug(dto.name, id) : existing.slug;

    const brand = await this.prisma.brand.update({
      where: { id },
      data: {
        name: dto.name.trim(),
        slug,
        country: dto.country?.trim() || null,
        active: dto.active ?? true,
      },
    });
    return { brand };
  }

  async remove(id: string) {
    const brand = await this.prisma.brand.findUnique({ where: { id } });
    if (!brand) throw new NotFoundException('Marca não encontrada.');
    if (brand.logoKey) await this.r2.delete(brand.logoKey);
    await this.prisma.brand.delete({ where: { id } });
    return { ok: true };
  }

  async uploadLogo(id: string, file: Express.Multer.File, oldKey?: string) {
    const brand = await this.prisma.brand.findUnique({ where: { id } });
    if (!brand) throw new NotFoundException('Marca não encontrada.');
    if (!file.mimetype.startsWith('image/')) throw new BadRequestException('Apenas imagens são permitidas.');

    const keyToDelete = oldKey ?? brand.logoKey;
    if (keyToDelete) await this.r2.delete(keyToDelete);

    const ext = file.mimetype.split('/')[1]?.replace('jpeg', 'jpg') ?? 'png';
    const logoKey = `brands/${id}/${Date.now()}.${ext}`;
    await this.r2.upload(logoKey, file.buffer, file.mimetype);

    await this.prisma.brand.update({ where: { id }, data: { logoKey } });
    return { logoKey };
  }

  async deleteLogo(id: string) {
    const brand = await this.prisma.brand.findUnique({ where: { id } });
    if (!brand) throw new NotFoundException('Marca não encontrada.');
    if (brand.logoKey) {
      await this.r2.delete(brand.logoKey);
      await this.prisma.brand.update({ where: { id }, data: { logoKey: null } });
    }
    return { ok: true };
  }
}
