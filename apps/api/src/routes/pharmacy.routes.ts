import { Prisma } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { Router } from 'express';
import { getRequestContext } from '../context/requestContext.js';
import { AuthError, NotFoundError, ValidationError } from '../errors/customErrors.js';
import { authenticate, type AuthenticatedRequest } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { prisma } from '../prisma/client.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { redisSchema } from '../utils/redis-schema.js';

const PHARMACY_CACHE_TTL = 60 * 10; // 10 minutes

const router = Router();
const DECIMAL_PRECISION = 2;
type MedicineScheduleValue = 'OTC' | 'H' | 'H1' | 'X' | 'NARCOTIC';

type MedicineEntity = {
  id: string;
  code: string;
  name: string;
  genericName: string | null;
  manufacturer: string | null;
  hsnCode: string;
  gstRate: string | Prisma.Decimal;
  unitPrice: string | Prisma.Decimal;
  scheduleCategory: MedicineScheduleValue;
  isActive: boolean;
  hospitalId: string;
  createdAt: Date;
  updatedAt: Date;
};

type StockBatchEntity = {
  id: string;
  batchNo: string;
  vendorName: string | null;
  expiryDate: Date;
  receivedQty: number;
  availableQty: number;
  purchasePrice: string | Prisma.Decimal | null;
  mrp: string | Prisma.Decimal;
  receivedAt: Date;
  notes: string | null;
  isActive: boolean;
  hospitalId: string;
  medicineId: string;
  createdAt: Date;
  updatedAt: Date;
};

type DispenseRecordEntity = {
  id: string;
  quantity: number;
  unitPrice: string | Prisma.Decimal;
  gstRate: string | Prisma.Decimal;
  totalAmount: string | Prisma.Decimal;
  dispensedAt: Date;
  notes: string | null;
  hospitalId: string;
  patientId: string;
  prescriptionId: string;
  medicineId: string;
  stockBatchId: string;
  dispensedById: string | null;
  createdAt: Date;
  updatedAt: Date;
  patient: {
    id: string;
    mrn: string;
    name: string;
  };
  medicine: {
    id: string;
    code: string;
    name: string;
  };
  stockBatch: {
    id: string;
    batchNo: string;
    expiryDate: Date;
  };
};

type PrescriptionRefEntity = {
  id: string;
  hospitalId: string;
  visit: {
    id: string;
    patientId: string;
  };
};

type PharmacyTxClient = {
  prescription: {
    findFirst: (args: unknown) => Promise<PrescriptionRefEntity | null>;
  };
  medicine: {
    findFirst: (args: unknown) => Promise<MedicineEntity | null>;
  };
  stockBatch: {
    findFirst: (args: unknown) => Promise<StockBatchEntity | null>;
    update: (args: unknown) => Promise<StockBatchEntity>;
  };
  dispenseRecord: {
    create: (args: unknown) => Promise<DispenseRecordEntity>;
  };
};

const pharmacyPrisma = prisma as unknown as {
  medicine: {
    findMany: (args: unknown) => Promise<MedicineEntity[]>;
    findFirst: (args: unknown) => Promise<MedicineEntity | null>;
    create: (args: unknown) => Promise<MedicineEntity>;
    update: (args: unknown) => Promise<MedicineEntity>;
  };
  stockBatch: {
    findMany: (args: unknown) => Promise<StockBatchEntity[]>;
    findFirst: (args: unknown) => Promise<StockBatchEntity | null>;
    create: (args: unknown) => Promise<StockBatchEntity>;
    update: (args: unknown) => Promise<StockBatchEntity>;
  };
  dispenseRecord: {
    create: (args: unknown) => Promise<DispenseRecordEntity>;
  };
  prescription: {
    findFirst: (args: unknown) => Promise<PrescriptionRefEntity | null>;
  };
  auditLog: typeof prisma.auditLog;
  $transaction: <T>(callback: (tx: PharmacyTxClient) => Promise<T>) => Promise<T>;
};

class CreateMedicineRequestDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  code?: string;

  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  genericName?: string;

  @IsOptional()
  @IsString()
  manufacturer?: string;

  @Transform(({ value }) => (value === undefined || value === null ? value : String(value)))
  @IsString()
  @MinLength(4)
  hsnCode!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  gstRate?: number;

  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @IsOptional()
  @IsIn(['OTC', 'H', 'H1', 'X', 'NARCOTIC'])
  scheduleCategory?: 'OTC' | 'H' | 'H1' | 'X' | 'NARCOTIC';

  @IsOptional()
  @IsIn(['OTC', 'H', 'H1', 'X', 'NARCOTIC'])
  schedule?: 'OTC' | 'H' | 'H1' | 'X' | 'NARCOTIC';

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  hospitalId?: string;
}

class UpdateMedicineRequestDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  code?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  genericName?: string;

  @IsOptional()
  @IsString()
  manufacturer?: string;

  @IsOptional()
  @Transform(({ value }) => (value === undefined || value === null ? value : String(value)))
  @IsString()
  @MinLength(4)
  hsnCode?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  gstRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @IsOptional()
  @IsIn(['OTC', 'H', 'H1', 'X', 'NARCOTIC'])
  scheduleCategory?: 'OTC' | 'H' | 'H1' | 'X' | 'NARCOTIC';

  @IsOptional()
  @IsIn(['OTC', 'H', 'H1', 'X', 'NARCOTIC'])
  schedule?: 'OTC' | 'H' | 'H1' | 'X' | 'NARCOTIC';

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  hospitalId?: string;
}

class CreateStockBatchRequestDto {
  @IsString()
  @MinLength(2)
  batchNo!: string;

  @IsOptional()
  @IsString()
  vendorName?: string;

  @IsDateString()
  expiryDate!: string;

  @IsInt()
  @Min(1)
  receivedQty!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  availableQty?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  purchasePrice?: number;

  @IsNumber()
  @Min(0)
  mrp!: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

class UpdateStockBatchRequestDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  batchNo?: string;

  @IsOptional()
  @IsString()
  vendorName?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  availableQty?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  purchasePrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  mrp?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

class DispenseRequestDto {
  @IsUUID()
  prescriptionId!: string;

  @IsUUID()
  medicineId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsUUID()
  stockBatchId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

const medicineSelect = {
  id: true,
  code: true,
  name: true,
  genericName: true,
  manufacturer: true,
  hsnCode: true,
  gstRate: true,
  unitPrice: true,
  scheduleCategory: true,
  isActive: true,
  hospitalId: true,
  createdAt: true,
  updatedAt: true,
} as const;

const stockBatchSelect = {
  id: true,
  batchNo: true,
  vendorName: true,
  expiryDate: true,
  receivedQty: true,
  availableQty: true,
  purchasePrice: true,
  mrp: true,
  receivedAt: true,
  notes: true,
  isActive: true,
  hospitalId: true,
  medicineId: true,
  createdAt: true,
  updatedAt: true,
} as const;

const dispenseSelect = {
  id: true,
  quantity: true,
  unitPrice: true,
  gstRate: true,
  totalAmount: true,
  dispensedAt: true,
  notes: true,
  hospitalId: true,
  patientId: true,
  prescriptionId: true,
  medicineId: true,
  stockBatchId: true,
  dispensedById: true,
  createdAt: true,
  updatedAt: true,
  patient: {
    select: {
      id: true,
      mrn: true,
      name: true,
    },
  },
  medicine: {
    select: {
      id: true,
      code: true,
      name: true,
    },
  },
  stockBatch: {
    select: {
      id: true,
      batchNo: true,
      expiryDate: true,
    },
  },
} as const;

const getHospitalAndUser = (req: AuthenticatedRequest): { hospitalId: string; userId: string } => {
  const hospitalId = req.user?.hospitalId;
  const userId = req.user?.userId;
  if (!hospitalId || !userId) {
    throw new AuthError('Unauthorized');
  }
  return { hospitalId, userId };
};

const toDecimal = (value: number | string | Prisma.Decimal): Prisma.Decimal => new Prisma.Decimal(value);

const decimalRound = (value: Prisma.Decimal): Prisma.Decimal =>
  value.toDecimalPlaces(DECIMAL_PRECISION, Prisma.Decimal.ROUND_HALF_UP);

const parseDateParam = (value: string, paramName: string): Date => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new ValidationError(`${paramName} must be a valid ISO date`);
  }
  return parsed;
};

const resolveScheduleCategory = (values: {
  scheduleCategory?: MedicineScheduleValue;
  schedule?: MedicineScheduleValue;
}): MedicineScheduleValue => {
  if (values.scheduleCategory && values.schedule && values.scheduleCategory !== values.schedule) {
    throw new ValidationError('schedule and scheduleCategory must match when both are provided');
  }
  return values.scheduleCategory ?? values.schedule ?? 'OTC';
};

const generateMedicineCode = (name: string): string => {
  const prefix = name
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6);
  const stamp = Date.now().toString().slice(-6);
  const random = Math.floor(10 + Math.random() * 90).toString();
  return `${prefix || 'MED'}-${stamp}${random}`;
};

const getExpiryFloor = (): Date => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
};

const toJsonValue = (value: unknown): Prisma.InputJsonValue =>
  JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;

const logAudit = async ({
  req,
  hospitalId,
  userId,
  entityType,
  entityId,
  operation,
  before,
  after,
}: {
  req: AuthenticatedRequest;
  hospitalId: string;
  userId: string;
  entityType: 'Medicine' | 'StockBatch' | 'DispenseRecord';
  entityId: string;
  operation: string;
  before: unknown;
  after: unknown;
}): Promise<void> => {
  const context = getRequestContext();
  await pharmacyPrisma.auditLog.create({
    data: {
      hospitalId,
      userId,
      actor: context?.actor ?? userId,
      entityType,
      entityId,
      changesJson: toJsonValue({ operation, before, after }),
      consentVersion: context?.consentVersion ?? req.header('x-consent-version') ?? null,
      purpose: context?.purpose ?? req.header('x-purpose') ?? 'Pharmacy operations',
      retentionPolicy: context?.retentionPolicy ?? req.header('x-retention-policy') ?? null,
      ipAddress: context?.ipAddress ?? req.ip ?? null,
      userAgent: context?.userAgent ?? req.get('user-agent') ?? null,
      timestamp: new Date(),
    },
  });
};

router.get(
  '/medicines',
  authenticate,
  authorize('ADMIN', 'PHARMACIST', 'RECEPTIONIST', 'DOCTOR'),
  asyncHandler(async (req, res) => {
    const { hospitalId } = getHospitalAndUser(req as AuthenticatedRequest);
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const schedule = typeof req.query.schedule === 'string' ? req.query.schedule.toUpperCase() : undefined;
    const isActiveQuery = typeof req.query.isActive === 'string' ? req.query.isActive : undefined;
    const isActive =
      isActiveQuery === undefined ? undefined : isActiveQuery.toLowerCase() === 'true' ? true : isActiveQuery.toLowerCase() === 'false' ? false : undefined;

    const cache = redisSchema(hospitalId, 'pharmacy');
    const cacheKey = `medicines:list:${search || 'all'}:${schedule || 'any'}:${isActive ?? 'all'}`;

    const cached = await cache.getJson<typeof medicineSelect[]>(cacheKey);
    if (cached) {
      return res.status(200).json({ medicines: cached, fromCache: true });
    }

    const medicines = await pharmacyPrisma.medicine.findMany({
      where: {
        hospitalId,
        ...(schedule ? { scheduleCategory: schedule as 'OTC' | 'H' | 'H1' | 'X' | 'NARCOTIC' } : {}),
        ...(typeof isActive === 'boolean' ? { isActive } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { genericName: { contains: search, mode: 'insensitive' } },
                { code: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { name: 'asc' },
      select: medicineSelect,
    });

    await cache.setJson(cacheKey, medicines, PHARMACY_CACHE_TTL);

    res.status(200).json({ medicines, fromCache: false });
  })
);

router.post(
  '/medicines',
  authenticate,
  authorize('ADMIN', 'PHARMACIST'),
  validateRequest(CreateMedicineRequestDto),
  asyncHandler(async (req, res) => {
    const { hospitalId, userId } = getHospitalAndUser(req as AuthenticatedRequest);
    const body = req.body as CreateMedicineRequestDto;
    const scheduleCategory = resolveScheduleCategory({
      scheduleCategory: body.scheduleCategory,
      schedule: body.schedule,
    });

    const medicine = await pharmacyPrisma.medicine.create({
      data: {
        hospitalId,
        code: body.code?.trim() || generateMedicineCode(body.name),
        name: body.name.trim(),
        genericName: body.genericName?.trim() || null,
        manufacturer: body.manufacturer?.trim() || null,
        hsnCode: String(body.hsnCode).trim(),
        gstRate: decimalRound(toDecimal(body.gstRate ?? 0)),
        unitPrice: decimalRound(toDecimal(body.unitPrice)),
        scheduleCategory,
        isActive: body.isActive ?? true,
      },
      select: medicineSelect,
    });

    await logAudit({
      req: req as AuthenticatedRequest,
      hospitalId,
      userId,
      entityType: 'Medicine',
      entityId: medicine.id,
      operation: 'create',
      before: null,
      after: medicine,
    });

    const cache = redisSchema(hospitalId, 'pharmacy');
    await cache.clear();

    res.status(201).json({ success: true, message: 'Medicine created successfully', medicine });
  })
);

router.get(
  '/medicines/:id',
  authenticate,
  authorize('ADMIN', 'PHARMACIST', 'RECEPTIONIST', 'DOCTOR'),
  asyncHandler(async (req, res) => {
    const { hospitalId } = getHospitalAndUser(req as AuthenticatedRequest);
    const id = req.params.id;
    const medicine = await pharmacyPrisma.medicine.findFirst({
      where: { id, hospitalId },
      select: medicineSelect,
    });
    if (!medicine) {
      throw new NotFoundError('Medicine not found');
    }
    res.status(200).json({ medicine });
  })
);

router.patch(
  '/medicines/:id',
  authenticate,
  authorize('ADMIN', 'PHARMACIST'),
  validateRequest(UpdateMedicineRequestDto),
  asyncHandler(async (req, res) => {
    const { hospitalId, userId } = getHospitalAndUser(req as AuthenticatedRequest);
    const id = req.params.id;
    const body = req.body as UpdateMedicineRequestDto;
    const scheduleCategory =
      body.scheduleCategory !== undefined || body.schedule !== undefined
        ? resolveScheduleCategory({
            scheduleCategory: body.scheduleCategory,
            schedule: body.schedule,
          })
        : undefined;

    const existing = await pharmacyPrisma.medicine.findFirst({
      where: { id, hospitalId },
      select: medicineSelect,
    });
    if (!existing) {
      throw new NotFoundError('Medicine not found');
    }

    const medicine = await pharmacyPrisma.medicine.update({
      where: { id },
      data: {
        ...(body.code !== undefined ? { code: body.code.trim() } : {}),
        ...(body.name !== undefined ? { name: body.name.trim() } : {}),
        ...(body.genericName !== undefined ? { genericName: body.genericName.trim() || null } : {}),
        ...(body.manufacturer !== undefined ? { manufacturer: body.manufacturer.trim() || null } : {}),
        ...(body.hsnCode !== undefined ? { hsnCode: String(body.hsnCode).trim() } : {}),
        ...(body.gstRate !== undefined ? { gstRate: decimalRound(toDecimal(body.gstRate)) } : {}),
        ...(body.unitPrice !== undefined ? { unitPrice: decimalRound(toDecimal(body.unitPrice)) } : {}),
        ...(scheduleCategory !== undefined ? { scheduleCategory } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      },
      select: medicineSelect,
    });

    await logAudit({
      req: req as AuthenticatedRequest,
      hospitalId,
      userId,
      entityType: 'Medicine',
      entityId: medicine.id,
      operation: 'update',
      before: existing,
      after: medicine,
    });

    const cache = redisSchema(hospitalId, 'pharmacy');
    await cache.clear();

    res.status(200).json({ success: true, message: 'Medicine updated successfully', medicine });
  })
);

router.delete(
  '/medicines/:id',
  authenticate,
  authorize('ADMIN', 'PHARMACIST'),
  asyncHandler(async (req, res) => {
    const { hospitalId, userId } = getHospitalAndUser(req as AuthenticatedRequest);
    const id = req.params.id;

    const existing = await pharmacyPrisma.medicine.findFirst({
      where: { id, hospitalId },
      select: medicineSelect,
    });
    if (!existing) {
      throw new NotFoundError('Medicine not found');
    }

    const medicine = await pharmacyPrisma.medicine.update({
      where: { id },
      data: { isActive: false },
      select: medicineSelect,
    });

    await logAudit({
      req: req as AuthenticatedRequest,
      hospitalId,
      userId,
      entityType: 'Medicine',
      entityId: medicine.id,
      operation: 'deactivate',
      before: existing,
      after: medicine,
    });

    const cache = redisSchema(hospitalId, 'pharmacy');
    await cache.clear();

    res.status(200).json({ success: true, message: 'Medicine deactivated successfully', medicine });
  })
);

router.get(
  '/medicines/:id/batches',
  authenticate,
  authorize('ADMIN', 'PHARMACIST', 'RECEPTIONIST', 'DOCTOR'),
  asyncHandler(async (req, res) => {
    const { hospitalId } = getHospitalAndUser(req as AuthenticatedRequest);
    const id = req.params.id;
    const includeExpired = typeof req.query.includeExpired === 'string' && req.query.includeExpired.toLowerCase() === 'true';
    const expiryFloor = getExpiryFloor();

    const cache = redisSchema(hospitalId, 'pharmacy');
    const cacheKey = `medicines:batches:${id}:${includeExpired}`;

    const cached = await cache.getJson<typeof stockBatchSelect[]>(cacheKey);
    if (cached) {
      return res.status(200).json({ batches: cached, fromCache: true });
    }

    const medicine = await pharmacyPrisma.medicine.findFirst({
      where: { id, hospitalId },
      select: { id: true },
    });
    if (!medicine) {
      throw new NotFoundError('Medicine not found');
    }

    const batches = await pharmacyPrisma.stockBatch.findMany({
      where: {
        hospitalId,
        medicineId: id,
        ...(includeExpired ? {} : { expiryDate: { gte: expiryFloor } }),
      },
      orderBy: [{ expiryDate: 'asc' }, { receivedAt: 'asc' }],
      select: stockBatchSelect,
    });

    await cache.setJson(cacheKey, batches, PHARMACY_CACHE_TTL);

    res.status(200).json({ batches, fromCache: false });
  })
);

router.post(
  '/medicines/:id/batches',
  authenticate,
  authorize('ADMIN', 'PHARMACIST'),
  validateRequest(CreateStockBatchRequestDto),
  asyncHandler(async (req, res) => {
    const { hospitalId, userId } = getHospitalAndUser(req as AuthenticatedRequest);
    const medicineId = req.params.id;
    const body = req.body as CreateStockBatchRequestDto;
    const expiryDate = parseDateParam(body.expiryDate, 'expiryDate');

    const medicine = await pharmacyPrisma.medicine.findFirst({
      where: { id: medicineId, hospitalId, isActive: true },
      select: { id: true },
    });
    if (!medicine) {
      throw new NotFoundError('Active medicine not found');
    }

    const availableQty = body.availableQty ?? body.receivedQty;
    if (availableQty > body.receivedQty) {
      throw new ValidationError('availableQty cannot exceed receivedQty');
    }

    const batch = await pharmacyPrisma.stockBatch.create({
      data: {
        hospitalId,
        medicineId,
        batchNo: body.batchNo.trim(),
        vendorName: body.vendorName?.trim() || null,
        expiryDate,
        receivedQty: body.receivedQty,
        availableQty,
        purchasePrice: body.purchasePrice !== undefined ? decimalRound(toDecimal(body.purchasePrice)) : null,
        mrp: decimalRound(toDecimal(body.mrp)),
        notes: body.notes?.trim() || null,
      },
      select: stockBatchSelect,
    });

    await logAudit({
      req: req as AuthenticatedRequest,
      hospitalId,
      userId,
      entityType: 'StockBatch',
      entityId: batch.id,
      operation: 'create',
      before: null,
      after: batch,
    });

    const cache = redisSchema(hospitalId, 'pharmacy');
    await cache.clear();

    res.status(201).json({ success: true, message: 'Stock batch created successfully', batch });
  })
);

router.patch(
  '/batches/:id',
  authenticate,
  authorize('ADMIN', 'PHARMACIST'),
  validateRequest(UpdateStockBatchRequestDto),
  asyncHandler(async (req, res) => {
    const { hospitalId, userId } = getHospitalAndUser(req as AuthenticatedRequest);
    const id = req.params.id;
    const body = req.body as UpdateStockBatchRequestDto;

    const existing = await pharmacyPrisma.stockBatch.findFirst({
      where: { id, hospitalId },
      select: stockBatchSelect,
    });
    if (!existing) {
      throw new NotFoundError('Stock batch not found');
    }

    if (body.availableQty !== undefined && body.availableQty > existing.receivedQty) {
      throw new ValidationError('availableQty cannot exceed receivedQty');
    }

    const batch = await pharmacyPrisma.stockBatch.update({
      where: { id },
      data: {
        ...(body.batchNo !== undefined ? { batchNo: body.batchNo.trim() } : {}),
        ...(body.vendorName !== undefined ? { vendorName: body.vendorName.trim() || null } : {}),
        ...(body.expiryDate !== undefined ? { expiryDate: parseDateParam(body.expiryDate, 'expiryDate') } : {}),
        ...(body.availableQty !== undefined ? { availableQty: body.availableQty } : {}),
        ...(body.purchasePrice !== undefined ? { purchasePrice: decimalRound(toDecimal(body.purchasePrice)) } : {}),
        ...(body.mrp !== undefined ? { mrp: decimalRound(toDecimal(body.mrp)) } : {}),
        ...(body.notes !== undefined ? { notes: body.notes.trim() || null } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      },
      select: stockBatchSelect,
    });

    await logAudit({
      req: req as AuthenticatedRequest,
      hospitalId,
      userId,
      entityType: 'StockBatch',
      entityId: batch.id,
      operation: 'update',
      before: existing,
      after: batch,
    });

    res.status(200).json({ success: true, message: 'Stock batch updated successfully', batch });
  })
);

router.post(
  '/dispense',
  authenticate,
  authorize('ADMIN', 'PHARMACIST'),
  validateRequest(DispenseRequestDto),
  asyncHandler(async (req, res) => {
    const { hospitalId, userId } = getHospitalAndUser(req as AuthenticatedRequest);
    const body = req.body as DispenseRequestDto;
    const expiryFloor = getExpiryFloor();

    const result = await pharmacyPrisma.$transaction(async (tx) => {
      const prescription = await tx.prescription.findFirst({
        where: {
          id: body.prescriptionId,
          hospitalId,
        },
        select: {
          id: true,
          hospitalId: true,
          visit: {
            select: {
              id: true,
              patientId: true,
            },
          },
        },
      });
      if (!prescription) {
        throw new NotFoundError('Prescription not found');
      }

      const medicine = await tx.medicine.findFirst({
        where: {
          id: body.medicineId,
          hospitalId,
          isActive: true,
        },
        select: medicineSelect,
      });
      if (!medicine) {
        throw new NotFoundError('Active medicine not found');
      }

      const batch = await tx.stockBatch.findFirst({
        where: {
          hospitalId,
          medicineId: medicine.id,
          isActive: true,
          expiryDate: { gte: expiryFloor },
          ...(body.stockBatchId ? { id: body.stockBatchId } : {}),
        },
        orderBy: body.stockBatchId ? undefined : [{ expiryDate: 'asc' }, { receivedAt: 'asc' }],
        select: stockBatchSelect,
      });
      if (!batch) {
        throw new ValidationError('No valid non-expired stock batch available');
      }

      if (batch.availableQty < body.quantity) {
        throw new ValidationError('Insufficient stock in selected batch');
      }

      const unitPrice = decimalRound(toDecimal(medicine.unitPrice));
      const gstRate = decimalRound(toDecimal(medicine.gstRate));
      const subtotal = decimalRound(unitPrice.mul(body.quantity));
      const gstAmount = decimalRound(subtotal.mul(gstRate).div(100));
      const totalAmount = decimalRound(subtotal.plus(gstAmount));

      const updatedBatch = await tx.stockBatch.update({
        where: { id: batch.id },
        data: {
          availableQty: {
            decrement: body.quantity,
          },
        },
        select: stockBatchSelect,
      });

      const dispenseRecord = await tx.dispenseRecord.create({
        data: {
          hospitalId,
          patientId: prescription.visit.patientId,
          prescriptionId: prescription.id,
          medicineId: medicine.id,
          stockBatchId: batch.id,
          dispensedById: userId,
          quantity: body.quantity,
          unitPrice,
          gstRate,
          totalAmount,
          notes: body.notes?.trim() || null,
        },
        select: dispenseSelect,
      });

      return {
        dispenseRecord,
        beforeBatch: batch,
        updatedBatch,
      };
    });

    await Promise.all([
      logAudit({
        req: req as AuthenticatedRequest,
        hospitalId,
        userId,
        entityType: 'DispenseRecord',
        entityId: result.dispenseRecord.id,
        operation: 'dispense',
        before: null,
        after: result.dispenseRecord,
      }),
      logAudit({
        req: req as AuthenticatedRequest,
        hospitalId,
        userId,
        entityType: 'StockBatch',
        entityId: result.updatedBatch.id,
        operation: 'stock_decrement_after_dispense',
        before: {
          availableQty: result.beforeBatch.availableQty,
        },
        after: {
          availableQty: result.updatedBatch.availableQty,
        },
      }),
    ]);

    res.status(201).json({
      success: true,
      message: 'Medicine dispensed successfully',
      dispenseRecord: result.dispenseRecord,
      stockBatch: result.updatedBatch,
    });
  })
);

export { router as pharmacyRouter };
