import { AccountCategory } from '@prisma/client';

export enum Channel {
  FieldpartnerFront = 'fieldpartner_front',
  LicenceFront      = 'licence_front',
  Backoffice        = 'backoffice',
}

/**
 * Maps each channel to the account categories it is allowed to authenticate.
 * Add or restrict categories here as business rules evolve.
 */
export const CHANNEL_ALLOWED_CATEGORIES: Record<Channel, AccountCategory[]> = {
  [Channel.FieldpartnerFront]: [AccountCategory.A],
  [Channel.LicenceFront]:      [AccountCategory.B, AccountCategory.C],
  [Channel.Backoffice]:        [AccountCategory.A, AccountCategory.B, AccountCategory.C],
};
