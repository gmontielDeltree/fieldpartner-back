import { Injectable } from '@nestjs/common';
import { Caller } from '../auth/roles.guard';
import { resolveTargetAccount } from '../auth/account-scope';
import { StockBusiness } from './businessLogic/stock.business';
import { StockRepository } from './stock.repository';
import { CommitCropDto, CropBalanceDto, DeliverCropDto } from './dto/crop-balance.dto';
import {
  CreateStockMovementDto,
  CreateStockTransferDto,
  CreateStockTransformationDto,
} from './dto/create-stock-movement.dto';
import { CreateStockReservationsDto } from './dto/stock-reservation.dto';
import { CropSummaryQueryDto, StockMovementQueryDto, StockQueryDto } from './dto/stock-query.dto';
import { CropSummaryDto, StockDto, StockMovementDto, StockOperationDto } from './dto/stock.dto';

/** Facade: resolves the caller's account and delegates reads to the repository, writes to the business. */
@Injectable()
export class StockService {
  constructor(
    private readonly stocks: StockRepository,
    private readonly business: StockBusiness,
  ) {}

  findStocks(caller: Caller, { accountId, ...filter }: StockQueryDto): Promise<StockDto[]> {
    return this.stocks.findStocks(resolveTargetAccount(caller, accountId), filter);
  }

  findMovements(caller: Caller, { accountId, ...filter }: StockMovementQueryDto): Promise<StockMovementDto[]> {
    return this.stocks.findMovements(resolveTargetAccount(caller, accountId), filter);
  }

  /** Grain per campaign + zafra + crop: deposits summed, plus committed and delivered. */
  async cropSummary(caller: Caller, { accountId, ...filter }: CropSummaryQueryDto): Promise<CropSummaryDto[]> {
    const account = resolveTargetAccount(caller, accountId);
    const [totals, balances] = await Promise.all([
      this.stocks.cropStockTotals(account, filter),
      this.stocks.cropBalances(account, filter),
    ]);
    const summary = new Map<string, CropSummaryDto>();
    const entry = (campaignId: string | null, zafra: string, cropId: string) => {
      const key = [campaignId ?? '', zafra, cropId].join('\u0000');
      let row = summary.get(key);
      if (!row) {
        row = { campaignId, zafra, cropId, currentStock: 0, committedStock: 0, deliveredStock: 0 };
        summary.set(key, row);
      }
      return row;
    };
    for (const total of totals) {
      if (!total.cropId) continue;
      entry(total.campaignId, total.zafra, total.cropId).currentStock = total._sum.currentStock?.toNumber() ?? 0;
    }
    for (const balance of balances) {
      const row = entry(balance.campaignId, balance.zafra, balance.cropId);
      row.committedStock = balance.committedKg.toNumber();
      row.deliveredStock = balance.deliveredKg.toNumber();
    }
    return [...summary.values()];
  }

  move(caller: Caller, dto: CreateStockMovementDto, accountId?: string): Promise<StockOperationDto> {
    return this.business.move(resolveTargetAccount(caller, accountId), caller.id ?? null, dto);
  }

  transfer(caller: Caller, dto: CreateStockTransferDto, accountId?: string): Promise<StockOperationDto> {
    return this.business.transfer(resolveTargetAccount(caller, accountId), caller.id ?? null, dto);
  }

  transform(caller: Caller, dto: CreateStockTransformationDto, accountId?: string): Promise<StockOperationDto> {
    return this.business.transform(resolveTargetAccount(caller, accountId), caller.id ?? null, dto);
  }

  reserve(caller: Caller, dto: CreateStockReservationsDto, accountId?: string): Promise<StockOperationDto> {
    return this.business.reserve(resolveTargetAccount(caller, accountId), dto);
  }

  commitCrop(caller: Caller, dto: CommitCropDto, accountId?: string): Promise<CropBalanceDto> {
    return this.business.commitCrop(resolveTargetAccount(caller, accountId), dto);
  }

  deliverCrop(caller: Caller, dto: DeliverCropDto, accountId?: string): Promise<CropBalanceDto> {
    return this.business.deliverCrop(resolveTargetAccount(caller, accountId), dto);
  }
}
