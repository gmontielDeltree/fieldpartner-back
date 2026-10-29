-- CreateEnum
CREATE TYPE "CropType" AS ENUM ('TUBER', 'GRAMINEAE', 'TEXTILE', 'LEGUME', 'OILSEED', 'INDUSTRIAL', 'CEREAL');

-- CreateEnum
CREATE TYPE "Labor" AS ENUM ('PREPARATION', 'SOWING', 'APPLICATION', 'UPROOTING', 'HARVEST');

-- CreateEnum
CREATE TYPE "AccountCategory" AS ENUM ('A', 'B', 'C');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LicenceStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'EXPIRED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "UserState" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING', 'CANCELLED');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "CampaignState" AS ENUM ('ACTIVE', 'INACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "StockItemType" AS ENUM ('SUPPLY', 'CROP');

-- CreateEnum
CREATE TYPE "StockSumType" AS ENUM ('BOTH', 'ADD', 'SUBTRACT');

-- CreateEnum
CREATE TYPE "WithdrawalOrderType" AS ENUM ('MANUAL', 'AUTOMATIC');

-- CreateEnum
CREATE TYPE "WithdrawalState" AS ENUM ('PARTIAL', 'PENDING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('PHYSICAL', 'LEGAL');

-- CreateEnum
CREATE TYPE "NumeratorType" AS ENUM ('CLIENT', 'WORK_ORDER', 'PURCHASE_ORDER', 'CEREAL_SALE_CONTRACT');

-- CreateEnum
CREATE TYPE "LotBranchMode" AS ENUM ('SHARED', 'INDEPENDENT');

-- CreateEnum
CREATE TYPE "DeviceStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "InOutDirection" AS ENUM ('IN', 'OUT');

-- CreateEnum
CREATE TYPE "FuelType" AS ENUM ('DIESEL', 'GASOLINE');

-- CreateEnum
CREATE TYPE "CurrencyCode" AS ENUM ('ARS', 'USD', 'BRL', 'CLP', 'EUR');

-- CreateTable
CREATE TABLE "countries" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "descriptionES" TEXT NOT NULL,
    "descriptionPT" TEXT NOT NULL,
    "descriptionEN" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "taxKey" TEXT NOT NULL,
    "taxKeyFormat" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "countries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zip_codes" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "locality" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,

    CONSTRAINT "zip_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "input_types" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "descriptionES" TEXT NOT NULL,
    "descriptionEN" TEXT NOT NULL,
    "descriptionPT" TEXT NOT NULL,
    "phytosanitary" BOOLEAN NOT NULL DEFAULT false,
    "isCrop" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "input_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "idCategory" TEXT NOT NULL,
    "descriptionES" TEXT NOT NULL,
    "descriptionPT" TEXT NOT NULL,
    "descriptionEN" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crops" (
    "id" TEXT NOT NULL,
    "descriptionES" TEXT NOT NULL,
    "descriptionPT" TEXT,
    "descriptionEN" TEXT,
    "cropType" "CropType" NOT NULL,
    "variety" TEXT,
    "labors" "Labor"[],
    "prepared" BOOLEAN NOT NULL DEFAULT false,
    "sowing" BOOLEAN NOT NULL DEFAULT false,
    "application" BOOLEAN NOT NULL DEFAULT false,
    "germination" BOOLEAN NOT NULL DEFAULT false,
    "harvest" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movement_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "conceptES" TEXT NOT NULL,
    "conceptPT" TEXT,
    "conceptEN" TEXT,
    "description" TEXT,
    "typeMovement" TEXT,
    "manual" BOOLEAN NOT NULL DEFAULT false,
    "stockSum" "StockSumType" NOT NULL DEFAULT 'BOTH',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "movement_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cost_expenses" (
    "id" TEXT NOT NULL,
    "costCode" TEXT NOT NULL,
    "costCenter" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cost_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_types" (
    "id" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "description" TEXT,
    "family" TEXT NOT NULL,
    "subFamily" TEXT NOT NULL,
    "status" "DeviceStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "device_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "licence_types" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "systemType" TEXT,
    "maximumUnitAllowed" INTEGER,
    "allowedUsersCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "licence_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "category" "AccountCategory" NOT NULL,
    "denomination" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "currency" "CurrencyCode" NOT NULL,
    "status" "AccountStatus" NOT NULL DEFAULT 'PENDING',
    "accountReference" TEXT,
    "licenceNumber" TEXT,
    "isLicenceMultipleCountry" BOOLEAN NOT NULL DEFAULT false,
    "maxHectares" INTEGER NOT NULL DEFAULT 0,
    "maxFields" INTEGER NOT NULL DEFAULT 0,
    "countFields" INTEGER NOT NULL DEFAULT 0,
    "countLicences" INTEGER NOT NULL DEFAULT 0,
    "countHectares" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "licences" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "licenceTypeId" TEXT NOT NULL,
    "countryCode" TEXT,
    "activeUsersAllowed" INTEGER NOT NULL,
    "amountLicencesAllowed" INTEGER,
    "status" "LicenceStatus" NOT NULL DEFAULT 'ACTIVE',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "licences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "licenceId" TEXT NOT NULL,
    "cognitoId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "state" "UserState" NOT NULL DEFAULT 'PENDING',
    "role" "UserRole",
    "language" TEXT NOT NULL,
    "isAdmin" BOOLEAN,
    "isInternal" BOOLEAN,
    "currency" "CurrencyCode",
    "photoName" TEXT,
    "activeSessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "fantasyName" TEXT NOT NULL,
    "socialReason" TEXT NOT NULL,
    "tributaryCode" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "locality" TEXT,
    "province" TEXT,
    "zipCode" TEXT,
    "website" TEXT,
    "observation" TEXT,
    "secondaryContact" TEXT,
    "companyLogo" TEXT,
    "countryCode" TEXT,
    "fiscalSituation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts_corporate" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "campaignId" TEXT,
    "description" TEXT NOT NULL,
    "status" TEXT,
    "totalCompany" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contracts_corporate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_contracts" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "participationPercentage" DOUBLE PRECISION NOT NULL,
    "activity" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inputs" (
    "id" TEXT NOT NULL,
    "accountId" TEXT,
    "countryId" TEXT,
    "replacementId" TEXT,
    "barCode" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "brand" TEXT,
    "unitMeasurement" TEXT,
    "stockByLot" BOOLEAN NOT NULL DEFAULT false,
    "activePrincipal" TEXT,
    "mermaVolatile" DOUBLE PRECISION,
    "minimumDose" DOUBLE PRECISION,
    "maximumDose" DOUBLE PRECISION,
    "recommendedDose" DOUBLE PRECISION,
    "replenishmentPoint" DOUBLE PRECISION,
    "labors" "Labor"[],
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "chemicalComposition" TEXT,
    "toxicityClass" TEXT,
    "formulationDenomination" TEXT,
    "productUrl" TEXT,
    "eiqValue" DOUBLE PRECISION,
    "senasaId" TEXT,
    "inputTypeId" INTEGER,
    "categoryId" TEXT,
    "cropId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inputs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "input_crop_applications" (
    "id" TEXT NOT NULL,
    "inputId" TEXT NOT NULL,
    "cropId" TEXT NOT NULL,
    "minDose" DOUBLE PRECISION,
    "maxDose" DOUBLE PRECISION,
    "suggestedDose" DOUBLE PRECISION,

    CONSTRAINT "input_crop_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zones" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "countryId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deposits" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "owner" TEXT,
    "isVirtual" BOOLEAN NOT NULL DEFAULT false,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "isNegative" BOOLEAN NOT NULL DEFAULT false,
    "address" TEXT,
    "zipCode" TEXT,
    "locality" TEXT,
    "province" TEXT,
    "countryCode" TEXT,
    "hasSiloBag" BOOLEAN NOT NULL DEFAULT false,
    "hasHopper" BOOLEAN NOT NULL DEFAULT false,
    "hasSilo" BOOLEAN NOT NULL DEFAULT false,
    "hasDeposit" BOOLEAN NOT NULL DEFAULT false,
    "taxId" TEXT,
    "siloBagId" TEXT,
    "status" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deposits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deposit_locations" (
    "id" TEXT NOT NULL,
    "depositId" TEXT NOT NULL,
    "number" TEXT,
    "name" TEXT NOT NULL,

    CONSTRAINT "deposit_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fields" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "countryId" TEXT,
    "name" TEXT NOT NULL,
    "uuid" TEXT,
    "geojson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "field_lots" (
    "id" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "uuid" TEXT,
    "hectares" DOUBLE PRECISION,
    "parentId" TEXT,
    "coordinates" JSONB,
    "lotType" TEXT,

    CONSTRAINT "field_lots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "zoneId" TEXT,
    "fieldId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "zafra" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "state" "CampaignState" NOT NULL DEFAULT 'ACTIVE',
    "lotBranchId" TEXT,
    "lotBranchMode" "LotBranchMode",
    "lotBranchSourceCampaignId" TEXT,
    "lotBranchPromotedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "vehicleTypeId" TEXT,
    "make" TEXT,
    "model" TEXT,
    "modelYear" TEXT,
    "patent" TEXT,
    "tara" DOUBLE PRECISION,
    "net" DOUBLE PRECISION,
    "gross" DOUBLE PRECISION,
    "chassisNumber" TEXT,
    "fuelType" "FuelType",
    "fuelCapacity" DOUBLE PRECISION,
    "connectivity" TEXT,
    "owner" TEXT,
    "insurence" TEXT,
    "coverageType" TEXT,
    "policyNumber" TEXT,
    "insurenceStartDate" TIMESTAMP(3),
    "insurenceDueDate" TIMESTAMP(3),
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_maintenances" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "date" TIMESTAMP(3),
    "km" DOUBLE PRECISION,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicle_maintenances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_specifications" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "specification" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "vehicle_specifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_entities" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "fullName" TEXT,
    "document" TEXT,
    "phone" TEXT,
    "taxSituation" TEXT,
    "email" TEXT,
    "entityType" "EntityType",
    "businessName" TEXT,
    "taxCode" TEXT,
    "mainContact" TEXT,
    "secondaryContact" TEXT,
    "nameMainContact" TEXT,
    "website" TEXT,
    "address" TEXT,
    "locality" TEXT,
    "zipCode" TEXT,
    "province" TEXT,
    "countryCode" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isEmployee" BOOLEAN NOT NULL DEFAULT false,
    "fileNumber" TEXT,
    "licenseNumber" TEXT,
    "categories" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_entities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stocks" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "itemType" "StockItemType" NOT NULL,
    "inputId" TEXT,
    "cropId" TEXT,
    "depositId" TEXT,
    "campaignId" TEXT,
    "fieldId" TEXT,
    "fieldLotId" TEXT,
    "location" TEXT,
    "nroLot" TEXT,
    "currentStock" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reservedStock" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastUpdate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "movementTypeId" TEXT,
    "inputId" TEXT,
    "cropId" TEXT,
    "itemType" "StockItemType",
    "userId" TEXT,
    "depositId" TEXT,
    "campaignId" TEXT,
    "location" TEXT,
    "nroLot" TEXT,
    "creationDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "isIncome" BOOLEAN NOT NULL DEFAULT false,
    "detail" TEXT,
    "operationDate" TIMESTAMP(3),
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "voucher" TEXT,
    "currency" "CurrencyCode",
    "totalValue" DOUBLE PRECISION,
    "hours" TEXT,
    "unitMeasurement" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crop_movements" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "depositId" TEXT,
    "cropId" TEXT NOT NULL,
    "campaignId" TEXT,
    "fieldId" TEXT,
    "lotId" TEXT,
    "zafra" TEXT,
    "direction" "InOutDirection" NOT NULL,
    "date" TIMESTAMP(3),
    "movement" TEXT,
    "detail" TEXT,
    "amountKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crop_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crop_deposits" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "campaignId" TEXT,
    "cropId" TEXT NOT NULL,
    "depositId" TEXT,
    "fieldId" TEXT,
    "lotId" TEXT,
    "zafra" TEXT,
    "location" TEXT,
    "currentStockKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reservedStockKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currentStock" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "committedStock" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deliveredStock" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastUpdate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crop_deposits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exit_fields" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "campaignId" TEXT,
    "fieldId" TEXT,
    "lotId" TEXT,
    "cropId" TEXT,
    "depositId" TEXT,
    "vehicleId" TEXT,
    "truckTrailerId" TEXT,
    "transportId" TEXT,
    "truckerId" TEXT,
    "harvesterId" TEXT,
    "destinationId" TEXT,
    "zafra" TEXT,
    "ticket" TEXT,
    "transportDocumentRef" TEXT,
    "grossWeight" DOUBLE PRECISION,
    "tareWeight" DOUBLE PRECISION,
    "netWeight" DOUBLE PRECISION,
    "location" TEXT,
    "additionalInformation" TEXT,
    "humidityPercentage" DOUBLE PRECISION,
    "mermaPercentage" DOUBLE PRECISION,
    "volatilePercentage" DOUBLE PRECISION,
    "otherPercentage" DOUBLE PRECISION,
    "totalMerma" DOUBLE PRECISION,
    "kgNet" DOUBLE PRECISION,
    "creationDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exit_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "withdrawal_orders" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "campaignId" TEXT,
    "contractorId" TEXT,
    "orderType" "WithdrawalOrderType" NOT NULL DEFAULT 'MANUAL',
    "orderNumber" TEXT,
    "reason" TEXT,
    "withdrawId" TEXT,
    "unitMeasurement" TEXT,
    "zafra" TEXT,
    "cropData" JSONB,
    "labor" TEXT,
    "laborNro" TEXT,
    "state" "WithdrawalState" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "withdrawal_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deposit_supply_orders" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "withdrawalOrderId" TEXT,
    "depositId" TEXT,
    "inputId" TEXT,
    "orderNumber" TEXT,
    "location" TEXT,
    "nroLot" TEXT,
    "withdrawalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "originalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deposit_supply_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deposit_supply_withdrawals" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "depositSupplyOrderId" TEXT NOT NULL,
    "orderNumber" TEXT,
    "withdrawalDate" TIMESTAMP(3),
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deposit_supply_withdrawals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "numerators" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "numeratorType" "NumeratorType" NOT NULL,
    "lastNumerator" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "numerators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "origin_destinations" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "isProcedure" BOOLEAN NOT NULL DEFAULT false,
    "isDestination" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "origin_destinations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "labor_services" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "labor_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_orders" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "businessId" TEXT,
    "orderNumber" TEXT,
    "businessName" TEXT,
    "businessLogo" TEXT,
    "address" TEXT,
    "locality" TEXT,
    "zipCode" TEXT,
    "countryCode" TEXT,
    "contact" TEXT,
    "commercialTerms" TEXT,
    "subtotal" DOUBLE PRECISION,
    "taxPercentage" DOUBLE PRECISION,
    "taxValue" DOUBLE PRECISION,
    "otherPercentage" DOUBLE PRECISION,
    "otherValue" DOUBLE PRECISION,
    "totalValue" DOUBLE PRECISION,
    "sent" BOOLEAN NOT NULL DEFAULT false,
    "creationDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_items" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "inputId" TEXT,
    "supplyAmount" DOUBLE PRECISION,
    "unitMeasurement" TEXT,
    "unitPrice" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productive_units" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "units" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "productive_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productive_unit_fields" (
    "id" TEXT NOT NULL,
    "productiveUnitId" TEXT NOT NULL,
    "fieldId" TEXT,
    "lotId" TEXT,
    "fieldName" TEXT,
    "hectares" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "productive_unit_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_sale_cereals" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "campaignId" TEXT,
    "companyId" TEXT,
    "cropId" TEXT,
    "producerId" TEXT,
    "buyerId" TEXT,
    "destinationId" TEXT,
    "delivererId" TEXT,
    "brokerId" TEXT,
    "commissionAgentId" TEXT,
    "contractSaleNumber" TEXT,
    "brokerPercentage" DOUBLE PRECISION,
    "brokerAmountValue" DOUBLE PRECISION,
    "commissionAgentPercentage" DOUBLE PRECISION,
    "commissionAgentAmountValue" DOUBLE PRECISION,
    "condition" TEXT,
    "paymentMethod" TEXT,
    "isOpenContract" BOOLEAN NOT NULL DEFAULT false,
    "dateCreated" TIMESTAMP(3),
    "kg" DOUBLE PRECISION,
    "kms" DOUBLE PRECISION,
    "quintalQuote" DOUBLE PRECISION,
    "valueQuote" DOUBLE PRECISION,
    "usdQuote" DOUBLE PRECISION,
    "valueUsdQuote" DOUBLE PRECISION,
    "currency" "CurrencyCode",
    "amountValue" DOUBLE PRECISION,
    "kgDelivered" DOUBLE PRECISION,
    "valueCollected" DOUBLE PRECISION,
    "contractType" TEXT,
    "status" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contract_sale_cereals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_delivery_dates" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "deliveryDate" TIMESTAMP(3),
    "kg" DOUBLE PRECISION,
    "deliveredKg" DOUBLE PRECISION,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "dateCreated" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contract_delivery_dates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transport_documents" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "campaignId" TEXT,
    "contractId" TEXT,
    "exitFieldId" TEXT,
    "vehicleChasisId" TEXT,
    "vehicleTrailer1Id" TEXT,
    "vehicleTrailer2Id" TEXT,
    "billNumber" TEXT,
    "issueDate" TIMESTAMP(3),
    "expirationDate" TIMESTAMP(3),
    "ctgNumber" TEXT,
    "tariff" DOUBLE PRECISION,
    "generatorTaxCode" TEXT,
    "estimatedKg" DOUBLE PRECISION,
    "grossKg" DOUBLE PRECISION,
    "taraKg" DOUBLE PRECISION,
    "netKg" DOUBLE PRECISION,
    "transporterTaxCode" TEXT,
    "transporterBusinessName" TEXT,
    "driverTaxCode" TEXT,
    "kmToTravel" DOUBLE PRECISION,
    "freightType" TEXT,
    "referenceRate" DOUBLE PRECISION,
    "departureDate" TIMESTAMP(3),
    "contractSaleNumber" TEXT,
    "status" TEXT,
    "fileName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transport_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificate_deposits" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "campaignId" TEXT,
    "cropId" TEXT,
    "certificateFile" TEXT,
    "analysisNumber" TEXT,
    "grade" TEXT,
    "electronicCertification" JSONB,
    "depositary" JSONB,
    "depositor" JSONB,
    "grossWeight" DOUBLE PRECISION,
    "netWeight" DOUBLE PRECISION,
    "mermaVolatile" DOUBLE PRECISION,
    "mermaDrying" DOUBLE PRECISION,
    "mermaScreening" DOUBLE PRECISION,
    "services" JSONB,
    "creationDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "certificate_deposits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificate_deposit_transports" (
    "id" TEXT NOT NULL,
    "certificateId" TEXT NOT NULL,
    "transportDocumentId" TEXT NOT NULL,
    "certificateNumber" TEXT,
    "billNumber" TEXT,
    "billDate" TIMESTAMP(3),
    "netKg" DOUBLE PRECISION,
    "mermaScreeningKg" DOUBLE PRECISION,
    "screeningRate" DOUBLE PRECISION,
    "screeningAmount" DOUBLE PRECISION,
    "humidityDrying" DOUBLE PRECISION,
    "mermaDryingKg" DOUBLE PRECISION,
    "dryingRate" DOUBLE PRECISION,
    "dryingAmount" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "certificate_deposit_transports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_expenses" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "campaignId" TEXT,
    "fieldId" TEXT,
    "lotId" TEXT,
    "cropId" TEXT,
    "hectares" DOUBLE PRECISION,
    "campaignName" TEXT,
    "zafra" TEXT,
    "fieldName" TEXT,
    "lotName" TEXT,
    "cropName" TEXT,
    "altCurrency" TEXT,
    "altCurrencyRate" DOUBLE PRECISION,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "supplyLabors" JSONB,
    "harvestLine" JSONB,
    "serviceLabors" JSONB,
    "machineryLabors" JSONB,
    "expenseDetails" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaign_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "countries_code_key" ON "countries"("code");

-- CreateIndex
CREATE UNIQUE INDEX "zip_codes_code_countryCode_key" ON "zip_codes"("code", "countryCode");

-- CreateIndex
CREATE UNIQUE INDEX "input_types_code_key" ON "input_types"("code");

-- CreateIndex
CREATE UNIQUE INDEX "categories_idCategory_key" ON "categories"("idCategory");

-- CreateIndex
CREATE UNIQUE INDEX "cost_expenses_costCode_key" ON "cost_expenses"("costCode");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_types_name_key" ON "vehicle_types"("name");

-- CreateIndex
CREATE UNIQUE INDEX "users_cognitoId_key" ON "users"("cognitoId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "companies_accountId_key" ON "companies"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "contracts_corporate_accountId_key" ON "contracts_corporate"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "input_crop_applications_inputId_cropId_key" ON "input_crop_applications"("inputId", "cropId");

-- CreateIndex
CREATE UNIQUE INDEX "fields_uuid_key" ON "fields"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "field_lots_uuid_key" ON "field_lots"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "numerators_accountId_numeratorType_key" ON "numerators"("accountId", "numeratorType");

-- AddForeignKey
ALTER TABLE "licences" ADD CONSTRAINT "licences_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "licences" ADD CONSTRAINT "licences_licenceTypeId_fkey" FOREIGN KEY ("licenceTypeId") REFERENCES "licence_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_licenceId_fkey" FOREIGN KEY ("licenceId") REFERENCES "licences"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts_corporate" ADD CONSTRAINT "contracts_corporate_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts_corporate" ADD CONSTRAINT "contracts_corporate_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_contracts" ADD CONSTRAINT "company_contracts_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_contracts" ADD CONSTRAINT "company_contracts_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts_corporate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inputs" ADD CONSTRAINT "inputs_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inputs" ADD CONSTRAINT "inputs_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "countries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inputs" ADD CONSTRAINT "inputs_replacementId_fkey" FOREIGN KEY ("replacementId") REFERENCES "inputs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inputs" ADD CONSTRAINT "inputs_inputTypeId_fkey" FOREIGN KEY ("inputTypeId") REFERENCES "input_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inputs" ADD CONSTRAINT "inputs_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inputs" ADD CONSTRAINT "inputs_cropId_fkey" FOREIGN KEY ("cropId") REFERENCES "crops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "input_crop_applications" ADD CONSTRAINT "input_crop_applications_inputId_fkey" FOREIGN KEY ("inputId") REFERENCES "inputs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "input_crop_applications" ADD CONSTRAINT "input_crop_applications_cropId_fkey" FOREIGN KEY ("cropId") REFERENCES "crops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zones" ADD CONSTRAINT "zones_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zones" ADD CONSTRAINT "zones_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "countries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deposits" ADD CONSTRAINT "deposits_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deposit_locations" ADD CONSTRAINT "deposit_locations_depositId_fkey" FOREIGN KEY ("depositId") REFERENCES "deposits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fields" ADD CONSTRAINT "fields_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fields" ADD CONSTRAINT "fields_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "countries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_lots" ADD CONSTRAINT "field_lots_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "fields"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "fields"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_vehicleTypeId_fkey" FOREIGN KEY ("vehicleTypeId") REFERENCES "vehicle_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_maintenances" ADD CONSTRAINT "vehicle_maintenances_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_specifications" ADD CONSTRAINT "vehicle_specifications_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_entities" ADD CONSTRAINT "social_entities_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stocks" ADD CONSTRAINT "stocks_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stocks" ADD CONSTRAINT "stocks_inputId_fkey" FOREIGN KEY ("inputId") REFERENCES "inputs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stocks" ADD CONSTRAINT "stocks_cropId_fkey" FOREIGN KEY ("cropId") REFERENCES "crops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stocks" ADD CONSTRAINT "stocks_depositId_fkey" FOREIGN KEY ("depositId") REFERENCES "deposits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stocks" ADD CONSTRAINT "stocks_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stocks" ADD CONSTRAINT "stocks_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "fields"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stocks" ADD CONSTRAINT "stocks_fieldLotId_fkey" FOREIGN KEY ("fieldLotId") REFERENCES "field_lots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_movementTypeId_fkey" FOREIGN KEY ("movementTypeId") REFERENCES "movement_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_inputId_fkey" FOREIGN KEY ("inputId") REFERENCES "inputs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_cropId_fkey" FOREIGN KEY ("cropId") REFERENCES "crops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_depositId_fkey" FOREIGN KEY ("depositId") REFERENCES "deposits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crop_movements" ADD CONSTRAINT "crop_movements_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crop_movements" ADD CONSTRAINT "crop_movements_depositId_fkey" FOREIGN KEY ("depositId") REFERENCES "deposits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crop_movements" ADD CONSTRAINT "crop_movements_cropId_fkey" FOREIGN KEY ("cropId") REFERENCES "crops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crop_movements" ADD CONSTRAINT "crop_movements_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crop_movements" ADD CONSTRAINT "crop_movements_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "fields"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crop_movements" ADD CONSTRAINT "crop_movements_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "field_lots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crop_deposits" ADD CONSTRAINT "crop_deposits_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crop_deposits" ADD CONSTRAINT "crop_deposits_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crop_deposits" ADD CONSTRAINT "crop_deposits_cropId_fkey" FOREIGN KEY ("cropId") REFERENCES "crops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crop_deposits" ADD CONSTRAINT "crop_deposits_depositId_fkey" FOREIGN KEY ("depositId") REFERENCES "deposits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crop_deposits" ADD CONSTRAINT "crop_deposits_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "fields"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crop_deposits" ADD CONSTRAINT "crop_deposits_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "field_lots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exit_fields" ADD CONSTRAINT "exit_fields_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exit_fields" ADD CONSTRAINT "exit_fields_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exit_fields" ADD CONSTRAINT "exit_fields_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "fields"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exit_fields" ADD CONSTRAINT "exit_fields_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "field_lots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exit_fields" ADD CONSTRAINT "exit_fields_cropId_fkey" FOREIGN KEY ("cropId") REFERENCES "crops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exit_fields" ADD CONSTRAINT "exit_fields_depositId_fkey" FOREIGN KEY ("depositId") REFERENCES "deposits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exit_fields" ADD CONSTRAINT "exit_fields_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exit_fields" ADD CONSTRAINT "exit_fields_truckTrailerId_fkey" FOREIGN KEY ("truckTrailerId") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exit_fields" ADD CONSTRAINT "exit_fields_transportId_fkey" FOREIGN KEY ("transportId") REFERENCES "social_entities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exit_fields" ADD CONSTRAINT "exit_fields_truckerId_fkey" FOREIGN KEY ("truckerId") REFERENCES "social_entities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exit_fields" ADD CONSTRAINT "exit_fields_harvesterId_fkey" FOREIGN KEY ("harvesterId") REFERENCES "social_entities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exit_fields" ADD CONSTRAINT "exit_fields_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "origin_destinations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawal_orders" ADD CONSTRAINT "withdrawal_orders_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawal_orders" ADD CONSTRAINT "withdrawal_orders_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawal_orders" ADD CONSTRAINT "withdrawal_orders_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "social_entities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deposit_supply_orders" ADD CONSTRAINT "deposit_supply_orders_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deposit_supply_orders" ADD CONSTRAINT "deposit_supply_orders_withdrawalOrderId_fkey" FOREIGN KEY ("withdrawalOrderId") REFERENCES "withdrawal_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deposit_supply_orders" ADD CONSTRAINT "deposit_supply_orders_depositId_fkey" FOREIGN KEY ("depositId") REFERENCES "deposits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deposit_supply_orders" ADD CONSTRAINT "deposit_supply_orders_inputId_fkey" FOREIGN KEY ("inputId") REFERENCES "inputs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deposit_supply_withdrawals" ADD CONSTRAINT "deposit_supply_withdrawals_depositSupplyOrderId_fkey" FOREIGN KEY ("depositSupplyOrderId") REFERENCES "deposit_supply_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "numerators" ADD CONSTRAINT "numerators_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "origin_destinations" ADD CONSTRAINT "origin_destinations_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "labor_services" ADD CONSTRAINT "labor_services_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "social_entities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_inputId_fkey" FOREIGN KEY ("inputId") REFERENCES "inputs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productive_units" ADD CONSTRAINT "productive_units_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productive_unit_fields" ADD CONSTRAINT "productive_unit_fields_productiveUnitId_fkey" FOREIGN KEY ("productiveUnitId") REFERENCES "productive_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productive_unit_fields" ADD CONSTRAINT "productive_unit_fields_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "fields"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productive_unit_fields" ADD CONSTRAINT "productive_unit_fields_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "field_lots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_sale_cereals" ADD CONSTRAINT "contract_sale_cereals_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_sale_cereals" ADD CONSTRAINT "contract_sale_cereals_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_sale_cereals" ADD CONSTRAINT "contract_sale_cereals_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_sale_cereals" ADD CONSTRAINT "contract_sale_cereals_cropId_fkey" FOREIGN KEY ("cropId") REFERENCES "crops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_sale_cereals" ADD CONSTRAINT "contract_sale_cereals_producerId_fkey" FOREIGN KEY ("producerId") REFERENCES "social_entities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_sale_cereals" ADD CONSTRAINT "contract_sale_cereals_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "social_entities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_sale_cereals" ADD CONSTRAINT "contract_sale_cereals_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "origin_destinations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_sale_cereals" ADD CONSTRAINT "contract_sale_cereals_delivererId_fkey" FOREIGN KEY ("delivererId") REFERENCES "social_entities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_sale_cereals" ADD CONSTRAINT "contract_sale_cereals_brokerId_fkey" FOREIGN KEY ("brokerId") REFERENCES "social_entities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_sale_cereals" ADD CONSTRAINT "contract_sale_cereals_commissionAgentId_fkey" FOREIGN KEY ("commissionAgentId") REFERENCES "social_entities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_delivery_dates" ADD CONSTRAINT "contract_delivery_dates_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contract_sale_cereals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_documents" ADD CONSTRAINT "transport_documents_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_documents" ADD CONSTRAINT "transport_documents_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_documents" ADD CONSTRAINT "transport_documents_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contract_sale_cereals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_documents" ADD CONSTRAINT "transport_documents_exitFieldId_fkey" FOREIGN KEY ("exitFieldId") REFERENCES "exit_fields"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_documents" ADD CONSTRAINT "transport_documents_vehicleChasisId_fkey" FOREIGN KEY ("vehicleChasisId") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_documents" ADD CONSTRAINT "transport_documents_vehicleTrailer1Id_fkey" FOREIGN KEY ("vehicleTrailer1Id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_documents" ADD CONSTRAINT "transport_documents_vehicleTrailer2Id_fkey" FOREIGN KEY ("vehicleTrailer2Id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate_deposits" ADD CONSTRAINT "certificate_deposits_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate_deposits" ADD CONSTRAINT "certificate_deposits_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate_deposits" ADD CONSTRAINT "certificate_deposits_cropId_fkey" FOREIGN KEY ("cropId") REFERENCES "crops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate_deposit_transports" ADD CONSTRAINT "certificate_deposit_transports_certificateId_fkey" FOREIGN KEY ("certificateId") REFERENCES "certificate_deposits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate_deposit_transports" ADD CONSTRAINT "certificate_deposit_transports_transportDocumentId_fkey" FOREIGN KEY ("transportDocumentId") REFERENCES "transport_documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_expenses" ADD CONSTRAINT "campaign_expenses_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_expenses" ADD CONSTRAINT "campaign_expenses_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_expenses" ADD CONSTRAINT "campaign_expenses_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "fields"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_expenses" ADD CONSTRAINT "campaign_expenses_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "field_lots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_expenses" ADD CONSTRAINT "campaign_expenses_cropId_fkey" FOREIGN KEY ("cropId") REFERENCES "crops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

