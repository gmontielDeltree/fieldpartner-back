import { BusinessErrorCode } from '../../common/exceptions/business.exception';
import { FieldBusiness } from './field.business';

const square = {
  type: 'Polygon' as const,
  coordinates: [[[-60, -34], [-59.99, -34], [-59.99, -33.99], [-60, -33.99], [-60, -34]]],
};
const field = { id: 'f1', accountId: 'acc-1', archivedAt: null } as any;

const codeOf = (fn: () => Promise<unknown>) =>
  fn().then(
    () => 'no error',
    (e) => e.getResponse().code,
  );

describe('FieldBusiness', () => {
  let fields: Record<string, jest.Mock>;
  let geometry: Record<string, jest.Mock>;
  let business: FieldBusiness;
  const tx = { tx: true };

  beforeEach(() => {
    fields = {
      insert: jest.fn().mockResolvedValue('f1'),
      findOne: jest.fn().mockResolvedValue(field),
      lockForUpdate: jest.fn(),
      update: jest.fn(),
      archive: jest.fn(),
      delete: jest.fn(),
      countReferences: jest.fn().mockResolvedValue(0),
      countryExists: jest.fn().mockResolvedValue(true),
    };
    geometry = {
      normalize: jest.fn().mockResolvedValue({ valid: true, reason: null, hex: 'HEX' }),
      lotsOutsideField: jest.fn().mockResolvedValue([]),
      clipLots: jest.fn(),
    };
    const prisma = { $transaction: jest.fn((fn) => fn(tx)) };
    business = new FieldBusiness(prisma as any, fields as any, geometry as any);
  });

  it('creates with the normalized geometry', async () => {
    await business.create('acc-1', { name: 'Campo', geometry: square });
    expect(fields.insert).toHaveBeenCalledWith('acc-1', expect.objectContaining({ name: 'Campo' }), 'HEX');
  });

  it('rejects an invalid geometry with the PostGIS reason', async () => {
    geometry.normalize.mockResolvedValue({ valid: false, reason: 'Self-intersection', hex: null });
    expect(await codeOf(() => business.create('acc-1', { name: 'C', geometry: square }))).toBe(
      BusinessErrorCode.GEOMETRY_INVALID,
    );
    expect(fields.insert).not.toHaveBeenCalled();
  });

  it('rejects an unknown country', async () => {
    fields.countryExists.mockResolvedValue(false);
    expect(await codeOf(() => business.create('acc-1', { name: 'C', geometry: square, countryId: 'x' }))).toBe(
      BusinessErrorCode.INVALID_REFERENCE,
    );
  });

  it('blocks an outline that leaves lots of open layouts outside by more than 1 %', async () => {
    geometry.lotsOutsideField.mockResolvedValue([
      { id: 'l1', name: 'Lote 1', layoutId: 'ly', outsideRatio: 0.2 },
      { id: 'l2', name: 'Lote 2', layoutId: 'ly', outsideRatio: 0.005 },
    ]);
    expect(await codeOf(() => business.update(field, { geometry: square }))).toBe(
      BusinessErrorCode.FIELD_LOTS_OUTSIDE,
    );
    expect(geometry.clipLots).not.toHaveBeenCalled();
    expect(fields.update).not.toHaveBeenCalled();
  });

  it('clips the lots that exceed the new outline within the tolerance', async () => {
    geometry.lotsOutsideField.mockResolvedValue([
      { id: 'l1', name: 'Lote 1', layoutId: 'ly', outsideRatio: 0 },
      { id: 'l2', name: 'Lote 2', layoutId: 'ly', outsideRatio: 0.005 },
    ]);
    await business.update(field, { geometry: square, name: 'Nuevo' });
    expect(fields.lockForUpdate).toHaveBeenCalledWith('f1', tx);
    expect(geometry.clipLots).toHaveBeenCalledWith(['l2'], 'HEX', tx);
    expect(fields.update).toHaveBeenCalledWith('f1', { name: 'Nuevo' }, 'HEX', tx);
  });

  it('does not modify an archived field', async () => {
    expect(await codeOf(() => business.update({ ...field, archivedAt: new Date() }, { name: 'X' }))).toBe(
      BusinessErrorCode.RECORD_ARCHIVED,
    );
  });

  it('archives a referenced field and deletes a free one', async () => {
    fields.countReferences.mockResolvedValueOnce(2);
    expect(await business.remove(field)).toEqual({ id: 'f1', result: 'ARCHIVED' });
    expect(fields.archive).toHaveBeenCalledWith('f1');
    expect(fields.delete).not.toHaveBeenCalled();

    expect(await business.remove(field)).toEqual({ id: 'f1', result: 'DELETED' });
    expect(fields.delete).toHaveBeenCalledWith('f1');
  });
});
