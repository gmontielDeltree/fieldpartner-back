import { NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { BusinessException } from '../../common/exceptions/business.exception';
import { Caller } from '../../auth/roles.guard';
import { UsersRepository } from '../users.repository';
import { UsersBusiness } from './users.business';

/** Menu permissions per user (KAN-57). Prisma and Cognito are mocked. */
describe('UsersBusiness — menu permissions (KAN-57)', () => {
  let prisma: any;
  let cognito: any;
  let business: UsersBusiness;

  const accountAdmin: Caller = { cognitoId: 'cog-admin', role: UserRole.ADMIN, accountId: 'acc-1' };
  const generalAdmin: Caller = { cognitoId: 'cog-ga', role: UserRole.GENERAL_ADMIN, accountId: null };
  const plainUser: Caller = { cognitoId: 'cog-user', role: UserRole.USER, accountId: 'acc-1' };

  const withPermissions = (menuIds: number[], over: Record<string, unknown> = {}) => ({
    id: 'usr-1',
    email: 'ana@test.com',
    username: 'Ana',
    role: UserRole.USER,
    state: 'ACTIVE',
    language: 'es',
    photoName: null,
    licence: { account: { id: 'acc-1', denomination: 'Acme', category: 'A' } },
    menuPermissions: menuIds.map((menuModuleId) => ({ menuModuleId })),
    ...over,
  });

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      account: { findUnique: jest.fn() },
      menuModule: { findMany: jest.fn() },
      userMenuPermission: {
        deleteMany: jest.fn().mockReturnValue('deleteMany'),
        createMany: jest.fn().mockReturnValue('createMany'),
      },
      $transaction: jest.fn().mockResolvedValue([]),
    };
    cognito = {
      registerAdminUser: jest.fn().mockResolvedValue({ cognitoId: 'cog-new' }),
      deleteUser: jest.fn(),
      adminSetPassword: jest.fn(),
    };
    business = new UsersBusiness(new UsersRepository(prisma), cognito);
  });

  const scopeTarget = (accountId: string) =>
    prisma.user.findUnique.mockResolvedValueOnce({ id: 'usr-1', email: 'ana@test.com', licence: { accountId } });
  const menusExist = (ids: number[]) => prisma.menuModule.findMany.mockResolvedValue(ids.map((id) => ({ id })));

  describe('replace', () => {
    it('replaces the whole set in one transaction, deduplicated and sorted', async () => {
      scopeTarget('acc-1');
      menusExist([3, 7, 151]);
      prisma.user.findUniqueOrThrow.mockResolvedValue(withPermissions([3, 7, 151]));

      const result = await business.executeReplacePermissions('usr-1', [151, 7, 3, 7], accountAdmin);

      expect(prisma.userMenuPermission.deleteMany).toHaveBeenCalledWith({ where: { userId: 'usr-1' } });
      expect(prisma.userMenuPermission.createMany).toHaveBeenCalledWith({
        data: [3, 7, 151].map((menuModuleId) => ({ userId: 'usr-1', menuModuleId })),
        skipDuplicates: true,
      });
      expect(prisma.$transaction).toHaveBeenCalledWith(['deleteMany', 'createMany']);
      expect(result.menuIds).toEqual([3, 7, 151]);
      expect(JSON.stringify(result)).not.toMatch(/cognitoId|activeSessionId|menuPermissions/);
    });

    it('an empty list removes every permission', async () => {
      scopeTarget('acc-1');
      prisma.user.findUniqueOrThrow.mockResolvedValue(withPermissions([]));

      const result = await business.executeReplacePermissions('usr-1', [], accountAdmin);

      expect(prisma.menuModule.findMany).not.toHaveBeenCalled();
      expect(prisma.userMenuPermission.createMany).toHaveBeenCalledWith({ data: [], skipDuplicates: true });
      expect(result.menuIds).toEqual([]);
    });

    it('an unknown menu id is a 400 that lists it, and nothing is written', async () => {
      scopeTarget('acc-1');
      menusExist([3]);

      const error = await business.executeReplacePermissions('usr-1', [3, 999], accountAdmin).catch((e) => e);

      expect(error).toBeInstanceOf(BusinessException);
      expect(error.code).toBe('INVALID_REFERENCE');
      expect(error.details).toEqual({ menuIds: [999] });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('an ADMIN cannot touch a user of another account (404, nothing written)', async () => {
      scopeTarget('acc-OTHER');

      await expect(business.executeReplacePermissions('usr-1', [3], accountAdmin)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('GENERAL_ADMIN may edit any account', async () => {
      scopeTarget('acc-OTHER');
      menusExist([3]);
      prisma.user.findUniqueOrThrow.mockResolvedValue(withPermissions([3]));

      await expect(business.executeReplacePermissions('usr-1', [3], generalAdmin)).resolves.toMatchObject({
        menuIds: [3],
      });
    });
  });

  describe('detail', () => {
    it('returns the user with its menu ids', async () => {
      scopeTarget('acc-1');
      prisma.user.findUnique.mockResolvedValueOnce(withPermissions([5, 9]));

      const result = await business.findOneWithPermissions('usr-1', accountAdmin);

      expect(result).toMatchObject({ id: 'usr-1', language: 'es', menuIds: [5, 9], account: { id: 'acc-1' } });
    });

    it('another account is a 404', async () => {
      scopeTarget('acc-OTHER');
      await expect(business.findOneWithPermissions('usr-1', accountAdmin)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('create with menus', () => {
    beforeEach(() => {
      prisma.account.findUnique.mockResolvedValue({
        currency: 'ARS',
        licences: [{ id: 'lic-1', status: 'ACTIVE', createdAt: new Date() }],
      });
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(withPermissions([]));
    });

    it('writes the permissions with the user', async () => {
      menusExist([3, 7]);

      await business.executeCreate(
        { email: 'Ana@Test.com', username: 'Ana', password: 'Temp123!', menuIds: [7, 3], photoName: 'ana.png' },
        accountAdmin,
      );

      const data = prisma.user.create.mock.calls[0][0].data;
      expect(data.email).toBe('ana@test.com');
      expect(data.photoName).toBe('ana.png');
      expect(data.menuPermissions).toEqual({
        createMany: { data: [{ menuModuleId: 3 }, { menuModuleId: 7 }] },
      });
    });

    it('an unknown menu id is rejected before creating the Cognito user', async () => {
      menusExist([3]);

      await expect(
        business.executeCreate({ email: 'a@b.com', username: 'A', password: 'Temp123!', menuIds: [3, 4] }, accountAdmin),
      ).rejects.toBeInstanceOf(BusinessException);
      expect(cognito.registerAdminUser).not.toHaveBeenCalled();
    });

    it('without menuIds the user starts with none', async () => {
      await business.executeCreate({ email: 'a@b.com', username: 'A', password: 'Temp123!' }, accountAdmin);
      expect(prisma.user.create.mock.calls[0][0].data.menuPermissions).toBeUndefined();
    });
  });

  describe('own profile (any role)', () => {
    it('GET me looks the caller up by its cognitoId', async () => {
      prisma.user.findUnique.mockResolvedValueOnce(withPermissions([1, 2]));

      const result = await business.findOwnProfile(plainUser);

      expect(prisma.user.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { cognitoId: 'cog-user' } }));
      expect(result.menuIds).toEqual([1, 2]);
    });

    it('PATCH me only writes name, language and photo; an empty photo clears it', async () => {
      prisma.user.findUnique.mockResolvedValueOnce(withPermissions([]));
      prisma.user.update.mockResolvedValue(withPermissions([], { username: 'Ana B', language: 'pt' }));

      await business.executeUpdateOwnProfile({ username: 'Ana B', language: 'pt', photoName: '' }, plainUser);

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { cognitoId: 'cog-user' },
          data: { username: 'Ana B', language: 'pt', photoName: null },
        }),
      );
    });

    it('a caller without a user row is a 404', async () => {
      prisma.user.findUnique.mockResolvedValueOnce(null);
      await expect(business.findOwnProfile(plainUser)).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
