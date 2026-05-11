import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ContentService {
  constructor(private prisma: PrismaService) {}

  private isMissingSiteContentTableError(error: unknown): boolean {
    const msg = error instanceof Error ? error.message : String(error);
    return msg.includes('P2021') || msg.toLowerCase().includes('site_content');
  }

  private async ensureSiteContentTable(): Promise<void> {
    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "site_content" (
        "id" TEXT NOT NULL,
        "key" TEXT NOT NULL,
        "data" JSONB NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "site_content_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "site_content_key_key" UNIQUE ("key")
      )
    `);
  }

  async findAll() {
    try {
      const entries = await this.prisma.siteContent.findMany({
        orderBy: { key: 'asc' },
      });
      return { entries };
    } catch (error) {
      if (this.isMissingSiteContentTableError(error)) {
        await this.ensureSiteContentTable();
        return { entries: [] };
      }
      throw error;
    }
  }

  async findOne(key: string) {
    try {
      const entry = await this.prisma.siteContent.findUnique({ where: { key } });
      return { entry };
    } catch (error) {
      if (this.isMissingSiteContentTableError(error)) {
        await this.ensureSiteContentTable();
        return { entry: null };
      }
      throw error;
    }
  }

  async upsert(key: string, data: unknown) {
    const jsonData = (data ?? null) as Prisma.InputJsonValue;
    try {
      const entry = await this.prisma.siteContent.upsert({
        where: { key },
        update: { data: jsonData },
        create: { key, data: jsonData },
      });
      return { entry };
    } catch (error) {
      if (this.isMissingSiteContentTableError(error)) {
        await this.ensureSiteContentTable();
        const entry = await this.prisma.siteContent.upsert({
          where: { key },
          update: { data: jsonData },
          create: { key, data: jsonData },
        });
        return { entry };
      }
      throw error;
    }
  }
}
