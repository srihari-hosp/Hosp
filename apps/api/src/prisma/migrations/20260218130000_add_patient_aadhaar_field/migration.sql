-- Add Aadhaar number to patient profile with tenant-scoped uniqueness
ALTER TABLE "Patient"
ADD COLUMN IF NOT EXISTS "aadhaarNumber" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Patient_hospitalId_aadhaarNumber_key'
  ) THEN
    ALTER TABLE "Patient"
    ADD CONSTRAINT "Patient_hospitalId_aadhaarNumber_key" UNIQUE ("hospitalId", "aadhaarNumber");
  END IF;
END $$;
