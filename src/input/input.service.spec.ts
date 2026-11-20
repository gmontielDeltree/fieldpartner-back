import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Caller } from '../auth/roles.guard';
import { BusinessException } from '../common/exceptions/business.exception';
import { InputService } from './input.service';
import { InputRepository } from './input.repository';
import { InputBusiness } from './businessLogic/input.business';

const generalAdmin: Caller = { role: UserRole.GENERAL_ADMIN, accountId: null };
const admin: Caller = { role: UserRole.ADMIN, accountId: 'acc-1' };

describe('InputService (account scoping + platform catalog)', () => {
  let prisma: any;
  let service: InputService;

  beforeEach(() => {
    prisma = {
      input: {
        create: jest.fn().mockResolvedValue({ id: 'i1' }),
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
        count: jest.fn().mockResolvedValue(1),
        update: jest.fn().mockResolvedValue({ id: 'i1' }),
        delete: jest.fn().mockResolvedValue({ id: 'i1' }),
      },
    };
    const repository = new InputRepository(prisma);
    service = new InputService(repository, new InputBusiness(repository));
  });

  describe('create', () => {
    it('an account user creates in its own account', async () => {
      await service.create({ name: 'Glifo' }, admin);
      expect(prisma.input.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: { name: 'Glifo', accountId: 'acc-1' } }),
      );
    });

    it('GENERAL_ADMIN without accountId creates a platform input', async () => {
      await service.create({ name: 'Glifo' }, generalAdmin);
      expect(prisma.input.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: { name: 'Glifo', accountId: null } }),
      );
    });

    it('an account user cannot create in another account', async () => {
      await expect(service.create({ name: 'Glifo' }, admin, 'acc-2')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('rejects a replacement the owner cannot see', async () => {
      prisma.input.count.mockResolvedValue(0);
      await expect(service.create({ name: 'Glifo', replacementId: 'other' }, admin)).rejects.toBeInstanceOf(
        BusinessException,
      );
      expect(prisma.input.count).toHaveBeenCalledWith({
        where: { id: 'other', OR: [{ accountId: 'acc-1' }, { accountId: null }] },
      });
      expect(prisma.input.create).not.toHaveBeenCalled();
    });
  });

  describe('reads', () => {
    it('without accountId lists the platform catalog', async () => {
      await service.findAll(admin);
      expect(prisma.input.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { accountId: null } }));
    });

    it('by-account rejects another account', () => {
      expect(() => service.findAllByAccount(admin, 'acc-2')).toThrow(ForbiddenException);
    });

    it('findOne sees own and platform inputs only', async () => {
      prisma.input.findFirst.mockResolvedValue(null);
      await expect(service.findOne('i9', admin)).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.input.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'i9', OR: [{ accountId: 'acc-1' }, { accountId: null }] } }),
      );
    });
  });

  describe('writes', () => {
    it.each(['update', 'remove'])('%s of a platform input is GENERAL_ADMIN-only', async (method) => {
      prisma.input.findFirst.mockResolvedValue({ id: 'p1', accountId: null });
      const call = method === 'update' ? service.update('p1', { name: 'x' }, admin) : service.remove('p1', admin);
      await expect(call).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.input.update).not.toHaveBeenCalled();
      expect(prisma.input.delete).not.toHaveBeenCalled();
    });

    it('GENERAL_ADMIN may update a platform input', async () => {
      prisma.input.findFirst.mockResolvedValue({ id: 'p1', accountId: null });
      await service.update('p1', { name: 'x' }, generalAdmin);
      expect(prisma.input.update).toHaveBeenCalled();
    });

    it('an account user updates its own input', async () => {
      prisma.input.findFirst.mockResolvedValue({ id: 'i1', accountId: 'acc-1' });
      await service.update('i1', { name: 'x' }, admin);
      expect(prisma.input.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'i1' } }));
    });
  });
});
