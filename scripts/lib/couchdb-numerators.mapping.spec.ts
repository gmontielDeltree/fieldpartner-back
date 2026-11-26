import { NumeratorType } from '@prisma/client';
import { planNumerators } from './couchdb-numerators.mapping';

describe('planNumerators', () => {
  it('maps the front labels to the enum', () => {
    const { items, skipped } = planNumerators([
      { _id: 'a', accountId: 'acc-1', numeratorType: 'Cliente', lastNumerator: 40 },
      { _id: 'b', accountId: 'acc-1', numeratorType: 'Orden de Trabajo', lastNumerator: 7 },
      { _id: 'c', accountId: 'acc-1', numeratorType: 'Orden de Compra', lastNumerator: 3 },
      { _id: 'd', accountId: 'acc-1', numeratorType: 'Contrato de Venta de Cereal', lastNumerator: 12 },
    ]);
    expect(skipped).toEqual([]);
    expect(items.map((i) => [i.numeratorType, i.lastNumerator])).toEqual([
      [NumeratorType.CEREAL_SALE_CONTRACT, 12],
      [NumeratorType.CLIENT, 40],
      [NumeratorType.PURCHASE_ORDER, 3],
      [NumeratorType.WORK_ORDER, 7],
    ]);
  });

  it('keeps the highest value when an account has duplicates of a type', () => {
    const { items } = planNumerators([
      { _id: 'old', accountId: 'acc-1', numeratorType: 'Cliente', lastNumerator: 12 },
      { _id: 'numerador:acc-1:Cliente', accountId: 'acc-1', numeratorType: 'Cliente', lastNumerator: '41' },
      { _id: 'other', accountId: 'acc-2', numeratorType: 'Cliente', lastNumerator: 5 },
    ]);
    expect(items).toEqual([
      { accountId: 'acc-1', numeratorType: NumeratorType.CLIENT, lastNumerator: 41, sourceIds: ['old', 'numerador:acc-1:Cliente'] },
      { accountId: 'acc-2', numeratorType: NumeratorType.CLIENT, lastNumerator: 5, sourceIds: ['other'] },
    ]);
  });

  it('skips docs it cannot place, with the reason', () => {
    const { items, skipped } = planNumerators([
      { _id: 'x1', numeratorType: 'Cliente', lastNumerator: 1 },
      { _id: 'x2', accountId: 'acc-1', numeratorType: 'Remito', lastNumerator: 1 },
      { _id: 'x3', accountId: 'acc-1', numeratorType: 'Cliente', lastNumerator: 'abc' },
      { _id: 'x4', accountId: 'acc-1', numeratorType: 'Cliente', lastNumerator: -2 },
    ]);
    expect(items).toEqual([]);
    expect(skipped.map((s) => s.id)).toEqual(['x1', 'x2', 'x3', 'x4']);
    expect(skipped[1].reason).toContain('Remito');
  });
});
