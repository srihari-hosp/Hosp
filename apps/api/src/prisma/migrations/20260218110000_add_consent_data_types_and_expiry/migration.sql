-- Add DPDP consent metadata to consent records
ALTER TABLE "ConsentRecord"
ADD COLUMN "dataTypes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "expiryAt" TIMESTAMP(3);
