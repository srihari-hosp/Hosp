-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AppointmentStatus') THEN
    CREATE TYPE "AppointmentStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');
  END IF;
END
$$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "Doctor" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "specialization" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "hospitalId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Doctor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Appointment" (
  "id" TEXT NOT NULL,
  "scheduledAt" TIMESTAMP(3) NOT NULL,
  "status" "AppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
  "notes" TEXT,
  "hospitalId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "doctorId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Doctor_hospitalId_idx" ON "Doctor"("hospitalId");
CREATE INDEX IF NOT EXISTS "Doctor_hospitalId_name_idx" ON "Doctor"("hospitalId", "name");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Appointment_hospitalId_idx" ON "Appointment"("hospitalId");
CREATE INDEX IF NOT EXISTS "Appointment_hospitalId_scheduledAt_idx" ON "Appointment"("hospitalId", "scheduledAt");
CREATE INDEX IF NOT EXISTS "Appointment_hospitalId_doctorId_scheduledAt_idx" ON "Appointment"("hospitalId", "doctorId", "scheduledAt");
CREATE INDEX IF NOT EXISTS "Appointment_hospitalId_patientId_idx" ON "Appointment"("hospitalId", "patientId");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Doctor_hospitalId_fkey'
  ) THEN
    ALTER TABLE "Doctor"
      ADD CONSTRAINT "Doctor_hospitalId_fkey"
      FOREIGN KEY ("hospitalId")
      REFERENCES "Hospital"("id")
      ON DELETE RESTRICT
      ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Appointment_hospitalId_fkey'
  ) THEN
    ALTER TABLE "Appointment"
      ADD CONSTRAINT "Appointment_hospitalId_fkey"
      FOREIGN KEY ("hospitalId")
      REFERENCES "Hospital"("id")
      ON DELETE RESTRICT
      ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Appointment_patientId_fkey'
  ) THEN
    ALTER TABLE "Appointment"
      ADD CONSTRAINT "Appointment_patientId_fkey"
      FOREIGN KEY ("patientId")
      REFERENCES "Patient"("id")
      ON DELETE RESTRICT
      ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Appointment_doctorId_fkey'
  ) THEN
    ALTER TABLE "Appointment"
      ADD CONSTRAINT "Appointment_doctorId_fkey"
      FOREIGN KEY ("doctorId")
      REFERENCES "Doctor"("id")
      ON DELETE RESTRICT
      ON UPDATE CASCADE;
  END IF;
END
$$;
