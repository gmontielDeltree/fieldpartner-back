import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PolygonalGeometry } from './geo.types';
import { toGeometryJson } from './polygonal-geometry.validator';

/** Prisma client or an interactive-transaction client. */
export type Db = Prisma.TransactionClient;

/**
 * A normalized geometry travels between queries as hex EWKB: exact (no decimal rounding in
 * GeoJSON text) and opaque to the rest of the app.
 */
export type GeometryHex = string;

/**
 * Normalization applied to every stored outline (KAN-65): 2D, 7-decimal grid (~1 cm),
 * polygons only, MultiPolygon, exterior rings counter-clockwise (RFC 7946).
 * Constants go through Prisma.raw on purpose: they are literals, never user input.
 */
export const normalized = (geometry: Prisma.Sql): Prisma.Sql =>
  Prisma.sql`ST_Multi(ST_ForcePolygonCCW(ST_CollectionExtract(ST_ReducePrecision(ST_Force2D(${geometry}), ${Prisma.raw(
    '1e-7',
  )}), 3)))`;

/**
 * `updatedAt` for raw writes. Prisma stores UTC in `timestamp(3)` columns, so the value must
 * not depend on the session time zone.
 */
export const nowUtc = Prisma.raw(`(now() AT TIME ZONE 'UTC')`);

export const fromHex = (hex: GeometryHex): Prisma.Sql =>
  Prisma.sql`ST_GeomFromEWKB(decode(${hex}, 'hex'))`;

/** A layout is open while it is not locked and no closed campaign uses it. */
export const openLayout = (alias: string): Prisma.Sql => {
  const a = Prisma.raw(`"${alias}"`);
  return Prisma.sql`(${a}."lockedAt" IS NULL AND NOT EXISTS (
    SELECT 1 FROM campaigns c WHERE c."lotLayoutId" = ${a}.id AND c.state = 'CLOSED'))`;
};

export interface NormalizedGeometry {
  valid: boolean;
  /** ST_IsValidReason of the input when it is invalid. */
  reason: string | null;
  /** Null when the input is invalid or collapses to nothing on the precision grid. */
  hex: GeometryHex | null;
}

export interface FieldFit {
  /** Share of the lot's geodesic area that falls outside the field (0..1). */
  outsideRatio: number;
  /** The lot clipped to the field, normalized. */
  clippedHex: GeometryHex | null;
}

export interface LotOverlap {
  id: string;
  name: string;
  /** Intersection area / area of the smaller of the two lots (0..1). */
  ratio: number;
}

export interface LotOutsideField {
  id: string;
  name: string;
  layoutId: string;
  outsideRatio: number;
}

/**
 * Spatial SQL shared by fields and lots. The Prisma client cannot read or write PostGIS
 * columns, so this is raw SQL — always through tagged templates (bound parameters).
 */
@Injectable()
export class GeometryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async normalize(geometry: PolygonalGeometry, db: Db = this.prisma): Promise<NormalizedGeometry> {
    const [row] = await db.$queryRaw<NormalizedGeometry[]>`
      WITH raw AS (SELECT ST_SetSRID(ST_GeomFromGeoJSON(${toGeometryJson(geometry)}), 4326) AS g),
           norm AS (SELECT g, CASE WHEN ST_IsValid(g) THEN ${normalized(Prisma.sql`g`)} END AS n FROM raw)
      SELECT ST_IsValid(g) AS valid,
             CASE WHEN ST_IsValid(g) THEN NULL ELSE ST_IsValidReason(g) END AS reason,
             CASE WHEN n IS NOT NULL AND NOT ST_IsEmpty(n) AND ST_IsValid(n)
                  THEN encode(ST_AsEWKB(n), 'hex') END AS hex
      FROM norm`;
    return row;
  }

  async fitInField(lot: GeometryHex, field: GeometryHex, db: Db = this.prisma): Promise<FieldFit> {
    const [row] = await db.$queryRaw<FieldFit[]>`
      WITH l AS (SELECT ${fromHex(lot)} AS g), f AS (SELECT ${fromHex(field)} AS g)
      SELECT COALESCE(ST_Area(ST_Difference(l.g, f.g)::geography)
                      / NULLIF(ST_Area(l.g::geography), 0), 0) AS "outsideRatio",
             encode(ST_AsEWKB(${normalized(Prisma.sql`ST_Intersection(l.g, f.g)`)}), 'hex') AS "clippedHex"
      FROM l, f`;
    return row;
  }

  /** Non-archived lots of the layout that intersect the geometry (GiST-backed). */
  overlaps(
    layoutId: string,
    lot: GeometryHex,
    excludeLotId: string | null,
    db: Db = this.prisma,
  ): Promise<LotOverlap[]> {
    return db.$queryRaw<LotOverlap[]>`
      WITH l AS (SELECT ${fromHex(lot)} AS g)
      SELECT o.id, o.name,
             COALESCE(ST_Area(ST_Intersection(o.geometry, l.g)::geography)
                      / NULLIF(LEAST(ST_Area(o.geometry::geography), ST_Area(l.g::geography)), 0), 0) AS ratio
      FROM lots o, l
      WHERE o."layoutId" = ${layoutId}
        AND o."archivedAt" IS NULL
        AND o.id <> ${excludeLotId ?? ''}
        AND ST_Intersects(o.geometry, l.g)`;
  }

  /** Non-archived lots of the field, in open layouts, measured against a new outline. */
  lotsOutsideField(fieldId: string, field: GeometryHex, db: Db = this.prisma): Promise<LotOutsideField[]> {
    return db.$queryRaw<LotOutsideField[]>`
      WITH f AS (SELECT ${fromHex(field)} AS g)
      SELECT lo.id, lo.name, lo."layoutId",
             COALESCE(ST_Area(ST_Difference(lo.geometry, f.g)::geography)
                      / NULLIF(ST_Area(lo.geometry::geography), 0), 0) AS "outsideRatio"
      FROM lots lo
      JOIN lot_layouts ly ON ly.id = lo."layoutId"
      CROSS JOIN f
      WHERE lo."fieldId" = ${fieldId}
        AND lo."archivedAt" IS NULL
        AND ${openLayout('ly')}`;
  }

  /** Clips the given lots to a field outline (used when the outline shrinks slightly). */
  async clipLots(lotIds: string[], field: GeometryHex, db: Db = this.prisma): Promise<void> {
    if (lotIds.length === 0) return;
    await db.$executeRaw`
      UPDATE lots
      SET geometry = ${normalized(Prisma.sql`ST_Intersection(geometry, ${fromHex(field)})`)},
          "updatedAt" = ${nowUtc}
      WHERE id IN (${Prisma.join(lotIds)})`;
  }
}
