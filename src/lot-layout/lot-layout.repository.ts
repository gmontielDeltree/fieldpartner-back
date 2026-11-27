import { Injectable } from '@nestjs/common';
import { CampaignState } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { Db, nowUtc } from '../common/geo/geometry.repository';
import { LOT_LAYOUT_SELECT, LotLayoutDto, toLotLayoutDto } from './dto/lot-layout.dto';

export interface CopiedLot {
  id: string;
  sourceLotId: string;
}

@Injectable()
export class LotLayoutRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    accountId: string,
    data: { name: string; sourceLayoutId?: string | null },
    db: Db = this.prisma,
  ): Promise<LotLayoutDto> {
    const row = await db.lotLayout.create({
      data: { accountId, name: data.name, sourceLayoutId: data.sourceLayoutId ?? null },
      select: LOT_LAYOUT_SELECT,
    });
    return toLotLayoutDto(row);
  }

  async findAll(accountId: string): Promise<LotLayoutDto[]> {
    const rows = await this.prisma.lotLayout.findMany({
      where: { accountId },
      select: LOT_LAYOUT_SELECT,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toLotLayoutDto);
  }

  /** `accountId` undefined = no account filter (GENERAL_ADMIN). */
  async findOne(id: string, accountId?: string, db: Db = this.prisma): Promise<LotLayoutDto | null> {
    const row = await db.lotLayout.findFirst({
      where: { id, ...(accountId && { accountId }) },
      select: LOT_LAYOUT_SELECT,
    });
    return row ? toLotLayoutDto(row) : null;
  }

  /** SELECT … FOR UPDATE: lot writes on one layout run one at a time (overlap checks). */
  async lockForUpdate(id: string, db: Db): Promise<void> {
    await db.$queryRaw`SELECT id FROM lot_layouts WHERE id = ${id} FOR UPDATE`;
  }

  async rename(id: string, name: string): Promise<LotLayoutDto> {
    return toLotLayoutDto(
      await this.prisma.lotLayout.update({ where: { id }, data: { name }, select: LOT_LAYOUT_SELECT }),
    );
  }

  async promote(id: string): Promise<LotLayoutDto> {
    return toLotLayoutDto(
      await this.prisma.lotLayout.update({
        where: { id },
        data: { promotedAt: new Date() },
        select: LOT_LAYOUT_SELECT,
      }),
    );
  }

  async lock(id: string, db: Db = this.prisma): Promise<void> {
    await db.lotLayout.updateMany({ where: { id, lockedAt: null }, data: { lockedAt: new Date() } });
  }

  /** Copies the non-archived lots (geometry included) into another layout. */
  copyLots(fromLayoutId: string, toLayoutId: string, db: Db): Promise<CopiedLot[]> {
    return db.$queryRaw<CopiedLot[]>`
      INSERT INTO lots (id, "fieldId", "layoutId", name, geometry, "declaredHectares", "sourceLotId",
                        "legacyId", "legacyUuid", "legacyName", "updatedAt")
      SELECT gen_random_uuid()::text, "fieldId", ${toLayoutId}, name, geometry, "declaredHectares", id,
             "legacyId", "legacyUuid", "legacyName", ${nowUtc}
      FROM lots
      WHERE "layoutId" = ${fromLayoutId} AND "archivedAt" IS NULL
      RETURNING id, "sourceLotId"`;
  }

  /** Open campaigns keep sharing: all of them move together to the copy. */
  async moveOpenCampaigns(fromLayoutId: string, toLayoutId: string, db: Db): Promise<void> {
    await db.campaign.updateMany({
      where: { lotLayoutId: fromLayoutId, state: { not: CampaignState.CLOSED } },
      data: { lotLayoutId: toLayoutId },
    });
  }

  /** Records (stock, exits, movements…) pointing at any lot of the layout. */
  async countLotReferences(layoutId: string): Promise<number> {
    const lot = { layoutId };
    const counts = await Promise.all([
      this.prisma.stockMovement.count({ where: { lot } }),
      this.prisma.exitField.count({ where: { lot } }),
      this.prisma.productiveUnitField.count({ where: { lot } }),
      this.prisma.campaignExpense.count({ where: { lot } }),
    ]);
    return counts.reduce((a, b) => a + b, 0);
  }

  async deleteWithLots(id: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.lot.deleteMany({ where: { layoutId: id } }),
      this.prisma.lotLayout.delete({ where: { id }, select: { id: true } }),
    ]);
  }
}
