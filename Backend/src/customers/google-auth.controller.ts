import { Controller, Get, Logger, Query, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { Request, Response } from 'express';
import { CustomersService } from './customers.service';

/**
 * Entrar com Google (OAuth 2.0, fluxo "authorization code" no servidor).
 *
 *   GET /api/auth/google?next=/checkout   → redireciona para o Google
 *   GET /api/auth/google/callback         → troca o código, entra ou cria a conta, volta a `next`
 *
 * Chega aqui através do proxy da loja (mesmo domínio), por isso o cookie
 * customer_token fica no domínio da loja, tal como no login com email.
 * Credenciais: GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET no .env.
 */
const ORIGENS_PERMITIDAS = ['https://100bytes.co.ao', 'https://www.100bytes.co.ao', 'http://localhost:3030'];
const COOKIE_ESTADO = 'g_oauth';

@Controller('auth/google')
export class GoogleAuthController {
  private readonly log = new Logger('GoogleAuth');

  constructor(
    private readonly svc: CustomersService,
    private readonly config: ConfigService,
  ) {}

  @Get()
  iniciar(@Req() req: Request, @Res() res: Response, @Query('next') next?: string) {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    const origem = this.origem(req);
    if (!clientId || !origem) return res.redirect(302, this.destino(next) + this.sufixo(next, 'login_google=indisponivel'));

    const estado = randomBytes(24).toString('base64url');
    res.cookie(COOKIE_ESTADO, JSON.stringify({ estado, next: this.destino(next) }), {
      httpOnly: true,
      sameSite: 'lax',
      path: '/api/auth/google',
      maxAge: 10 * 60 * 1000,
      secure: origem.startsWith('https://'),
    });

    const p = new URLSearchParams({
      client_id: clientId,
      redirect_uri: origem + '/api/auth/google/callback',
      response_type: 'code',
      scope: 'openid email profile',
      state: estado,
      prompt: 'select_account',
    });
    return res.redirect(302, 'https://accounts.google.com/o/oauth2/v2/auth?' + p.toString());
  }

  @Get('callback')
  async callback(@Req() req: Request, @Res() res: Response, @Query('code') code?: string, @Query('state') state?: string) {
    let next = '/';
    try {
      const guardado = JSON.parse(req.cookies?.[COOKIE_ESTADO] || 'null');
      res.clearCookie(COOKIE_ESTADO, { path: '/api/auth/google' });
      if (guardado?.next) next = this.destino(guardado.next);
      if (!code || !state || !guardado || guardado.estado !== state) throw new Error('estado inválido ou código em falta');

      const origem = this.origem(req);
      if (!origem) throw new Error('origem não permitida');

      // Trocar o código por tokens
      const tok = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: this.config.get<string>('GOOGLE_CLIENT_ID') ?? '',
          client_secret: this.config.get<string>('GOOGLE_CLIENT_SECRET') ?? '',
          redirect_uri: origem + '/api/auth/google/callback',
          grant_type: 'authorization_code',
        }),
        signal: AbortSignal.timeout(10000),
      }).then((r) => r.json() as Promise<{ access_token?: string; error?: string }>);
      if (!tok.access_token) throw new Error('troca do código falhou: ' + (tok.error ?? 'sem token'));

      // Dados do utilizador
      const info = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
        headers: { Authorization: 'Bearer ' + tok.access_token },
        signal: AbortSignal.timeout(10000),
      }).then((r) => r.json() as Promise<{ sub?: string; email?: string; email_verified?: boolean; name?: string; picture?: string }>);
      if (!info.email || info.email_verified === false) throw new Error('email do Google não verificado');

      const { token, completo } = await this.svc.loginGoogle({ email: info.email, nome: info.name, googleId: info.sub, foto: info.picture });
      res.cookie('customer_token', token, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 1000 * 60 * 60 * 24 * 30,
        secure: origem.startsWith('https://'),
      });
      // Conta por completar (palavra-passe, telefone ou morada em falta): passa primeiro pelo perfil
      if (!completo) return res.redirect(302, '/perfil?completar=1&next=' + encodeURIComponent(next));
      return res.redirect(302, next);
    } catch (e: any) {
      this.log.warn('Login com Google falhou: ' + (e?.message ?? e));
      return res.redirect(302, next + this.sufixo(next, 'login_google=erro'));
    }
  }

  /** Origem pública da loja (o proxy envia X-Forwarded-*), só se estiver na lista do Google */
  private origem(req: Request): string | null {
    const host = String(req.headers['x-forwarded-host'] ?? '').split(',')[0].trim();
    const proto = String(req.headers['x-forwarded-proto'] ?? 'http').split(',')[0].trim();
    const o = `${proto}://${host}`;
    if (ORIGENS_PERMITIDAS.includes(o)) return o;
    // Atrás do nginx o proto pode chegar como http: aceitar a versão https do mesmo domínio
    const https = `https://${host}`;
    return ORIGENS_PERMITIDAS.includes(https) ? https : null;
  }

  /** Só caminhos relativos do próprio site (evita redirecionar para fora) */
  private destino(next?: string): string {
    return next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/api/') ? next : '/';
  }

  private sufixo(next: string | undefined, q: string) {
    return (this.destino(next).includes('?') ? '&' : '?') + q;
  }
}
