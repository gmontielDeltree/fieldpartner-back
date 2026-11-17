-- CreateEnum
CREATE TYPE "DeviceAvailability" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "type_devices" (
    "id" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "description" TEXT,
    "family" TEXT,
    "subFamily" TEXT,
    "available" "DeviceAvailability" NOT NULL DEFAULT 'INACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "type_devices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "type_devices_model_key" ON "type_devices"("model");

-- The licence-type label (C/L/H) is the user-facing business key; the id is DB-generated.
CREATE UNIQUE INDEX "licence_types_label_key" ON "licence_types"("label");
