import { registerDecorator, ValidationOptions } from 'class-validator';
import { MAX_GEOMETRY_POSITIONS, PolygonalGeometry, Position } from './geo.types';

/**
 * Structural check of a GeoJSON Polygon / MultiPolygon before it reaches PostGIS.
 * Topology (self-intersections, holes outside the shell…) is checked by the database with
 * ST_IsValid, which also gives the reason; this only guarantees a well-formed payload.
 * Returns the problem found, or null when the value is acceptable.
 */
export function polygonalGeometryProblem(value: unknown): string | null {
  if (typeof value !== 'object' || value === null) return 'debe ser un objeto GeoJSON';
  const { type, coordinates } = value as { type?: unknown; coordinates?: unknown };
  if (type !== 'Polygon' && type !== 'MultiPolygon') {
    return 'el tipo debe ser Polygon o MultiPolygon';
  }
  if (!Array.isArray(coordinates) || coordinates.length === 0) return 'no tiene coordenadas';

  const polygons = (type === 'Polygon' ? [coordinates] : coordinates) as unknown[];
  let positions = 0;
  for (const polygon of polygons) {
    if (!Array.isArray(polygon) || polygon.length === 0) return 'hay un polígono sin anillos';
    for (const ring of polygon) {
      if (!Array.isArray(ring) || ring.length < 4) {
        return 'cada anillo necesita al menos 4 posiciones';
      }
      for (const position of ring) {
        const problem = positionProblem(position);
        if (problem) return problem;
      }
      if (!samePosition(ring[0] as Position, ring[ring.length - 1] as Position)) {
        return 'cada anillo debe cerrarse (la primera posición igual a la última)';
      }
      positions += ring.length;
      if (positions > MAX_GEOMETRY_POSITIONS) {
        return `supera el máximo de ${MAX_GEOMETRY_POSITIONS} vértices`;
      }
    }
  }
  return null;
}

function positionProblem(position: unknown): string | null {
  if (!Array.isArray(position) || position.length < 2 || position.length > 3) {
    return 'cada posición debe ser [longitud, latitud]';
  }
  if (!position.every((n) => typeof n === 'number' && Number.isFinite(n))) {
    return 'las coordenadas deben ser números';
  }
  const [lng, lat] = position as number[];
  if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
    return 'coordenadas fuera de rango (se espera EPSG:4326: longitud, latitud en grados)';
  }
  return null;
}

const samePosition = (a: Position, b: Position) => a[0] === b[0] && a[1] === b[1];

/** Only `type` and `coordinates` are kept: a foreign member such as `crs` is ignored. */
export const toGeometryJson = (geometry: PolygonalGeometry): string =>
  JSON.stringify({ type: geometry.type, coordinates: geometry.coordinates });

export function IsPolygonalGeometry(options?: ValidationOptions): PropertyDecorator {
  return (target: object, propertyName: string | symbol) =>
    registerDecorator({
      name: 'isPolygonalGeometry',
      target: target.constructor,
      propertyName: propertyName as string,
      options,
      validator: {
        validate: (value: unknown) => polygonalGeometryProblem(value) === null,
        defaultMessage: (args) =>
          `${args?.property}: ${polygonalGeometryProblem(args?.value) ?? 'geometría inválida'}`,
      },
    });
}
