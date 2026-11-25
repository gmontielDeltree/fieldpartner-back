import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { Caller } from '../auth/roles.guard';
import { AccountUsersDto, UserDetailDto, UserWithPermissionsDto } from './dto/account-users.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateOwnProfileDto } from './dto/update-own-profile.dto';
import { UsersBusiness } from './businessLogic/users.business';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly usersBusiness: UsersBusiness,
  ) {}

  /** Creates a user scoped to the caller (see `UsersBusiness.executeCreate`). */
  create(dto: CreateUserDto, caller: Caller): Promise<UserDetailDto> {
    return this.usersBusiness.executeCreate(dto, caller);
  }

  /** Updates username / resets password, scoped to the caller (see `UsersBusiness.executeUpdate`). */
  update(id: string, dto: UpdateUserDto, caller: Caller): Promise<UserDetailDto> {
    return this.usersBusiness.executeUpdate(id, dto, caller);
  }

  /** A user with its menu permissions, scoped to the caller. */
  findOne(id: string, caller: Caller): Promise<UserWithPermissionsDto> {
    return this.usersBusiness.findOneWithPermissions(id, caller);
  }

  /** Replaces the menus a user may open, scoped to the caller. */
  replacePermissions(id: string, menuIds: number[], caller: Caller): Promise<UserWithPermissionsDto> {
    return this.usersBusiness.executeReplacePermissions(id, menuIds, caller);
  }

  /** Deactivates a user (Cognito disabled, state INACTIVE), scoped to the caller. */
  deactivate(id: string, caller: Caller): Promise<UserDetailDto> {
    return this.usersBusiness.executeDeactivate(id, caller);
  }

  /** Reactivates an INACTIVE user (back to PENDING), scoped to the caller. */
  reactivate(id: string, caller: Caller): Promise<UserDetailDto> {
    return this.usersBusiness.executeReactivate(id, caller);
  }

  /** The caller's own user and permissions. */
  findMe(caller: Caller): Promise<UserWithPermissionsDto> {
    return this.usersBusiness.findOwnProfile(caller);
  }

  updateMe(dto: UpdateOwnProfileDto, caller: Caller): Promise<UserWithPermissionsDto> {
    return this.usersBusiness.executeUpdateOwnProfile(dto, caller);
  }

  /**
   * Lists users scoped to the caller:
   * - GENERAL_ADMIN  → every account's users
   * - ADMIN          → only the caller's own account
   * Any other role is rejected (the RolesGuard already blocks it; this is defence in depth).
   */
  async listForCaller(caller: Caller): Promise<AccountUsersDto[]> {
    if (caller.role === UserRole.GENERAL_ADMIN) {
      return this.groupByAccount({});
    }
    if (caller.role === UserRole.ADMIN) {
      if (!caller.accountId) return [];
      return this.groupByAccount({ licence: { accountId: caller.accountId } });
    }
    throw new ForbiddenException('Insufficient role for this resource');
  }

  /**
   * Looks up a user by email, scoped to the caller:
   * - GENERAL_ADMIN  → any user
   * - ADMIN          → only within their own account (otherwise treated as not found)
   */
  async findByEmailForCaller(email: string, caller: Caller) {
    const user = await this.usersRepository.findByEmail(email);
    if (!user) return null;

    if (caller.role !== UserRole.GENERAL_ADMIN && user.licence.accountId !== caller.accountId) {
      // Don't disclose the existence of users outside the caller's account.
      return null;
    }

    const { licence, ...rest } = user;
    return {
      ...rest,
      licence: { id: licence.id, status: licence.status, account: licence.account },
    };
  }

  private async groupByAccount(where: Prisma.UserWhereInput): Promise<AccountUsersDto[]> {
    const users = await this.usersRepository.findMany(where);

    const groups = new Map<string, AccountUsersDto>();
    for (const user of users) {
      const account = user.licence.account;
      let group = groups.get(account.id);
      if (!group) {
        group = { account, users: [] };
        groups.set(account.id, group);
      }
      group.users.push({
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        state: user.state,
        language: user.language,
        photoName: user.photoName,
      });
    }

    return [...groups.values()].sort((a, b) =>
      a.account.denomination.localeCompare(b.account.denomination),
    );
  }
}
