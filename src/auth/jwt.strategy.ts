import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { UserRole } from '@prisma/client';

/**
 * Resolves the caller's role from the **signed** access token, if present:
 * - `custom:role` claim (injected by the Pre-Token Generation Lambda), or
 * - `cognito:groups` (native in the access token when roles are modeled as groups).
 * Returns undefined when neither is set — the RolesGuard then falls back to the DB.
 */
function resolveRoleClaim(payload: any): UserRole | undefined {
  const custom = payload['custom:role'];
  if (custom && Object.values(UserRole).includes(custom)) return custom as UserRole;

  const groups: string[] = payload['cognito:groups'] ?? [];
  if (groups.includes(UserRole.GENERAL_ADMIN)) return UserRole.GENERAL_ADMIN;
  if (groups.includes(UserRole.ADMIN)) return UserRole.ADMIN;
  if (groups.includes(UserRole.USER)) return UserRole.USER;
  return undefined;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly clientId: string;

  constructor(configService: ConfigService) {
    const region     = configService.getOrThrow<string>('AWS_REGION');
    const userPoolId = configService.getOrThrow<string>('AWS_COGNITO_USER_POOL_ID');

    super({
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`,
      }),
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      issuer:     `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`,
      // No `audience`: Cognito **access tokens** carry `client_id` instead of `aud`.
      // The client id is asserted manually in validate() below.
      algorithms: ['RS256'],
    });

    this.clientId = configService.getOrThrow<string>('AWS_COGNITO_CLIENT_ID');
  }

  /**
   * Validates a Cognito **access token** and attaches { cognitoId, email } to req.user.
   * Access tokens expose `client_id`/`token_use`/`username` (not `aud`/`email`),
   * so we assert the client id and token type here and read identity from `sub`/`username`.
   */
  async validate(payload: any) {
    if (payload.token_use !== 'access' || payload.client_id !== this.clientId) {
      throw new UnauthorizedException('Invalid access token');
    }

    return {
      cognitoId: payload.sub as string,
      // Users are created with Username = email, so `username` is the email.
      email:     (payload.email ?? payload.username) as string,
      // Optional authz claims — present once Cognito groups / the Pre-Token Lambda are wired.
      // The RolesGuard uses them when available and falls back to the DB otherwise.
      role:      resolveRoleClaim(payload),
      accountId: (payload['custom:accountId'] as string | undefined) ?? undefined,
    };
  }
}
