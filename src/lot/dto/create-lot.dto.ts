import { IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';
import { PolygonalGeometry } from '../../common/geo/geo.types';
import { IsPolygonalGeometry } from '../../common/geo/polygonal-geometry.validator';

/**
 * The account is the layout's; the field must belong to it too. The geometry must fall
 * inside the field (a sliver of up to 1 % outside is clipped) and must not overlap another
 * lot of the layout by more than 1 % of the smaller one.
 */
export class CreateLotDto {
  @IsString()
  @IsNotEmpty()
  layoutId: string;

  @IsString()
  @IsNotEmpty()
  fieldId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @IsPolygonalGeometry()
  geometry: PolygonalGeometry;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  declaredHectares?: number | null;
}
