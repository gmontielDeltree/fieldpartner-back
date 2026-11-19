import { AuthService } from './auth.service';
import { BusinessException } from '../common/exceptions/business.exception';
import { LoginRequestDto } from './dto/login.request.dto';

/**
 * Unit tests for login. CognitoService is mocked, so no real auth call is made.
 * Covers the channel-access authorization added in the security pass.
 */
describe('AuthService.login', () => {
  let service: AuthService;
  let cognito: any;
  let prisma: any;

  const tokens = { accessToken: 'access-tok', refreshToken: 'refresh-tok', expiresIn: 3600 };

  const userWith = (category: string, status = 'ACTIVE', role: string | null = 'GENERAL_ADMIN') => ({
    cognitoId: 'cog-1',
    username: 'owner',
    email: 'owner@test.com',
    role,
    language: 'es',
    photoName: null,
    currency: null,
    licence: {
      account: {
        id: 'acc-1',
        status,
        category,
        denomination: 'Acme',
        countryCode: 'AR',
        currency: 'USD',
      },
    },
  });

  const dto: LoginRequestDto = { email: 'Owner@Test.com', password: 'Secret123!' } as LoginRequestDto;

  beforeEach(() => {
    cognito = {
      initiateAuth: jest.fn().mockResolvedValue(tokens),
    };
    prisma = {
      user: { findUnique: jest.fn() },
    };
    service = new AuthService(cognito, prisma);
  });

  it('returns user profile + tokens for an allowed channel/category (backoffice + Cat A)', async () => {
    prisma.user.findUnique.mockResolvedValue(userWith('A'));

    const result: any = await service.login(dto, 'backoffice');

    // The channel selects the Cognito app client the token is issued for.
    expect(cognito.initiateAuth).toHaveBeenCalledWith('owner@test.com', 'Secret123!', 'backoffice');
    expect(result.auth).toEqual(tokens);
    expect(result.user).toEqual(
      expect.objectContaining({ id: 'cog-1', email: 'owner@test.com', accountId: 'acc-1' }),
    );
  });

  it('returns the challenge descriptor without building a session when Cognito requires a new password', async () => {
    cognito.initiateAuth.mockResolvedValueOnce({ challengeName: 'NEW_PASSWORD_REQUIRED', session: 'sess-1' });

    const result: any = await service.login(dto, 'backoffice');

    expect(result).toEqual({
      challengeName: 'NEW_PASSWORD_REQUIRED',
      session: 'sess-1',
      email: 'owner@test.com',
    });
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it.each(['ADMIN', 'USER', null])(
    'rejects a %s user logging in through the backoffice (GENERAL_ADMIN only)',
    async (role) => {
      prisma.user.findUnique.mockResolvedValue(userWith('A', 'ACTIVE', role));
      await expect(service.login(dto, 'backoffice')).rejects.toBeInstanceOf(BusinessException);
    },
  );

  it('lets an account ADMIN log in through fieldpartner_front (no role restriction there)', async () => {
    prisma.user.findUnique.mockResolvedValue(userWith('A', 'ACTIVE', 'ADMIN'));
    const result: any = await service.login(dto, 'fieldpartner_front');
    expect(result.user.role).toBe('ADMIN');
  });

  it('rejects a Cat A account logging in through the licence_front channel', async () => {
    prisma.user.findUnique.mockResolvedValue(userWith('A'));

    await expect(service.login(dto, 'licence_front')).rejects.toBeInstanceOf(BusinessException);
  });

  it('rejects an unknown/missing channel', async () => {
    prisma.user.findUnique.mockResolvedValue(userWith('A'));

    await expect(service.login(dto, 'bogus_channel')).rejects.toBeInstanceOf(BusinessException);
    await expect(service.login(dto, undefined as unknown as string)).rejects.toBeInstanceOf(
      BusinessException,
    );
    // Rejected before reaching Cognito: no token is issued for an unknown channel.
    expect(cognito.initiateAuth).not.toHaveBeenCalled();
  });

  it('rejects login when the account is not ACTIVE', async () => {
    prisma.user.findUnique.mockResolvedValue(userWith('A', 'SUSPENDED'));

    await expect(service.login(dto, 'backoffice')).rejects.toBeInstanceOf(BusinessException);
  });
});
