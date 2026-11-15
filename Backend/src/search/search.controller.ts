import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private readonly search: SearchService) {}

  /** Público: pesquisa de produtos. */
  @Get()
  pesquisar(
    @Query('q') q = '',
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
    @Query('categorySlug') categorySlug?: string,
    @Query('brand') brand?: string,
    @Query('sort') sort?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
  ) {
    return this.search.pesquisar({
      q: String(q).slice(0, 120),
      page: Math.max(1, parseInt(page ?? '1') || 1),
      perPage: Math.min(60, Math.max(1, parseInt(perPage ?? '24') || 24)),
      categorySlug: categorySlug || undefined,
      brand: brand || undefined,
      sort,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
    });
  }

  /** Público: sugestões enquanto se escreve. */
  @Get('suggest')
  sugerir(@Query('q') q = '') {
    const t = String(q).trim().slice(0, 80);
    if (t.length < 2) return { products: [], categories: [], total: 0 };
    return this.search.sugerir(t);
  }

  /** Admin: reconstruir o índice agora. */
  @Post('reindex')
  @UseGuards(AuthGuard)
  reindexar() {
    return this.search.reindexar();
  }
}
