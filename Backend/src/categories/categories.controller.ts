import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CategoriasDestaqueService } from './categorias-destaque.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { AuthGuard } from '../auth/auth.guard';

@Controller('categories')
export class CategoriesController {
  constructor(
    private categories: CategoriesService,
    private destaques: CategoriasDestaqueService,
  ) {}

  /** Público: categorias com mais produtos (secção da página inicial), com imagem */
  @Get('destaque')
  destaque(@Query('limit') limit?: string, @Query('ordem') ordem?: string) {
    return this.destaques.destaque(Math.min(40, Math.max(1, parseInt(limit ?? '20') || 20)), ordem === 'stock' ? 'stock' : 'produtos');
  }

  /** Admin: atribuir imagem automática às categorias sem imagem */
  @Post('imagens-auto')
  @UseGuards(AuthGuard)
  imagensAuto() {
    return this.destaques.gerarImagens();
  }

  @Get()
  findAll() { return this.categories.findAll(); }

  @Post()
  @UseGuards(AuthGuard)
  create(@Body() dto: CreateCategoryDto) { return this.categories.create(dto); }

  @Put(':id')
  @UseGuards(AuthGuard)
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) { return this.categories.update(id, dto); }

  @Delete(':id')
  @UseGuards(AuthGuard)
  remove(@Param('id') id: string) { return this.categories.remove(id); }
}
