import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ConfirmForgotPasswordRequestDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  newPassword: string;
}
