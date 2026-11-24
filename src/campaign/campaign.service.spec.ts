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
      field: { count: jest.fn().mockResolvedValue(1) },
    };
    service = new CampaignService(new CampaignRepository(prisma), new CampaignBusiness(prisma));
  });

  it('creates in the caller account after checking references against it', async () => {
    await service.create({ name: '24/25', zoneId: 'z1', fieldId: 'f1' }, admin);
    expect(prisma.zone.count).toHaveBeenCalledWith({ where: { id: 'z1', accountId: 'acc-1' } });
    expect(prisma.field.count).toHaveBeenCalledWith({ where: { id: 'f1', accountId: 'acc-1' } });
    expect(prisma.campaign.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ accountId: 'acc-1', zoneId: 'z1' }) }),
    );
  });

  it.each([
    ['zoneId', 'zone'],
    ['fieldId', 'field'],
    ['lotBranchSourceCampaignId', 'campaign'],
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

  it('filters the list by account and state', async () => {
    await service.findAll(admin, undefined, 'ACTIVE');
    expect(prisma.campaign.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { accountId: 'acc-1', state: 'ACTIVE' } }),
    );
  });
});
