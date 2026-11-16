import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { PushAutomacoesService } from './push-automacoes.service';
import { PushService, luanda } from './push.service';

/** Rotas públicas usadas pela loja (registo do aparelho e cliques) */
@Controller('push')
export class PushController {
  constructor(
    private readonly push: PushService,
    private readonly jwt: JwtService,
  ) {}

  @Get('chave')
  chave() {
    return { ativo: this.push.ativo, publicKey: this.push.chavePublica || null };
  }

  @Post('subscrever')
  @HttpCode(200)
  async subscrever(
    @Req() req: Request,
    @Body() body: { subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } }; sessionId?: string; origem?: string },
  ) {
    const s = body?.subscription;
    if (!s?.endpoint || !/^https:\/\//.test(s.endpoint) || !s.keys?.p256dh || !s.keys?.auth) throw new BadRequestException('Subscrição inválida.');
    let customerId: string | null = null;
    const token = req.cookies?.['customer_token'];
    if (token) {
      try {
        const p = this.jwt.verify(token);
        if (p?.type === 'customer' && p.sub) customerId = String(p.sub);
      } catch {
        /* convidado */
      }
    }
    const sessionId = /^[A-Za-z0-9_-]{8,64}$/.test(String(body.sessionId || '')) ? String(body.sessionId) : null;
    const sub = await this.push.subscrever({
      endpoint: s.endpoint.slice(0, 1000),
      p256dh: s.keys.p256dh.slice(0, 200),
      auth: s.keys.auth.slice(0, 100),
      sessionId,
      customerId,
      userAgent: String(req.headers['user-agent'] || ''),
      origem: body.origem || null,
    });
    return { ok: true, id: sub.id };
  }

  @Post('cancelar')
  @HttpCode(200)
  async cancelar(@Body() body: { endpoint?: string }) {
    if (body?.endpoint) await this.push.cancelar(String(body.endpoint));
    return { ok: true };
  }

  @Post('clique/:id')
  @HttpCode(204)
  async clique(@Param('id') id: string) {
    if (/^[a-z0-9]{10,40}$/i.test(id)) await this.push.clique(id);
  }
}

/** Painel de notificações no admin */
@Controller('push/admin')
@UseGuards(AuthGuard)
export class PushAdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
    private readonly auto: PushAutomacoesService,
  ) {}

  @Get('resumo')
  async resumo(@Query('dias') diasQ?: string) {
    const dias = Math.min(90, Math.max(7, parseInt(diasQ || '30') || 30));
    const desde = new Date(Date.now() - dias * 86400000);

    const [ativas, total, revogadas, novas] = await Promise.all([
      this.prisma.pushSubscription.count({ where: { active: true } }),
      this.prisma.pushSubscription.count(),
      this.prisma.pushSubscription.count({ where: { active: false } }),
      this.prisma.pushSubscription.count({ where: { createdAt: { gte: desde } } }),
    ]);
    const [enviadas, entregues, cliques] = await Promise.all([
      this.prisma.pushSend.count({ where: { sentAt: { gte: desde } } }),
      this.prisma.pushSend.count({ where: { sentAt: { gte: desde }, status: 'enviada' } }),
      this.prisma.pushSend.count({ where: { sentAt: { gte: desde }, clickedAt: { not: null } } }),
    ]);

    // Séries diárias (dia de Luanda)
    const serie = async (sql: Prisma.Sql) => (await this.prisma.$queryRaw<{ dia: string; n: bigint }[]>(sql)).map((r) => ({ dia: r.dia, n: Number(r.n) }));
    const [adesoes, envios, cliquesDia] = await Promise.all([
      serie(Prisma.sql`SELECT to_char(("createdAt" + interval '1 hour')::date, 'YYYY-MM-DD') AS dia, count(*) AS n FROM push_subscriptions WHERE "createdAt" >= ${desde} GROUP BY 1`),
      serie(Prisma.sql`SELECT to_char(("sentAt" + interval '1 hour')::date, 'YYYY-MM-DD') AS dia, count(*) AS n FROM push_sends WHERE "sentAt" >= ${desde} GROUP BY 1`),
      serie(Prisma.sql`SELECT to_char(("clickedAt" + interval '1 hour')::date, 'YYYY-MM-DD') AS dia, count(*) AS n FROM push_sends WHERE "clickedAt" >= ${desde} GROUP BY 1`),
    ]);
    const mapa = (l: { dia: string; n: number }[]) => new Map(l.map((x) => [x.dia, x.n]));
    const [mA, mE, mC] = [mapa(adesoes), mapa(envios), mapa(cliquesDia)];
    const porDia: { dia: string; adesoes: number; enviadas: number; cliques: number }[] = [];
    for (let i = dias - 1; i >= 0; i--) {
      const d = luanda(new Date(Date.now() - i * 86400000)).data;
      porDia.push({ dia: d, adesoes: mA.get(d) || 0, enviadas: mE.get(d) || 0, cliques: mC.get(d) || 0 });
    }

    // Por tipo de notificação
    const tipos = await this.prisma.pushSend.groupBy({ by: ['kind'], where: { sentAt: { gte: desde } }, _count: true });
    const tiposClique = await this.prisma.pushSend.groupBy({ by: ['kind'], where: { sentAt: { gte: desde }, clickedAt: { not: null } }, _count: true });
    const cliquesPorTipo = new Map(tiposClique.map((t) => [t.kind, t._count]));
    const porTipo = tipos
      .map((t) => ({ tipo: t.kind, enviadas: t._count, cliques: cliquesPorTipo.get(t.kind) || 0 }))
      .sort((a, b) => b.enviadas - a.enviadas);

    // Pedidos de permissão (eventos do site): mostrado / aceite / recusado
    const pedidos = await this.prisma.$queryRaw<{ acao: string; n: bigint }[]>(
      Prisma.sql`SELECT meta->>'acao' AS acao, count(*) AS n FROM events WHERE type = 'push_prompt' AND "createdAt" >= ${desde} GROUP BY 1`,
    );
    const pedido = Object.fromEntries(pedidos.map((p) => [p.acao || '?', Number(p.n)]));

    const origens = await this.prisma.pushSubscription.groupBy({ by: ['origem'], where: { active: true }, _count: true });
    const comConta = await this.prisma.pushSubscription.count({ where: { active: true, customerId: { not: null } } });

    const ultimos = await this.prisma.pushSend.findMany({
      orderBy: { sentAt: 'desc' },
      take: 30,
      select: { id: true, kind: true, title: true, body: true, url: true, status: true, sentAt: true, clickedAt: true },
    });

    return {
      dias,
      ativo: this.push.ativo,
      aparelhos: { ativas, total, revogadas, novas, comConta },
      envios: { enviadas, entregues, cliques, taxaClique: entregues ? cliques / entregues : 0 },
      pedidos: { mostrado: pedido['mostrado'] || 0, aceite: pedido['aceite'] || 0, recusado: pedido['recusado'] || 0, dispensado: pedido['dispensado'] || 0 },
      origens: origens.map((o) => ({ origem: o.origem || 'outro', n: o._count })).sort((a, b) => b.n - a.n),
      porDia,
      porTipo,
      ultimos,
    };
  }

  @Get('automacoes')
  automacoes() {
    return this.push.definicoes();
  }

  @Put('automacoes')
  guardar(@Body() body: Record<string, unknown>) {
    return this.push.guardarDefinicoes(body as any);
  }

  @Get('campanhas')
  async campanhas() {
    const lista = await this.prisma.pushCampaign.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
    const stats = await this.prisma.pushSend.groupBy({ by: ['campaignId'], where: { campaignId: { in: lista.map((c) => c.id) } }, _count: true });
    const clq = await this.prisma.pushSend.groupBy({ by: ['campaignId'], where: { campaignId: { in: lista.map((c) => c.id) }, clickedAt: { not: null } }, _count: true });
    const e = new Map(stats.map((s) => [s.campaignId, s._count]));
    const c = new Map(clq.map((s) => [s.campaignId, s._count]));
    return lista.map((x) => ({ ...x, enviadas: e.get(x.id) || 0, cliques: c.get(x.id) || 0 }));
  }

  @Post('campanhas')
  async criar(@Body() b: { title?: string; body?: string; url?: string; image?: string; segment?: string; scheduledAt?: string; enviarAgora?: boolean }) {
    const title = String(b.title || '').trim().slice(0, 80);
    const body = String(b.body || '').trim().slice(0, 200);
    const url = String(b.url || '/').trim().slice(0, 300) || '/';
    if (!title || !body) throw new BadRequestException('Indique o título e o texto.');
    const quando = b.scheduledAt ? new Date(b.scheduledAt) : null;
    const c = await this.prisma.pushCampaign.create({
      data: {
        title,
        body,
        url,
        image: b.image ? String(b.image).slice(0, 500) : null,
        segment: String(b.segment || 'todos').slice(0, 80),
        status: quando && !b.enviarAgora ? 'agendada' : 'rascunho',
        scheduledAt: quando,
      },
    });
    if (b.enviarAgora) return { campanha: c, ...(await this.auto.enviarCampanha(c.id)) };
    return { campanha: c };
  }

  @Post('campanhas/:id/enviar')
  @HttpCode(200)
  enviar(@Param('id') id: string) {
    return this.auto.enviarCampanha(id);
  }

  @Delete('campanhas/:id')
  async apagar(@Param('id') id: string) {
    await this.prisma.pushCampaign.deleteMany({ where: { id, status: { in: ['rascunho', 'agendada'] } } });
    return { ok: true };
  }

  @Get('destinatarios')
  async destinatarios(@Query('segmento') segmento?: string) {
    return { total: (await this.auto.destinatarios(segmento || 'todos')).length };
  }

  /** Envia uma notificação de teste aos aparelhos de um cliente (pelo email da conta) */
  @Post('teste')
  @HttpCode(200)
  async teste(@Body() b: { email?: string }) {
    const cliente = await this.prisma.customer.findFirst({ where: { email: { equals: String(b.email || ''), mode: 'insensitive' } }, select: { id: true } });
    if (!cliente) throw new BadRequestException('Não há conta com esse email.');
    const subs = await this.prisma.pushSubscription.findMany({ where: { active: true, customerId: cliente.id } });
    if (!subs.length) throw new BadRequestException('Esse cliente não tem notificações ativas.');
    const n = await this.push.enviar(subs, 'teste', { titulo: 'Notificação de teste', corpo: 'Se está a ver esta mensagem, as notificações da 100 bytes estão a funcionar.', url: '/', tag: 'teste' });
    return { enviadas: n };
  }

  /** Corre já um ciclo das automações (útil para testar) */
  @Post('correr')
  @HttpCode(200)
  async correr() {
    await this.auto.ciclo();
    return { ok: true };
  }
}
