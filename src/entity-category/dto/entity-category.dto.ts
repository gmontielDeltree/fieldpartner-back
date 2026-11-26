import { Prisma } from '@prisma/client';

/** Controlled response shape for the EntityCategory catalog (no timestamps). */
export const ENTITY_CATEGORY_SELECT = {
  id: true,
  code: true,
  descriptionES: true,
  descriptionPT: true,
  descriptionEN: true,
} as const;

export type EntityCategoryDto = Prisma.EntityCategoryGetPayload<{ select: typeof ENTITY_CATEGORY_SELECT }>;
