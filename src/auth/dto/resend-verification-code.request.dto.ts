import { IsEmail, IsNotEmpty } from 'class-validator';

export class ResendVerificationCodeRequestDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
