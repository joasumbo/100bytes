import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { ComplementosService } from './complementos.service';

@Module({
  controllers: [ProductsController],
  providers: [ProductsService, ComplementosService],
})
export class ProductsModule {}
