-- Rename business key: the technical id is DB-generated; the user-facing field is the category type.
ALTER TABLE "categories" RENAME COLUMN "idCategory" TO "categoryType";
ALTER INDEX "categories_idCategory_key" RENAME TO "categories_categoryType_key";
