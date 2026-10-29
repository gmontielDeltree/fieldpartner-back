import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { HttpStatus, BadRequestException } from '@nestjs/common';
import { BusinessErrorCode, BusinessException } from '../common/exceptions/business.exception';
import { ConfigService } from '@nestjs/config';
import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminDeleteUserCommand,
  AdminUpdateUserAttributesCommand,
  AdminInitiateAuthCommand,
  AdminRespondToAuthChallengeCommand,
  AdminUserGlobalSignOutCommand,
  InitiateAuthCommand,
  ChangePasswordCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
  UsernameExistsException,
  InvalidPasswordException,
  InvalidParameterException,
  NotAuthorizedException,
  UserNotFoundException,
  AttributeType,
} from '@aws-sdk/client-cognito-identity-provider';

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

@Injectable()
export class CognitoService {
  private readonly client: CognitoIdentityProviderClient;
  private readonly userPoolId: string;
  private readonly clientId: string;

  constructor(private readonly config: ConfigService) {
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
  async initiateAuth(email: string, password: string): Promise<AuthResult> {
    try {
      const result = await this.client.send(
        new AdminInitiateAuthCommand({
          UserPoolId: this.userPoolId,
          ClientId:   this.clientId,
          AuthFlow:   'ADMIN_USER_PASSWORD_AUTH',
          AuthParameters: {
            USERNAME: email,
            PASSWORD: password,
          },
        }),
      );

      if (result.ChallengeName === 'NEW_PASSWORD_REQUIRED') {
        return {
          challengeName: 'NEW_PASSWORD_REQUIRED',
          session:       result.Session!,
        };
      }

      return {
        accessToken:  result.AuthenticationResult!.AccessToken!,
        refreshToken: result.AuthenticationResult!.RefreshToken!,
        expiresIn:    result.AuthenticationResult!.ExpiresIn!,
      };
    } catch (error) {
      if (error instanceof NotAuthorizedException || error instanceof UserNotFoundException) {
        throw new BusinessException(
          BusinessErrorCode.INVALID_CREDENTIALS,
          'Credenciales inválidas',
          HttpStatus.UNAUTHORIZED,
        );
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
  ): Promise<AuthTokens> {
    try {
      const result = await this.client.send(
        new AdminRespondToAuthChallengeCommand({
          UserPoolId:    this.userPoolId,
          ClientId:      this.clientId,
          ChallengeName: 'NEW_PASSWORD_REQUIRED',
          Session:       session,
          ChallengeResponses: {
            USERNAME:     email,
            NEW_PASSWORD: newPassword,
          },
        }),
      );

      return {
        accessToken:  result.AuthenticationResult!.AccessToken!,
        refreshToken: result.AuthenticationResult!.RefreshToken!,
        expiresIn:    result.AuthenticationResult!.ExpiresIn!,
      };
    } catch (error) {
      throw new BadRequestException(`Challenge failed: ${error.message}`);
    }
  }

  /**
   * Refreshes the access token using a valid refresh token.
   * Cognito does not always rotate the refresh token, so the original is preserved if absent.
   */
  async refreshAccessToken(refreshToken: string): Promise<AuthTokens> {
    try {
      const result = await this.client.send(
        new InitiateAuthCommand({
          ClientId: this.clientId,
          AuthFlow: 'REFRESH_TOKEN_AUTH',
          AuthParameters: {
            REFRESH_TOKEN: refreshToken,
          },
        }),
      );

      return {
        accessToken:  result.AuthenticationResult!.AccessToken!,
        refreshToken: result.AuthenticationResult?.RefreshToken ?? refreshToken,
        expiresIn:    result.AuthenticationResult!.ExpiresIn!,
      };
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

  /** Sends a password reset code to the user's email. */
  async forgotPassword(email: string): Promise<{ message: string; destination?: string }> {
    try {
      const result = await this.client.send(
        new ForgotPasswordCommand({
          ClientId: this.clientId,
          Username:  email,
        }),
      );

      return {
        message:     'Código de recuperación enviado al email',
        destination: result.CodeDeliveryDetails?.Destination,
      };
    } catch (error) {
      throw new BadRequestException(`Forgot password failed: ${error.message}`);
    }
  }

  /** Confirms the password reset using the code received by email. */
  async confirmForgotPassword(
    email: string,
    code: string,
    newPassword: string,
  ): Promise<void> {
    try {
      await this.client.send(
        new ConfirmForgotPasswordCommand({
          ClientId:         this.clientId,
          Username:          email,
          ConfirmationCode:  code,
          Password:          newPassword,
        }),
      );
    } catch (error) {
      throw new BadRequestException(`Confirm forgot password failed: ${error.message}`);
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
