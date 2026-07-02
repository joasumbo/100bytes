import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';

class OrderCustomerDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

class OrderDeliveryDto {
  @IsOptional() @IsString() province?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() notes?: string;
}

class OrderItemInputDto {
  @IsOptional() @IsString() productId?: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @Min(1)
  qty: number;

  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional() @IsString() priceFormatted?: string;
  @IsOptional() @IsString() image?: string;
}

export class CreateOrderDto {
  @ValidateNested()
  @Type(() => OrderCustomerDto)
  customer: OrderCustomerDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => OrderDeliveryDto)
  delivery?: OrderDeliveryDto;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemInputDto)
  items: OrderItemInputDto[];

  @IsOptional()
  @IsString()
  paymentMethod?: string;
}
