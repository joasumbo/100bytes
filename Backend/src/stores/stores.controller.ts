import {
  Controller, Get, Post, Put, Delete, Body, Param, UseGuards,
} from '@nestjs/common';
import { StoresService } from './stores.service';
import { CreateStoreDto, UpdateStoreDto, UpsertStoreStockDto } from './dto/store.dto';
import { AuthGuard } from '../auth/auth.guard';

@Controller('stores')
export class StoresController {
  constructor(private stores: StoresService) {}

  // ─── Lojas (público: GET, protegido: mutações) ────────────────────────────

  @Get()
  findAll() {
    return this.stores.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.stores.findOne(id);
  }

  @Post()
  @UseGuards(AuthGuard)
  create(@Body() dto: CreateStoreDto) {
    return this.stores.create(dto);
  }

  @Put(':id')
  @UseGuards(AuthGuard)
  update(@Param('id') id: string, @Body() dto: UpdateStoreDto) {
    return this.stores.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  remove(@Param('id') id: string) {
    return this.stores.remove(id);
  }

  // ─── Stock por produto ────────────────────────────────────────────────────

  /** Disponibilidade pública: lojas com stock > 0 para um produto */
  @Get('availability/:productId')
  getAvailability(@Param('productId') productId: string) {
    return this.stores.getAvailability(productId);
  }

  /** Admin: ver stock completo de um produto (inclui lojas com 0) */
  @Get('stock/:productId')
  @UseGuards(AuthGuard)
  getStock(@Param('productId') productId: string) {
    return this.stores.getStockByProduct(productId);
  }

  /** Admin: criar/actualizar quantidade de um produto numa loja */
  @Post('stock/:productId')
  @UseGuards(AuthGuard)
  upsertStock(@Param('productId') productId: string, @Body() dto: UpsertStoreStockDto) {
    return this.stores.upsertStock(productId, dto);
  }

  /** Admin: remover stock de um produto numa loja */
  @Delete('stock/:productId/:storeId')
  @UseGuards(AuthGuard)
  removeStock(@Param('productId') productId: string, @Param('storeId') storeId: string) {
    return this.stores.removeStock(productId, storeId);
  }
}
