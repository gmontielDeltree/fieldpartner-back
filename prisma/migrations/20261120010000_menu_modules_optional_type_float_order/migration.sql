-- Legacy menus without a type are permission-only options; order keeps the module.position format (6.03).
-- AlterTable
ALTER TABLE "menu_modules" ALTER COLUMN "menuType" DROP NOT NULL,
ALTER COLUMN "order" SET DEFAULT 0,
ALTER COLUMN "order" SET DATA TYPE DOUBLE PRECISION;

