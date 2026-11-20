import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { UserRole } from '@prisma/client';
import { ACCOUNT_DATA_ROLES, accountFilter, resolveTargetAccount } from './account-scope';
import { Caller, RolesGuard } from './roles.guard';
import { ROLES_KEY } from './roles.decorator';
import { CHANNELS_KEY } from './channels.decorator';
import { ZoneController } from '../zone/zone.controller';
import { DepositController } from '../deposit/deposit.controller';
import { CampaignController } from '../campaign/campaign.controller';
import { InputController } from '../input/input.controller';

// @nestjs/mapped-types ships ESM only and Jest runs CommonJS (see catalog-roles.spec).
jest.mock('@nestjs/mapped-types', () => ({
  PartialType: (base: new () => object) => class extends base {},
}));

const generalAdmin: Caller = { role: UserRole.GENERAL_ADMIN, accountId: null };
const admin: Caller = { role: UserRole.ADMIN, accountId: 'acc-1' };
const user: Caller = { role: UserRole.USER, accountId: 'acc-1' };
const orphan: Caller = { role: UserRole.USER, accountId: null };

describe('account-scope', () => {
  describe('resolveTargetAccount', () => {
    it('GENERAL_ADMIN must name the account', () => {
      expect(resolveTargetAccount(generalAdmin, 'acc-9')).toBe('acc-9');
      expect(() => resolveTargetAccount(generalAdmin)).toThrow(BadRequestException);
    });

    it.each([admin, user])('%p is forced to its own account', (caller) => {
      expect(resolveTargetAccount(caller)).toBe('acc-1');
      expect(resolveTargetAccount(caller, 'acc-1')).toBe('acc-1');
    });

    it('rejects a non-platform caller naming another account', () => {
      expect(() => resolveTargetAccount(admin, 'acc-2')).toThrow(ForbiddenException);
    });

    it('rejects a non-platform caller without an account', () => {
      expect(() => resolveTargetAccount(orphan)).toThrow(ForbiddenException);
    });
  });

  describe('accountFilter', () => {
    it('does not filter for a GENERAL_ADMIN', () => {
      expect(accountFilter(generalAdmin)).toBeUndefined();
    });

    it('filters everyone else by their own account', () => {
      expect(accountFilter(user)).toBe('acc-1');
      expect(() => accountFilter(orphan)).toThrow(ForbiddenException);
    });
  });
});

/** Per-account data: every role may enter, the service scopes the data (no channel lock). */
describe.each([ZoneController, DepositController, CampaignController, InputController])(
  '%p authorization',
  (controller) => {
    it('is protected by RolesGuard for every role, on every channel', () => {
      expect(Reflect.getMetadata(GUARDS_METADATA, controller)).toContain(RolesGuard);
      // Class-level @Roles is what makes RolesGuard resolve req.caller on every route.
      expect(Reflect.getMetadata(ROLES_KEY, controller)).toEqual(ACCOUNT_DATA_ROLES);
      expect(Reflect.getMetadata(CHANNELS_KEY, controller)).toBeUndefined();
    });
  },
);
