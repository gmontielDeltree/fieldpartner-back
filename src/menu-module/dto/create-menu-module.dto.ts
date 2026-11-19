import { MenuType } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateMenuModuleDto {
  /**
   * Admin-chosen, stable numeric id: user permissions and the frontend sidebar reference it.
   * Immutable after creation (not part of the update DTO).
   */
  @IsInt()
  @Min(1)
  id: number;

  @IsUUID()
  moduleId: string;

  @IsOptional()
  @IsUUID()
  systemId?: string | null;

  /** Container menu (SIDEBAR, same module). null/omitted = top level. */
  @IsOptional()
  @IsInt()
  @Min(1)
  parentId?: number | null;

  /** null/omitted = permission-only option, not shown in any menu. */
  @IsOptional()
  @IsEnum(MenuType)
  menuType?: MenuType | null;

  /** module.position, e.g. 6.03. */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  order?: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  labelEs: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  labelEn?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  labelPt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  details?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  icon?: string;

  /** Empty = submenu container. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  route?: string;

  @IsOptional()
  @IsBoolean()
  full?: boolean;

  @IsOptional()
  @IsBoolean()
  light?: boolean;
}
