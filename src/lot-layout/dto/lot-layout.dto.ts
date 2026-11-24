import { CampaignState, Prisma } from '@prisma/client';

/** Controlled response shape for lot layouts (no PostGIS columns: Prisma `select` works). */
export const LOT_LAYOUT_SELECT = {
  id: true,
  accountId: true,
  name: true,
  sourceLayoutId: true,
  promotedAt: true,
  lockedAt: true,
  createdAt: true,
  updatedAt: true,
  campaigns: { select: { id: true, name: true, state: true }, orderBy: { createdAt: 'asc' } },
  _count: { select: { lots: { where: { archivedAt: null } } } },
} as const satisfies Prisma.LotLayoutSelect;

type LotLayoutRow = Prisma.LotLayoutGetPayload<{ select: typeof LOT_LAYOUT_SELECT }>;

export type LotLayoutDto = LotLayoutRow & {
  /** Locked layouts are history: edits from an open campaign work on a copy. */
  locked: boolean;
};

/** Locked once a closed campaign uses it (`lockedAt` is set when the campaign closes). */
export const isLayoutLocked = (row: Pick<LotLayoutRow, 'lockedAt' | 'campaigns'>): boolean =>
  row.lockedAt !== null || row.campaigns.some((c) => c.state === CampaignState.CLOSED);

export const toLotLayoutDto = (row: LotLayoutRow): LotLayoutDto => ({
  ...row,
  locked: isLayoutLocked(row),
});
