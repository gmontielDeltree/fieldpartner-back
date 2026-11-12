import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * Restricts a route (or controller) to the given roles. The RolesGuard resolves
 * the caller's role from the database (never from the token or request body) and
 * rejects with 403 when it is not in the allow-list.
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
