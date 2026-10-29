import { IsInt, IsOptional } from 'class-validator';

export class UpdateCountersDto {
  @IsOptional() @IsInt()
  fields?: number; // positive = increment, negative = decrement

  @IsOptional() @IsInt()
  hectares?: number;

  @IsOptional() @IsInt()
  licences?: number;
}
