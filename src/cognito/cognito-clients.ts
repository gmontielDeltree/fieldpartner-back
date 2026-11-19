import { Injectable, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Channel } from '../common/enums/channel.enum';
import { BusinessErrorCode, BusinessException } from '../common/exceptions/business.exception';

/** Env var holding the dedicated Cognito app client id of each channel (all optional). */
export const CHANNEL_CLIENT_ID_ENV: Record<Channel, string> = {
  [Channel.FieldpartnerFront]: 'AWS_COGNITO_CLIENT_ID_FIELDPARTNER_FRONT',
  [Channel.LicenceFront]:      'AWS_COGNITO_CLIENT_ID_LICENCE_FRONT',
  [Channel.Backoffice]:        'AWS_COGNITO_CLIENT_ID_BACKOFFICE',
};

/**
 * Maps channels to Cognito app clients, so the channel a token belongs to comes from its
 * **signed** `client_id` claim instead of the client-supplied `channel` header.
 *
 * - Each channel uses its dedicated client (`AWS_COGNITO_CLIENT_ID_<CHANNEL>`) when set,
 *   otherwise the shared default (`AWS_COGNITO_CLIENT_ID`).
 * - A token's channel is known only when its client id belongs to exactly one channel.
 *   While channels still share a client (legacy setup), `channelOf` returns undefined and
 *   `@Channels()` cannot be enforced for those tokens (see ChannelGuard).
 */
@Injectable()
export class CognitoClients {
  private readonly defaultClientId: string;
  private readonly byChannel: Record<Channel, string>;
  private readonly channelByClientId = new Map<string, Channel | null>();

  constructor(config: ConfigService) {
    this.defaultClientId = config.getOrThrow<string>('AWS_COGNITO_CLIENT_ID');

    this.byChannel = {} as Record<Channel, string>;
    for (const channel of Object.values(Channel)) {
      const dedicated = config.get<string>(CHANNEL_CLIENT_ID_ENV[channel])?.trim();
      this.byChannel[channel] = dedicated || this.defaultClientId;
    }

    // A client id shared by several channels is ambiguous → null.
    for (const [channel, clientId] of Object.entries(this.byChannel) as [Channel, string][]) {
      this.channelByClientId.set(
        clientId,
        this.channelByClientId.has(clientId) ? null : channel,
      );
    }
    if (!this.channelByClientId.has(this.defaultClientId)) {
      this.channelByClientId.set(this.defaultClientId, null);
    }
  }

  /** Cognito app client used to authenticate through `channel`. */
  clientIdFor(channel: Channel): string {
    return this.byChannel[channel];
  }

  /** Every client id whose tokens this API accepts. */
  isKnownClientId(clientId: string): boolean {
    return this.channelByClientId.has(clientId);
  }

  /** Channel a token was issued for, or undefined if its client is shared/unknown. */
  channelOf(clientId: string): Channel | undefined {
    return this.channelByClientId.get(clientId) ?? undefined;
  }
}

/**
 * Parses the `channel` request header. Throws 403 for an unknown value.
 * With `required: false`, a missing header resolves to undefined (callers use the default client).
 */
export function parseChannel(header: string | undefined, required: false): Channel | undefined;
export function parseChannel(header: string | undefined, required?: true): Channel;
export function parseChannel(header: string | undefined, required = true): Channel | undefined {
  if (!header && !required) return undefined;
  if (!header || !Object.values(Channel).includes(header as Channel)) {
    throw new BusinessException(
      BusinessErrorCode.ACCOUNT_CHANNEL_NOT_ALLOWED,
      'Canal de acceso no reconocido',
      HttpStatus.FORBIDDEN,
    );
  }
  return header as Channel;
}
