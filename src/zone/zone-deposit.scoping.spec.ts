import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Caller } from '../auth/roles.guard';
import { ZoneService } from './zone.service';
import { ZoneRepository } from './zone.repository';
import { DepositService } from '../deposit/deposit.service';
import { DepositRepository } from '../deposit/deposit.repository';

const generalAdmin: Caller = { role: UserRole.GENERAL_ADMIN, accountId: null };
const admin: Caller = { role: UserRole.ADMIN, accountId: 'acc-1' };

type Delegate = Record<'create' | 'findMany' | 'findFirst' | 'update' | 'delete', jest.Mock>;
const delegate = (): Delegate => ({
  create: jest.fn().mockResolvedValue({ id: 'x' }),
  findMany: jest.fn().mockResolvedValue([]),
  findFirst: jest.fn(),
  update: jest.fn().mockResolvedValue({ id: 'x' }),
  delete: jest.fn().mockResolvedValue({ id: 'x' }),
});

// Zones and deposits share the exact same scoping contract.
const CASES = [
  {
    name: 'ZoneService',
    model: 'zone',
    build: (prisma: any) => new ZoneService(new ZoneRepository(prisma)),
    body: { name: 'Norte' },
  },
  {
    name: 'DepositService',
    model: 'deposit',
    build: (prisma: any) => new DepositService(new DepositRepository(prisma)),
    body: { description: 'Planta 1' },
  },
] as const;

describe.each(CASES)('$name (account scoping)', ({ model, build, body }) => {
  let prisma: Record<string, Delegate>;
  let service: any;

  beforeEach(() => {
    prisma = { [model]: delegate() };
    service = build(prisma);
  });

  it('creates in the caller account, ignoring nothing from the body', async () => {
    await service.create(body, admin);
    expect(prisma[model].create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { ...body, accountId: 'acc-1' } }),
    );
  });

  it('GENERAL_ADMIN creates in the account named by the query param', async () => {
    await service.create(body, generalAdmin, 'acc-9');
    expect(prisma[model].create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { ...body, accountId: 'acc-9' } }),
    );
  });

  it('rejects listing another account', async () => {
    expect(() => service.findAll(admin, 'acc-2')).toThrow(ForbiddenException);
    expect(prisma[model].findMany).not.toHaveBeenCalled();
  });

  it('lists only the caller account', async () => {
    await service.findAll(admin);
    expect(prisma[model].findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { accountId: 'acc-1' } }),
    );
  });

  it('looks up by id within the caller account', async () => {
    prisma[model].findFirst.mockResolvedValue({ id: 'z1', accountId: 'acc-1' });
    await service.findOne('z1', admin);
    expect(prisma[model].findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'z1', accountId: 'acc-1' } }),
    );
  });

  it('GENERAL_ADMIN looks up by id without an account filter', async () => {
    prisma[model].findFirst.mockResolvedValue({ id: 'z1', accountId: 'acc-2' });
    await service.findOne('z1', generalAdmin);
    expect(prisma[model].findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'z1' } }));
  });

  it.each(['update', 'remove'])('%s of another account record is a 404 and writes nothing', async (method) => {
    prisma[model].findFirst.mockResolvedValue(null);
    const args = method === 'update' ? ['z1', body, admin] : ['z1', admin];
    await expect(service[method](...args)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma[model].update).not.toHaveBeenCalled();
    expect(prisma[model].delete).not.toHaveBeenCalled();
  });
});
