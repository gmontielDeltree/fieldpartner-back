import { BusinessErrorCode } from '../../common/exceptions/business.exception';
import { LotBusiness } from './lot.business';

const square = {
  type: 'Polygon' as const,
  coordinates: [[[-60, -34], [-59.99, -34], [-59.99, -33.99], [-60, -33.99], [-60, -34]]],
};
const lot = { id: 'lot-1', accountId: 'acc-1', fieldId: 'f1', layoutId: 'ly1', archivedAt: null } as any;
const createDto = { layoutId: 'ly1', fieldId: 'f1', name: 'Lote 1', geometry: square };

const codeOf = (fn: () => Promise<unknown>) =>
  fn().then(
    () => 'no error',
    (e) => e.getResponse().code,
  );

describe('LotBusiness', () => {
  let lots: Record<string, jest.Mock>;
  let fields: Record<string, jest.Mock>;
  let geometry: Record<string, jest.Mock>;
  let layouts: Record<string, jest.Mock>;
  let business: LotBusiness;
  const tx = { tx: true };

  beforeEach(() => {
    lots = {
      insert: jest.fn().mockResolvedValue('lot-new'),
      update: jest.fn(),
      findOne: jest.fn().mockResolvedValue(lot),
      nameTaken: jest.fn().mockResolvedValue(false),
      countReferences: jest.fn().mockResolvedValue(0),
      archive: jest.fn(),
      delete: jest.fn(),
    };
    fields = {
      lockForUpdate: jest.fn().mockResolvedValue({ id: 'f1', accountId: 'acc-1', archivedAt: null, hex: 'FIELD' }),
    };
    geometry = {
      normalize: jest.fn().mockResolvedValue({ valid: true, reason: null, hex: 'LOT' }),
      fitInField: jest.fn().mockResolvedValue({ outsideRatio: 0, clippedHex: 'CLIPPED' }),
      overlaps: jest.fn().mockResolvedValue([]),
    };
    layouts = {
      writableLayout: jest.fn().mockResolvedValue({ layoutId: 'ly1', forkedFromLayoutId: null, lotIdMap: null }),
    };
    const prisma = { $transaction: jest.fn((fn) => fn(tx)) };
    business = new LotBusiness(prisma as any, lots as any, fields as any, geometry as any, layouts as any);
  });

  it('creates a lot fully inside the field with its own geometry', async () => {
    const result = await business.create('acc-1', createDto);
    expect(lots.insert).toHaveBeenCalledWith(expect.objectContaining({ layoutId: 'ly1', fieldId: 'f1' }), 'LOT', tx);
    expect(result).toEqual(expect.objectContaining({ layoutId: 'ly1', forkedFromLayoutId: null, removal: null }));
  });

  it('clips a lot that exceeds the field by up to 1 %', async () => {
    geometry.fitInField.mockResolvedValue({ outsideRatio: 0.004, clippedHex: 'CLIPPED' });
    await business.create('acc-1', createDto);
    expect(geometry.overlaps).toHaveBeenCalledWith('ly1', 'CLIPPED', null, tx);
    expect(lots.insert).toHaveBeenCalledWith(expect.anything(), 'CLIPPED', tx);
  });

  it('rejects a lot more than 1 % outside the field', async () => {
    geometry.fitInField.mockResolvedValue({ outsideRatio: 0.05, clippedHex: 'CLIPPED' });
    expect(await codeOf(() => business.create('acc-1', createDto))).toBe(BusinessErrorCode.LOT_OUTSIDE_FIELD);
    expect(lots.insert).not.toHaveBeenCalled();
  });

  it('rejects an overlap above 1 % of the smaller lot, tolerates slivers', async () => {
    geometry.overlaps.mockResolvedValue([
      { id: 'a', name: 'Lote A', ratio: 0.002 },
      { id: 'b', name: 'Lote B', ratio: 0.3 },
    ]);
    const error = await business.create('acc-1', createDto).catch((e) => e.getResponse());
    expect(error.code).toBe(BusinessErrorCode.LOT_OVERLAP);
    expect(error.details).toEqual([{ lotId: 'b', name: 'Lote B', overlapPercent: 30 }]);
  });

  it('rejects a field of another account (by id) and an archived field', async () => {
    fields.lockForUpdate.mockResolvedValueOnce({ id: 'f1', accountId: 'acc-2', archivedAt: null, hex: 'F' });
    expect(await codeOf(() => business.create('acc-1', createDto))).toBe(BusinessErrorCode.INVALID_REFERENCE);
    fields.lockForUpdate.mockResolvedValueOnce({ id: 'f1', accountId: 'acc-1', archivedAt: new Date(), hex: 'F' });
    expect(await codeOf(() => business.create('acc-1', createDto))).toBe(BusinessErrorCode.RECORD_ARCHIVED);
  });

  it('rejects a duplicate name in the field + layout', async () => {
    lots.nameTaken.mockResolvedValue(true);
    expect(await codeOf(() => business.create('acc-1', createDto))).toBe(BusinessErrorCode.DUPLICATE_ENTRY);
  });

  it('after a fork, writes on the copy of the lot and reports both layouts', async () => {
    layouts.writableLayout.mockResolvedValue({
      layoutId: 'ly2',
      forkedFromLayoutId: 'ly1',
      lotIdMap: new Map([['lot-1', 'lot-1-copy']]),
    });
    const result = await business.update(lot, { name: 'Nuevo' }, 'camp-open');
    expect(layouts.writableLayout).toHaveBeenCalledWith('ly1', 'camp-open', tx);
    expect(lots.nameTaken).toHaveBeenCalledWith('f1', 'ly2', 'Nuevo', 'lot-1-copy', tx);
    expect(lots.update).toHaveBeenCalledWith('lot-1-copy', { name: 'Nuevo' }, undefined, tx);
    expect(result).toEqual(expect.objectContaining({ layoutId: 'ly2', forkedFromLayoutId: 'ly1' }));
  });

  it('does not touch geometry checks on a name-only update', async () => {
    await business.update(lot, { name: 'Nuevo' });
    expect(geometry.normalize).not.toHaveBeenCalled();
  });

  it('archives a referenced lot and deletes a free one', async () => {
    lots.countReferences.mockResolvedValueOnce(1);
    expect((await business.remove(lot)).removal).toBe('ARCHIVED');
    expect(lots.archive).toHaveBeenCalledWith('lot-1', tx);
    expect((await business.remove(lot)).removal).toBe('DELETED');
    expect(lots.delete).toHaveBeenCalledWith('lot-1', tx);
  });

  it('rejects writes on an archived lot', async () => {
    const archived = { ...lot, archivedAt: new Date() };
    expect(await codeOf(() => business.update(archived, { name: 'X' }))).toBe(BusinessErrorCode.RECORD_ARCHIVED);
    expect(await codeOf(() => business.remove(archived))).toBe(BusinessErrorCode.RECORD_ARCHIVED);
  });
});
