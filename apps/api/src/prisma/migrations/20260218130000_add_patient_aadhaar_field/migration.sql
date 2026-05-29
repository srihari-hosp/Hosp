-- Add Aadhaar hash to patient profile with tenant-scoped uniqueness
ALTER TABLE "Patient"
ADD COLUMN IF NOT EXISTS "aadhaarHash" TEXT,
ADD COLUMN IF NOT EXISTS "aadhaarEncrypted" TEXT;

ALTER TABLE "Patient"
DROP COLUMN IF EXISTS "aadhaarNumber";

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Patient_hospitalId_aadhaarHash_key'
  ) THEN
    ALTER TABLE "Patient"
    ADD CONSTRAINT "Patient_hospitalId_aadhaarHash_key" UNIQUE ("hospitalId", "aadhaarHash");
  END IF;
END $$;
