import { IsString, IsNotEmpty, IsOptional, IsInt, Min } from 'class-validator';

export class CreateLicenceTypeDto {
  @IsString()
  @IsNotEmpty()
  label: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  systemType?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  maximumUnitAllowed?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  allowedUsersCount?: number;
}
