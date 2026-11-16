import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { R2Service } from '../r2/r2.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { RegisterCustomerDto } from './dto/register-customer.dto';
import { LoginCustomerDto } from './dto/login-customer.dto';

@Injectable()
export class CustomersService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private r2: R2Service,
  ) {}

  private readonly log = new Logger('Clientes');

  async register(dto: RegisterCustomerDto) {
    const exists = await this.prisma.customer.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Este email já está registado.');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const customer = await this.prisma.customer.create({
      data: {
        name: dto.name,
        phone: dto.phone ?? null,
        email: dto.email,
        passwordHash,
      },
    });

    const token = this.signToken(customer.id, customer.email, customer.name);
    return { token, customer: this.safeCustomer(customer) };
  }

  async login(dto: LoginCustomerDto) {
    const customer = await this.prisma.customer.findUnique({ where: { email: dto.email } });
    if (!customer || !customer.active) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    const valid = await bcrypt.compare(dto.password, customer.passwordHash);
    if (!valid) throw new UnauthorizedException('Credenciais inválidas.');

    const token = this.signToken(customer.id, customer.email, customer.name);
    return { token, customer: this.safeCustomer(customer) };
  }

  /**
   * Entrar com Google: entra se o email (ou a conta Google) já existe, senão cria a conta.
   * Contas novas ficam com passwordSet=false até o cliente escolher palavra-passe.
   * A foto do Google é copiada para o R2 quando o cliente ainda não tem foto.
   */
  async loginGoogle(dados: { email: string; nome?: string; googleId?: string; foto?: string }) {
    const mail = dados.email.trim().toLowerCase();
    let customer =
      (dados.googleId ? await this.prisma.customer.findUnique({ where: { googleId: dados.googleId } }) : null) ??
      (await this.prisma.customer.findFirst({ where: { email: { equals: mail, mode: 'insensitive' } } }));
    if (customer && !customer.active) throw new UnauthorizedException('Conta desativada.');

    let novo = false;
    if (!customer) {
      novo = true;
      const passwordHash = await bcrypt.hash(randomBytes(32).toString('hex'), 12);
      customer = await this.prisma.customer.create({
        data: {
          name: (dados.nome || mail.split('@')[0]).slice(0, 120),
          email: mail,
          passwordHash,
          passwordSet: false,
          googleId: dados.googleId ?? null,
        },
      });
    } else if (dados.googleId && !customer.googleId) {
      customer = await this.prisma.customer.update({ where: { id: customer.id }, data: { googleId: dados.googleId } });
    }

    if (!customer.avatarKey && dados.foto) {
      const key = await this.copiarFoto(customer.id, dados.foto).catch((e) => {
        this.log.warn('Foto do Google não copiada: ' + (e?.message ?? e));
        return null;
      });
      if (key) customer = await this.prisma.customer.update({ where: { id: customer.id }, data: { avatarKey: key } });
    }

    const token = this.signToken(customer.id, customer.email, customer.name);
    return { token, novo, completo: this.perfilCompleto(customer) };
  }

  /** Descarrega a foto do Google (256px) e guarda-a no R2 */
  private async copiarFoto(customerId: string, url: string) {
    const grande = url.replace(/=s\d+(-c)?$/, '=s256-c');
    const r = await fetch(grande, { signal: AbortSignal.timeout(10000) });
    const tipo = (r.headers.get('content-type') || '').split(';')[0];
    if (!r.ok || !tipo.startsWith('image/')) throw new Error('resposta ' + r.status + ' ' + tipo);
    const buf = Buffer.from(await r.arrayBuffer());
    return this.guardarFoto(customerId, buf, tipo);
  }

  private async guardarFoto(customerId: string, buf: Buffer, tipo: string) {
    const ext = ({ 'image/png': 'png', 'image/webp': 'webp' } as Record<string, string>)[tipo] ?? 'jpg';
    const key = 'customers/avatars/' + customerId + '-' + Date.now() + '.' + ext;
    await this.r2.upload(key, buf, tipo);
    return key;
  }

  private perfilCompleto(c: { passwordSet: boolean; phone: string | null; address: string | null; city: string | null; province: string | null }) {
    return c.passwordSet && !!c.phone && !!c.address && !!c.city && !!c.province;
  }

  /** Atualiza nome, telefone e morada */
  async atualizarPerfil(customerId: string, d: { name?: string; phone?: string; province?: string; city?: string; address?: string }) {
    const limpo = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : undefined);
    const data: Record<string, string | null> = {};
    const nome = limpo(d.name, 120);
    if (nome !== undefined) {
      if (nome.length < 2) throw new BadRequestException('Indique o seu nome.');
      data.name = nome;
    }
    for (const [k, max] of [['phone', 30], ['province', 60], ['city', 80], ['address', 240]] as const) {
      const v = limpo(d[k], max);
      if (v !== undefined) data[k] = v || null;
    }
    const c = await this.prisma.customer.update({ where: { id: customerId }, data });
    return this.perfil(c);
  }

  /** Muda (ou cria, em contas Google) a palavra-passe */
  async mudarPassword(customerId: string, atual: string | undefined, nova: string) {
    if (!nova || nova.length < 8) throw new BadRequestException('A palavra-passe deve ter pelo menos 8 caracteres.');
    const c = await this.prisma.customer.findUnique({ where: { id: customerId } });
    if (!c) throw new UnauthorizedException('Sessão inválida.');
    if (c.passwordSet) {
      if (!atual || !(await bcrypt.compare(atual, c.passwordHash))) throw new BadRequestException('A palavra-passe atual não está correta.');
    }
    const passwordHash = await bcrypt.hash(nova, 12);
    const novo = await this.prisma.customer.update({ where: { id: customerId }, data: { passwordHash, passwordSet: true } });
    return this.perfil(novo);
  }

  async mudarFoto(customerId: string, buf: Buffer, tipo: string) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(tipo)) throw new BadRequestException('Use uma imagem JPG, PNG ou WebP.');
    if (buf.length > 3 * 1024 * 1024) throw new BadRequestException('A imagem deve ter no máximo 3 MB.');
    const antes = await this.prisma.customer.findUnique({ where: { id: customerId }, select: { avatarKey: true } });
    const key = await this.guardarFoto(customerId, buf, tipo);
    const c = await this.prisma.customer.update({ where: { id: customerId }, data: { avatarKey: key } });
    if (antes?.avatarKey) this.r2.delete(antes.avatarKey).catch(() => undefined);
    return this.perfil(c);
  }

  async removerFoto(customerId: string) {
    const antes = await this.prisma.customer.findUnique({ where: { id: customerId }, select: { avatarKey: true } });
    const c = await this.prisma.customer.update({ where: { id: customerId }, data: { avatarKey: null } });
    if (antes?.avatarKey) this.r2.delete(antes.avatarKey).catch(() => undefined);
    return this.perfil(c);
  }

  async me(customerId: string) {
    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer || !customer.active) throw new UnauthorizedException('Sessão inválida.');
    return this.perfil(customer);
  }

  /** Dados do cliente para a loja (nunca inclui o hash da palavra-passe) */
  private perfil(c: {
    id: string; name: string; email: string; phone: string | null; avatarKey: string | null;
    province: string | null; city: string | null; address: string | null; passwordSet: boolean; googleId: string | null; createdAt: Date;
  }) {
    return {
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      avatar: c.avatarKey ? this.r2.publicUrl(c.avatarKey) : null,
      province: c.province,
      city: c.city,
      address: c.address,
      passwordSet: c.passwordSet,
      google: !!c.googleId,
      createdAt: c.createdAt,
      completo: this.perfilCompleto(c),
    };
  }

  async getFavorites(customerId: string) {
    const favs = await this.prisma.favorite.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      select: { productId: true, createdAt: true },
    });
    return favs;
  }

  async addFavorite(customerId: string, productId: string) {
    const existing = await this.prisma.favorite.findUnique({
      where: { customerId_productId: { customerId, productId } },
    });
    if (existing) return { ok: true, added: false };

    await this.prisma.favorite.create({ data: { customerId, productId } });
    return { ok: true, added: true };
  }

  async removeFavorite(customerId: string, productId: string) {
    await this.prisma.favorite.deleteMany({ where: { customerId, productId } });
    return { ok: true };
  }

  async getFavoriteIds(customerId: string) {
    const favs = await this.prisma.favorite.findMany({
      where: { customerId },
      select: { productId: true },
    });
    return favs.map((f) => f.productId);
  }

  async listAll() {
    return this.prisma.customer.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, email: true, phone: true, active: true, createdAt: true },
    });
  }

  private signToken(id: string, email: string, name: string) {
    return this.jwt.sign(
      { sub: id, email, name, type: 'customer' },
      { expiresIn: this.config.get('JWT_EXPIRES_IN', '30d') as any },
    );
  }

  private safeCustomer(c: { id: string; name: string; email: string; phone: string | null }) {
    return { id: c.id, name: c.name, email: c.email, phone: c.phone };
  }
}
