import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { WinmaxClient } from './winmax.client';
import { WinmaxSyncService } from './winmax-sync.service';
import { WinmaxController } from './winmax.controller';
import { WinmaxImagesService } from './winmax-images.service';

@Module({
  imports: [PrismaModule],
  controllers: [WinmaxController],
  providers: [WinmaxClient, WinmaxSyncService, WinmaxImagesService],
  exports: [WinmaxClient, WinmaxSyncService],
})
export class WinmaxModule {}
