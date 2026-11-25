import { AuthBusiness } from './auth.business';
import { BusinessException } from '../../common/exceptions/business.exception';
import { Channel } from '../../common/enums/channel.enum';

/** An access token as Cognito returns it; only the payload matters (it is not verified here). */
const issuedToken = (claims: Record<string, unknown>) =>
  `h.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.sig`;

const DAY = 24 * 60 * 60 * 1000;

describe('AuthBusiness (KAN-66)', () => {
  let business: AuthBusiness;
  let repo: any;
  let prisma: any;
  let clients: any;

  const tokens = (claims: Record<string, unknown> = { sub: 'cog-1', origin_jti: 'sess-new' }) => ({
    accessToken: issuedToken(claims),
    refreshToken: 'refresh-tok',
    expiresIn: 3600,
  });

  const loginUser = (over: Record<string, any> = {}) => ({
    id: 'usr-1',
    cognitoId: 'cog-1',
    username: 'owner',
    email: 'owner@test.com',
    role: 'ADMIN',
    state: 'ACTIVE',
    language: 'es',
    photoName: null,
    currency: null,
    licenceId: 'lic-1',
    menuPermissions: [{ menuModuleId: 3 }, { menuModuleId: 7 }],
    ...over,
    licence: {
      status: 'ACTIVE',
      startDate: new Date(Date.now() - 30 * DAY),
      endDate: new Date(Date.now() + 30 * DAY),
      activeUsersAllowed: 3,
      ...over.licence,
      account: {
        id: 'acc-1',
        status: 'ACTIVE',
        category: 'A',
        denomination: 'Acme',
        countryCode: 'AR',
        currency: 'USD',
        company: { companyLogo: 'logo.png' },
        ...over.account,
      },
    },
  });

  const sessionState = (over: Record<string, any> = {}) => ({
    activeSessionId: 'sess-current',
    role: 'USER',
    state: 'ACTIVE',
    licence: { account: { status: 'ACTIVE' } },
    ...over,
  });

  const codeOf = async (promise: Promise<unknown>) => {
    try {
      await promise;
    } catch (error) {
      expect(error).toBeInstanceOf(BusinessException);
      return { code: (error as BusinessException).code, status: (error as BusinessException).getStatus() };
    }
    throw new Error('expected a BusinessException');
  };

  beforeEach(() => {
    repo = {
      findLoginUser: jest.fn().mockResolvedValue(loginUser()),
      findSessionState: jest.fn().mockResolvedValue(sessionState()),
      lockLicence: jest.fn(),
      countActiveUsers: jest.fn().mockResolvedValue(1),
      recordLogin: jest.fn(),
    };
    prisma = { $transaction: jest.fn((fn: (tx: unknown) => unknown) => fn('tx')) };
    clients = { channelOf: jest.fn().mockReturnValue(undefined) };
    business = new AuthBusiness(prisma, repo, clients);
  });

  describe('completeLogin', () => {
    it('returns the profile with licenceId and accountLogo, and the tokens', async () => {
      const issued = tokens();
      const result = await business.completeLogin('owner@test.com', issued, Channel.FieldpartnerFront);

      expect(result.auth).toBe(issued);
      // KAN-57: the menus the user may open
      expect(result.menuIds).toEqual([3, 7]);
      expect(result.user).toEqual({
        id: 'cog-1',
        username: 'owner',
        email: 'owner@test.com',
        role: 'ADMIN',
        language: 'es',
        photoName: undefined,
        accountId: 'acc-1',
        accountName: 'Acme',
        accountLogo: 'logo.png',
        licenceId: 'lic-1',
        countryCode: 'AR',
        currency: 'USD',
      });
      // Never the internal ids of the session or the DB row.
      expect(JSON.stringify(result.user)).not.toMatch(/usr-1|sess-new/);
    });

    it('fieldpartner_front: stores the session of the new login (single session)', async () => {
      await business.completeLogin('owner@test.com', tokens(), Channel.FieldpartnerFront);
      expect(repo.recordLogin).toHaveBeenCalledWith('usr-1', { activate: false, activeSessionId: 'sess-new' }, 'tx');
    });

    it('fieldpartner_front without origin_jti (revocation off): stores no session', async () => {
      await business.completeLogin('owner@test.com', tokens({ sub: 'cog-1' }), Channel.FieldpartnerFront);
      expect(repo.recordLogin).toHaveBeenCalledWith('usr-1', { activate: false, activeSessionId: null }, 'tx');
    });

    it('backoffice: does not touch the front session nor the licence seats', async () => {
      repo.findLoginUser.mockResolvedValue(loginUser({ role: 'GENERAL_ADMIN' }));
      await business.completeLogin('owner@test.com', tokens(), Channel.Backoffice);
      expect(repo.recordLogin).toHaveBeenCalledWith('usr-1', { activate: false });
      expect(repo.countActiveUsers).not.toHaveBeenCalled();
    });

    it('the first login activates a PENDING user, taking a seat under a licence lock', async () => {
      repo.findLoginUser.mockResolvedValue(loginUser({ state: 'PENDING' }));
      repo.countActiveUsers.mockResolvedValue(2);
      await business.completeLogin('owner@test.com', tokens(), Channel.FieldpartnerFront);
      expect(repo.lockLicence).toHaveBeenCalledWith('lic-1', 'tx');
      expect(repo.recordLogin).toHaveBeenCalledWith('usr-1', { activate: true, activeSessionId: 'sess-new' }, 'tx');
    });

    it('rejects a PENDING user when the licence has no free seat', async () => {
      repo.findLoginUser.mockResolvedValue(loginUser({ state: 'PENDING' }));
      repo.countActiveUsers.mockResolvedValue(3);
      expect(await codeOf(business.completeLogin('owner@test.com', tokens(), Channel.FieldpartnerFront))).toEqual({
        code: 'LICENCE_LIMIT_EXCEEDED',
        status: 403,
      });
      expect(repo.recordLogin).not.toHaveBeenCalled();
    });

    it('an ACTIVE user already holds a seat: full licence still lets them in', async () => {
      repo.countActiveUsers.mockResolvedValue(3);
      await expect(business.completeLogin('owner@test.com', tokens(), Channel.FieldpartnerFront)).resolves.toBeDefined();
      expect(repo.lockLicence).not.toHaveBeenCalled();
    });

    it.each([
      ['a licence not ACTIVE', { status: 'SUSPENDED' }],
      ['an expired licence', { endDate: new Date(Date.now() - 2 * DAY) }],
      ['a licence that has not started', { startDate: new Date(Date.now() + DAY) }],
    ])('fieldpartner_front rejects %s', async (_label, licence) => {
      repo.findLoginUser.mockResolvedValue(loginUser({ licence }));
      expect(await codeOf(business.completeLogin('owner@test.com', tokens(), Channel.FieldpartnerFront))).toEqual({
        code: 'LICENCE_EXPIRED',
        status: 403,
      });
    });

    it('the licence end date counts as a whole day', async () => {
      repo.findLoginUser.mockResolvedValue(loginUser({ licence: { endDate: new Date(Date.now() - DAY / 2) } }));
      await expect(business.completeLogin('owner@test.com', tokens(), Channel.FieldpartnerFront)).resolves.toBeDefined();
    });

    it.each(['INACTIVE', 'SUSPENDED', 'CANCELLED'])('rejects a %s user', async (state) => {
      repo.findLoginUser.mockResolvedValue(loginUser({ state }));
      expect(await codeOf(business.completeLogin('owner@test.com', tokens(), Channel.FieldpartnerFront))).toEqual({
        code: 'USER_INACTIVE',
        status: 403,
      });
    });

    it('rejects an account that is not ACTIVE', async () => {
      repo.findLoginUser.mockResolvedValue(loginUser({ account: { status: 'SUSPENDED' } }));
      expect((await codeOf(business.completeLogin('owner@test.com', tokens(), Channel.FieldpartnerFront))).code).toBe(
        'ACCOUNT_INACTIVE',
      );
    });

    it('rejects a user that only exists in Cognito', async () => {
      repo.findLoginUser.mockResolvedValue(null);
      expect(await codeOf(business.completeLogin('owner@test.com', tokens(), Channel.FieldpartnerFront))).toEqual({
        code: 'USER_NOT_FOUND',
        status: 401,
      });
    });

    it.each(['ADMIN', 'USER', null])('rejects a %s user in the backoffice (GENERAL_ADMIN only)', async (role) => {
      repo.findLoginUser.mockResolvedValue(loginUser({ role }));
      expect((await codeOf(business.completeLogin('owner@test.com', tokens(), Channel.Backoffice))).code).toBe(
        'ACCOUNT_CHANNEL_NOT_ALLOWED',
      );
    });

    it('rejects a Cat A account in licence_front', async () => {
      expect((await codeOf(business.completeLogin('owner@test.com', tokens(), Channel.LicenceFront))).code).toBe(
        'ACCOUNT_CHANNEL_NOT_ALLOWED',
      );
    });
  });

  describe('single session per request', () => {
    it('rejects a front token of a replaced session with 401 SESSION_REPLACED', async () => {
      expect(await codeOf(business.assertCurrentSession('cog-1', 'sess-old', Channel.FieldpartnerFront))).toEqual({
        code: 'SESSION_REPLACED',
        status: 401,
      });
    });

    it('accepts the current session', async () => {
      await expect(business.assertCurrentSession('cog-1', 'sess-current', Channel.FieldpartnerFront)).resolves.toBeUndefined();
    });

    it('does not apply to backoffice or licence_front tokens', async () => {
      await expect(business.assertCurrentSession('cog-1', 'sess-old', Channel.Backoffice)).resolves.toBeUndefined();
      await expect(business.assertCurrentSession('cog-1', 'sess-old', Channel.LicenceFront)).resolves.toBeUndefined();
    });

    it('shared app client (unknown channel): applies to everyone but GENERAL_ADMIN', async () => {
      expect((await codeOf(business.assertCurrentSession('cog-1', 'sess-old', undefined))).code).toBe('SESSION_REPLACED');
      repo.findSessionState.mockResolvedValue(sessionState({ role: 'GENERAL_ADMIN' }));
      await expect(business.assertCurrentSession('cog-1', 'sess-old', undefined)).resolves.toBeUndefined();
    });

    it('no stored session or a token without origin_jti: nothing to compare', async () => {
      await expect(business.assertCurrentSession('cog-1', undefined, Channel.FieldpartnerFront)).resolves.toBeUndefined();
      repo.findSessionState.mockResolvedValue(sessionState({ activeSessionId: null }));
      await expect(business.assertCurrentSession('cog-1', 'sess-old', Channel.FieldpartnerFront)).resolves.toBeUndefined();
    });

    it('a deactivated user or account loses access on the next request (401)', async () => {
      repo.findSessionState.mockResolvedValue(sessionState({ state: 'SUSPENDED' }));
      expect(await codeOf(business.assertCurrentSession('cog-1', 'sess-current', Channel.Backoffice))).toEqual({
        code: 'USER_INACTIVE',
        status: 401,
      });
      repo.findSessionState.mockResolvedValue(sessionState({ licence: { account: { status: 'INACTIVE' } } }));
      expect((await codeOf(business.assertCurrentSession('cog-1', 'sess-current', Channel.Backoffice))).code).toBe(
        'ACCOUNT_INACTIVE',
      );
    });

    it('a user that only exists in Cognito passes (the RolesGuard decides)', async () => {
      repo.findSessionState.mockResolvedValue(null);
      await expect(business.assertCurrentSession('cog-x', 'sess-old', Channel.FieldpartnerFront)).resolves.toBeUndefined();
    });
  });

  describe('assertRenewable', () => {
    it('reads the renewed token: a replaced session cannot renew', async () => {
      clients.channelOf.mockReturnValue(Channel.FieldpartnerFront);
      const renewed = tokens({ sub: 'cog-1', origin_jti: 'sess-old', client_id: 'front-client' });
      expect((await codeOf(business.assertRenewable(renewed))).code).toBe('SESSION_REPLACED');
      expect(repo.findSessionState).toHaveBeenCalledWith('cog-1');
      expect(clients.channelOf).toHaveBeenCalledWith('front-client');
    });

    it('the current session renews', async () => {
      await expect(business.assertRenewable(tokens({ sub: 'cog-1', origin_jti: 'sess-current' }))).resolves.toBeUndefined();
    });
  });
});
