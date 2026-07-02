import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Controller('orders')
export class OrdersController {
  constructor(
    private orders: OrdersService,
    private jwt: JwtService,
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
    return { ok: true, code: order.code, order };
  }

  // Rastreio público por código
  @Get(':code')
  async track(@Param('code') code: string) {
    const order = await this.orders.findByCode(code);
    return { order };
  }
}
