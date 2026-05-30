import type { NextFunction, Request, Response } from 'express';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { mergeRequestContext } from '../context/requestContext.js';
import { AppError } from '../errors/AppError.js';

export interface AuthTokenPayload extends JwtPayload {
  userId: string;
  role: string;
  tenantId: string;
  hospitalId?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthTokenPayload;
}

const getAccessTokenSecret = (): string => {
  const secret = process.env.ACCESS_TOKEN_SECRET ?? process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('ACCESS_TOKEN_SECRET/JWT_SECRET not set');
  }
  return secret;
};

export const authenticate = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Response | void => {
  const authHeader = req.header('authorization');
  const bearerToken = authHeader?.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7).trim()
    : undefined;
  const token = req.cookies?.token ?? bearerToken;
  if (!token) {
    return next(new AppError('Unauthorized', 401));
  }

  const secret = getAccessTokenSecret();

  try {
    const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] }) as AuthTokenPayload;
    const tenantId = decoded.tenantId ?? decoded.hospitalId;

    if (!tenantId) {
      return next(new AppError('Invalid token', 401));
    }

    req.user = {
      ...decoded,
      tenantId,
      // Preserve hospitalId as an alias to avoid breaking existing route logic.
      hospitalId: decoded.hospitalId ?? tenantId,
    };

    mergeRequestContext({
      actor: decoded.userId,
      userId: decoded.userId,
      hospitalId: tenantId,
    });
    next();
  } catch {
    return next(new AppError('Invalid token', 401));
  }
};
