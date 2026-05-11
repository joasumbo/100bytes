import { IsString, IsOptional, IsBoolean, IsNumber } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateStoreDto {
  @IsString() name: string;
  @IsString() address: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsNumber() lat?: number;
  @IsOptional() @IsNumber() lng?: number;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class UpdateStoreDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsNumber() lat?: number;
  @IsOptional() @IsNumber() lng?: number;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class UpsertStoreStockDto {
  @IsString() storeId: string;
  @IsNumber() @Transform(({ value }) => parseInt(value)) quantity: number;
}
