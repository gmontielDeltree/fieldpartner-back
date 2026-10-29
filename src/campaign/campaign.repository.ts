import { Injectable } from '@nestjs/common';
import { CampaignState } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';

const INCLUDE_DETAIL = {
  zone: true,
  field: { include: { lots: true } },
} as const;

@Injectable()
export class CampaignRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateCampaignDto) {
    return this.prisma.campaign.create({
      data: { ...dto, startDate: dto.startDate ? new Date(dto.startDate) : undefined, endDate: dto.endDate ? new Date(dto.endDate) : undefined },
      include: INCLUDE_DETAIL,
    });
  }

  findAll(accountId: string, state?: CampaignState) {
    return this.prisma.campaign.findMany({
      where: { accountId, ...(state && { state }) },
      include: INCLUDE_DETAIL,
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: string) {
    return this.prisma.campaign.findUnique({ where: { id }, include: INCLUDE_DETAIL });
  }

  update(id: string, dto: UpdateCampaignDto) {
    return this.prisma.campaign.update({
      where: { id },
      data: { ...dto, startDate: dto.startDate ? new Date(dto.startDate) : undefined, endDate: dto.endDate ? new Date(dto.endDate) : undefined },
      include: INCLUDE_DETAIL,
    });
  }

  remove(id: string) {
    return this.prisma.campaign.delete({ where: { id } });
  }
}
