import { IsString, IsNotEmpty, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { CampaignState, LotBranchMode } from '@prisma/client';

/**
 * The account comes from the caller (or `?accountId=` for a GENERAL_ADMIN), never the body.
 * zoneId / fieldId / lotBranchSourceCampaignId must belong to that same account.
 */
export class CreateCampaignDto {
  @IsOptional()
  @IsString()
  zoneId?: string;

  @IsOptional()
  @IsString()
  fieldId?: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  zafra?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(CampaignState)
  state?: CampaignState;

  @IsOptional()
  @IsString()
  lotBranchId?: string;

  @IsOptional()
  @IsEnum(LotBranchMode)
  lotBranchMode?: LotBranchMode;

  @IsOptional()
  @IsString()
  lotBranchSourceCampaignId?: string;
}
