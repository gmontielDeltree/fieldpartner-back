import { Injectable, NotFoundException } from '@nestjs/common';
import { CampaignState } from '@prisma/client';
import { CampaignRepository } from './campaign.repository';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';

@Injectable()
export class CampaignService {
  constructor(private readonly campaignRepository: CampaignRepository) {}

  create(dto: CreateCampaignDto) {
    return this.campaignRepository.create(dto);
  }

  findAll(accountId: string, state?: CampaignState) {
    return this.campaignRepository.findAll(accountId, state);
  }

  async findOne(id: string) {
    const campaign = await this.campaignRepository.findOne(id);
    if (!campaign) throw new NotFoundException(`Campaign ${id} not found`);
    return campaign;
  }

  async update(id: string, dto: UpdateCampaignDto) {
    await this.findOne(id);
    return this.campaignRepository.update(id, dto);
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.campaignRepository.remove(id);
  }
}
