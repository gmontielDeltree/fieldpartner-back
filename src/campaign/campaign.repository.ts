import { Injectable } from '@nestjs/common';
import { CampaignState, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { CAMPAIGN_SELECT, CampaignDto } from './dto/campaign.dto';

const toDate = (value?: string) => (value ? new Date(value) : undefined);

@Injectable()
export class CampaignRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(
    accountId: string,
    dto: CreateCampaignDto & { lotLayoutId: string },
    db: Prisma.TransactionClient = this.prisma,
  ): Promise<CampaignDto> {
    return db.campaign.create({
      data: { ...dto, accountId, startDate: toDate(dto.startDate), endDate: toDate(dto.endDate) },
      select: CAMPAIGN_SELECT,
    });
  }

  findAll(accountId: string, state?: CampaignState): Promise<CampaignDto[]> {
    return this.prisma.campaign.findMany({
      where: { accountId, ...(state && { state }) },
      select: CAMPAIGN_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  /** `accountId` undefined = no account filter (GENERAL_ADMIN). */
  findOne(id: string, accountId?: string): Promise<CampaignDto | null> {
    return this.prisma.campaign.findFirst({
      where: { id, ...(accountId && { accountId }) },
      select: CAMPAIGN_SELECT,
    });
  }

  update(id: string, dto: UpdateCampaignDto): Promise<CampaignDto> {
    return this.prisma.campaign.update({
      where: { id },
      data: { ...dto, startDate: toDate(dto.startDate), endDate: toDate(dto.endDate) },
      select: CAMPAIGN_SELECT,
    });
  }

  remove(id: string, db: Prisma.TransactionClient = this.prisma): Promise<CampaignDto> {
    return db.campaign.delete({ where: { id }, select: CAMPAIGN_SELECT });
  }
}
