import { CanActivate, ExecutionContext, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Channel } from '../common/enums/channel.enum';
import { BusinessErrorCode, BusinessException } from '../common/exceptions/business.exception';
import { CHANNELS_KEY } from './channels.decorator';

/**
 * Global guard (runs after JwtAuthGuard). Enforces @Channels() using the channel resolved
 * from the token's signed `client_id` (`req.user.channel`).
 *
 * Compatibility: while several channels share one Cognito app client the token's channel
 * is unknown (`undefined`) and the route is allowed — roles still apply. Once every
 * channel has its own client (AWS_COGNITO_CLIENT_ID_<CHANNEL>), enforcement is strict.
 */
@Injectable()
export class ChannelGuard implements CanActivate {
  private readonly logger = new Logger(ChannelGuard.name);
  private warnedSharedClient = false;

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const allowed = this.reflector.getAllAndOverride<Channel[]>(CHANNELS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!allowed || allowed.length === 0) return true;

    const user = context.switchToHttp().getRequest().user as { channel?: Channel } | undefined;
    if (!user) return true; // @Public() route: nothing to bind the channel to.

    if (user.channel === undefined) {
      if (!this.warnedSharedClient) {
        this.logger.warn(
          'Token from a shared Cognito app client: @Channels() not enforced. ' +
            'Configure AWS_COGNITO_CLIENT_ID_<CHANNEL> per frontend.',
        );
        this.warnedSharedClient = true;
      }
      return true;
    }

    if (!allowed.includes(user.channel)) {
      throw new BusinessException(
        BusinessErrorCode.ACCOUNT_CHANNEL_NOT_ALLOWED,
        'Este recurso no está disponible desde esta aplicación',
        HttpStatus.FORBIDDEN,
      );
    }
    return true;
  }
}
