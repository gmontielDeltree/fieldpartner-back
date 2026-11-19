import { Prisma } from '@prisma/client';

/** Controlled response shape for the Country catalog (no raw entity / timestamps). */
export const COUNTRY_SELECT = {
  id: true,
  code: true,
  descriptionES: true,
  descriptionPT: true,
  descriptionEN: true,
  language: true,
  currency: true,
  taxKey: true,
  taxKeyFormat: true,
} as const;

export type CountryDto = Prisma.CountryGetPayload<{ select: typeof COUNTRY_SELECT }>;
