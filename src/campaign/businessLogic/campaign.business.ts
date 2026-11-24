import { HttpStatus, Injectable } from '@nestjs/common';
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
      checks.push(['La zona', this.prisma.zone.count({ where: { id: refs.zoneId, accountId } })]);
    }
    if (refs.lotLayoutId) {
      checks.push([
        'El layout de lotes',
        this.prisma.lotLayout.count({ where: { id: refs.lotLayoutId, accountId } }),
      ]);
    }

    for (const [label, count] of checks) {
      if ((await count) === 0) {
        throw new BusinessException(
          BusinessErrorCode.INVALID_REFERENCE,
          `${label} indicada no existe en la cuenta`,
          HttpStatus.BAD_REQUEST,
        );
      }
    }
  }
}
