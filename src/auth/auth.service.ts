import { Injectable } from '@nestjs/common';
import { CognitoService, AuthTokens, isAuthChallenge } from '../cognito/cognito.service';
import { parseChannel } from '../cognito/cognito-clients';
import { AuthBusiness } from './businessLogic/auth.business';
import { AuthRepository } from './auth.repository';
import { LoginRequestDto } from './dto/login.request.dto';
import { LoginResponseDto, ChallengeResponseDto } from './dto/login.response.dto';
import { NewPasswordRequestDto } from './dto/new-password.request.dto';
import { ChangePasswordRequestDto } from './dto/change-password.request.dto';
import { ConfirmForgotPasswordRequestDto } from './dto/confirm-forgot-password.request.dto';
import { ConfirmSignUpRequestDto } from './dto/confirm-sign-up.request.dto';

/** The authenticated principal JwtStrategy puts on `req.user`. */
export interface AuthPrincipal {
  cognitoId: string;
  email: string;
  sessionId?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly cognito: CognitoService,
    private readonly authBusiness: AuthBusiness,
    private readonly authRepository: AuthRepository,
  ) {}

  /**
   * The channel header picks the Cognito app client, so it is validated **before** calling
   * Cognito: the issued token is then bound to that channel through its signed client_id.
   */
  async login(dto: LoginRequestDto, channelHeader: string): Promise<LoginResponseDto | ChallengeResponseDto> {
    const channel = parseChannel(channelHeader);
    const email = dto.email.toLowerCase();
    const result = await this.cognito.initiateAuth(email, dto.password, channel);

    if (isAuthChallenge(result)) {
      return { challengeName: result.challengeName, session: result.session, email };
    }
    return this.authBusiness.completeLogin(email, result, channel);
  }

  async completeNewPassword(dto: NewPasswordRequestDto, channelHeader: string): Promise<LoginResponseDto> {
    const channel = parseChannel(channelHeader);
    const email = dto.email.toLowerCase();
    const tokens = await this.cognito.respondToNewPasswordChallenge(dto.session, email, dto.newPassword, channel);
    return this.authBusiness.completeLogin(email, tokens, channel);
  }

  /**
   * Without a channel header the shared default client is used (legacy clients). The renewed
   * token is rejected if the user or account was deactivated or a newer login replaced it.
   */
  async refresh(refreshToken: string, channelHeader?: string): Promise<AuthTokens> {
    const tokens = await this.cognito.refreshAccessToken(refreshToken, parseChannel(channelHeader, false));
    await this.authBusiness.assertRenewable(tokens);
    return tokens;
  }

  /** Signs the user out of Cognito and ends the single session if it is this one. */
  async logout(principal: AuthPrincipal): Promise<void> {
    await this.cognito.globalSignOut(principal.email);
    if (principal.sessionId) await this.authRepository.clearActiveSession(principal.cognitoId, principal.sessionId);
  }

  async changePassword(accessToken: string, dto: ChangePasswordRequestDto): Promise<void> {
    await this.cognito.changePassword(accessToken, dto.currentPassword, dto.newPassword);
  }

  async forgotPassword(email: string, channelHeader?: string) {
    return this.cognito.forgotPassword(email.toLowerCase(), parseChannel(channelHeader, false));
  }

  async confirmForgotPassword(dto: ConfirmForgotPasswordRequestDto, channelHeader?: string): Promise<void> {
    await this.cognito.confirmForgotPassword(
      dto.email.toLowerCase(),
      dto.code,
      dto.newPassword,
      parseChannel(channelHeader, false),
    );
  }

  /**
   * Confirms the email of a user created with SignUp. It only confirms in Cognito: the user is
   * activated (and takes a licence seat) on the first login, like any other user.
   */
  async confirmSignUp(dto: ConfirmSignUpRequestDto, channelHeader?: string): Promise<void> {
    await this.cognito.confirmSignUp(dto.email.toLowerCase(), dto.code, parseChannel(channelHeader, false));
  }

  async resendVerificationCode(email: string, channelHeader?: string) {
    return this.cognito.resendConfirmationCode(email.toLowerCase(), parseChannel(channelHeader, false));
  }

  async checkEmailExists(email: string): Promise<boolean> {
    return this.authRepository.existsByEmail(email.toLowerCase());
  }
}
