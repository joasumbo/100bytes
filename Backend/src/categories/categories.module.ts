import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { CategoriasDestaqueService } from './categorias-destaque.service';

@Module({
  controllers: [CategoriesController],
  providers: [CategoriesService, CategoriasDestaqueService],
})
export class CategoriesModule {}
