import { createHmac } from 'crypto';

const HASH_PREFIX = 'h$';

const getHashSecret = (): string => {
  return process.env.DATA_HASH_SECRET || 'dev-data-hash-secret-change-me';
};

export const hashSensitiveValue = (value: string): string => {
  if (value.startsWith(HASH_PREFIX)) {
    return value;
  }

  const digest = createHmac('sha256', getHashSecret())
    .update(value)
    .digest('hex');

  return `${HASH_PREFIX}${digest}`;
};

export const hashOptionalSensitiveValue = (
  value: string | null | undefined
): string | null | undefined => {
  if (typeof value !== 'string') {
    return value;
  }

  return hashSensitiveValue(value);
};
