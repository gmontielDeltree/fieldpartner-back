import { Type } from 'class-transformer';
import { IsEnum, IsISO8601, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { StockItemType } from '@prisma/client';
import { AccountScopeQueryDto } from '../../common/dto/account-scope-query.dto';

/** Filters shared by the stock and movement lists. */
class ItemFilterQueryDto extends AccountScopeQueryDto {
  @IsOptional()
  @IsEnum(StockItemType)
  itemType?: StockItemType;

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
  @IsNotEmpty()
  depositId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  nroLot?: string;
}

export class StockQueryDto extends ItemFilterQueryDto {}

export class StockMovementQueryDto extends ItemFilterQueryDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  stockId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  sourceType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  sourceId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  groupId?: string;

  /** Operation date from (inclusive). */
  @IsOptional()
  @IsISO8601()
  from?: string;

  /** Operation date up to (inclusive). */
  @IsOptional()
  @IsISO8601()
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5000)
  limit?: number;
}

export class CropSummaryQueryDto extends AccountScopeQueryDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  campaignId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  cropId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  zafra?: string;
}
