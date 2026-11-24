/**
 * Pure mapping of the legacy CouchDB `fields` documents (KAN-65), kept apart from the import
 * script so it can be unit-tested without CouchDB or PostgreSQL.
 *
 * Legacy shape (fieldparner_frontend `src/types/index.ts`):
 *   field `campos_<uuid>` { nombre, uuid, accountId, countryId (country code), campo_geojson,
 *                           lotes: Lot[], lotBranches?: { [branchId]: Lot[] } }
 *   lot   GeoJSON Feature { id?, properties { nombre, uuid, campo_parent_id, hectareas }, geometry }
 *   campaign { _id, name, lotBranchId?, lotBranchMode?: 'shared' | 'independent', lotBranchPromotedAt? }
 */
import { MAX_GEOMETRY_POSITIONS, MultiPolygonGeometry, Position } from '../../src/common/geo/geo.types';
import { polygonalGeometryProblem } from '../../src/common/geo/polygonal-geometry.validator';

/** Branch id the front uses for `field.lotes` (campaigns without `lotBranchId`). */
export const LEGACY_BRANCH_ID = 'legacy';
export const BASE_LAYOUT_NAME = 'Base';

export type CouchDoc = Record<string, unknown> & { _id: string };

export interface LegacyGeometry {
  /** Null when nothing usable was found; `problem` says why. */
  geometry: MultiPolygonGeometry | null;
  problem: string | null;
  /** Repairs done in JS (closed rings, dropped degenerate rings, …), for the report. */
  repairs: string[];
}

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : v == null ? '' : String(v).trim());

/**
 * Extracts a MultiPolygon from whatever the legacy app stored: a Feature (the usual case), a
 * FeatureCollection, a bare geometry, a GeometryCollection, or any of those as a JSON string.
 * Rings are closed when open and dropped when degenerate; elevation is dropped. Topology is not
 * checked here: that is PostGIS's job (ST_IsValid / ST_MakeValid).
 */
export function toLegacyGeometry(value: unknown): LegacyGeometry {
  const repairs: string[] = [];
  let parsed = value;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return { geometry: null, problem: 'el GeoJSON no es JSON válido', repairs };
    }
  }

  const polygons: unknown[][] = [];
  const collect = (node: unknown, depth = 0): void => {
    if (!node || typeof node !== 'object' || depth > 4) return;
    const n = node as { type?: unknown; geometry?: unknown; features?: unknown; geometries?: unknown; coordinates?: unknown };
    switch (n.type) {
      case 'Feature':
        return collect(n.geometry, depth + 1);
      case 'FeatureCollection':
        return (Array.isArray(n.features) ? n.features : []).forEach((f) => collect(f, depth + 1));
      case 'GeometryCollection':
        return (Array.isArray(n.geometries) ? n.geometries : []).forEach((g) => collect(g, depth + 1));
      case 'Polygon':
        if (Array.isArray(n.coordinates)) polygons.push(n.coordinates);
        return;
      case 'MultiPolygon':
        if (Array.isArray(n.coordinates)) n.coordinates.forEach((p) => Array.isArray(p) && polygons.push(p));
        return;
      default:
        if (n.type) repairs.push(`se ignoró una geometría ${str(n.type)}`);
    }
  };
  collect(parsed);
  if (polygons.length === 0) return { geometry: null, problem: 'no tiene polígonos', repairs };

  const out: Position[][][] = [];
  for (const polygon of polygons) {
    const rings: Position[][] = [];
    for (const [index, rawRing] of polygon.entries()) {
      if (!Array.isArray(rawRing)) continue;
      const ring: Position[] = [];
      for (const p of rawRing) {
        if (!Array.isArray(p) || p.length < 2) continue;
        const [lng, lat] = [Number(p[0]), Number(p[1])];
        if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
          return { geometry: null, problem: 'hay coordenadas que no son números', repairs };
        }
        // consecutive duplicates add nothing and can leave a ring with too few distinct points
        const last = ring[ring.length - 1];
        if (!last || last[0] !== lng || last[1] !== lat) ring.push([lng, lat]);
      }
      if (ring.length >= 3 && (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1])) {
        ring.push([...ring[0]]);
        repairs.push('se cerró un anillo abierto');
      }
      if (ring.length < 4) {
        repairs.push(index === 0 ? 'se descartó un polígono degenerado' : 'se descartó un hueco degenerado');
        if (index === 0) break; // without its shell the holes mean nothing
        continue;
      }
      rings.push(ring);
    }
    if (rings.length > 0) out.push(rings);
  }
  if (out.length === 0) return { geometry: null, problem: 'todos los polígonos son degenerados', repairs };

  const geometry: MultiPolygonGeometry = { type: 'MultiPolygon', coordinates: out };
  const problem = polygonalGeometryProblem(geometry);
  if (problem?.startsWith('supera el máximo')) {
    // The cap protects the API payload; legacy outlines are imported anyway and flagged.
    repairs.push(`tiene más de ${MAX_GEOMETRY_POSITIONS} vértices: no se podrá editar por la API sin simplificarlo`);
    return { geometry, problem: null, repairs };
  }
  return { geometry: problem ? null : geometry, problem, repairs };
}

export interface LegacyLot {
  /** Feature `id` (uuidv7 in recent docs). */
  legacyId: string | null;
  /** `properties.uuid`. */
  legacyUuid: string | null;
  /** `properties.nombre` as stored, before any renaming. */
  legacyName: string;
  feature: Record<string, unknown>;
}

const lotIdentifiers = (lot: LegacyLot): string[] =>
  [lot.legacyId, lot.legacyUuid].filter((v): v is string => Boolean(v));

/** Same rule as the front's `lotsShareIdentifier`: id, else uuid, else name. */
export function sameLegacyLot(a: LegacyLot, b: LegacyLot): boolean {
  if (a.legacyId && b.legacyId) return a.legacyId === b.legacyId;
  if (a.legacyUuid && b.legacyUuid) return a.legacyUuid === b.legacyUuid;
  if (lotIdentifiers(a).length || lotIdentifiers(b).length) return false;
  return Boolean(a.legacyName) && a.legacyName === b.legacyName;
}

/** Lots of one branch of one field, without the repeated entries legacy edits left behind. */
export function legacyLots(raw: unknown): { lots: LegacyLot[]; duplicates: LegacyLot[] } {
  const lots: LegacyLot[] = [];
  const duplicates: LegacyLot[] = [];
  for (const item of Array.isArray(raw) ? raw : []) {
    if (!item || typeof item !== 'object') continue;
    const feature = item as Record<string, unknown>;
    const props = (feature.properties ?? {}) as Record<string, unknown>;
    const lot: LegacyLot = {
      legacyId: str(feature.id) || null,
      legacyUuid: str(props.uuid) || null,
      legacyName: str(props.nombre),
      feature,
    };
    (lots.some((l) => sameLegacyLot(l, lot)) ? duplicates : lots).push(lot);
  }
  return { lots, duplicates };
}

/** Every branch of a field: the legacy `lotes` plus each entry of `lotBranches`. */
export function fieldBranches(doc: CouchDoc): Map<string, unknown> {
  const branches = new Map<string, unknown>([[LEGACY_BRANCH_ID, doc.lotes]]);
  const extra = doc.lotBranches;
  if (extra && typeof extra === 'object' && !Array.isArray(extra)) {
    for (const [branchId, lots] of Object.entries(extra)) {
      if (branchId && branchId !== LEGACY_BRANCH_ID) branches.set(branchId, lots);
    }
  }
  return branches;
}

export interface LayoutPlan {
  legacyBranchId: string;
  name: string;
  promotedAt: Date | null;
}

const toDate = (v: unknown): Date | null => {
  const t = Date.parse(str(v));
  return Number.isFinite(t) ? new Date(t) : null;
};

/**
 * One layout per branch. The name comes from the campaign that owns the branch (the one that
 * created it as "independent"), else any campaign using it, else the branch id. Branches that
 * only campaigns mention (an independent campaign that never drew lots) get a layout too, so
 * the campaign import can link every campaign by `legacyBranchId`.
 */
export function planLayouts(branchIds: Iterable<string>, campaigns: CouchDoc[]): LayoutPlan[] {
  const ids = new Set<string>([LEGACY_BRANCH_ID, ...branchIds]);
  for (const c of campaigns) if (str(c.lotBranchId)) ids.add(str(c.lotBranchId));

  return [...ids].sort().map((legacyBranchId) => {
    if (legacyBranchId === LEGACY_BRANCH_ID) {
      return { legacyBranchId, name: BASE_LAYOUT_NAME, promotedAt: null };
    }
    const users = campaigns.filter((c) => str(c.lotBranchId) === legacyBranchId);
    const owner = users.find((c) => str(c.lotBranchMode) === 'independent') ?? users[0];
    const promotedAt = users.map((c) => toDate(c.lotBranchPromotedAt)).find(Boolean) ?? null;
    return { legacyBranchId, name: str(owner?.name) || legacyBranchId, promotedAt };
  });
}

/**
 * Lot name unique within field + layout, case-insensitive (the partial unique index). Empty
 * names get "Lote N"; repeated ones get a " (2)", " (3)"… suffix.
 */
export function uniqueLotName(wanted: string, position: number, taken: Set<string>): string {
  const base = wanted || `Lote ${position}`;
  let name = base;
  for (let n = 2; taken.has(name.toLowerCase()); n++) name = `${base} (${n})`;
  taken.add(name.toLowerCase());
  return name;
}
