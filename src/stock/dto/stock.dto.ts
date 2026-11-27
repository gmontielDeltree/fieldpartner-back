import { InOutDirection, Prisma, StockItemType } from '@prisma/client';

/**
 * Response shapes of the stock API (KAN-71). Amounts are `numeric` in the database; the API
 * returns them as numbers (`Prisma.Decimal` would serialize as a string).
 */

const num = (value: Prisma.Decimal | null): number | null => (value === null ? null : value.toNumber());

export const STOCK_SELECT = {
  id: true,
  accountId: true,
  itemType: true,
  inputId: true,
  cropId: true,
  campaignId: true,
  zafra: true,
  depositId: true,
  location: true,
  nroLot: true,
  currentStock: true,
  reservedStock: true,
  createdAt: true,
  updatedAt: true,
} as const;

type StockRow = Prisma.StockGetPayload<{ select: typeof STOCK_SELECT }>;

export interface StockDto {
  id: string;
  accountId: string;
  itemType: StockItemType;
  inputId: string | null;
  cropId: string | null;
  campaignId: string | null;
  zafra: string;
  depositId: string;
  location: string;
  nroLot: string;
  currentStock: number;
  reservedStock: number;
  createdAt: Date;
  updatedAt: Date;
}

export const toStockDto = (row: StockRow): StockDto => ({
  ...row,
  currentStock: row.currentStock.toNumber(),
  reservedStock: row.reservedStock.toNumber(),
});

export const STOCK_MOVEMENT_SELECT = {
  id: true,
  accountId: true,
  stockId: true,
  direction: true,
  amount: true,
  operationDate: true,
  dueDate: true,
  detail: true,
  voucher: true,
  currency: true,
  totalValue: true,
  hours: true,
  unitMeasurement: true,
  documentFile: true,
  documentFileName: true,
  fieldId: true,
  lotId: true,
  sourceType: true,
  sourceId: true,
  groupId: true,
  userId: true,
  createdAt: true,
  movementType: { select: { id: true, name: true, conceptES: true, conceptPT: true, conceptEN: true } },
  stock: {
    select: {
      itemType: true,
      inputId: true,
      cropId: true,
      campaignId: true,
      zafra: true,
      depositId: true,
      location: true,
      nroLot: true,
    },
  },
} as const;

type StockMovementRow = Prisma.StockMovementGetPayload<{ select: typeof STOCK_MOVEMENT_SELECT }>;

export interface StockMovementDto extends Omit<StockMovementRow, 'amount' | 'totalValue' | 'stock'> {
  amount: number;
  totalValue: number | null;
  /** Where the movement happened (from its stock row), flattened. */
  itemType: StockItemType;
  inputId: string | null;
  cropId: string | null;
  campaignId: string | null;
  zafra: string;
  depositId: string;
  location: string;
  nroLot: string;
  direction: InOutDirection;
}

export const toStockMovementDto = ({ stock, ...row }: StockMovementRow): StockMovementDto => ({
  ...row,
  ...stock,
  amount: row.amount.toNumber(),
  totalValue: num(row.totalValue),
});

/** Movements written by one operation and the balances they left. */
export interface StockOperationDto {
  groupId: string | null;
  movements: StockMovementDto[];
  stocks: StockDto[];
}

/**
 * Grain per campaign + zafra + crop: `currentStock` is the sum of its deposits (CROP rows of
 * `stocks`), committed and delivered come from `crop_balances`.
 */
export interface CropSummaryDto {
  campaignId: string | null;
  zafra: string;
  cropId: string;
  currentStock: number;
  committedStock: number;
  deliveredStock: number;
}
