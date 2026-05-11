import {
  Controller, Get, Post, Put, Delete, Body, Param, Query,
  UseGuards, UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { AuthGuard } from '../auth/auth.guard';

@Controller('products')
export class ProductsController {
  constructor(private products: ProductsService) {}

  @Get()
  findAll(@Query() query: Record<string, string>) {
    return this.products.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.products.findOne(id);
  }

  @Post()
  @UseGuards(AuthGuard)
  create(@Body() dto: CreateProductDto) {
    return this.products.create(dto);
  }

  @Put(':id')
  @UseGuards(AuthGuard)
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.products.update(id, dto);
  }

  // ─── Imagens ──────────────────────────────────────────────────────────────
  @Post(':id/images')
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  uploadImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('slot') slot: string,
    @Body('oldKey') oldKey?: string,
  ) {
    if (!file) throw new BadRequestException('Ficheiro obrigatório.');
    return this.products.uploadImage(id, file, parseInt(slot ?? '0'), oldKey);
  }

  @Delete(':id/images')
  @UseGuards(AuthGuard)
  deleteImage(@Param('id') id: string, @Body('key') key: string) {
    if (!key) throw new BadRequestException('Key obrigatória.');
    return this.products.deleteImage(id, key);
  }

  // ─── Ficha informativa ────────────────────────────────────────────────────
  @Post(':id/sheet')
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  uploadSheet(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Ficheiro obrigatório.');
    return this.products.uploadSheet(id, file);
  }

  @Delete(':id/sheet')
  @UseGuards(AuthGuard)
  deleteSheet(@Param('id') id: string) {
    return this.products.deleteSheet(id);
  }
}
