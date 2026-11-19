/**
 * One-off import of the backoffice menu masters from CouchDB into PostgreSQL (Wave 4):
 *   system → systems, modules → modules (FeatureModule), menu-modules → menu_modules.
 *
 * Usage (from fieldpartner-back/):
 *   COUCHDB_URL=https://user:pass@host/ npx ts-node --transpile-only scripts/import-couchdb-menus.ts
 *   ...add --apply to write (default is a dry run that only prints the plan).
 *   COUCHDB_DB_SUFFIX=_stg to read the staging databases.
 *
 * Idempotent: systems match by code (or by name for the ones the migration backfilled),
 * modules by Spanish name, menus are upserted by id. Re-running updates in place.
 *
 * Legacy data quirks handled here (see the printed report):
 * - menu `module` is either the module object or just its name (string), sometimes a module
 *   that never existed in `modules` → that module is created.
 * - menu ids are strings, some invalid (0, duplicates, "menu:stock-query-…") → a new id is
 *   assigned after the highest valid one and the mapping is printed (check permissions!).
 * - `menuType` missing on most docs → null (permission-only option, not shown in any menu).
 * - `systemType` is a label ("FieldPartner: 3.2.1") → resolved to the system id, or null.
 *
 * Scripts sit outside the module structure: they talk to Prisma directly on purpose.
 */
import 'dotenv/config';
import { MenuType, PrismaClient } from '@prisma/client';

type CouchDoc = Record<string, unknown> & { _id: string };

const APPLY = process.argv.includes('--apply');
const SUFFIX = process.env.COUCHDB_DB_SUFFIX ?? '';
const prisma = new PrismaClient();

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : v == null ? '' : String(v).trim());
const orNull = (v: unknown): string | null => {
  const s = str(v);
  return s && s.toUpperCase() !== 'N/A' ? s : null;
};
const norm = (v: unknown) => str(v).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

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

const MENU_TYPES: Record<string, MenuType> = {
  sidebar: MenuType.SIDEBAR,
  navbar: MenuType.NAVBAR,
  modal: MenuType.MODAL,
};

/** 'X' / true → true, '' / false → false, missing → true (schema default). */
const flag = (v: unknown) => (v === undefined || v === null ? true : v === true || str(v).toUpperCase() === 'X');

async function main() {
  const [couchSystems, couchModules, couchMenus] = await Promise.all([
    fetchAll('system'),
    fetchAll('modules'),
    fetchAll('menu-modules'),
  ]);
  console.log(`CouchDB${SUFFIX}: ${couchSystems.length} systems, ${couchModules.length} modules, ${couchMenus.length} menus`);
  console.log(APPLY ? 'Mode: APPLY (writing to PostgreSQL)\n' : 'Mode: dry run (nothing is written; use --apply)\n');

  const report: string[] = [];

  await prisma.$transaction(
    async (tx) => {
      // ── Systems ──────────────────────────────────────────────────────────
      const systemByLabel = new Map<string, string>(); // norm("name") / norm("name: version") → id
      const existingSystems = await tx.system.findMany();
      for (const doc of couchSystems) {
        const name = str(doc.system);
        const code = str(doc.id) || name;
        const data = { code, name, version: orNull(doc.version), technicalDetails: orNull(doc.technicalDetails) };
        const match =
          existingSystems.find((s) => s.code === code) ??
          // the migration backfilled systems with code = name; adopt them instead of duplicating
          existingSystems.find((s) => norm(s.name) === norm(name) && s.code === s.name);
        let id = match?.id ?? `(new ${code})`;
        if (APPLY) id = match ? (await tx.system.update({ where: { id: match.id }, data })).id : (await tx.system.create({ data })).id;
        report.push(`system  ${match ? 'update' : 'create'} ${code} "${name}" ${data.version ?? ''}`);
        systemByLabel.set(norm(name), id);
        systemByLabel.set(norm(`${name}: ${str(doc.version)}`), id);
      }

      // ── Modules ──────────────────────────────────────────────────────────
      const moduleIdByCouchId = new Map<string, string>();
      const moduleIdByName = new Map<string, string>();
      const moduleIdByOrder = new Map<number, string>();
      const existingModules = await tx.featureModule.findMany();
      const upsertModule = async (data: { nameEs: string; nameEn: string | null; namePt: string | null; icon: string | null; order: number }, why: string) => {
        const match = existingModules.find((m) => norm(m.nameEs) === norm(data.nameEs));
        let id = match?.id ?? `(new ${data.nameEs})`;
        if (APPLY) {
          id = match
            ? (await tx.featureModule.update({ where: { id: match.id }, data })).id
            : (await tx.featureModule.create({ data })).id;
          if (!match) existingModules.push({ ...data, id, createdAt: new Date(), updatedAt: new Date() });
        }
        report.push(`module  ${match ? 'update' : 'create'} "${data.nameEs}" order=${data.order}${why}`);
        moduleIdByName.set(norm(data.nameEs), id);
        return id;
      };
      for (const doc of couchModules) {
        const order = Number(doc.orden ?? doc.order ?? 0) || 0;
        const id = await upsertModule(
          { nameEs: str(doc.moduleNameEs), nameEn: orNull(doc.moduleNameEn), namePt: orNull(doc.moduleNamePt), icon: orNull(doc.icon), order },
          '',
        );
        moduleIdByCouchId.set(doc._id, id);
        if (order) moduleIdByOrder.set(order, id);
      }
      let nextModuleOrder = Math.max(0, ...couchModules.map((m) => Number(m.orden ?? m.order ?? 0) || 0)) + 1;

      const resolveModule = async (menu: CouchDoc, menuId: number): Promise<string> => {
        const raw = Array.isArray(menu.module) ? menu.module[0] : menu.module;
        if (raw && typeof raw === 'object') {
          const obj = raw as CouchDoc;
          const byId = obj._id && moduleIdByCouchId.get(obj._id);
          if (byId) return byId;
          const byName = moduleIdByName.get(norm(obj.moduleNameEs));
          if (byName) return byName;
        }
        const name = typeof raw === 'string' && raw !== '[object Object]' ? raw.trim() : '';
        if (name) {
          return moduleIdByName.get(norm(name)) ??
            (await upsertModule({ nameEs: name, nameEn: null, namePt: null, icon: null, order: nextModuleOrder++ }, ` (only referenced by menus)`));
        }
        // Unreadable module: menus use "module.position" orders, so the integer part points to the module.
        const byOrder = moduleIdByOrder.get(Math.trunc(Number(menu.order)));
        if (byOrder) {
          report.push(`menu    ${menuId}: unreadable module, inferred from order ${str(menu.order)}`);
          return byOrder;
        }
        return moduleIdByName.get(norm('Sin módulo')) ??
          (await upsertModule({ nameEs: 'Sin módulo', nameEn: null, namePt: null, icon: null, order: 99 }, ' (fallback)'));
      };

      // ── Menus ────────────────────────────────────────────────────────────
      // Deterministic: sort by CouchDB _id so re-runs assign the same ids.
      const docs = [...couchMenus].sort((a, b) => a._id.localeCompare(b._id));
      const isValidId = (v: unknown) => /^\d+$/.test(str(v)) && Number(str(v)) >= 1;
      const taken = new Set<number>();
      const idByCouchId = new Map<string, number>();
      for (const doc of docs) {
        if (isValidId(doc.id) && !taken.has(Number(str(doc.id)))) {
          taken.add(Number(str(doc.id)));
          idByCouchId.set(doc._id, Number(str(doc.id)));
        }
      }
      let nextId = Math.max(0, ...taken) + 1;
      for (const doc of docs) {
        if (idByCouchId.has(doc._id)) continue;
        idByCouchId.set(doc._id, nextId);
        report.push(`menu    id "${str(doc.id)}" (_id ${doc._id}, "${str(doc.menuOption)}") → new id ${nextId}`);
        nextId++;
      }

      const parents: { id: number; parentId: number }[] = [];
      for (const doc of docs) {
        const id = idByCouchId.get(doc._id)!;
        const systemLabel = str(doc.systemType);
        const systemId = systemLabel ? systemByLabel.get(norm(systemLabel)) ?? null : null;
        if (systemLabel && !systemId) report.push(`menu    ${id}: system "${systemLabel}" not found → null`);
        const order = Number(str(doc.order));
        const data = {
          moduleId: await resolveModule(doc, id),
          systemId: systemId?.startsWith('(new') ? null : systemId,
          menuType: MENU_TYPES[norm(doc.menuType)] ?? null,
          order: Number.isFinite(order) ? order : 0,
          labelEs: str(doc.menuOption) || str(doc.menuOptionEs) || `Menú ${id}`,
          labelEn: orNull(doc.menuOptionEn),
          labelPt: orNull(doc.menuOptionPt),
          details: orNull(doc.details),
          icon: orNull(doc.icon),
          route: orNull(doc.route),
          full: flag(doc.full),
          light: flag(doc.light),
          parentId: null,
        };
        if (isValidId(doc.parentId)) parents.push({ id, parentId: Number(str(doc.parentId)) });
        if (APPLY) await tx.menuModule.upsert({ where: { id }, create: { id, ...data }, update: data });
      }
      // Parents last, once every menu exists (FK). Legacy parentIds point at legacy ids.
      for (const p of parents) {
        if (!taken.has(p.parentId)) {
          report.push(`menu    ${p.id}: parent ${p.parentId} not found → top level`);
          continue;
        }
        if (APPLY) await tx.menuModule.update({ where: { id: p.id }, data: { parentId: p.parentId } });
      }

      console.log(report.join('\n'));
      const types = docs.reduce<Record<string, number>>((acc, d) => {
        const t = MENU_TYPES[norm(d.menuType)] ?? 'null (permission-only)';
        acc[t] = (acc[t] ?? 0) + 1;
        return acc;
      }, {});
      console.log(`\nmenus: ${docs.length} (${Object.entries(types).map(([k, v]) => `${k}: ${v}`).join(', ')})`);
    },
    { timeout: 60_000 },
  );
  console.log(APPLY ? '\nDone.' : '\nDry run finished. Re-run with --apply to write.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
