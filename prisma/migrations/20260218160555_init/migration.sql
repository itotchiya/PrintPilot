-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'EMPLOYEE', 'CLIENT');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('BROCHURE', 'DEPLIANT', 'FLYER', 'CARTE_DE_VISITE');

-- CreateEnum
CREATE TYPE "PaperCategory" AS ENUM ('INTERIOR', 'COVER', 'BOTH');

-- CreateEnum
CREATE TYPE "Orientation" AS ENUM ('PORTRAIT', 'LANDSCAPE', 'SQUARE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'CLIENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL,
    "quoteNumber" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "productType" "ProductType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "formatName" TEXT NOT NULL,
    "formatWidth" DECIMAL(65,30) NOT NULL,
    "formatHeight" DECIMAL(65,30) NOT NULL,
    "openFormatWidth" DECIMAL(65,30),
    "openFormatHeight" DECIMAL(65,30),
    "pagesInterior" INTEGER,
    "pagesCover" INTEGER,
    "flapSize" DECIMAL(65,30),
    "paperInteriorType" TEXT,
    "paperInteriorGram" INTEGER,
    "paperCoverType" TEXT,
    "paperCoverGram" INTEGER,
    "colorModeInterior" TEXT,
    "colorModeCover" TEXT,
    "rectoVerso" BOOLEAN NOT NULL DEFAULT false,
    "bindingType" TEXT,
    "foldType" TEXT,
    "foldCount" INTEGER,
    "secondaryFoldType" TEXT,
    "secondaryFoldCount" INTEGER,
    "laminationMode" TEXT,
    "laminationFinish" TEXT,
    "packaging" JSONB,
    "deliveryPoints" JSONB,
    "digitalPrice" DECIMAL(65,30),
    "offsetPrice" DECIMAL(65,30),
    "digitalBreakdown" JSONB,
    "offsetBreakdown" JSONB,
    "deliveryCost" DECIMAL(65,30),
    "selectedMethod" TEXT,
    "weightPerCopy" DECIMAL(65,30),
    "totalWeight" DECIMAL(65,30),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaperType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "PaperCategory" NOT NULL DEFAULT 'BOTH',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaperType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaperGrammage" (
    "id" TEXT NOT NULL,
    "paperTypeId" TEXT NOT NULL,
    "grammage" INTEGER NOT NULL,
    "pricePerKg" DECIMAL(65,30) NOT NULL,
    "weightPer1000Sheets" DECIMAL(65,30),
    "availableForDosCarre" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaperGrammage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormatPreset" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "widthCm" DECIMAL(65,30) NOT NULL,
    "heightCm" DECIMAL(65,30) NOT NULL,
    "orientation" "Orientation" NOT NULL DEFAULT 'PORTRAIT',
    "productTypes" JSONB NOT NULL DEFAULT '[]',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormatPreset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ColorMode" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "platesPerSide" INTEGER NOT NULL,
    "hasVarnish" BOOLEAN NOT NULL DEFAULT false,
    "clickMultiplier" DECIMAL(65,30) NOT NULL DEFAULT 1.0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ColorMode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BindingType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "minPages" INTEGER NOT NULL,
    "maxPages" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BindingType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BindingPriceTierDigital" (
    "id" TEXT NOT NULL,
    "bindingTypeId" TEXT NOT NULL,
    "pageRangeMin" INTEGER NOT NULL,
    "pageRangeMax" INTEGER NOT NULL,
    "qtyMin" INTEGER NOT NULL,
    "qtyMax" INTEGER NOT NULL,
    "perUnitCost" DECIMAL(65,30) NOT NULL,
    "setupCost" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BindingPriceTierDigital_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BindingPriceTierOffset" (
    "id" TEXT NOT NULL,
    "bindingTypeId" TEXT NOT NULL,
    "cahiersCount" INTEGER NOT NULL,
    "calageCost" DECIMAL(65,30) NOT NULL,
    "roulagePer1000" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BindingPriceTierOffset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FoldType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "maxFolds" INTEGER NOT NULL DEFAULT 6,
    "canBeSecondary" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FoldType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FoldCost" (
    "id" TEXT NOT NULL,
    "foldTypeId" TEXT NOT NULL,
    "numFolds" INTEGER NOT NULL,
    "cost" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FoldCost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LaminationMode" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LaminationMode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LaminationFinish" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "offsetPricePerM2" DECIMAL(65,30),
    "offsetCalageForfait" DECIMAL(65,30),
    "offsetMinimumBilling" DECIMAL(65,30),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LaminationFinish_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LaminationPriceTier" (
    "id" TEXT NOT NULL,
    "finishId" TEXT NOT NULL,
    "qtyMin" INTEGER NOT NULL,
    "qtyMax" INTEGER NOT NULL,
    "pricePerSheet" DECIMAL(65,30) NOT NULL,
    "setupCost" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LaminationPriceTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackagingOption" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "costPerUnit" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "costPerOrder" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "appliesTo" JSONB NOT NULL DEFAULT '[]',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PackagingOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "zone" INTEGER NOT NULL,
    "isSpecialZone" BOOLEAN NOT NULL DEFAULT false,
    "displayName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Carrier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Carrier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryRate" (
    "id" TEXT NOT NULL,
    "carrierId" TEXT NOT NULL,
    "zone" INTEGER NOT NULL,
    "maxWeightKg" DECIMAL(65,30) NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OffsetConfig" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" DECIMAL(65,30) NOT NULL,
    "unit" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OffsetConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DigitalConfig" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" DECIMAL(65,30) NOT NULL,
    "unit" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DigitalConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarginConfig" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" DECIMAL(65,30) NOT NULL,
    "unit" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarginConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MachineFormat" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "widthCm" DECIMAL(65,30) NOT NULL,
    "heightCm" DECIMAL(65,30) NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MachineFormat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormatClickDivisor" (
    "id" TEXT NOT NULL,
    "formatName" TEXT NOT NULL,
    "divisorRecto" DECIMAL(65,30) NOT NULL,
    "divisorRectoVerso" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormatClickDivisor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_quoteNumber_key" ON "Quote"("quoteNumber");

-- CreateIndex
CREATE INDEX "Quote_userId_idx" ON "Quote"("userId");

-- CreateIndex
CREATE INDEX "Quote_status_idx" ON "Quote"("status");

-- CreateIndex
CREATE INDEX "Quote_createdAt_idx" ON "Quote"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PaperType_name_key" ON "PaperType"("name");

-- CreateIndex
CREATE INDEX "PaperGrammage_paperTypeId_idx" ON "PaperGrammage"("paperTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "PaperGrammage_paperTypeId_grammage_key" ON "PaperGrammage"("paperTypeId", "grammage");

-- CreateIndex
CREATE UNIQUE INDEX "FormatPreset_name_key" ON "FormatPreset"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ColorMode_name_key" ON "ColorMode"("name");

-- CreateIndex
CREATE UNIQUE INDEX "BindingType_name_key" ON "BindingType"("name");

-- CreateIndex
CREATE INDEX "BindingPriceTierDigital_bindingTypeId_idx" ON "BindingPriceTierDigital"("bindingTypeId");

-- CreateIndex
CREATE INDEX "BindingPriceTierOffset_bindingTypeId_idx" ON "BindingPriceTierOffset"("bindingTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "FoldType_name_key" ON "FoldType"("name");

-- CreateIndex
CREATE INDEX "FoldCost_foldTypeId_idx" ON "FoldCost"("foldTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "FoldCost_foldTypeId_numFolds_key" ON "FoldCost"("foldTypeId", "numFolds");

-- CreateIndex
CREATE UNIQUE INDEX "LaminationMode_name_key" ON "LaminationMode"("name");

-- CreateIndex
CREATE UNIQUE INDEX "LaminationFinish_name_key" ON "LaminationFinish"("name");

-- CreateIndex
CREATE INDEX "LaminationPriceTier_finishId_idx" ON "LaminationPriceTier"("finishId");

-- CreateIndex
CREATE UNIQUE INDEX "PackagingOption_name_key" ON "PackagingOption"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Department_code_key" ON "Department"("code");

-- CreateIndex
CREATE INDEX "Department_zone_idx" ON "Department"("zone");

-- CreateIndex
CREATE UNIQUE INDEX "Carrier_name_key" ON "Carrier"("name");

-- CreateIndex
CREATE INDEX "DeliveryRate_carrierId_idx" ON "DeliveryRate"("carrierId");

-- CreateIndex
CREATE INDEX "DeliveryRate_zone_idx" ON "DeliveryRate"("zone");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryRate_carrierId_zone_maxWeightKg_key" ON "DeliveryRate"("carrierId", "zone", "maxWeightKg");

-- CreateIndex
CREATE UNIQUE INDEX "OffsetConfig_key_key" ON "OffsetConfig"("key");

-- CreateIndex
CREATE UNIQUE INDEX "DigitalConfig_key_key" ON "DigitalConfig"("key");

-- CreateIndex
CREATE UNIQUE INDEX "MarginConfig_key_key" ON "MarginConfig"("key");

-- CreateIndex
CREATE UNIQUE INDEX "MachineFormat_name_key" ON "MachineFormat"("name");

-- CreateIndex
CREATE UNIQUE INDEX "FormatClickDivisor_formatName_key" ON "FormatClickDivisor"("formatName");

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaperGrammage" ADD CONSTRAINT "PaperGrammage_paperTypeId_fkey" FOREIGN KEY ("paperTypeId") REFERENCES "PaperType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BindingPriceTierDigital" ADD CONSTRAINT "BindingPriceTierDigital_bindingTypeId_fkey" FOREIGN KEY ("bindingTypeId") REFERENCES "BindingType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BindingPriceTierOffset" ADD CONSTRAINT "BindingPriceTierOffset_bindingTypeId_fkey" FOREIGN KEY ("bindingTypeId") REFERENCES "BindingType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoldCost" ADD CONSTRAINT "FoldCost_foldTypeId_fkey" FOREIGN KEY ("foldTypeId") REFERENCES "FoldType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LaminationPriceTier" ADD CONSTRAINT "LaminationPriceTier_finishId_fkey" FOREIGN KEY ("finishId") REFERENCES "LaminationFinish"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryRate" ADD CONSTRAINT "DeliveryRate_carrierId_fkey" FOREIGN KEY ("carrierId") REFERENCES "Carrier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
