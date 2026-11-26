import { Type } from 'class-transformer';
import {
  IsString, IsNotEmpty, IsOptional, IsBoolean,
  IsNumber, IsArray, IsEnum, Min, IsInt, IsPositive,
  ArrayMaxSize, MaxLength, ValidateNested,
} from 'class-validator';
import { Labor } from '@prisma/client';

/** A crop the input applies to, with optional doses for that crop. */
export class InputCropApplicationInputDto {
  @IsString()
  @IsNotEmpty()
  cropId: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minDose?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDose?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  suggestedDose?: number;
}

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

  /** Technical sheet: stored file name. */
  @IsOptional()
  @IsString()
  @MaxLength(300)
  documentFile?: string;

  /** Technical sheet: original file name shown to the user. */
  @IsOptional()
  @IsString()
  @MaxLength(300)
  documentFileName?: string;

  /**
   * Full list of crops the input applies to. On update it replaces the current one, matched
   * by cropId: existing crops keep their id (doses updated), missing ones are removed.
   */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => InputCropApplicationInputDto)
  cropApplications?: InputCropApplicationInputDto[];
}
