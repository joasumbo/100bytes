import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ContentService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const entries = await this.prisma.siteContent.findMany({
      orderBy: { key: 'asc' },
    });
    return { entries };
  }

  async findOne(key: string) {
    const entry = await this.prisma.siteContent.findUnique({ where: { key } });
    return { entry };
  }

  async upsert(key: string, data: unknown) {
    const jsonData = (data ?? null) as Prisma.InputJsonValue;
    const entry = await this.prisma.siteContent.upsert({
      where: { key },
      update: { data: jsonData },
      create: { key, data: jsonData },
    });
    return { entry };
  }
}
