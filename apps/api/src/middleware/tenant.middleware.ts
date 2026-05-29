import type { NextFunction, Response } from 'express';
import { mergeRequestContext } from '../common/context/tenant.context.js';
import type { AuthenticatedRequest } from './authenticate.js';

export const setTenantContext = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void => {
  const user = req.user;
  if (user?.hospitalId || user?.tenantId) {
    mergeRequestContext({
      hospitalId: user.hospitalId ?? user.tenantId,
      userId: user.userId,
      actor: user.userId,
    });
  }

  next();
};
