import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Req,
  Res,
  HttpCode,
  UseGuards,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { CustomersService } from './customers.service';
import { CustomerGuard } from './customer.guard';
import { AuthGuard } from '../auth/auth.guard';
import { RegisterCustomerDto } from './dto/register-customer.dto';
import { LoginCustomerDto } from './dto/login-customer.dto';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { OrdersService } from '../orders/orders.service';

@Controller('customers')
export class CustomersController {
  constructor(
    private svc: CustomersService,
    private config: ConfigService,
    private jwt: JwtService,
    private orders: OrdersService,
  ) {}

  @Get()
  @UseGuards(AuthGuard)
  async listAll() {
    const customers = await this.svc.listAll();
    return { customers };
  }

  @Post('register')
  async register(
    @Body() dto: RegisterCustomerDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { token, customer } = await this.svc.register(dto);
    this.setTokenCookie(res, token);
    return { customer };
  }

  @Post('login')
  @HttpCode(200)
  async login(
    @Body() dto: LoginCustomerDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { token, customer } = await this.svc.login(dto);
    this.setTokenCookie(res, token);
    return { customer };
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('customer_token', { path: '/' });
    return { ok: true };
  }

  // Verificação de sessão: devolve sempre 200.
  // { customer: null } quando não há sessão (evita 401 ruidoso na consola).
  @Get('me')
  async me(@Req() req: Request) {
    const token = req.cookies?.['customer_token'];
    if (!token) return { customer: null };
    try {
      const payload = this.jwt.verify(token);
      if (payload.type !== 'customer') return { customer: null };
      const customer = await this.svc.me(payload.sub);
      return { customer };
    } catch {
      return { customer: null };
    }
  }

  @Get('orders')
  @UseGuards(CustomerGuard)
  async myOrders(@Req() req: Request) {
    const c = req['customer'];
    const orders = await this.orders.listByCustomer(c.sub, c.email);
    return { orders };
  }

  @Get('favorites')
  @UseGuards(CustomerGuard)
  async getFavorites(@Req() req: Request) {
    const ids = await this.svc.getFavoriteIds(req['customer'].sub);
    return { favorites: ids };
  }

  @Post('favorites/:productId')
  @UseGuards(CustomerGuard)
  async addFavorite(@Req() req: Request, @Param('productId') productId: string) {
    return this.svc.addFavorite(req['customer'].sub, productId);
  }

  @Delete('favorites/:productId')
  @UseGuards(CustomerGuard)
  async removeFavorite(@Req() req: Request, @Param('productId') productId: string) {
    return this.svc.removeFavorite(req['customer'].sub, productId);
  }

  private setTokenCookie(res: Response, token: string) {
    res.cookie('customer_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 dias
      secure: this.config.get('NODE_ENV') === 'production',
    });
  }
}
