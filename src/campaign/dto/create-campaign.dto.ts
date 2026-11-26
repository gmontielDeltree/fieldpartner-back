import { ArrayMaxSize, IsArray, IsString, IsNotEmpty, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { CampaignState } from '@prisma/client';

/**
 * The account comes from the caller (or `?accountId=` for a GENERAL_ADMIN), never the body.
 * A campaign covers every field of the account (KAN-65); zoneId / lotLayoutId must belong to
 * that same account. `lotLayoutId` = "continue" on that layout; omitted = a new empty layout
 * ("independent", or the first campaign).
 */
export class CreateCampaignDto {
  @IsOptional()
  @IsString()
  zoneId?: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  /** Zafras of the campaign (e.g. `gruesa_verano`, `fina_invierno`, or a custom label). */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  zafras?: string[];

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
  lotLayoutId?: string;
}
