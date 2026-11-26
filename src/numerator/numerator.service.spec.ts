import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { NumeratorType, UserRole } from '@prisma/client';
import { Caller } from '../auth/roles.guard';
import { NumeratorRepository } from './numerator.repository';
import { NumeratorService } from './numerator.service';

const admin: Caller = { role: UserRole.ADMIN, accountId: 'acc-1' };
const platform: Caller = { role: UserRole.GENERAL_ADMIN, accountId: null };

describe('NumeratorService', () => {
  let prisma: any;
  let service: NumeratorService;

  beforeEach(() => {
    prisma = {
      numerator: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
      },
      $queryRaw: jest.fn(),
    };
    service = new NumeratorService(new NumeratorRepository(prisma));
  });

  it('takes the number from the caller account', async () => {
    prisma.$queryRaw.mockResolvedValue([{ lastNumerator: 7 }]);
    await expect(service.take(NumeratorType.WORK_ORDER, admin)).resolves.toEqual({
      numeratorType: NumeratorType.WORK_ORDER,
      number: 7,
    });
    const [sql] = prisma.$queryRaw.mock.calls[0];
    expect(sql.values).toEqual(['acc-1', NumeratorType.WORK_ORDER]);
  });

  it('rejects taking a number from another account', async () => {
    await expect(service.take(NumeratorType.CLIENT, admin, 'acc-2')).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it('makes a GENERAL_ADMIN name the account', async () => {
    await expect(service.take(NumeratorType.CLIENT, platform)).rejects.toBeInstanceOf(BadRequestException);
    prisma.$queryRaw.mockResolvedValue([{ lastNumerator: 1 }]);
    await service.take(NumeratorType.CLIENT, platform, 'acc-9');
    expect(prisma.$queryRaw.mock.calls[0][0].values).toEqual(['acc-9', NumeratorType.CLIENT]);
  });

  it('peeks last + 1 without writing, and 1 when the numerator does not exist yet', async () => {
    prisma.numerator.findUnique.mockResolvedValueOnce({ lastNumerator: 41 }).mockResolvedValueOnce(null);
    await expect(service.peek(NumeratorType.PURCHASE_ORDER, admin)).resolves.toMatchObject({ number: 42 });
    await expect(service.peek(NumeratorType.PURCHASE_ORDER, admin)).resolves.toMatchObject({ number: 1 });
    expect(prisma.numerator.findUnique).toHaveBeenCalledWith({
      where: { accountId_numeratorType: { accountId: 'acc-1', numeratorType: NumeratorType.PURCHASE_ORDER } },
      select: { lastNumerator: true },
    });
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it('lists only the caller account', async () => {
    await service.findAll(admin);
    expect(prisma.numerator.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { accountId: 'acc-1' } }));
  });
});
