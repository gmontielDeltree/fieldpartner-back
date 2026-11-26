import { normalizeLocations, planLocationSync } from './deposit-locations';

describe('deposit locations', () => {
  it('normalizes names: trims, drops blanks and case-insensitive duplicates', () => {
    expect(normalizeLocations([{ name: ' Galpón ' }, { name: '' }, { name: 'galpón' }, { name: 'Silo 1', number: ' 1 ' }])).toEqual([
      { name: 'Galpón', number: null },
      { name: 'Silo 1', number: '1' },
    ]);
  });

  it('keeps existing names (by id), removes the missing ones and creates the new ones', () => {
    const current = [
      { id: 'l1', name: 'General', number: null },
      { id: 'l2', name: 'Galpón', number: null },
      { id: 'l3', name: 'Silo 1', number: '1' },
    ];
    expect(planLocationSync(current, [{ name: 'general' }, { name: 'Silo 1', number: '2' }, { name: 'Celda A' }])).toEqual({
      removeIds: ['l2'],
      update: [{ id: 'l3', number: '2' }],
      create: [{ name: 'Celda A', number: null }],
    });
  });

  it('an empty list removes every location', () => {
    expect(planLocationSync([{ id: 'l1', name: 'General', number: null }], [])).toEqual({ removeIds: ['l1'], update: [], create: [] });
  });
});
