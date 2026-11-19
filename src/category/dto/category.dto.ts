import { Prisma } from '@prisma/client';

/** Controlled response shape for the Category catalog (no raw entity / timestamps). */
export const CATEGORY_SELECT = {
  id: true,
  categoryType: true,
  descriptionES: true,
  descriptionPT: true,
  descriptionEN: true,
} as const;

export type CategoryDto = Prisma.CategoryGetPayload<{ select: typeof CATEGORY_SELECT }>;
