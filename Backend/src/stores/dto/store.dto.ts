import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  IsInt,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateStoreDto {
  @IsString() name: string;
  @IsString() address: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsNumber() lat?: number;
  @IsOptional() @IsNumber() lng?: number;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  winmaxTerminalCodes?: number[];
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  winmaxWarehouseCodes?: number[];
}

export class UpdateStoreDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsNumber() lat?: number;
  @IsOptional() @IsNumber() lng?: number;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  winmaxTerminalCodes?: number[];
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  winmaxWarehouseCodes?: number[];
}

export class UpsertStoreStockDto {
  @IsString() storeId: string;
  @IsNumber() @Transform(({ value }) => parseInt(value)) quantity: number;
}
