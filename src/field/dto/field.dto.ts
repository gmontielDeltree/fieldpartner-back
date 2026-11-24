import { MultiPolygonGeometry } from '../../common/geo/geo.types';

/**
 * Response shape for fields. Built by hand in FieldRepository (raw SQL: the Prisma client
 * cannot read PostGIS columns). `geometry` is GeoJSON with 7 decimals; `hectares` is the
 * geodesic area computed by the database; `declaredHectares` is the cadastral area, if any.
 */
export interface FieldDto {
  id: string;
  accountId: string;
  countryId: string | null;
  name: string;
  hectares: number;
  declaredHectares: number | null;
  archivedAt: Date | null;
  legacyId: string | null;
  legacyUuid: string | null;
  createdAt: Date;
  updatedAt: Date;
  geometry: MultiPolygonGeometry;
}
