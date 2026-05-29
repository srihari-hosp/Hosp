-- Make MRN unique per hospital (tenant scoped) and add core patient profile fields
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Patient_mrn_key'
  ) THEN
    ALTER TABLE "Patient" DROP CONSTRAINT "Patient_mrn_key";
  END IF;
END $$;

ALTER TABLE "Patient"
ADD COLUMN IF NOT EXISTS "dateOfBirth" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "bloodGroup" TEXT,
ADD COLUMN IF NOT EXISTS "emergencyContactName" TEXT,
ADD COLUMN IF NOT EXISTS "emergencyContactPhone" TEXT,
ADD COLUMN IF NOT EXISTS "notes" TEXT,
ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Patient_hospitalId_mrn_key'
  ) THEN
    ALTER TABLE "Patient" ADD CONSTRAINT "Patient_hospitalId_mrn_key" UNIQUE ("hospitalId", "mrn");
  END IF;
END $$;
