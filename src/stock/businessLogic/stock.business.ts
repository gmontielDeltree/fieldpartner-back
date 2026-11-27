import { HttpStatus, Injectable } from '@nestjs/common';
import { InOutDirection, Prisma, StockItemType } from '@prisma/client';
import { randomUUID } from 'crypto';
import { BusinessErrorCode, BusinessException } from '../../common/exceptions/business.exception';
import { PrismaService } from '../../prisma/prisma.service';
import { LockedStock, MovementRecord, StockRepository } from '../stock.repository';
import { CommitCropDto, CropBalanceDto, DeliverCropDto } from '../dto/crop-balance.dto';
import {
  CreateStockMovementDto,
  CreateStockTransferDto,
  CreateStockTransformationDto,
} from '../dto/create-stock-movement.dto';
import { MovementInfoDto } from '../dto/stock-line.dto';
import { CreateStockReservationsDto } from '../dto/stock-reservation.dto';
import { StockOperationDto } from '../dto/stock.dto';
import {
  CropAmounts,
  StockKey,
  StockLineInput,
  applyReservation,
  applyStockChange,
  assertDifferentLocation,
  commitCrop,
  deliverCrop,
  stockKeyOf,
  stockKeyText,
  toDecimal,
} from './stock.rules';

type Tx = Prisma.TransactionClient;

/** A change on one balance row: what moves and the movement it leaves. */
interface PlannedChange {
  key: StockKey;
  direction: InOutDirection;
  amount: number;
  releaseReserved?: number;
  unitMeasurement?: string;
  dueDate?: string;
  fieldId?: string;
  lotId?: string;
}

const invalidReference = (label: string) =>
  new BusinessException(BusinessErrorCode.INVALID_REFERENCE, `${label} no existe en la cuenta`, HttpStatus.BAD_REQUEST);

/** The locked row of a key (lockAll locked every key of the operation). */
function lockedRow(locked: Map<string, LockedStock>, key: StockKey): LockedStock {
  const row = locked.get(stockKeyText(key));
  if (!row) throw new Error('stock: row not locked');
  return row;
}

const unique = <T>(values: (T | null | undefined)[]): T[] => [...new Set(values.filter((v): v is T => !!v))];

/**
 * Every change of stock (KAN-71) goes through here, in one transaction: the balance rows are
 * created if missing and locked (`FOR UPDATE`, always in the same order), the rules are applied
 * and the movements recorded. Nothing is retried or undone by hand: a rejected rule or a failed
 * write rolls the whole operation back.
 */
@Injectable()
export class StockBusiness {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stocks: StockRepository,
  ) {}

  /** One inflow or outflow. */
  move(accountId: string, userId: string | null, dto: CreateStockMovementDto): Promise<StockOperationDto> {
    const change: PlannedChange = {
      key: stockKeyOf(dto),
      direction: dto.direction,
      amount: dto.amount,
      releaseReserved: dto.releaseReserved,
      unitMeasurement: dto.unitMeasurement,
      dueDate: dto.dueDate,
      fieldId: dto.fieldId,
      lotId: dto.lotId,
    };
    return this.prisma.$transaction(async (tx) => {
      await this.assertOrigin(accountId, dto.fieldId, dto.lotId, tx);
      return this.apply(accountId, userId, [change], dto.info, null, tx);
    });
  }

  /** Both legs of a transfer: out of `from`, into `to`. */
  transfer(accountId: string, userId: string | null, dto: CreateStockTransferDto): Promise<StockOperationDto> {
    assertDifferentLocation(dto.from, dto.to);
    const item: Omit<StockLineInput, 'depositId' | 'location'> = {
      itemType: dto.itemType,
      inputId: dto.inputId,
      cropId: dto.cropId,
      campaignId: dto.campaignId,
      zafra: dto.zafra,
      nroLot: dto.nroLot,
    };
    const leg = (place: { depositId: string; location?: string }, direction: InOutDirection): PlannedChange => ({
      key: stockKeyOf({ ...item, ...place }),
      direction,
      amount: dto.amount,
      unitMeasurement: dto.unitMeasurement,
    });
    const changes = [leg(dto.from, InOutDirection.OUT), leg(dto.to, InOutDirection.IN)];
    return this.prisma.$transaction((tx) => this.apply(accountId, userId, changes, dto.info, randomUUID(), tx));
  }

  /** Consumes the origins and produces the destinations, all or nothing. */
  transform(accountId: string, userId: string | null, dto: CreateStockTransformationDto): Promise<StockOperationDto> {
    const changes: PlannedChange[] = [
      ...dto.origins.map((line) => ({ line, direction: InOutDirection.OUT })),
      ...dto.destinations.map((line) => ({ line, direction: InOutDirection.IN })),
    ].map(({ line, direction }) => ({
      key: stockKeyOf(line),
      direction,
      amount: line.amount,
      unitMeasurement: line.unitMeasurement,
    }));
    return this.prisma.$transaction((tx) => this.apply(accountId, userId, changes, dto.info, randomUUID(), tx));
  }

  /** Reserves (or releases) stock for withdrawal orders and planned activities. No movement. */
  reserve(accountId: string, dto: CreateStockReservationsDto): Promise<StockOperationDto> {
    const lines = dto.lines.map((line) => ({ key: stockKeyOf(line), delta: line.delta }));
    return this.prisma.$transaction(async (tx) => {
      await this.assertItems(accountId, lines.map((l) => l.key), tx);
      await this.depositRules(accountId, lines.map((l) => l.key), tx);
      const locked = await this.lockAll(accountId, lines.map((l) => l.key), tx);
      for (const line of lines) {
        const row = lockedRow(locked, line.key);
        row.reservedStock = applyReservation(row.reservedStock, toDecimal(line.delta));
      }
      for (const row of locked.values()) await this.stocks.updateStock(row.id, row, tx);
      const stocks = await this.stocks.findStocksByIds([...locked.values()].map((r) => r.id), tx);
      return { groupId: null, movements: [], stocks };
    });
  }

  /** Committed grain of sale contracts (KAN-73 will derive it from the contracts). */
  commitCrop(accountId: string, dto: CommitCropDto): Promise<CropBalanceDto> {
    return this.changeCropBalance(accountId, dto, (amounts) => commitCrop(amounts, toDecimal(dto.deltaKg)));
  }

  /** Delivered grain of deposit certificates: it also leaves the committed amount. */
  deliverCrop(accountId: string, dto: DeliverCropDto): Promise<CropBalanceDto> {
    return this.changeCropBalance(accountId, dto, (amounts) => deliverCrop(amounts, toDecimal(dto.kg)));
  }

  // ── internals ─────────────────────────────────────────────────────────────

  private async apply(
    accountId: string,
    userId: string | null,
    changes: PlannedChange[],
    info: MovementInfoDto,
    groupId: string | null,
    tx: Tx,
  ): Promise<StockOperationDto> {
    const keys = changes.map((c) => c.key);
    await this.assertItems(accountId, keys, tx);
    await this.assertMovementType(info.movementTypeId, tx);
    const allowNegative = await this.depositRules(accountId, keys, tx);
    const locked = await this.lockAll(accountId, keys, tx);

    const records: MovementRecord[] = [];
    for (const change of changes) {
      const row = lockedRow(locked, change.key);
      const amount = toDecimal(change.amount);
      const next = applyStockChange(row, {
        delta: change.direction === InOutDirection.IN ? amount : amount.negated(),
        releaseReserved: change.direction === InOutDirection.OUT && change.releaseReserved
          ? toDecimal(change.releaseReserved)
          : undefined,
        allowNegative: allowNegative.get(change.key.depositId) ?? false,
      });
      row.currentStock = next.currentStock;
      row.reservedStock = next.reservedStock;
      records.push({
        accountId,
        stockId: row.id,
        movementTypeId: info.movementTypeId,
        direction: change.direction,
        amount,
        operationDate: new Date(info.operationDate),
        dueDate: change.dueDate ? new Date(change.dueDate) : null,
        detail: info.detail ?? null,
        voucher: info.voucher ?? null,
        currency: info.currency ?? null,
        totalValue: info.totalValue ?? null,
        hours: info.hours ?? null,
        unitMeasurement: change.unitMeasurement ?? null,
        documentFile: info.documentFile ?? null,
        documentFileName: info.documentFileName ?? null,
        fieldId: change.fieldId ?? null,
        lotId: change.lotId ?? null,
        sourceType: info.sourceType ?? null,
        sourceId: info.sourceId ?? null,
        groupId,
        userId,
      });
    }

    for (const row of locked.values()) await this.stocks.updateStock(row.id, row, tx);
    const movementIds = await this.stocks.insertMovements(records, tx);
    const [movements, stocks] = await Promise.all([
      this.stocks.findMovementsByIds(movementIds, tx),
      this.stocks.findStocksByIds([...locked.values()].map((r) => r.id), tx),
    ]);
    return { groupId, movements, stocks };
  }

  /** Locks every distinct row in a fixed order, so two operations cannot deadlock. */
  private async lockAll(accountId: string, keys: StockKey[], tx: Tx): Promise<Map<string, LockedStock>> {
    const distinct = new Map(keys.map((key) => [stockKeyText(key), key]));
    const locked = new Map<string, LockedStock>();
    for (const text of [...distinct.keys()].sort()) {
      locked.set(text, await this.stocks.lockStock(accountId, distinct.get(text) as StockKey, tx));
    }
    return locked;
  }

  /** Each deposit of the operation, of the account, with its `isNegative`. */
  private async depositRules(accountId: string, keys: StockKey[], tx: Tx): Promise<Map<string, boolean>> {
    const ids = unique(keys.map((k) => k.depositId));
    const deposits = await this.stocks.depositsOf(accountId, ids, tx);
    if (deposits.length !== ids.length) throw invalidReference('El depósito indicado');
    return new Map(deposits.map((d) => [d.id, d.isNegative]));
  }

  /** Inputs, crops and campaigns of the lines belong to (or are usable by) the account. */
  private async assertItems(accountId: string, keys: StockKey[], tx: Tx): Promise<void> {
    const inputIds = unique(keys.filter((k) => k.itemType === StockItemType.SUPPLY).map((k) => k.inputId));
    const cropIds = unique(keys.filter((k) => k.itemType === StockItemType.CROP).map((k) => k.cropId));
    const campaignIds = unique(keys.map((k) => k.campaignId));
    const [inputs, crops, campaigns] = await Promise.all([
      inputIds.length ? this.stocks.inputsOf(accountId, inputIds, tx) : [],
      cropIds.length ? this.stocks.cropsIn(cropIds, tx) : [],
      campaignIds.length ? this.stocks.campaignsOf(accountId, campaignIds, tx) : [],
    ]);
    if (inputs.length !== inputIds.length) throw invalidReference('El insumo indicado');
    if (crops.length !== cropIds.length) throw invalidReference('El cultivo indicado');
    if (campaigns.length !== campaignIds.length) throw invalidReference('La campaña indicada');
  }

  private async assertMovementType(id: string, tx: Tx): Promise<void> {
    const found = await this.stocks.movementTypesIn([id], tx);
    if (!found.length) throw invalidReference('El tipo de movimiento indicado');
  }

  /** Field and lot a grain comes from: of the account, and the lot inside that field. */
  private async assertOrigin(accountId: string, fieldId: string | undefined, lotId: string | undefined, tx: Tx) {
    if (fieldId && !(await this.stocks.fieldOf(accountId, fieldId, tx))) throw invalidReference('El campo indicado');
    if (!lotId) return;
    const lot = await this.stocks.lotOf(accountId, lotId, tx);
    if (!lot) throw invalidReference('El lote indicado');
    if (fieldId && lot.fieldId !== fieldId) {
      throw new BusinessException(
        BusinessErrorCode.INVALID_REFERENCE,
        'El lote indicado no pertenece al campo',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private changeCropBalance(
    accountId: string,
    dto: { campaignId: string; zafra?: string; cropId: string },
    change: (amounts: CropAmounts) => CropAmounts,
  ): Promise<CropBalanceDto> {
    const key = { campaignId: dto.campaignId, zafra: (dto.zafra ?? '').trim(), cropId: dto.cropId };
    return this.prisma.$transaction(async (tx) => {
      const [campaigns, crops] = await Promise.all([
        this.stocks.campaignsOf(accountId, [key.campaignId], tx),
        this.stocks.cropsIn([key.cropId], tx),
      ]);
      if (!campaigns.length) throw invalidReference('La campaña indicada');
      if (!crops.length) throw invalidReference('El cultivo indicado');
      const { id, ...amounts } = await this.stocks.lockCropBalance(accountId, key, tx);
      const row = await this.stocks.updateCropBalance(id, change(amounts), tx);
      return { ...row, committedKg: row.committedKg.toNumber(), deliveredKg: row.deliveredKg.toNumber() };
    });
  }
}
