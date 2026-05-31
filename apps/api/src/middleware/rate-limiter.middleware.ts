import rateLimit from 'express-rate-limit';

const toPositiveInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const rateLimitWindowMs = toPositiveInt(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000);
const authLimitMax = toPositiveInt(process.env.AUTH_RATE_LIMIT_MAX, 10);
const apiLimitMax = toPositiveInt(process.env.RATE_LIMIT_MAX, 100);

export const authLimiter = rateLimit({
  windowMs: rateLimitWindowMs,
  max: authLimitMax,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please try again later.' },
});

export const apiLimiter = rateLimit({
  windowMs: rateLimitWindowMs,
  max: apiLimitMax,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
