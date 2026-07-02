import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { OrdersService } from './orders.service';

@Controller('admin/orders')
@UseGuards(AuthGuard)
export class AdminOrdersController {
  constructor(private orders: OrdersService) {}

  @Get()
  async list(@Query('status') status?: string, @Query('search') search?: string) {
    const orders = await this.orders.listAll({ status, search });
    return { orders };
  }

  @Patch(':code/status')
  async updateStatus(@Param('code') code: string, @Body('status') status: string) {
    const order = await this.orders.updateStatus(code, status);
    return { ok: true, order };
  }

  @Delete(':code')
  async remove(@Param('code') code: string) {
    return this.orders.remove(code);
  }
}
