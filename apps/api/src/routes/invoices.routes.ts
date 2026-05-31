import { Prisma, InvoiceStatus, PaymentMethod } from '@prisma/client';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { Router } from 'express';
import { getRequestContext } from '../context/requestContext.js';
import { AppError } from '../errors/AppError.js';
import { AuthError, NotFoundError, ValidationError } from '../errors/customErrors.js';
import { authenticate, type AuthenticatedRequest } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { prisma } from '../prisma/client.js';
import { enqueueInvoicePdfGeneration } from '../queue/queues.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
const DECIMAL_PRECISION = 2;

class CreateInvoiceRequestDto {
  @IsUUID()
  patientId!: string;

  @IsOptional()
  @IsUUID()
  visitId?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  items!: unknown[];
}

class RecordPaymentRequestDto {
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  @IsOptional()
  @IsString()
  referenceNo?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

type InvoiceItemComputation = {
  tariffItemId: string | null;
  description: string;
  quantity: number;
  unitPrice: Prisma.Decimal;
  gstRate: Prisma.Decimal;
  lineSubtotal: Prisma.Decimal;
  lineGst: Prisma.Decimal;
  lineTotal: Prisma.Decimal;
};

type InvoiceLineItemInput = {
  tariffItemId?: string;
  description?: string;
  quantity: number;
  unitPrice?: number;
};

const invoiceSelect = {
  id: true,
  invoiceNumber: true,
  invoiceYear: true,
  invoiceMonth: true,
  invoiceSeq: true,
  status: true,
  subtotal: true,
  gstTotal: true,
  total: true,
  amountPaid: true,
  dueDate: true,
  notes: true,
  hospitalId: true,
  patientId: true,
  visitId: true,
  createdAt: true,
  updatedAt: true,
  patient: {
    select: {
      id: true,
      mrn: true,
      name: true,
      phone: true,
    },
  },
  visit: {
    select: {
      id: true,
      chiefComplaint: true,
      diagnosis: true,
      visitedAt: true,
      doctor: {
        select: {
          id: true,
          name: true,
          specialization: true,
        },
      },
    },
  },
  items: {
    select: {
      id: true,
      description: true,
      quantity: true,
      unitPrice: true,
      gstRate: true,
      lineSubtotal: true,
      lineGst: true,
      lineTotal: true,
      tariffItemId: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: 'asc' as const },
  },
  payments: {
    select: {
      id: true,
      amount: true,
      method: true,
      referenceNo: true,
      notes: true,
      receivedAt: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { receivedAt: 'asc' as const },
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

const toDecimal = (value: number | string | Prisma.Decimal): Prisma.Decimal => {
  return new Prisma.Decimal(value);
};

const decimalRound = (value: Prisma.Decimal): Prisma.Decimal => {
  return value.toDecimalPlaces(DECIMAL_PRECISION, Prisma.Decimal.ROUND_HALF_UP);
};

const decimalZero = (): Prisma.Decimal => {
  return new Prisma.Decimal(0);
};

const parseDateParam = (value: string, paramName: string): Date => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new ValidationError(`${paramName} must be a valid ISO date`);
  }

  return parsed;
};

const parseAndValidateItems = (items: unknown[]): InvoiceLineItemInput[] => {
  const parsedItems = items as InvoiceLineItemInput[];
  if (!Array.isArray(parsedItems) || parsedItems.length === 0) {
    throw new ValidationError('items must be a non-empty array');
  }

  for (const [index, item] of parsedItems.entries()) {
    if (!item || typeof item !== 'object') {
      throw new ValidationError(`items[${index}] must be an object`);
    }

    if (!Number.isInteger(item.quantity) || item.quantity < 1) {
      throw new ValidationError(`items[${index}].quantity must be an integer >= 1`);
    }

    if (item.tariffItemId !== undefined) {
      if (typeof item.tariffItemId !== 'string' || item.tariffItemId.trim().length === 0) {
        throw new ValidationError(`items[${index}].tariffItemId must be a UUID string`);
      }
    }

    if (item.description !== undefined) {
      if (typeof item.description !== 'string' || item.description.trim().length < 2) {
        throw new ValidationError(`items[${index}].description must be at least 2 characters`);
      }
    }

    if (item.unitPrice !== undefined) {
      if (typeof item.unitPrice !== 'number' || Number.isNaN(item.unitPrice) || item.unitPrice < 0) {
        throw new ValidationError(`items[${index}].unitPrice must be a number >= 0`);
      }
    }
  }

  return parsedItems;
};

const toJsonValue = (value: unknown): Prisma.InputJsonValue => {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
};

const computeInvoiceStatus = (amountPaid: Prisma.Decimal, total: Prisma.Decimal): InvoiceStatus => {
  if (amountPaid.greaterThanOrEqualTo(total)) {
    return InvoiceStatus.PAID;
  }
  if (amountPaid.greaterThan(0)) {
    return InvoiceStatus.PARTIALLY_PAID;
  }
  return InvoiceStatus.UNPAID;
};

const isInvoiceNumberConflictError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const prismaError = error as { code?: string; meta?: { target?: unknown } };
  if (prismaError.code !== 'P2002') {
    return false;
  }

  const targets = Array.isArray(prismaError.meta?.target) ? prismaError.meta?.target : [];
  const targetText = targets.join(',');
  return targetText.includes('invoiceNumber') || targetText.includes('invoiceSeq');
};

const generateInvoiceNumber = async (
  tx: Prisma.TransactionClient,
  hospitalId: string,
  issuedAt: Date
): Promise<{ invoiceNumber: string; invoiceYear: number; invoiceMonth: number; invoiceSeq: number }> => {
  const invoiceYear = issuedAt.getUTCFullYear();
  const invoiceMonth = issuedAt.getUTCMonth() + 1;

  const latest = await tx.invoice.findFirst({
    where: {
      hospitalId,
      invoiceYear,
      invoiceMonth,
    },
    orderBy: {
      invoiceSeq: 'desc',
    },
    select: { invoiceSeq: true },
  });

  const invoiceSeq = (latest?.invoiceSeq ?? 0) + 1;
  const invoiceNumber = `INV-${invoiceYear}${String(invoiceMonth).padStart(2, '0')}-${String(invoiceSeq).padStart(3, '0')}`;

  return { invoiceNumber, invoiceYear, invoiceMonth, invoiceSeq };
};

const computeLineItem = async (
  tx: Prisma.TransactionClient,
  hospitalId: string,
  item: InvoiceLineItemInput
): Promise<InvoiceItemComputation> => {
  let description = item.description?.trim() ?? '';
  let unitPrice = item.unitPrice !== undefined ? toDecimal(item.unitPrice) : null;
  let gstRate = toDecimal(18);
  let tariffItemId: string | null = null;

  if (item.tariffItemId) {
    const tariffItem = await tx.tariffItem.findFirst({
      where: {
        id: item.tariffItemId,
        hospitalId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        unitPrice: true,
        gstRate: true,
      },
    });
    if (!tariffItem) {
      throw new ValidationError(`Tariff item not found: ${item.tariffItemId}`);
    }

    tariffItemId = tariffItem.id;
    description = description || tariffItem.name;
    unitPrice = tariffItem.unitPrice;
    gstRate = tariffItem.gstRate;
  }

  if (!description) {
    throw new ValidationError('Item description is required');
  }
  if (!unitPrice) {
    throw new ValidationError('Item unitPrice is required for non-tariff items');
  }

  const quantity = item.quantity;
  const lineSubtotal = decimalRound(unitPrice.mul(quantity));
  const lineGst = decimalRound(lineSubtotal.mul(gstRate).div(100));
  const lineTotal = decimalRound(lineSubtotal.plus(lineGst));

  return {
    tariffItemId,
    description,
    quantity,
    unitPrice: decimalRound(unitPrice),
    gstRate: decimalRound(gstRate),
    lineSubtotal,
    lineGst,
    lineTotal,
  };
};

const logInvoiceAudit = async ({
  req,
  hospitalId,
  userId,
  entityType,
  entityId,
  operation,
  before,
  after,
  tx,
}: {
  req: AuthenticatedRequest;
  hospitalId: string;
  userId: string;
  entityType: 'Invoice' | 'Payment';
  entityId: string;
  operation: string;
  before: unknown;
  after: unknown;
  tx?: Prisma.TransactionClient;
}): Promise<void> => {
  const context = getRequestContext();
  const db = tx ?? prisma;

  await db.auditLog.create({
    data: {
      hospitalId,
      userId,
      actor: context?.actor ?? userId,
      entityType,
      entityId,
      changesJson: toJsonValue({ operation, before, after }),
      consentVersion: context?.consentVersion ?? req.header('x-consent-version') ?? null,
      purpose: context?.purpose ?? req.header('x-purpose') ?? 'Billing operations',
      retentionPolicy: context?.retentionPolicy ?? req.header('x-retention-policy') ?? null,
      ipAddress: context?.ipAddress ?? req.ip ?? null,
      userAgent: context?.userAgent ?? req.get('user-agent') ?? null,
      timestamp: new Date(),
    },
  });
};

router.post(
  '/',
  authenticate,
  authorize('ADMIN', 'RECEPTIONIST'),
  validateRequest(CreateInvoiceRequestDto),
  asyncHandler(async (req, res) => {
    const { hospitalId, userId } = getHospitalAndUser(req as AuthenticatedRequest);
    const body = req.body as CreateInvoiceRequestDto;
    const items = parseAndValidateItems(body.items);
    const dueDate = body.dueDate ? parseDateParam(body.dueDate, 'dueDate') : null;

    const createInvoiceTx = async () =>
      prisma.$transaction(async (tx) => {
        const patient = await tx.patient.findFirst({
          where: {
            id: body.patientId,
            hospitalId,
          },
          select: { id: true },
        });
        if (!patient) {
          throw new NotFoundError('Patient not found for this hospital');
        }

        if (body.visitId) {
          const visit = await tx.visit.findFirst({
            where: {
              id: body.visitId,
              hospitalId,
              patientId: body.patientId,
            },
            select: { id: true },
          });
          if (!visit) {
            throw new NotFoundError('Visit not found for this patient and hospital');
          }
        }

        const itemComputations = await Promise.all(items.map((item) => computeLineItem(tx, hospitalId, item)));

        const subtotal = decimalRound(itemComputations.reduce((acc, item) => acc.plus(item.lineSubtotal), decimalZero()));
        const gstTotal = decimalRound(itemComputations.reduce((acc, item) => acc.plus(item.lineGst), decimalZero()));
        const total = decimalRound(subtotal.plus(gstTotal));

        const timestamp = new Date();
        const invoiceNumberData = await generateInvoiceNumber(tx, hospitalId, timestamp);

        const created = await tx.invoice.create({
          data: {
            hospitalId,
            patientId: body.patientId,
            visitId: body.visitId ?? null,
            dueDate,
            notes: body.notes?.trim() || null,
            ...invoiceNumberData,
            subtotal,
            gstTotal,
            total,
            amountPaid: decimalZero(),
            status: InvoiceStatus.UNPAID,
            items: {
              create: itemComputations.map((item) => ({
                hospitalId,
                tariffItemId: item.tariffItemId,
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                gstRate: item.gstRate,
                lineSubtotal: item.lineSubtotal,
                lineGst: item.lineGst,
                lineTotal: item.lineTotal,
              })),
            },
          },
          select: invoiceSelect,
        });

        return created;
      });

    let createdInvoice: Prisma.InvoiceGetPayload<{ select: typeof invoiceSelect }> | null = null;
    let lastError: unknown = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        createdInvoice = await createInvoiceTx();
        break;
      } catch (error) {
        lastError = error;
        if (isInvoiceNumberConflictError(error) && attempt < 2) {
          continue;
        }
        throw error;
      }
    }
    if (!createdInvoice) {
      throw (lastError instanceof Error ? lastError : new AppError('Failed to create invoice', 500));
    }

    await logInvoiceAudit({
      req: req as AuthenticatedRequest,
      hospitalId,
      userId,
      entityType: 'Invoice',
      entityId: createdInvoice.id,
      operation: 'create',
      before: null,
      after: createdInvoice,
    });

    res.status(201).json({
      success: true,
      message: 'Invoice created successfully',
      invoice: createdInvoice,
    });
  })
);

router.get(
  '/',
  authenticate,
  authorize('ADMIN', 'RECEPTIONIST', 'DOCTOR'),
  asyncHandler(async (req, res) => {
    const { hospitalId } = getHospitalAndUser(req as AuthenticatedRequest);
    const statusQuery = typeof req.query.status === 'string' ? req.query.status.toUpperCase() : undefined;
    const status = statusQuery && statusQuery in InvoiceStatus ? (statusQuery as InvoiceStatus) : undefined;
    const patientId = typeof req.query.patientId === 'string' ? req.query.patientId : undefined;
    const dateFrom = typeof req.query.dateFrom === 'string' ? parseDateParam(req.query.dateFrom, 'dateFrom') : undefined;
    const dateTo = typeof req.query.dateTo === 'string' ? parseDateParam(req.query.dateTo, 'dateTo') : undefined;

    if (statusQuery && !status) {
      throw new ValidationError('Invalid status filter');
    }
    if (dateFrom && dateTo && dateFrom > dateTo) {
      throw new ValidationError('dateFrom cannot be later than dateTo');
    }

    const invoices = await prisma.invoice.findMany({
      where: {
        hospitalId,
        ...(status ? { status } : {}),
        ...(patientId ? { patientId } : {}),
        ...(dateFrom || dateTo
          ? {
              createdAt: {
                ...(dateFrom ? { gte: dateFrom } : {}),
                ...(dateTo ? { lte: dateTo } : {}),
              },
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
      select: invoiceSelect,
    });

    res.status(200).json({ invoices });
  })
);

router.get(
  '/:id',
  authenticate,
  authorize('ADMIN', 'RECEPTIONIST', 'DOCTOR'),
  asyncHandler(async (req, res) => {
    const { hospitalId } = getHospitalAndUser(req as AuthenticatedRequest);
    const id = req.params.id;

    const invoice = await prisma.invoice.findFirst({
      where: { id, hospitalId },
      select: invoiceSelect,
    });

    if (!invoice) {
      throw new NotFoundError('Invoice not found');
    }

    res.status(200).json({ invoice });
  })
);

router.post(
  '/:id/pdf',
  authenticate,
  authorize('ADMIN', 'RECEPTIONIST', 'DOCTOR'),
  asyncHandler(async (req, res) => {
    const { hospitalId, userId } = getHospitalAndUser(req as AuthenticatedRequest);
    const id = req.params.id;

    const invoice = await prisma.invoice.findFirst({
      where: { id, hospitalId },
      select: {
        id: true,
        invoiceNumber: true,
      },
    });
    if (!invoice) {
      throw new NotFoundError('Invoice not found');
    }

    const jobId = await enqueueInvoicePdfGeneration({
      invoiceId: id,
      hospitalId,
      requestedBy: userId,
    });

    res.status(202).json({
      success: true,
      message: 'Invoice PDF generation queued.',
      jobId,
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
      },
    });
  })
);

router.post(
  '/:id/payment',
  authenticate,
  authorize('ADMIN', 'RECEPTIONIST'),
  validateRequest(RecordPaymentRequestDto),
  asyncHandler(async (req, res) => {
    const { hospitalId, userId } = getHospitalAndUser(req as AuthenticatedRequest);
    const id = req.params.id;
    const body = req.body as RecordPaymentRequestDto;
    const paymentAmount = decimalRound(toDecimal(body.amount));

    const result = await prisma.$transaction(async (tx) => {
      const existingInvoice = await tx.invoice.findFirst({
        where: { id, hospitalId },
        select: {
          id: true,
          patientId: true,
          total: true,
          amountPaid: true,
          status: true,
        },
      });
      if (!existingInvoice) {
        throw new NotFoundError('Invoice not found');
      }

      const remaining = decimalRound(existingInvoice.total.minus(existingInvoice.amountPaid));
      if (paymentAmount.greaterThan(remaining)) {
        throw new ValidationError('Payment amount exceeds outstanding balance');
      }

      const updatedAmountPaid = decimalRound(existingInvoice.amountPaid.plus(paymentAmount));
      const updatedStatus = computeInvoiceStatus(updatedAmountPaid, existingInvoice.total);

      const updateResult = await tx.invoice.updateMany({
        where: {
          id,
          hospitalId,
          amountPaid: { lte: decimalRound(existingInvoice.total.minus(paymentAmount)) },
        },
        data: {
          amountPaid: { increment: paymentAmount },
          status: updatedStatus,
        },
      });

      if (updateResult.count === 0) {
        throw new ValidationError('Payment would overpay outstanding balance due to concurrent updates');
      }

      const payment = await tx.payment.create({
        data: {
          hospitalId,
          invoiceId: id,
          patientId: existingInvoice.patientId,
          amount: paymentAmount,
          method: body.method,
          referenceNo: body.referenceNo?.trim() || null,
          notes: body.notes?.trim() || null,
        },
        select: {
          id: true,
          amount: true,
          method: true,
          referenceNo: true,
          notes: true,
          receivedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      const invoice = await tx.invoice.findUnique({
        where: { id },
        select: invoiceSelect,
      });

      if (!invoice) {
        throw new NotFoundError('Invoice not found');
      }

      await Promise.all([
        logInvoiceAudit({
          req: req as AuthenticatedRequest,
          hospitalId,
          userId,
          entityType: 'Payment',
          entityId: payment.id,
          operation: 'record_payment',
          before: null,
          after: payment,
          tx,
        }),
        logInvoiceAudit({
          req: req as AuthenticatedRequest,
          hospitalId,
          userId,
          entityType: 'Invoice',
          entityId: invoice.id,
          operation: 'payment_status_update',
          before: {
            amountPaid: existingInvoice.amountPaid,
            status: existingInvoice.status,
          },
          after: {
            amountPaid: invoice.amountPaid,
            status: invoice.status,
          },
          tx,
        }),
      ]);

      return {
        payment,
        invoice,
      };
    });

    res.status(201).json({
      success: true,
      message: 'Payment recorded successfully',
      payment: result.payment,
      invoice: result.invoice,
    });
  })
);

export { router as invoicesRouter };
