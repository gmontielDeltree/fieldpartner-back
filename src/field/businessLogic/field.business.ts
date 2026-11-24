import { HttpStatus, Injectable } from '@nestjs/common';
import { BusinessErrorCode, BusinessException } from '../../common/exceptions/business.exception';
import { RemovalResultDto } from '../../common/dto/removal-result.dto';
import { GEOMETRY_EPSILON, LOT_OUTSIDE_TOLERANCE } from '../../common/geo/geo.types';
import { GeometryRepository } from '../../common/geo/geometry.repository';
import { requireUsableGeometry, toPercent } from '../../common/geo/geometry.rules';
import { PrismaService } from '../../prisma/prisma.service';
import { FieldRepository } from '../field.repository';
import { CreateFieldDto } from '../dto/create-field.dto';
import { UpdateFieldDto } from '../dto/update-field.dto';
import { FieldDto } from '../dto/field.dto';

@Injectable()
export class FieldBusiness {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fields: FieldRepository,
    private readonly geometry: GeometryRepository,
  ) {}

  async create(accountId: string, dto: CreateFieldDto): Promise<FieldDto> {
    await this.assertCountry(dto.countryId);
    const hex = requireUsableGeometry(await this.geometry.normalize(dto.geometry));
    const id = await this.fields.insert(accountId, dto, hex);
    return (await this.fields.findOne(id)) as FieldDto;
  }

  /**
   * A new outline is checked against the lots of the field in open layouts (locked layouts
   * are history and keep their geometry): a lot left outside by more than the tolerance
   * blocks the change (409 with the affected lots); smaller excesses are clipped.
   */
  async update(field: FieldDto, dto: UpdateFieldDto): Promise<FieldDto> {
    this.assertNotArchived(field);
    await this.assertCountry(dto.countryId);
    const { geometry, ...scalars } = dto;

    return this.prisma.$transaction(async (tx) => {
      await this.fields.lockForUpdate(field.id, tx);
      let hex: string | undefined;
      if (geometry) {
        hex = requireUsableGeometry(await this.geometry.normalize(geometry, tx));
        const lots = await this.geometry.lotsOutsideField(field.id, hex, tx);
        const blocking = lots.filter((lot) => lot.outsideRatio > LOT_OUTSIDE_TOLERANCE);
        if (blocking.length > 0) {
          throw new BusinessException(
            BusinessErrorCode.FIELD_LOTS_OUTSIDE,
            `El nuevo contorno deja fuera del campo a ${blocking.length} lote(s): ` +
              blocking.map((lot) => `${lot.name} (${toPercent(lot.outsideRatio)} %)`).join(', '),
            HttpStatus.CONFLICT,
            blocking.map((lot) => ({
              lotId: lot.id,
              name: lot.name,
              layoutId: lot.layoutId,
              outsidePercent: toPercent(lot.outsideRatio),
            })),
          );
        }
        const toClip = lots.filter((lot) => lot.outsideRatio > GEOMETRY_EPSILON).map((lot) => lot.id);
        await this.geometry.clipLots(toClip, hex, tx);
      }
      await this.fields.update(field.id, scalars, hex, tx);
      return (await this.fields.findOne(field.id, undefined, tx)) as FieldDto;
    });
  }

  /** Archived when anything (lots included) references it; deleted otherwise. */
  async remove(field: FieldDto): Promise<RemovalResultDto> {
    if ((await this.fields.countReferences(field.id)) > 0) {
      if (!field.archivedAt) await this.fields.archive(field.id);
      return { id: field.id, result: 'ARCHIVED' };
    }
    await this.fields.delete(field.id);
    return { id: field.id, result: 'DELETED' };
  }

  private assertNotArchived(field: FieldDto): void {
    if (field.archivedAt) {
      throw new BusinessException(
        BusinessErrorCode.RECORD_ARCHIVED,
        'El campo está archivado y no se puede modificar',
        HttpStatus.CONFLICT,
      );
    }
  }

  private async assertCountry(countryId?: string | null): Promise<void> {
    if (countryId && !(await this.fields.countryExists(countryId))) {
      throw new BusinessException(
        BusinessErrorCode.INVALID_REFERENCE,
        'El país indicado no existe',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
