import { AccountCategory, UserRole } from '@prisma/client';
import { AccountBusiness } from './account.business';
import { BusinessException } from '../../common/exceptions/business.exception';
import { CreateAccountDto } from '../dto/create-account.dto';

/**
 * Unit tests for the account-creation orchestration.
 *
 * CognitoService is fully mocked, so these tests NEVER hit AWS — you can run the
 * creation flow as many times as you want without registering real Cognito users.
 */
describe('AccountBusiness.executeCreate', () => {
  let business: AccountBusiness;
  let prisma: any;
  let cognito: any;
  let tx: any;

  const dtoCatB = (): CreateAccountDto =>
    ({
      category: AccountCategory.B,
      denomination: 'Acme Fields',
      countryCode: 'AR',
      maxHectares: 100,
      licence: {
        licenceTypeId: 'lt-1',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        activeUsersAllowed: 5,
        amountLicencesAllowed: 10,
      },
      user: {
        email: 'New@Test.com',
        username: 'newuser',
        password: 'Secret123!',
        language: 'es',
      },
    } as CreateAccountDto);

  beforeEach(() => {
    tx = {
      account: {
        create: jest.fn().mockResolvedValue({ id: 'acc-1' }),
        // Shape matches ACCOUNT_DETAIL_SELECT so toAccountDetail() can map the result.
        findUnique: jest.fn().mockResolvedValue({
          id: 'acc-1',
          category: 'B',
          denomination: 'Acme Fields',
          countryCode: 'AR',
          currency: 'USD',
          status: 'ACTIVE',
          licenceNumber: null,
          isLicenceMultipleCountry: false,
          maxHectares: 100,
          maxFields: 0,
          countFields: 0,
          countLicences: 0,
          countHectares: 0,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          company: null,
          licences: [
            {
              id: 'lic-1',
              status: 'ACTIVE',
              startDate: new Date('2026-01-01T00:00:00.000Z'),
              endDate: new Date('2026-12-31T00:00:00.000Z'),
              activeUsersAllowed: 5,
              amountLicencesAllowed: 10,
              countryCode: 'AR',
              licenceType: { id: 'lt-1', label: 'C' },
              users: [
                { id: 'usr-1', email: 'new@test.com', username: 'newuser', role: 'ADMIN', state: 'PENDING' },
              ],
            },
          ],
        }),
      },
      licence: { create: jest.fn().mockResolvedValue({ id: 'lic-1' }) },
      user: { create: jest.fn().mockResolvedValue({ id: 'usr-1' }) },
      company: { create: jest.fn() },
      contractCorporate: { create: jest.fn() },
      companyContract: { create: jest.fn() },
    };

    prisma = {
      country: { findUnique: jest.fn().mockResolvedValue({ code: 'AR', currency: 'USD' }) },
      user: { findUnique: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn().mockImplementation(async (cb: any) => cb(tx)),
    };

    cognito = {
      registerAdminUser: jest.fn().mockResolvedValue({ cognitoId: 'cog-123', email: 'new@test.com' }),
      deleteUser: jest.fn().mockResolvedValue(undefined),
    };

    business = new AccountBusiness(prisma, cognito);
  });

  it('registers the Cognito user with the submitted credentials and persists the account (Cat B)', async () => {
    const result = await business.executeCreate(dtoCatB());

    expect(cognito.registerAdminUser).toHaveBeenCalledTimes(1);
    expect(cognito.registerAdminUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'New@Test.com',
        username: 'newuser',
        password: 'Secret123!',
        language: 'es',
      }),
    );

    expect(tx.licence.create).toHaveBeenCalledTimes(1);
    expect(tx.user.create).toHaveBeenCalledTimes(1);
    expect(tx.company.create).not.toHaveBeenCalled(); // company is Cat A only
    expect(cognito.deleteUser).not.toHaveBeenCalled();

    // Returns the mapped detail DTO (dates as ISO strings), not the raw entity.
    expect(result).toEqual(
      expect.objectContaining({ id: 'acc-1', denomination: 'Acme Fields', currency: 'USD' }),
    );
    expect(result.createdAt).toBe('2026-01-01T00:00:00.000Z');
    // Sensitive user columns must never leak through the response DTO.
    expect(JSON.stringify(result)).not.toContain('cognitoId');
    expect(JSON.stringify(result)).not.toContain('activeSessionId');
  });

  it('forces the created user role to ADMIN (role is never taken from the request)', async () => {
    await business.executeCreate(dtoCatB());

    const userData = tx.user.create.mock.calls[0][0].data;
    expect(userData.role).toBe(UserRole.ADMIN);
    expect(userData.cognitoId).toBe('cog-123');
  });

  it('deletes the Cognito user (compensating action) when the DB transaction fails', async () => {
    tx.account.create.mockRejectedValueOnce(new Error('db down'));

    await expect(business.executeCreate(dtoCatB())).rejects.toThrow('db down');

    expect(cognito.registerAdminUser).toHaveBeenCalledTimes(1);
    expect(cognito.deleteUser).toHaveBeenCalledWith('New@Test.com');
  });

  it('rejects with 409 and never calls Cognito when the email already exists locally', async () => {
    prisma.user.findUnique.mockResolvedValueOnce({ id: 'existing' });

    await expect(business.executeCreate(dtoCatB())).rejects.toBeInstanceOf(BusinessException);
    expect(cognito.registerAdminUser).not.toHaveBeenCalled();
  });

  it('rejects an unknown country code before touching Cognito or the DB', async () => {
    prisma.country.findUnique.mockResolvedValueOnce(null);

    await expect(business.executeCreate(dtoCatB())).rejects.toBeInstanceOf(BusinessException);
    expect(cognito.registerAdminUser).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
