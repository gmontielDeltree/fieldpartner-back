import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { StockSumType } from '@prisma/client';

export class CreateMovementTypeDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  conceptES: string;

  @IsOptional()
  @IsString()
  conceptPT?: string;

  @IsOptional()
  @IsString()
  conceptEN?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  typeMovement?: string;

  @IsOptional()
  @IsBoolean()
  manual?: boolean;

  @IsOptional()
  @IsEnum(StockSumType)
  stockSum?: StockSumType;
}
