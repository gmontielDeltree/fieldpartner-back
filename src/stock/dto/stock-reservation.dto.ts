import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsNumber, NotEquals, ValidateNested } from 'class-validator';
import { AMOUNT, StockLineDto } from './stock-line.dto';

export class ReservationLineDto extends StockLineDto {
  /** Positive reserves, negative releases (a reservation never goes below zero). */
  @Type(() => Number)
  @IsNumber(AMOUNT)
  @NotEquals(0)
  delta: number;
}

/** Reservations of a withdrawal order or a planned activity: every line in one transaction. */
export class CreateStockReservationsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => ReservationLineDto)
  lines: ReservationLineDto[];
}
