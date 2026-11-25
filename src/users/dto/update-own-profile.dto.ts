import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/** PATCH /users/me — what any user may change about itself (the front's profile menu). */
export class UpdateOwnProfileDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(120)
  username?: string;

  @IsOptional() @IsIn(['es', 'en', 'pt'])
  language?: string;

  /** File name of the uploaded profile photo; empty string removes it. */
  @IsOptional() @IsString() @MaxLength(255)
  photoName?: string;
}
