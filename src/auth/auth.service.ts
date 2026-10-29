import { Injectable } from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import { AccountStatus } from '@prisma/client';
import { BusinessErrorCode, BusinessException } from '../common/exceptions/business.exception';
import { CognitoService, AuthTokens, isAuthChallenge } from '../cognito/cognito.service';
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

  async login(dto: LoginRequestDto): Promise<LoginResponseDto | ChallengeResponseDto> {
    const result = await this.cognito.initiateAuth(dto.email.toLowerCase(), dto.password);

    if (isAuthChallenge(result)) {
      return {
        challengeName: result.challengeName,
        session:       result.session,
        email:         dto.email.toLowerCase(),
      };
    }

    return this.buildLoginResponse(dto.email.toLowerCase(), result);
  }

  async completeNewPassword(dto: NewPasswordRequestDto): Promise<LoginResponseDto> {
    const tokens = await this.cognito.respondToNewPasswordChallenge(
      dto.session,
      dto.email.toLowerCase(),
      dto.newPassword,
    );
    return this.buildLoginResponse(dto.email.toLowerCase(), tokens);
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    return this.cognito.refreshAccessToken(refreshToken);
  }

  async logout(email: string): Promise<void> {
    await this.cognito.globalSignOut(email);
  }

  async changePassword(accessToken: string, dto: ChangePasswordRequestDto): Promise<void> {
    await this.cognito.changePassword(accessToken, dto.currentPassword, dto.newPassword);
  }

  async forgotPassword(email: string) {
    return this.cognito.forgotPassword(email);
  }

  async confirmForgotPassword(dto: ConfirmForgotPasswordRequestDto): Promise<void> {
    await this.cognito.confirmForgotPassword(dto.email, dto.code, dto.newPassword);
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  private async buildLoginResponse(email: string, tokens: AuthTokens): Promise<LoginResponseDto> {
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
}
