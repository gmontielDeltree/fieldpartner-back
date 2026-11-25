import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { HttpStatus, BadRequestException } from '@nestjs/common';
import { BusinessErrorCode, BusinessException } from '../common/exceptions/business.exception';
import { ConfigService } from '@nestjs/config';
import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminDeleteUserCommand,
  AdminSetUserPasswordCommand,
  AdminUpdateUserAttributesCommand,
  AdminInitiateAuthCommand,
  AdminRespondToAuthChallengeCommand,
  AdminUserGlobalSignOutCommand,
  InitiateAuthCommand,
  ChangePasswordCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
  ConfirmSignUpCommand,
  ResendConfirmationCodeCommand,
  UsernameExistsException,
  InvalidPasswordException,
  InvalidParameterException,
  NotAuthorizedException,
  UserNotFoundException,
  AttributeType,
  AuthenticationResultType,
} from '@aws-sdk/client-cognito-identity-provider';
import { Channel } from '../common/enums/channel.enum';
import { CognitoClients } from './cognito-clients';

export interface CognitoRegisterResult {
  cognitoId: string;
  email: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthChallenge {
  challengeName: 'NEW_PASSWORD_REQUIRED';
  session: string;
}

export type AuthResult = AuthTokens | AuthChallenge;

export function isAuthChallenge(result: AuthResult): result is AuthChallenge {
  return 'challengeName' in result;
}

/**
 * Maps Cognito's AuthenticationResult to our tokens, failing loudly if AWS returned an
 * incomplete result. `fallbackRefreshToken` covers REFRESH_TOKEN_AUTH, where Cognito does
 * not always rotate the refresh token.
 */
function toAuthTokens(
  result: AuthenticationResultType | undefined,
  fallbackRefreshToken?: string,
): AuthTokens {
  const accessToken = result?.AccessToken;
  const refreshToken = result?.RefreshToken ?? fallbackRefreshToken;
  const expiresIn = result?.ExpiresIn;
  if (!accessToken || !refreshToken || expiresIn === undefined) {
    throw new InternalServerErrorException('Respuesta de autenticación incompleta');
  }
  return { accessToken, refreshToken, expiresIn };
}

/** AWS SDK errors are classes, but matching by name also covers mocks and wrapped errors. */
const awsErrorName = (error: unknown): string | undefined =>
  error && typeof error === 'object' && 'name' in error ? String((error as { name: unknown }).name) : undefined;

const tooManyAttempts = () =>
  new BusinessException(
    BusinessErrorCode.TOO_MANY_ATTEMPTS,
    'Demasiados intentos: esperá unos minutos y volvé a probar',
    HttpStatus.TOO_MANY_REQUESTS,
  );

/**
 * Errors shared by the flows that take an emailed code (sign-up confirmation, password reset).
 * A user that does not exist gets the same answer as a wrong code, so the public endpoints do
 * not reveal which emails are registered. Returns undefined for errors the caller maps itself.
 */
function codeFlowError(error: unknown): BusinessException | undefined {
  switch (awsErrorName(error)) {
    case 'CodeMismatchException':
    case 'UserNotFoundException':
      return new BusinessException(BusinessErrorCode.INVALID_CODE, 'El código es incorrecto', HttpStatus.BAD_REQUEST);
    case 'ExpiredCodeException':
      return new BusinessException(
        BusinessErrorCode.CODE_EXPIRED,
        'El código venció: pedí uno nuevo',
        HttpStatus.BAD_REQUEST,
      );
    case 'LimitExceededException':
    case 'TooManyFailedAttemptsException':
    case 'TooManyRequestsException':
      return tooManyAttempts();
    default:
      return undefined;
  }
}

@Injectable()
export class CognitoService {
  private readonly client: CognitoIdentityProviderClient;
  private readonly userPoolId: string;
  private readonly clientId: string;

  constructor(
    private readonly config: ConfigService,
    private readonly clients: CognitoClients,
  ) {
    this.userPoolId = this.config.getOrThrow<string>('AWS_COGNITO_USER_POOL_ID');
    this.clientId   = this.config.getOrThrow<string>('AWS_COGNITO_CLIENT_ID');

    this.client = new CognitoIdentityProviderClient({
      region: this.config.getOrThrow<string>('AWS_REGION'),
      credentials: {
        accessKeyId:     this.config.getOrThrow<string>('AWS_ACCESSKEYID'),
        secretAccessKey: this.config.getOrThrow<string>('AWS_SECRETACCESSKEY'),
      },
    });
  }

  /** App client for the channel; the shared default when no channel is given. */
  private clientIdFor(channel?: Channel): string {
    return channel ? this.clients.clientIdFor(channel) : this.clientId;
  }

  // ─── Registration ───────────────────────────────────────────────────────────

  /**
   * Registers a user via server-side AdminCreateUser.
   * User is created with FORCE_CHANGE_PASSWORD status — must change password on first login.
   */
  async registerAdminUser(params: {
    email: string;
    username: string;
    password: string;
    language?: string;
    photoUrl?: string;
  }): Promise<CognitoRegisterResult> {
    const userAttributes: AttributeType[] = [
      { Name: 'email',          Value: params.email },
      { Name: 'email_verified', Value: 'true' },
      { Name: 'name',           Value: params.username },
    ];

    if (params.language) {
      userAttributes.push({ Name: 'locale', Value: params.language });
    }

    if (params.photoUrl) {
      userAttributes.push({ Name: 'picture', Value: params.photoUrl });
    }

    try {
      const createResult = await this.client.send(
        new AdminCreateUserCommand({
          UserPoolId:        this.userPoolId,
          Username:          params.email,
          TemporaryPassword: params.password,
          UserAttributes:    userAttributes,
          MessageAction:     'SUPPRESS',
        }),
      );

      const cognitoId = createResult.User?.Attributes?.find(
        (a) => a.Name === 'sub',
      )?.Value;

      if (!cognitoId) {
        throw new InternalServerErrorException('Cognito did not return a user sub');
      }

      return { cognitoId, email: params.email };
    } catch (error) {
      if (error instanceof UsernameExistsException) {
        throw new BusinessException(
          BusinessErrorCode.EMAIL_ALREADY_REGISTERED,
          `El email ${params.email} ya está registrado en el sistema`,
          HttpStatus.CONFLICT,
        );
      }
      if (error instanceof InvalidPasswordException) {
        throw new BusinessException(
          BusinessErrorCode.PASSWORD_POLICY_VIOLATION,
          'La contraseña no cumple los requisitos: mínimo 8 caracteres, mayúsculas, minúsculas, números y símbolos',
          HttpStatus.BAD_REQUEST,
        );
      }
      if (error instanceof InvalidParameterException) {
        throw new BusinessException(
          BusinessErrorCode.VALIDATION_ERROR,
          `Parámetro inválido al registrar el usuario: ${error.message}`,
          HttpStatus.BAD_REQUEST,
        );
      }
      throw new InternalServerErrorException(`Cognito registration failed: ${error.message}`);
    }
  }

  // ─── Authentication ──────────────────────────────────────────────────────────

  /**
   * Initiates auth with ADMIN_USER_PASSWORD_AUTH (server-side, no SRP).
   * Returns tokens on success, or a challenge descriptor when FORCE_CHANGE_PASSWORD.
   */
  async initiateAuth(email: string, password: string, channel?: Channel): Promise<AuthResult> {
    try {
      const result = await this.client.send(
        new AdminInitiateAuthCommand({
          UserPoolId: this.userPoolId,
          ClientId:   this.clientIdFor(channel),
          AuthFlow:   'ADMIN_USER_PASSWORD_AUTH',
          AuthParameters: {
            USERNAME: email,
            PASSWORD: password,
          },
        }),
      );

      if (result.ChallengeName === 'NEW_PASSWORD_REQUIRED') {
        if (!result.Session) {
          throw new InternalServerErrorException('Respuesta de autenticación incompleta');
        }
        return { challengeName: 'NEW_PASSWORD_REQUIRED', session: result.Session };
      }

      return toAuthTokens(result.AuthenticationResult);
    } catch (error) {
      if (error instanceof NotAuthorizedException || error instanceof UserNotFoundException) {
        throw new BusinessException(
          BusinessErrorCode.INVALID_CREDENTIALS,
          'Credenciales inválidas',
          HttpStatus.UNAUTHORIZED,
        );
      }
      // Only reachable with the right password: Cognito checks it before these states.
      switch (awsErrorName(error)) {
        case 'UserNotConfirmedException':
          throw new BusinessException(
            BusinessErrorCode.USER_NOT_CONFIRMED,
            'Tenés que confirmar tu email antes de ingresar: revisá el código que te enviamos',
            HttpStatus.FORBIDDEN,
          );
        case 'PasswordResetRequiredException':
          throw new BusinessException(
            BusinessErrorCode.PASSWORD_RESET_REQUIRED,
            'Tenés que restablecer tu contraseña: usá "Olvidé mi contraseña"',
            HttpStatus.FORBIDDEN,
          );
        case 'TooManyRequestsException':
          throw tooManyAttempts();
      }
      throw new InternalServerErrorException(`Auth failed: ${error.message}`);
    }
  }

  /**
   * Resolves the NEW_PASSWORD_REQUIRED challenge — called after the first login
   * when the user must set a permanent password.
   */
  async respondToNewPasswordChallenge(
    session: string,
    email: string,
    newPassword: string,
    channel?: Channel,
  ): Promise<AuthTokens> {
    try {
      const result = await this.client.send(
        new AdminRespondToAuthChallengeCommand({
          UserPoolId:    this.userPoolId,
          ClientId:      this.clientIdFor(channel),
          ChallengeName: 'NEW_PASSWORD_REQUIRED',
          Session:       session,
          ChallengeResponses: {
            USERNAME:     email,
            NEW_PASSWORD: newPassword,
          },
        }),
      );

      return toAuthTokens(result.AuthenticationResult);
    } catch (error) {
      if (error instanceof BusinessException || error instanceof InternalServerErrorException) throw error;
      switch (awsErrorName(error)) {
        case 'InvalidPasswordException':
          throw new BusinessException(
            BusinessErrorCode.PASSWORD_POLICY_VIOLATION,
            'La nueva contraseña no cumple los requisitos de seguridad',
            HttpStatus.BAD_REQUEST,
          );
        // The login session of the challenge lasts a few minutes and is single-use.
        case 'NotAuthorizedException':
        case 'CodeMismatchException':
        case 'ExpiredCodeException':
          throw new BusinessException(
            BusinessErrorCode.CHALLENGE_EXPIRED,
            'Venció el tiempo para crear la contraseña: volvé a iniciar sesión',
            HttpStatus.BAD_REQUEST,
          );
        case 'LimitExceededException':
        case 'TooManyRequestsException':
          throw tooManyAttempts();
        default:
          throw new InternalServerErrorException(`New password challenge failed: ${awsErrorName(error)}`);
      }
    }
  }

  /**
   * Refreshes the access token using a valid refresh token.
   * Cognito does not always rotate the refresh token, so the original is preserved if absent.
   */
  async refreshAccessToken(refreshToken: string, channel?: Channel): Promise<AuthTokens> {
    try {
      const result = await this.client.send(
        new InitiateAuthCommand({
          // A refresh token only works with the app client that issued it.
          ClientId: this.clientIdFor(channel),
          AuthFlow: 'REFRESH_TOKEN_AUTH',
          AuthParameters: {
            REFRESH_TOKEN: refreshToken,
          },
        }),
      );

      return toAuthTokens(result.AuthenticationResult, refreshToken);
    } catch (error) {
      if (error instanceof NotAuthorizedException) {
        throw new BusinessException(
          BusinessErrorCode.TOKEN_EXPIRED,
          'Refresh token inválido o expirado',
          HttpStatus.UNAUTHORIZED,
        );
      }
      throw new InternalServerErrorException(`Token refresh failed: ${error.message}`);
    }
  }

  /** Invalidates all active tokens for the user across all devices. */
  async globalSignOut(email: string): Promise<void> {
    try {
      await this.client.send(
        new AdminUserGlobalSignOutCommand({
          UserPoolId: this.userPoolId,
          Username:   email,
        }),
      );
    } catch {
      // best-effort — don't fail logout if Cognito is unreachable
    }
  }

  /** Changes the user's password using the current access token (user must be authenticated). */
  async changePassword(
    accessToken: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    try {
      await this.client.send(
        new ChangePasswordCommand({
          AccessToken:       accessToken,
          PreviousPassword:  currentPassword,
          ProposedPassword:  newPassword,
        }),
      );
    } catch (error) {
      if (error instanceof NotAuthorizedException) {
        throw new BusinessException(
          BusinessErrorCode.INVALID_CREDENTIALS,
          'Contraseña actual incorrecta',
          HttpStatus.BAD_REQUEST,
        );
      }
      if (error instanceof InvalidPasswordException) {
        throw new BusinessException(
          BusinessErrorCode.PASSWORD_POLICY_VIOLATION,
          'La nueva contraseña no cumple los requisitos de seguridad',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw new InternalServerErrorException(
        `Change password failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Sends a password reset code to the user's email. An unknown email gets the same answer as
   * a known one (no `destination`), so this public endpoint does not list registered emails.
   */
  async forgotPassword(
    email: string,
    channel?: Channel,
  ): Promise<{ message: string; destination?: string }> {
    const message = 'Si el email está registrado, te enviamos un código para restablecer la contraseña';
    try {
      const result = await this.client.send(
        new ForgotPasswordCommand({
          ClientId: this.clientIdFor(channel),
          Username:  email,
        }),
      );

      return { message, destination: result.CodeDeliveryDetails?.Destination };
    } catch (error) {
      if (awsErrorName(error) === 'UserNotFoundException') return { message };
      const known = codeFlowError(error);
      if (known) throw known;
      if (error instanceof InvalidParameterException) {
        // Cognito only resets passwords through a verified email.
        throw new BusinessException(
          BusinessErrorCode.EMAIL_NOT_VERIFIED,
          'Tu email no está verificado: pedile al administrador de tu cuenta que lo revise',
          HttpStatus.BAD_REQUEST,
        );
      }
      if (error instanceof NotAuthorizedException) {
        // e.g. FORCE_CHANGE_PASSWORD: the user never set a password of their own.
        throw new BusinessException(
          BusinessErrorCode.PASSWORD_RESET_REQUIRED,
          'Todavía no definiste tu contraseña: ingresá con la contraseña temporal que te dieron',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw new InternalServerErrorException(`Forgot password failed: ${error.message}`);
    }
  }

  /** Confirms the password reset using the code received by email. */
  async confirmForgotPassword(
    email: string,
    code: string,
    newPassword: string,
    channel?: Channel,
  ): Promise<void> {
    try {
      await this.client.send(
        new ConfirmForgotPasswordCommand({
          ClientId:         this.clientIdFor(channel),
          Username:          email,
          ConfirmationCode:  code,
          Password:          newPassword,
        }),
      );
    } catch (error) {
      const known = codeFlowError(error);
      if (known) throw known;
      if (error instanceof InvalidPasswordException) {
        throw new BusinessException(
          BusinessErrorCode.PASSWORD_POLICY_VIOLATION,
          'La nueva contraseña no cumple los requisitos de seguridad',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw new BadRequestException(`Confirm forgot password failed: ${error.message}`);
    }
  }

  // ─── Email confirmation (users created with SignUp, status UNCONFIRMED) ─────
  // Users created by the back (AdminCreateUser) are confirmed already; these flows serve the
  // Cognito users that were registered with SignUp and never confirmed their email. Login
  // answers USER_NOT_CONFIRMED for them.

  /** Confirms the user's email with the code Cognito sent. */
  async confirmSignUp(email: string, code: string, channel?: Channel): Promise<void> {
    try {
      await this.client.send(
        new ConfirmSignUpCommand({
          ClientId:         this.clientIdFor(channel),
          Username:         email,
          ConfirmationCode: code,
        }),
      );
    } catch (error) {
      const known = codeFlowError(error);
      if (known) throw known;
      if (error instanceof NotAuthorizedException) {
        // "User cannot be confirmed. Current status is CONFIRMED"
        throw new BusinessException(
          BusinessErrorCode.USER_ALREADY_CONFIRMED,
          'Tu email ya está confirmado: iniciá sesión',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw new InternalServerErrorException(`Confirm sign-up failed: ${error.message}`);
    }
  }

  /** Sends the email confirmation code again. Unknown emails get the same answer. */
  async resendConfirmationCode(
    email: string,
    channel?: Channel,
  ): Promise<{ message: string; destination?: string }> {
    const message = 'Si el email está registrado y sin confirmar, te enviamos un código nuevo';
    try {
      const result = await this.client.send(
        new ResendConfirmationCodeCommand({
          ClientId: this.clientIdFor(channel),
          Username: email,
        }),
      );
      return { message, destination: result.CodeDeliveryDetails?.Destination };
    } catch (error) {
      if (awsErrorName(error) === 'UserNotFoundException') return { message };
      const known = codeFlowError(error);
      if (known) throw known;
      if (error instanceof InvalidParameterException) {
        // "User is already confirmed."
        throw new BusinessException(
          BusinessErrorCode.USER_ALREADY_CONFIRMED,
          'Tu email ya está confirmado: iniciá sesión',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw new InternalServerErrorException(`Resend confirmation code failed: ${error.message}`);
    }
  }

  /**
   * Admin password reset — sets a permanent password without knowing the current one.
   * Used by backoffice staff to reset a user's password (not self-service).
   */
  async adminSetPassword(email: string, newPassword: string): Promise<void> {
    try {
      await this.client.send(
        new AdminSetUserPasswordCommand({
          UserPoolId: this.userPoolId,
          Username:   email,
          Password:   newPassword,
          Permanent:  true,
        }),
      );
    } catch (error) {
      if (error instanceof InvalidPasswordException) {
        throw new BusinessException(
          BusinessErrorCode.PASSWORD_POLICY_VIOLATION,
          'La nueva contraseña no cumple los requisitos de seguridad',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw new InternalServerErrorException(
        `Admin set password failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // ─── Profile ──────────────────────────────────────────────────────────────

  async updateUserPhoto(email: string, photoUrl: string): Promise<void> {
    await this.client.send(
      new AdminUpdateUserAttributesCommand({
        UserPoolId:     this.userPoolId,
        Username:        email,
        UserAttributes: [{ Name: 'picture', Value: photoUrl }],
      }),
    );
  }

  async deleteUser(email: string): Promise<void> {
    try {
      await this.client.send(
        new AdminDeleteUserCommand({
          UserPoolId: this.userPoolId,
          Username:    email,
        }),
      );
    } catch {
      // best-effort cleanup — don't throw if user doesn't exist
    }
  }
}
