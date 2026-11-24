import { IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';
import { PolygonalGeometry } from '../../common/geo/geo.types';
import { IsPolygonalGeometry } from '../../common/geo/polygonal-geometry.validator';

/**
 * The account comes from the caller (or `?accountId=` for a GENERAL_ADMIN), never the body.
 * `geometry` is a GeoJSON Polygon or MultiPolygon in EPSG:4326 (holes allowed); hectares are
 * computed by the database, never sent.
 */
export class CreateFieldDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  countryId?: string;

  @IsPolygonalGeometry()
  geometry: PolygonalGeometry;

  /** Cadastral area typed by hand; `null` on update clears it. */
  @IsOptional()
  @IsNumber()
  @IsPositive()
  declaredHectares?: number | null;
}
