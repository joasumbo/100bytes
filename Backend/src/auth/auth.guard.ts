import {
  Injectable,
  UnauthorizedException,
  CanActivate,
  ExecutionContext,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const token = req.cookies?.['admin_token'];
    if (!token) throw new UnauthorizedException('Sessão expirada. Faça login.');
    try {
      const payload = this.jwt.verify(token);
      req['user'] = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Token inválido.');
    }
  }
}
