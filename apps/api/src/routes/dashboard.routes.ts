import { AppointmentStatus, Prisma } from '@prisma/client';
import { Router } from 'express';
import { AuthError, ValidationError } from '../errors/customErrors.js';
import { authenticate, type AuthenticatedRequest } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { prisma } from '../prisma/client.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { redisSchema } from '../utils/redis-schema.js';

const router = Router();
const CACHE_TTL_SECONDS = 5 * 60; // 5 minutes
const MAX_TREND_DAYS = 90;
const DEFAULT_APPOINTMENT_DAYS = 7;
const DEFAULT_REVENUE_DAYS = 30;

// No longer using local Map. redisSchema handles persistence and sharing across instances.
export const __clearDashboardCacheForTests = async (hospitalId: string): Promise<void> => {
  const cache = redisSchema(hospitalId, 'dashboard');
  await cache.clear();
};

const getHospitalId = (req: AuthenticatedRequest): string => {
  const hospitalId = req.user?.hospitalId;
  if (!hospitalId) {
    throw new AuthError('Unauthorized');
  }
  return hospitalId;
};

const nowUtc = (): Date => {
  return new Date();
};

const startOfUtcDay = (date: Date): Date => {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
};

const endOfUtcDay = (date: Date): Date => {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
};

const addUtcDays = (date: Date, days: number): Date => {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
};

const parseDaysParam = (raw: unknown, fallback: number): number => {
  if (raw === undefined) {
    return fallback;
  }

  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > MAX_TREND_DAYS) {
    throw new ValidationError(`days must be an integer between 1 and ${MAX_TREND_DAYS}`);
  }

  return value;
};

const toNumber = (value: Prisma.Decimal | number | string | null | undefined): number => {
  if (value === null || value === undefined) {
    return 0;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

// Replaced local helper functions with redisSchema calls in the routes directly.

type TrendPoint = {
  date: string;
  count?: number;
  revenue?: number;
};

const buildAppointmentTrend = async (hospitalId: string, days: number): Promise<TrendPoint[]> => {
  const today = startOfUtcDay(nowUtc());
  const start = addUtcDays(today, -(days - 1));
  const trend: TrendPoint[] = [];

  for (let offset = 0; offset < days; offset += 1) {
    const currentDay = addUtcDays(start, offset);
    const dayStart = startOfUtcDay(currentDay);
    const dayEnd = endOfUtcDay(currentDay);

    const count = await prisma.appointment.count({
      where: {
        hospitalId,
        status: { not: AppointmentStatus.CANCELLED },
        scheduledAt: {
          gte: dayStart,
          lte: dayEnd,
        },
      },
    });

    trend.push({
      date: dayStart.toISOString().slice(0, 10),
      count,
    });
  }

  return trend;
};

const buildRevenueTrend = async (hospitalId: string, days: number): Promise<TrendPoint[]> => {
  const today = startOfUtcDay(nowUtc());
  const start = addUtcDays(today, -(days - 1));
  const trend: TrendPoint[] = [];

  for (let offset = 0; offset < days; offset += 1) {
    const currentDay = addUtcDays(start, offset);
    const dayStart = startOfUtcDay(currentDay);
    const dayEnd = endOfUtcDay(currentDay);

    const aggregate = await prisma.payment.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        hospitalId,
        receivedAt: {
          gte: dayStart,
          lte: dayEnd,
        },
      },
    });

    trend.push({
      date: dayStart.toISOString().slice(0, 10),
      revenue: Number(toNumber(aggregate._sum.amount).toFixed(2)),
    });
  }

  return trend;
};

router.get(
  '/summary',
  authenticate,
  authorize('ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST'),
  asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req as AuthenticatedRequest);
    const cache = redisSchema(hospitalId, 'dashboard');
    const cacheKey = 'summary';

    const cached = await cache.getJson<any>(cacheKey);
    if (cached) {
      res.setHeader('x-cache', 'HIT');
      res.status(200).json(cached);
      return;
    }

    const today = nowUtc();
    const dayStart = startOfUtcDay(today);
    const dayEnd = endOfUtcDay(today);
    const last7DaysStart = addUtcDays(dayStart, -6);
    const last30DaysStart = addUtcDays(dayStart, -29);

    const [totalPatients, todayAppointments, revenueLast7Days, revenueLast30Days] = await Promise.all([
      prisma.patient.count({
        where: {
          hospitalId,
          isActive: true,
        },
      }),
      prisma.appointment.count({
        where: {
          hospitalId,
          status: { not: AppointmentStatus.CANCELLED },
          scheduledAt: {
            gte: dayStart,
            lte: dayEnd,
          },
        },
      }),
      prisma.payment.aggregate({
        _sum: {
          amount: true,
        },
        where: {
          hospitalId,
          receivedAt: {
            gte: last7DaysStart,
            lte: dayEnd,
          },
        },
      }),
      prisma.payment.aggregate({
        _sum: {
          amount: true,
        },
        where: {
          hospitalId,
          receivedAt: {
            gte: last30DaysStart,
            lte: dayEnd,
          },
        },
      }),
    ]);

    const payload = {
      summary: {
        totalPatients,
        todayAppointments,
        revenueLast7Days: Number(toNumber(revenueLast7Days._sum.amount).toFixed(2)),
        revenueLast30Days: Number(toNumber(revenueLast30Days._sum.amount).toFixed(2)),
      },
      generatedAt: new Date().toISOString(),
      cacheTtlSeconds: CACHE_TTL_SECONDS,
    };

    await cache.setJson(cacheKey, payload, CACHE_TTL_SECONDS);
    res.setHeader('x-cache', 'MISS');
    res.status(200).json(payload);
  })
);

router.get(
  '/appointments-trend',
  authenticate,
  authorize('ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST'),
  asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req as AuthenticatedRequest);
    const days = parseDaysParam(req.query.days, DEFAULT_APPOINTMENT_DAYS);
    const cache = redisSchema(hospitalId, 'dashboard');
    const cacheKey = `appointments-trend:${days}`;

    const cached = await cache.getJson<any>(cacheKey);
    if (cached) {
      res.setHeader('x-cache', 'HIT');
      res.status(200).json(cached);
      return;
    }

    const trend = await buildAppointmentTrend(hospitalId, days);
    const payload = {
      days,
      trend,
      generatedAt: new Date().toISOString(),
      cacheTtlSeconds: CACHE_TTL_SECONDS,
    };

    await cache.setJson(cacheKey, payload, CACHE_TTL_SECONDS);
    res.setHeader('x-cache', 'MISS');
    res.status(200).json(payload);
  })
);

router.get(
  '/revenue-trend',
  authenticate,
  authorize('ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST'),
  asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req as AuthenticatedRequest);
    const days = parseDaysParam(req.query.days, DEFAULT_REVENUE_DAYS);
    const cache = redisSchema(hospitalId, 'dashboard');
    const cacheKey = `revenue-trend:${days}`;

    const cached = await cache.getJson<any>(cacheKey);
    if (cached) {
      res.setHeader('x-cache', 'HIT');
      res.status(200).json(cached);
      return;
    }

    const trend = await buildRevenueTrend(hospitalId, days);
    const payload = {
      days,
      trend,
      generatedAt: new Date().toISOString(),
      cacheTtlSeconds: CACHE_TTL_SECONDS,
    };

    await cache.setJson(cacheKey, payload, CACHE_TTL_SECONDS);
    res.setHeader('x-cache', 'MISS');
    res.status(200).json(payload);
  })
);

export { router as dashboardRouter };
