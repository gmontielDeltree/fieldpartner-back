import { AccountCategory, Prisma, UserRole, UserState } from '@prisma/client';

/** A single user as exposed by the backoffice users listing. */
export interface UserSummaryDto {
  id: string;
  email: string;
  username: string;
  role: UserRole | null;
  state: UserState;
}

/** Users grouped under the account they belong to (via their licence). */
export interface AccountUsersDto {
  account: {
    id: string;
    denomination: string;
    category: AccountCategory;
  };
  users: UserSummaryDto[];
}

/** Safe single-user response (create/update) — no cognitoId / activeSessionId. */
export interface UserDetailDto {
  id: string;
  email: string;
  username: string;
  role: UserRole | null;
  state: UserState;
  account: { id: string; denomination: string; category: AccountCategory };
}

export const USER_DETAIL_SELECT = {
  id: true,
  email: true,
  username: true,
  role: true,
  state: true,
  licence: {
    select: {
      account: { select: { id: true, denomination: true, category: true } },
    },
  },
} as const;

export type UserDetailRaw = Prisma.UserGetPayload<{ select: typeof USER_DETAIL_SELECT }>;

export function toUserDetail(user: UserDetailRaw): UserDetailDto {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
    state: user.state,
    account: user.licence.account,
  };
}
