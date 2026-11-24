import { HttpStatus, Injectable } from '@nestjs/common';
import { BusinessErrorCode, BusinessException } from '../../common/exceptions/business.exception';
import { PrismaService } from '../../prisma/prisma.service';

export interface CampaignReferences {
  zoneId?: string | null;
  fieldId?: string | null;
  lotBranchSourceCampaignId?: string | null;
}

@Injectable()
export class CampaignBusiness {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * A campaign may only point to a zone, field or source campaign of its own account.
   * Without this check a caller could attach another account's records by id (IDOR).
   */
  async assertReferencesInAccount(accountId: string, refs: CampaignReferences): Promise<void> {
    const checks: Array<[string, Promise<number>]> = [];
    if (refs.zoneId) {
      checks.push(['La zona', this.prisma.zone.count({ where: { id: refs.zoneId, accountId } })]);
    }
    if (refs.fieldId) {
      checks.push(['El campo', this.prisma.field.count({ where: { id: refs.fieldId, accountId } })]);
    }
    if (refs.lotBranchSourceCampaignId) {
      checks.push([
        'La campaña de origen',
        this.prisma.campaign.count({ where: { id: refs.lotBranchSourceCampaignId, accountId } }),
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
