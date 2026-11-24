import { HttpStatus, Injectable } from '@nestjs/common';
import { BusinessErrorCode, BusinessException } from '../../common/exceptions/business.exception';
import {
  GEOMETRY_EPSILON,
  LOT_OUTSIDE_TOLERANCE,
  LOT_OVERLAP_TOLERANCE,
  PolygonalGeometry,
} from '../../common/geo/geo.types';
import { Db, GeometryHex, GeometryRepository } from '../../common/geo/geometry.repository';
import { requireUsableGeometry, toPercent } from '../../common/geo/geometry.rules';
import { FieldRepository, LockedField } from '../../field/field.repository';
import { LotLayoutBusiness, WritableLayout } from '../../lot-layout/businessLogic/lot-layout.business';
import { PrismaService } from '../../prisma/prisma.service';
import { LotRepository } from '../lot.repository';
import { CreateLotDto } from '../dto/create-lot.dto';
import { UpdateLotDto } from '../dto/update-lot.dto';
import { LotDto, LotMutationDto } from '../dto/lot.dto';

/**
 * Lot writes. Each one runs in a transaction that locks the layout row and then the field
 * row, so geometry checks (inside the field, no overlaps, unique name) cannot race another
 * write on the same layout or an outline change of the same field.
 */
@Injectable()
export class LotBusiness {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lots: LotRepository,
    private readonly fields: FieldRepository,
    private readonly geometry: GeometryRepository,
    private readonly layouts: LotLayoutBusiness,
  ) {}

  /** `accountId` is the layout's account (already checked against the caller). */
  create(accountId: string, dto: CreateLotDto, campaignId?: string): Promise<LotMutationDto> {
    return this.prisma.$transaction(async (tx) => {
      const target = await this.layouts.writableLayout(dto.layoutId, campaignId, tx);
      const field = await this.lockField(dto.fieldId, accountId, tx);
      const hex = await this.placeGeometry(dto.geometry, field, target.layoutId, null, tx);
      await this.assertNameFree(dto.fieldId, target.layoutId, dto.name, null, tx);
      const id = await this.lots.insert(
        { fieldId: dto.fieldId, layoutId: target.layoutId, name: dto.name, declaredHectares: dto.declaredHectares },
        hex,
        tx,
      );
      return this.result(target, await this.lots.findOne(id, undefined, tx), null);
    });
  }

  async update(lot: LotDto, dto: UpdateLotDto, campaignId?: string): Promise<LotMutationDto> {
    this.assertNotArchived(lot);
    const { geometry, ...scalars } = dto;
    return this.prisma.$transaction(async (tx) => {
      const target = await this.layouts.writableLayout(lot.layoutId, campaignId, tx);
      const lotId = this.targetLotId(lot, target);
      const field = await this.lockField(lot.fieldId, lot.accountId, tx);
      const hex = geometry
        ? await this.placeGeometry(geometry, field, target.layoutId, lotId, tx)
        : undefined;
      if (scalars.name !== undefined) {
        await this.assertNameFree(lot.fieldId, target.layoutId, scalars.name, lotId, tx);
      }
      await this.lots.update(lotId, scalars, hex, tx);
      return this.result(target, await this.lots.findOne(lotId, undefined, tx), null);
    });
  }

  /** Archived when something references it; deleted otherwise. */
  async remove(lot: LotDto, campaignId?: string): Promise<LotMutationDto> {
    this.assertNotArchived(lot);
    return this.prisma.$transaction(async (tx) => {
      const target = await this.layouts.writableLayout(lot.layoutId, campaignId, tx);
      const lotId = this.targetLotId(lot, target);
      if ((await this.lots.countReferences(lotId, tx)) > 0) {
        await this.lots.archive(lotId, tx);
        return this.result(target, await this.lots.findOne(lotId, undefined, tx), 'ARCHIVED');
      }
      await this.lots.delete(lotId, tx);
      return this.result(target, null, 'DELETED');
    });
  }

  /**
   * Normalizes the outline and applies the KAN-65 rules:
   * - more than 1 % of the lot outside the field → 400; a smaller excess is clipped;
   * - overlapping another lot of the layout by more than 1 % of the smaller one → 409.
   */
  private async placeGeometry(
    geometry: PolygonalGeometry,
    field: LockedField,
    layoutId: string,
    excludeLotId: string | null,
    tx: Db,
  ): Promise<GeometryHex> {
    const hex = requireUsableGeometry(await this.geometry.normalize(geometry, tx));

    const fit = await this.geometry.fitInField(hex, field.hex, tx);
    if (fit.outsideRatio > LOT_OUTSIDE_TOLERANCE || !fit.clippedHex) {
      throw new BusinessException(
        BusinessErrorCode.LOT_OUTSIDE_FIELD,
        `El lote queda ${toPercent(fit.outsideRatio)} % fuera del campo ` +
          `(se tolera hasta ${toPercent(LOT_OUTSIDE_TOLERANCE)} %, que se recorta)`,
        HttpStatus.BAD_REQUEST,
        { outsidePercent: toPercent(fit.outsideRatio) },
      );
    }
    const placed = fit.outsideRatio > GEOMETRY_EPSILON ? fit.clippedHex : hex;

    const overlaps = (await this.geometry.overlaps(layoutId, placed, excludeLotId, tx)).filter(
      (o) => o.ratio > LOT_OVERLAP_TOLERANCE,
    );
    if (overlaps.length > 0) {
      throw new BusinessException(
        BusinessErrorCode.LOT_OVERLAP,
        'El lote se superpone con: ' +
          overlaps.map((o) => `${o.name} (${toPercent(o.ratio)} %)`).join(', '),
        HttpStatus.CONFLICT,
        overlaps.map((o) => ({ lotId: o.id, name: o.name, overlapPercent: toPercent(o.ratio) })),
      );
    }
    return placed;
  }

  /** The field must be of the layout's account and not archived; locked for the write. */
  private async lockField(fieldId: string, accountId: string, tx: Db): Promise<LockedField> {
    const field = await this.fields.lockForUpdate(fieldId, tx);
    if (!field || field.accountId !== accountId) {
      throw new BusinessException(
        BusinessErrorCode.INVALID_REFERENCE,
        'El campo indicado no existe en la cuenta',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (field.archivedAt) {
      throw new BusinessException(
        BusinessErrorCode.RECORD_ARCHIVED,
        'El campo está archivado: no se le pueden cargar ni editar lotes',
        HttpStatus.CONFLICT,
      );
    }
    return field;
  }

  private async assertNameFree(
    fieldId: string,
    layoutId: string,
    name: string,
    excludeLotId: string | null,
    tx: Db,
  ): Promise<void> {
    if (await this.lots.nameTaken(fieldId, layoutId, name, excludeLotId, tx)) {
      throw new BusinessException(
        BusinessErrorCode.DUPLICATE_ENTRY,
        `Ya hay un lote "${name}" en este campo`,
        HttpStatus.CONFLICT,
      );
    }
  }

  private assertNotArchived(lot: LotDto): void {
    if (lot.archivedAt) {
      throw new BusinessException(
        BusinessErrorCode.RECORD_ARCHIVED,
        'El lote está archivado y no se puede modificar',
        HttpStatus.CONFLICT,
      );
    }
  }

  /** After a fork the write goes to the lot's copy (only non-archived lots are copied). */
  private targetLotId(lot: LotDto, target: WritableLayout): string {
    return target.lotIdMap?.get(lot.id) ?? lot.id;
  }

  private result(
    target: WritableLayout,
    lot: LotDto | null,
    removal: LotMutationDto['removal'],
  ): LotMutationDto {
    return { layoutId: target.layoutId, forkedFromLayoutId: target.forkedFromLayoutId, lot, removal };
  }
}
