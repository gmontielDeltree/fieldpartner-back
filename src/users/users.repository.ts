import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { USER_DETAIL_SELECT } from './dto/account-users.dto';

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

  create(data: Prisma.UserUncheckedCreateInput) {
    return this.prisma.user.create({ data, select: USER_DETAIL_SELECT });
  }

  updateUsername(id: string, username?: string) {
    return this.prisma.user.update({
      where: { id },
      data: { ...(username !== undefined && { username }) },
      select: USER_DETAIL_SELECT,
    });
  }
}
