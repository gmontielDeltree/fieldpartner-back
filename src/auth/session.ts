import { UserRole } from '@prisma/client';
import { Channel } from '../common/enums/channel.enum';

/**
 * Single session (KAN-66): a user of fieldpartner_front has one live session. Login stores the
 * session id in `User.activeSessionId`, and a token from an older session is rejected on the
 * next request or renewal, even before it expires.
 *
 * The session id is Cognito's `origin_jti`: it identifies the login, and the tokens a refresh
 * issues keep it. Without it (token revocation off in the user pool) the rule does not apply.
 */

/** Claims of a Cognito access token that the session rule reads. */
export interface SessionClaims {
  sub?: string;
  client_id?: string;
  origin_jti?: string;
}

/**
 * Reads the claims of an access token that Cognito **just returned** to this server (login or
 * refresh). It does not verify the signature, so it must never be used on a token a client sent:
 * those go through JwtStrategy.
 */
export function readIssuedTokenClaims(accessToken: string): SessionClaims {
  const payload = accessToken.split('.')[1];
  if (!payload) return {};
  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return claims && typeof claims === 'object' ? (claims as SessionClaims) : {};
  } catch {
    return {};
  }
}

/**
 * Whether a token falls under the single-session rule. Known channel: only fieldpartner_front.
 * Unknown channel (the frontends still share an app client): every user except GENERAL_ADMIN,
 * because a GENERAL_ADMIN also works in the backoffice, whose sessions must not replace or be
 * replaced by the front's. Accounts that never logged into the front have no active session.
 */
export function singleSessionApplies(channel: Channel | undefined, role: UserRole | null): boolean {
  if (channel) return channel === Channel.FieldpartnerFront;
  return role !== UserRole.GENERAL_ADMIN;
}

/** True when the token belongs to a session that a newer login replaced. */
export function isReplacedSession(
  state: { activeSessionId: string | null; role: UserRole | null },
  sessionId: string | undefined,
  channel: Channel | undefined,
): boolean {
  return (
    !!state.activeSessionId &&
    !!sessionId &&
    sessionId !== state.activeSessionId &&
    singleSessionApplies(channel, state.role)
  );
}
