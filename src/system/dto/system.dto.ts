import { Prisma } from '@prisma/client';

/** Controlled response shape for the System catalog (no raw entity / timestamps). */
export const SYSTEM_SELECT = {
  id: true,
  code: true,
  name: true,
  version: true,
  technicalDetails: true,
} as const;

export type SystemDto = Prisma.SystemGetPayload<{ select: typeof SYSTEM_SELECT }>;

/** Compact reference embedded in licence types and menu modules. */
export const SYSTEM_REF_SELECT = { id: true, code: true, name: true, version: true } as const;
