import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as webpush from 'web-push';
import { PrismaService } from '../prisma/prisma.service';
import { R2Service } from '../r2/r2.service';

/**
 * Notificações push (Web Push com chaves VAPID, sem serviços externos pagos).
 *
 * - Guarda os aparelhos que aceitaram (PushSubscription) e cada envio (PushSend).
 * - Todos os links levam UTM + `pn=<id do envio>` para medir cliques e entradas no site.
 * - Mensagens de marketing respeitam um limite por aparelho e um horário (ver Definicoes).
 */

export type Tipo =
  | 'encomenda'
  | 'favorito_preco'
  | 'favorito_stock'
  | 'carrinho'
  | 'interesse'
  | 'diario'
  | 'feriado'
  | 'campanha'
  | 'teste';

/** Tipos de marketing (contam para o limite diário por aparelho) */
export const MARKETING: Tipo[] = ['carrinho', 'interesse', 'diario', 'feriado', 'campanha'];

export type Mensagem = {
  titulo: string;
  corpo: string;
  url: string; // caminho do site (ex.: /encomenda/100B-ABC123)
  imagem?: string | null;
  tag?: string;
  ref?: string | null;
  campanhaId?: string | null;
};

export type Definicoes = {
  encomendas: boolean;
  favoritos: boolean;
  carrinho: boolean;
  interesse: boolean;
  diario: boolean;
  feriados: boolean;
  horaDiario: number; // hora de Luanda do produto do dia
  diasDiario: number[]; // 0=domingo … 6=sábado
  carrinhoHoras: number; // horas sem finalizar até avisar
  interesseHoras: number; // horas depois da visita
  limiteHoras: number; // no máximo 1 mensagem de marketing por aparelho neste intervalo
  inicio: number; // horário permitido para marketing automático (Luanda)
  fim: number;
};

export const DEFINICOES_PADRAO: Definicoes = {
  encomendas: true,
  favoritos: true,
  carrinho: true,
  interesse: true,
  diario: true,
  feriados: true,
  horaDiario: 10,
  diasDiario: [1, 2, 3, 4, 5],
  carrinhoHoras: 2,
  interesseHoras: 3,
  limiteHoras: 20,
  inicio: 9,
  fim: 20,
};

const SITE = (process.env.SITE_URL || 'https://100bytes.co.ao').replace(/\/$/, '');

/** Data/hora de Luanda (UTC+1, sem horário de verão) */
export function luanda(d = new Date()) {
  const l = new Date(d.getTime() + 60 * 60 * 1000);
  return { data: l.toISOString().slice(0, 10), hora: l.getUTCHours(), diaSemana: l.getUTCDay(), ano: l.getUTCFullYear() };
}

export function kz(v: unknown) {
  return Number(v || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' Kz';
}

@Injectable()
export class PushService implements OnModuleInit {
  private readonly log = new Logger('Push');
  ativo = false;
  chavePublica = '';

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly r2: R2Service,
  ) {}

  onModuleInit() {
    const pub = this.config.get<string>('VAPID_PUBLIC_KEY');
    const priv = this.config.get<string>('VAPID_PRIVATE_KEY');
    if (!pub || !priv) {
      this.log.warn('VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY em falta: notificações push desligadas.');
      return;
    }
    webpush.setVapidDetails(this.config.get<string>('VAPID_SUBJECT') || 'mailto:geral@100bytes.co.ao', pub, priv);
    this.chavePublica = pub;
    this.ativo = true;
  }

  // ── Definições ──
  async definicoes(): Promise<Definicoes> {
    const r = await this.prisma.pushSetting.findUnique({ where: { key: 'automacoes' } });
    return { ...DEFINICOES_PADRAO, ...((r?.value as Partial<Definicoes>) || {}) };
  }

  async guardarDefinicoes(d: Partial<Definicoes>) {
    const atual = await this.definicoes();
    const nova: Definicoes = { ...atual };
    for (const k of Object.keys(DEFINICOES_PADRAO) as (keyof Definicoes)[]) {
      if (d[k] === undefined) continue;
      if (typeof DEFINICOES_PADRAO[k] === 'boolean') (nova as any)[k] = !!d[k];
      else if (Array.isArray(DEFINICOES_PADRAO[k])) (nova as any)[k] = (d[k] as number[]).map(Number).filter((n) => n >= 0 && n <= 6);
      else (nova as any)[k] = Math.max(0, Math.min(k === 'limiteHoras' ? 168 : 23, Number(d[k]) || 0));
    }
    await this.prisma.pushSetting.upsert({ where: { key: 'automacoes' }, create: { key: 'automacoes', value: nova as any }, update: { value: nova as any } });
    return nova;
  }

  /** Marca uma tarefa como feita (devolve false se já tinha sido feita) — ex.: "diario:2026-11-17" */
  async marcarFeito(chave: string) {
    try {
      await this.prisma.pushSetting.create({ data: { key: 'feito:' + chave, value: { em: new Date().toISOString() } } });
      return true;
    } catch {
      return false;
    }
  }

  // ── Aparelhos ──
  async subscrever(d: { endpoint: string; p256dh: string; auth: string; sessionId?: string | null; customerId?: string | null; userAgent?: string | null; origem?: string | null }) {
    const sub = await this.prisma.pushSubscription.upsert({
      where: { endpoint: d.endpoint },
      create: {
        endpoint: d.endpoint,
        p256dh: d.p256dh,
        auth: d.auth,
        sessionId: d.sessionId || null,
        customerId: d.customerId || null,
        userAgent: d.userAgent?.slice(0, 300) || null,
        origem: d.origem?.slice(0, 30) || null,
      },
      update: {
        p256dh: d.p256dh,
        auth: d.auth,
        active: true,
        revokedAt: null,
        lastSeenAt: new Date(),
        ...(d.sessionId ? { sessionId: d.sessionId } : {}),
        ...(d.customerId ? { customerId: d.customerId } : {}),
      },
    });
    // O mesmo navegador (mesma sessão) com outro endereço: o anterior deixa de ser válido
    if (d.sessionId) {
      await this.prisma.pushSubscription.updateMany({
        where: { sessionId: d.sessionId, active: true, NOT: { endpoint: d.endpoint } },
        data: { active: false, revokedAt: new Date() },
      });
    }
    return sub;
  }

  async cancelar(endpoint: string) {
    await this.prisma.pushSubscription.updateMany({ where: { endpoint }, data: { active: false, revokedAt: new Date() } });
  }

  async clique(id: string) {
    await this.prisma.pushSend.updateMany({ where: { id, clickedAt: null }, data: { clickedAt: new Date() } });
  }

  // ── Envio ──
  private urlComMedicao(caminho: string, tipo: Tipo, envioId: string, campanha?: string | null) {
    const u = new URL(caminho.startsWith('http') ? caminho : SITE + (caminho.startsWith('/') ? caminho : '/' + caminho));
    u.searchParams.set('utm_source', 'push');
    u.searchParams.set('utm_medium', 'notificacao');
    u.searchParams.set('utm_campaign', campanha || tipo);
    u.searchParams.set('pn', envioId);
    // dentro do site usamos caminho relativo (o service worker abre na mesma origem)
    return u.origin === SITE ? u.pathname + u.search : u.toString();
  }

  /** Envia a uma lista de aparelhos; devolve quantos foram entregues ao serviço de push */
  async enviar(subsTodas: { id: string; endpoint: string; p256dh: string; auth: string; sessionId?: string | null; lastSeenAt?: Date }[], tipo: Tipo, m: Mensagem) {
    if (!this.ativo || !subsTodas.length) return 0;
    // um aviso por navegador: com a mesma sessão, fica só o registo mais recente
    const porSessao = new Map<string, (typeof subsTodas)[number]>();
    const subs: typeof subsTodas = [];
    for (const s of subsTodas) {
      if (!s.sessionId) { subs.push(s); continue; }
      const outro = porSessao.get(s.sessionId);
      if (!outro || (s.lastSeenAt && outro.lastSeenAt && s.lastSeenAt > outro.lastSeenAt)) porSessao.set(s.sessionId, s);
    }
    subs.push(...porSessao.values());
    let ok = 0;
    for (let i = 0; i < subs.length; i += 25) {
      const lote = subs.slice(i, i + 25);
      const res = await Promise.allSettled(lote.map((s) => this.enviarUm(s, tipo, m)));
      ok += res.filter((r) => r.status === 'fulfilled' && r.value).length;
    }
    return ok;
  }

  private async enviarUm(s: { id: string; endpoint: string; p256dh: string; auth: string }, tipo: Tipo, m: Mensagem) {
    const envio = await this.prisma.pushSend.create({
      data: { subscriptionId: s.id, kind: tipo, campaignId: m.campanhaId || null, ref: m.ref || null, title: m.titulo, body: m.corpo, url: m.url },
    });
    const payload = JSON.stringify({
      id: envio.id,
      title: m.titulo,
      body: m.corpo,
      url: this.urlComMedicao(m.url, tipo, envio.id, m.campanhaId ? 'campanha-' + m.campanhaId : null),
      image: m.imagem || undefined,
      tag: m.tag || tipo + (m.ref ? ':' + m.ref : ''),
    });
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, {
        TTL: tipo === 'encomenda' ? 3 * 24 * 3600 : 12 * 3600,
        urgency: tipo === 'encomenda' ? 'high' : 'normal',
      });
      return true;
    } catch (e: any) {
      const codigo = e?.statusCode;
      const expirada = codigo === 404 || codigo === 410;
      await this.prisma.pushSend.update({ where: { id: envio.id }, data: { status: expirada ? 'expirada' : 'falhou', error: String(e?.body || e?.message || e).slice(0, 300) } });
      if (expirada) await this.prisma.pushSubscription.update({ where: { id: s.id }, data: { active: false, revokedAt: new Date() } });
      else this.log.warn(`Envio falhou (${codigo ?? '?'}): ${e?.message ?? e}`);
      return false;
    }
  }

  /** Aparelhos que ainda podem receber marketing (respeita o limite por aparelho) */
  async semMarketingRecente<T extends { id: string }>(subs: T[], horas: number): Promise<T[]> {
    if (!subs.length) return subs;
    const desde = new Date(Date.now() - horas * 3600 * 1000);
    const recentes = await this.prisma.pushSend.findMany({
      where: { subscriptionId: { in: subs.map((s) => s.id) }, kind: { in: MARKETING }, sentAt: { gte: desde }, status: 'enviada' },
      select: { subscriptionId: true },
      distinct: ['subscriptionId'],
    });
    const bloqueados = new Set(recentes.map((r) => r.subscriptionId));
    return subs.filter((s) => !bloqueados.has(s.id));
  }

  // ── Encomendas: todos os estados ──
  async avisarEncomenda(order: { code: string; status: string; customerId: string | null; customerEmail: string }) {
    if (!this.ativo || !(await this.definicoes()).encomendas) return;
    const textos: Record<string, [string, string]> = {
      pending: ['Recebemos a sua encomenda', `A encomenda ${order.code} foi registada. Vamos contactá-lo para a confirmar.`],
      confirmed: ['Encomenda confirmada', `A encomenda ${order.code} foi confirmada e vai ser preparada.`],
      preparing: ['Encomenda em preparação', `Estamos a preparar a encomenda ${order.code}.`],
      shipped: ['A sua encomenda vai a caminho', `A encomenda ${order.code} saiu para entrega.`],
      delivered: ['Encomenda entregue', `A encomenda ${order.code} foi entregue. Obrigado por comprar na 100 bytes.`],
      cancelled: ['Encomenda cancelada', `A encomenda ${order.code} foi cancelada. Se tiver dúvidas, fale connosco.`],
    };
    const t = textos[order.status];
    if (!t) return;

    // aparelhos do cliente: pela conta, pelo email da conta ou pela sessão onde fez a encomenda
    const sessoes = await this.prisma.event.findMany({
      where: { type: 'purchase', meta: { path: ['order'], equals: order.code } },
      select: { sessionId: true },
      distinct: ['sessionId'],
    });
    const cliente = order.customerId
      ? { id: order.customerId }
      : await this.prisma.customer.findFirst({ where: { email: { equals: order.customerEmail, mode: 'insensitive' } }, select: { id: true } });
    const subs = await this.prisma.pushSubscription.findMany({
      where: {
        active: true,
        OR: [
          ...(cliente ? [{ customerId: cliente.id }] : []),
          ...(sessoes.length ? [{ sessionId: { in: sessoes.map((s) => s.sessionId) } }] : []),
        ],
      },
    });
    if (!subs.length) return;
    // não repetir o mesmo estado ao mesmo aparelho
    const ja = await this.prisma.pushSend.findMany({
      where: { kind: 'encomenda', ref: order.code + ':' + order.status, subscriptionId: { in: subs.map((s) => s.id) } },
      select: { subscriptionId: true },
    });
    const jaSet = new Set(ja.map((j) => j.subscriptionId));
    await this.enviar(subs.filter((s) => !jaSet.has(s.id)), 'encomenda', {
      titulo: t[0],
      corpo: t[1],
      url: '/encomenda/' + order.code,
      ref: order.code + ':' + order.status,
      tag: 'encomenda:' + order.code,
    });
  }

  // ── Favoritos: baixa de preço e regresso ao stock (chamado pela sincronização do Winmax) ──
  async avisarFavoritos(mudancas: { productId: string; tipo: 'preco' | 'stock'; antes?: number; agora?: number }[]) {
    if (!this.ativo || !mudancas.length || !(await this.definicoes()).favoritos) return;
    for (const m of mudancas) {
      const p = await this.prisma.product.findUnique({
        where: { id: m.productId },
        select: { id: true, name: true, slug: true, imageKeys: true, basePrice: true, salePrice: true, active: true, category: { select: { slug: true } } },
      });
      if (!p || !p.active) continue;
      const favs = await this.prisma.favorite.findMany({ where: { productId: p.id }, select: { customerId: true } });
      if (!favs.length) continue;
      const subs = await this.prisma.pushSubscription.findMany({ where: { active: true, customerId: { in: favs.map((f) => f.customerId) } } });
      if (!subs.length) continue;
      const tipo: Tipo = m.tipo === 'preco' ? 'favorito_preco' : 'favorito_stock';
      // no máximo um aviso por produto e tipo a cada 3 dias
      const ja = await this.prisma.pushSend.findMany({
        where: { kind: tipo, ref: p.id, sentAt: { gte: new Date(Date.now() - 3 * 24 * 3600 * 1000) }, subscriptionId: { in: subs.map((s) => s.id) } },
        select: { subscriptionId: true },
      });
      const jaSet = new Set(ja.map((j) => j.subscriptionId));
      const preco = Number(p.salePrice ?? p.basePrice);
      await this.enviar(subs.filter((s) => !jaSet.has(s.id)), tipo, {
        titulo: m.tipo === 'preco' ? 'Baixou de preço' : 'Voltou ao stock',
        corpo:
          m.tipo === 'preco'
            ? `${p.name} está agora a ${kz(preco)}${m.antes ? ` (antes ${kz(m.antes)})` : ''}.`
            : `${p.name} já está disponível. Garanta o seu.`,
        url: '/' + (p.category?.slug || 'produto') + '/' + p.slug + '--' + p.id,
        imagem: p.imageKeys[0] ? this.r2.publicUrl(p.imageKeys[0]) : null,
        ref: p.id,
      });
    }
  }

  /** URL público e imagem de um produto */
  produtoInfo(p: { id: string; slug: string; imageKeys: string[]; category?: { slug: string } | null }) {
    return { url: '/' + (p.category?.slug || 'produto') + '/' + p.slug + '--' + p.id, imagem: p.imageKeys[0] ? this.r2.publicUrl(p.imageKeys[0]) : null };
  }
}
