import { Prisma } from '@prisma/client';

/** Controlled response shape for the MovementType catalog (no raw entity / timestamps). */
export const MOVEMENT_TYPE_SELECT = {
  id: true,
  name: true,
  conceptES: true,
  conceptPT: true,
  conceptEN: true,
  description: true,
  typeMovement: true,
  manual: true,
  stockSum: true,
} as const;

export type MovementTypeDto = Prisma.MovementTypeGetPayload<{ select: typeof MOVEMENT_TYPE_SELECT }>;
