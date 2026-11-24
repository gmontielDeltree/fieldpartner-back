import { NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Caller } from '../auth/roles.guard';
import { BusinessException } from '../common/exceptions/business.exception';
import { CampaignService } from './campaign.service';
import { CampaignRepository } from './campaign.repository';
import { CampaignBusiness } from './businessLogic/campaign.business';

const admin: Caller = { role: UserRole.ADMIN, accountId: 'acc-1' };

describe('CampaignService (account scoping)', () => {
  let prisma: any;
  let service: CampaignService;

  beforeEach(() => {
    prisma = {
      campaign: {
        create: jest.fn().mockResolvedValue({ id: 'c1' }),
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
        update: jest.fn().mockResolvedValue({ id: 'c1' }),
        delete: jest.fn(),
        count: jest.fn().mockResolvedValue(1),
      },
      zone: { count: jest.fn().mockResolvedValue(1) },
      lotLayout: {
        count: jest.fn().mockResolvedValue(1),
        updateMany: jest.fn(),
        create: jest.fn().mockResolvedValue({ id: 'ly-new' }),
        deleteMany: jest.fn(),
      },
    };
    prisma.$transaction = jest.fn((fn: (tx: unknown) => unknown) => fn(prisma));
    const repository = new CampaignRepository(prisma);
    service = new CampaignService(repository, new CampaignBusiness(prisma, repository));
  });

  it('creates in the caller account after checking references against it', async () => {
    await service.create({ name: '24/25', zoneId: 'z1', lotLayoutId: 'ly1' }, admin);
    expect(prisma.zone.count).toHaveBeenCalledWith({ where: { id: 'z1', accountId: 'acc-1' } });
    expect(prisma.lotLayout.count).toHaveBeenCalledWith({ where: { id: 'ly1', accountId: 'acc-1' } });
    expect(prisma.campaign.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ accountId: 'acc-1', zoneId: 'z1' }) }),
    );
  });

  it.each([
    ['zoneId', 'zone'],
    ['lotLayoutId', 'lotLayout'],
  ])('rejects a %s from another account', async (key, model) => {
    prisma[model].count.mockResolvedValue(0);
    await expect(service.create({ name: '24/25', [key]: 'other' }, admin)).rejects.toBeInstanceOf(
      BusinessException,
    );
    expect(prisma.campaign.create).not.toHaveBeenCalled();
  });

  it('checks update references against the campaign account', async () => {
    prisma.campaign.findFirst.mockResolvedValue({ id: 'c1', accountId: 'acc-1' });
    prisma.zone.count.mockResolvedValue(0);
    await expect(service.update('c1', { zoneId: 'z-other' }, admin)).rejects.toBeInstanceOf(
      BusinessException,
    );
    expect(prisma.zone.count).toHaveBeenCalledWith({ where: { id: 'z-other', accountId: 'acc-1' } });
    expect(prisma.campaign.update).not.toHaveBeenCalled();
  });

  it('updating another account campaign is a 404', async () => {
    prisma.campaign.findFirst.mockResolvedValue(null);
    await expect(service.update('c1', { name: 'x' }, admin)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.campaign.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'c1', accountId: 'acc-1' } }),
    );
  });

  it('closing a campaign locks its lot layout (KAN-65)', async () => {
    prisma.campaign.findFirst.mockResolvedValue({ id: 'c1', accountId: 'acc-1', state: 'ACTIVE', lotLayoutId: 'ly1' });
    prisma.campaign.update.mockResolvedValue({ id: 'c1', state: 'CLOSED', lotLayoutId: 'ly1' });
    await service.update('c1', { state: 'CLOSED' }, admin);
    expect(prisma.lotLayout.updateMany).toHaveBeenCalledWith({
      where: { id: 'ly1', lockedAt: null },
      data: { lockedAt: expect.any(Date) },
    });
  });

  it('an open campaign does not lock its layout', async () => {
    prisma.campaign.findFirst.mockResolvedValue({ id: 'c1', accountId: 'acc-1', state: 'ACTIVE', lotLayoutId: 'ly1' });
    prisma.campaign.update.mockResolvedValue({ id: 'c1', state: 'ACTIVE', lotLayoutId: 'ly1' });
    await service.update('c1', { name: 'x' }, admin);
    expect(prisma.lotLayout.updateMany).not.toHaveBeenCalled();
  });

  it('a closed campaign cannot change its lot layout', async () => {
    prisma.campaign.findFirst.mockResolvedValue({ id: 'c1', accountId: 'acc-1', state: 'CLOSED', lotLayoutId: 'ly1' });
    await expect(service.update('c1', { lotLayoutId: 'ly2' }, admin)).rejects.toBeInstanceOf(BusinessException);
    expect(prisma.campaign.update).not.toHaveBeenCalled();
  });

  it('"continue": a given layout is shared, no new layout is created', async () => {
    await service.create({ name: '25/26', lotLayoutId: 'ly1' }, admin);
    expect(prisma.lotLayout.create).not.toHaveBeenCalled();
    expect(prisma.campaign.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ lotLayoutId: 'ly1' }) }),
    );
  });

  it('without a layout ("independent" / first campaign) an empty one is created with it', async () => {
    await service.create({ name: '25/26' }, admin);
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.lotLayout.create).toHaveBeenCalledWith({
      data: { accountId: 'acc-1', name: '25/26' },
      select: { id: true },
    });
    expect(prisma.campaign.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ accountId: 'acc-1', lotLayoutId: 'ly-new' }) }),
    );
  });

  it('deleting a campaign drops its layout only if no campaign or lot uses it', async () => {
    prisma.campaign.findFirst.mockResolvedValue({ id: 'c1', accountId: 'acc-1', lotLayoutId: 'ly1' });
    await service.remove('c1', admin);
    expect(prisma.campaign.delete).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'c1' } }));
    expect(prisma.lotLayout.deleteMany).toHaveBeenCalledWith({
      where: { id: 'ly1', campaigns: { none: {} }, lots: { none: {} } },
    });
  });

  it('filters the list by account and state', async () => {
    await service.findAll(admin, undefined, 'ACTIVE');
    expect(prisma.campaign.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { accountId: 'acc-1', state: 'ACTIVE' } }),
    );
  });
});
