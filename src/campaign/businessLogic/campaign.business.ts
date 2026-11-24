import { HttpStatus, Injectable } from '@nestjs/common';
import { CampaignState } from '@prisma/client';
import { BusinessErrorCode, BusinessException } from '../../common/exceptions/business.exception';
import { PrismaService } from '../../prisma/prisma.service';
import { CampaignRepository } from '../campaign.repository';
import { CampaignDto } from '../dto/campaign.dto';
import { CreateCampaignDto } from '../dto/create-campaign.dto';

export interface CampaignReferences {
  zoneId?: string | null;
  lotLayoutId?: string | null;
}

@Injectable()
export class CampaignBusiness {
  constructor(
    private readonly prisma: PrismaService,
    private readonly campaignRepository: CampaignRepository,
  ) {}

  /**
   * Every campaign works on a lot layout (KAN-65). "Continue" = pass the source campaign's
   * `lotLayoutId` (shared); without one ("independent", or the account's first campaign) an
   * empty layout named after the campaign is created in the same transaction.
   */
  create(accountId: string, dto: CreateCampaignDto): Promise<CampaignDto> {
    return this.prisma.$transaction(async (tx) => {
      const lotLayoutId =
        dto.lotLayoutId ??
        (await tx.lotLayout.create({ data: { accountId, name: dto.name }, select: { id: true } })).id;
      return this.campaignRepository.create(accountId, { ...dto, lotLayoutId }, tx);
    });
  }

  /**
   * Deleting a campaign also deletes its layout when nothing else uses it: no other campaign
   * and no lots (an empty layout created for it). Layouts with lots are kept.
   */
  remove(campaign: { id: string; lotLayoutId: string }): Promise<CampaignDto> {
    return this.prisma.$transaction(async (tx) => {
      const removed = await this.campaignRepository.remove(campaign.id, tx);
      await tx.lotLayout.deleteMany({
        where: { id: campaign.lotLayoutId, campaigns: { none: {} }, lots: { none: {} } },
      });
      return removed;
    });
  }

  /**
   * A campaign may only point to a zone or lot layout of its own account.
   * Without this check a caller could attach another account's records by id (IDOR).
   */
  async assertReferencesInAccount(accountId: string, refs: CampaignReferences): Promise<void> {
    const checks: Array<[string, Promise<number>]> = [];
    if (refs.zoneId) {
      checks.push(['La zona indicada', this.prisma.zone.count({ where: { id: refs.zoneId, accountId } })]);
    }
    if (refs.lotLayoutId) {
      checks.push([
        'El layout de lotes indicado',
        this.prisma.lotLayout.count({ where: { id: refs.lotLayoutId, accountId } }),
      ]);
    }

    for (const [label, count] of checks) {
      if ((await count) === 0) {
        throw new BusinessException(
          BusinessErrorCode.INVALID_REFERENCE,
          `${label} no existe en la cuenta`,
          HttpStatus.BAD_REQUEST,
        );
      }
    }
  }

  /** A closed campaign is history: it keeps its lot layout (KAN-65). */
  assertLayoutChangeAllowed(
    current: { state: CampaignState; lotLayoutId: string | null },
    next: { lotLayoutId?: string | null },
  ): void {
    const changes = next.lotLayoutId !== undefined && next.lotLayoutId !== current.lotLayoutId;
    if (changes && current.state === CampaignState.CLOSED) {
      throw new BusinessException(
        BusinessErrorCode.LOT_LAYOUT_LOCKED,
        'Una campaña cerrada conserva su layout de lotes',
        HttpStatus.CONFLICT,
      );
    }
  }

  /**
   * Closing a campaign locks its layout: from then on edits from open campaigns that share it
   * work on a copy (see LotLayoutBusiness.writableLayout).
   */
  async lockLayoutIfClosed(campaign: { state: CampaignState; lotLayoutId: string | null }): Promise<void> {
    if (campaign.state !== CampaignState.CLOSED || !campaign.lotLayoutId) return;
    await this.prisma.lotLayout.updateMany({
      where: { id: campaign.lotLayoutId, lockedAt: null },
      data: { lockedAt: new Date() },
    });
  }
}
