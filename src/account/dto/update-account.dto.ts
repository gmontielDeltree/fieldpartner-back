import { IsOptional, IsEnum, IsBoolean, IsInt, Min } from 'class-validator';
import { AccountStatus, CurrencyCode } from '@prisma/client';

export class UpdateAccountDto {
  @IsOptional()
  @IsEnum(AccountStatus)
  status?: AccountStatus;

  @IsOptional()
  @IsEnum(CurrencyCode)
  currency?: CurrencyCode;

  @IsOptional()
  @IsBoolean()
  isLicenceMultipleCountry?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxHectares?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxFields?: number;
}
