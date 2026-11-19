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
import { UserDetailDto, toUserDetail } from '../dto/account-users.dto';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
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
   */
  async executeCreate(dto: CreateUserDto, caller: Caller): Promise<UserDetailDto> {
    const { targetAccountId, role } = this.resolveCreateScope(dto, caller);

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

    if (await this.usersRepository.existsByEmail(dto.email)) {
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
      const user = await this.usersRepository.create({
        licenceId: licence.id,
        cognitoId,
        email: dto.email,
        username: dto.username,
        language: dto.language ?? 'es',
        role,
        isAdmin: role !== UserRole.USER,
        currency: account.currency,
        state: UserState.PENDING,
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
  async executeUpdate(id: string, dto: UpdateUserDto, caller: Caller): Promise<UserDetailDto> {
    const target = await this.usersRepository.findScopeTarget(id);
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

    const user = await this.usersRepository.updateUsername(id, dto.username);
    return toUserDetail(user);
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
