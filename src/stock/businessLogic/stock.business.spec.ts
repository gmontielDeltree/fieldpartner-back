import { InOutDirection, Prisma, StockItemType } from '@prisma/client';
import { StockBusiness } from './stock.business';

const D = (n: number) => new Prisma.Decimal(n);
const info = { movementTypeId: 'mvt-buy', operationDate: '2026-11-27T10:00:00.000Z' };
const supplyLine = { itemType: StockItemType.SUPPLY, inputId: 'in-1', depositId: 'd1', location: 'A' };

const codeOf = (promise: Promise<unknown>) =>
  promise.then(
    () => 'no error',
    (e) => e.getResponse().code,
  );

describe('StockBusiness', () => {
  let repo: Record<string, jest.Mock>;
  let business: StockBusiness;
  let rows: Map<string, { id: string; currentStock: Prisma.Decimal; reservedStock: Prisma.Decimal }>;
  let lockOrder: string[];
  const tx = { tx: true };

  beforeEach(() => {
    rows = new Map();
    lockOrder = [];
    repo = {
      inputsOf: jest.fn(async (_acc, ids: string[]) => ids.map((id) => ({ id }))),
      cropsIn: jest.fn(async (ids: string[]) => ids.map((id) => ({ id }))),
      campaignsOf: jest.fn(async (_acc, ids: string[]) => ids.map((id) => ({ id }))),
      movementTypesIn: jest.fn(async (ids: string[]) => ids.map((id) => ({ id }))),
      depositsOf: jest.fn(async (_acc, ids: string[]) => ids.map((id) => ({ id, isNegative: id === 'neg' }))),
      fieldOf: jest.fn().mockResolvedValue({ id: 'f1' }),
      lotOf: jest.fn().mockResolvedValue({ id: 'l1', fieldId: 'f1' }),
      lockStock: jest.fn(async (_acc, key) => {
        const id = `${key.depositId}/${key.location}`;
        lockOrder.push(id);
        if (!rows.has(id)) rows.set(id, { id, currentStock: D(0), reservedStock: D(0) });
        return { ...(rows.get(id) as object) };
      }),
      updateStock: jest.fn(async (id, balance) => rows.set(id, { id, ...balance })),
      insertMovements: jest.fn(async (records: unknown[]) => records.map((_, i) => `m${i}`)),
      findMovementsByIds: jest.fn().mockResolvedValue([]),
      findStocksByIds: jest.fn().mockResolvedValue([]),
      lockCropBalance: jest.fn().mockResolvedValue({ id: 'cb1', committedKg: D(100), deliveredKg: D(0) }),
      updateCropBalance: jest.fn(async (_id, amounts) => ({ campaignId: 'c1', zafra: '', cropId: 'soja', ...amounts })),
    };
    const prisma = { $transaction: jest.fn((fn) => fn(tx)) };
    business = new StockBusiness(prisma as any, repo as any);
  });

  const movementRecords = () => repo.insertMovements.mock.calls[0][0];

  it('an inflow creates the balance and records the movement in the same transaction', async () => {
    await business.move('acc-1', 'u1', { ...supplyLine, direction: InOutDirection.IN, amount: 10, info });
    expect(repo.lockStock).toHaveBeenCalledWith('acc-1', expect.objectContaining({ inputId: 'in-1', depositId: 'd1' }), tx);
    expect(rows.get('d1/A')?.currentStock.toNumber()).toBe(10);
    expect(movementRecords()).toEqual([
      expect.objectContaining({ accountId: 'acc-1', stockId: 'd1/A', direction: 'IN', userId: 'u1', groupId: null }),
    ]);
  });

  it('rejects an outflow larger than the stock when the deposit does not allow negative', async () => {
    rows.set('d1/A', { id: 'd1/A', currentStock: D(3), reservedStock: D(0) });
    const code = await codeOf(business.move('acc-1', 'u1', { ...supplyLine, direction: InOutDirection.OUT, amount: 5, info }));
    expect(code).toBe('INSUFFICIENT_STOCK');
    expect(repo.insertMovements).not.toHaveBeenCalled();
  });

  it('a deposit with isNegative accepts it', async () => {
    await business.move('acc-1', 'u1', { ...supplyLine, depositId: 'neg', direction: InOutDirection.OUT, amount: 5, info });
    expect(rows.get('neg/A')?.currentStock.toNumber()).toBe(-5);
  });

  it('an outflow of a labor or withdrawal releases its reservation', async () => {
    rows.set('d1/A', { id: 'd1/A', currentStock: D(10), reservedStock: D(6) });
    await business.move('acc-1', 'u1', { ...supplyLine, direction: InOutDirection.OUT, amount: 4, releaseReserved: 4, info });
    expect(rows.get('d1/A')).toEqual({ id: 'd1/A', currentStock: D(6), reservedStock: D(2) });
  });

  it.each([
    ['inputsOf', 'El insumo indicado'],
    ['depositsOf', 'El depósito indicado'],
    ['movementTypesIn', 'El tipo de movimiento indicado'],
  ])('rejects a reference outside the account (%s)', async (method, label) => {
    repo[method].mockResolvedValue([]);
    const error = await business
      .move('acc-1', 'u1', { ...supplyLine, direction: InOutDirection.IN, amount: 1, info })
      .catch((e) => e.getResponse());
    expect(error).toEqual(expect.objectContaining({ code: 'INVALID_REFERENCE', message: `${label} no existe en la cuenta` }));
    expect(repo.lockStock).not.toHaveBeenCalled();
  });

  it('the origin lot of a harvest must be inside its field', async () => {
    repo.lotOf.mockResolvedValue({ id: 'l1', fieldId: 'other' });
    const grain = { itemType: StockItemType.CROP, cropId: 'soja', depositId: 'd1' };
    const code = await codeOf(
      business.move('acc-1', 'u1', { ...grain, direction: InOutDirection.IN, amount: 1, fieldId: 'f1', lotId: 'l1', info }),
    );
    expect(code).toBe('INVALID_REFERENCE');
  });

  it('a transfer moves both legs with one groupId and locks in a fixed order', async () => {
    rows.set('d2/B', { id: 'd2/B', currentStock: D(10), reservedStock: D(0) });
    const result = await business.transfer('acc-1', 'u1', {
      itemType: StockItemType.SUPPLY,
      inputId: 'in-1',
      from: { depositId: 'd2', location: 'B' },
      to: { depositId: 'd1', location: 'A' },
      amount: 4,
      info,
    });
    expect(rows.get('d2/B')?.currentStock.toNumber()).toBe(6);
    expect(rows.get('d1/A')?.currentStock.toNumber()).toBe(4);
    expect(lockOrder).toEqual(['d1/A', 'd2/B']);
    expect(movementRecords().map((r: any) => [r.stockId, r.direction, r.groupId])).toEqual([
      ['d2/B', 'OUT', result.groupId],
      ['d1/A', 'IN', result.groupId],
    ]);
  });

  it('a transfer without enough stock at the origin moves nothing', async () => {
    const code = await codeOf(
      business.transfer('acc-1', 'u1', {
        itemType: StockItemType.SUPPLY,
        inputId: 'in-1',
        from: { depositId: 'd2', location: 'B' },
        to: { depositId: 'd1', location: 'A' },
        amount: 4,
        info,
      }),
    );
    expect(code).toBe('INSUFFICIENT_STOCK');
    expect(repo.updateStock).not.toHaveBeenCalled();
  });

  it('a transformation consumes every origin and produces every destination, or nothing', async () => {
    rows.set('d1/A', { id: 'd1/A', currentStock: D(10), reservedStock: D(0) });
    await business.transform('acc-1', 'u1', {
      origins: [{ ...supplyLine, amount: 10 }],
      destinations: [{ ...supplyLine, inputId: 'in-2', location: 'C', amount: 8 }],
      info,
    });
    expect(movementRecords().map((r: any) => r.direction)).toEqual(['OUT', 'IN']);

    repo.insertMovements.mockClear();
    const code = await codeOf(
      business.transform('acc-1', 'u1', {
        origins: [{ ...supplyLine, amount: 1 }],
        destinations: [{ ...supplyLine, location: 'C', amount: 1 }],
        info,
      }),
    );
    expect(code).toBe('INSUFFICIENT_STOCK');
    expect(repo.insertMovements).not.toHaveBeenCalled();
  });

  it('reservations add and release without movements', async () => {
    rows.set('d1/A', { id: 'd1/A', currentStock: D(10), reservedStock: D(2) });
    await business.reserve('acc-1', { lines: [{ ...supplyLine, delta: 5 }, { ...supplyLine, location: 'B', delta: -1 }] });
    expect(rows.get('d1/A')?.reservedStock.toNumber()).toBe(7);
    expect(rows.get('d1/B')?.reservedStock.toNumber()).toBe(0);
    expect(repo.insertMovements).not.toHaveBeenCalled();
  });

  it('delivering grain moves it from committed to delivered', async () => {
    const result = await business.deliverCrop('acc-1', { campaignId: 'c1', cropId: 'soja', kg: 30 });
    expect(repo.lockCropBalance).toHaveBeenCalledWith('acc-1', { campaignId: 'c1', zafra: '', cropId: 'soja' }, tx);
    expect(result).toEqual(expect.objectContaining({ committedKg: 70, deliveredKg: 30 }));
  });

  it('a crop balance needs a campaign of the account', async () => {
    repo.campaignsOf.mockResolvedValue([]);
    expect(await codeOf(business.commitCrop('acc-1', { campaignId: 'c9', cropId: 'soja', deltaKg: 10 }))).toBe(
      'INVALID_REFERENCE',
    );
  });
});
