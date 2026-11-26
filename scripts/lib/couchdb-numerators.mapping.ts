/**
 * Pure mapping for scripts/import-couchdb-numerators.ts (KAN-71): CouchDB `numerators`
 * docs → one value per (account, type), the highest one.
 */
import { NumeratorType } from '@prisma/client';

export type CouchDoc = Record<string, unknown> & { _id: string };

/** Front labels stored in CouchDB `numeratorType` → Prisma enum. */
export const LEGACY_NUMERATOR_TYPES: Record<string, NumeratorType> = {
  Cliente: NumeratorType.CLIENT,
  'Orden de Trabajo': NumeratorType.WORK_ORDER,
  'Orden de Compra': NumeratorType.PURCHASE_ORDER,
  'Contrato de Venta de Cereal': NumeratorType.CEREAL_SALE_CONTRACT,
};

export interface NumeratorPlanItem {
  accountId: string;
  numeratorType: NumeratorType;
  lastNumerator: number;
  /** CouchDB docs merged into this value (legacy data has duplicates per account and type). */
  sourceIds: string[];
}

export interface NumeratorPlan {
  items: NumeratorPlanItem[];
  /** Docs that cannot be imported, with the reason. */
  skipped: { id: string; reason: string }[];
}

export function planNumerators(docs: CouchDoc[]): NumeratorPlan {
  const byKey = new Map<string, NumeratorPlanItem>();
  const skipped: NumeratorPlan['skipped'] = [];

  for (const doc of docs) {
    const accountId = typeof doc.accountId === 'string' ? doc.accountId.trim() : '';
    const label = typeof doc.numeratorType === 'string' ? doc.numeratorType.trim() : '';
    const numeratorType = LEGACY_NUMERATOR_TYPES[label];
    const value = Number(doc.lastNumerator);

    if (!accountId) {
      skipped.push({ id: doc._id, reason: 'without accountId' });
      continue;
    }
    if (!numeratorType) {
      skipped.push({ id: doc._id, reason: `unknown numeratorType "${label}"` });
      continue;
    }
    if (!Number.isInteger(value) || value < 0) {
      skipped.push({ id: doc._id, reason: `invalid lastNumerator "${String(doc.lastNumerator)}"` });
      continue;
    }

    const key = `${accountId}|${numeratorType}`;
    const current = byKey.get(key);
    if (!current) {
      byKey.set(key, { accountId, numeratorType, lastNumerator: value, sourceIds: [doc._id] });
    } else {
      current.lastNumerator = Math.max(current.lastNumerator, value);
      current.sourceIds.push(doc._id);
    }
  }

  const items = [...byKey.values()].sort(
    (a, b) => a.accountId.localeCompare(b.accountId) || a.numeratorType.localeCompare(b.numeratorType),
  );
  return { items, skipped };
}
