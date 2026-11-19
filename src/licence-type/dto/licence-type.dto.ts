import { Prisma } from '@prisma/client';
import { SYSTEM_REF_SELECT } from '../../system/dto/system.dto';

/** Controlled response shape for the licence-type catalog (no raw entity / timestamps). */
export const LICENCE_TYPE_SELECT = {
  id: true,
  label: true,
  description: true,
  maximumUnitAllowed: true,
  allowedUsersCount: true,
  system: { select: SYSTEM_REF_SELECT },
} as const;

export type LicenceTypeDto = Prisma.LicenceTypeGetPayload<{ select: typeof LICENCE_TYPE_SELECT }>;
