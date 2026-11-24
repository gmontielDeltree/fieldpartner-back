import { Injectable, NotFoundException } from '@nestjs/common';
import { CampaignState } from '@prisma/client';
import { Caller } from '../auth/roles.guard';
import { accountFilter, resolveTargetAccount } from '../auth/account-scope';
import { CampaignRepository } from './campaign.repository';
import { CampaignBusiness } from './businessLogic/campaign.business';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { CampaignDto } from './dto/campaign.dto';

/** Campaigns belong to one account: every operation is scoped to the caller (see account-scope). */
@Injectable()
export class CampaignService {
  constructor(
    private readonly campaignRepository: CampaignRepository,
    private readonly campaignBusiness: CampaignBusiness,
  ) {}

  async create(dto: CreateCampaignDto, caller: Caller, accountId?: string): Promise<CampaignDto> {
    const targetAccountId = resolveTargetAccount(caller, accountId);
    await this.campaignBusiness.assertReferencesInAccount(targetAccountId, dto);
    const created = await this.campaignBusiness.create(targetAccountId, dto);
    await this.campaignBusiness.lockLayoutIfClosed(created);
    return created;
  }

  findAll(caller: Caller, accountId?: string, state?: CampaignState): Promise<CampaignDto[]> {
    return this.campaignRepository.findAll(resolveTargetAccount(caller, accountId), state);
  }

  /** 404 both when it does not exist and when it belongs to another account. */
  async findOne(id: string, caller: Caller): Promise<CampaignDto> {
    const campaign = await this.campaignRepository.findOne(id, accountFilter(caller));
    if (!campaign) throw new NotFoundException(`Campaign ${id} not found`);
    return campaign;
  }

  async update(id: string, dto: UpdateCampaignDto, caller: Caller): Promise<CampaignDto> {
    const campaign = await this.findOne(id, caller);
    await this.campaignBusiness.assertReferencesInAccount(campaign.accountId, dto);
    this.campaignBusiness.assertLayoutChangeAllowed(campaign, dto);
    const updated = await this.campaignRepository.update(id, dto);
    await this.campaignBusiness.lockLayoutIfClosed(updated);
    return updated;
  }

  async remove(id: string, caller: Caller): Promise<CampaignDto> {
    const campaign = await this.findOne(id, caller);
    return this.campaignBusiness.remove(campaign);
  }
}
