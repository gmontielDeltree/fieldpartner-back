import { Prisma } from '@prisma/client';

/** Controlled response shape for the Crop catalog (no raw entity / timestamps). */
export const CROP_SELECT = {
  id: true,
  descriptionES: true,
  descriptionPT: true,
  descriptionEN: true,
  cropType: true,
  variety: true,
  labors: true,
  prepared: true,
  sowing: true,
  application: true,
  germination: true,
  harvest: true,
} as const;

export type CropDto = Prisma.CropGetPayload<{ select: typeof CROP_SELECT }>;
