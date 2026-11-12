import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ROLES_KEY } from './roles.decorator';

/** The authenticated caller, resolved from the token claim or the DB. */
export interface Caller {
  id?: string;
  cognitoId?: string;
  role: UserRole;
  accountId: string | null;
}

interface Principal {
  cognitoId?: string;
  role?: UserRole;
  accountId?: string;
}

/**
 * Role-based guard. Runs after the global JwtAuthGuard (so `req.user` is set).
 *
 * Authorization never trusts the request body/headers. The role comes from one of
 * two trusted sources, in order:
 *  1. The **signed** access token (`custom:role` / `cognito:groups`), when Cognito
 *     groups or the Pre-Token Generation Lambda are configured — no DB hit.
 *  2. The database (`User.role`) as the source of truth / fallback.
 *
 * The resolved caller (role + accountId) is attached to `req.caller` for downstream scoping.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const principal = request.user as Principal | undefined;
    if (!principal?.cognitoId) throw new ForbiddenException('Authenticated user required');

    const caller = await this.resolveCaller(principal);

    if (!required.includes(caller.role)) {
      throw new ForbiddenException('Insufficient role for this resource');
    }

    request.caller = caller;
    return true;
  }

  private async resolveCaller(principal: Principal): Promise<Caller> {
    // 1) Trust the signed token claim when present.
    if (principal.role) {
      let accountId = principal.accountId ?? null;
      // ADMIN scoping needs accountId; if the token didn't carry it, resolve it from the DB.
      if (accountId === null && principal.role === UserRole.ADMIN) {
        const dbUser = await this.prisma.user.findUnique({
          where: { cognitoId: principal.cognitoId },
          select: { licence: { select: { accountId: true } } },
        });
        accountId = dbUser?.licence?.accountId ?? null;
      }
      return { cognitoId: principal.cognitoId, role: principal.role, accountId };
    }

    // 2) Fallback: the database is the source of truth.
    const dbUser = await this.prisma.user.findUnique({
      where: { cognitoId: principal.cognitoId },
      select: { id: true, role: true, licence: { select: { accountId: true } } },
    });
    if (!dbUser?.role) throw new ForbiddenException('Insufficient role for this resource');

    return {
      id: dbUser.id,
      cognitoId: principal.cognitoId,
      role: dbUser.role,
      accountId: dbUser.licence?.accountId ?? null,
    };
  }
}
