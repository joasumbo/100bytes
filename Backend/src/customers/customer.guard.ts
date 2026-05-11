import {
  Injectable,
  UnauthorizedException,
  CanActivate,
  ExecutionContext,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class CustomerGuard implements CanActivate {
  constructor(private jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const token = req.cookies?.['customer_token'];
    if (!token) throw new UnauthorizedException('Login necessário.');
    try {
      const payload = this.jwt.verify(token);
      if (payload.type !== 'customer') throw new Error('Token inválido.');
      req['customer'] = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Sessão inválida. Faça login novamente.');
    }
  }
}
