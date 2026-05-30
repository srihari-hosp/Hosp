-- Add Aadhaar hash to patient profile with tenant-scoped uniqueness
ALTER TABLE "Patient"
ADD COLUMN IF NOT EXISTS "aadhaarHash" TEXT,
ADD COLUMN IF NOT EXISTS "aadhaarEncrypted" TEXT;

-- Keep "aadhaarNumber" until a separate, verified backfill has populated
-- "aadhaarHash" and "aadhaarEncrypted" for all existing rows.
-- The UNIQUE constraint on ("hospitalId", "aadhaarHash") is also deferred
-- until backfill is complete.
