import { HttpStatus, Injectable } from '@nestjs/common';
import { CampaignState } from '@prisma/client';
import { BusinessErrorCode, BusinessException } from '../../common/exceptions/business.exception';
import { PrismaService } from '../../prisma/prisma.service';

export interface CampaignReferences {
  zoneId?: string | null;
  lotLayoutId?: string | null;
}

@Injectable()
export class CampaignBusiness {
  constructor(private readonly prisma: PrismaService) {}

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
