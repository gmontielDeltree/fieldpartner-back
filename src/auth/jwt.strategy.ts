import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { UserRole } from '@prisma/client';
import { CognitoClients } from '../cognito/cognito-clients';

/** Claims of a Cognito access token that this API reads (already signature-verified). */
interface CognitoAccessTokenPayload {
  sub: string;
  token_use: string;
  client_id: string;
  username?: string;
  email?: string;
  'cognito:groups'?: string[];
  'custom:role'?: string;
  'custom:accountId'?: string;
}

/**
 * Resolves the caller's role from the **signed** access token, if present:
 * - `custom:role` claim (injected by the Pre-Token Generation Lambda), or
 * - `cognito:groups` (native in the access token when roles are modeled as groups).
 * Returns undefined when neither is set — the RolesGuard then falls back to the DB.
 */
function resolveRoleClaim(payload: CognitoAccessTokenPayload): UserRole | undefined {
  const custom = payload['custom:role'];
  if (custom && (Object.values(UserRole) as string[]).includes(custom)) return custom as UserRole;

  const groups: string[] = payload['cognito:groups'] ?? [];
  if (groups.includes(UserRole.GENERAL_ADMIN)) return UserRole.GENERAL_ADMIN;
  if (groups.includes(UserRole.ADMIN)) return UserRole.ADMIN;
  if (groups.includes(UserRole.USER)) return UserRole.USER;
  return undefined;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly clients: CognitoClients,
  ) {
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
      // The client id is asserted manually in validate() below (one per channel).
      algorithms: ['RS256'],
    });
  }

  /**
   * Validates a Cognito **access token** and attaches { cognitoId, email } to req.user.
   * Access tokens expose `client_id`/`token_use`/`username` (not `aud`/`email`),
   * so we assert the client id and token type here and read identity from `sub`/`username`.
   * The channel comes from the signed `client_id` (undefined while clients are shared).
   */
  async validate(payload: CognitoAccessTokenPayload) {
    if (payload.token_use !== 'access' || !this.clients.isKnownClientId(payload.client_id)) {
      throw new UnauthorizedException('Invalid access token');
    }

    return {
      cognitoId: payload.sub,
      // Users are created with Username = email, so `username` is the email.
      email:     payload.email ?? payload.username,
      // Optional authz claims — present once Cognito groups / the Pre-Token Lambda are wired.
      // The RolesGuard uses them when available and falls back to the DB otherwise.
      role:      resolveRoleClaim(payload),
      accountId: payload['custom:accountId'],
      channel:   this.clients.channelOf(payload.client_id),
    };
  }
}
