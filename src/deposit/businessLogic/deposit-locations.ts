import { DepositLocationInputDto } from '../dto/create-deposit.dto';

export interface CurrentLocation {
  id: string;
  name: string;
  number: string | null;
}

export interface LocationSyncPlan {
  /** Locations whose name is no longer in the list. */
  removeIds: string[];
  /** Existing locations whose number changed. */
  update: { id: string; number: string | null }[];
  /** New names. */
  create: { name: string; number: string | null }[];
}

const key = (name: string) => name.trim().toLowerCase();

/**
 * Normalizes the requested list: trimmed names, blank ones dropped and the first of
 * each case-insensitive duplicate kept.
 */
export const normalizeLocations = (wanted: DepositLocationInputDto[]): { name: string; number: string | null }[] => {
  const seen = new Set<string>();
  const result: { name: string; number: string | null }[] = [];
  for (const location of wanted) {
    const name = location.name?.trim();
    if (!name || seen.has(key(name))) continue;
    seen.add(key(name));
    result.push({ name, number: location.number?.trim() || null });
  }
  return result;
};

/** What to change so the deposit ends with exactly `wanted`, keeping ids by name. */
export const planLocationSync = (current: CurrentLocation[], wanted: DepositLocationInputDto[]): LocationSyncPlan => {
  const target = normalizeLocations(wanted);
  const byName = new Map(current.map((location) => [key(location.name), location]));
  const wantedKeys = new Set(target.map((location) => key(location.name)));

  return {
    removeIds: current.filter((location) => !wantedKeys.has(key(location.name))).map((location) => location.id),
    update: target.flatMap((location) => {
      const existing = byName.get(key(location.name));
      return existing && existing.number !== location.number ? [{ id: existing.id, number: location.number }] : [];
    }),
    create: target.filter((location) => !byName.has(key(location.name))),
  };
};
