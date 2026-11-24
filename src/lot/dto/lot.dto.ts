import { MultiPolygonGeometry } from '../../common/geo/geo.types';
import { RemovalResult } from '../../common/dto/removal-result.dto';

/**
 * Response shape for lots, built in LotRepository (raw SQL, PostGIS). `accountId` is the
 * layout's account. The legacy ids let the front match references that still live in
 * CouchDB (activities by `lote_uuid`, by id or by name) until those move too.
 */
export interface LotDto {
  id: string;
  accountId: string;
  fieldId: string;
  layoutId: string;
  name: string;
  hectares: number;
  declaredHectares: number | null;
  sourceLotId: string | null;
  archivedAt: Date | null;
  legacyId: string | null;
  legacyUuid: string | null;
  legacyName: string | null;
  createdAt: Date;
  updatedAt: Date;
  geometry: MultiPolygonGeometry;
}

/**
 * Result of a lot write. When the layout was locked the write landed on a copy:
 * `layoutId` is the copy (now used by the open campaigns), `forkedFromLayoutId` the original,
 * and `lot.id` is the id of the lot inside the copy.
 */
export interface LotMutationDto {
  layoutId: string;
  forkedFromLayoutId: string | null;
  lot: LotDto | null;
  removal: RemovalResult | null;
}
