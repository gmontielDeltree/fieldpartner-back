/** GeoJSON position: [longitude, latitude] (an optional elevation is dropped on write). */
export type Position = number[];

export interface PolygonGeometry {
  type: 'Polygon';
  coordinates: Position[][];
}

export interface MultiPolygonGeometry {
  type: 'MultiPolygon';
  coordinates: Position[][][];
}

/** What the API accepts for a field or lot outline (RFC 7946 geometry object, EPSG:4326). */
export type PolygonalGeometry = PolygonGeometry | MultiPolygonGeometry;

/**
 * Tolerances for lots drawn by hand (KAN-65). Relative, not absolute: a fixed 1 m² is far
 * too strict for a lot traced on a map. Ratios are measured on geodesic areas.
 * - Outside the field: up to 1 % of the lot's area is clipped away; more is rejected.
 * - Overlap between lots of a layout: more than 1 % of the smaller lot is rejected.
 */
export const LOT_OUTSIDE_TOLERANCE = 0.01;
export const LOT_OVERLAP_TOLERANCE = 0.01;
/** Below this ratio the lot is considered fully inside (float noise of shared edges). */
export const GEOMETRY_EPSILON = 1e-9;

/** Upper bound on vertices per geometry, to keep validation and spatial queries cheap. */
export const MAX_GEOMETRY_POSITIONS = 10_000;
