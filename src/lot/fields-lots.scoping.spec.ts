import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Caller } from '../auth/roles.guard';
import { FieldService } from '../field/field.service';
import { LotLayoutService } from '../lot-layout/lot-layout.service';
import { LotService } from './lot.service';

const generalAdmin: Caller = { role: UserRole.GENERAL_ADMIN, accountId: null };
const admin: Caller = { role: UserRole.ADMIN, accountId: 'acc-1' };
const user: Caller = { role: UserRole.USER, accountId: 'acc-1' };
const square = {
  type: 'Polygon' as const,
  coordinates: [[[-60, -34], [-59.99, -34], [-59.99, -33.99], [-60, -33.99], [-60, -34]]],
};

describe('Fields / lot layouts / lots (account scoping)', () => {
  describe('FieldService', () => {
    let repo: Record<string, jest.Mock>;
    let business: Record<string, jest.Mock>;
    let service: FieldService;

    beforeEach(() => {
      repo = { findAll: jest.fn().mockResolvedValue([]), findOne: jest.fn().mockResolvedValue(null) };
      business = { create: jest.fn(), update: jest.fn(), remove: jest.fn() };
      service = new FieldService(repo as any, business as any);
    });

    it('creates in the caller account; GENERAL_ADMIN must name it', async () => {
      await service.create({ name: 'C', geometry: square }, user);
      expect(business.create).toHaveBeenCalledWith('acc-1', expect.anything());
      expect(() => service.create({ name: 'C', geometry: square }, generalAdmin)).toThrow(BadRequestException);
      await service.create({ name: 'C', geometry: square }, generalAdmin, 'acc-9');
      expect(business.create).toHaveBeenLastCalledWith('acc-9', expect.anything());
    });

    it('rejects listing another account (403)', () => {
      expect(() => service.findAll(admin, 'acc-2')).toThrow(ForbiddenException);
    });

    it.each(['findOne', 'update', 'remove'] as const)(
      '%s filters by the caller account and 404s on another account',
      async (method) => {
        const call = method === 'update' ? service.update('f1', { name: 'X' }, admin) : service[method]('f1', admin);
        await expect(call).rejects.toBeInstanceOf(NotFoundException);
        expect(repo.findOne).toHaveBeenCalledWith('f1', 'acc-1');
        expect(business.update).not.toHaveBeenCalled();
        expect(business.remove).not.toHaveBeenCalled();
      },
    );

    it('GENERAL_ADMIN reads any account (no filter)', async () => {
      repo.findOne.mockResolvedValue({ id: 'f1' });
      await service.findOne('f1', generalAdmin);
      expect(repo.findOne).toHaveBeenCalledWith('f1', undefined);
    });
  });

  describe('LotLayoutService', () => {
    let repo: Record<string, jest.Mock>;
    let business: Record<string, jest.Mock>;
    let service: LotLayoutService;

    beforeEach(() => {
      repo = {
        findAll: jest.fn().mockResolvedValue([]),
        findOne: jest.fn().mockResolvedValue(null),
        rename: jest.fn(),
        promote: jest.fn(),
      };
      business = { create: jest.fn(), remove: jest.fn() };
      service = new LotLayoutService(repo as any, business as any);
    });

    it.each([
      ['update', (s: LotLayoutService) => s.update('ly1', { name: 'X' }, admin)],
      ['promote', (s: LotLayoutService) => s.promote('ly1', admin)],
      ['remove', (s: LotLayoutService) => s.remove('ly1', admin)],
    ])('%s 404s on a layout of another account', async (_, call) => {
      await expect(call(service)).rejects.toBeInstanceOf(NotFoundException);
      expect(repo.findOne).toHaveBeenCalledWith('ly1', 'acc-1');
      expect(repo.rename).not.toHaveBeenCalled();
      expect(repo.promote).not.toHaveBeenCalled();
      expect(business.remove).not.toHaveBeenCalled();
    });
  });

  describe('LotService', () => {
    let lots: Record<string, jest.Mock>;
    let layouts: Record<string, jest.Mock>;
    let business: Record<string, jest.Mock>;
    let service: LotService;

    beforeEach(() => {
      lots = { findAll: jest.fn().mockResolvedValue([]), findOne: jest.fn().mockResolvedValue(null) };
      layouts = { findOne: jest.fn().mockResolvedValue(null) };
      business = { create: jest.fn(), update: jest.fn(), remove: jest.fn() };
      service = new LotService(lots as any, layouts as any, business as any);
    });

    it('lists only through a layout of the caller account', async () => {
      await expect(service.findAll({ layoutId: 'ly-foreign' }, admin)).rejects.toBeInstanceOf(NotFoundException);
      expect(layouts.findOne).toHaveBeenCalledWith('ly-foreign', 'acc-1');
      expect(lots.findAll).not.toHaveBeenCalled();
    });

    it('creates only in a layout of the caller account, with that account', async () => {
      const dto = { layoutId: 'ly1', fieldId: 'f1', name: 'L', geometry: square };
      await expect(service.create(dto, admin)).rejects.toBeInstanceOf(NotFoundException);
      expect(business.create).not.toHaveBeenCalled();

      layouts.findOne.mockResolvedValue({ id: 'ly1', accountId: 'acc-1' });
      await service.create(dto, admin, 'camp-1');
      expect(business.create).toHaveBeenCalledWith('acc-1', dto, 'camp-1');
    });

    it.each(['update', 'remove'] as const)('%s 404s on a lot of another account', async (method) => {
      const call = method === 'update' ? service.update('lot-1', { name: 'X' }, admin) : service.remove('lot-1', admin);
      await expect(call).rejects.toBeInstanceOf(NotFoundException);
      expect(lots.findOne).toHaveBeenCalledWith('lot-1', 'acc-1');
      expect(business[method]).not.toHaveBeenCalled();
    });
  });
});
