import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * `?accountId=` for per-account endpoints. Only a GENERAL_ADMIN uses it to pick an
 * account; for anyone else it is optional and must match their own account.
 */
export class AccountScopeQueryDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  accountId?: string;
}
