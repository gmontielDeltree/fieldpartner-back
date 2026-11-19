import { SetMetadata } from '@nestjs/common';
import { Channel } from '../common/enums/channel.enum';

export const CHANNELS_KEY = 'channels';

/**
 * Restricts a route (or controller) to tokens issued for the given channels.
 * The channel is read from the token's signed `client_id` (see CognitoClients), never
 * from the `channel` header. Enforced by the global ChannelGuard.
 */
export const Channels = (...channels: Channel[]) => SetMetadata(CHANNELS_KEY, channels);
