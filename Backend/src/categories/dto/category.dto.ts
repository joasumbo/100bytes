import { IsString, IsOptional, IsBoolean, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCategoryDto {
  @IsString()
  name: string;

  @IsOptional() @IsString()
  description?: string;

  @IsOptional() @IsString()
  parentId?: string;

  @IsOptional() @IsBoolean()
  active?: boolean;

  @IsOptional() @IsNumber() @Type(() => Number)
  sortOrder?: number;
}

export class UpdateCategoryDto extends CreateCategoryDto {}
