import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { UsersService } from './users.service';
import { Caller } from '../auth/roles.guard';

describe('UsersService (role-scoped access)', () => {
  let service: UsersService;
  let prisma: any;
  let cognito: any;

  const generalAdmin: Caller = { id: 'ga-1', role: UserRole.GENERAL_ADMIN, accountId: 'acc-ga' };
  const accountAdmin: Caller = { id: 'ad-1', role: UserRole.ADMIN, accountId: 'acc-1' };

  const userRow = (id: string, accId: string, denom: string) => ({
    id,
    email: `${id}@test.com`,
    username: id,
    role: UserRole.USER,
    state: 'ACTIVE',
    licence: { account: { id: accId, denomination: denom, category: 'A' } },
  });

  beforeEach(() => {
    prisma = {
      user: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
      account: { findUnique: jest.fn() },
    };
    cognito = {
      registerAdminUser: jest.fn().mockResolvedValue({ cognitoId: 'cog-1', email: 'new@test.com' }),
      deleteUser: jest.fn().mockResolvedValue(undefined),
      adminSetPassword: jest.fn().mockResolvedValue(undefined),
    };
    service = new UsersService(prisma, cognito);
  });

  describe('listForCaller', () => {
    it('GENERAL_ADMIN gets every account grouped by account', async () => {
      prisma.user.findMany.mockResolvedValue([
        userRow('u1', 'acc-1', 'Beta'),
        userRow('u2', 'acc-1', 'Beta'),
        userRow('u3', 'acc-2', 'Alpha'),
      ]);

      const result = await service.listForCaller(generalAdmin);

      expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
      expect(result.map((g) => g.account.denomination)).toEqual(['Alpha', 'Beta']);
    });

    it('ADMIN is scoped to their own account only', async () => {
      prisma.user.findMany.mockResolvedValue([userRow('u1', 'acc-1', 'Beta')]);
      await service.listForCaller(accountAdmin);
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { licence: { accountId: 'acc-1' } } }),
      );
    });
  });

  describe('findByEmailForCaller', () => {
    it('hides users outside the ADMIN caller account (returns null)', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'x', email: 'other@test.com', username: 'other', role: UserRole.USER, state: 'ACTIVE',
        licence: { id: 'l1', status: 'ACTIVE', accountId: 'acc-OTHER', account: {} },
      });
      expect(await service.findByEmailForCaller('other@test.com', accountAdmin)).toBeNull();
    });
  });

  describe('create', () => {
    const detailRow = {
      id: 'usr-1', email: 'new@test.com', username: 'newuser', role: UserRole.USER, state: 'PENDING',
      licence: { account: { id: 'acc-1', denomination: 'Acme', category: 'A' } },
    };

    const baseDto = { email: 'New@Test.com', username: 'newuser', password: 'Secret123!' } as any;

    beforeEach(() => {
      prisma.account.findUnique.mockResolvedValue({
        currency: 'USD',
        licences: [{ id: 'lic-1', status: 'ACTIVE', createdAt: new Date('2026-01-01') }],
      });
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(detailRow);
    });

    it('ADMIN creates a user in their own account with role USER and isAdmin false', async () => {
      // accountId in the body is ignored for ADMIN — forced to the caller's account.
      const result = await service.create({ ...baseDto, accountId: 'acc-SOMEONE-ELSE' }, accountAdmin);

      expect(prisma.account.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'acc-1' } }),
      );
      expect(cognito.registerAdminUser).toHaveBeenCalledTimes(1);
      const data = prisma.user.create.mock.calls[0][0].data;
      expect(data).toEqual(expect.objectContaining({ licenceId: 'lic-1', role: UserRole.USER, isAdmin: false }));
      expect(result.account.id).toBe('acc-1');
      expect(JSON.stringify(result)).not.toContain('cognitoId');
    });

    it('rejects an ADMIN trying to assign GENERAL_ADMIN (no Cognito call)', async () => {
      await expect(
        service.create({ ...baseDto, role: UserRole.GENERAL_ADMIN }, accountAdmin),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(cognito.registerAdminUser).not.toHaveBeenCalled();
    });

    it('requires accountId when the caller is GENERAL_ADMIN', async () => {
      await expect(service.create(baseDto, generalAdmin)).rejects.toBeInstanceOf(BadRequestException);
      expect(cognito.registerAdminUser).not.toHaveBeenCalled();
    });

    it('deletes the Cognito user when the DB write fails (compensating action)', async () => {
      prisma.user.create.mockRejectedValueOnce(new Error('db down'));
      await expect(service.create(baseDto, accountAdmin)).rejects.toThrow('db down');
      expect(cognito.deleteUser).toHaveBeenCalledWith('New@Test.com');
    });
  });

  describe('update', () => {
    it('rejects updating a user outside the ADMIN caller account (NotFound)', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u9', email: 'u9@test.com', licence: { accountId: 'acc-OTHER' },
      });
      await expect(service.update('u9', { username: 'x' }, accountAdmin)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('resets the password via Cognito admin flow when newPassword is provided', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1', email: 'u1@test.com', licence: { accountId: 'acc-1' },
      });
      prisma.user.update.mockResolvedValue({
        id: 'u1', email: 'u1@test.com', username: 'u1', role: UserRole.USER, state: 'ACTIVE',
        licence: { account: { id: 'acc-1', denomination: 'Acme', category: 'A' } },
      });

      await service.update('u1', { username: 'u1-new', newPassword: 'NewPass123!' }, generalAdmin);

      expect(cognito.adminSetPassword).toHaveBeenCalledWith('u1@test.com', 'NewPass123!');
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'u1' }, data: { username: 'u1-new' } }),
      );
    });
  });
});
