-- CreateEnum
CREATE TYPE "MedicineSchedule" AS ENUM ('OTC', 'H', 'H1', 'X', 'NARCOTIC');

-- CreateTable
CREATE TABLE "Medicine" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "genericName" TEXT,
    "manufacturer" TEXT,
    "hsnCode" TEXT NOT NULL,
    "gstRate" DECIMAL(5,2) NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "scheduleCategory" "MedicineSchedule" NOT NULL DEFAULT 'OTC',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "hospitalId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Medicine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockBatch" (
    "id" TEXT NOT NULL,
    "batchNo" TEXT NOT NULL,
    "vendorName" TEXT,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "receivedQty" INTEGER NOT NULL,
    "availableQty" INTEGER NOT NULL,
    "purchasePrice" DECIMAL(12,2),
    "mrp" DECIMAL(12,2) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "hospitalId" TEXT NOT NULL,
    "medicineId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DispenseRecord" (
    "id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "gstRate" DECIMAL(5,2) NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "dispensedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "hospitalId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "prescriptionId" TEXT NOT NULL,
    "medicineId" TEXT NOT NULL,
    "stockBatchId" TEXT NOT NULL,
    "dispensedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DispenseRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Medicine_hospitalId_idx" ON "Medicine"("hospitalId");

-- CreateIndex
CREATE INDEX "Medicine_hospitalId_name_idx" ON "Medicine"("hospitalId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Medicine_hospitalId_code_key" ON "Medicine"("hospitalId", "code");

-- CreateIndex
CREATE INDEX "StockBatch_hospitalId_idx" ON "StockBatch"("hospitalId");

-- CreateIndex
CREATE INDEX "StockBatch_hospitalId_medicineId_idx" ON "StockBatch"("hospitalId", "medicineId");

-- CreateIndex
CREATE INDEX "StockBatch_hospitalId_expiryDate_idx" ON "StockBatch"("hospitalId", "expiryDate");

-- CreateIndex
CREATE UNIQUE INDEX "StockBatch_hospitalId_medicineId_batchNo_key" ON "StockBatch"("hospitalId", "medicineId", "batchNo");

-- CreateIndex
CREATE INDEX "DispenseRecord_hospitalId_idx" ON "DispenseRecord"("hospitalId");

-- CreateIndex
CREATE INDEX "DispenseRecord_hospitalId_patientId_idx" ON "DispenseRecord"("hospitalId", "patientId");

-- CreateIndex
CREATE INDEX "DispenseRecord_hospitalId_prescriptionId_idx" ON "DispenseRecord"("hospitalId", "prescriptionId");

-- CreateIndex
CREATE INDEX "DispenseRecord_hospitalId_medicineId_idx" ON "DispenseRecord"("hospitalId", "medicineId");

-- CreateIndex
CREATE INDEX "DispenseRecord_hospitalId_stockBatchId_idx" ON "DispenseRecord"("hospitalId", "stockBatchId");

-- AddForeignKey
ALTER TABLE "Medicine" ADD CONSTRAINT "Medicine_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockBatch" ADD CONSTRAINT "StockBatch_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockBatch" ADD CONSTRAINT "StockBatch_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "Medicine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispenseRecord" ADD CONSTRAINT "DispenseRecord_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispenseRecord" ADD CONSTRAINT "DispenseRecord_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispenseRecord" ADD CONSTRAINT "DispenseRecord_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "Prescription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispenseRecord" ADD CONSTRAINT "DispenseRecord_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "Medicine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispenseRecord" ADD CONSTRAINT "DispenseRecord_stockBatchId_fkey" FOREIGN KEY ("stockBatchId") REFERENCES "StockBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispenseRecord" ADD CONSTRAINT "DispenseRecord_dispensedById_fkey" FOREIGN KEY ("dispensedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
