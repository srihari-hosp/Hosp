-- CreateTable
CREATE TABLE IF NOT EXISTS "Visit" (
  "id" TEXT NOT NULL,
  "chiefComplaint" TEXT NOT NULL,
  "diagnosis" TEXT,
  "notes" TEXT,
  "visitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "hospitalId" TEXT NOT NULL,
  "appointmentId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "doctorId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Visit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Prescription" (
  "id" TEXT NOT NULL,
  "medication" TEXT NOT NULL,
  "dosage" TEXT NOT NULL,
  "frequency" TEXT NOT NULL,
  "durationDays" INTEGER NOT NULL,
  "instructions" TEXT,
  "hospitalId" TEXT NOT NULL,
  "visitId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Prescription_durationDays_check" CHECK ("durationDays" > 0),
  CONSTRAINT "Prescription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Visit_appointmentId_key" ON "Visit"("appointmentId");
CREATE INDEX IF NOT EXISTS "Visit_hospitalId_idx" ON "Visit"("hospitalId");
CREATE INDEX IF NOT EXISTS "Visit_hospitalId_patientId_idx" ON "Visit"("hospitalId", "patientId");
CREATE INDEX IF NOT EXISTS "Visit_hospitalId_doctorId_idx" ON "Visit"("hospitalId", "doctorId");
CREATE INDEX IF NOT EXISTS "Visit_hospitalId_visitedAt_idx" ON "Visit"("hospitalId", "visitedAt");
CREATE INDEX IF NOT EXISTS "Prescription_hospitalId_idx" ON "Prescription"("hospitalId");
CREATE INDEX IF NOT EXISTS "Prescription_hospitalId_visitId_idx" ON "Prescription"("hospitalId", "visitId");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Visit_hospitalId_fkey') THEN
    ALTER TABLE "Visit"
      ADD CONSTRAINT "Visit_hospitalId_fkey"
      FOREIGN KEY ("hospitalId")
      REFERENCES "Hospital"("id")
      ON DELETE RESTRICT
      ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Visit_appointmentId_fkey') THEN
    ALTER TABLE "Visit"
      ADD CONSTRAINT "Visit_appointmentId_fkey"
      FOREIGN KEY ("appointmentId")
      REFERENCES "Appointment"("id")
      ON DELETE RESTRICT
      ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Visit_patientId_fkey') THEN
    ALTER TABLE "Visit"
      ADD CONSTRAINT "Visit_patientId_fkey"
      FOREIGN KEY ("patientId")
      REFERENCES "Patient"("id")
      ON DELETE RESTRICT
      ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Visit_doctorId_fkey') THEN
    ALTER TABLE "Visit"
      ADD CONSTRAINT "Visit_doctorId_fkey"
      FOREIGN KEY ("doctorId")
      REFERENCES "Doctor"("id")
      ON DELETE RESTRICT
      ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Prescription_hospitalId_fkey') THEN
    ALTER TABLE "Prescription"
      ADD CONSTRAINT "Prescription_hospitalId_fkey"
      FOREIGN KEY ("hospitalId")
      REFERENCES "Hospital"("id")
      ON DELETE RESTRICT
      ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Prescription_visitId_fkey') THEN
    ALTER TABLE "Prescription"
      ADD CONSTRAINT "Prescription_visitId_fkey"
      FOREIGN KEY ("visitId")
      REFERENCES "Visit"("id")
      ON DELETE RESTRICT
      ON UPDATE CASCADE;
  END IF;
END
$$;
