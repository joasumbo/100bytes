import {
  IsString, IsOptional, IsBoolean, IsNumber, IsArray, Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @IsString()
  name: string;

  @IsOptional() @IsString()
  reference?: string;

  @IsOptional() @IsString()
  description?: string;

  @IsOptional() @IsString()
  categoryId?: string;

  @IsOptional() @IsString()
  brandId?: string;

  @IsOptional() @IsBoolean()
  active?: boolean;

  @IsOptional() @IsBoolean()
  featured?: boolean;

  @IsOptional() @IsNumber() @Type(() => Number)
  costPrice?: number;

  @IsNumber() @Type(() => Number)
  basePrice: number;

  @IsOptional() @IsBoolean()
  hasIva?: boolean;

  @IsOptional() @IsNumber() @Type(() => Number)
  ivaRate?: number;

  @IsOptional() @IsBoolean()
  hasIec?: boolean;

  @IsOptional() @IsNumber() @Type(() => Number)
  iecRate?: number;

  @IsOptional() @IsNumber() @Type(() => Number)
  salePrice?: number;

  @IsOptional() @IsBoolean()
  trackStock?: boolean;

  @IsOptional() @IsNumber() @Min(0) @Type(() => Number)
  stock?: number;

  @IsOptional() @IsNumber() @Min(0) @Type(() => Number)
  stockAlert?: number;

  @IsOptional() @IsArray()
  bundleItems?: BundleItemDto[];

}

export class UpdateProductDto extends CreateProductDto {}

export class BundleItemDto {
  @IsOptional() @IsString()
  linkedId?: string;

  @IsString()
  name: string;

  @IsNumber() @Type(() => Number)
  price: number;

  @IsOptional() @IsNumber() @Type(() => Number)
  discountPct?: number;

  @IsOptional() @IsNumber() @Type(() => Number)
  sortOrder?: number;
}

export class ListProductsDto {
  search?: string;
  categoryId?: string;
  brandId?: string;
  active?: string;
  featured?: string;
  stockStatus?: string;
  page?: string;
  perPage?: string;
  mode?: string;
}
