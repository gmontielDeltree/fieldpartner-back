import { IsString, IsNotEmpty, IsOptional, IsInt, IsUUID, Min } from 'class-validator';

export class CreateLicenceTypeDto {
  @IsString()
  @IsNotEmpty()
  label: string;

  @IsOptional()
  @IsString()
  description?: string;

  /** System (product) the licence type belongs to. */
  @IsOptional()
  @IsUUID()
  systemId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  maximumUnitAllowed?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  allowedUsersCount?: number;
}
