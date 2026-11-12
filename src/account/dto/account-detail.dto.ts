import { AccountCategory, AccountStatus, CurrencyCode, LicenceStatus, Prisma, UserRole, UserState } from '@prisma/client';

/**
 * Controlled detail shape for a single account. Deliberately omits internal/sensitive
 * columns — notably the user's `cognitoId` and `activeSessionId`, which must never leak
 * through the API (raw `include: { users: true }` used to expose them).
 */

export interface CompanyDto {
  fantasyName: string;
  socialReason: string;
  tributaryCode: string;
  address: string;
  phone: string;
  email: string;
  locality: string | null;
  province: string | null;
  zipCode: string | null;
  website: string | null;
  observation: string | null;
  secondaryContact: string | null;
  companyLogo: string | null;
  fiscalSituation: string | null;
}

export interface LicenceUserDto {
  id: string;
  email: string;
  username: string;
  role: UserRole | null;
  state: UserState;
}

export interface LicenceDetailDto {
  id: string;
  status: LicenceStatus;
  startDate: string;
  endDate: string;
  activeUsersAllowed: number;
  amountLicencesAllowed: number | null;
  countryCode: string | null;
  licenceType: { id: string; label: string };
  users: LicenceUserDto[];
}

export interface AccountDetailDto {
  id: string;
  category: AccountCategory;
  denomination: string;
  countryCode: string;
  currency: CurrencyCode;
  status: AccountStatus;
  licenceNumber: string | null;
  isLicenceMultipleCountry: boolean;
  maxHectares: number;
  maxFields: number;
  countFields: number;
  countLicences: number;
  countHectares: number;
  createdAt: string;
  updatedAt: string;
  company: CompanyDto | null;
  licences: LicenceDetailDto[];
}

/** Prisma `select` that backs the detail DTO — keeps internal columns out of the query. */
export const ACCOUNT_DETAIL_SELECT = {
  id: true,
  category: true,
  denomination: true,
  countryCode: true,
  currency: true,
  status: true,
  licenceNumber: true,
  isLicenceMultipleCountry: true,
  maxHectares: true,
  maxFields: true,
  countFields: true,
  countLicences: true,
  countHectares: true,
  createdAt: true,
  updatedAt: true,
  company: {
    select: {
      fantasyName: true,
      socialReason: true,
      tributaryCode: true,
      address: true,
      phone: true,
      email: true,
      locality: true,
      province: true,
      zipCode: true,
      website: true,
      observation: true,
      secondaryContact: true,
      companyLogo: true,
      fiscalSituation: true,
    },
  },
  licences: {
    select: {
      id: true,
      status: true,
      startDate: true,
      endDate: true,
      activeUsersAllowed: true,
      amountLicencesAllowed: true,
      countryCode: true,
      licenceType: { select: { id: true, label: true } },
      users: { select: { id: true, email: true, username: true, role: true, state: true } },
    },
  },
} as const;

export type AccountDetailRaw = Prisma.AccountGetPayload<{ select: typeof ACCOUNT_DETAIL_SELECT }>;

export function toAccountDetail(account: AccountDetailRaw): AccountDetailDto {
  return {
    id: account.id,
    category: account.category,
    denomination: account.denomination,
    countryCode: account.countryCode,
    currency: account.currency,
    status: account.status,
    licenceNumber: account.licenceNumber,
    isLicenceMultipleCountry: account.isLicenceMultipleCountry,
    maxHectares: account.maxHectares,
    maxFields: account.maxFields,
    countFields: account.countFields,
    countLicences: account.countLicences,
    countHectares: account.countHectares,
    createdAt: account.createdAt.toISOString(),
    updatedAt: account.updatedAt.toISOString(),
    company: account.company ? { ...account.company } : null,
    licences: account.licences.map((licence) => ({
      id: licence.id,
      status: licence.status,
      startDate: licence.startDate.toISOString(),
      endDate: licence.endDate.toISOString(),
      activeUsersAllowed: licence.activeUsersAllowed,
      amountLicencesAllowed: licence.amountLicencesAllowed,
      countryCode: licence.countryCode,
      licenceType: { id: licence.licenceType.id, label: licence.licenceType.label },
      users: licence.users.map((user) => ({
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        state: user.state,
      })),
    })),
  };
}
