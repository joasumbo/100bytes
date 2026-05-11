import { IsEmail, IsNotEmpty } from 'class-validator';

export class LoginCustomerDto {
  @IsEmail({}, { message: 'Email inválido.' })
  email: string;

  @IsNotEmpty({ message: 'Senha obrigatória.' })
  password: string;
}
