import { Prisma } from '@prisma/client';

/** Controlled response shape for deposits (with their locations). */
export const DEPOSIT_SELECT = {
  id: true,
  accountId: true,
  description: true,
  owner: true,
  isVirtual: true,
  lat: true,
  lng: true,
  isNegative: true,
  address: true,
  zipCode: true,
  locality: true,
  province: true,
  countryCode: true,
  hasSiloBag: true,
  hasHopper: true,
  hasSilo: true,
  hasDeposit: true,
  taxId: true,
  siloBagId: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  locations: { select: { id: true, number: true, name: true }, orderBy: { name: 'asc' } },
} as const;

export type DepositDto = Prisma.DepositGetPayload<{ select: typeof DEPOSIT_SELECT }>;
