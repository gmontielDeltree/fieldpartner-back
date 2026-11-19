import { Prisma } from '@prisma/client';

/** Controlled response shape for menu modules/groups (no raw entity / timestamps). */
export const FEATURE_MODULE_SELECT = {
  id: true,
  nameEs: true,
  nameEn: true,
  namePt: true,
  icon: true,
  order: true,
} as const;

export type FeatureModuleDto = Prisma.FeatureModuleGetPayload<{ select: typeof FEATURE_MODULE_SELECT }>;
