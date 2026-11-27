import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { InOutDirection, StockItemType } from '@prisma/client';
import { AMOUNT, AmountLineDto, MovementInfoDto } from './stock-line.dto';

/** One inflow or outflow (manual movements, harvests, field exits, withdrawals, labors). */
export class CreateStockMovementDto extends AmountLineDto {
  @IsEnum(InOutDirection)
  direction: InOutDirection;

  @ValidateNested()
  @Type(() => MovementInfoDto)
  info: MovementInfoDto;

  /** Expiry of the supply lot. */
  @IsOptional()
  @IsISO8601()
  dueDate?: string;

  /** Origin of the grain (harvests): field and lot of the account. */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  fieldId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  lotId?: string;

  /** Reservation released by the same outflow (labors, withdrawal orders). */
  @IsOptional()
  @IsNumber(AMOUNT)
  @Min(0)
  releaseReserved?: number;
}

export class TransferPlaceDto {
  @IsString()
  @IsNotEmpty()
  depositId: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;
}

/** Moves an item between deposits or locations: both legs in one transaction. */
export class CreateStockTransferDto {
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

  @IsOptional()
  @IsString()
  @MaxLength(100)
  nroLot?: string;

  @ValidateNested()
  @Type(() => TransferPlaceDto)
  from: TransferPlaceDto;

  @ValidateNested()
  @Type(() => TransferPlaceDto)
  to: TransferPlaceDto;

  @Type(() => Number)
  @IsNumber(AMOUNT)
  @IsPositive()
  amount: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  unitMeasurement?: string;

  @ValidateNested()
  @Type(() => MovementInfoDto)
  info: MovementInfoDto;
}

/** Consumes the origins and produces the destinations, all or nothing. */
export class CreateStockTransformationDto {
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => AmountLineDto)
  origins: AmountLineDto[];

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => AmountLineDto)
  destinations: AmountLineDto[];

  @ValidateNested()
  @Type(() => MovementInfoDto)
  info: MovementInfoDto;
}
