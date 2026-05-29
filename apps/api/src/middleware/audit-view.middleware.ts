import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../prisma/client.js';
import { getRequestContext } from '../common/context/tenant.context.js';

export const auditView = (entityType: string) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const context = getRequestContext();

    if (context?.hospitalId) {
      prisma.auditLog.create({
        data: {
          hospitalId: context.hospitalId,
          userId: context.userId ?? null,
          actor: context.actor ?? context.userId ?? 'system',
          entityType: `${entityType}:VIEW`,
          entityId: typeof req.params?.id === 'string' ? req.params.id : null,
          changesJson: Prisma.JsonNull,
          consentVersion: context.consentVersion ?? null,
          purpose: context.purpose ?? null,
          retentionPolicy: context.retentionPolicy ?? null,
          ipAddress: context.ipAddress ?? req.ip ?? null,
          userAgent: context.userAgent ?? req.get('user-agent') ?? null,
          timestamp: new Date(),
        },
      }).catch((err) => {
        // Log but don't fail the request
        console.error('Audit log write failed:', err);
      });
    }

    next();
  };
};
