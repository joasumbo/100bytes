import { Module } from '@nestjs/common';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { CustomerGuard } from './customer.guard';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [OrdersModule],
  controllers: [CustomersController],
  providers: [CustomersService, CustomerGuard],
})
export class CustomersModule {}
