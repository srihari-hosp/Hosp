import fs from 'node:fs';
import path from 'node:path';
import { createLogger, format, transports } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const cwd = process.cwd().replace(/\\/g, '/');
const logDirectory = cwd.endsWith('/apps/api')
  ? path.resolve(process.cwd(), 'logs')
  : path.resolve(process.cwd(), 'apps/api/logs');

fs.mkdirSync(logDirectory, { recursive: true });

const secretKeys = new Set([
  'password',
  'passwordhash',
  'token',
  'authorization',
  'cookie',
  'set-cookie',
  'jwt',
  'secret',
  'accesstoken',
  'refreshtoken',
]);

const redactSecrets = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((entry) => redactSecrets(entry));
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    return entries.reduce<Record<string, unknown>>((acc, [key, entry]) => {
      if (secretKeys.has(key.toLowerCase())) {
        acc[key] = '[REDACTED]';
      } else {
        acc[key] = redactSecrets(entry);
      }
      return acc;
    }, {});
  }

  return value;
};

// ✅ FIXED redaction format (modifies info in-place)
const redactionFormat = format((info) => {
  const sanitized = redactSecrets(info) as Record<string, unknown>;
  Object.assign(info, sanitized);
  return info;
});

const baseFormat = format.combine(
  redactionFormat(),
  format.timestamp(),
  format.errors({ stack: true }),
  format.json()
);

const appRotateTransport = new DailyRotateFile({
  dirname: logDirectory,
  filename: 'app-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxFiles: '14d',
  zippedArchive: true,
});

const errorRotateTransport = new DailyRotateFile({
  dirname: logDirectory,
  filename: 'error-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  level: 'error',
  maxFiles: '30d',
  zippedArchive: true,
});

const logger = createLogger({
  level: process.env.LOG_LEVEL ?? 'info',
  defaultMeta: { service: 'hosp-api' },
  format: baseFormat,
  transports: [appRotateTransport, errorRotateTransport],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new transports.Console({
      format: format.combine(
        redactionFormat(),
        format.colorize(),
        format.simple()
      ),
    })
  );
}

export { logger };
