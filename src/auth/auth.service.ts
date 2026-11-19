import { Injectable } from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import { AccountCategory, AccountStatus, UserRole } from '@prisma/client';
import { BusinessErrorCode, BusinessException } from '../common/exceptions/business.exception';
import {
  Channel,
  CHANNEL_ALLOWED_CATEGORIES,
  CHANNEL_ALLOWED_ROLES,
} from '../common/enums/channel.enum';
import { CognitoService, AuthTokens, isAuthChallenge } from '../cognito/cognito.service';
import { parseChannel } from '../cognito/cognito-clients';
import { PrismaService } from '../prisma/prisma.service';
import { LoginRequestDto } from './dto/login.request.dto';
import { LoginResponseDto, ChallengeResponseDto } from './dto/login.response.dto';
import { NewPasswordRequestDto } from './dto/new-password.request.dto';
import { ChangePasswordRequestDto } from './dto/change-password.request.dto';
import { ConfirmForgotPasswordRequestDto } from './dto/confirm-forgot-password.request.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly cognito: CognitoService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * The channel header picks the Cognito app client, so it is validated **before** calling
   * Cognito: the issued token is then bound to that channel through its signed client_id.
   */
  async login(dto: LoginRequestDto, channelHeader: string): Promise<LoginResponseDto | ChallengeResponseDto> {
    const channel = parseChannel(channelHeader);
    const result = await this.cognito.initiateAuth(dto.email.toLowerCase(), dto.password, channel);

    if (isAuthChallenge(result)) {
      return {
        challengeName: result.challengeName,
        session:       result.session,
        email:         dto.email.toLowerCase(),
      };
    }

    return this.buildLoginResponse(dto.email.toLowerCase(), result, channel);
  }

  async completeNewPassword(dto: NewPasswordRequestDto, channelHeader: string): Promise<LoginResponseDto> {
    const channel = parseChannel(channelHeader);
    const tokens = await this.cognito.respondToNewPasswordChallenge(
      dto.session,
      dto.email.toLowerCase(),
      dto.newPassword,
      channel,
    );
    return this.buildLoginResponse(dto.email.toLowerCase(), tokens, channel);
  }

  /** Without a channel header the shared default client is used (legacy clients). */
  async refresh(refreshToken: string, channelHeader?: string): Promise<AuthTokens> {
    return this.cognito.refreshAccessToken(refreshToken, parseChannel(channelHeader, false));
  }

  async logout(email: string): Promise<void> {
    await this.cognito.globalSignOut(email);
  }

  async changePassword(accessToken: string, dto: ChangePasswordRequestDto): Promise<void> {
    await this.cognito.changePassword(accessToken, dto.currentPassword, dto.newPassword);
  }

  async forgotPassword(email: string, channelHeader?: string) {
    return this.cognito.forgotPassword(email, parseChannel(channelHeader, false));
  }

  async confirmForgotPassword(dto: ConfirmForgotPasswordRequestDto, channelHeader?: string): Promise<void> {
    await this.cognito.confirmForgotPassword(
      dto.email,
      dto.code,
      dto.newPassword,
      parseChannel(channelHeader, false),
    );
  }

  async checkEmailExists(email: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true },
    });
    return !!user;
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  private async buildLoginResponse(
    email: string,
    tokens: AuthTokens,
    channel: Channel,
  ): Promise<LoginResponseDto> {
    const user = await this.prisma.user.findUnique({
      where:   { email },
      include: { licence: { include: { account: true } } },
    });

    if (!user) {
      throw new BusinessException(
        BusinessErrorCode.USER_NOT_FOUND,
        'Usuario no encontrado',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const account = user.licence.account;

    if (account.status !== AccountStatus.ACTIVE) {
      throw new BusinessException(
        BusinessErrorCode.ACCOUNT_INACTIVE,
        'La cuenta está inactiva — contactá a tu representante comercial',
        HttpStatus.FORBIDDEN,
      );
    }

    this.validateChannelAccess(channel, account.category, user.role);

    return {
      user: {
        id:          user.cognitoId,
        username:    user.username,
        email:       user.email,
        role:        user.role ?? 'USER',
        language:    user.language,
        photoName:   user.photoName ?? undefined,
        accountId:   account.id,
        accountName: account.denomination,
        countryCode: account.countryCode,
        currency:    user.currency ?? account.currency,
      },
      auth: tokens,
    };
  }

  /**
   * Ensures the account category and the user's role are allowed for the given channel.
   * Unknown or missing channels were already rejected by parseChannel().
   */
  private validateChannelAccess(
    channel: Channel,
    category: AccountCategory,
    role: UserRole | null,
  ): void {
    const allowedRoles = CHANNEL_ALLOWED_ROLES[channel];
    if (
      !CHANNEL_ALLOWED_CATEGORIES[channel].includes(category) ||
      (allowedRoles && (!role || !allowedRoles.includes(role)))
    ) {
      throw new BusinessException(
        BusinessErrorCode.ACCOUNT_CHANNEL_NOT_ALLOWED,
        'Tu cuenta no tiene acceso a esta aplicación',
        HttpStatus.FORBIDDEN,
      );
    }
  }
}
