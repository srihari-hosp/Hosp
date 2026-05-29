import rateLimit from 'express-rate-limit';

const rateLimitWindowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000);
const authLimitMax = Number(process.env.AUTH_RATE_LIMIT_MAX || 10);
const apiLimitMax = Number(process.env.RATE_LIMIT_MAX || 100);

export const authLimiter = rateLimit({
  windowMs: Number.isFinite(rateLimitWindowMs) ? rateLimitWindowMs : 15 * 60 * 1000,
  max: Number.isFinite(authLimitMax) ? authLimitMax : 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please try again later.' },
});

export const apiLimiter = rateLimit({
  windowMs: Number.isFinite(rateLimitWindowMs) ? rateLimitWindowMs : 15 * 60 * 1000,
  max: Number.isFinite(apiLimitMax) ? apiLimitMax : 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
