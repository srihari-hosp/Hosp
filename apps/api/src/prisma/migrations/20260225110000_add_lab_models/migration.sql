-- CreateTable
CREATE TABLE "LabTest" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "sampleType" TEXT,
    "defaultUnit" TEXT,
    "referenceRange" TEXT,
    "instructions" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "hospitalId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LabTest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabOrder" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'ROUTINE',
    "status" TEXT NOT NULL DEFAULT 'ORDERED',
    "notes" TEXT,
    "clinicalNotes" TEXT,
    "orderedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "collectedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "hospitalId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "visitId" TEXT,
    "labTestId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LabOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabResult" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "resultValue" TEXT,
    "unit" TEXT,
    "referenceRange" TEXT,
    "interpretation" TEXT,
    "remarks" TEXT,
    "observedAt" TIMESTAMP(3),
    "reportedAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "hospitalId" TEXT NOT NULL,
    "labOrderId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "labTestId" TEXT NOT NULL,
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LabResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LabTest_hospitalId_idx" ON "LabTest"("hospitalId");
CREATE INDEX "LabTest_hospitalId_name_idx" ON "LabTest"("hospitalId", "name");
CREATE UNIQUE INDEX "LabTest_hospitalId_code_key" ON "LabTest"("hospitalId", "code");

-- CreateIndex
CREATE INDEX "LabOrder_hospitalId_idx" ON "LabOrder"("hospitalId");
CREATE INDEX "LabOrder_hospitalId_patientId_idx" ON "LabOrder"("hospitalId", "patientId");
CREATE INDEX "LabOrder_hospitalId_doctorId_idx" ON "LabOrder"("hospitalId", "doctorId");
CREATE INDEX "LabOrder_hospitalId_labTestId_idx" ON "LabOrder"("hospitalId", "labTestId");
CREATE INDEX "LabOrder_hospitalId_orderedAt_idx" ON "LabOrder"("hospitalId", "orderedAt");
CREATE INDEX "LabOrder_hospitalId_status_idx" ON "LabOrder"("hospitalId", "status");
CREATE UNIQUE INDEX "LabOrder_hospitalId_orderNumber_key" ON "LabOrder"("hospitalId", "orderNumber");

-- CreateIndex
CREATE INDEX "LabResult_hospitalId_idx" ON "LabResult"("hospitalId");
CREATE INDEX "LabResult_hospitalId_patientId_idx" ON "LabResult"("hospitalId", "patientId");
CREATE INDEX "LabResult_hospitalId_labTestId_idx" ON "LabResult"("hospitalId", "labTestId");
CREATE INDEX "LabResult_hospitalId_reportedAt_idx" ON "LabResult"("hospitalId", "reportedAt");
CREATE INDEX "LabResult_hospitalId_status_idx" ON "LabResult"("hospitalId", "status");
CREATE UNIQUE INDEX "LabResult_labOrderId_key" ON "LabResult"("labOrderId");

-- AddForeignKey
ALTER TABLE "LabTest" ADD CONSTRAINT "LabTest_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabOrder" ADD CONSTRAINT "LabOrder_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LabOrder" ADD CONSTRAINT "LabOrder_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LabOrder" ADD CONSTRAINT "LabOrder_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LabOrder" ADD CONSTRAINT "LabOrder_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LabOrder" ADD CONSTRAINT "LabOrder_labTestId_fkey" FOREIGN KEY ("labTestId") REFERENCES "LabTest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabResult" ADD CONSTRAINT "LabResult_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LabResult" ADD CONSTRAINT "LabResult_labOrderId_fkey" FOREIGN KEY ("labOrderId") REFERENCES "LabOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LabResult" ADD CONSTRAINT "LabResult_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LabResult" ADD CONSTRAINT "LabResult_labTestId_fkey" FOREIGN KEY ("labTestId") REFERENCES "LabTest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LabResult" ADD CONSTRAINT "LabResult_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
