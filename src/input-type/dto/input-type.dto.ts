import { Prisma } from '@prisma/client';

/** Controlled response shape for the InputType catalog (no raw entity / timestamps). */
export const INPUT_TYPE_SELECT = {
  id: true,
  code: true,
  descriptionES: true,
  descriptionEN: true,
  descriptionPT: true,
  phytosanitary: true,
  isCrop: true,
} as const;

export type InputTypeDto = Prisma.InputTypeGetPayload<{ select: typeof INPUT_TYPE_SELECT }>;
