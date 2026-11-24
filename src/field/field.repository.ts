import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { Db, fromHex, GeometryHex, nowUtc } from '../common/geo/geometry.repository';
import { FieldDto } from './dto/field.dto';

/** Response columns; geometry as GeoJSON (7 decimals ≈ 1 cm). */
const FIELD_COLUMNS = Prisma.sql`
  f.id, f."accountId", f."countryId", f.name, f.hectares, f."declaredHectares", f."archivedAt",
  f."legacyId", f."legacyUuid", f."createdAt", f."updatedAt",
  ST_AsGeoJSON(f.geometry, 7)::json AS geometry`;

export interface FieldScalars {
  name?: string;
  countryId?: string | null;
  declaredHectares?: number | null;
}

/** The row a write works on, locked until the transaction ends. */
export interface LockedField {
  id: string;
  accountId: string;
  archivedAt: Date | null;
  hex: GeometryHex;
}

/**
 * Fields carry a PostGIS column, so reads and geometry writes are raw SQL (tagged templates,
 * bound parameters). Scalar-only operations (archive, delete, counts) use the Prisma client.
 */
@Injectable()
export class FieldRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(accountId: string, includeArchived: boolean): Promise<FieldDto[]> {
    return this.prisma.$queryRaw<FieldDto[]>`
      SELECT ${FIELD_COLUMNS} FROM fields f
      WHERE f."accountId" = ${accountId}
        ${includeArchived ? Prisma.empty : Prisma.sql`AND f."archivedAt" IS NULL`}
      ORDER BY f.name`;
  }

  /** `accountId` undefined = no account filter (GENERAL_ADMIN). */
  async findOne(id: string, accountId?: string, db: Db = this.prisma): Promise<FieldDto | null> {
    const [field] = await db.$queryRaw<FieldDto[]>`
      SELECT ${FIELD_COLUMNS} FROM fields f
      WHERE f.id = ${id} ${accountId ? Prisma.sql`AND f."accountId" = ${accountId}` : Prisma.empty}`;
    return field ?? null;
  }

  /** SELECT … FOR UPDATE: serializes outline edits with lot writes on the same field. */
  async lockForUpdate(id: string, db: Db): Promise<LockedField | null> {
    const [row] = await db.$queryRaw<LockedField[]>`
      SELECT id, "accountId", "archivedAt", encode(ST_AsEWKB(geometry), 'hex') AS hex
      FROM fields WHERE id = ${id} FOR UPDATE`;
    return row ?? null;
  }

  async insert(accountId: string, data: FieldScalars & { name: string }, hex: GeometryHex): Promise<string> {
    const id = randomUUID();
    await this.prisma.$executeRaw`
      INSERT INTO fields (id, "accountId", "countryId", name, geometry, "declaredHectares", "updatedAt")
      VALUES (${id}, ${accountId}, ${data.countryId ?? null}, ${data.name}, ${fromHex(hex)},
              ${data.declaredHectares ?? null}, ${nowUtc})`;
    return id;
  }

  async update(id: string, data: FieldScalars, hex: GeometryHex | undefined, db: Db): Promise<void> {
    const sets: Prisma.Sql[] = [Prisma.sql`"updatedAt" = ${nowUtc}`];
    if (data.name !== undefined) sets.push(Prisma.sql`name = ${data.name}`);
    if (data.countryId !== undefined) sets.push(Prisma.sql`"countryId" = ${data.countryId}`);
    if (data.declaredHectares !== undefined) {
      sets.push(Prisma.sql`"declaredHectares" = ${data.declaredHectares}`);
    }
    if (hex) sets.push(Prisma.sql`geometry = ${fromHex(hex)}`);
    await db.$executeRaw`UPDATE fields SET ${Prisma.join(sets, ', ')} WHERE id = ${id}`;
  }

  async archive(id: string): Promise<void> {
    await this.prisma.field.update({ where: { id }, data: { archivedAt: new Date() }, select: { id: true } });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.field.delete({ where: { id }, select: { id: true } });
  }

  /** Lots (in any layout, archived too) and every record that points at the field. */
  async countReferences(id: string): Promise<number> {
    const where = { fieldId: id };
    const counts = await Promise.all([
      this.prisma.lot.count({ where }),
      this.prisma.stock.count({ where }),
      this.prisma.cropMovement.count({ where }),
      this.prisma.cropDeposit.count({ where }),
      this.prisma.exitField.count({ where }),
      this.prisma.productiveUnitField.count({ where }),
      this.prisma.campaignExpense.count({ where }),
    ]);
    return counts.reduce((a, b) => a + b, 0);
  }

  async countryExists(id: string): Promise<boolean> {
    return (await this.prisma.country.count({ where: { id } })) > 0;
  }
}
