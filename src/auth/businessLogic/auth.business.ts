import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { AccountCategory, AccountStatus, LicenceStatus, UserRole, UserState } from '@prisma/client';
import { BusinessErrorCode, BusinessException } from '../../common/exceptions/business.exception';
import { Channel, CHANNEL_ALLOWED_CATEGORIES, CHANNEL_ALLOWED_ROLES } from '../../common/enums/channel.enum';
import { AuthTokens } from '../../cognito/cognito.service';
import { CognitoClients } from '../../cognito/cognito-clients';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthRepository, LoginUser, SessionState } from '../auth.repository';
import { LoginResponseDto } from '../dto/login.response.dto';
import { isReplacedSession, readIssuedTokenClaims } from '../session';

/** Users in these states cannot log in nor keep using their tokens. */
const BLOCKED_USER_STATES: UserState[] = [UserState.INACTIVE, UserState.SUSPENDED, UserState.CANCELLED];

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Login rules on top of Cognito (KAN-66), ported from fieldpartner-auth:
 * - the account is ACTIVE and allowed in the channel; the user is not blocked;
 * - fieldpartner_front: the licence is in force and its seats (`activeUsersAllowed`) are not
 *   exceeded. The first login activates a PENDING user, taking a seat;
 * - fieldpartner_front: single session (see `../session.ts`).
 * Every check runs **after** Cognito accepted the password, so nothing about the account is
 * revealed to someone who does not know it.
 */
@Injectable()
export class AuthBusiness {
  private readonly logger = new Logger(AuthBusiness.name);
  private warnedNoSessionId = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly authRepository: AuthRepository,
    private readonly clients: CognitoClients,
  ) {}

  async completeLogin(email: string, tokens: AuthTokens, channel: Channel): Promise<LoginResponseDto> {
    const user = await this.authRepository.findLoginUser(email);
    if (!user) {
      throw new BusinessException(BusinessErrorCode.USER_NOT_FOUND, 'Usuario no encontrado', HttpStatus.UNAUTHORIZED);
    }
    const account = user.licence.account;

    if (account.status !== AccountStatus.ACTIVE) {
      throw new BusinessException(
        BusinessErrorCode.ACCOUNT_INACTIVE,
        'La cuenta está inactiva — contactá a tu representante comercial',
        HttpStatus.FORBIDDEN,
      );
    }
    this.assertChannelAccess(channel, account.category, user.role);
    if (BLOCKED_USER_STATES.includes(user.state)) {
      throw new BusinessException(
        BusinessErrorCode.USER_INACTIVE,
        'Tu usuario está inactivo — contactá al administrador de tu cuenta',
        HttpStatus.FORBIDDEN,
      );
    }

    const activate = user.state === UserState.PENDING;
    if (channel === Channel.FieldpartnerFront) {
      this.assertLicenceInForce(user.licence);
      const activeSessionId = this.sessionIdOf(tokens.accessToken);
      await this.prisma.$transaction(async (tx) => {
        // Two first logins at once must not both take the last seat.
        if (activate) await this.authRepository.lockLicence(user.licenceId, tx);
        const seats = (await this.authRepository.countActiveUsers(user.licenceId, tx)) + (activate ? 1 : 0);
        if (seats > user.licence.activeUsersAllowed) {
          throw new BusinessException(
            BusinessErrorCode.LICENCE_LIMIT_EXCEEDED,
            'La licencia no tiene más usuarios disponibles — contactá al administrador de tu cuenta',
            HttpStatus.FORBIDDEN,
          );
        }
        await this.authRepository.recordLogin(user.id, { activate, activeSessionId }, tx);
      });
    } else {
      await this.authRepository.recordLogin(user.id, { activate });
    }

    return this.toLoginResponse(user, tokens);
  }

  /**
   * Checks the session of a token that Cognito just issued from a refresh token: the user and
   * the account can still log in, and no newer login replaced the session.
   */
  async assertRenewable(tokens: AuthTokens): Promise<void> {
    const claims = readIssuedTokenClaims(tokens.accessToken);
    if (!claims.sub) return;
    await this.assertCurrentSession(
      claims.sub,
      claims.origin_jti,
      claims.client_id ? this.clients.channelOf(claims.client_id) : undefined,
    );
  }

  /**
   * Per-request check (JwtStrategy), on an already verified token. A user that only exists in
   * Cognito passes: the RolesGuard rejects it where a role is required.
   */
  async assertCurrentSession(cognitoId: string, sessionId: string | undefined, channel: Channel | undefined): Promise<void> {
    const state = await this.authRepository.findSessionState(cognitoId);
    if (!state) return;
    this.assertSessionState(state, sessionId, channel);
  }

  private assertSessionState(state: SessionState, sessionId: string | undefined, channel: Channel | undefined): void {
    // 401: the token is no longer usable, so the front ends the session and goes to the login.
    if (BLOCKED_USER_STATES.includes(state.state)) {
      throw new BusinessException(
        BusinessErrorCode.USER_INACTIVE,
        'Tu usuario está inactivo — contactá al administrador de tu cuenta',
        HttpStatus.UNAUTHORIZED,
      );
    }
    if (state.licence.account.status !== AccountStatus.ACTIVE) {
      throw new BusinessException(
        BusinessErrorCode.ACCOUNT_INACTIVE,
        'La cuenta está inactiva — contactá a tu representante comercial',
        HttpStatus.UNAUTHORIZED,
      );
    }
    if (isReplacedSession(state, sessionId, channel)) {
      throw new BusinessException(
        BusinessErrorCode.SESSION_REPLACED,
        'Se inició sesión con tu usuario en otro dispositivo',
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  /** `origin_jti` of a token Cognito just issued; null when the pool does not emit it. */
  private sessionIdOf(accessToken: string): string | null {
    const sessionId = readIssuedTokenClaims(accessToken).origin_jti ?? null;
    if (!sessionId && !this.warnedNoSessionId) {
      this.warnedNoSessionId = true;
      this.logger.warn(
        'Cognito access tokens have no origin_jti (token revocation is off): single session is not enforced',
      );
    }
    return sessionId;
  }

  /** The licence is ACTIVE and today is within its dates (the end date counts as a whole day). */
  private assertLicenceInForce(licence: LoginUser['licence']): void {
    const now = Date.now();
    const expired =
      licence.status !== LicenceStatus.ACTIVE || now >= licence.endDate.getTime() + DAY_MS;
    if (expired || now < licence.startDate.getTime()) {
      throw new BusinessException(
        BusinessErrorCode.LICENCE_EXPIRED,
        expired
          ? 'La licencia de la cuenta no está vigente — contactá a tu representante comercial'
          : 'La licencia de la cuenta todavía no está vigente',
        HttpStatus.FORBIDDEN,
      );
    }
  }

  /**
   * Ensures the account category and the user's role are allowed for the given channel.
   * Unknown or missing channels were already rejected by parseChannel().
   */
  private assertChannelAccess(channel: Channel, category: AccountCategory, role: UserRole | null): void {
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

  private toLoginResponse(user: LoginUser, tokens: AuthTokens): LoginResponseDto {
    const account = user.licence.account;
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
        accountLogo: account.company?.companyLogo ?? undefined,
        licenceId:   user.licenceId,
        countryCode: account.countryCode,
        currency:    user.currency ?? account.currency,
      },
      auth: tokens,
    };
  }
}
