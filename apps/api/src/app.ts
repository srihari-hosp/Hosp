import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Request, type Response } from 'express';
import helmet from 'helmet';
import path from 'node:path';
import rateLimit from 'express-rate-limit';
import { runWithRequestContext } from './context/requestContext.js';
import { AppError } from './errors/AppError.js';
import { logger } from './logger/index.js';
import { authenticate, type AuthenticatedRequest } from './middleware/authenticate.js';
import { authorize } from './middleware/authorize.js';
import { errorHandler } from './middleware/errorHandler.js';
import { prisma } from './prisma/unifiedClient.js';
import { authRouter } from './routes/auth.routes.js';
import { appointmentsRouter } from './routes/appointments.routes.js';
import { consentsRouter } from './routes/consents.routes.js';
import healthRouter from './routes/health.routes.js';
import { patientsRouter } from './routes/patients.routes.js';
import { queuesRouter } from './routes/queues.routes.js';
import { visitsRouter } from './routes/visits.routes.js';
import { invoicesRouter } from './routes/invoices.routes.js';
import { pharmacyRouter } from './routes/pharmacy.routes.js';
import { labsRouter } from './routes/labs.routes.js';
import { dashboardRouter } from './routes/dashboard.routes.js';

export const createApp = () => {
  const app = express();
  app.set('trust proxy', 1);

  const frontendOriginConfig =
    process.env.CORS_ORIGINS ||
    process.env.ALLOWED_ORIGINS ||
    process.env.FRONTEND_URL ||
    'http://localhost:3000';
  const allowedOrigins = frontendOriginConfig
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const isAllowedOrigin = (origin: string | undefined) => {
    if (!origin) {
      return true;
    }

    return (
      allowedOrigins.includes(origin) ||
      origin.endsWith('.vercel.app') ||
      origin.endsWith('.up.railway.app')
    );
  };

  logger.info(`CORS Allowed Origins: ${allowedOrigins.join(', ')}`);
  const rateLimitWindowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000);
  const rateLimitMax = Number(process.env.RATE_LIMIT_MAX || 100);
  const authRateLimitWindowMs = Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000);
  const authRateLimitMax = Number(process.env.AUTH_RATE_LIMIT_MAX || 20);
  const apiLimiter = rateLimit({
    windowMs: Number.isFinite(rateLimitWindowMs) ? rateLimitWindowMs : 15 * 60 * 1000,
    max: Number.isFinite(rateLimitMax) ? rateLimitMax : 100,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
    skip: (req) => req.path === '/health' || req.path === '/api/health',
  });
  const authLimiter = rateLimit({
    windowMs: Number.isFinite(authRateLimitWindowMs) ? authRateLimitWindowMs : 15 * 60 * 1000,
    max: Number.isFinite(authRateLimitMax) ? authRateLimitMax : 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many authentication attempts, please try again later.' },
  });

  app.disable('x-powered-by');
  const corsOptions = {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      console.log(`CORS check for origin: ${origin}`);
      callback(null, isAllowedOrigin(origin));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-actor',
      'x-user-id',
      'x-hospital-id',
      'x-consent-version',
      'x-purpose',
      'x-retention-policy',
    ],
    optionsSuccessStatus: 204,
  };

  app.use((req, res, next) => {
    const origin = req.header('Origin');
    if (origin && !isAllowedOrigin(origin)) {
      res.status(403).end();
      return;
    }
    next();
  });

  app.options(/.*/, cors(corsOptions)); // Explicitly handle OPTIONS for all routes with same options
  app.use(cors(corsOptions));
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginOpenerPolicy: false,
    })
  );
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(apiLimiter);
  app.use('/auth', authLimiter);
  app.use('/api/auth', authLimiter);

  const uploadsDirectory = process.cwd().replace(/\\/g, '/').endsWith('/apps/api')
    ? path.resolve(process.cwd(), 'storage')
    : path.resolve(process.cwd(), 'apps/api/storage');
  app.use('/uploads', express.static(uploadsDirectory));

  app.use((req, _res, next) => {
    logger.info(`Incoming request: ${req.method} ${req.path}`);
    const headerConsentVersion = req.header('x-consent-version');
    const headerPurpose = req.header('x-purpose');
    const headerRetentionPolicy = req.header('x-retention-policy');

    runWithRequestContext(
      {
        actor: undefined,
        userId: undefined,
        hospitalId: undefined,
        consentVersion: headerConsentVersion ?? undefined,
        purpose: headerPurpose ?? undefined,
        retentionPolicy: headerRetentionPolicy ?? undefined,
        ipAddress: req.ip,
        userAgent: req.get('user-agent') ?? undefined,
      },
      () => next()
    );
  });

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok' });
  });

  app.get('/', (_req, res) => {
    logger.info('Root route accessed');
    res.json({ message: 'API is running' });
  });

  app.get('/audit-logs', authenticate, authorize('ADMIN', 'DOCTOR'), async (req: Request, res: Response) => {
    const entityType =
      typeof req.query.entityType === 'string' ? req.query.entityType : undefined;
    const entityId = typeof req.query.entityId === 'string' ? req.query.entityId : undefined;
    const userId = typeof req.query.userId === 'string' ? req.query.userId : undefined;
    const hospitalId = (req as AuthenticatedRequest).user?.hospitalId;
    if (!hospitalId) {
      throw new AppError('Hospital context missing', 403);
    }
    const limitParam = typeof req.query.limit === 'string' ? Number(req.query.limit) : NaN;
    const take = Number.isFinite(limitParam)
      ? Math.max(1, Math.min(200, Math.floor(limitParam)))
      : 50;

    try {
      const logs = await prisma.auditLog.findMany({
        where: {
          hospitalId,
          ...(entityType ? { entityType } : {}),
          ...(entityId ? { entityId } : {}),
          ...(userId ? { userId } : {}),
        },
        orderBy: { timestamp: 'desc' },
        take,
      });

      res.json({ logs, count: logs.length });
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
      res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
  });

  app.use('/auth', authRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/appointments', appointmentsRouter);
  app.use('/api/visits', visitsRouter);
  app.use('/api/invoices', invoicesRouter);
  app.use('/api/pharmacy', pharmacyRouter);
  app.use('/api/labs', labsRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/queues', queuesRouter);
  app.use('/patients', patientsRouter);
  app.use('/consents', consentsRouter);
  app.use('/api', healthRouter);

  app.use((req, _res, next) => {
    logger.error('Route not found', {
      method: req.method,
      path: req.originalUrl,
    });
    next(new AppError('Route not found', 404));
  });

  app.use(errorHandler);

  return app;
};
