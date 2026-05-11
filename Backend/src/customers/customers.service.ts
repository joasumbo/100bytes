import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { RegisterCustomerDto } from './dto/register-customer.dto';
import { LoginCustomerDto } from './dto/login-customer.dto';

@Injectable()
export class CustomersService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

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

  async me(customerId: string) {
    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer || !customer.active) throw new UnauthorizedException('Sessão inválida.');
    return this.safeCustomer(customer);
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
