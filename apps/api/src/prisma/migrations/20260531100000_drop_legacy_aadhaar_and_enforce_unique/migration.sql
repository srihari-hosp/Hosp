-- Finalize the Aadhaar Data Backfill

-- 1. Drop the legacy plaintext column
ALTER TABLE "Patient" DROP COLUMN IF EXISTS "aadhaarNumber";

-- 2. Enforce the unique constraint on the new hash
-- (Assuming the index wasn't already created by a previous squashed migration, Prisma will handle ensuring it exists via schema sync)
-- Prisma schema has: @@unique([hospitalId, aadhaarHash])
-- We will let Prisma handle the exact constraint name when applying, but if it was deferred, we ensure it's created.
CREATE UNIQUE INDEX IF NOT EXISTS "Patient_hospitalId_aadhaarHash_key" ON "Patient"("hospitalId", "aadhaarHash");
