import {
  fieldBranches,
  LEGACY_BRANCH_ID,
  legacyLots,
  planLayouts,
  toLegacyGeometry,
  uniqueLotName,
} from './couchdb-fields.mapping';

const ring = [[-60, -34], [-59.99, -34], [-59.99, -33.99], [-60, -33.99], [-60, -34]];
const polygon = { type: 'Polygon', coordinates: [ring] };

describe('CouchDB fields mapping (KAN-65 import)', () => {
  describe('toLegacyGeometry', () => {
    it('takes the geometry out of a Feature and returns a MultiPolygon', () => {
      const out = toLegacyGeometry({ type: 'Feature', properties: { hectareas: 10 }, geometry: polygon });
      expect(out.problem).toBeNull();
      expect(out.geometry).toEqual({ type: 'MultiPolygon', coordinates: [[ring]] });
    });

    it('accepts a JSON string and a FeatureCollection with several polygons', () => {
      const fc = { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: polygon }, { type: 'Feature', geometry: polygon }] };
      expect(toLegacyGeometry(JSON.stringify(fc)).geometry?.coordinates).toHaveLength(2);
    });

    it('closes open rings, drops elevation and repeated vertices', () => {
      const open = [[-60, -34, 12], [-60, -34, 12], [-59.99, -34], [-59.99, -33.99], [-60, -33.99]];
      const out = toLegacyGeometry({ type: 'Polygon', coordinates: [open] });
      expect(out.geometry?.coordinates[0][0]).toEqual(ring);
      expect(out.repairs).toContain('se cerró un anillo abierto');
    });

    it('drops degenerate holes but keeps the shell', () => {
      const out = toLegacyGeometry({ type: 'Polygon', coordinates: [ring, [[-59.995, -33.995], [-59.994, -33.995]]] });
      expect(out.geometry?.coordinates[0]).toEqual([ring]);
      expect(out.repairs).toContain('se descartó un hueco degenerado');
    });

    it.each([
      [null, 'no tiene polígonos'],
      ['{nope', 'el GeoJSON no es JSON válido'],
      [{ type: 'Point', coordinates: [-60, -34] }, 'no tiene polígonos'],
      [{ type: 'Polygon', coordinates: [[[-60, -34], [-59, -34]]] }, 'todos los polígonos son degenerados'],
      [{ type: 'Polygon', coordinates: [[[-60, 'x'], [-59, -34], [-59, -33], [-60, 'x']]] }, 'hay coordenadas que no son números'],
    ])('rejects %j', (value, problem) => {
      const out = toLegacyGeometry(value);
      expect(out.geometry).toBeNull();
      expect(out.problem).toBe(problem);
    });

    it('rejects coordinates out of EPSG:4326 range (e.g. a projected CRS)', () => {
      const projected = [[5_400_000, 6_200_000], [5_401_000, 6_200_000], [5_401_000, 6_201_000], [5_400_000, 6_200_000]];
      expect(toLegacyGeometry({ type: 'Polygon', coordinates: [projected] }).problem).toMatch(/fuera de rango/);
    });

    it('imports outlines above the API vertex cap, flagged', () => {
      const big = Array.from({ length: 10_050 }, (_, i) => {
        const a = (2 * Math.PI * i) / 10_050;
        return [-60 + 0.01 * Math.cos(a), -34 + 0.01 * Math.sin(a)];
      });
      const out = toLegacyGeometry({ type: 'Polygon', coordinates: [big] });
      expect(out.geometry).not.toBeNull();
      expect(out.repairs.join()).toMatch(/más de 10000 vértices/);
    });
  });

  describe('legacyLots', () => {
    const lot = (id: string | undefined, uuid: string | undefined, nombre: string) => ({
      type: 'Feature',
      id,
      properties: { uuid, nombre },
      geometry: polygon,
    });

    it('keeps the legacy identifiers and drops repeated lots (id, else uuid, else name)', () => {
      const { lots, duplicates } = legacyLots([
        lot('a', 'ua', 'Lote 1'),
        lot('a', 'other', 'Lote 1 bis'),
        lot(undefined, 'ub', 'Lote 2'),
        lot(undefined, 'ub', 'Lote 2'),
        lot(undefined, undefined, 'Lote 3'),
        lot(undefined, undefined, 'Lote 3'),
        lot(undefined, 'uc', 'Lote 3'),
      ]);
      expect(lots.map((l) => [l.legacyId, l.legacyUuid, l.legacyName])).toEqual([
        ['a', 'ua', 'Lote 1'],
        [null, 'ub', 'Lote 2'],
        [null, null, 'Lote 3'],
        [null, 'uc', 'Lote 3'],
      ]);
      expect(duplicates).toHaveLength(3);
    });

    it('tolerates a missing or broken list', () => {
      expect(legacyLots(undefined).lots).toEqual([]);
      expect(legacyLots([null, 'x', 3]).lots).toEqual([]);
    });
  });

  it('fieldBranches: legacy lotes plus every lotBranches entry', () => {
    const branches = fieldBranches({ _id: 'campos_1', lotes: ['l'], lotBranches: { 'lot-branch:c1': ['x'], legacy: ['ignored'] } });
    expect([...branches.keys()]).toEqual([LEGACY_BRANCH_ID, 'lot-branch:c1']);
    expect(branches.get(LEGACY_BRANCH_ID)).toEqual(['l']);
  });

  it('planLayouts: Base + one per branch, named after the owning campaign', () => {
    const campaigns = [
      { _id: 'c2', name: '2025/26 (continúa)', lotBranchId: 'lot-branch:c1', lotBranchMode: 'shared' },
      { _id: 'c1', name: '2024/25', lotBranchId: 'lot-branch:c1', lotBranchMode: 'independent', lotBranchPromotedAt: '2025-06-01T00:00:00Z' },
      { _id: 'c3', name: 'Sin lotes', lotBranchId: 'lot-branch:c3', lotBranchMode: 'independent' },
      { _id: 'c4', name: 'Vieja' },
    ];
    expect(planLayouts(['lot-branch:c1', 'lot-branch:orphan'], campaigns)).toEqual([
      { legacyBranchId: 'legacy', name: 'Base', promotedAt: null },
      { legacyBranchId: 'lot-branch:c1', name: '2024/25', promotedAt: new Date('2025-06-01T00:00:00Z') },
      { legacyBranchId: 'lot-branch:c3', name: 'Sin lotes', promotedAt: null },
      { legacyBranchId: 'lot-branch:orphan', name: 'lot-branch:orphan', promotedAt: null },
    ]);
  });

  it('uniqueLotName: case-insensitive, numbered, "Lote N" when empty', () => {
    const taken = new Set<string>(['lote 1']);
    expect(uniqueLotName('LOTE 1', 1, taken)).toBe('LOTE 1 (2)');
    expect(uniqueLotName('', 1, taken)).toBe('Lote 1 (3)');
    expect(uniqueLotName('', 4, taken)).toBe('Lote 4');
    expect(uniqueLotName('Norte', 5, taken)).toBe('Norte');
  });
});
