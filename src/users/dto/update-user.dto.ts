import { IsEmail, IsOptional, IsString } from 'class-validator';

/**
 * Only `username` and `newPassword` are applied today:
 * - `newPassword` → admin password reset in Cognito (AdminSetUserPassword).
 * - `email` change is NOT applied yet (Cognito username == email; needs a dedicated flow).
 * - `previousPassword` is accepted (the current form sends it) but unused with admin reset.
 */
export class UpdateUserDto {
  @IsOptional() @IsString()
  username?: string;

  @IsOptional() @IsEmail()
  email?: string;

  @IsOptional() @IsString()
  previousPassword?: string;

  @IsOptional() @IsString()
  newPassword?: string;
}
