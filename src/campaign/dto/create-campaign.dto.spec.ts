import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateCampaignDto } from './create-campaign.dto';

const errorsOf = async (body: Record<string, unknown>) =>
  (await validate(plainToInstance(CreateCampaignDto, body))).map((e) => e.property);

describe('CreateCampaignDto zafras', () => {
  it('accepts a list of zafras, or none', async () => {
    expect(await errorsOf({ name: '24/25', zafras: ['gruesa_verano', 'fina_invierno'] })).toEqual([]);
    expect(await errorsOf({ name: '24/25' })).toEqual([]);
  });

  it('rejects a single string, empty labels and non-strings', async () => {
    expect(await errorsOf({ name: '24/25', zafras: 'gruesa_verano' })).toEqual(['zafras']);
    expect(await errorsOf({ name: '24/25', zafras: [''] })).toEqual(['zafras']);
    expect(await errorsOf({ name: '24/25', zafras: [3] })).toEqual(['zafras']);
  });
});
