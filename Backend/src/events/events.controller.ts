import { Body, Controller, Get, HttpCode, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { PrismaService } from '../prisma/prisma.service';

/** Tipos aceites. Tudo o resto é ignorado. */
const TIPOS = new Set(['view', 'search', 'search_click', 'add_to_cart', 'remove_from_cart', 'purchase', 'skin_click', 'newsletter']);
const MAX_LOTE = 25;

type EventoIn = { type?: string; productId?: string; query?: string; meta?: Record<string, unknown> };

/**
 * Registo de comportamento (produto visto, pesquisa, clique, carrinho).
 * É a base de dados para a pesquisa e as recomendações.
 * Público e "fire-and-forget": nunca devolve erro ao site.
 */
@Controller('events')
export class EventsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  @Post()
  @HttpCode(204)
  async registar(@Body() body: { sessionId?: string; events?: EventoIn[] }, @Req() req: Request) {
    const sessionId = String(body?.sessionId ?? '').slice(0, 64);
    if (!/^[A-Za-z0-9_-]{8,64}$/.test(sessionId) || !Array.isArray(body?.events)) return;

    let customerId: string | null = null;
    const token = req.cookies?.['customer_token'];
    if (token) {
      try {
        const p = this.jwt.verify(token);
        if (p?.type === 'customer' && p.sub) customerId = String(p.sub);
      } catch {
        // convidado
      }
    }

    const dados = body.events
      .slice(0, MAX_LOTE)
      .filter((e) => e && TIPOS.has(String(e.type)))
      .map((e) => ({
        type: String(e.type),
        sessionId,
        customerId,
        productId: e.productId ? String(e.productId).slice(0, 40) : null,
        query: e.query ? String(e.query).trim().toLowerCase().slice(0, 120) : null,
        meta: e.meta && typeof e.meta === 'object' ? (limitar(e.meta) as Prisma.InputJsonValue) : undefined,
      }));
    if (dados.length) await this.prisma.event.createMany({ data: dados }).catch(() => undefined);
  }

  /** Admin: resumo dos últimos dias (para confirmar que o registo funciona). */
  @Get('summary')
  @UseGuards(AuthGuard)
  async resumo(@Query('days') days?: string) {
    const desde = new Date(Date.now() - (Math.min(90, Number(days) || 7) * 24 * 3600 * 1000));
    const [porTipo, sessoes, topPesquisas, semResultados] = await Promise.all([
      this.prisma.event.groupBy({ by: ['type'], where: { createdAt: { gte: desde } }, _count: true }),
      this.prisma.event.findMany({ where: { createdAt: { gte: desde } }, distinct: ['sessionId'], select: { sessionId: true } }),
      this.prisma.event.groupBy({
        by: ['query'],
        where: { type: 'search', createdAt: { gte: desde }, query: { not: null } },
        _count: true,
        orderBy: { _count: { query: 'desc' } },
        take: 15,
      }),
      this.prisma.event.groupBy({
        by: ['query'],
        where: { type: 'search', createdAt: { gte: desde }, meta: { path: ['results'], equals: 0 } },
        _count: true,
        orderBy: { _count: { query: 'desc' } },
        take: 15,
      }),
    ]);
    return {
      since: desde,
      sessions: sessoes.length,
      byType: Object.fromEntries(porTipo.map((t) => [t.type, t._count])),
      topSearches: topPesquisas.map((q) => ({ query: q.query, count: q._count })),
      searchesWithoutResults: semResultados.map((q) => ({ query: q.query, count: q._count })),
    };
  }
}

/** Só valores simples e curtos no meta (evita guardar lixo). */
function limitar(meta: Record<string, unknown>) {
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(meta).slice(0, 10)) {
    if (typeof v === 'number' || typeof v === 'boolean') out[k.slice(0, 30)] = v;
    else if (typeof v === 'string') out[k.slice(0, 30)] = v.slice(0, 120);
  }
  return out;
}
