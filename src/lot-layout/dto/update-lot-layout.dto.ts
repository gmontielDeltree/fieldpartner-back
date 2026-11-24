import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/** Only the name changes; lots are edited through /lots and the source is immutable. */
export class UpdateLotLayoutDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;
}
