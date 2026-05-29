export const retentionConfig = {
  auditLogDays: Number(process.env.AUDIT_LOG_RETENTION_DAYS || 365),
  consentLogDays: Number(process.env.CONSENT_RETENTION_DAYS || 365),
};
