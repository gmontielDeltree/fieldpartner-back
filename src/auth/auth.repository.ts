import { Injectable } from '@nestjs/common';
import { Prisma, UserState } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type Db = Prisma.TransactionClient | PrismaService;

/** What login needs about the user, its licence, its account and the account's company. */
export const LOGIN_USER_SELECT = {
  id:              true,
  cognitoId:       true,
  username:        true,
  email:           true,
  role:            true,
  state:           true,
  language:        true,
  photoName:       true,
  currency:        true,
  licenceId:       true,
  licence: {
    select: {
      status:             true,
      startDate:          true,
      endDate:            true,
      activeUsersAllowed: true,
      account: {
        select: {
          id:           true,
          status:       true,
          category:     true,
          denomination: true,
          countryCode:  true,
          currency:     true,
          company:      { select: { companyLogo: true } },
        },
      },
    },
  },
} satisfies Prisma.UserSelect;

export type LoginUser = Prisma.UserGetPayload<{ select: typeof LOGIN_USER_SELECT }>;

/** Per-request session check: one indexed lookup by cognitoId. */
export const SESSION_STATE_SELECT = {
  activeSessionId: true,
  role:            true,
  state:           true,
  licence:         { select: { account: { select: { status: true } } } },
} satisfies Prisma.UserSelect;

export type SessionState = Prisma.UserGetPayload<{ select: typeof SESSION_STATE_SELECT }>;

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  findLoginUser(email: string): Promise<LoginUser | null> {
    return this.prisma.user.findUnique({ where: { email }, select: LOGIN_USER_SELECT });
  }

  findSessionState(cognitoId: string): Promise<SessionState | null> {
    return this.prisma.user.findUnique({ where: { cognitoId }, select: SESSION_STATE_SELECT });
  }

  existsByEmail(email: string): Promise<boolean> {
    return this.prisma.user
      .findUnique({ where: { email }, select: { id: true } })
      .then((user) => !!user);
  }

  /** Serializes the logins that may take a seat of the licence (see AuthBusiness). */
  async lockLicence(licenceId: string, db: Db): Promise<void> {
    await db.$queryRaw`SELECT id FROM "licences" WHERE id = ${licenceId} FOR UPDATE`;
  }

  countActiveUsers(licenceId: string, db: Db = this.prisma): Promise<number> {
    return db.user.count({ where: { licenceId, state: UserState.ACTIVE } });
  }

  /**
   * Records a successful login: activates a PENDING user and, when the single-session rule
   * applies, stores the new session (`undefined` leaves the stored one as is).
   */
  async recordLogin(
    userId: string,
    data: { activate: boolean; activeSessionId?: string | null },
    db: Db = this.prisma,
  ): Promise<void> {
    if (!data.activate && data.activeSessionId === undefined) return;
    await db.user.update({
      where: { id: userId },
      data: {
        ...(data.activate && { state: UserState.ACTIVE }),
        ...(data.activeSessionId !== undefined && { activeSessionId: data.activeSessionId }),
      },
      select: { id: true },
    });
  }

  /** Ends the stored session only if it is still the given one (an old session cannot end a newer one). */
  async clearActiveSession(cognitoId: string, sessionId: string): Promise<void> {
    await this.prisma.user.updateMany({
      where: { cognitoId, activeSessionId: sessionId },
      data:  { activeSessionId: null },
    });
  }
}
