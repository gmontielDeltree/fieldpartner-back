import { IsEnum, IsOptional } from 'class-validator';
import { CampaignState } from '@prisma/client';
import { AccountScopeQueryDto } from '../../common/dto/account-scope-query.dto';

export class ListCampaignsQueryDto extends AccountScopeQueryDto {
  @IsOptional()
  @IsEnum(CampaignState)
  state?: CampaignState;
}
