import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CampaignController } from './campaign.controller';
import { CampaignRepository } from './campaign.repository';
import { CampaignService } from './campaign.service';
import { CampaignBusiness } from './businessLogic/campaign.business';

@Module({
  imports: [PrismaModule],
  controllers: [CampaignController],
  providers: [CampaignService, CampaignRepository, CampaignBusiness],
  exports: [CampaignService],
})
export class CampaignModule {}
