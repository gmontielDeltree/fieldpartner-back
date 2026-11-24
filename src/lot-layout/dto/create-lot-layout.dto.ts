import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * The account comes from the caller (or `?accountId=` for a GENERAL_ADMIN), never the body.
 * Without `sourceLayoutId` the layout starts empty ("independent" campaign); with it, the
 * non-archived lots of that layout (same account) are copied, each one keeping `sourceLotId`.
 */
export class CreateLotLayoutDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  sourceLayoutId?: string;
}
