import { Type } from 'class-transformer';
import {
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { CurrencyCode, StockItemType } from '@prisma/client';

const AMOUNT = { maxDecimalPlaces: 4, allowNaN: false, allowInfinity: false } as const;

/**
 * Identity of a stock row: the item (an input for SUPPLY, a crop for CROP; the business logic
 * checks that exactly one comes) and where it is. Empty texts and missing ones are the same.
 */
export class StockLineDto {
  @IsEnum(StockItemType)
  itemType: StockItemType;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  inputId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  cropId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  campaignId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  zafra?: string;

  @IsString()
  @IsNotEmpty()
  depositId: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  nroLot?: string;
}

/** Descriptive data of a movement (shared by single movements, transfers and transformations). */
export class MovementInfoDto {
  /** Catalog `movement_types.id`. */
  @IsString()
  @IsNotEmpty()
  movementTypeId: string;

  @IsISO8601()
  operationDate: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  detail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  voucher?: string;

  @IsOptional()
  @IsEnum(CurrencyCode)
  currency?: CurrencyCode;

  @IsOptional()
  @IsNumber(AMOUNT)
  @Min(0)
  totalValue?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  hours?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  documentFile?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  documentFileName?: string;

  /** Kind of document that generated the movement (WITHDRAWAL_ORDER, FIELD_EXIT…). */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  sourceType?: string;

  /** Id or number of that document; it may still live in CouchDB. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  sourceId?: string;
}

export class AmountLineDto extends StockLineDto {
  @Type(() => Number)
  @IsNumber(AMOUNT)
  @IsPositive()
  amount: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  unitMeasurement?: string;
}

export { AMOUNT };
