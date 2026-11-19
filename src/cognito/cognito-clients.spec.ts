import { ConfigService } from '@nestjs/config';
import { Channel } from '../common/enums/channel.enum';
import { BusinessException } from '../common/exceptions/business.exception';
import { CognitoClients, parseChannel } from './cognito-clients';

// A fake config isolates the test from the real .env / process.env.
const clientsWith = (env: Record<string, string>) => {
  const values: Record<string, string> = { AWS_COGNITO_CLIENT_ID: 'default-client', ...env };
  const config = {
    get: (key: string) => values[key],
    getOrThrow: (key: string) => {
      if (!(key in values)) throw new Error(`missing ${key}`);
      return values[key];
    },
  };
  return new CognitoClients(config as unknown as ConfigService);
};

describe('CognitoClients', () => {
  it('shared default client (legacy): every channel uses it and the token channel is unknown', () => {
    const clients = clientsWith({});
    for (const channel of Object.values(Channel)) {
      expect(clients.clientIdFor(channel)).toBe('default-client');
    }
    expect(clients.isKnownClientId('default-client')).toBe(true);
    expect(clients.channelOf('default-client')).toBeUndefined();
  });

  it('dedicated clients: the signed client_id identifies the channel', () => {
    const clients = clientsWith({
      AWS_COGNITO_CLIENT_ID_FIELDPARTNER_FRONT: 'front-client',
      AWS_COGNITO_CLIENT_ID_LICENCE_FRONT: 'licence-client',
      AWS_COGNITO_CLIENT_ID_BACKOFFICE: 'bo-client',
    });
    expect(clients.clientIdFor(Channel.Backoffice)).toBe('bo-client');
    expect(clients.channelOf('bo-client')).toBe(Channel.Backoffice);
    expect(clients.channelOf('front-client')).toBe(Channel.FieldpartnerFront);
    expect(clients.channelOf('licence-client')).toBe(Channel.LicenceFront);
    // The default client stays accepted (tokens issued before the switch), channel unknown.
    expect(clients.isKnownClientId('default-client')).toBe(true);
    expect(clients.channelOf('default-client')).toBeUndefined();
  });

  it('partial setup: only the dedicated channel is identifiable', () => {
    const clients = clientsWith({ AWS_COGNITO_CLIENT_ID_BACKOFFICE: 'bo-client' });
    expect(clients.channelOf('bo-client')).toBe(Channel.Backoffice);
    expect(clients.clientIdFor(Channel.FieldpartnerFront)).toBe('default-client');
    expect(clients.channelOf('default-client')).toBeUndefined();
  });

  it('two channels configured with the same client id are ambiguous', () => {
    const clients = clientsWith({
      AWS_COGNITO_CLIENT_ID_FIELDPARTNER_FRONT: 'same-client',
      AWS_COGNITO_CLIENT_ID_BACKOFFICE: 'same-client',
    });
    expect(clients.channelOf('same-client')).toBeUndefined();
  });

  it('rejects tokens from an app client that is not configured', () => {
    expect(clientsWith({}).isKnownClientId('foreign-client')).toBe(false);
  });
});

describe('parseChannel', () => {
  it('accepts a known channel', () => {
    expect(parseChannel('backoffice')).toBe(Channel.Backoffice);
  });

  it('rejects an unknown or missing channel when required', () => {
    expect(() => parseChannel('bogus')).toThrow(BusinessException);
    expect(() => parseChannel(undefined)).toThrow(BusinessException);
  });

  it('allows a missing channel when optional, but still rejects an unknown one', () => {
    expect(parseChannel(undefined, false)).toBeUndefined();
    expect(() => parseChannel('bogus', false)).toThrow(BusinessException);
  });
});
