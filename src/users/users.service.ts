import {
  BadRequestException,
  ForbiddenException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LicenceStatus, UserRole, UserState } from '@prisma/client';
import { BusinessErrorCode, BusinessException } from '../common/exceptions/business.exception';
import { PrismaService } from '../prisma/prisma.service';
import { CognitoService } from '../cognito/cognito.service';
import { Caller } from '../auth/roles.guard';
import {
  AccountUsersDto,
  USER_DETAIL_SELECT,
  UserDetailDto,
  toUserDetail,
} from './dto/account-users.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const USER_SELECT = {
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

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cognito: CognitoService,
  ) {}

  /**
   * Creates a user, scoped to the caller:
   * - GENERAL_ADMIN → must pass `accountId`; may assign any role.
   * - ADMIN         → forced to their own account; may NOT assign GENERAL_ADMIN.
   * Registers in Cognito before the DB write; deletes the Cognito user if the DB fails.
   */
  async create(dto: CreateUserDto, caller: Caller): Promise<UserDetailDto> {
    let targetAccountId: string;
    let role: UserRole;

    if (caller.role === UserRole.GENERAL_ADMIN) {
      if (!dto.accountId) throw new BadRequestException('accountId es requerido');
      targetAccountId = dto.accountId;
      role = dto.role ?? UserRole.USER;
    } else {
      if (!caller.accountId) throw new ForbiddenException('El usuario no tiene una cuenta asociada');
      targetAccountId = caller.accountId;
      if (dto.role === UserRole.GENERAL_ADMIN) {
        throw new ForbiddenException('No podés asignar el rol GENERAL_ADMIN');
      }
      role = dto.role ?? UserRole.USER;
    }

    const account = await this.prisma.account.findUnique({
      where: { id: targetAccountId },
      select: {
        currency: true,
        licences: { select: { id: true, status: true, createdAt: true } },
      },
    });
    if (!account) {
      throw new BusinessException(
        BusinessErrorCode.ACCOUNT_NOT_FOUND,
        'La cuenta indicada no existe',
        HttpStatus.NOT_FOUND,
      );
    }

    // Attach to the account's active licence (fallback: most recent).
    const licence =
      account.licences.find((l) => l.status === LicenceStatus.ACTIVE) ??
      [...account.licences].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
    if (!licence) throw new BadRequestException('La cuenta no tiene una licencia asociada');

    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      select: { id: true },
    });
    if (existing) {
      throw new BusinessException(
        BusinessErrorCode.EMAIL_ALREADY_REGISTERED,
        `El email ${dto.email} ya tiene un usuario registrado`,
        HttpStatus.CONFLICT,
      );
    }

    const { cognitoId } = await this.cognito.registerAdminUser({
      email: dto.email,
      username: dto.username,
      password: dto.password,
      language: dto.language,
    });

    try {
      const user = await this.prisma.user.create({
        data: {
          licenceId: licence.id,
          cognitoId,
          email: dto.email,
          username: dto.username,
          language: dto.language ?? 'es',
          role,
          isAdmin: role !== UserRole.USER,
          currency: account.currency,
          state: UserState.PENDING,
        },
        select: USER_DETAIL_SELECT,
      });
      return toUserDetail(user);
    } catch (error) {
      // DB failed — remove the Cognito user to avoid orphaned registrations.
      await this.cognito.deleteUser(dto.email);
      throw error;
    }
  }

  /**
   * Updates a user's username and (optionally) resets its password via admin flow.
   * Scoped: GENERAL_ADMIN any user; ADMIN only within their own account.
   * `email` change is intentionally not applied (Cognito username == email).
   */
  async update(id: string, dto: UpdateUserDto, caller: Caller): Promise<UserDetailDto> {
    const target = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, licence: { select: { accountId: true } } },
    });
    if (
      !target ||
      (caller.role !== UserRole.GENERAL_ADMIN && target.licence.accountId !== caller.accountId)
    ) {
      // Don't disclose users outside the caller's account.
      throw new NotFoundException(`Usuario ${id} no encontrado`);
    }

    if (dto.newPassword) {
      await this.cognito.adminSetPassword(target.email, dto.newPassword);
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: { ...(dto.username !== undefined && { username: dto.username }) },
      select: USER_DETAIL_SELECT,
    });
    return toUserDetail(user);
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
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
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
      },
    });

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

  private async groupByAccount(where: object): Promise<AccountUsersDto[]> {
    const users = await this.prisma.user.findMany({
      where,
      select: USER_SELECT,
      orderBy: { username: 'asc' },
    });

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
      });
    }

    return [...groups.values()].sort((a, b) =>
      a.account.denomination.localeCompare(b.account.denomination),
    );
  }
}
