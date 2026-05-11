import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { AuthGuard } from '../auth/auth.guard';

@Controller('categories')
export class CategoriesController {
  constructor(private categories: CategoriesService) {}

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
