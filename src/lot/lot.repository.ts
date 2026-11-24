import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { Db, fromHex, GeometryHex, nowUtc } from '../common/geo/geometry.repository';
import { LotDto } from './dto/lot.dto';

/** Response columns (lot `l` joined to its layout `ly`); geometry as GeoJSON, 7 decimals. */
const LOT_COLUMNS = Prisma.sql`
  l.id, ly."accountId", l."fieldId", l."layoutId", l.name, l.hectares, l."declaredHectares",
  l."sourceLotId", l."archivedAt", l."legacyId", l."legacyUuid", l."legacyName",
  l."createdAt", l."updatedAt", ST_AsGeoJSON(l.geometry, 7)::json AS geometry`;

export interface LotScalars {
  name?: string;
  declaredHectares?: number | null;
}

/**
 * Lots carry a PostGIS column, so reads and geometry writes are raw SQL (tagged templates,
 * bound parameters). Scalar-only operations (archive, delete, counts) use the Prisma client.
 */
@Injectable()
export class LotRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(layoutId: string, fieldId: string | undefined, includeArchived: boolean): Promise<LotDto[]> {
    return this.prisma.$queryRaw<LotDto[]>`
      SELECT ${LOT_COLUMNS}
      FROM lots l JOIN lot_layouts ly ON ly.id = l."layoutId"
      WHERE l."layoutId" = ${layoutId}
        ${fieldId ? Prisma.sql`AND l."fieldId" = ${fieldId}` : Prisma.empty}
        ${includeArchived ? Prisma.empty : Prisma.sql`AND l."archivedAt" IS NULL`}
      ORDER BY l."fieldId", l.name`;
  }

  /** `accountId` undefined = no account filter (GENERAL_ADMIN). */
  async findOne(id: string, accountId?: string, db: Db = this.prisma): Promise<LotDto | null> {
    const [lot] = await db.$queryRaw<LotDto[]>`
      SELECT ${LOT_COLUMNS}
      FROM lots l JOIN lot_layouts ly ON ly.id = l."layoutId"
      WHERE l.id = ${id} ${accountId ? Prisma.sql`AND ly."accountId" = ${accountId}` : Prisma.empty}`;
    return lot ?? null;
  }

  /** Case-insensitive, among the non-archived lots of the field in the layout. */
  async nameTaken(
    fieldId: string,
    layoutId: string,
    name: string,
    excludeLotId: string | null,
    db: Db,
  ): Promise<boolean> {
    const [row] = await db.$queryRaw<{ taken: boolean }[]>`
      SELECT EXISTS (
        SELECT 1 FROM lots
        WHERE "fieldId" = ${fieldId} AND "layoutId" = ${layoutId} AND "archivedAt" IS NULL
          AND lower(name) = lower(${name}) AND id <> ${excludeLotId ?? ''}
      ) AS taken`;
    return row.taken;
  }

  async insert(
    data: { fieldId: string; layoutId: string; name: string; declaredHectares?: number | null },
    hex: GeometryHex,
    db: Db,
  ): Promise<string> {
    const id = randomUUID();
    await db.$executeRaw`
      INSERT INTO lots (id, "fieldId", "layoutId", name, geometry, "declaredHectares", "updatedAt")
      VALUES (${id}, ${data.fieldId}, ${data.layoutId}, ${data.name}, ${fromHex(hex)},
              ${data.declaredHectares ?? null}, ${nowUtc})`;
    return id;
  }

  async update(id: string, data: LotScalars, hex: GeometryHex | undefined, db: Db): Promise<void> {
    const sets: Prisma.Sql[] = [Prisma.sql`"updatedAt" = ${nowUtc}`];
    if (data.name !== undefined) sets.push(Prisma.sql`name = ${data.name}`);
    if (data.declaredHectares !== undefined) {
      sets.push(Prisma.sql`"declaredHectares" = ${data.declaredHectares}`);
    }
    if (hex) sets.push(Prisma.sql`geometry = ${fromHex(hex)}`);
    await db.$executeRaw`UPDATE lots SET ${Prisma.join(sets, ', ')} WHERE id = ${id}`;
  }

  async archive(id: string, db: Db): Promise<void> {
    await db.lot.update({ where: { id }, data: { archivedAt: new Date() }, select: { id: true } });
  }

  async delete(id: string, db: Db): Promise<void> {
    await db.lot.delete({ where: { id }, select: { id: true } });
  }

  /** Records that point at the lot (stock, exits, crop movements and deposits, PU, expenses). */
  async countReferences(id: string, db: Db): Promise<number> {
    const counts = await Promise.all([
      db.stock.count({ where: { fieldLotId: id } }),
      db.cropMovement.count({ where: { lotId: id } }),
      db.cropDeposit.count({ where: { lotId: id } }),
      db.exitField.count({ where: { lotId: id } }),
      db.productiveUnitField.count({ where: { lotId: id } }),
      db.campaignExpense.count({ where: { lotId: id } }),
    ]);
    return counts.reduce((a, b) => a + b, 0);
  }
}
