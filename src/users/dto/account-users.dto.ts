import { AccountCategory, Prisma, UserRole, UserState } from '@prisma/client';

/** A single user as exposed by the users listing (backoffice and the front's Users section). */
export interface UserSummaryDto {
  id: string;
  email: string;
  username: string;
  role: UserRole | null;
  state: UserState;
  language: string;
  photoName: string | null;
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
export interface UserDetailDto extends UserSummaryDto {
  account: { id: string; denomination: string; category: AccountCategory };
}

/** A user with the menus it may open (detail, own profile and permissions screens, KAN-57). */
export interface UserWithPermissionsDto extends UserDetailDto {
  /** menu_modules ids, ascending. */
  menuIds: number[];
}

export const USER_DETAIL_SELECT = {
  id: true,
  email: true,
  username: true,
  role: true,
  state: true,
  language: true,
  photoName: true,
  licence: {
    select: {
      account: { select: { id: true, denomination: true, category: true } },
    },
  },
} as const;

export const USER_WITH_PERMISSIONS_SELECT = {
  ...USER_DETAIL_SELECT,
  menuPermissions: { select: { menuModuleId: true }, orderBy: { menuModuleId: 'asc' } },
} as const satisfies Prisma.UserSelect;

export type UserDetailRaw = Prisma.UserGetPayload<{ select: typeof USER_DETAIL_SELECT }>;
export type UserWithPermissionsRaw = Prisma.UserGetPayload<{ select: typeof USER_WITH_PERMISSIONS_SELECT }>;

export function toUserDetail(user: UserDetailRaw): UserDetailDto {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
    state: user.state,
    language: user.language,
    photoName: user.photoName,
    account: user.licence.account,
  };
}

export function toUserWithPermissions(user: UserWithPermissionsRaw): UserWithPermissionsDto {
  const { menuPermissions, ...detail } = user;
  return {
    ...toUserDetail(detail),
    menuIds: menuPermissions.map((permission) => permission.menuModuleId),
  };
}
