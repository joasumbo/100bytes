import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { manageableRoles, canDeleteUser } from '../common/permissions';
import { CreateUserDto, UpdateUserDto, DeleteUserDto } from './dto/user.dto';

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  active: true,
  photoKey: true,
  createdAt: true,
};

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.adminUser.findMany({
      orderBy: { createdAt: 'desc' },
      select: USER_SELECT,
    });
  }

  async create(dto: CreateUserDto) {
    const allowed = manageableRoles(dto.actorRole);
    if (!allowed.includes(dto.role as any)) {
      throw new ForbiddenException('Sem permissão para criar este tipo de utilizador.');
    }

    const exists = await this.prisma.adminUser.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email já está em uso.');

    const passwordHash = await bcrypt.hash(dto.password, 12);

    return this.prisma.adminUser.create({
      data: { name: dto.name, email: dto.email, passwordHash, role: dto.role, active: dto.active ?? true },
      select: USER_SELECT,
    });
  }

  async update(id: string, dto: UpdateUserDto) {
    const target = await this.prisma.adminUser.findUnique({ where: { id } });
    if (!target) throw new NotFoundException('Utilizador não encontrado.');
    if (target.role === 'superadmin') throw new ForbiddenException('Não é possível editar o superadmin.');

    if (dto.role) {
      const allowed = manageableRoles(dto.actorRole);
      if (!allowed.includes(dto.role as any)) {
        throw new ForbiddenException('Sem permissão para atribuir este role.');
      }
    }

    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.role !== undefined) data.role = dto.role;
    if (dto.active !== undefined) data.active = dto.active;
    if (dto.password) {
      if (dto.password.length < 8) throw new BadRequestException('A senha deve ter pelo menos 8 caracteres.');
      data.passwordHash = await bcrypt.hash(dto.password, 12);
    }

    return this.prisma.adminUser.update({ where: { id }, data, select: USER_SELECT });
  }

  async remove(id: string, dto: DeleteUserDto) {
    const target = await this.prisma.adminUser.findUnique({ where: { id } });
    if (!target) throw new NotFoundException('Utilizador não encontrado.');
    if (!canDeleteUser(dto.actorRole, target.role)) {
      throw new ForbiddenException('Sem permissão para eliminar este utilizador.');
    }
    await this.prisma.adminUser.delete({ where: { id } });
    return { ok: true };
  }
}
