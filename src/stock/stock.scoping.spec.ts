import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { InOutDirection, StockItemType, UserRole } from '@prisma/client';
import { Reflector } from '@nestjs/core';
import { Caller } from '../auth/roles.guard';
import { ROLES_KEY } from '../auth/roles.decorator';
import { ACCOUNT_DATA_ROLES } from '../auth/account-scope';
import { CropBalanceController, StockController, StockMovementController } from './stock.controller';
import { StockService } from './stock.service';

const generalAdmin: Caller = { id: 'u0', role: UserRole.GENERAL_ADMIN, accountId: null };
const admin: Caller = { id: 'u1', role: UserRole.ADMIN, accountId: 'acc-1' };
const user: Caller = { id: 'u2', role: UserRole.USER, accountId: 'acc-1' };
const movement = {
  itemType: StockItemType.SUPPLY,
  inputId: 'in-1',
  depositId: 'd1',
  direction: InOutDirection.IN,
  amount: 1,
  info: { movementTypeId: 'mvt-buy', operationDate: '2026-11-27' },
};

describe('Stock (account scoping)', () => {
  let repo: Record<string, jest.Mock>;
  let business: Record<string, jest.Mock>;
  let service: StockService;

  beforeEach(() => {
    repo = {
      findStocks: jest.fn().mockResolvedValue([]),
      findMovements: jest.fn().mockResolvedValue([]),
      cropStockTotals: jest.fn().mockResolvedValue([]),
      cropBalances: jest.fn().mockResolvedValue([]),
    };
    business = { move: jest.fn(), transfer: jest.fn(), transform: jest.fn(), reserve: jest.fn(), commitCrop: jest.fn(), deliverCrop: jest.fn() };
    service = new StockService(repo as any, business as any);
  });

  it('every controller requires a role of per-account data', () => {
    const reflector = new Reflector();
    for (const controller of [StockController, StockMovementController, CropBalanceController]) {
      expect(reflector.get(ROLES_KEY, controller)).toEqual(ACCOUNT_DATA_ROLES);
    }
  });

  it('lists only the caller account; another account is 403', async () => {
    await service.findStocks(user, {});
    expect(repo.findStocks).toHaveBeenCalledWith('acc-1', {});
    expect(() => service.findMovements(admin, { accountId: 'acc-2' })).toThrow(ForbiddenException);
    await expect(service.cropSummary(admin, { accountId: 'acc-2' })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('writes in the caller account with the caller as author; GENERAL_ADMIN must name the account', async () => {
    await service.move(user, movement);
    expect(business.move).toHaveBeenCalledWith('acc-1', 'u2', movement);
    expect(() => service.move(generalAdmin, movement)).toThrow(BadRequestException);
    await service.move(generalAdmin, movement, 'acc-9');
    expect(business.move).toHaveBeenLastCalledWith('acc-9', 'u0', movement);
    expect(() => service.reserve(admin, { lines: [] }, 'acc-2')).toThrow(ForbiddenException);
    expect(() => service.commitCrop(admin, { campaignId: 'c', cropId: 'x', deltaKg: 1 }, 'acc-2')).toThrow(
      ForbiddenException,
    );
  });

  it('crop summary joins the deposit totals with committed and delivered', async () => {
    const { Prisma } = jest.requireActual('@prisma/client');
    repo.cropStockTotals.mockResolvedValue([
      { campaignId: 'c1', zafra: '', cropId: 'soja', _sum: { currentStock: new Prisma.Decimal(120) } },
    ]);
    repo.cropBalances.mockResolvedValue([
      { campaignId: 'c1', zafra: '', cropId: 'soja', committedKg: new Prisma.Decimal(50), deliveredKg: new Prisma.Decimal(10) },
      { campaignId: 'c1', zafra: 'fina', cropId: 'trigo', committedKg: new Prisma.Decimal(5), deliveredKg: new Prisma.Decimal(0) },
    ]);
    expect(await service.cropSummary(user, {})).toEqual([
      { campaignId: 'c1', zafra: '', cropId: 'soja', currentStock: 120, committedStock: 50, deliveredStock: 10 },
      { campaignId: 'c1', zafra: 'fina', cropId: 'trigo', currentStock: 0, committedStock: 5, deliveredStock: 0 },
    ]);
  });
});
