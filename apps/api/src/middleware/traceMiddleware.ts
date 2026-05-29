import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';

export interface TraceRequest extends Request {
  traceId?: string;
}

export const traceMiddleware = (
  req: TraceRequest,
  res: Response,
  next: NextFunction
) => {
  const traceId = randomUUID();

  req.traceId = traceId;
  res.setHeader('x-trace-id', traceId);

  next();
};
