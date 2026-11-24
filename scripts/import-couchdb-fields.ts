/**
 * One-off import of fields and lots from the CouchDB `fields` database into PostgreSQL/PostGIS
 * (KAN-65): `campos_*` documents → fields, `lotes` → lots of the account's "Base" layout,
 * each `lotBranches[<branchId>]` → lots of a layout of its own (`legacyBranchId`).
 *
 * Usage (from fieldpartner-back/):
 *   COUCHDB_URL=https://user:pass@host/ npm run import:couch-fields
 *   ...add --apply to write (default is a dry run: everything runs inside a transaction that is
 *   rolled back, so the report — PostGIS checks included — is exactly what --apply would do).
 *   COUCHDB_DB_SUFFIX=_stg to read the staging databases.
 *   --account=<CouchDB accountId> to import a single account;
 *   --into=<PostgreSQL account id> (with --account) to load it into a different account, e.g.
 *   a local test account. Otherwise the PostgreSQL account must have the same id.
 *
 * Idempotent: fields match by (account, CouchDB `_id`), layouts by (account, branch id), lots
 * by (field, layout, legacy id / uuid / name). Re-running updates in place. One transaction
 * per account: an error leaves that account untouched and the run continues.
 *
 * Campaigns are NOT imported here. The campaign import links them with
 *   Campaign.lotLayoutId = LotLayout where legacyBranchId = campaign.lotBranchId ?? 'legacy'
 * and closing semantics follow (a layout used by a closed campaign is frozen). The CouchDB
 * `campaigns` database is only read to name the branch layouts and copy `lotBranchPromotedAt`.
 *
 * Legacy data is kept rather than rejected (see the printed report):
 * - invalid outlines are repaired with ST_MakeValid; open rings are closed; degenerate rings dropped.
 * - a lot up to 1 % outside its field is clipped (same rule as the API); more is imported as is
 *   and flagged. Overlaps above 1 % are flagged too. Fix them in the app before editing.
 * - repeated lots in one branch are imported once; empty or repeated names are renamed and the
 *   original kept in `legacyName`.
 * - `hectareas` from the browser is ignored: hectares are computed by PostGIS.
 *
 * Scripts sit outside the module structure: they talk to Prisma directly on purpose.
 */
import 'dotenv/config';
import { randomUUID } from 'crypto';
import { Prisma, PrismaClient } from '@prisma/client';
import { GEOMETRY_EPSILON, LOT_OUTSIDE_TOLERANCE, LOT_OVERLAP_TOLERANCE, MultiPolygonGeometry } from '../src/common/geo/geo.types';
import { Db, fromHex, GeometryHex, GeometryRepository, normalized, nowUtc } from '../src/common/geo/geometry.repository';
import {
  CouchDoc,
  fieldBranches,
  legacyLots,
  planLayouts,
  toLegacyGeometry,
  uniqueLotName,
} from './lib/couchdb-fields.mapping';

const APPLY = process.argv.includes('--apply');
const SUFFIX = process.env.COUCHDB_DB_SUFFIX ?? '';
const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1]?.trim() || null;
const ONLY_ACCOUNT = arg('account');
const INTO_ACCOUNT = arg('into');

const prisma = new PrismaClient();
// Its methods take the transaction client explicitly; the constructor argument is unused here.
const geo = new GeometryRepository(prisma as never);

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : v == null ? '' : String(v).trim());
const pct = (ratio: number) => `${(ratio * 100).toFixed(1)} %`;

class DryRunRollback extends Error {}

function couch(): { origin: string; auth: string } {
  const raw = process.env.COUCHDB_URL;
  if (!raw) throw new Error('COUCHDB_URL is not set');
  const url = new URL(raw);
  const auth = Buffer.from(`${decodeURIComponent(url.username)}:${decodeURIComponent(url.password)}`).toString('base64');
  return { origin: url.origin, auth };
}

/** `_all_docs` in pages; `range` limits it to an id prefix (the `fields` db holds much more). */
async function fetchAll(db: string, prefix?: string): Promise<CouchDoc[]> {
  const { origin, auth } = couch();
  const docs: CouchDoc[] = [];
  let startkey = prefix ?? '';
  for (let skip = 0; ; skip = 1) {
    const params = new URLSearchParams({ include_docs: 'true', limit: '500', skip: String(skip) });
    if (startkey) params.set('startkey', JSON.stringify(startkey));
    if (prefix) params.set('endkey', JSON.stringify(`${prefix}￰`));
    const res = await fetch(`${origin}/${db}${SUFFIX}/_all_docs?${params}`, { headers: { Authorization: `Basic ${auth}` } });
    if (!res.ok) throw new Error(`CouchDB ${db}${SUFFIX}: HTTP ${res.status}`);
    const { rows } = (await res.json()) as { rows: { id: string; doc?: CouchDoc }[] };
    docs.push(...rows.map((r) => r.doc).filter((d): d is CouchDoc => Boolean(d) && !d._id.startsWith('_design/')));
    if (rows.length < 500) return docs;
    startkey = rows[rows.length - 1].id;
  }
}

interface Prepared {
  valid: boolean;
  reason: string | null;
  hex: GeometryHex | null;
}

/** Like GeometryRepository.normalize, but repairs invalid input instead of rejecting it. */
async function prepareGeometry(geometry: MultiPolygonGeometry, tx: Db): Promise<Prepared> {
  const [row] = await tx.$queryRaw<Prepared[]>`
    WITH raw AS (SELECT ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(geometry)}), 4326) AS g),
         fix AS (SELECT ST_IsValid(g) AS valid,
                        CASE WHEN ST_IsValid(g) THEN NULL ELSE ST_IsValidReason(g) END AS reason,
                        CASE WHEN ST_IsValid(g) THEN g ELSE ST_MakeValid(g, 'method=structure') END AS g
                 FROM raw),
         norm AS (SELECT valid, reason, ${normalized(Prisma.sql`g`)} AS n FROM fix)
    SELECT valid, reason,
           CASE WHEN NOT ST_IsEmpty(n) AND ST_IsValid(n) THEN encode(ST_AsEWKB(n), 'hex') END AS hex
    FROM norm`;
  return row;
}

interface Totals {
  fields: { created: number; updated: number; skipped: number };
  layouts: { created: number; updated: number };
  lots: { created: number; updated: number; skipped: number; duplicates: number; clipped: number };
  warnings: number;
}

const newTotals = (): Totals => ({
  fields: { created: 0, updated: 0, skipped: 0 },
  layouts: { created: 0, updated: 0 },
  lots: { created: 0, updated: 0, skipped: 0, duplicates: 0, clipped: 0 },
  warnings: 0,
});

async function importAccount(
  tx: Db,
  accountId: string,
  fieldDocs: CouchDoc[],
  campaigns: CouchDoc[],
  countryIds: Map<string, string>,
  report: string[],
  totals: Totals,
): Promise<void> {
  const warn = (line: string) => {
    totals.warnings++;
    report.push(`  ⚠ ${line}`);
  };

  // ── Layouts ────────────────────────────────────────────────────────────
  const branchIds = new Set<string>();
  for (const doc of fieldDocs) for (const id of fieldBranches(doc).keys()) branchIds.add(id);
  const layoutIds = new Map<string, string>();
  for (const plan of planLayouts(branchIds, campaigns)) {
    const existing = await tx.lotLayout.findUnique({
      where: { accountId_legacyBranchId: { accountId, legacyBranchId: plan.legacyBranchId } },
      select: { id: true },
    });
    const data = { name: plan.name, promotedAt: plan.promotedAt };
    const { id } = existing
      ? await tx.lotLayout.update({ where: { id: existing.id }, data, select: { id: true } })
      : await tx.lotLayout.create({ data: { ...data, accountId, legacyBranchId: plan.legacyBranchId }, select: { id: true } });
    totals.layouts[existing ? 'updated' : 'created']++;
    layoutIds.set(plan.legacyBranchId, id);
    report.push(`  layout ${existing ? 'update' : 'create'} "${plan.name}" (${plan.legacyBranchId})${plan.promotedAt ? ' promovido' : ''}`);
  }

  // ── Fields and their lots ──────────────────────────────────────────────
  const reportedOverlaps = new Set<string>();
  for (const doc of [...fieldDocs].sort((a, b) => a._id.localeCompare(b._id))) {
    const fieldName = str(doc.nombre) || 'Campo sin nombre';
    const label = `campo "${fieldName}" (${doc._id})`;
    const outline = toLegacyGeometry(doc.campo_geojson);
    const prepared = outline.geometry ? await prepareGeometry(outline.geometry, tx) : null;
    if (!prepared?.hex) {
      totals.fields.skipped++;
      warn(`${label}: NO se importa (${outline.problem ?? 'la geometría queda vacía al repararla'}) — sus lotes tampoco`);
      continue;
    }
    for (const r of outline.repairs) warn(`${label}: ${r}`);
    if (!prepared.valid) warn(`${label}: geometría reparada (${prepared.reason})`);
    const fieldHex = prepared.hex;

    const countryCode = str(doc.countryId);
    const countryId = countryCode ? countryIds.get(countryCode.toUpperCase()) ?? countryIds.get(countryCode) ?? null : null;
    if (countryCode && !countryId) warn(`${label}: país "${countryCode}" no existe → sin país`);

    const existingField = await tx.field.findUnique({
      where: { accountId_legacyId: { accountId, legacyId: doc._id } },
      select: { id: true },
    });
    const fieldId = existingField?.id ?? randomUUID();
    const legacyUuid = str(doc.uuid) || null;
    if (existingField) {
      await tx.$executeRaw`
        UPDATE fields SET name = ${fieldName}, "countryId" = ${countryId}, geometry = ${fromHex(fieldHex)},
                          "legacyUuid" = ${legacyUuid}, "updatedAt" = ${nowUtc}
        WHERE id = ${fieldId}`;
    } else {
      await tx.$executeRaw`
        INSERT INTO fields (id, "accountId", "countryId", name, geometry, "legacyId", "legacyUuid", "updatedAt")
        VALUES (${fieldId}, ${accountId}, ${countryId}, ${fieldName}, ${fromHex(fieldHex)}, ${doc._id}, ${legacyUuid}, ${nowUtc})`;
    }
    totals.fields[existingField ? 'updated' : 'created']++;

    let lotCount = 0;
    for (const [branchId, rawLots] of fieldBranches(doc)) {
      const layoutId = layoutIds.get(branchId);
      if (!layoutId) throw new Error(`no layout planned for branch ${branchId}`); // planLayouts covers every branch
      const { lots, duplicates } = legacyLots(rawLots);
      totals.lots.duplicates += duplicates.length;
      for (const d of duplicates) warn(`${label} [${branchId}]: lote "${d.legacyName}" repetido → se importa una vez`);

      // Names already used in this field + layout by lots created through the API.
      const apiLots = await tx.lot.findMany({
        where: { fieldId, layoutId, archivedAt: null, legacyId: null, legacyUuid: null, legacyName: null },
        select: { name: true },
      });
      const taken = new Set(apiLots.map((l) => l.name.toLowerCase()));

      for (const [index, lot] of lots.entries()) {
        const lotLabel = `${label} [${branchId}] lote "${lot.legacyName || `#${index + 1}`}"`;
        const shape = toLegacyGeometry(lot.feature);
        let hex = shape.geometry ? (await prepareGeometry(shape.geometry, tx))?.hex ?? null : null;
        if (!hex) {
          totals.lots.skipped++;
          warn(`${lotLabel}: NO se importa (${shape.problem ?? 'la geometría queda vacía al repararla'})`);
          continue;
        }
        for (const r of shape.repairs) warn(`${lotLabel}: ${r}`);

        const fit = await geo.fitInField(hex, fieldHex, tx);
        if (fit.outsideRatio > GEOMETRY_EPSILON && fit.outsideRatio <= LOT_OUTSIDE_TOLERANCE && fit.clippedHex) {
          hex = fit.clippedHex;
          totals.lots.clipped++;
        } else if (fit.outsideRatio > LOT_OUTSIDE_TOLERANCE) {
          warn(`${lotLabel}: queda ${pct(fit.outsideRatio)} fuera del campo (se importa igual; corregir en la app)`);
        }

        const name = uniqueLotName(lot.legacyName, index + 1, taken);
        if (name !== lot.legacyName) warn(`${lotLabel}: se guarda como "${name}"`);

        const match = await tx.lot.findFirst({
          where: {
            fieldId,
            layoutId,
            OR: [
              ...(lot.legacyId ? [{ legacyId: lot.legacyId }] : []),
              ...(lot.legacyUuid ? [{ legacyUuid: lot.legacyUuid }] : []),
              ...(!lot.legacyId && !lot.legacyUuid ? [{ legacyId: null, legacyUuid: null, legacyName: lot.legacyName }] : []),
            ],
          },
          select: { id: true },
        });
        const lotId = match?.id ?? randomUUID();
        if (match) {
          await tx.$executeRaw`
            UPDATE lots SET name = ${name}, geometry = ${fromHex(hex)}, "legacyId" = ${lot.legacyId},
                            "legacyUuid" = ${lot.legacyUuid}, "legacyName" = ${lot.legacyName}, "updatedAt" = ${nowUtc}
            WHERE id = ${lotId}`;
        } else {
          await tx.$executeRaw`
            INSERT INTO lots (id, "fieldId", "layoutId", name, geometry, "legacyId", "legacyUuid", "legacyName", "updatedAt")
            VALUES (${lotId}, ${fieldId}, ${layoutId}, ${name}, ${fromHex(hex)}, ${lot.legacyId}, ${lot.legacyUuid},
                    ${lot.legacyName}, ${nowUtc})`;
        }
        totals.lots[match ? 'updated' : 'created']++;
        lotCount++;

        for (const o of await geo.overlaps(layoutId, hex, lotId, tx)) {
          const pair = [lotId, o.id].sort().join('|');
          if (o.ratio <= LOT_OVERLAP_TOLERANCE || reportedOverlaps.has(pair)) continue;
          reportedOverlaps.add(pair);
          warn(`${lotLabel}: se superpone ${pct(o.ratio)} con "${o.name}" (se importa igual; corregir en la app)`);
        }
      }
    }
    report.push(`  campo ${existingField ? 'update' : 'create'} "${fieldName}" — ${lotCount} lotes`);
  }
}

async function main() {
  const [allFields, allCampaigns] = await Promise.all([fetchAll('fields', 'campos_'), fetchAll('campaigns')]);
  console.log(`CouchDB${SUFFIX}: ${allFields.length} campos, ${allCampaigns.length} campañas`);
  console.log(APPLY ? 'Mode: APPLY (writing to PostgreSQL)\n' : 'Mode: dry run (nothing is written; use --apply)\n');
  if (INTO_ACCOUNT && !ONLY_ACCOUNT) throw new Error('--into needs --account');

  const byAccount = new Map<string, CouchDoc[]>();
  for (const doc of allFields) {
    const accountId = str(doc.accountId);
    if (ONLY_ACCOUNT && accountId !== ONLY_ACCOUNT) continue;
    byAccount.set(accountId, [...(byAccount.get(accountId) ?? []), doc]);
  }

  const countryIds = new Map<string, string>();
  for (const c of await prisma.country.findMany({ select: { id: true, code: true } })) {
    countryIds.set(c.code.toUpperCase(), c.id);
    countryIds.set(c.id, c.id);
  }

  const grand = newTotals();
  for (const [couchAccountId, docs] of [...byAccount].sort(([a], [b]) => a.localeCompare(b))) {
    const accountId = INTO_ACCOUNT ?? couchAccountId;
    const report: string[] = [];
    const totals = newTotals();
    const header = `Cuenta ${couchAccountId || '(sin accountId)'}${INTO_ACCOUNT ? ` → ${accountId}` : ''}: ${docs.length} campos`;

    const account = accountId ? await prisma.account.findUnique({ where: { id: accountId }, select: { id: true } }) : null;
    if (!account) {
      console.log(`${header}\n  ✗ la cuenta no existe en PostgreSQL → se omite\n`);
      grand.fields.skipped += docs.length;
      continue;
    }
    const campaigns = allCampaigns.filter((c) => str(c.accountId) === couchAccountId);

    try {
      await prisma.$transaction(
        async (tx) => {
          await importAccount(tx, accountId, docs, campaigns, countryIds, report, totals);
          if (!APPLY) throw new DryRunRollback();
        },
        { timeout: 300_000, maxWait: 10_000 },
      );
    } catch (err) {
      if (!(err instanceof DryRunRollback)) {
        console.log(`${header}\n${report.join('\n')}\n  ✗ ERROR, la cuenta queda sin cambios: ${(err as Error).message}\n`);
        grand.fields.skipped += docs.length;
        continue;
      }
    }
    console.log(`${header}\n${report.join('\n')}`);
    console.log(
      `  = campos +${totals.fields.created} ~${totals.fields.updated} ✗${totals.fields.skipped} · ` +
        `layouts +${totals.layouts.created} ~${totals.layouts.updated} · ` +
        `lotes +${totals.lots.created} ~${totals.lots.updated} ✗${totals.lots.skipped} ` +
        `(repetidos ${totals.lots.duplicates}, recortados ${totals.lots.clipped}) · avisos ${totals.warnings}\n`,
    );
    for (const k of ['created', 'updated', 'skipped'] as const) grand.fields[k] += totals.fields[k];
    for (const k of ['created', 'updated'] as const) grand.layouts[k] += totals.layouts[k];
    for (const k of Object.keys(grand.lots) as (keyof Totals['lots'])[]) grand.lots[k] += totals.lots[k];
    grand.warnings += totals.warnings;
  }

  console.log(
    `TOTAL: campos +${grand.fields.created} ~${grand.fields.updated} ✗${grand.fields.skipped} · ` +
      `layouts +${grand.layouts.created} ~${grand.layouts.updated} · ` +
      `lotes +${grand.lots.created} ~${grand.lots.updated} ✗${grand.lots.skipped} · avisos ${grand.warnings}`,
  );
  console.log(APPLY ? '\nDone.' : '\nDry run finished. Re-run with --apply to write.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
