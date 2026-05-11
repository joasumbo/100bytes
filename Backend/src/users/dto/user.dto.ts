import { IsString, IsEmail, IsOptional, IsBoolean, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  actorRole: string;

  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8, { message: 'A senha deve ter pelo menos 8 caracteres.' })
  password: string;

  @IsString()
  role: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateUserDto {
  @IsString()
  actorRole: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;
}

export class DeleteUserDto {
  @IsString()
  actorRole: string;
}
