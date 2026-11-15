import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import { OrdersService } from './orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Controller('orders')
export class OrdersController {
  constructor(
    private orders: OrdersService,
    private jwt: JwtService,
    private prisma: PrismaService,
  ) {}

  // Criação pública (convidado ou cliente autenticado).
  // Se houver cookie de cliente válido, associa a encomenda à conta.
  @Post()
  async create(@Body() dto: CreateOrderDto, @Req() req: Request) {
    let customerId: string | undefined;
    const token = req.cookies?.['customer_token'];
    if (token) {
      try {
        const payload = this.jwt.verify(token);
        if (payload?.type === 'customer' && payload.sub) customerId = payload.sub;
      } catch {
        // token inválido/expirado → trata como convidado
      }
    }
    const order = await this.orders.create(dto, customerId);

    // Registo de comportamento: uma compra por artigo (base das recomendações)
    const sessao = String(req.headers['x-session-id'] ?? '');
    await this.prisma.event
      .createMany({
        data: order.items
          .filter((i) => i.productId)
          .map((i) => ({
            type: 'purchase',
            sessionId: /^[A-Za-z0-9_-]{8,64}$/.test(sessao) ? sessao : 'order-' + order.code,
            customerId: customerId ?? null,
            productId: i.productId,
            meta: { order: order.code, qty: i.qty, price: i.unitPrice },
          })),
      })
      .catch(() => undefined);

    return { ok: true, code: order.code, order };
  }

  // Rastreio público por código
  @Get(':code')
  async track(@Param('code') code: string) {
    const order = await this.orders.findByCode(code);
    return { order };
  }
}
