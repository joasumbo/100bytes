import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { WinmaxClient } from './winmax.client';
import { WinmaxSyncService } from './winmax-sync.service';
import { WinmaxController } from './winmax.controller';

@Module({
  imports: [PrismaModule],
  controllers: [WinmaxController],
  providers: [WinmaxClient, WinmaxSyncService],
  exports: [WinmaxClient, WinmaxSyncService],
})
export class WinmaxModule {}
