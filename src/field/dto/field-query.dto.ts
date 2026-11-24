import { IsIn, IsOptional } from 'class-validator';
import { AccountScopeQueryDto } from '../../common/dto/account-scope-query.dto';

export class FieldQueryDto extends AccountScopeQueryDto {
  /** `true` also lists archived fields. */
  @IsOptional()
  @IsIn(['true', 'false'])
  includeArchived?: 'true' | 'false';
}
