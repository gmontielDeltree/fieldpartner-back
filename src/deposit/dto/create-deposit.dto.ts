import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

/** A named place inside the deposit (shed, silo 3…). */
export class DepositLocationInputDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  number?: string;
}

/** The account comes from the caller (or `?accountId=` for a GENERAL_ADMIN), never the body. */
export class CreateDepositDto {
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

  /** Silo bag identifier (when hasSiloBag). */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  siloBagId?: string;

  @IsOptional()
  @IsString()
  status?: string;

  /**
   * Full list of locations. On update it replaces the current one, matched by name
   * (case-insensitive): existing names keep their id, missing ones are removed.
   */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => DepositLocationInputDto)
  locations?: DepositLocationInputDto[];
}
