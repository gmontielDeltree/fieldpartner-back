import { AuthService } from './auth.service';
import { BusinessException } from '../common/exceptions/business.exception';
import { LoginRequestDto } from './dto/login.request.dto';

/**
 * AuthService is the facade: Cognito is mocked (no AWS call) and the login rules live in
 * AuthBusiness (see businessLogic/auth.business.spec.ts).
 */
describe('AuthService', () => {
  let service: AuthService;
  let cognito: any;
  let business: any;
  let repo: any;

  const tokens = { accessToken: 'access-tok', refreshToken: 'refresh-tok', expiresIn: 3600 };
  const dto = { email: 'Owner@Test.com', password: 'Secret123!' } as LoginRequestDto;

  beforeEach(() => {
    cognito = {
      initiateAuth: jest.fn().mockResolvedValue(tokens),
      respondToNewPasswordChallenge: jest.fn().mockResolvedValue(tokens),
      refreshAccessToken: jest.fn().mockResolvedValue(tokens),
      globalSignOut: jest.fn(),
      confirmSignUp: jest.fn(),
      resendConfirmationCode: jest.fn().mockResolvedValue({ message: 'ok' }),
      forgotPassword: jest.fn().mockResolvedValue({ message: 'ok' }),
    };
    business = {
      completeLogin: jest.fn().mockResolvedValue({ user: {}, auth: tokens }),
      assertRenewable: jest.fn(),
    };
    repo = { clearActiveSession: jest.fn(), existsByEmail: jest.fn() };
    service = new AuthService(cognito, business, repo);
  });

  it('login: the channel picks the app client and the business builds the session', async () => {
    await service.login(dto, 'fieldpartner_front');
    expect(cognito.initiateAuth).toHaveBeenCalledWith('owner@test.com', 'Secret123!', 'fieldpartner_front');
    expect(business.completeLogin).toHaveBeenCalledWith('owner@test.com', tokens, 'fieldpartner_front');
  });

  it('login: returns the challenge without building a session when Cognito asks for a new password', async () => {
    cognito.initiateAuth.mockResolvedValueOnce({ challengeName: 'NEW_PASSWORD_REQUIRED', session: 'sess-1' });
    await expect(service.login(dto, 'backoffice')).resolves.toEqual({
      challengeName: 'NEW_PASSWORD_REQUIRED',
      session: 'sess-1',
      email: 'owner@test.com',
    });
    expect(business.completeLogin).not.toHaveBeenCalled();
  });

  it('login: an unknown or missing channel is rejected before reaching Cognito', async () => {
    await expect(service.login(dto, 'bogus_channel')).rejects.toBeInstanceOf(BusinessException);
    await expect(service.login(dto, undefined as unknown as string)).rejects.toBeInstanceOf(BusinessException);
    expect(cognito.initiateAuth).not.toHaveBeenCalled();
  });

  it('completeNewPassword goes through the same login rules', async () => {
    await service.completeNewPassword({ email: 'A@B.com', session: 's', newPassword: 'Secret123!' }, 'fieldpartner_front');
    expect(business.completeLogin).toHaveBeenCalledWith('a@b.com', tokens, 'fieldpartner_front');
  });

  it('refresh: the renewed token is checked before it is returned', async () => {
    business.assertRenewable.mockRejectedValueOnce(new Error('SESSION_REPLACED'));
    await expect(service.refresh('refresh-tok', 'fieldpartner_front')).rejects.toThrow('SESSION_REPLACED');
    await expect(service.refresh('refresh-tok')).resolves.toBe(tokens);
    expect(cognito.refreshAccessToken).toHaveBeenLastCalledWith('refresh-tok', undefined);
  });

  it('logout: signs out of Cognito and ends only its own session', async () => {
    await service.logout({ cognitoId: 'cog-1', email: 'a@b.com', sessionId: 'sess-1' });
    expect(cognito.globalSignOut).toHaveBeenCalledWith('a@b.com');
    expect(repo.clearActiveSession).toHaveBeenCalledWith('cog-1', 'sess-1');

    repo.clearActiveSession.mockClear();
    await service.logout({ cognitoId: 'cog-1', email: 'a@b.com' });
    expect(repo.clearActiveSession).not.toHaveBeenCalled();
  });

  it('confirm and resend go to Cognito with the email in lower case', async () => {
    await service.confirmSignUp({ email: 'A@B.com', code: '123456' }, 'fieldpartner_front');
    expect(cognito.confirmSignUp).toHaveBeenCalledWith('a@b.com', '123456', 'fieldpartner_front');
    await service.resendVerificationCode('A@B.com');
    expect(cognito.resendConfirmationCode).toHaveBeenCalledWith('a@b.com', undefined);
  });
});
