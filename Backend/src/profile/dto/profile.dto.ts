import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class UpdateProfileDto {
  @IsString()
  userId: string;

  @IsOptional() @IsString()
  name?: string;

  @IsOptional() @IsBoolean()
  removePhoto?: boolean;
}

export class ChangePasswordDto {
  @IsString()
  userId: string;

  @IsString()
  currentPassword: string;

  @IsString()
  newPassword: string;
}

export class DeleteAccountDto {
  @IsString()
  userId: string;

  @IsString()
  password: string;
}
