import { HttpStatus } from '@nestjs/common';
import { Prisma, StockItemType } from '@prisma/client';
import { BusinessErrorCode, BusinessException } from '../../common/exceptions/business.exception';

/**
 * Stock rules (KAN-71) as pure functions: no database, so they are tested on their own.
 * Amounts are `Prisma.Decimal` (stocks and movements are `numeric(18,4)`): no float drift
 * that would leave a stock at -0.0000001 and reject the next outflow.
 */

export type Decimal = Prisma.Decimal;
const D = (value: Prisma.Decimal.Value) => new Prisma.Decimal(value);
const ZERO = D(0);

/** What a stock line says about the item and where it is. */
export interface StockLineInput {
  itemType: StockItemType;
  inputId?: string | null;
  cropId?: string | null;
  campaignId?: string | null;
  zafra?: string | null;
  depositId: string;
  location?: string | null;
  nroLot?: string | null;
}

/** The identity of a `stocks` row (`stocks_identity_key`): empty texts, never null. */
export interface StockKey {
  itemType: StockItemType;
  inputId: string | null;
  cropId: string | null;
  campaignId: string | null;
  zafra: string;
  depositId: string;
  location: string;
  nroLot: string;
}

const text = (value?: string | null) => (value ?? '').trim();
const ref = (value?: string | null) => text(value) || null;

/** Normalizes a line into its row identity; a line names its input or its crop, never both. */
export function stockKeyOf(line: StockLineInput): StockKey {
  const inputId = ref(line.inputId);
  const cropId = ref(line.cropId);
  const valid =
    line.itemType === StockItemType.SUPPLY ? !!inputId && !cropId : !!cropId && !inputId;
  if (!valid) {
    throw new BusinessException(
      BusinessErrorCode.INVALID_STOCK_ITEM,
      line.itemType === StockItemType.SUPPLY
        ? 'Un stock de insumo lleva el insumo (inputId) y no un cultivo'
        : 'Un stock de grano lleva el cultivo (cropId) y no un insumo',
      HttpStatus.BAD_REQUEST,
    );
  }
  return {
    itemType: line.itemType,
    inputId,
    cropId,
    campaignId: ref(line.campaignId),
    zafra: text(line.zafra),
    depositId: text(line.depositId),
    location: text(line.location),
    nroLot: text(line.nroLot),
  };
}

/** Stable text of a key: locks are taken in this order so two operations never deadlock. */
export const stockKeyText = (key: StockKey): string =>
  [key.itemType, key.inputId, key.cropId, key.campaignId, key.zafra, key.depositId, key.location, key.nroLot]
    .map((part) => part ?? '')
    .join('\u0000');

export interface Balance {
  currentStock: Decimal;
  reservedStock: Decimal;
}

export interface StockChange {
  /** Positive comes in, negative goes out. */
  delta: Decimal;
  /** Reservation released together with an outflow (never below zero). */
  releaseReserved?: Decimal;
  /** The deposit's `isNegative`: only then may an outflow leave the stock below zero. */
  allowNegative: boolean;
}

/** New balance after a movement, or INSUFFICIENT_STOCK. */
export function applyStockChange(balance: Balance, change: StockChange): Balance {
  const currentStock = balance.currentStock.plus(change.delta);
  if (change.delta.isNegative() && currentStock.isNegative() && !change.allowNegative) {
    throw new BusinessException(
      BusinessErrorCode.INSUFFICIENT_STOCK,
      'No hay stock suficiente y el depósito no admite stock negativo',
      HttpStatus.CONFLICT,
      { available: balance.currentStock.toNumber(), requested: change.delta.negated().toNumber() },
    );
  }
  const release = change.releaseReserved ?? ZERO;
  return { currentStock, reservedStock: Prisma.Decimal.max(ZERO, balance.reservedStock.minus(release)) };
}

/** Reserving adds, releasing subtracts; a reservation never goes below zero. */
export const applyReservation = (reserved: Decimal, delta: Decimal): Decimal =>
  Prisma.Decimal.max(ZERO, reserved.plus(delta));

export function assertDifferentLocation(
  from: { depositId: string; location?: string | null },
  to: { depositId: string; location?: string | null },
): void {
  if (text(from.depositId) === text(to.depositId) && text(from.location) === text(to.location)) {
    throw new BusinessException(
      BusinessErrorCode.SAME_LOCATION,
      'El origen y el destino de la transferencia son el mismo depósito y ubicación',
      HttpStatus.BAD_REQUEST,
    );
  }
}

export interface CropAmounts {
  committedKg: Decimal;
  deliveredKg: Decimal;
}

/** A sale contract adds to (or, edited or removed, subtracts from) the committed grain. */
export const commitCrop = (balance: CropAmounts, deltaKg: Decimal): CropAmounts => ({
  ...balance,
  committedKg: Prisma.Decimal.max(ZERO, balance.committedKg.plus(deltaKg)),
});

/** A deposit certificate delivers grain: delivered goes up, committed down (never below zero). */
export const deliverCrop = (balance: CropAmounts, kg: Decimal): CropAmounts => ({
  committedKg: Prisma.Decimal.max(ZERO, balance.committedKg.minus(kg)),
  deliveredKg: balance.deliveredKg.plus(kg),
});

export const toDecimal = D;
