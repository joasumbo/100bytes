import { Module } from '@nestjs/common';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { CustomerGuard } from './customer.guard';

@Module({
  controllers: [CustomersController],
  providers: [CustomersService, CustomerGuard],
})
export class CustomersModule {}
