import {
  Body,
  ConflictException,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthGuard } from '../auth/auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { WinmaxClient, WinmaxError } from './winmax.client';
import { WinmaxSyncService } from './winmax-sync.service';

/** Admin: estado do conector, sincronização manual e consulta dos dados do Winmax. */
@Controller('admin/winmax')
@UseGuards(AuthGuard)
export class WinmaxController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly winmax: WinmaxClient,
    private readonly sync: WinmaxSyncService,
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

  /** Artigos sincronizados, com stock por armazém. Filtros: q, inStock, page, perPage. */
  @Get('articles')
  async articles(
    @Query('q') q?: string,
    @Query('inStock') inStock?: string,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
  ) {
    const p = Math.max(1, parseInt(page ?? '1') || 1);
    const pp = Math.min(100, Math.max(1, parseInt(perPage ?? '25') || 25));
    const texto = q?.trim();

    const where: Prisma.WinmaxArticleWhereInput = {
      present: true,
      ...(inStock === '1' && { stockTotal: { gt: 0 } }),
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
        include: { stocks: { orderBy: { warehouseCode: 'asc' } } },
        orderBy: { designation: 'asc' },
        skip: (p - 1) * pp,
        take: pp,
      }),
    ]);
    return { total, page: p, perPage: pp, items };
  }
}
