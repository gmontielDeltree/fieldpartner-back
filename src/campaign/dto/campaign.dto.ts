import { Prisma } from '@prisma/client';
import { ZONE_REF_SELECT } from '../../zone/dto/zone.dto';

/**
 * Controlled response shape for campaigns. The lot layout is a compact reference: its lots
 * and geometries are served by the lots API (KAN-65).
 */
export const CAMPAIGN_SELECT = {
  id: true,
  accountId: true,
  zoneId: true,
  name: true,
  description: true,
  zafras: true,
  startDate: true,
  endDate: true,
  state: true,
  lotLayoutId: true,
  createdAt: true,
  updatedAt: true,
  zone: { select: ZONE_REF_SELECT },
  lotLayout: { select: { id: true, name: true, lockedAt: true, promotedAt: true } },
} as const;

export type CampaignDto = Prisma.CampaignGetPayload<{ select: typeof CAMPAIGN_SELECT }>;
