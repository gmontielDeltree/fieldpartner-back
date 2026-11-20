import { Prisma } from '@prisma/client';
import { ZONE_REF_SELECT } from '../../zone/dto/zone.dto';

/**
 * Controlled response shape for campaigns. The field is a compact reference: its geometry
 * and lots are served by the fields module (being redesigned, KAN-65).
 */
export const CAMPAIGN_SELECT = {
  id: true,
  accountId: true,
  zoneId: true,
  fieldId: true,
  name: true,
  description: true,
  zafra: true,
  startDate: true,
  endDate: true,
  state: true,
  lotBranchId: true,
  lotBranchMode: true,
  lotBranchSourceCampaignId: true,
  lotBranchPromotedAt: true,
  createdAt: true,
  updatedAt: true,
  zone: { select: ZONE_REF_SELECT },
  field: { select: { id: true, name: true } },
} as const;

export type CampaignDto = Prisma.CampaignGetPayload<{ select: typeof CAMPAIGN_SELECT }>;
