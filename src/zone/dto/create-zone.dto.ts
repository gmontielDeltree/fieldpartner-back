import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

/** The account comes from the caller (or `?accountId=` for a GENERAL_ADMIN), never the body. */
export class CreateZoneDto {
  @IsOptional()
  @IsString()
  countryId?: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}
