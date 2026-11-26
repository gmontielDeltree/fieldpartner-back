-- KAN-70: third-party (entity) categories, separate from input categories.
CREATE TABLE "entity_categories" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "descriptionES" TEXT NOT NULL,
    "descriptionPT" TEXT NOT NULL,
    "descriptionEN" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entity_categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "entity_categories_code_key" ON "entity_categories"("code");
