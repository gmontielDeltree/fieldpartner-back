import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Caller } from './roles.guard';

/**
 * Account scoping for per-account data (zones, deposits, campaigns, inputs…).
 *
 * The account always comes from `req.caller` (resolved by RolesGuard), never from the
 * body. A platform GENERAL_ADMIN is the only caller that may pick an account, and does
 * so explicitly through the `accountId` query param.
 */

/** Roles allowed on per-account data: every role, each one limited to its own account. */
export const ACCOUNT_DATA_ROLES = [UserRole.GENERAL_ADMIN, UserRole.ADMIN, UserRole.USER];

export const isGeneralAdmin = (caller: Caller): boolean => caller.role === UserRole.GENERAL_ADMIN;

/** The caller's own account; a non-platform user without one cannot touch account data. */
function ownAccountId(caller: Caller): string {
  if (!caller.accountId) {
    throw new ForbiddenException('El usuario no tiene una cuenta asociada');
  }
  return caller.accountId;
}

/**
 * Account filter for reads and writes by id: `undefined` (no filter) for a GENERAL_ADMIN,
 * the caller's own account for everyone else.
 */
export function accountFilter(caller: Caller): string | undefined {
  return isGeneralAdmin(caller) ? undefined : ownAccountId(caller);
}

/**
 * The account a list or create targets.
 * - GENERAL_ADMIN: must name it (`accountId` query param).
 * - Others: their own account; naming a different one is rejected (403).
 */
export function resolveTargetAccount(caller: Caller, requested?: string): string {
  if (isGeneralAdmin(caller)) {
    if (!requested) throw new BadRequestException('Indicá la cuenta con el parámetro accountId');
    return requested;
  }
  const own = ownAccountId(caller);
  if (requested && requested !== own) {
    throw new ForbiddenException('No tenés acceso a esta cuenta');
  }
  return own;
}
