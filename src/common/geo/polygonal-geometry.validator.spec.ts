import { polygonalGeometryProblem, toGeometryJson } from './polygonal-geometry.validator';
import { MAX_GEOMETRY_POSITIONS } from './geo.types';

const square = [[-60, -34], [-59.99, -34], [-59.99, -33.99], [-60, -33.99], [-60, -34]];

describe('polygonalGeometryProblem', () => {
  it.each([
    ['Polygon', { type: 'Polygon', coordinates: [square] }],
    ['MultiPolygon', { type: 'MultiPolygon', coordinates: [[square]] }],
    ['Polygon with a hole', { type: 'Polygon', coordinates: [square, square] }],
    ['positions with elevation', { type: 'Polygon', coordinates: [square.map(([x, y]) => [x, y, 10])] }],
  ])('accepts a %s', (_, geometry) => {
    expect(polygonalGeometryProblem(geometry)).toBeNull();
  });

  it.each([
    ['null', null],
    ['a Point', { type: 'Point', coordinates: [-60, -34] }],
    ['a Feature', { type: 'Feature', geometry: { type: 'Polygon', coordinates: [square] } }],
    ['no coordinates', { type: 'Polygon', coordinates: [] }],
    ['a ring with 3 positions', { type: 'Polygon', coordinates: [square.slice(0, 3)] }],
    ['an open ring', { type: 'Polygon', coordinates: [[...square.slice(0, 4), [-60, -33.98]]] }],
    ['non-numeric coordinates', { type: 'Polygon', coordinates: [[['a', 'b'], ...square.slice(1)]] }],
    ['projected (UTM) coordinates', { type: 'Polygon', coordinates: [square.map(([x, y]) => [x * 10_000, y * 100_000])] }],
  ])('rejects %s', (_, geometry) => {
    expect(polygonalGeometryProblem(geometry)).toEqual(expect.any(String));
  });

  it('rejects geometries above the vertex limit', () => {
    const ring = Array.from({ length: MAX_GEOMETRY_POSITIONS + 1 }, (_, i) => [-60 + i * 1e-6, -34]);
    ring[ring.length - 1] = ring[0];
    expect(polygonalGeometryProblem({ type: 'Polygon', coordinates: [ring] })).toMatch(/máximo/);
  });

  it('keeps only type and coordinates (drops crs and other foreign members)', () => {
    const json = toGeometryJson({ type: 'Polygon', coordinates: [square], crs: { x: 1 } } as never);
    expect(JSON.parse(json)).toEqual({ type: 'Polygon', coordinates: [square] });
  });
});
