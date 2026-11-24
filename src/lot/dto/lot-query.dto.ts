import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class LotQueryDto {
  @IsString()
  @IsNotEmpty()
  layoutId: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  fieldId?: string;

  /** `true` also lists archived lots. */
  @IsOptional()
  @IsIn(['true', 'false'])
  includeArchived?: 'true' | 'false';
}

/**
 * Open campaign the edit comes from. Required to edit a locked layout (the write then lands
 * on a copy shared by the open campaigns); ignored when the layout is open.
 */
export class LotWriteQueryDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  campaignId?: string;
}
