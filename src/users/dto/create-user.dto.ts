import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { UserRole } from '@prisma/client';
import { MAX_MENU_PERMISSIONS } from './menu-permissions.dto';

export class CreateUserDto {
  @IsEmail() @IsNotEmpty()
  email: string;

  @IsString() @IsNotEmpty()
  username: string;

  /** Temporary password: the user picks its own on the first login (NEW_PASSWORD_REQUIRED). */
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

  @IsOptional() @IsString() @MaxLength(255)
  photoName?: string;

  /** Menus the new user may open (KAN-57). Without it the user starts with none. */
  @IsOptional() @IsArray() @ArrayMaxSize(MAX_MENU_PERMISSIONS) @IsInt({ each: true }) @Min(0, { each: true })
  menuIds?: number[];
}
