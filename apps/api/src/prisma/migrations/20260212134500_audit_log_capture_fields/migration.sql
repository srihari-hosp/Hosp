-- Capture canonical audit fields: actor, entity_type, entity_id, changes_json
ALTER TABLE "AuditLog"
RENAME COLUMN "entity" TO "entity_type";

ALTER TABLE "AuditLog"
RENAME COLUMN "entityId" TO "entity_id";

ALTER TABLE "AuditLog"
ADD COLUMN "actor" TEXT;

ALTER TABLE "AuditLog"
ADD COLUMN "changes_json" JSONB;

UPDATE "AuditLog"
SET "changes_json" = jsonb_build_object(
  'action', "action",
  'old', "oldData",
  'new', "newData"
);

ALTER TABLE "AuditLog"
DROP COLUMN "action",
DROP COLUMN "oldData",
DROP COLUMN "newData";
