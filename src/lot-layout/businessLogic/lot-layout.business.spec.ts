import { CampaignState } from '@prisma/client';
import { BusinessErrorCode } from '../../common/exceptions/business.exception';
import { LotLayoutBusiness } from './lot-layout.business';

const layout = (overrides: Record<string, unknown> = {}) => ({
  id: 'ly1',
  accountId: 'acc-1',
  name: 'Base',
  locked: false,
  lockedAt: null,
  campaigns: [] as Array<{ id: string; name: string; state: CampaignState }>,
  ...overrides,
});

const codeOf = (fn: () => Promise<unknown>) =>
  fn().then(
    () => 'no error',
    (e) => e.getResponse().code,
  );

describe('LotLayoutBusiness', () => {
  let repo: Record<string, jest.Mock>;
  let business: LotLayoutBusiness;
  const tx = { tx: true } as any;

  beforeEach(() => {
    repo = {
      create: jest.fn().mockResolvedValue({ id: 'ly2' }),
      findOne: jest.fn().mockResolvedValue(layout()),
      lockForUpdate: jest.fn(),
      copyLots: jest.fn().mockResolvedValue([{ id: 'lot-1-copy', sourceLotId: 'lot-1' }]),
      moveOpenCampaigns: jest.fn(),
      countLotReferences: jest.fn().mockResolvedValue(0),
      deleteWithLots: jest.fn(),
    };
    const prisma = { $transaction: jest.fn((fn) => fn(tx)) };
    business = new LotLayoutBusiness(prisma as any, repo as any);
  });

  describe('writableLayout', () => {
    it('writes an open layout in place, after locking its row', async () => {
      expect(await business.writableLayout('ly1', undefined, tx)).toEqual({
        layoutId: 'ly1',
        forkedFromLayoutId: null,
        lotIdMap: null,
      });
      expect(repo.lockForUpdate).toHaveBeenCalledWith('ly1', tx);
      expect(repo.create).not.toHaveBeenCalled();
    });

    it('refuses to edit a locked layout without an open campaign', async () => {
      repo.findOne.mockResolvedValue(layout({ locked: true }));
      expect(await codeOf(() => business.writableLayout('ly1', undefined, tx))).toBe(
        BusinessErrorCode.LOT_LAYOUT_LOCKED,
      );
    });

    it.each([
      ['the closed campaign', 'c-closed'],
      ['a campaign that does not use the layout', 'c-other'],
    ])('refuses a fork requested from %s', async (_, campaignId) => {
      repo.findOne.mockResolvedValue(
        layout({ locked: true, campaigns: [{ id: 'c-closed', name: '24/25', state: CampaignState.CLOSED }] }),
      );
      expect(await codeOf(() => business.writableLayout('ly1', campaignId, tx))).toBe(
        BusinessErrorCode.LOT_LAYOUT_LOCKED,
      );
      expect(repo.create).not.toHaveBeenCalled();
    });

    it('forks a locked layout for the open campaigns and maps the lots', async () => {
      repo.findOne.mockResolvedValue(
        layout({
          locked: true,
          campaigns: [
            { id: 'c-closed', name: '24/25', state: CampaignState.CLOSED },
            { id: 'c-open', name: '25/26', state: CampaignState.ACTIVE },
          ],
        }),
      );
      const result = await business.writableLayout('ly1', 'c-open', tx);
      expect(repo.create).toHaveBeenCalledWith('acc-1', { name: 'Base (25/26)', sourceLayoutId: 'ly1' }, tx);
      expect(repo.copyLots).toHaveBeenCalledWith('ly1', 'ly2', tx);
      expect(repo.moveOpenCampaigns).toHaveBeenCalledWith('ly1', 'ly2', tx);
      expect(result.layoutId).toBe('ly2');
      expect(result.forkedFromLayoutId).toBe('ly1');
      expect(result.lotIdMap?.get('lot-1')).toBe('lot-1-copy');
    });
  });

  it('creating from a source of another account is rejected', async () => {
    repo.findOne.mockResolvedValue(null);
    expect(await codeOf(() => business.create('acc-1', { name: 'X', sourceLayoutId: 'foreign' }))).toBe(
      BusinessErrorCode.INVALID_REFERENCE,
    );
    expect(repo.findOne).toHaveBeenCalledWith('foreign', 'acc-1');
  });

  it('creating from a source copies its lots', async () => {
    await business.create('acc-1', { name: 'X', sourceLayoutId: 'ly1' });
    expect(repo.copyLots).toHaveBeenCalledWith('ly1', 'ly2', tx);
  });

  describe('remove', () => {
    it('refuses a layout used by campaigns', async () => {
      const used = layout({ campaigns: [{ id: 'c', name: '24/25', state: CampaignState.ACTIVE }] });
      expect(await codeOf(() => business.remove(used as any))).toBe(BusinessErrorCode.LOT_LAYOUT_IN_USE);
    });

    it('refuses a layout whose lots are referenced', async () => {
      repo.countLotReferences.mockResolvedValue(3);
      expect(await codeOf(() => business.remove(layout() as any))).toBe(BusinessErrorCode.LOT_LAYOUT_IN_USE);
      expect(repo.deleteWithLots).not.toHaveBeenCalled();
    });

    it('deletes a free layout with its lots', async () => {
      await business.remove(layout() as any);
      expect(repo.deleteWithLots).toHaveBeenCalledWith('ly1');
    });
  });
});
