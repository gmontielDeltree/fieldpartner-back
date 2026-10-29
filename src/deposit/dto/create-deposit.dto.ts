import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsNumber } from 'class-validator';

export class CreateDepositDto {
  @IsString()
  @IsNotEmpty()
  accountId: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  @IsString()
  owner?: string;

  @IsOptional()
  @IsBoolean()
  isVirtual?: boolean;

  @IsOptional()
  @IsNumber()
  lat?: number;

  @IsOptional()
  @IsNumber()
  lng?: number;

  @IsOptional()
  @IsBoolean()
  isNegative?: boolean;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  zipCode?: string;

  @IsOptional()
  @IsString()
  locality?: string;

  @IsOptional()
  @IsString()
  province?: string;

  @IsOptional()
  @IsString()
  countryCode?: string;

  @IsOptional()
  @IsBoolean()
  hasSiloBag?: boolean;

  @IsOptional()
  @IsBoolean()
  hasHopper?: boolean;

  @IsOptional()
  @IsBoolean()
  hasSilo?: boolean;

  @IsOptional()
  @IsBoolean()
  hasDeposit?: boolean;

  @IsOptional()
  @IsString()
  taxId?: string;

  @IsOptional()
  @IsString()
  status?: string;
}
