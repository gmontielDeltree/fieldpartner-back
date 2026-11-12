import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { UserRole } from '@prisma/client';

export class CreateUserDto {
  @IsEmail() @IsNotEmpty()
  email: string;

  @IsString() @IsNotEmpty()
  username: string;

  @IsString() @IsNotEmpty()
  password: string;

  @IsOptional() @IsString()
  language?: string;

  // Target account. Required for GENERAL_ADMIN; ignored for ADMIN (forced to own account).
  @IsOptional() @IsString()
  accountId?: string;

  // Requested role. ADMIN callers may NOT assign GENERAL_ADMIN (enforced server-side).
  @IsOptional() @IsEnum(UserRole)
  role?: UserRole;
}
