import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';

const VALID_STATUS = [
  'pending',
  'confirmed',
  'preparing',
  'shipped',
  'delivered',
  'cancelled',
];

// Sem caracteres ambíguos (0/O, 1/I)
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  private generateCode(): string {
    let code = '100B-';
    for (let i = 0; i < 6; i++) {
      code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    }
    return code;
  }

  private async uniqueCode(): Promise<string> {
    for (let attempt = 0; attempt < 8; attempt++) {
      const code = this.generateCode();
      const exists = await this.prisma.order.findUnique({ where: { code } });
      if (!exists) return code;
    }
    // fallback improvável
    return '100B-' + Date.now().toString(36).toUpperCase().slice(-6);
  }

  async create(dto: CreateOrderDto, customerId?: string) {
    const code = await this.uniqueCode();

    // Carrega produtos referenciados para validar e enriquecer (referência/stock)
    const ids = dto.items.map((i) => i.productId).filter(Boolean) as string[];
    const products = ids.length
      ? await this.prisma.product.findMany({ where: { id: { in: ids } } })
      : [];
    const byId = new Map(products.map((p) => [p.id, p]));

    const items = dto.items.map((i) => {
      const p = i.productId ? byId.get(i.productId) : undefined;
      const unitPrice = Number(i.price) || 0;
      const qty = Math.max(1, Math.floor(Number(i.qty) || 1));
      return {
        productId: p ? p.id : null,
        name: i.name || p?.name || 'Produto',
        reference: p?.reference ?? null,
        priceFormatted: i.priceFormatted ?? null,
        image: i.image ?? null,
        unitPrice,
        qty,
        lineTotal: unitPrice * qty,
      };
    });

    const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
    const shipping = 0; // calculado quando houver regras de envio
    const total = subtotal + shipping;

    // Transação: cria a encomenda + itens e desconta o stock dos produtos rastreados
    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          code,
          status: 'pending',
          customerId: customerId ?? null,
          customerName: dto.customer.name,
          customerEmail: dto.customer.email,
          customerPhone: dto.customer.phone ?? null,
          province: dto.delivery?.province ?? null,
          city: dto.delivery?.city ?? null,
          address: dto.delivery?.address ?? null,
          notes: dto.delivery?.notes ?? null,
          paymentMethod: dto.paymentMethod ?? null,
          paymentStatus: 'pending',
          subtotal,
          shipping,
          total,
          items: { create: items },
        },
        include: { items: true },
      });

      // Desconta stock (apenas produtos com trackStock e productId válido)
      for (const it of items) {
        if (!it.productId) continue;
        const p = byId.get(it.productId);
        if (p && p.trackStock) {
          const newStock = Math.max(0, (p.stock ?? 0) - it.qty);
          await tx.product.update({
            where: { id: it.productId },
            data: { stock: newStock },
          });
        }
      }

      return created;
    });

    return order;
  }

  async findByCode(code: string) {
    const order = await this.prisma.order.findUnique({
      where: { code: (code || '').toUpperCase() },
      include: { items: true },
    });
    if (!order) throw new NotFoundException('Encomenda não encontrada.');
    return order;
  }

  async listAll(opts: { status?: string; search?: string } = {}) {
    const where: any = {};
    if (opts.status && VALID_STATUS.includes(opts.status)) where.status = opts.status;
    if (opts.search) {
      const q = opts.search.trim();
      where.OR = [
        { code: { contains: q, mode: 'insensitive' } },
        { customerName: { contains: q, mode: 'insensitive' } },
        { customerEmail: { contains: q, mode: 'insensitive' } },
      ];
    }
    return this.prisma.order.findMany({
      where,
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listByCustomer(customerId: string | undefined, email: string) {
    return this.prisma.order.findMany({
      where: customerId
        ? { OR: [{ customerId }, { customerEmail: email }] }
        : { customerEmail: email },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(code: string, status: string) {
    if (!VALID_STATUS.includes(status)) {
      throw new BadRequestException('Estado inválido.');
    }
    const existing = await this.prisma.order.findUnique({
      where: { code: (code || '').toUpperCase() },
    });
    if (!existing) throw new NotFoundException('Encomenda não encontrada.');
    return this.prisma.order.update({
      where: { code: existing.code },
      data: { status },
      include: { items: true },
    });
  }

  async remove(code: string) {
    const existing = await this.prisma.order.findUnique({
      where: { code: (code || '').toUpperCase() },
    });
    if (!existing) throw new NotFoundException('Encomenda não encontrada.');
    await this.prisma.order.delete({ where: { code: existing.code } });
    return { ok: true };
  }
}
