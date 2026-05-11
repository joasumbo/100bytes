import {
  Injectable, NotFoundException, UnauthorizedException,
  BadRequestException, ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { R2Service } from '../r2/r2.service';
import * as bcrypt from 'bcryptjs';
import { UpdateProfileDto, ChangePasswordDto, DeleteAccountDto } from './dto/profile.dto';

@Injectable()
export class ProfileService {
  constructor(
    private prisma: PrismaService,
    private r2: R2Service,
  ) {}

  async update(dto: UpdateProfileDto) {
    const user = await this.prisma.adminUser.findUnique({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException('Utilizador não encontrado.');

    const data: { name?: string; photoKey?: string | null } = {};
    if (dto.name !== undefined) data.name = dto.name.trim();

    if (dto.removePhoto && user.photoKey) {
      await this.r2.delete(user.photoKey);
      data.photoKey = null;
    }

    const updated = await this.prisma.adminUser.update({
      where: { id: dto.userId },
      data,
      select: { id: true, name: true, email: true, role: true, photoKey: true },
    });

    return { user: updated };
  }

  async changePassword(dto: ChangePasswordDto) {
    if (!dto.userId || !dto.currentPassword || !dto.newPassword) {
      throw new BadRequestException('Todos os campos são obrigatórios.');
    }
    if (dto.newPassword.length < 8) {
      throw new BadRequestException('A nova senha deve ter pelo menos 8 caracteres.');
    }

    const user = await this.prisma.adminUser.findUnique({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException('Utilizador não encontrado.');

    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Senha actual incorrecta.');

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.adminUser.update({ where: { id: dto.userId }, data: { passwordHash } });

    return { ok: true };
  }

  async deleteAccount(dto: DeleteAccountDto) {
    const user = await this.prisma.adminUser.findUnique({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException('Utilizador não encontrado.');
    if (user.role === 'superadmin') throw new ForbiddenException('O superadmin não pode ser eliminado.');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Senha incorrecta.');

    if (user.photoKey) await this.r2.delete(user.photoKey);
    await this.prisma.adminUser.delete({ where: { id: dto.userId } });

    return { ok: true };
  }

  async uploadAvatar(userId: string, file: Express.Multer.File, oldKey?: string) {
    const user = await this.prisma.adminUser.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilizador não encontrado.');

    if (oldKey) await this.r2.delete(oldKey);

    const key = `avatars/${userId}/${Date.now()}.webp`;
    await this.r2.upload(key, file.buffer, 'image/webp');

    await this.prisma.adminUser.update({ where: { id: userId }, data: { photoKey: key } });
    return { key };
  }
}
