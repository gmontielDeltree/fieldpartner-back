-- KAN-71: stock and movements redesigned (supplies and grain in one balance table and one
-- ledger, grain commitments apart). Postgres starts from zero (no CouchDB import), so the old
-- tables, a copy of the CouchDB collections that nothing wrote to, are dropped and recreated.

DROP TABLE "crop_deposits";
DROP TABLE "crop_movements";
DROP TABLE "stock_movements";
DROP TABLE "stocks";

-- CreateTable
CREATE TABLE "stocks" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "itemType" "StockItemType" NOT NULL,
    "inputId" TEXT,
    "cropId" TEXT,
    "campaignId" TEXT,
    "zafra" TEXT NOT NULL DEFAULT '',
    "depositId" TEXT NOT NULL,
    "location" TEXT NOT NULL DEFAULT '',
    "nroLot" TEXT NOT NULL DEFAULT '',
    "currentStock" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "reservedStock" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stocks_pkey" PRIMARY KEY ("id"),
    -- A supply row names an input, a grain row a crop; never both.
    CONSTRAINT "stocks_item_check" CHECK (
        ("itemType" = 'SUPPLY' AND "inputId" IS NOT NULL AND "cropId" IS NULL)
        OR ("itemType" = 'CROP' AND "cropId" IS NOT NULL AND "inputId" IS NULL)
    ),
    CONSTRAINT "stocks_reserved_check" CHECK ("reservedStock" >= 0)
);

-- The identity of a balance row. NULLS NOT DISTINCT so two rows without campaign (or without
-- input / crop) still collide: the business logic upserts on this key (ON CONFLICT).
CREATE UNIQUE INDEX "stocks_identity_key" ON "stocks"
    ("accountId", "itemType", "inputId", "cropId", "campaignId", "zafra", "depositId", "location", "nroLot")
    NULLS NOT DISTINCT;

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "stockId" TEXT NOT NULL,
    "movementTypeId" TEXT NOT NULL,
    "direction" "InOutDirection" NOT NULL,
    "amount" DECIMAL(18,4) NOT NULL,
    "operationDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "detail" TEXT,
    "voucher" TEXT,
    "currency" "CurrencyCode",
    "totalValue" DECIMAL(18,4),
    "hours" TEXT,
    "unitMeasurement" TEXT,
    "documentFile" TEXT,
    "documentFileName" TEXT,
    "fieldId" TEXT,
    "lotId" TEXT,
    "sourceType" TEXT,
    "sourceId" TEXT,
    "groupId" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "stock_movements_amount_check" CHECK ("amount" > 0)
);

-- CreateTable
CREATE TABLE "crop_balances" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "zafra" TEXT NOT NULL DEFAULT '',
    "cropId" TEXT NOT NULL,
    "committedKg" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "deliveredKg" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crop_balances_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "crop_balances_amounts_check" CHECK ("committedKg" >= 0 AND "deliveredKg" >= 0)
);

-- CreateIndex
CREATE UNIQUE INDEX "crop_balances_accountId_campaignId_zafra_cropId_key" ON "crop_balances"("accountId", "campaignId", "zafra", "cropId");

-- CreateIndex
CREATE INDEX "stocks_accountId_itemType_idx" ON "stocks"("accountId", "itemType");

-- CreateIndex
CREATE INDEX "stocks_depositId_idx" ON "stocks"("depositId");

-- CreateIndex
CREATE INDEX "stock_movements_accountId_operationDate_idx" ON "stock_movements"("accountId", "operationDate");

-- CreateIndex
CREATE INDEX "stock_movements_stockId_idx" ON "stock_movements"("stockId");

-- CreateIndex
CREATE INDEX "stock_movements_groupId_idx" ON "stock_movements"("groupId");

-- CreateIndex
CREATE INDEX "stock_movements_sourceType_sourceId_idx" ON "stock_movements"("sourceType", "sourceId");

-- AddForeignKey
ALTER TABLE "stocks" ADD CONSTRAINT "stocks_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stocks" ADD CONSTRAINT "stocks_inputId_fkey" FOREIGN KEY ("inputId") REFERENCES "inputs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stocks" ADD CONSTRAINT "stocks_cropId_fkey" FOREIGN KEY ("cropId") REFERENCES "crops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stocks" ADD CONSTRAINT "stocks_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stocks" ADD CONSTRAINT "stocks_depositId_fkey" FOREIGN KEY ("depositId") REFERENCES "deposits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "stocks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_movementTypeId_fkey" FOREIGN KEY ("movementTypeId") REFERENCES "movement_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "fields"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crop_balances" ADD CONSTRAINT "crop_balances_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crop_balances" ADD CONSTRAINT "crop_balances_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crop_balances" ADD CONSTRAINT "crop_balances_cropId_fkey" FOREIGN KEY ("cropId") REFERENCES "crops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
