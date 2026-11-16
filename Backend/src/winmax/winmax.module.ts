import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SearchModule } from '../search/search.module';
import { PushModule } from '../push/push.module';
import { WinmaxClient } from './winmax.client';
import { WinmaxSyncService } from './winmax-sync.service';
import { WinmaxController } from './winmax.controller';
import { WinmaxImagesService } from './winmax-images.service';
import { WinmaxCatalogService } from './winmax-catalog.service';

@Module({
  imports: [PrismaModule, SearchModule, PushModule],
  controllers: [WinmaxController],
  providers: [
    WinmaxClient,
    WinmaxSyncService,
    WinmaxImagesService,
    WinmaxCatalogService,
  ],
  exports: [WinmaxClient, WinmaxSyncService],
})
export class WinmaxModule {}
