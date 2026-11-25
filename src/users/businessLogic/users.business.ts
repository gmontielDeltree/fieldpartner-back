import {
  BadRequestException,
  ForbiddenException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LicenceStatus, UserRole, UserState } from '@prisma/client';
import { BusinessErrorCode, BusinessException } from '../../common/exceptions/business.exception';
import { CognitoService } from '../../cognito/cognito.service';
import { Caller } from '../../auth/roles.guard';
import {
  UserDetailDto,
  UserWithPermissionsDto,
  toUserDetail,
  toUserWithPermissions,
} from '../dto/account-users.dto';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UpdateOwnProfileDto } from '../dto/update-own-profile.dto';
import { UsersRepository } from '../users.repository';

@Injectable()
export class UsersBusiness {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly cognito: CognitoService,
  ) {}

  /**
   * Creates a user, scoped to the caller:
   * - GENERAL_ADMIN → must pass `accountId`; may assign any role.
   * - ADMIN         → forced to their own account; may NOT assign GENERAL_ADMIN.
   * Registers in Cognito before the DB write; deletes the Cognito user if the DB fails.
   * The menu permissions (`menuIds`) are written with the user.
   */
  async executeCreate(dto: CreateUserDto, caller: Caller): Promise<UserDetailDto> {
    const { targetAccountId, role } = this.resolveCreateScope(dto, caller);
    // Same as the login (KAN-66): emails are stored and sent to Cognito in lower case.
    const email = dto.email.toLowerCase();
    const menuIds = await this.validMenuIds(dto.menuIds ?? []);

    const account = await this.usersRepository.findAccountForNewUser(targetAccountId);
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

    if (await this.usersRepository.existsByEmail(email)) {
      throw new BusinessException(
        BusinessErrorCode.EMAIL_ALREADY_REGISTERED,
        `El email ${email} ya tiene un usuario registrado`,
        HttpStatus.CONFLICT,
      );
    }

    const { cognitoId } = await this.cognito.registerAdminUser({
      email,
      username: dto.username,
      password: dto.password,
      language: dto.language,
    });

    try {
      const user = await this.usersRepository.create(
        {
          licenceId: licence.id,
          cognitoId,
          email,
          username: dto.username,
          language: dto.language ?? 'es',
          role,
          isAdmin: role !== UserRole.USER,
          currency: account.currency,
          photoName: dto.photoName || null,
          state: UserState.PENDING,
        },
        menuIds,
      );
      return toUserDetail(user);
    } catch (error) {
      // DB failed — remove the Cognito user to avoid orphaned registrations.
      await this.cognito.deleteUser(email);
      throw error;
    }
  }

  /**
   * Updates a user's username and (optionally) resets its password via admin flow.
   * Scoped: GENERAL_ADMIN any user; ADMIN only within their own account.
   * `email` change is intentionally not applied (Cognito username == email).
   */
  async executeUpdate(id: string, dto: UpdateUserDto, caller: Caller): Promise<UserDetailDto> {
    const target = await this.findScopedTarget(id, caller);

    if (dto.newPassword) {
      await this.cognito.adminSetPassword(target.email, dto.newPassword);
    }

    const user = await this.usersRepository.updateUsername(id, dto.username);
    return toUserDetail(user);
  }

  /** A user with its permissions. Scoped like the rest: another account's user is a 404. */
  async findOneWithPermissions(id: string, caller: Caller): Promise<UserWithPermissionsDto> {
    await this.findScopedTarget(id, caller);
    const user = await this.usersRepository.findWithPermissions({ id });
    if (!user) throw new NotFoundException(`Usuario ${id} no encontrado`);
    return toUserWithPermissions(user);
  }

  /**
   * Replaces the menus a user may open (the front sends the whole set). Scoped: an ADMIN only
   * edits users of its own account, itself included.
   */
  async executeReplacePermissions(id: string, menuIds: number[], caller: Caller): Promise<UserWithPermissionsDto> {
    await this.findScopedTarget(id, caller);
    const valid = await this.validMenuIds(menuIds);
    return toUserWithPermissions(await this.usersRepository.replaceMenuPermissions(id, valid));
  }

  /** The caller's own user, with its permissions (any role). */
  async findOwnProfile(caller: Caller): Promise<UserWithPermissionsDto> {
    const user = caller.cognitoId
      ? await this.usersRepository.findWithPermissions({ cognitoId: caller.cognitoId })
      : null;
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return toUserWithPermissions(user);
  }

  /** The caller's own profile: name, language and photo. Role and permissions are not editable here. */
  async executeUpdateOwnProfile(dto: UpdateOwnProfileDto, caller: Caller): Promise<UserWithPermissionsDto> {
    const { cognitoId } = caller;
    // findOwnProfile already 404s without it; the check also narrows the type.
    if (!cognitoId) throw new NotFoundException('Usuario no encontrado');
    await this.findOwnProfile(caller);
    return toUserWithPermissions(await this.usersRepository.updateProfile(cognitoId, dto));
  }

  /** The target user if the caller may manage it; otherwise 404 (no disclosure). */
  private async findScopedTarget(id: string, caller: Caller) {
    const target = await this.usersRepository.findScopeTarget(id);
    if (
      !target ||
      (caller.role !== UserRole.GENERAL_ADMIN && target.licence.accountId !== caller.accountId)
    ) {
      throw new NotFoundException(`Usuario ${id} no encontrado`);
    }
    return target;
  }

  /** Deduplicated menu ids; an id that is not in menu_modules is a 400 that lists them. */
  private async validMenuIds(menuIds: number[]): Promise<number[]> {
    const unique = [...new Set(menuIds)].sort((a, b) => a - b);
    const existing = new Set(await this.usersRepository.findExistingMenuIds(unique));
    const unknown = unique.filter((menuId) => !existing.has(menuId));
    if (unknown.length) {
      throw new BusinessException(
        BusinessErrorCode.INVALID_REFERENCE,
        `Menús inexistentes: ${unknown.join(', ')}`,
        HttpStatus.BAD_REQUEST,
        { menuIds: unknown },
      );
    }
    return unique;
  }

  /** Which account the new user goes to and with which role, based on who is creating it. */
  private resolveCreateScope(
    dto: CreateUserDto,
    caller: Caller,
  ): { targetAccountId: string; role: UserRole } {
    if (caller.role === UserRole.GENERAL_ADMIN) {
      if (!dto.accountId) throw new BadRequestException('accountId es requerido');
      return { targetAccountId: dto.accountId, role: dto.role ?? UserRole.USER };
    }

    if (!caller.accountId) throw new ForbiddenException('El usuario no tiene una cuenta asociada');
    if (dto.role === UserRole.GENERAL_ADMIN) {
      throw new ForbiddenException('No podés asignar el rol GENERAL_ADMIN');
    }
    return { targetAccountId: caller.accountId, role: dto.role ?? UserRole.USER };
  }
}
