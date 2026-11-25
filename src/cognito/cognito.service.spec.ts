import {
  InvalidParameterException,
  NotAuthorizedException,
} from '@aws-sdk/client-cognito-identity-provider';
import { BusinessException } from '../common/exceptions/business.exception';
import { CognitoService } from './cognito.service';

/** An AWS SDK error as the client throws it (matched by name, like the real ones). */
const awsError = (name: string) => Object.assign(new Error(name), { name });

const sdkError = <T extends new (...args: any[]) => Error>(Type: T, message: string): InstanceType<T> =>
  new Type({ message, $metadata: {} }) as InstanceType<T>;

/** Error mapping of the code flows (KAN-66). The SDK client is mocked: nothing reaches AWS. */
describe('CognitoService error mapping', () => {
  let service: CognitoService;
  let send: jest.Mock;

  beforeEach(() => {
    const config = { getOrThrow: (key: string) => (key === 'AWS_REGION' ? 'us-east-1' : `test-${key}`) };
    const clients = { clientIdFor: () => 'front-client' };
    service = new CognitoService(config as any, clients as any);
    send = jest.fn();
    (service as any).client = { send };
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

  describe('login', () => {
    it.each([
      ['UserNotConfirmedException', 'USER_NOT_CONFIRMED', 403],
      ['PasswordResetRequiredException', 'PASSWORD_RESET_REQUIRED', 403],
      ['TooManyRequestsException', 'TOO_MANY_ATTEMPTS', 429],
    ])('%s → %s', async (name, code, status) => {
      send.mockRejectedValue(awsError(name));
      expect(await codeOf(service.initiateAuth('a@b.com', 'x', 'fieldpartner_front' as any))).toEqual({ code, status });
    });

    it('a wrong password stays INVALID_CREDENTIALS (401)', async () => {
      send.mockRejectedValue(sdkError(NotAuthorizedException, 'Incorrect username or password.'));
      expect(await codeOf(service.initiateAuth('a@b.com', 'x'))).toEqual({ code: 'INVALID_CREDENTIALS', status: 401 });
    });
  });

  describe('confirm (sign-up)', () => {
    it('sends the code with the channel app client', async () => {
      send.mockResolvedValue({});
      await service.confirmSignUp('a@b.com', '123456', 'fieldpartner_front' as any);
      expect(send.mock.calls[0][0].input).toEqual({ ClientId: 'front-client', Username: 'a@b.com', ConfirmationCode: '123456' });
    });

    it.each([
      ['CodeMismatchException', 'INVALID_CODE'],
      // an unknown email answers like a wrong code: the endpoint is public
      ['UserNotFoundException', 'INVALID_CODE'],
      ['ExpiredCodeException', 'CODE_EXPIRED'],
      ['LimitExceededException', 'TOO_MANY_ATTEMPTS'],
      ['TooManyFailedAttemptsException', 'TOO_MANY_ATTEMPTS'],
    ])('%s → %s', async (name, code) => {
      send.mockRejectedValue(awsError(name));
      expect((await codeOf(service.confirmSignUp('a@b.com', '1'))).code).toBe(code);
    });

    it('an already confirmed user → USER_ALREADY_CONFIRMED', async () => {
      send.mockRejectedValue(sdkError(NotAuthorizedException, 'User cannot be confirmed. Current status is CONFIRMED'));
      expect((await codeOf(service.confirmSignUp('a@b.com', '1'))).code).toBe('USER_ALREADY_CONFIRMED');
    });
  });

  describe('resend-verification-code', () => {
    it('an unknown email gets the same answer as a known one', async () => {
      send.mockRejectedValueOnce(awsError('UserNotFoundException'));
      const unknown = await service.resendConfirmationCode('nobody@b.com');
      send.mockResolvedValueOnce({ CodeDeliveryDetails: { Destination: 'a***@b.com' } });
      const known = await service.resendConfirmationCode('a@b.com');
      expect(unknown.message).toBe(known.message);
      expect(unknown.destination).toBeUndefined();
    });

    it('an already confirmed user → USER_ALREADY_CONFIRMED', async () => {
      send.mockRejectedValue(sdkError(InvalidParameterException, 'User is already confirmed.'));
      expect((await codeOf(service.resendConfirmationCode('a@b.com'))).code).toBe('USER_ALREADY_CONFIRMED');
    });
  });

  describe('forgot-password', () => {
    it('an unknown email gets the same answer as a known one', async () => {
      send.mockRejectedValueOnce(awsError('UserNotFoundException'));
      const unknown = await service.forgotPassword('nobody@b.com');
      send.mockResolvedValueOnce({ CodeDeliveryDetails: { Destination: 'a***@b.com' } });
      expect((await service.forgotPassword('a@b.com')).message).toBe(unknown.message);
    });

    it.each([
      [sdkError(InvalidParameterException, 'no registered/verified email'), 'EMAIL_NOT_VERIFIED'],
      [sdkError(NotAuthorizedException, 'User password cannot be reset in the current state.'), 'PASSWORD_RESET_REQUIRED'],
      [awsError('LimitExceededException'), 'TOO_MANY_ATTEMPTS'],
    ])('%s → %s', async (error, code) => {
      send.mockRejectedValue(error);
      expect((await codeOf(service.forgotPassword('a@b.com'))).code).toBe(code);
    });
  });

  describe('complete-new-password (NEW_PASSWORD_REQUIRED)', () => {
    it.each([
      ['InvalidPasswordException', 'PASSWORD_POLICY_VIOLATION', 400],
      // the challenge session lasts a few minutes and is single-use
      ['NotAuthorizedException', 'CHALLENGE_EXPIRED', 400],
      ['CodeMismatchException', 'CHALLENGE_EXPIRED', 400],
      ['ExpiredCodeException', 'CHALLENGE_EXPIRED', 400],
      ['TooManyRequestsException', 'TOO_MANY_ATTEMPTS', 429],
    ])('%s → %s', async (name, code, status) => {
      send.mockRejectedValue(awsError(name));
      expect(await codeOf(service.respondToNewPasswordChallenge('s', 'a@b.com', 'Secret123!'))).toEqual({ code, status });
    });

    it('an unknown AWS error is a 500 without the AWS message', async () => {
      send.mockRejectedValue(Object.assign(new Error('internal details'), { name: 'InternalErrorException' }));
      await expect(service.respondToNewPasswordChallenge('s', 'a@b.com', 'Secret123!')).rejects.toMatchObject({
        status: 500,
        message: expect.not.stringContaining('internal details'),
      });
    });
  });

  it('confirm-forgot-password maps a wrong or expired code', async () => {
    send.mockRejectedValueOnce(awsError('CodeMismatchException'));
    expect((await codeOf(service.confirmForgotPassword('a@b.com', '1', 'Secret123!'))).code).toBe('INVALID_CODE');
    send.mockRejectedValueOnce(awsError('ExpiredCodeException'));
    expect((await codeOf(service.confirmForgotPassword('a@b.com', '1', 'Secret123!'))).code).toBe('CODE_EXPIRED');
  });
});
