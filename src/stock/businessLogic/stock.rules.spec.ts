import { StockItemType } from '@prisma/client';
import {
  applyReservation,
  applyStockChange,
  assertDifferentLocation,
  commitCrop,
  deliverCrop,
  stockKeyOf,
  stockKeyText,
  toDecimal as D,
} from './stock.rules';

const codeOf = (fn: () => unknown) => {
  try {
    fn();
    return 'no error';
  } catch (e) {
    return (e as any).getResponse().code;
  }
};

const balance = (current: number, reserved = 0) => ({ currentStock: D(current), reservedStock: D(reserved) });

describe('stock rules', () => {
  describe('stockKeyOf', () => {
    it('normalizes empty and missing texts to the same identity', () => {
      const a = stockKeyOf({ itemType: StockItemType.SUPPLY, inputId: 'in-1', depositId: 'd1', location: ' ', nroLot: undefined });
      const b = stockKeyOf({ itemType: StockItemType.SUPPLY, inputId: 'in-1', depositId: 'd1', location: '', nroLot: '', zafra: null, campaignId: '' });
      expect(a).toEqual(b);
      expect(a).toEqual(expect.objectContaining({ campaignId: null, location: '', nroLot: '', zafra: '', cropId: null }));
      expect(stockKeyText(a)).toBe(stockKeyText(b));
    });

    it('a supply line names its input and no crop; a grain line, its crop and no input', () => {
      expect(codeOf(() => stockKeyOf({ itemType: StockItemType.SUPPLY, depositId: 'd1' }))).toBe('INVALID_STOCK_ITEM');
      expect(codeOf(() => stockKeyOf({ itemType: StockItemType.SUPPLY, inputId: 'i', cropId: 'c', depositId: 'd1' }))).toBe('INVALID_STOCK_ITEM');
      expect(codeOf(() => stockKeyOf({ itemType: StockItemType.CROP, inputId: 'i', depositId: 'd1' }))).toBe('INVALID_STOCK_ITEM');
      expect(codeOf(() => stockKeyOf({ itemType: StockItemType.CROP, cropId: 'c', depositId: 'd1' }))).toBe('no error');
    });

    it('different places are different rows', () => {
      const base = { itemType: StockItemType.CROP, cropId: 'soja', depositId: 'd1' };
      expect(stockKeyText(stockKeyOf({ ...base, zafra: 'gruesa' }))).not.toBe(stockKeyText(stockKeyOf(base)));
      expect(stockKeyText(stockKeyOf({ ...base, location: 'Silo 1' }))).not.toBe(stockKeyText(stockKeyOf(base)));
    });
  });

  describe('applyStockChange', () => {
    it('adds inflows and subtracts outflows exactly (decimals, no float drift)', () => {
      const after = applyStockChange(balance(0.3), { delta: D('-0.1').plus(D('-0.2')), allowNegative: false });
      expect(after.currentStock.toString()).toBe('0');
      expect(applyStockChange(balance(10), { delta: D(5), allowNegative: false }).currentStock.toNumber()).toBe(15);
    });

    it('rejects an outflow below zero unless the deposit allows negative stock', () => {
      expect(codeOf(() => applyStockChange(balance(3), { delta: D(-5), allowNegative: false }))).toBe('INSUFFICIENT_STOCK');
      expect(applyStockChange(balance(3), { delta: D(-5), allowNegative: true }).currentStock.toNumber()).toBe(-2);
    });

    it('an inflow is always accepted, even on a negative stock', () => {
      expect(applyStockChange(balance(-4), { delta: D(1), allowNegative: false }).currentStock.toNumber()).toBe(-3);
    });

    it('releases the reservation with the outflow, never below zero', () => {
      expect(applyStockChange(balance(10, 4), { delta: D(-3), releaseReserved: D(3), allowNegative: false }))
        .toEqual({ currentStock: D(7), reservedStock: D(1) });
      expect(applyStockChange(balance(10, 2), { delta: D(-3), releaseReserved: D(3), allowNegative: false }).reservedStock.toNumber())
        .toBe(0);
    });
  });

  it('reservations never go below zero', () => {
    expect(applyReservation(D(5), D(3)).toNumber()).toBe(8);
    expect(applyReservation(D(5), D(-8)).toNumber()).toBe(0);
  });

  it('a transfer needs a different deposit or location', () => {
    expect(codeOf(() => assertDifferentLocation({ depositId: 'd1', location: 'A' }, { depositId: 'd1', location: ' A ' }))).toBe('SAME_LOCATION');
    expect(codeOf(() => assertDifferentLocation({ depositId: 'd1', location: 'A' }, { depositId: 'd1', location: 'B' }))).toBe('no error');
    expect(codeOf(() => assertDifferentLocation({ depositId: 'd1' }, { depositId: 'd2' }))).toBe('no error');
  });

  describe('crop balances', () => {
    const amounts = (committed: number, delivered: number) => ({ committedKg: D(committed), deliveredKg: D(delivered) });

    it('committing adds and uncommitting subtracts, never below zero', () => {
      expect(commitCrop(amounts(100, 0), D(50)).committedKg.toNumber()).toBe(150);
      expect(commitCrop(amounts(100, 0), D(-150)).committedKg.toNumber()).toBe(0);
    });

    it('delivering moves grain from committed to delivered', () => {
      expect(deliverCrop(amounts(100, 10), D(30))).toEqual(amounts(70, 40));
      expect(deliverCrop(amounts(20, 0), D(30))).toEqual(amounts(0, 30));
    });
  });
});
