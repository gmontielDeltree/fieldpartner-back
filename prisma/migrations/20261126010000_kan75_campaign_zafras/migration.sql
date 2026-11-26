-- KAN-75: a campaign has several zafras (the front form picks a list).
ALTER TABLE "campaigns" ADD COLUMN "zafras" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "campaigns" SET "zafras" = ARRAY["zafra"] WHERE "zafra" IS NOT NULL AND "zafra" <> '';

ALTER TABLE "campaigns" DROP COLUMN "zafra";
