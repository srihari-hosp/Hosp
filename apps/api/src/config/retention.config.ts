const parseRetentionDays = (raw: string | undefined, fallback: number): number => {
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

export const retentionConfig = {
  auditLogDays: parseRetentionDays(process.env.AUDIT_LOG_RETENTION_DAYS, 365),
  consentLogDays: parseRetentionDays(process.env.CONSENT_RETENTION_DAYS, 365),
};
