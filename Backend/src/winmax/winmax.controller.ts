import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Prisma } from '@prisma/client';
import { memoryStorage } from 'multer';
import { AuthGuard } from '../auth/auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { WinmaxClient, WinmaxError } from './winmax.client';
import { WinmaxSyncService } from './winmax-sync.service';
import { WinmaxImagesService } from './winmax-images.service';

/** Admin: estado do conector, sincronização manual e consulta dos dados do Winmax. */
@Controller('admin/winmax')
@UseGuards(AuthGuard)
export class WinmaxController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly winmax: WinmaxClient,
    private readonly sync: WinmaxSyncService,
    private readonly imagens: WinmaxImagesService,
  ) {}

  /** Resumo: configuração, execução em curso, últimas execuções e contagens. */
  @Get('status')
  async status() {
    const [runs, artigos, comStock, ultimaOk, ultimaFull] = await Promise.all([
      this.prisma.winmaxSyncRun.findMany({
        orderBy: { startedAt: 'desc' },
        take: 15,
      }),
      this.prisma.winmaxArticle.count({ where: { present: true } }),
      this.prisma.winmaxArticle.count({
        where: { present: true, stockTotal: { gt: 0 } },
      }),
      this.prisma.winmaxSyncRun.findFirst({
        where: { status: 'ok' },
        orderBy: { startedAt: 'desc' },
      }),
      this.prisma.winmaxSyncRun.findFirst({
        where: { status: 'ok', mode: 'full' },
        orderBy: { startedAt: 'desc' },
      }),
    ]);
    return {
      configured: this.winmax.configured,
      running: this.sync.running,
      counts: { articles: artigos, inStock: comStock },
      lastOk: ultimaOk,
      lastFull: ultimaFull,
      runs,
    };
  }

  /** Testa a ligação (lê os armazéns). */
  @Get('test')
  async test() {
    try {
      const armazens = await this.winmax.getWarehouses();
      return { ok: true, warehouses: armazens.length };
    } catch (e: any) {
      return {
        ok: false,
        code: e instanceof WinmaxError ? e.code : null,
        error: String(e?.message ?? e),
      };
    }
  }

  /** Inicia uma sincronização em segundo plano. */
  @Post('sync')
  startSync(@Body() body: { mode?: string }) {
    const modo = body?.mode === 'incremental' ? 'incremental' : 'full';
    const p = this.sync.start(modo, 'manual');
    if (!p)
      throw new ConflictException('Já está a decorrer uma sincronização.');
    p.catch(() => undefined);
    return { started: true, mode: modo };
  }

  @Get('warehouses')
  async warehouses() {
    return {
      warehouses: await this.prisma.winmaxWarehouse.findMany({
        orderBy: { code: 'asc' },
      }),
    };
  }

  @Get('terminals')
  async terminals() {
    return {
      terminals: await this.prisma.winmaxTerminal.findMany({
        orderBy: { code: 'asc' },
      }),
    };
  }

  /**
   * Artigos sincronizados, com stock por armazém e foto principal.
   * Filtros: q, inStock=1, photo=with|without, page, perPage.
   */
  @Get('articles')
  async articles(
    @Query('q') q?: string,
    @Query('inStock') inStock?: string,
    @Query('photo') photo?: string,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
  ) {
    const p = Math.max(1, parseInt(page ?? '1') || 1);
    const pp = Math.min(100, Math.max(1, parseInt(perPage ?? '25') || 25));
    const texto = q?.trim();

    const where: Prisma.WinmaxArticleWhereInput = {
      present: true,
      ...(inStock === '1' && { stockTotal: { gt: 0 } }),
      ...(photo === 'with' && { images: { some: {} } }),
      ...(photo === 'without' && { images: { none: {} } }),
      ...(texto && {
        OR: [
          { designation: { contains: texto, mode: 'insensitive' } },
          { code: { contains: texto, mode: 'insensitive' } },
        ],
      }),
    };

    const [total, items] = await Promise.all([
      this.prisma.winmaxArticle.count({ where }),
      this.prisma.winmaxArticle.findMany({
        where,
        include: {
          stocks: { orderBy: { warehouseCode: 'asc' } },
          images: { orderBy: { position: 'asc' }, take: 1 },
          _count: { select: { images: true } },
        },
        orderBy: { designation: 'asc' },
        skip: (p - 1) * pp,
        take: pp,
      }),
    ]);
    return {
      total,
      page: p,
      perPage: pp,
      items: items.map(({ images, _count, ...a }) => ({
        ...a,
        imageCount: _count.images,
        mainImage: images[0] ? this.imagens.url(images[0].key) : null,
      })),
    };
  }

  /** Um artigo: stock, todas as fotos e o resultado da procura no Icecat. */
  @Get('articles/:code')
  async article(@Param('code') code: string) {
    const a = await this.prisma.winmaxArticle.findUnique({
      where: { code },
      include: {
        stocks: { orderBy: { warehouseCode: 'asc' } },
        images: { orderBy: { position: 'asc' } },
        info: true,
      },
    });
    if (!a) throw new NotFoundException('Artigo não encontrado.');
    return {
      article: {
        ...a,
        images: a.images.map((i) => ({ ...i, url: this.imagens.url(i.key) })),
      },
    };
  }

  // ─── Fotos ───────────────────────────────────────────────────────────────

  /** Contagens de fotos (artigos com stock) e a última procura automática. */
  @Get('images/status')
  async imagesStatus() {
    const comStock = { present: true, stockTotal: { gt: 0 } };
    const [total, comFoto, procurados, job] = await Promise.all([
      this.prisma.winmaxArticle.count({ where: comStock }),
      this.prisma.winmaxArticle.count({
        where: { ...comStock, images: { some: {} } },
      }),
      this.prisma.winmaxArticle.count({
        where: { ...comStock, info: { isNot: null } },
      }),
      this.prisma.winmaxImageJob.findFirst({ orderBy: { startedAt: 'desc' } }),
    ]);
    return {
      running: this.imagens.running,
      inStock: {
        total,
        withPhoto: comFoto,
        withoutPhoto: total - comFoto,
        searched: procurados,
      },
      lastJob: job,
    };
  }

  /** Procura automática de fotos para os artigos com stock e sem foto. */
  @Post('images/auto')
  async imagesAuto(@Body() body: { force?: boolean }) {
    const r = await this.imagens.iniciarLote(Boolean(body?.force));
    if (!r)
      throw new ConflictException('Já está a decorrer uma procura de fotos.');
    return { started: true, ...r };
  }

  /** Procura fotos para um artigo (ignora procuras anteriores). */
  @Post('articles/:code/lookup')
  async lookup(@Param('code') code: string) {
    const adicionadas = await this.imagens.procurar(code);
    return { added: adicionadas };
  }

  @Post('articles/:code/images')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  upload(
    @Param('code') code: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Ficheiro obrigatório.');
    return this.imagens.upload(code, file);
  }

  @Delete('articles/:code/images/:id')
  removeImage(@Param('code') code: string, @Param('id') id: string) {
    return this.imagens.remover(code, id);
  }

  @Post('articles/:code/images/:id/main')
  mainImage(@Param('code') code: string, @Param('id') id: string) {
    return this.imagens.principal(code, id);
  }
}
