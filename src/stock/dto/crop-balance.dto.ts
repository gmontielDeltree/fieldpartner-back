import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, MaxLength, NotEquals } from 'class-validator';
import { AMOUNT } from './stock-line.dto';

class CropBalanceKeyDto {
  @IsString()
  @IsNotEmpty()
  campaignId: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  zafra?: string;

  @IsString()
  @IsNotEmpty()
  cropId: string;
}

/** Sale contracts: positive commits grain, negative uncommits it (never below zero). */
export class CommitCropDto extends CropBalanceKeyDto {
  @Type(() => Number)
  @IsNumber(AMOUNT)
  @NotEquals(0)
  deltaKg: number;
}

/** Deposit certificates: delivered grain also leaves the committed amount. */
export class DeliverCropDto extends CropBalanceKeyDto {
  @Type(() => Number)
  @IsNumber(AMOUNT)
  @IsPositive()
  kg: number;
}

/** Controlled response shape of a crop balance (decimals as numbers). */
export interface CropBalanceDto {
  campaignId: string;
  zafra: string;
  cropId: string;
  committedKg: number;
  deliveredKg: number;
}
