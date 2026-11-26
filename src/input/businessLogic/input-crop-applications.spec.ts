import { normalizeCropApplications, planCropApplicationSync } from './input-crop-applications';

describe('input crop applications', () => {
  it('keeps one entry per crop and fills missing doses with null', () => {
    expect(normalizeCropApplications([{ cropId: 'soy', maxDose: 2 }, { cropId: ' soy ' }, { cropId: '' }, { cropId: 'corn' }])).toEqual([
      { cropId: 'soy', minDose: null, maxDose: 2, suggestedDose: null },
      { cropId: 'corn', minDose: null, maxDose: null, suggestedDose: null },
    ]);
  });

  it('keeps existing crops (by id), updates changed doses, removes and creates the rest', () => {
    const current = [
      { id: 'a1', cropId: 'soy', minDose: null, maxDose: null, suggestedDose: null },
      { id: 'a2', cropId: 'corn', minDose: 1, maxDose: 2, suggestedDose: null },
      { id: 'a3', cropId: 'wheat', minDose: null, maxDose: null, suggestedDose: null },
    ];
    expect(planCropApplicationSync(current, [{ cropId: 'soy' }, { cropId: 'corn', minDose: 1, maxDose: 3 }, { cropId: 'sunflower' }])).toEqual({
      removeIds: ['a3'],
      update: [{ id: 'a2', minDose: 1, maxDose: 3, suggestedDose: null }],
      create: [{ cropId: 'sunflower', minDose: null, maxDose: null, suggestedDose: null }],
    });
  });

  it('an empty list removes every application', () => {
    expect(planCropApplicationSync([{ id: 'a1', cropId: 'soy', minDose: null, maxDose: null, suggestedDose: null }], [])).toEqual({
      removeIds: ['a1'],
      update: [],
      create: [],
    });
  });
});
