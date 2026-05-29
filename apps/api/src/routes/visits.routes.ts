import { AppointmentStatus, Prisma } from '@prisma/client';
import { IsDateString, IsInt, IsOptional, IsString, IsUUID, Min, MinLength } from 'class-validator';
import { Router } from 'express';
import { getRequestContext } from '../context/requestContext.js';
import { AppError } from '../errors/AppError.js';
import { AuthError, NotFoundError, ValidationError } from '../errors/customErrors.js';
import { authenticate, type AuthenticatedRequest } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { prisma } from '../prisma/client.js';
import { enqueuePrescriptionPdfGeneration } from '../queue/queues.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

class CreateVisitRequestDto {
  @IsUUID()
  appointmentId!: string;

  @IsString()
  @MinLength(2)
  chiefComplaint!: string;

  @IsOptional()
  @IsString()
  diagnosis?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

class UpdateVisitRequestDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  chiefComplaint?: string;

  @IsOptional()
  @IsString()
  diagnosis?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  visitedAt?: string;
}

class AddPrescriptionRequestDto {
  @IsString()
  @MinLength(2)
  medication!: string;

  @IsString()
  @MinLength(1)
  dosage!: string;

  @IsString()
  @MinLength(1)
  frequency!: string;

  @IsInt()
  @Min(1)
  durationDays!: number;

  @IsOptional()
  @IsString()
  instructions?: string;
}

const prescriptionSelect = {
  id: true,
  medication: true,
  dosage: true,
  frequency: true,
  durationDays: true,
  instructions: true,
  pdfPath: true,
  pdfUrl: true,
  pdfGeneratedAt: true,
  hospitalId: true,
  visitId: true,
  createdAt: true,
  updatedAt: true,
} as const;

const visitSelect = {
  id: true,
  chiefComplaint: true,
  diagnosis: true,
  notes: true,
  visitedAt: true,
  hospitalId: true,
  appointmentId: true,
  patientId: true,
  doctorId: true,
  createdAt: true,
  updatedAt: true,
  patient: {
    select: {
      id: true,
      mrn: true,
      name: true,
    },
  },
  doctor: {
    select: {
      id: true,
      name: true,
      specialization: true,
    },
  },
  appointment: {
    select: {
      id: true,
      scheduledAt: true,
      status: true,
    },
  },
  prescriptions: {
    select: prescriptionSelect,
    orderBy: { createdAt: 'asc' as const },
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

const toJsonValue = (value: unknown): Prisma.InputJsonValue => {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
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
  entityType: 'Visit' | 'Prescription';
  entityId: string;
  operation: string;
  before: unknown;
  after: unknown;
}) => {
  const context = getRequestContext();

  await prisma.auditLog.create({
    data: {
      hospitalId,
      userId,
      actor: context?.actor ?? userId,
      entityType,
      entityId,
      changesJson: toJsonValue({ operation, before, after }),
      consentVersion: context?.consentVersion ?? req.header('x-consent-version') ?? null,
      purpose: context?.purpose ?? req.header('x-purpose') ?? 'Visit workflow',
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
  authorize('ADMIN', 'DOCTOR', 'NURSE'),
  validateRequest(CreateVisitRequestDto),
  asyncHandler(async (req, res) => {
    const { hospitalId, userId } = getHospitalAndUser(req as AuthenticatedRequest);
    const body = req.body as CreateVisitRequestDto;

    const appointment = await prisma.appointment.findFirst({
      where: {
        id: body.appointmentId,
        hospitalId,
      },
      select: {
        id: true,
        hospitalId: true,
        patientId: true,
        doctorId: true,
        status: true,
      },
    });

    if (!appointment) {
      throw new NotFoundError('Appointment not found for this hospital');
    }

    const existingVisit = await prisma.visit.findFirst({
      where: {
        hospitalId,
        appointmentId: appointment.id,
      },
      select: { id: true },
    });
    if (existingVisit) {
      throw new AppError('Visit already exists for this appointment', 409);
    }

    const visit = await prisma.$transaction(async (tx) => {
      const created = await tx.visit.create({
        data: {
          hospitalId,
          appointmentId: appointment.id,
          patientId: appointment.patientId,
          doctorId: appointment.doctorId,
          chiefComplaint: body.chiefComplaint.trim(),
          diagnosis: body.diagnosis?.trim() || null,
          notes: body.notes?.trim() || null,
        },
        select: visitSelect,
      });

      await tx.appointment.update({
        where: { id: appointment.id },
        data: { status: AppointmentStatus.COMPLETED },
        select: { id: true },
      });

      return created;
    });

    await logAudit({
      req: req as AuthenticatedRequest,
      hospitalId,
      userId,
      entityType: 'Visit',
      entityId: visit.id,
      operation: 'create',
      before: null,
      after: visit,
    });

    res.status(201).json({
      success: true,
      message: 'Visit created successfully',
      visit,
    });
  })
);

router.get(
  '/by-appointment/:appointmentId',
  authenticate,
  authorize('ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST'),
  asyncHandler(async (req, res) => {
    const { hospitalId } = getHospitalAndUser(req as AuthenticatedRequest);
    const appointmentId = req.params.appointmentId;

    const visit = await prisma.visit.findFirst({
      where: {
        hospitalId,
        appointmentId,
      },
      select: visitSelect,
    });

    res.status(200).json({ visit: visit ?? null });
  })
);

router.get(
  '/:id',
  authenticate,
  authorize('ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST'),
  asyncHandler(async (req, res) => {
    const { hospitalId } = getHospitalAndUser(req as AuthenticatedRequest);
    const id = req.params.id;

    const visit = await prisma.visit.findFirst({
      where: { id, hospitalId },
      select: visitSelect,
    });

    if (!visit) {
      throw new NotFoundError('Visit not found');
    }

    res.status(200).json({ visit });
  })
);

router.post(
  '/:id/prescription',
  authenticate,
  authorize('ADMIN', 'DOCTOR'),
  validateRequest(AddPrescriptionRequestDto),
  asyncHandler(async (req, res) => {
    const { hospitalId, userId } = getHospitalAndUser(req as AuthenticatedRequest);
    const id = req.params.id;
    const body = req.body as AddPrescriptionRequestDto;

    const visit = await prisma.visit.findFirst({
      where: { id, hospitalId },
      select: { id: true },
    });
    if (!visit) {
      throw new NotFoundError('Visit not found');
    }

    const prescription = await prisma.prescription.create({
      data: {
        hospitalId,
        visitId: id,
        medication: body.medication.trim(),
        dosage: body.dosage.trim(),
        frequency: body.frequency.trim(),
        durationDays: body.durationDays,
        instructions: body.instructions?.trim() || null,
      },
      select: prescriptionSelect,
    });

    const pdfJobId = await enqueuePrescriptionPdfGeneration({
      prescriptionId: prescription.id,
      hospitalId,
      requestedBy: userId,
    });

    await logAudit({
      req: req as AuthenticatedRequest,
      hospitalId,
      userId,
      entityType: 'Prescription',
      entityId: prescription.id,
      operation: 'create',
      before: null,
      after: prescription,
    });

    res.status(202).json({
      success: true,
      message: 'Prescription added successfully. PDF generation queued.',
      jobId: pdfJobId,
      prescription,
    });
  })
);

router.patch(
  '/:id',
  authenticate,
  authorize('ADMIN', 'DOCTOR', 'NURSE'),
  validateRequest(UpdateVisitRequestDto),
  asyncHandler(async (req, res) => {
    const { hospitalId, userId } = getHospitalAndUser(req as AuthenticatedRequest);
    const id = req.params.id;
    const body = req.body as UpdateVisitRequestDto;

    if (
      body.chiefComplaint === undefined &&
      body.diagnosis === undefined &&
      body.notes === undefined &&
      body.visitedAt === undefined
    ) {
      throw new ValidationError('At least one field must be provided');
    }

    const existing = await prisma.visit.findFirst({
      where: { id, hospitalId },
      select: visitSelect,
    });
    if (!existing) {
      throw new NotFoundError('Visit not found');
    }

    const visitedAtDate =
      body.visitedAt !== undefined
        ? new Date(body.visitedAt)
        : undefined;
    if (visitedAtDate && Number.isNaN(visitedAtDate.getTime())) {
      throw new ValidationError('visitedAt must be a valid date');
    }

    const visit = await prisma.visit.update({
      where: { id },
      data: {
        ...(body.chiefComplaint !== undefined ? { chiefComplaint: body.chiefComplaint.trim() } : {}),
        ...(body.diagnosis !== undefined ? { diagnosis: body.diagnosis.trim() || null } : {}),
        ...(body.notes !== undefined ? { notes: body.notes.trim() || null } : {}),
        ...(visitedAtDate ? { visitedAt: visitedAtDate } : {}),
      },
      select: visitSelect,
    });

    await logAudit({
      req: req as AuthenticatedRequest,
      hospitalId,
      userId,
      entityType: 'Visit',
      entityId: visit.id,
      operation: 'update',
      before: existing,
      after: visit,
    });

    res.status(200).json({
      success: true,
      message: 'Visit updated successfully',
      visit,
    });
  })
);

export { router as visitsRouter };
