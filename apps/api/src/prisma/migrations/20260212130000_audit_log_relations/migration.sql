-- Align AuditLog with Hospital-based tenancy and relational integrity
DROP INDEX "AuditLog_tenantId_idx";

ALTER TABLE "AuditLog"
RENAME COLUMN "tenantId" TO "hospitalId";

ALTER TABLE "AuditLog"
ALTER COLUMN "userId" DROP NOT NULL;

CREATE INDEX "AuditLog_hospitalId_idx" ON "AuditLog"("hospitalId");

ALTER TABLE "AuditLog"
ADD CONSTRAINT "AuditLog_hospitalId_fkey"
FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AuditLog"
ADD CONSTRAINT "AuditLog_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
