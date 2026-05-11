import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateBrandDto {
  @IsString()
  name: string;

  @IsOptional() @IsString()
  country?: string;

  @IsOptional() @IsBoolean()
  active?: boolean;
}

export class UpdateBrandDto extends CreateBrandDto {}
