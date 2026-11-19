import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Channel } from '../common/enums/channel.enum';
import { BusinessException } from '../common/exceptions/business.exception';
import { ChannelGuard } from './channel.guard';

const contextWith = (user: unknown): ExecutionContext =>
  ({
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  }) as unknown as ExecutionContext;

describe('ChannelGuard', () => {
  let reflector: { getAllAndOverride: jest.Mock };
  let guard: ChannelGuard;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    guard = new ChannelGuard(reflector as unknown as Reflector);
  });

  it('allows routes without @Channels()', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    expect(guard.canActivate(contextWith({ channel: Channel.FieldpartnerFront }))).toBe(true);
  });

  it('allows a token issued for an allowed channel', () => {
    reflector.getAllAndOverride.mockReturnValue([Channel.Backoffice]);
    expect(guard.canActivate(contextWith({ channel: Channel.Backoffice }))).toBe(true);
  });

  it('rejects a token issued for another channel', () => {
    reflector.getAllAndOverride.mockReturnValue([Channel.Backoffice]);
    expect(() => guard.canActivate(contextWith({ channel: Channel.FieldpartnerFront }))).toThrow(
      BusinessException,
    );
  });

  it('does not enforce while the token comes from a shared client (channel unknown)', () => {
    reflector.getAllAndOverride.mockReturnValue([Channel.Backoffice]);
    expect(guard.canActivate(contextWith({ channel: undefined }))).toBe(true);
  });
});
