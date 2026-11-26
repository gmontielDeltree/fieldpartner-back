/**
 * One-off import of the account numerators from CouchDB into PostgreSQL (KAN-71).
 *
 * The front now takes numbers from /numerators, but withdrawal orders, purchase orders,
 * contracts and work orders already issued still live in CouchDB with their numbers. Without
 * this import every account would start again at 1 and repeat numbers (withdrawal order lines
 * join the order by number). Run it before the front branch reaches an environment.
 *
 * Usage (from fieldpartner-back/):
 *   COUCHDB_URL=https://user:pass@host/ npm run import:couch-numerators
 *   ...add `-- --apply` to write (default is a dry run that only prints the plan).
 *   COUCHDB_DB_SUFFIX=_stg to read the staging databases.
 *
 * Idempotent and never goes back: the value written is GREATEST(Postgres, CouchDB), so numbers
 * already taken through the back are kept. Accounts must exist in Postgres with the same id
 * as in CouchDB; the others are reported and skipped.
 *
 * Scripts sit outside the module structure: they talk to Prisma directly on purpose.
 */
import 'dotenv/config';
import { Prisma, PrismaClient } from '@prisma/client';
import { CouchDoc, planNumerators } from './lib/couchdb-numerators.mapping';

const APPLY = process.argv.includes('--apply');
const SUFFIX = process.env.COUCHDB_DB_SUFFIX ?? '';
const prisma = new PrismaClient();

async function fetchAll(db: string): Promise<CouchDoc[]> {
  const raw = process.env.COUCHDB_URL;
  if (!raw) throw new Error('COUCHDB_URL is not set');
  const url = new URL(raw);
  const auth = Buffer.from(`${decodeURIComponent(url.username)}:${decodeURIComponent(url.password)}`).toString('base64');
  const res = await fetch(`${url.origin}/${db}${SUFFIX}/_all_docs?include_docs=true`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  if (!res.ok) throw new Error(`CouchDB ${db}${SUFFIX}: HTTP ${res.status}`);
  const body = (await res.json()) as { rows: { doc: CouchDoc }[] };
  return body.rows.map((r) => r.doc).filter((d) => !d._id.startsWith('_design/'));
}

async function main() {
  const docs = await fetchAll('numerators');
  const plan = planNumerators(docs);
  console.log(`CouchDB${SUFFIX}: ${docs.length} numerators → ${plan.items.length} (account, type) values`);
  console.log(APPLY ? 'Mode: APPLY (writing to PostgreSQL)\n' : 'Mode: dry run (nothing is written; use --apply)\n');

  const accountIds = [...new Set(plan.items.map((i) => i.accountId))];
  const known = new Set(
    (await prisma.account.findMany({ where: { id: { in: accountIds } }, select: { id: true } })).map((a) => a.id),
  );
  const existing = new Map(
    (
      await prisma.numerator.findMany({
        where: { accountId: { in: accountIds } },
        select: { accountId: true, numeratorType: true, lastNumerator: true },
      })
    ).map((n) => [`${n.accountId}|${n.numeratorType}`, n.lastNumerator]),
  );

  let written = 0;
  for (const item of plan.items) {
    const label = `${item.accountId} ${item.numeratorType}`;
    if (!known.has(item.accountId)) {
      console.log(`skip   ${label}: account not in PostgreSQL (couch ${item.lastNumerator})`);
      continue;
    }
    const current = existing.get(`${item.accountId}|${item.numeratorType}`);
    const dupes = item.sourceIds.length > 1 ? ` (max of ${item.sourceIds.length} docs)` : '';
    if (current !== undefined && current >= item.lastNumerator) {
      console.log(`keep   ${label}: postgres ${current} >= couch ${item.lastNumerator}${dupes}`);
      continue;
    }
    console.log(`set    ${label}: ${current ?? '-'} → ${item.lastNumerator}${dupes}`);
    written += 1;
    if (APPLY) {
      await prisma.$executeRaw(Prisma.sql`
        INSERT INTO numerators (id, "accountId", "numeratorType", "lastNumerator", "createdAt", "updatedAt")
        VALUES (gen_random_uuid()::text, ${item.accountId}, ${item.numeratorType}::"NumeratorType", ${item.lastNumerator}, NOW(), NOW())
        ON CONFLICT ("accountId", "numeratorType")
        DO UPDATE SET "lastNumerator" = GREATEST(numerators."lastNumerator", EXCLUDED."lastNumerator"), "updatedAt" = NOW()
      `);
    }
  }
  for (const s of plan.skipped) console.log(`skip   doc ${s.id}: ${s.reason}`);

  console.log(`\n${written} to write, ${plan.skipped.length} docs skipped.`);
  console.log(APPLY ? 'Done.' : 'Dry run finished. Re-run with --apply to write.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
