import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterCustomerDto {
  @IsNotEmpty({ message: 'Nome obrigatório.' })
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsEmail({}, { message: 'Email inválido.' })
  email: string;

  @MinLength(6, { message: 'Senha deve ter pelo menos 6 caracteres.' })
  password: string;
}
