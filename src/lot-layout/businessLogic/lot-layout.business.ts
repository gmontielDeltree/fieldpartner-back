import { HttpStatus, Injectable } from '@nestjs/common';
import { CampaignState } from '@prisma/client';
import { BusinessErrorCode, BusinessException } from '../../common/exceptions/business.exception';
import { Db } from '../../common/geo/geometry.repository';
import { PrismaService } from '../../prisma/prisma.service';
import { LotLayoutRepository } from '../lot-layout.repository';
import { CreateLotLayoutDto } from '../dto/create-lot-layout.dto';
import { LotLayoutDto } from '../dto/lot-layout.dto';

/** Where a lot write lands: the layout itself, or the copy made because it was locked. */
export interface WritableLayout {
  layoutId: string;
  /** Set when the write forced a copy of a locked layout. */
  forkedFromLayoutId: string | null;
  /** Original lot id → id of its copy (only after a fork). */
  lotIdMap: Map<string, string> | null;
}

@Injectable()
export class LotLayoutBusiness {
  constructor(
    private readonly prisma: PrismaService,
    private readonly layouts: LotLayoutRepository,
  ) {}

  /** Empty layout, or a copy of `sourceLayoutId` (which must belong to the same account). */
  async create(accountId: string, dto: CreateLotLayoutDto): Promise<LotLayoutDto> {
    if (dto.sourceLayoutId && !(await this.layouts.findOne(dto.sourceLayoutId, accountId))) {
      throw new BusinessException(
        BusinessErrorCode.INVALID_REFERENCE,
        'El layout de origen indicado no existe en la cuenta',
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.prisma.$transaction(async (tx) => {
      const layout = await this.layouts.create(accountId, dto, tx);
      if (!dto.sourceLayoutId) return layout;
      await this.layouts.copyLots(dto.sourceLayoutId, layout.id, tx);
      return (await this.layouts.findOne(layout.id, undefined, tx)) as LotLayoutDto;
    });
  }

  /**
   * Resolves the layout a lot write may change, inside the caller's transaction (the layout
   * row stays locked until it ends). An open layout is written in place. A locked one is
   * history: the write is only allowed from an open campaign that uses it (`campaignId`), and
   * then the layout is copied, every open campaign sharing it moves to the copy, and the
   * write lands there. Closed campaigns keep the original untouched.
   */
  async writableLayout(layoutId: string, campaignId: string | undefined, tx: Db): Promise<WritableLayout> {
    await this.layouts.lockForUpdate(layoutId, tx);
    const layout = (await this.layouts.findOne(layoutId, undefined, tx)) as LotLayoutDto;
    if (!layout.locked) return { layoutId, forkedFromLayoutId: null, lotIdMap: null };

    if (!campaignId) {
      throw new BusinessException(
        BusinessErrorCode.LOT_LAYOUT_LOCKED,
        'Este layout de lotes lo usa una campaña cerrada y no se modifica. Editalo desde una ' +
          'campaña abierta (campaignId) y se crea una copia para las campañas abiertas.',
        HttpStatus.CONFLICT,
      );
    }
    const campaign = layout.campaigns.find((c) => c.id === campaignId);
    if (!campaign || campaign.state === CampaignState.CLOSED) {
      throw new BusinessException(
        BusinessErrorCode.LOT_LAYOUT_LOCKED,
        'La campaña indicada no está abierta o ya no usa este layout de lotes (volvé a cargarla)',
        HttpStatus.CONFLICT,
      );
    }

    const copy = await this.layouts.create(
      layout.accountId,
      { name: `${layout.name} (${campaign.name})`, sourceLayoutId: layout.id },
      tx,
    );
    const copied = await this.layouts.copyLots(layout.id, copy.id, tx);
    await this.layouts.moveOpenCampaigns(layout.id, copy.id, tx);
    return {
      layoutId: copy.id,
      forkedFromLayoutId: layout.id,
      lotIdMap: new Map(copied.map((lot) => [lot.sourceLotId, lot.id])),
    };
  }

  /** Only a layout no campaign uses and whose lots nothing references can be deleted. */
  async remove(layout: LotLayoutDto): Promise<LotLayoutDto> {
    if (layout.campaigns.length > 0) {
      throw new BusinessException(
        BusinessErrorCode.LOT_LAYOUT_IN_USE,
        `El layout lo usan ${layout.campaigns.length} campaña(s): ` +
          layout.campaigns.map((c) => c.name).join(', '),
        HttpStatus.CONFLICT,
      );
    }
    if ((await this.layouts.countLotReferences(layout.id)) > 0) {
      throw new BusinessException(
        BusinessErrorCode.LOT_LAYOUT_IN_USE,
        'El layout tiene lotes con registros asociados (stock, salidas, movimientos…)',
        HttpStatus.CONFLICT,
      );
    }
    await this.layouts.deleteWithLots(layout.id);
    return layout;
  }
}
