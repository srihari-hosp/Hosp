-- Add DPDP compliance metadata fields to AuditLog
ALTER TABLE "AuditLog"
ADD COLUMN "consent_version" TEXT,
ADD COLUMN "purpose" TEXT,
ADD COLUMN "retention_policy" TEXT;
