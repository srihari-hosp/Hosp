-- Add consent tracking fields directly on Patient for quick filtering/reporting
ALTER TABLE "Patient"
ADD COLUMN IF NOT EXISTS "consentStatus" "ConsentStatus",
ADD COLUMN IF NOT EXISTS "consentPurpose" TEXT,
ADD COLUMN IF NOT EXISTS "consentVersion" TEXT,
ADD COLUMN IF NOT EXISTS "consentCapturedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "consentRevokedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Patient_hospitalId_consentStatus_idx"
ON "Patient" ("hospitalId", "consentStatus");
