import {
  IsString, IsNotEmpty, IsOptional, IsBoolean,
  IsNumber, IsArray, IsEnum, Min, IsInt, IsPositive,
} from 'class-validator';
import { Labor } from '@prisma/client';

/**
 * The owner account comes from the caller, never the body: an account user creates inputs in
 * their own account; a GENERAL_ADMIN picks one with `?accountId=` or, without it, creates a
 * platform input (accountId null). replacementId must be visible to that owner.
 */
export class CreateInputDto {
  @IsOptional()
  @IsString()
  countryId?: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  barCode?: string;

  @IsOptional()
  @IsString()
  unitMeasurement?: string;

  @IsOptional()
  @IsBoolean()
  stockByLot?: boolean;

  @IsOptional()
  @IsString()
  activePrincipal?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  mermaVolatile?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumDose?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maximumDose?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  recommendedDose?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  replenishmentPoint?: number;

  @IsOptional()
  @IsArray()
  @IsEnum(Labor, { each: true })
  labors?: Labor[];

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsString()
  replacementId?: string;

  @IsOptional()
  @IsString()
  chemicalComposition?: string;

  @IsOptional()
  @IsString()
  toxicityClass?: string;

  @IsOptional()
  @IsString()
  formulationDenomination?: string;

  @IsOptional()
  @IsString()
  productUrl?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  eiqValue?: number;

  @IsOptional()
  @IsString()
  senasaId?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  inputTypeId?: number;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  cropId?: string;
}
