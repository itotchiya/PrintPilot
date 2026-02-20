-- AlterEnum: add new Role values
ALTER TYPE "Role" ADD VALUE 'SUPER_ADMIN';
ALTER TYPE "Role" ADD VALUE 'FOURNISSEUR';
ALTER TYPE "Role" ADD VALUE 'ACHETEUR';

-- Quote: add fournisseurResults
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "fournisseurResults" JSONB;

-- PaperType
ALTER TABLE "PaperType" ADD COLUMN IF NOT EXISTS "fournisseurId" TEXT;
DROP INDEX IF EXISTS "PaperType_name_key";
CREATE UNIQUE INDEX "PaperType_fournisseurId_name_key" ON "PaperType"("fournisseurId", "name");
CREATE INDEX IF NOT EXISTS "PaperType_fournisseurId_idx" ON "PaperType"("fournisseurId");

-- FormatPreset
ALTER TABLE "FormatPreset" ADD COLUMN IF NOT EXISTS "fournisseurId" TEXT;
DROP INDEX IF EXISTS "FormatPreset_name_key";
CREATE UNIQUE INDEX "FormatPreset_fournisseurId_name_key" ON "FormatPreset"("fournisseurId", "name");
CREATE INDEX IF NOT EXISTS "FormatPreset_fournisseurId_idx" ON "FormatPreset"("fournisseurId");

-- ColorMode
ALTER TABLE "ColorMode" ADD COLUMN IF NOT EXISTS "fournisseurId" TEXT;
DROP INDEX IF EXISTS "ColorMode_name_key";
CREATE UNIQUE INDEX "ColorMode_fournisseurId_name_key" ON "ColorMode"("fournisseurId", "name");
CREATE INDEX IF NOT EXISTS "ColorMode_fournisseurId_idx" ON "ColorMode"("fournisseurId");

-- BindingType
ALTER TABLE "BindingType" ADD COLUMN IF NOT EXISTS "fournisseurId" TEXT;
DROP INDEX IF EXISTS "BindingType_name_key";
CREATE UNIQUE INDEX "BindingType_fournisseurId_name_key" ON "BindingType"("fournisseurId", "name");
CREATE INDEX IF NOT EXISTS "BindingType_fournisseurId_idx" ON "BindingType"("fournisseurId");

-- FoldType
ALTER TABLE "FoldType" ADD COLUMN IF NOT EXISTS "fournisseurId" TEXT;
DROP INDEX IF EXISTS "FoldType_name_key";
CREATE UNIQUE INDEX "FoldType_fournisseurId_name_key" ON "FoldType"("fournisseurId", "name");
CREATE INDEX IF NOT EXISTS "FoldType_fournisseurId_idx" ON "FoldType"("fournisseurId");

-- LaminationMode
ALTER TABLE "LaminationMode" ADD COLUMN IF NOT EXISTS "fournisseurId" TEXT;
DROP INDEX IF EXISTS "LaminationMode_name_key";
CREATE UNIQUE INDEX "LaminationMode_fournisseurId_name_key" ON "LaminationMode"("fournisseurId", "name");
CREATE INDEX IF NOT EXISTS "LaminationMode_fournisseurId_idx" ON "LaminationMode"("fournisseurId");

-- LaminationFinish
ALTER TABLE "LaminationFinish" ADD COLUMN IF NOT EXISTS "fournisseurId" TEXT;
DROP INDEX IF EXISTS "LaminationFinish_name_key";
CREATE UNIQUE INDEX "LaminationFinish_fournisseurId_name_key" ON "LaminationFinish"("fournisseurId", "name");
CREATE INDEX IF NOT EXISTS "LaminationFinish_fournisseurId_idx" ON "LaminationFinish"("fournisseurId");

-- PackagingOption
ALTER TABLE "PackagingOption" ADD COLUMN IF NOT EXISTS "fournisseurId" TEXT;
DROP INDEX IF EXISTS "PackagingOption_name_key";
CREATE UNIQUE INDEX "PackagingOption_fournisseurId_name_key" ON "PackagingOption"("fournisseurId", "name");
CREATE INDEX IF NOT EXISTS "PackagingOption_fournisseurId_idx" ON "PackagingOption"("fournisseurId");

-- Carrier
ALTER TABLE "Carrier" ADD COLUMN IF NOT EXISTS "fournisseurId" TEXT;
DROP INDEX IF EXISTS "Carrier_name_key";
CREATE UNIQUE INDEX "Carrier_fournisseurId_name_key" ON "Carrier"("fournisseurId", "name");
CREATE INDEX IF NOT EXISTS "Carrier_fournisseurId_idx" ON "Carrier"("fournisseurId");

-- OffsetConfig
ALTER TABLE "OffsetConfig" ADD COLUMN IF NOT EXISTS "fournisseurId" TEXT;
DROP INDEX IF EXISTS "OffsetConfig_key_key";
CREATE UNIQUE INDEX "OffsetConfig_fournisseurId_key_key" ON "OffsetConfig"("fournisseurId", "key");
CREATE INDEX IF NOT EXISTS "OffsetConfig_fournisseurId_idx" ON "OffsetConfig"("fournisseurId");

-- DigitalConfig
ALTER TABLE "DigitalConfig" ADD COLUMN IF NOT EXISTS "fournisseurId" TEXT;
DROP INDEX IF EXISTS "DigitalConfig_key_key";
CREATE UNIQUE INDEX "DigitalConfig_fournisseurId_key_key" ON "DigitalConfig"("fournisseurId", "key");
CREATE INDEX IF NOT EXISTS "DigitalConfig_fournisseurId_idx" ON "DigitalConfig"("fournisseurId");

-- MarginConfig
ALTER TABLE "MarginConfig" ADD COLUMN IF NOT EXISTS "fournisseurId" TEXT;
DROP INDEX IF EXISTS "MarginConfig_key_key";
CREATE UNIQUE INDEX "MarginConfig_fournisseurId_key_key" ON "MarginConfig"("fournisseurId", "key");
CREATE INDEX IF NOT EXISTS "MarginConfig_fournisseurId_idx" ON "MarginConfig"("fournisseurId");

-- MachineFormat
ALTER TABLE "MachineFormat" ADD COLUMN IF NOT EXISTS "fournisseurId" TEXT;
DROP INDEX IF EXISTS "MachineFormat_name_key";
CREATE UNIQUE INDEX "MachineFormat_fournisseurId_name_key" ON "MachineFormat"("fournisseurId", "name");
CREATE INDEX IF NOT EXISTS "MachineFormat_fournisseurId_idx" ON "MachineFormat"("fournisseurId");

-- FormatClickDivisor
ALTER TABLE "FormatClickDivisor" ADD COLUMN IF NOT EXISTS "fournisseurId" TEXT;
DROP INDEX IF EXISTS "FormatClickDivisor_formatName_key";
CREATE UNIQUE INDEX "FormatClickDivisor_fournisseurId_formatName_key" ON "FormatClickDivisor"("fournisseurId", "formatName");
CREATE INDEX IF NOT EXISTS "FormatClickDivisor_fournisseurId_idx" ON "FormatClickDivisor"("fournisseurId");

-- CreateTable AcheteurFournisseurAccess
CREATE TABLE "AcheteurFournisseurAccess" (
    "id" TEXT NOT NULL,
    "acheteurId" TEXT NOT NULL,
    "fournisseurId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AcheteurFournisseurAccess_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AcheteurFournisseurAccess_acheteurId_fournisseurId_key" ON "AcheteurFournisseurAccess"("acheteurId", "fournisseurId");
CREATE INDEX "AcheteurFournisseurAccess_acheteurId_idx" ON "AcheteurFournisseurAccess"("acheteurId");
CREATE INDEX "AcheteurFournisseurAccess_fournisseurId_idx" ON "AcheteurFournisseurAccess"("fournisseurId");

ALTER TABLE "AcheteurFournisseurAccess" ADD CONSTRAINT "AcheteurFournisseurAccess_acheteurId_fkey" FOREIGN KEY ("acheteurId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AcheteurFournisseurAccess" ADD CONSTRAINT "AcheteurFournisseurAccess_fournisseurId_fkey" FOREIGN KEY ("fournisseurId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
