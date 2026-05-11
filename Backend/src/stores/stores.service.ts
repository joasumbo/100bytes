import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStoreDto, UpdateStoreDto, UpsertStoreStockDto } from './dto/store.dto';

@Injectable()
export class StoresService {
  constructor(private prisma: PrismaService) {}

  // ─── Lojas ───────────────────────────────────────────────────────────────

  async findAll() {
    const stores = await this.prisma.store.findMany({ orderBy: { name: 'asc' } });
    return { stores };
  }

  async findOne(id: string) {
    const store = await this.prisma.store.findUnique({ where: { id } });
    if (!store) throw new NotFoundException('Loja não encontrada.');
    return { store };
  }

  async create(dto: CreateStoreDto) {
    const store = await this.prisma.store.create({
      data: {
        name: dto.name.trim(),
        address: dto.address.trim(),
        phone: dto.phone?.trim() || null,
        lat: dto.lat ?? null,
        lng: dto.lng ?? null,
        active: dto.active ?? true,
      },
    });
    return { store };
  }

  async update(id: string, dto: UpdateStoreDto) {
    await this.findOne(id);
    const store = await this.prisma.store.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.address !== undefined && { address: dto.address.trim() }),
        ...(dto.phone !== undefined && { phone: dto.phone?.trim() || null }),
        ...(dto.lat !== undefined && { lat: dto.lat }),
        ...(dto.lng !== undefined && { lng: dto.lng }),
        ...(dto.active !== undefined && { active: dto.active }),
      },
    });
    return { store };
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.store.delete({ where: { id } });
    return { ok: true };
  }

  // ─── Stock por loja ──────────────────────────────────────────────────────

  /** Lista o stock de um produto em todas as lojas */
  async getStockByProduct(productId: string) {
    const stocks = await this.prisma.storeStock.findMany({
      where: { productId },
      include: { store: true },
      orderBy: { store: { name: 'asc' } },
    });
    return { stocks };
  }

  /** Lojas com stock > 0 para um produto (endpoint público) */
  async getAvailability(productId: string) {
    const stocks = await this.prisma.storeStock.findMany({
      where: { productId, quantity: { gt: 0 } },
      include: { store: { select: { id: true, name: true, address: true, phone: true, lat: true, lng: true } } },
      orderBy: { store: { name: 'asc' } },
    });
    return { stores: stocks.map(s => ({ ...s.store, quantity: s.quantity })) };
  }

  /** Cria ou actualiza o stock de um produto numa loja */
  async upsertStock(productId: string, dto: UpsertStoreStockDto) {
    const stock = await this.prisma.storeStock.upsert({
      where: { productId_storeId: { productId, storeId: dto.storeId } },
      create: { productId, storeId: dto.storeId, quantity: dto.quantity },
      update: { quantity: dto.quantity },
      include: { store: true },
    });
    return { stock };
  }

  /** Remove o registo de stock de um produto numa loja */
  async removeStock(productId: string, storeId: string) {
    await this.prisma.storeStock.deleteMany({ where: { productId, storeId } });
    return { ok: true };
  }
}
