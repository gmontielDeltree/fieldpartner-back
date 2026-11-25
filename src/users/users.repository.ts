import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { USER_DETAIL_SELECT, USER_WITH_PERMISSIONS_SELECT } from './dto/account-users.dto';

/** Lookup by email; `licence.accountId` is used for scoping and stripped before responding. */
export const USER_BY_EMAIL_SELECT = {
  id: true,
  email: true,
  username: true,
  role: true,
  state: true,
  licence: {
    select: {
      id: true,
      status: true,
      accountId: true,
      account: { select: { id: true, denomination: true, category: true } },
    },
  },
} as const;

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Users matching `where`, with their account, for the grouped listing. */
  findMany(where: Prisma.UserWhereInput) {
    return this.prisma.user.findMany({
      where,
      select: USER_DETAIL_SELECT,
      orderBy: { username: 'asc' },
    });
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: USER_BY_EMAIL_SELECT,
    });
  }

  existsByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true },
    });
  }

  /** Minimal data needed to authorize an operation on a user (scope check). */
  findScopeTarget(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, licence: { select: { accountId: true } } },
    });
  }

  /** A user with its menu permissions (`where` is unique: id or cognitoId). */
  findWithPermissions(where: Prisma.UserWhereUniqueInput) {
    return this.prisma.user.findUnique({ where, select: USER_WITH_PERMISSIONS_SELECT });
  }

  /** Which of `ids` exist in menu_modules. */
  async findExistingMenuIds(ids: number[]): Promise<number[]> {
    if (!ids.length) return [];
    const menus = await this.prisma.menuModule.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    return menus.map((menu) => menu.id);
  }

  /** Account currency and licences, used to attach a new user to the right licence. */
  findAccountForNewUser(accountId: string) {
    return this.prisma.account.findUnique({
      where: { id: accountId },
      select: {
        currency: true,
        licences: { select: { id: true, status: true, createdAt: true } },
      },
    });
  }

  /** Creates the user and its menu permissions in one statement. */
  create(data: Omit<Prisma.UserUncheckedCreateInput, 'menuPermissions'>, menuIds: number[] = []) {
    return this.prisma.user.create({
      data: {
        ...data,
        ...(menuIds.length && {
          menuPermissions: { createMany: { data: menuIds.map((menuModuleId) => ({ menuModuleId })) } },
        }),
      },
      select: USER_DETAIL_SELECT,
    });
  }

  updateUsername(id: string, username?: string) {
    return this.prisma.user.update({
      where: { id },
      data: { ...(username !== undefined && { username }) },
      select: USER_DETAIL_SELECT,
    });
  }

  /** Own profile (PATCH /users/me): only these columns. */
  updateProfile(cognitoId: string, data: { username?: string; language?: string; photoName?: string }) {
    return this.prisma.user.update({
      where: { cognitoId },
      data: {
        ...(data.username !== undefined && { username: data.username }),
        ...(data.language !== undefined && { language: data.language }),
        ...(data.photoName !== undefined && { photoName: data.photoName || null }),
      },
      select: USER_WITH_PERMISSIONS_SELECT,
    });
  }

  /** Replaces the whole permission set of a user (the front sends every checked menu). */
  async replaceMenuPermissions(userId: string, menuIds: number[]) {
    await this.prisma.$transaction([
      this.prisma.userMenuPermission.deleteMany({ where: { userId } }),
      this.prisma.userMenuPermission.createMany({
        data: menuIds.map((menuModuleId) => ({ userId, menuModuleId })),
        // Two saves at the same time must not fail with a primary-key conflict.
        skipDuplicates: true,
      }),
    ]);
    return this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: USER_WITH_PERMISSIONS_SELECT });
  }
}
