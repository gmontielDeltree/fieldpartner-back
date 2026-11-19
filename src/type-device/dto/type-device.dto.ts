import { Prisma } from '@prisma/client';

/** Controlled response shape for the TypeDevice catalog (no raw entity / timestamps). */
export const TYPE_DEVICE_SELECT = {
  id: true,
  model: true,
  description: true,
  family: true,
  subFamily: true,
  available: true,
} as const;

export type TypeDeviceDto = Prisma.TypeDeviceGetPayload<{ select: typeof TYPE_DEVICE_SELECT }>;
