import { Prisma, PrismaClient } from '@prisma/client';
import { getRequestContext } from '../context/requestContext.js';
import { hashSensitiveValue } from '../utils/hash.js';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// --- AUDIT CONSTANTS ---
const AUDITED_OPERATIONS = new Set(['create', 'update', 'delete']);

// --- RLS CONSTANTS ---
const READ_OPERATIONS = new Set([
  'findMany',
  'findFirst',
  'findFirstOrThrow',
  'findUnique',
  'findUniqueOrThrow',
  'count',
  'aggregate',
  'groupBy',
]);

const DATA_READ_OPERATIONS = new Set([
  'findMany',
  'findFirst',
  'findFirstOrThrow',
  'findUnique',
  'findUniqueOrThrow',
]);

const FILTERABLE_OPERATIONS = new Set([
  'findMany',
  'findFirst',
  'findFirstOrThrow',
  'count',
  'aggregate',
  'groupBy',
  'updateMany',
  'deleteMany',
  'update',
  'delete',
  'upsert',
  'findUnique',
  'findUniqueOrThrow',
]);

const WRITE_OPERATIONS = new Set([
  'create',
  'createMany',
  'update',
  'updateMany',
  'upsert',
  'delete',
  'deleteMany',
]);

const TENANT_MODELS = new Set([
  'user',
  'doctor',
  'patient',
  'appointment',
  'visit',
  'prescription',
  'tariffitem',
  'invoice',
  'invoiceitem',
  'payment',
  'medicine',
  'stockbatch',
  'dispenserecord',
  'labtest',
  'laborder',
  'labresult',
  'consentrecord',
  'auditlog',
]);

// --- SHARED UTILS ---
const lowerFirst = (value: string): string => `${value.slice(0, 1).toLowerCase()}${value.slice(1)}`;

const normalizeModelName = (model: string | undefined): string | null => {
  if (!model) return null;
  return model.toLowerCase();
};

const isRlsModel = (normalizedModel: string): boolean => {
  return TENANT_MODELS.has(normalizedModel) || normalizedModel === 'hospital';
};

const getTenantFilter = (normalizedModel: string, hospitalId: string): Record<string, unknown> => {
  if (normalizedModel === 'hospital') return { id: hospitalId };
  return { hospitalId };
};

// --- AUDIT UTILS ---
const toJsonValue = (value: unknown): Prisma.InputJsonValue => {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
};

const buildChangesJson = (operation: string, oldData: unknown, newData: unknown): Prisma.InputJsonValue => {
  if (operation === 'create') return toJsonValue({ operation, before: null, after: newData });
  if (operation === 'delete') return toJsonValue({ operation, before: oldData, after: null });
  return toJsonValue({ operation, before: oldData, after: newData });
};

const getEntityId = (args: unknown, result: unknown, oldData: unknown): string | null => {
  if (result && typeof result === 'object' && 'id' in result && typeof (result as any).id === 'string') {
    return (result as any).id;
  }
  if (oldData && typeof oldData === 'object' && 'id' in oldData && typeof (oldData as any).id === 'string') {
    return (oldData as any).id;
  }
  const where = (args as { where?: { id?: unknown } } | undefined)?.where;
  if (where && typeof where.id === 'string') return where.id;
  return null;
};

const getStringProp = (source: unknown, key: string): string | null => {
  if (!source || typeof source !== 'object') return null;
  const value = (source as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : null;
};

const getOldData = async (client: PrismaClient, model: string, args: unknown): Promise<unknown> => {
  const where = (args as { where?: unknown } | undefined)?.where;
  if (!where) return null;

  const delegateName = lowerFirst(model);
  const delegate = (client as unknown as Record<string, any>)[delegateName];

  if (!delegate?.findUnique) return null;

  try {
    return await delegate.findUnique({ where });
  } catch {
    return null;
  }
};

// --- RLS UTILS ---
const extractHospitalId = (value: unknown): string | undefined => {
  if (!value || typeof value !== 'object') return undefined;
  const raw = (value as any).hospitalId;
  if (typeof raw === 'string') return raw;
  if (raw && typeof raw === 'object' && typeof (raw as any).set === 'string') {
    return (raw as any).set as string;
  }
  return undefined;
};

const enforceTenantInData = (value: unknown, normalizedModel: string, hospitalId: string, isUpdate = false): void => {
  if (!TENANT_MODELS.has(normalizedModel) || !value || typeof value !== 'object') return;
  const data = value as any;
  const existingHospitalId = extractHospitalId(data);
  if (existingHospitalId && existingHospitalId !== hospitalId) {
    throw new Error('Cross-tenant write blocked by RLS middleware');
  }
  if (!existingHospitalId && !isUpdate) data.hospitalId = hospitalId;
};

const appendTenantWhere = (args: any, normalizedModel: string, hospitalId: string, operation?: string): void => {
  const tenantWhere = getTenantFilter(normalizedModel, hospitalId);
  const existingWhere = args.where;
  if (!existingWhere) {
    args.where = tenantWhere;
    return;
  }
  if (operation && ['update', 'delete', 'upsert', 'findUnique', 'findUniqueOrThrow'].includes(operation)) {
    args.where = { ...existingWhere, ...tenantWhere };
  } else {
    args.where = { AND: [existingWhere, tenantWhere] };
  }
};

// --- SENSITIVE DATA HASHING ---
const hashField = (data: any, fieldName: string): void => {
  const currentValue = data[fieldName];
  if (typeof currentValue === 'string') {
    data[fieldName] = hashSensitiveValue(currentValue);
  } else if (currentValue && typeof currentValue === 'object' && 'set' in currentValue && typeof (currentValue as any).set === 'string') {
    data[fieldName] = { ...currentValue, set: hashSensitiveValue((currentValue as any).set) };
  }
};

const hashHospitalData = (data: any) => {
  if (!data || typeof data !== 'object') return data;
  hashField(data, 'licenseNo');
  hashField(data, 'gstin');
  return data;
};

// --- MAIN FACTORY ---
export const createUnifiedPrismaClient = (): PrismaClient => {
  const baseClient = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

  return baseClient.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const mutableArgs = (args ?? {}) as any;
          const normalizedModel = normalizeModelName(model);
          const context = getRequestContext();
          const hospitalId = context?.hospitalId;

          // 1. Sensitive Data Hashing (Admin operations)
          if (normalizedModel === 'hospital' && ['create', 'update', 'upsert'].includes(operation)) {
            if (operation === 'create' || operation === 'update') {
              mutableArgs.data = hashHospitalData(mutableArgs.data);
            } else if (operation === 'upsert') {
              mutableArgs.create = hashHospitalData(mutableArgs.create);
              mutableArgs.update = hashHospitalData(mutableArgs.update);
            }
          }

          // 2. Pre-Query RLS Enforcements (Tenant Isolation)
          if (normalizedModel && hospitalId && isRlsModel(normalizedModel)) {
            if (['create', 'update'].includes(operation)) {
              enforceTenantInData(mutableArgs.data, normalizedModel, hospitalId, operation === 'update');
            } else if (operation === 'createMany') {
              if (Array.isArray(mutableArgs.data)) {
                for (const row of mutableArgs.data) enforceTenantInData(row, normalizedModel, hospitalId);
              } else {
                enforceTenantInData(mutableArgs.data, normalizedModel, hospitalId);
              }
            } else if (operation === 'upsert') {
              enforceTenantInData(mutableArgs.create, normalizedModel, hospitalId);
              enforceTenantInData(mutableArgs.update, normalizedModel, hospitalId, true);
            }

            if (FILTERABLE_OPERATIONS.has(operation)) {
              appendTenantWhere(mutableArgs, normalizedModel, hospitalId, operation);
            }
          }

          // 3. Pre-Query Auditing (Fetch Old Data)
          let oldData: any = null;
          if (model && model !== 'AuditLog' && (operation === 'update' || operation === 'delete')) {
            oldData = await getOldData(baseClient, model, mutableArgs);
          }

          // 4. Execute Query
          const result = await query(mutableArgs);

          // 5. Post-Query Auditing
          if (model && model !== 'AuditLog' && AUDITED_OPERATIONS.has(operation)) {
            const hId = hospitalId ?? (model === 'Hospital' ? getEntityId(mutableArgs, result, oldData) : (result as any)?.hospitalId ?? (oldData as any)?.hospitalId);
            
            if (hId) {
              const uId = context?.userId ?? (result as any)?.userId ?? (oldData as any)?.userId ?? null;
              const entityId = getEntityId(mutableArgs, result, oldData);
              const actor = context?.actor ?? uId ?? 'system';
              
              const changesJson = buildChangesJson(
                operation,
                operation === 'update' || operation === 'delete' ? oldData : null,
                operation === 'create' || operation === 'update' ? result : null
              );

              // Use baseClient to avoid recursion
              await baseClient.auditLog.create({
                data: {
                  hospitalId: hId,
                  userId: uId,
                  actor,
                  entityType: model,
                  entityId,
                  changesJson,
                  consentVersion: context?.consentVersion ?? null,
                  purpose: context?.purpose ?? getStringProp(mutableArgs.data, 'purpose') ?? getStringProp(result, 'purpose') ?? getStringProp(oldData, 'purpose'),
                  retentionPolicy: context?.retentionPolicy ?? null,
                  timestamp: new Date(),
                  ipAddress: context?.ipAddress ?? null,
                  userAgent: context?.userAgent ?? null,
                },
              });
            }
          }

          // 6. Post-Query RLS Filtering (Double-check)
          if (normalizedModel && hospitalId && isRlsModel(normalizedModel) && DATA_READ_OPERATIONS.has(operation) && result && typeof result === 'object') {
            if (Array.isArray(result)) {
              return result.filter(item => {
                if (!item || typeof item !== 'object') return true;
                if (normalizedModel === 'hospital') return (item as any).id === hospitalId;
                if (!(item as any).hospitalId) {
                  console.warn(`[RLS Warning] Tenant-scoped record missing hospitalId in model ${normalizedModel}. Item ID: ${(item as any).id}`);
                  return false;
                }
                return (item as any).hospitalId === hospitalId;
              });
            } else {
              const res = result as any;
              const hIdMatch = normalizedModel === 'hospital' ? res.id === hospitalId : (res.hospitalId === hospitalId);
              if (!hIdMatch) {
                if (operation === 'findUniqueOrThrow' || operation === 'findFirstOrThrow') {
                  throw new Error('Record not found in tenant scope');
                }
                return null;
              }
            }
          }

          return result;
        },
      },
    },
  }) as PrismaClient;
};

export const prisma = globalForPrisma.prisma ?? createUnifiedPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
