import { getRequestContext } from '../../context/requestContext.js';
import { prisma } from '../../prisma/unifiedClient.js';
import { logger } from '../../logger/index.js';

export type AuditableOptions = {
  action?: string;
  entity?: string;
  sensitivity?: string;
};

const logAudit = async (options: AuditableOptions, status: string, error?: any) => {
  const context = getRequestContext();
  const hospitalId = context?.hospitalId;
  const userId = context?.userId;
  const action = options.action ?? 'UnknownAction';
  const entity = options.entity ?? 'UnknownEntity';

  logger.info(`[Audit] ${action} on ${entity} - Status: ${status}`, { hospitalId, userId });

  if (hospitalId) {
    try {
      await prisma.auditLog.create({
        data: {
          hospitalId,
          userId: userId ?? null,
          actor: context?.actor ?? userId ?? 'system',
          entityType: entity,
          entityId: 'METHOD_CALL',
          changesJson: { action, status, error: error ? String(error) : null },
          timestamp: new Date(),
          ipAddress: context?.ipAddress ?? null,
          userAgent: context?.userAgent ?? null,
          consentVersion: context?.consentVersion ?? null,
          purpose: context?.purpose ?? null,
          retentionPolicy: context?.retentionPolicy ?? null,
        }
      });
    } catch (err) {
      logger.error('Failed to write audit log in decorator', { err });
    }
  }
};

export const Auditable = (options?: AuditableOptions): MethodDecorator => {
  return (_target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const opts = { ...options, action: options?.action ?? String(propertyKey) };
      
      try {
        const result = await originalMethod.apply(this, args);
        await logAudit(opts, 'SUCCESS');
        return result;
      } catch (error) {
        await logAudit(opts, 'ERROR', error instanceof Error ? error.message : error);
        throw error; // Rethrow original error
      }
    };

    return descriptor;
  };
};
