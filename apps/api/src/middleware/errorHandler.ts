import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { AppError } from '../errors/AppError.js';
import { logger } from '../logger/index.js';

type RequestWithTrace = Request & { traceId?: string };

type ErrorBody = {
  success: false;
  message: string;
  traceId: string | null;
  errors?: unknown;
};

export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
): Response<ErrorBody> => {
  void next;

  const traceId = (req as RequestWithTrace).traceId ?? null;
  const isProduction = process.env.NODE_ENV === 'production';

  let appError: AppError;

  if (err instanceof AppError) {
    appError = err;
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const prismaErr = err;
    if (prismaErr.code === 'P2002') {
      const target = prismaErr.meta?.target;
      const fields = Array.isArray(target) ? target.join(', ') : 'fields';
      appError = new AppError(`Unique constraint failed on ${fields}`, 409);
    } else {
      appError = new AppError('Database operation failed', 500);
    }
  } else if (err instanceof Error) {
    appError = new AppError(err.message || 'Internal server error', 500);
  } else {
    appError = new AppError('Internal server error', 500);
  }

  const statusCode = appError.statusCode >= 400 ? appError.statusCode : 500;
  const message =
    statusCode >= 500 && isProduction
      ? 'Internal server error'
      : appError.message || 'Internal server error';

  const errors = appError.details ?? null;

  const logMethod = statusCode >= 500 ? 'error' : 'warn';

  logger[logMethod]('Request failed', {
    traceId,
    method: req.method,
    path: req.originalUrl,
    statusCode,
    errorName: appError.name,
    errorMessage: appError.message,
    errors,
    stack: appError.stack,
  });

  return res.status(statusCode).json({
    success: false,
    message,
    traceId,
    errors,
  });
};
