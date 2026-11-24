import { Prisma } from '@prisma/client';

/** Controlled response shape for zones. */
export const ZONE_SELECT = {
  id: true,
  accountId: true,
  countryId: true,
  name: true,
  description: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type ZoneDto = Prisma.ZoneGetPayload<{ select: typeof ZONE_SELECT }>;

/** Compact reference embedded in other resources (campaigns). */
export const ZONE_REF_SELECT = { id: true, name: true } as const;
