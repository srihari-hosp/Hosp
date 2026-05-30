import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { IsDateString, IsIn, IsOptional, IsString, IsUUID, MinLength, IsNumber, Min } from 'class-validator';
import { Prisma } from '@prisma/client';
import { Router } from 'express';
import { getRequestContext } from '../context/requestContext.js';
import { AppError } from '../errors/AppError.js';
import { AuthError, NotFoundError, ValidationError } from '../errors/customErrors.js';
import { authenticate, type AuthenticatedRequest } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { prisma } from '../prisma/client.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

const LAB_ORDER_PRIORITIES = ['ROUTINE', 'URGENT', 'STAT'] as const;
const LAB_RESULT_STATUSES = ['DRAFT', 'FINAL', 'CORRECTED'] as const;

type LabOrderPriority = (typeof LAB_ORDER_PRIORITIES)[number];
type LabResultStatus = (typeof LAB_RESULT_STATUSES)[number];

type LabOrderRecord = {
  id: string;
  orderNumber: string;
  priority: string;
  status: string;
  notes: string | null;
  clinicalNotes: string | null;
  orderedAt: Date;
  collectedAt: Date | null;
  completedAt: Date | null;
  hospitalId: string;
  patientId: string;
  doctorId: string;
  visitId: string | null;
  labTestId: string;
  createdAt: Date;
  updatedAt: Date;
  patient?: {
    id: string;
    mrn: string;
    name: string;
    age: number;
    gender: string;
  };
  doctor?: {
    id: string;
    name: string;
    specialization: string | null;
  };
  labTest?: {
    id: string;
    code: string;
    name: string;
    category: string | null;
    sampleType: string | null;
    defaultUnit: string | null;
    referenceRange: string | null;
    instructions: string | null;
  };
  result?: LabResultRecord | null;
};

type LabResultRecord = {
  id: string;
  status: string;
  resultValue: string | null;
  unit: string | null;
  referenceRange: string | null;
  interpretation: string | null;
  remarks: string | null;
  observedAt: Date | null;
  reportedAt: Date | null;
  verifiedAt: Date | null;
  hospitalId: string;
  labOrderId: string;
  patientId: string;
  labTestId: string;
  recordedById: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type LabTxClient = {
  patient: {
    findFirst: (args: unknown) => Promise<{ id: string } | null>;
  };
  doctor: {
    findFirst: (args: unknown) => Promise<{ id: string } | null>;
  };
  visit: {
    findFirst: (args: unknown) => Promise<{ id: string } | null>;
  };
  labTest: {
    findFirst: (args: unknown) => Promise<{ id: string; defaultUnit: string | null; referenceRange: string | null } | null>;
    create: (args: unknown) => Promise<unknown>;
  };
  labOrder: {
    create: (args: unknown) => Promise<LabOrderRecord>;
    findFirst: (args: unknown) => Promise<LabOrderRecord | null>;
    findMany: (args: unknown) => Promise<LabOrderRecord[]>;
    update: (args: unknown) => Promise<LabOrderRecord>;
  };
  labResult: {
    findFirst: (args: unknown) => Promise<LabResultRecord | null>;
    upsert: (args: unknown) => Promise<LabResultRecord>;
  };
};

const labPrisma = prisma as unknown as {
  patient: {
    findFirst: (args: unknown) => Promise<{ id: string } | null>;
  };
  doctor: {
    findFirst: (args: unknown) => Promise<{ id: string } | null>;
  };
  visit: {
    findFirst: (args: unknown) => Promise<{ id: string } | null>;
  };
  labTest: {
    findFirst: (args: unknown) => Promise<{ id: string; defaultUnit: string | null; referenceRange: string | null } | null>;
    findMany: (args: unknown) => Promise<unknown[]>;
    create: (args: unknown) => Promise<unknown>;
  };
  labOrder: {
    create: (args: unknown) => Promise<LabOrderRecord>;
    findFirst: (args: unknown) => Promise<LabOrderRecord | null>;
    findMany: (args: unknown) => Promise<LabOrderRecord[]>;
    update: (args: unknown) => Promise<LabOrderRecord>;
  };
  labResult: {
    findFirst: (args: unknown) => Promise<LabResultRecord | null>;
    upsert: (args: unknown) => Promise<LabResultRecord>;
  };
  auditLog: typeof prisma.auditLog;
  $transaction: <T>(callback: (tx: LabTxClient) => Promise<T>) => Promise<T>;
};

class CreateLabOrderRequestDto {
  @IsUUID()
  patientId!: string;

  @IsUUID()
  doctorId!: string;

  @IsUUID()
  labTestId!: string;

  @IsOptional()
  @IsUUID()
  visitId?: string;

  @IsOptional()
  @IsIn([...LAB_ORDER_PRIORITIES])
  priority?: LabOrderPriority;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  clinicalNotes?: string;
}

class CreateLabTestRequestDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  @MinLength(2)
  code!: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  sampleType?: string;

  @IsOptional()
  @IsString()
  defaultUnit?: string;

  @IsOptional()
  @IsString()
  referenceRange?: string;

  @IsOptional()
  @IsString()
  instructions?: string;

  // Compatibility alias for Postman payloads.
  @IsOptional()
  @IsString()
  description?: string;

  // Accepted for compatibility; currently not persisted in LabTest model.
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;
}

class UpdateLabResultRequestDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  resultValue?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsString()
  referenceRange?: string;

  @IsOptional()
  @IsString()
  interpretation?: string;

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsOptional()
  @IsIn([...LAB_RESULT_STATUSES])
  status?: LabResultStatus;

  @IsOptional()
  @IsDateString()
  observedAt?: string;

  @IsOptional()
  @IsDateString()
  reportedAt?: string;

  @IsOptional()
  @IsDateString()
  verifiedAt?: string;

  @IsOptional()
  @IsDateString()
  collectedAt?: string;
}

const labResultSelect = {
  id: true,
  status: true,
  resultValue: true,
  unit: true,
  referenceRange: true,
  interpretation: true,
  remarks: true,
  observedAt: true,
  reportedAt: true,
  verifiedAt: true,
  hospitalId: true,
  labOrderId: true,
  patientId: true,
  labTestId: true,
  recordedById: true,
  createdAt: true,
  updatedAt: true,
} as const;

const labOrderSelect = {
  id: true,
  orderNumber: true,
  priority: true,
  status: true,
  notes: true,
  clinicalNotes: true,
  orderedAt: true,
  collectedAt: true,
  completedAt: true,
  hospitalId: true,
  patientId: true,
  doctorId: true,
  visitId: true,
  labTestId: true,
  createdAt: true,
  updatedAt: true,
  patient: {
    select: {
      id: true,
      mrn: true,
      name: true,
      age: true,
      gender: true,
    },
  },
  doctor: {
    select: {
      id: true,
      name: true,
      specialization: true,
    },
  },
  labTest: {
    select: {
      id: true,
      code: true,
      name: true,
      category: true,
      sampleType: true,
      defaultUnit: true,
      referenceRange: true,
      instructions: true,
    },
  },
  result: {
    select: labResultSelect,
  },
} as const;

const labTestSelect = {
  id: true,
  code: true,
  name: true,
  category: true,
  sampleType: true,
  defaultUnit: true,
  referenceRange: true,
  instructions: true,
  isActive: true,
  hospitalId: true,
  createdAt: true,
  updatedAt: true,
} as const;

const getHospitalAndUser = (req: AuthenticatedRequest): { hospitalId: string; userId: string } => {
  const hospitalId = req.user?.hospitalId;
  const userId = req.user?.userId;
  if (!hospitalId || !userId) {
    throw new AuthError('Unauthorized');
  }
  return { hospitalId, userId };
};

const ensureLabPrismaDelegates = (): void => {
  const client = labPrisma as unknown as Record<string, unknown>;
  const missing = ['labTest', 'labOrder', 'labResult'].filter((key) => {
    const delegate = client[key];
    return !delegate || typeof delegate !== 'object';
  });

  if (missing.length > 0) {
    throw new AppError(
      'Lab module backend is not ready. Run Prisma migration + generate for the API and restart the server.',
      503,
      { missingDelegates: missing }
    );
  }
};

const toJsonValue = (value: unknown): Prisma.InputJsonValue =>
  JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;

const parseDateParam = (value: string, field: string): Date => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new ValidationError(`${field} must be a valid ISO date`);
  }
  return parsed;
};

const generateLabOrderNumber = (): string => {
  const now = new Date();
  const stamp = [
    now.getUTCFullYear(),
    String(now.getUTCMonth() + 1).padStart(2, '0'),
    String(now.getUTCDate()).padStart(2, '0'),
  ].join('');
  const time = [
    String(now.getUTCHours()).padStart(2, '0'),
    String(now.getUTCMinutes()).padStart(2, '0'),
    String(now.getUTCSeconds()).padStart(2, '0'),
  ].join('');
  const random = Math.floor(100 + Math.random() * 900);
  return `LAB-${stamp}-${time}-${random}`;
};

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
  entityType: 'LabTest' | 'LabOrder' | 'LabResult' | 'LabReport';
  entityId: string;
  operation: string;
  before: unknown;
  after: unknown;
}) => {
  const context = getRequestContext();

  await labPrisma.auditLog.create({
    data: {
      hospitalId,
      userId,
      actor: context?.actor ?? userId,
      entityType,
      entityId,
      changesJson: toJsonValue({ operation, before, after }),
      consentVersion: context?.consentVersion ?? req.header('x-consent-version') ?? null,
      purpose: context?.purpose ?? req.header('x-purpose') ?? 'Lab operations',
      retentionPolicy: context?.retentionPolicy ?? req.header('x-retention-policy') ?? null,
      ipAddress: context?.ipAddress ?? req.ip ?? null,
      userAgent: context?.userAgent ?? req.get('user-agent') ?? null,
      timestamp: new Date(),
    },
  });
};

const createLabReportPdfBuffer = async (order: LabOrderRecord): Promise<Uint8Array> => {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let y = 790;
  const line = (text: string, options?: { x?: number; size?: number; bold?: boolean; color?: [number, number, number] }) => {
    page.drawText(text, {
      x: options?.x ?? 40,
      y,
      size: options?.size ?? 11,
      font: options?.bold ? bold : font,
      color: options?.color ? rgb(options.color[0], options.color[1], options.color[2]) : rgb(0.12, 0.15, 0.2),
    });
    y -= (options?.size ?? 11) + 6;
  };

  page.drawRectangle({
    x: 30,
    y: 30,
    width: 535.28,
    height: 781.89,
    borderColor: rgb(0.8, 0.84, 0.9),
    borderWidth: 1,
  });

  line('Laboratory Report', { size: 20, bold: true });
  line(`Order No: ${order.orderNumber}`, { bold: true });
  line(`Ordered At: ${order.orderedAt.toISOString()}`);
  line(`Status: ${order.status}`);
  y -= 8;
  line('Patient', { size: 13, bold: true });
  line(`Name: ${order.patient?.name ?? '-'}`);
  line(`MRN: ${order.patient?.mrn ?? '-'}`);
  line(`Age/Gender: ${order.patient ? `${order.patient.age} / ${order.patient.gender}` : '-'}`);
  y -= 8;
  line('Ordering Doctor', { size: 13, bold: true });
  line(`Name: ${order.doctor?.name ?? '-'}`);
  line(`Specialization: ${order.doctor?.specialization ?? '-'}`);
  y -= 8;
  line('Test Details', { size: 13, bold: true });
  line(`Test: ${order.labTest?.name ?? '-'}`);
  line(`Code: ${order.labTest?.code ?? '-'}`);
  line(`Sample Type: ${order.labTest?.sampleType ?? '-'}`);
  line(`Priority: ${order.priority}`);
  if (order.clinicalNotes) {
    line(`Clinical Notes: ${order.clinicalNotes}`);
  }
  y -= 8;
  line('Result', { size: 13, bold: true });
  line(`Result Value: ${order.result?.resultValue ?? '-'}`);
  line(`Unit: ${order.result?.unit ?? order.labTest?.defaultUnit ?? '-'}`);
  line(`Reference Range: ${order.result?.referenceRange ?? order.labTest?.referenceRange ?? '-'}`);
  line(`Interpretation: ${order.result?.interpretation ?? '-'}`);
  line(`Observed At: ${order.result?.observedAt ? order.result.observedAt.toISOString() : '-'}`);
  line(`Reported At: ${order.result?.reportedAt ? order.result.reportedAt.toISOString() : '-'}`);
  if (order.result?.remarks) {
    line(`Remarks: ${order.result.remarks}`);
  }

  return pdf.save();
};

router.post(
  '/tests',
  authenticate,
  authorize('ADMIN', 'LAB_TECH'),
  validateRequest(CreateLabTestRequestDto),
  asyncHandler(async (req, res) => {
    ensureLabPrismaDelegates();
    const { hospitalId, userId } = getHospitalAndUser(req as AuthenticatedRequest);
    const body = req.body as CreateLabTestRequestDto;

    let created;
    try {
      created = await labPrisma.labTest.create({
        data: {
          hospitalId,
          code: body.code.trim().toUpperCase(),
          name: body.name.trim(),
          category: body.category?.trim() || null,
          sampleType: body.sampleType?.trim() || null,
          defaultUnit: body.defaultUnit?.trim() || null,
          referenceRange: body.referenceRange?.trim() || null,
          instructions: body.instructions?.trim() || body.description?.trim() || null,
          isActive: true,
        },
        select: labTestSelect,
      });
    } catch (error) {
      if (error && typeof error === 'object' && (error as { code?: string }).code === 'P2002') {
        throw new ValidationError('Lab test with this code already exists');
      }
      throw error;
    }

    await logAudit({
      req: req as AuthenticatedRequest,
      hospitalId,
      userId,
      entityType: 'LabTest',
      entityId: (created as { id: string }).id,
      operation: 'create',
      before: null,
      after: created,
    });

    res.status(201).json({
      success: true,
      message: 'Lab test created successfully',
      test: created,
    });
  })
);

router.post(
  '/orders',
  authenticate,
  authorize('ADMIN', 'DOCTOR'),
  validateRequest(CreateLabOrderRequestDto),
  asyncHandler(async (req, res) => {
    ensureLabPrismaDelegates();
    const { hospitalId, userId } = getHospitalAndUser(req as AuthenticatedRequest);
    const body = req.body as CreateLabOrderRequestDto;

    const [patient, doctor, labTest] = await Promise.all([
      labPrisma.patient.findFirst({ where: { id: body.patientId, hospitalId }, select: { id: true } }),
      labPrisma.doctor.findFirst({ where: { id: body.doctorId, hospitalId, isActive: true }, select: { id: true } }),
      labPrisma.labTest.findFirst({
        where: { id: body.labTestId, hospitalId, isActive: true },
        select: { id: true, defaultUnit: true, referenceRange: true },
      }),
    ]);

    if (!patient) {
      throw new NotFoundError('Patient not found');
    }
    if (!doctor) {
      throw new NotFoundError('Doctor not found');
    }
    if (!labTest) {
      throw new NotFoundError('Lab test not found');
    }

    if (body.visitId) {
      const visit = await labPrisma.visit.findFirst({
        where: {
          id: body.visitId,
          hospitalId,
          patientId: body.patientId,
          doctorId: body.doctorId,
        },
        select: { id: true },
      });
      if (!visit) {
        throw new NotFoundError('Visit not found for patient/doctor in this hospital');
      }
    }

    const createOrderTx = async () =>
      labPrisma.$transaction(async (tx) => {
        return tx.labOrder.create({
          data: {
            hospitalId,
            patientId: body.patientId,
            doctorId: body.doctorId,
            visitId: body.visitId ?? null,
            labTestId: body.labTestId,
            orderNumber: generateLabOrderNumber(),
            priority: body.priority ?? 'ROUTINE',
            status: 'ORDERED',
            notes: body.notes?.trim() || null,
            clinicalNotes: body.clinicalNotes?.trim() || null,
          },
          select: labOrderSelect,
        });
      });

    let order: LabOrderRecord | null = null;
    let createError: unknown = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        order = await createOrderTx();
        break;
      } catch (error) {
        createError = error;
        if (
          error &&
          typeof error === 'object' &&
          (error as { code?: string }).code === 'P2002' &&
          attempt < 2
        ) {
          continue;
        }
        throw error;
      }
    }

    if (!order) {
      throw (createError instanceof Error ? createError : new ValidationError('Failed to create lab order'));
    }

    await logAudit({
      req: req as AuthenticatedRequest,
      hospitalId,
      userId,
      entityType: 'LabOrder',
      entityId: order.id,
      operation: 'create',
      before: null,
      after: order,
    });

    res.status(201).json({
      success: true,
      message: 'Lab test ordered successfully',
      order,
    });
  })
);

router.get(
  '/tests',
  authenticate,
  authorize('ADMIN', 'DOCTOR', 'LAB_TECH', 'NURSE'),
  asyncHandler(async (req, res) => {
    ensureLabPrismaDelegates();
    const { hospitalId } = getHospitalAndUser(req as AuthenticatedRequest);

    const tests = await labPrisma.labTest.findMany({
      where: {
        hospitalId,
        isActive: true,
      },
      orderBy: [{ category: 'asc' as const }, { name: 'asc' as const }],
      select: labTestSelect,
    });

    res.status(200).json({ tests });
  })
);

router.get(
  '/orders',
  authenticate,
  authorize('ADMIN', 'DOCTOR', 'LAB_TECH', 'NURSE', 'RECEPTIONIST'),
  asyncHandler(async (req, res) => {
    ensureLabPrismaDelegates();
    const { hospitalId } = getHospitalAndUser(req as AuthenticatedRequest);
    const status = typeof req.query.status === 'string' ? req.query.status.trim().toUpperCase() : undefined;
    const patientId = typeof req.query.patientId === 'string' ? req.query.patientId.trim() : undefined;

    const orders = await labPrisma.labOrder.findMany({
      where: {
        hospitalId,
        ...(status ? { status } : {}),
        ...(patientId ? { patientId } : {}),
      },
      orderBy: [{ orderedAt: 'desc' as const }],
      take: 500,
      select: labOrderSelect,
    });

    res.status(200).json({ orders });
  })
);

router.patch(
  '/orders/:id/result',
  authenticate,
  authorize('ADMIN', 'LAB_TECH', 'DOCTOR'),
  validateRequest(UpdateLabResultRequestDto),
  asyncHandler(async (req, res) => {
    ensureLabPrismaDelegates();
    const { hospitalId, userId } = getHospitalAndUser(req as AuthenticatedRequest);
    const orderId = req.params.id;
    const body = req.body as UpdateLabResultRequestDto;

    if (
      body.resultValue === undefined &&
      body.unit === undefined &&
      body.referenceRange === undefined &&
      body.interpretation === undefined &&
      body.remarks === undefined &&
      body.status === undefined &&
      body.observedAt === undefined &&
      body.reportedAt === undefined &&
      body.verifiedAt === undefined &&
      body.collectedAt === undefined
    ) {
      throw new ValidationError('At least one result field must be provided');
    }

    const observedAt = body.observedAt ? parseDateParam(body.observedAt, 'observedAt') : undefined;
    const reportedAt = body.reportedAt ? parseDateParam(body.reportedAt, 'reportedAt') : undefined;
    const verifiedAt = body.verifiedAt ? parseDateParam(body.verifiedAt, 'verifiedAt') : undefined;
    const collectedAt = body.collectedAt ? parseDateParam(body.collectedAt, 'collectedAt') : undefined;

    const txResult = await labPrisma.$transaction(async (tx) => {
      const existingOrder = await tx.labOrder.findFirst({
        where: { id: orderId, hospitalId },
        select: labOrderSelect,
      });
      if (!existingOrder) {
        throw new NotFoundError('Lab order not found');
      }

      const existingResult = await tx.labResult.findFirst({
        where: { labOrderId: orderId, hospitalId },
        select: labResultSelect,
      });

      const resultStatus = body.status ?? (existingResult?.status as LabResultStatus | undefined) ?? 'DRAFT';
      const isFinalized = resultStatus === 'FINAL' || resultStatus === 'CORRECTED';
      const hasResultContentUpdate =
        body.resultValue !== undefined ||
        body.unit !== undefined ||
        body.referenceRange !== undefined ||
        body.interpretation !== undefined ||
        body.remarks !== undefined ||
        body.observedAt !== undefined ||
        body.reportedAt !== undefined ||
        body.verifiedAt !== undefined ||
        body.status !== undefined;
      const effectiveCollectedAt = collectedAt ?? existingOrder.collectedAt ?? null;
      const orderStatus = isFinalized
        ? 'COMPLETED'
        : effectiveCollectedAt
          ? hasResultContentUpdate
            ? 'RESULT_UPDATED'
            : 'SAMPLE_COLLECTED'
          : hasResultContentUpdate
            ? 'RESULT_UPDATED'
            : existingOrder.status;

      const result = await tx.labResult.upsert({
        where: { labOrderId: orderId },
        create: {
          hospitalId,
          labOrderId: existingOrder.id,
          patientId: existingOrder.patientId,
          labTestId: existingOrder.labTestId,
          recordedById: userId,
          status: resultStatus,
          resultValue: body.resultValue?.trim() || null,
          unit: body.unit?.trim() || existingOrder.labTest?.defaultUnit || null,
          referenceRange: body.referenceRange?.trim() || existingOrder.labTest?.referenceRange || null,
          interpretation: body.interpretation?.trim() || null,
          remarks: body.remarks?.trim() || null,
          observedAt: observedAt ?? null,
          reportedAt: reportedAt ?? (resultStatus === 'FINAL' || resultStatus === 'CORRECTED' ? new Date() : null),
          verifiedAt: verifiedAt ?? null,
        },
        update: {
          ...(body.status !== undefined ? { status: body.status } : {}),
          ...(body.resultValue !== undefined ? { resultValue: body.resultValue.trim() || null } : {}),
          ...(body.unit !== undefined ? { unit: body.unit.trim() || null } : {}),
          ...(body.referenceRange !== undefined ? { referenceRange: body.referenceRange.trim() || null } : {}),
          ...(body.interpretation !== undefined ? { interpretation: body.interpretation.trim() || null } : {}),
          ...(body.remarks !== undefined ? { remarks: body.remarks.trim() || null } : {}),
          ...(observedAt !== undefined ? { observedAt } : {}),
          ...(reportedAt !== undefined ? { reportedAt } : {}),
          ...(verifiedAt !== undefined ? { verifiedAt } : {}),
          recordedById: userId,
        },
        select: labResultSelect,
      });

      const updatedOrder = await tx.labOrder.update({
        where: { id: existingOrder.id },
        data: {
          status: orderStatus,
          ...(collectedAt !== undefined ? { collectedAt } : {}),
          ...((resultStatus === 'FINAL' || resultStatus === 'CORRECTED') ? { completedAt: result.reportedAt ?? new Date() } : {}),
        },
        select: labOrderSelect,
      });

      return {
        beforeOrder: existingOrder,
        beforeResult: existingResult,
        order: updatedOrder,
        result,
      };
    });

    await Promise.all([
      logAudit({
        req: req as AuthenticatedRequest,
        hospitalId,
        userId,
        entityType: 'LabResult',
        entityId: txResult.result.id,
        operation: txResult.beforeResult ? 'update' : 'create',
        before: txResult.beforeResult,
        after: txResult.result,
      }),
      logAudit({
        req: req as AuthenticatedRequest,
        hospitalId,
        userId,
        entityType: 'LabOrder',
        entityId: txResult.order.id,
        operation: 'status_update_after_result',
        before: {
          status: txResult.beforeOrder.status,
          collectedAt: txResult.beforeOrder.collectedAt,
          completedAt: txResult.beforeOrder.completedAt,
        },
        after: {
          status: txResult.order.status,
          collectedAt: txResult.order.collectedAt,
          completedAt: txResult.order.completedAt,
        },
      }),
    ]);

    res.status(200).json({
      success: true,
      message: 'Lab result updated successfully',
      order: txResult.order,
      result: txResult.result,
    });
  })
);

router.get(
  '/orders/:id/report/pdf',
  authenticate,
  authorize('ADMIN', 'DOCTOR', 'LAB_TECH'),
  asyncHandler(async (req, res) => {
    ensureLabPrismaDelegates();
    const { hospitalId, userId } = getHospitalAndUser(req as AuthenticatedRequest);
    const orderId = req.params.id;

    const order = await labPrisma.labOrder.findFirst({
      where: { id: orderId, hospitalId },
      select: labOrderSelect,
    });
    if (!order) {
      throw new NotFoundError('Lab order not found');
    }
    if (!order.result) {
      throw new ValidationError('Lab result not available for report printing');
    }

    const pdfBytes = await createLabReportPdfBuffer(order);

    await logAudit({
      req: req as AuthenticatedRequest,
      hospitalId,
      userId,
      entityType: 'LabReport',
      entityId: order.id,
      operation: 'print_pdf',
      before: null,
      after: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        resultId: order.result.id,
        printedAt: new Date().toISOString(),
      },
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="lab-report-${order.orderNumber}.pdf"`);
    res.status(200).send(Buffer.from(pdfBytes));
  })
);

export { router as labsRouter };
