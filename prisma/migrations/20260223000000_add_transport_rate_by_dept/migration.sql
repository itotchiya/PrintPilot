-- CreateTable
CREATE TABLE "TransportRateByDept" (
    "id" TEXT NOT NULL,
    "carrierId" TEXT NOT NULL,
    "departmentCode" TEXT NOT NULL,
    "maxWeightKg" DECIMAL(65,30) NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransportRateByDept_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TransportRateByDept_carrierId_idx" ON "TransportRateByDept"("carrierId");

-- CreateIndex
CREATE INDEX "TransportRateByDept_departmentCode_idx" ON "TransportRateByDept"("departmentCode");

-- CreateIndex
CREATE INDEX "TransportRateByDept_carrierId_departmentCode_idx" ON "TransportRateByDept"("carrierId", "departmentCode");

-- AddForeignKey
ALTER TABLE "TransportRateByDept" ADD CONSTRAINT "TransportRateByDept_carrierId_fkey" FOREIGN KEY ("carrierId") REFERENCES "Carrier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
