import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserRole, UserState } from '@prisma/client';
import { BusinessException } from '../../common/exceptions/business.exception';
import { Caller } from '../../auth/roles.guard';
import { UsersRepository } from '../users.repository';
import { UsersBusiness } from './users.business';

/** Deactivation and reactivation of users (KAN-68). Prisma and Cognito are mocked. */
describe('UsersBusiness — deactivation (KAN-68)', () => {
  let prisma: any;
  let cognito: any;
  let business: UsersBusiness;
  let calls: string[];

  const accountAdmin: Caller = { cognitoId: 'cog-admin', role: UserRole.ADMIN, accountId: 'acc-1' };
  const generalAdmin: Caller = { cognitoId: 'cog-ga', role: UserRole.GENERAL_ADMIN, accountId: null };

  const target = (over: Record<string, unknown> = {}) => ({
    id: 'usr-1',
    email: 'ana@test.com',
    cognitoId: 'cog-ana',
    role: UserRole.USER,
    state: UserState.ACTIVE,
    licence: { accountId: 'acc-1' },
    ...over,
  });
  const detail = (state: UserState) => ({
    id: 'usr-1',
    email: 'ana@test.com',
    username: 'Ana',
    role: UserRole.USER,
    state,
    language: 'es',
    photoName: null,
    licence: { account: { id: 'acc-1', denomination: 'Acme', category: 'A' } },
  });

  beforeEach(() => {
    calls = [];
    prisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn().mockImplementation(async ({ data }) => {
          calls.push(`db:${data.state}`);
          return detail(data.state);
        }),
      },
    };
    const track = (name: string) => jest.fn().mockImplementation(async () => { calls.push(name); });
    cognito = {
      adminDisableUser: track('cognito:disable'),
      adminEnableUser: track('cognito:enable'),
      globalSignOut: track('cognito:signOut'),
    };
    business = new UsersBusiness(new UsersRepository(prisma), cognito);
  });

  describe('deactivate', () => {
    it('blocks in Cognito, marks INACTIVE, ends the single session and signs out, in that order', async () => {
      prisma.user.findUnique.mockResolvedValue(target());

      const result = await business.executeDeactivate('usr-1', accountAdmin);

      expect(calls).toEqual(['cognito:disable', 'db:INACTIVE', 'cognito:signOut']);
      expect(cognito.adminDisableUser).toHaveBeenCalledWith('ana@test.com');
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'usr-1' }, data: { state: 'INACTIVE', activeSessionId: null } }),
      );
      expect(result.state).toBe('INACTIVE');
      expect(JSON.stringify(result)).not.toMatch(/cognitoId|activeSessionId/);
    });

    it('nobody deactivates itself (403, nothing touched)', async () => {
      prisma.user.findUnique.mockResolvedValue(target({ cognitoId: 'cog-admin', role: UserRole.ADMIN }));

      const error = await business.executeDeactivate('usr-1', accountAdmin).catch((e) => e);

      expect(error).toBeInstanceOf(BusinessException);
      expect(error.code).toBe('CANNOT_DEACTIVATE_SELF');
      expect(error.getStatus()).toBe(403);
      expect(calls).toEqual([]);
    });

    it('an ADMIN cannot deactivate a GENERAL_ADMIN of its account', async () => {
      prisma.user.findUnique.mockResolvedValue(target({ role: UserRole.GENERAL_ADMIN }));
      await expect(business.executeDeactivate('usr-1', accountAdmin)).rejects.toBeInstanceOf(ForbiddenException);
      expect(calls).toEqual([]);
    });

    it('an ADMIN cannot reach another account (404)', async () => {
      prisma.user.findUnique.mockResolvedValue(target({ licence: { accountId: 'acc-OTHER' } }));
      await expect(business.executeDeactivate('usr-1', accountAdmin)).rejects.toBeInstanceOf(NotFoundException);
      expect(calls).toEqual([]);
    });

    it('GENERAL_ADMIN may deactivate in any account', async () => {
      prisma.user.findUnique.mockResolvedValue(target({ licence: { accountId: 'acc-OTHER' } }));
      await expect(business.executeDeactivate('usr-1', generalAdmin)).resolves.toMatchObject({ state: 'INACTIVE' });
    });

    it('if the DB fails, Cognito is enabled again and the error goes up', async () => {
      prisma.user.findUnique.mockResolvedValue(target());
      prisma.user.update.mockRejectedValueOnce(new Error('db down'));

      await expect(business.executeDeactivate('usr-1', accountAdmin)).rejects.toThrow('db down');
      expect(calls).toEqual(['cognito:disable', 'cognito:enable']);
    });

    it('an already INACTIVE user is not re-enabled if the DB fails', async () => {
      prisma.user.findUnique.mockResolvedValue(target({ state: UserState.INACTIVE }));
      prisma.user.update.mockRejectedValueOnce(new Error('db down'));

      await expect(business.executeDeactivate('usr-1', accountAdmin)).rejects.toThrow('db down');
      expect(cognito.adminEnableUser).not.toHaveBeenCalled();
    });
  });

  describe('reactivate', () => {
    it('enables in Cognito and leaves the user PENDING (its next login takes a seat)', async () => {
      prisma.user.findUnique.mockResolvedValue(target({ state: UserState.INACTIVE }));

      const result = await business.executeReactivate('usr-1', accountAdmin);

      expect(calls).toEqual(['cognito:enable', 'db:PENDING']);
      expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({ data: { state: 'PENDING' } }));
      expect(result.state).toBe('PENDING');
    });

    it('an ACTIVE or PENDING user stays as it is', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce(target({ state: UserState.ACTIVE }))
        .mockResolvedValueOnce({ ...detail(UserState.ACTIVE), menuPermissions: [] });

      const result = await business.executeReactivate('usr-1', accountAdmin);

      expect(result.state).toBe('ACTIVE');
      expect(calls).toEqual([]);
    });

    it.each([UserState.SUSPENDED, UserState.CANCELLED])('a %s user cannot be reactivated here (409)', async (state) => {
      prisma.user.findUnique.mockResolvedValue(target({ state }));

      const error = await business.executeReactivate('usr-1', accountAdmin).catch((e) => e);

      expect(error.code).toBe('INVALID_USER_STATE');
      expect(error.getStatus()).toBe(409);
      expect(calls).toEqual([]);
    });

    it('if the DB fails, Cognito is disabled again', async () => {
      prisma.user.findUnique.mockResolvedValue(target({ state: UserState.INACTIVE }));
      prisma.user.update.mockRejectedValueOnce(new Error('db down'));

      await expect(business.executeReactivate('usr-1', accountAdmin)).rejects.toThrow('db down');
      expect(calls).toEqual(['cognito:enable', 'cognito:disable']);
    });

    it('another account is a 404', async () => {
      prisma.user.findUnique.mockResolvedValue(target({ state: UserState.INACTIVE, licence: { accountId: 'acc-OTHER' } }));
      await expect(business.executeReactivate('usr-1', accountAdmin)).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
