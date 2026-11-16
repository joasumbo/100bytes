import { Module } from '@nestjs/common';
import { PushAdminController, PushController } from './push.controller';
import { PushAutomacoesService } from './push-automacoes.service';
import { PushService } from './push.service';

@Module({
  controllers: [PushController, PushAdminController],
  providers: [PushService, PushAutomacoesService],
  exports: [PushService],
})
export class PushModule {}
