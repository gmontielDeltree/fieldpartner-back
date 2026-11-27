import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { Caller, RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ACCOUNT_DATA_ROLES } from '../auth/account-scope';
import { AccountScopeQueryDto } from '../common/dto/account-scope-query.dto';
import { StockService } from './stock.service';
import { CommitCropDto, DeliverCropDto } from './dto/crop-balance.dto';
import {
  CreateStockMovementDto,
  CreateStockTransferDto,
  CreateStockTransformationDto,
} from './dto/create-stock-movement.dto';
import { CreateStockReservationsDto } from './dto/stock-reservation.dto';
import { CropSummaryQueryDto, StockMovementQueryDto, StockQueryDto } from './dto/stock-query.dto';

type CallerRequest = Request & { caller: Caller };

// Per-account data (KAN-71): RolesGuard resolves req.caller; the service scopes every query to
// its account (a GENERAL_ADMIN names it with ?accountId=).

@Controller('stocks')
@UseGuards(RolesGuard)
@Roles(...ACCOUNT_DATA_ROLES)
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Get()
  findAll(@Query() query: StockQueryDto, @Req() req: CallerRequest) {
    return this.stockService.findStocks(req.caller, query);
  }

  /** Grain per campaign + zafra + crop (current, committed, delivered). */
  @Get('crop-summary')
  cropSummary(@Query() query: CropSummaryQueryDto, @Req() req: CallerRequest) {
    return this.stockService.cropSummary(req.caller, query);
  }

  /** Reserve or release stock (withdrawal orders, planned activities). */
  @Post('reservations')
  reserve(@Body() dto: CreateStockReservationsDto, @Query() query: AccountScopeQueryDto, @Req() req: CallerRequest) {
    return this.stockService.reserve(req.caller, dto, query.accountId);
  }
}

@Controller('stock-movements')
@UseGuards(RolesGuard)
@Roles(...ACCOUNT_DATA_ROLES)
export class StockMovementController {
  constructor(private readonly stockService: StockService) {}

  @Get()
  findAll(@Query() query: StockMovementQueryDto, @Req() req: CallerRequest) {
    return this.stockService.findMovements(req.caller, query);
  }

  @Post()
  create(@Body() dto: CreateStockMovementDto, @Query() query: AccountScopeQueryDto, @Req() req: CallerRequest) {
    return this.stockService.move(req.caller, dto, query.accountId);
  }

  @Post('transfer')
  transfer(@Body() dto: CreateStockTransferDto, @Query() query: AccountScopeQueryDto, @Req() req: CallerRequest) {
    return this.stockService.transfer(req.caller, dto, query.accountId);
  }

  @Post('transformation')
  transform(
    @Body() dto: CreateStockTransformationDto,
    @Query() query: AccountScopeQueryDto,
    @Req() req: CallerRequest,
  ) {
    return this.stockService.transform(req.caller, dto, query.accountId);
  }
}

@Controller('crop-balances')
@UseGuards(RolesGuard)
@Roles(...ACCOUNT_DATA_ROLES)
export class CropBalanceController {
  constructor(private readonly stockService: StockService) {}

  /** Sale contracts: commit (positive) or uncommit (negative) grain. */
  @Post('commit')
  commit(@Body() dto: CommitCropDto, @Query() query: AccountScopeQueryDto, @Req() req: CallerRequest) {
    return this.stockService.commitCrop(req.caller, dto, query.accountId);
  }

  /** Deposit certificates: delivered grain. */
  @Post('deliver')
  deliver(@Body() dto: DeliverCropDto, @Query() query: AccountScopeQueryDto, @Req() req: CallerRequest) {
    return this.stockService.deliverCrop(req.caller, dto, query.accountId);
  }
}
