import { MenuType } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
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

  @IsEnum(MenuType)
  menuType: MenuType;

  @IsOptional()
  @IsInt()
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
