-- Wave 4: systems, modules and menu-modules move from CouchDB to PostgreSQL.

-- CreateEnum
CREATE TYPE "MenuType" AS ENUM ('SIDEBAR', 'NAVBAR', 'MODAL');

-- CreateTable
CREATE TABLE "systems" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT,
    "technicalDetails" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "systems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modules" (
    "id" TEXT NOT NULL,
    "nameEs" TEXT NOT NULL,
    "nameEn" TEXT,
    "namePt" TEXT,
    "icon" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_modules" (
    "id" INTEGER NOT NULL,
    "moduleId" TEXT NOT NULL,
    "systemId" TEXT,
    "parentId" INTEGER,
    "menuType" "MenuType" NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "labelEs" TEXT NOT NULL,
    "labelEn" TEXT,
    "labelPt" TEXT,
    "details" TEXT,
    "icon" TEXT,
    "route" TEXT,
    "full" BOOLEAN NOT NULL DEFAULT true,
    "light" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "menu_modules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "systems_code_key" ON "systems"("code");
CREATE INDEX "menu_modules_moduleId_idx" ON "menu_modules"("moduleId");
CREATE INDEX "menu_modules_systemId_idx" ON "menu_modules"("systemId");
CREATE INDEX "menu_modules_parentId_idx" ON "menu_modules"("parentId");

-- licence_types.systemType (free text matching CouchDB system.system) → FK to systems.
ALTER TABLE "licence_types" ADD COLUMN "systemId" TEXT;

-- Backfill: one system per distinct systemType already in use, so no licence type loses it.
-- code = name = the old text; an admin can fix code/version afterwards from the backoffice.
INSERT INTO "systems" ("id", "code", "name", "updatedAt")
SELECT gen_random_uuid()::text, t."systemType", t."systemType", CURRENT_TIMESTAMP
FROM (SELECT DISTINCT "systemType" FROM "licence_types"
      WHERE "systemType" IS NOT NULL AND btrim("systemType") <> '') t;

UPDATE "licence_types" lt SET "systemId" = s."id"
FROM "systems" s WHERE s."code" = lt."systemType";

ALTER TABLE "licence_types" DROP COLUMN "systemType";

CREATE INDEX "licence_types_systemId_idx" ON "licence_types"("systemId");

-- AddForeignKey
ALTER TABLE "licence_types" ADD CONSTRAINT "licence_types_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "systems"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "menu_modules" ADD CONSTRAINT "menu_modules_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "modules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "menu_modules" ADD CONSTRAINT "menu_modules_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "systems"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "menu_modules" ADD CONSTRAINT "menu_modules_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "menu_modules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
