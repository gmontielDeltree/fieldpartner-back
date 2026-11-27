import { Injectable } from '@nestjs/common';
import { InOutDirection, Prisma, StockItemType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CropAmounts, Decimal, StockKey } from './businessLogic/stock.rules';
import {
  STOCK_MOVEMENT_SELECT,
  STOCK_SELECT,
  StockDto,
  StockMovementDto,
  toStockDto,
  toStockMovementDto,
} from './dto/stock.dto';
import { CropSummaryQueryDto, StockMovementQueryDto, StockQueryDto } from './dto/stock-query.dto';

type Db = Prisma.TransactionClient | PrismaService;

export interface LockedStock {
  id: string;
  currentStock: Decimal;
  reservedStock: Decimal;
}

export interface MovementRecord {
  accountId: string;
  stockId: string;
  movementTypeId: string;
  direction: InOutDirection;
  amount: Decimal;
  operationDate: Date;
  dueDate?: Date | null;
  detail?: string | null;
  voucher?: string | null;
  currency?: Prisma.StockMovementCreateManyInput['currency'];
  totalValue?: number | null;
  hours?: string | null;
  unitMeasurement?: string | null;
  documentFile?: string | null;
  documentFileName?: string | null;
  fieldId?: string | null;
  lotId?: string | null;
  sourceType?: string | null;
  sourceId?: string | null;
  groupId?: string | null;
  userId?: string | null;
}

const DEFAULT_MOVEMENT_LIMIT = 1000;

/** Filters on the identity columns of `stocks` (only the ones that come). */
function stockWhere(filter: Omit<StockQueryDto, 'accountId'>): Prisma.StockWhereInput {
  return {
    ...(filter.itemType && { itemType: filter.itemType }),
    ...(filter.inputId && { inputId: filter.inputId }),
    ...(filter.cropId && { cropId: filter.cropId }),
    ...(filter.campaignId && { campaignId: filter.campaignId }),
    ...(filter.zafra !== undefined && { zafra: filter.zafra.trim() }),
    ...(filter.depositId && { depositId: filter.depositId }),
    ...(filter.location !== undefined && { location: filter.location.trim() }),
    ...(filter.nroLot !== undefined && { nroLot: filter.nroLot.trim() }),
  };
}

@Injectable()
export class StockRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ── Reads ─────────────────────────────────────────────────────────────────

  async findStocks(accountId: string, filter: Omit<StockQueryDto, 'accountId'>): Promise<StockDto[]> {
    const rows = await this.prisma.stock.findMany({
      where: { accountId, ...stockWhere(filter) },
      select: STOCK_SELECT,
      orderBy: [{ depositId: 'asc' }, { location: 'asc' }, { nroLot: 'asc' }],
    });
    return rows.map(toStockDto);
  }

  async findStocksByIds(ids: string[], db: Db = this.prisma): Promise<StockDto[]> {
    const rows = await db.stock.findMany({ where: { id: { in: ids } }, select: STOCK_SELECT });
    return rows.map(toStockDto);
  }

  async findMovements(accountId: string, filter: Omit<StockMovementQueryDto, 'accountId'>): Promise<StockMovementDto[]> {
    const { stockId, sourceType, sourceId, groupId, from, to, limit, ...item } = filter;
    const rows = await this.prisma.stockMovement.findMany({
      where: {
        accountId,
        ...(stockId && { stockId }),
        ...(sourceType && { sourceType }),
        ...(sourceId && { sourceId }),
        ...(groupId && { groupId }),
        ...((from || to) && {
          operationDate: { ...(from && { gte: new Date(from) }), ...(to && { lte: new Date(to) }) },
        }),
        stock: stockWhere(item),
      },
      select: STOCK_MOVEMENT_SELECT,
      orderBy: [{ operationDate: 'desc' }, { createdAt: 'desc' }],
      take: limit ?? DEFAULT_MOVEMENT_LIMIT,
    });
    return rows.map(toStockMovementDto);
  }

  async findMovementsByIds(ids: string[], db: Db = this.prisma): Promise<StockMovementDto[]> {
    const rows = await db.stockMovement.findMany({
      where: { id: { in: ids } },
      select: STOCK_MOVEMENT_SELECT,
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toStockMovementDto);
  }

  /** Grain stock per campaign + zafra + crop: the sum of its CROP rows. */
  cropStockTotals(accountId: string, filter: Omit<CropSummaryQueryDto, 'accountId'>) {
    return this.prisma.stock.groupBy({
      by: ['campaignId', 'zafra', 'cropId'],
      where: {
        accountId,
        itemType: StockItemType.CROP,
        ...(filter.campaignId && { campaignId: filter.campaignId }),
        ...(filter.cropId && { cropId: filter.cropId }),
        ...(filter.zafra !== undefined && { zafra: filter.zafra.trim() }),
      },
      _sum: { currentStock: true },
    });
  }

  cropBalances(accountId: string, filter: Omit<CropSummaryQueryDto, 'accountId'>) {
    return this.prisma.cropBalance.findMany({
      where: {
        accountId,
        ...(filter.campaignId && { campaignId: filter.campaignId }),
        ...(filter.cropId && { cropId: filter.cropId }),
        ...(filter.zafra !== undefined && { zafra: filter.zafra.trim() }),
      },
      select: { campaignId: true, zafra: true, cropId: true, committedKg: true, deliveredKg: true },
    });
  }

  // ── Writes (always inside the business transaction) ───────────────────────

  /**
   * Makes sure the balance row exists and locks it (`FOR UPDATE`) until the transaction ends.
   * The insert is a no-op when the row exists (`stocks_identity_key`, NULLS NOT DISTINCT), so
   * two first movements on the same item never create two rows.
   */
  async lockStock(accountId: string, key: StockKey, db: Db): Promise<LockedStock> {
    await db.$executeRaw`
      INSERT INTO stocks (id, "accountId", "itemType", "inputId", "cropId", "campaignId", zafra,
                          "depositId", location, "nroLot", "updatedAt")
      VALUES (gen_random_uuid()::text, ${accountId}, ${key.itemType}::"StockItemType", ${key.inputId},
              ${key.cropId}, ${key.campaignId}, ${key.zafra}, ${key.depositId}, ${key.location},
              ${key.nroLot}, NOW())
      ON CONFLICT ("accountId", "itemType", "inputId", "cropId", "campaignId", zafra, "depositId",
                   location, "nroLot")
      DO NOTHING`;
    const [row] = await db.$queryRaw<LockedStock[]>`
      SELECT id, "currentStock", "reservedStock"
      FROM stocks
      WHERE "accountId" = ${accountId}
        AND "itemType" = ${key.itemType}::"StockItemType"
        AND "inputId" IS NOT DISTINCT FROM ${key.inputId}
        AND "cropId" IS NOT DISTINCT FROM ${key.cropId}
        AND "campaignId" IS NOT DISTINCT FROM ${key.campaignId}
        AND zafra = ${key.zafra}
        AND "depositId" = ${key.depositId}
        AND location = ${key.location}
        AND "nroLot" = ${key.nroLot}
      FOR UPDATE`;
    return {
      id: row.id,
      currentStock: new Prisma.Decimal(row.currentStock),
      reservedStock: new Prisma.Decimal(row.reservedStock),
    };
  }

  async updateStock(id: string, balance: { currentStock: Decimal; reservedStock: Decimal }, db: Db): Promise<void> {
    await db.stock.update({ where: { id }, data: balance, select: { id: true } });
  }

  async insertMovements(records: MovementRecord[], db: Db): Promise<string[]> {
    const created = await db.stockMovement.createManyAndReturn({ data: records, select: { id: true } });
    return created.map((row) => row.id);
  }

  /** Same idea as `lockStock` for the committed / delivered grain of a crop. */
  async lockCropBalance(
    accountId: string,
    key: { campaignId: string; zafra: string; cropId: string },
    db: Db,
  ): Promise<CropAmounts & { id: string }> {
    await db.$executeRaw`
      INSERT INTO crop_balances (id, "accountId", "campaignId", zafra, "cropId", "updatedAt")
      VALUES (gen_random_uuid()::text, ${accountId}, ${key.campaignId}, ${key.zafra}, ${key.cropId}, NOW())
      ON CONFLICT ("accountId", "campaignId", zafra, "cropId") DO NOTHING`;
    const [row] = await db.$queryRaw<{ id: string; committedKg: Decimal; deliveredKg: Decimal }[]>`
      SELECT id, "committedKg", "deliveredKg"
      FROM crop_balances
      WHERE "accountId" = ${accountId} AND "campaignId" = ${key.campaignId}
        AND zafra = ${key.zafra} AND "cropId" = ${key.cropId}
      FOR UPDATE`;
    return {
      id: row.id,
      committedKg: new Prisma.Decimal(row.committedKg),
      deliveredKg: new Prisma.Decimal(row.deliveredKg),
    };
  }

  async updateCropBalance(id: string, amounts: CropAmounts, db: Db) {
    return db.cropBalance.update({
      where: { id },
      data: amounts,
      select: { campaignId: true, zafra: true, cropId: true, committedKg: true, deliveredKg: true },
    });
  }

  // ── References (validated against the caller's account) ───────────────────

  /** Deposits of the account and whether each one allows negative stock. */
  depositsOf(accountId: string, ids: string[], db: Db) {
    return db.deposit.findMany({ where: { accountId, id: { in: ids } }, select: { id: true, isNegative: true } });
  }

  /** Inputs the account may use: its own and the platform ones (`accountId` null). */
  inputsOf(accountId: string, ids: string[], db: Db) {
    return db.input.findMany({
      where: { id: { in: ids }, OR: [{ accountId }, { accountId: null }] },
      select: { id: true },
    });
  }

  cropsIn(ids: string[], db: Db) {
    return db.crop.findMany({ where: { id: { in: ids } }, select: { id: true } });
  }

  campaignsOf(accountId: string, ids: string[], db: Db) {
    return db.campaign.findMany({ where: { accountId, id: { in: ids } }, select: { id: true } });
  }

  movementTypesIn(ids: string[], db: Db) {
    return db.movementType.findMany({ where: { id: { in: ids } }, select: { id: true } });
  }

  fieldOf(accountId: string, id: string, db: Db) {
    return db.field.findFirst({ where: { id, accountId }, select: { id: true } });
  }

  lotOf(accountId: string, id: string, db: Db) {
    return db.lot.findFirst({ where: { id, layout: { accountId } }, select: { id: true, fieldId: true } });
  }
}
