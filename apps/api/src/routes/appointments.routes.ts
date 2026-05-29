import { AppointmentStatus, Prisma } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { Router } from 'express';
import { getRequestContext } from '../context/requestContext.js';
import { AppError } from '../errors/AppError.js';
import { AuthError, NotFoundError, ValidationError } from '../errors/customErrors.js';
import { authenticate, type AuthenticatedRequest } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { prisma } from '../prisma/client.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { redisSchema } from '../utils/redis-schema.js';

// Cache TTL constants
const DOCTORS_CACHE_TTL_SECONDS = 5 * 60; // 5 minutes

const router = Router();
const SLOT_MINUTES = 30;
const SLOT_MS = SLOT_MINUTES * 60 * 1000;

class CreateAppointmentRequestDto {
  @IsUUID()
  patientId!: string;

  @IsUUID()
  doctorId!: string;

  @IsDateString()
  scheduledAt!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

class UpdateAppointmentStatusRequestDto {
  @IsEnum(AppointmentStatus)
  status!: AppointmentStatus;
}

const appointmentSelect = {
  id: true,
  patientId: true,
  doctorId: true,
  hospitalId: true,
  scheduledAt: true,
  status: true,
  notes: true,
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
} as const;

const doctorSelect = {
  id: true,
  name: true,
  specialization: true,
  isActive: true,
} as const;

const getHospitalAndUser = (req: AuthenticatedRequest): { hospitalId: string; userId: string } => {
  const hospitalId = req.user?.hospitalId;
  const userId = req.user?.userId;
  if (!hospitalId || !userId) {
    throw new AuthError('Unauthorized');
  }

  return { hospitalId, userId };
};

const parseScheduledAt = (value: string): Date => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new ValidationError('scheduledAt must be a valid date');
  }

  return parsed;
};

const normalizeDateFilter = (value: string): { start: Date; end: Date } => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ValidationError('date filter must be in YYYY-MM-DD format');
  }

  const start = new Date(`${value}T00:00:00.000Z`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
};

const getSlotStart = (scheduledAt: Date): Date => {
  const ms = scheduledAt.getTime();
  const floored = Math.floor(ms / SLOT_MS) * SLOT_MS;
  return new Date(floored);
};

const getSlotEnd = (slotStart: Date): Date => {
  return new Date(slotStart.getTime() + SLOT_MS);
};

const toJsonValue = (value: unknown): Prisma.InputJsonValue => {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
};

const logAppointmentAudit = async ({
  req,
  hospitalId,
  userId,
  appointmentId,
  operation,
  before,
  after,
}: {
  req: AuthenticatedRequest;
  hospitalId: string;
  userId: string;
  appointmentId: string;
  operation: 'create' | 'status_update';
  before: unknown;
  after: unknown;
}): Promise<void> => {
  const context = getRequestContext();

  await prisma.auditLog.create({
    data: {
      hospitalId,
      userId,
      actor: context?.actor ?? userId,
      entityType: 'Appointment',
      entityId: appointmentId,
      changesJson: toJsonValue({ operation, before, after }),
      consentVersion: context?.consentVersion ?? req.header('x-consent-version') ?? null,
      purpose: context?.purpose ?? req.header('x-purpose') ?? 'Appointment management',
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
  authorize('ADMIN', 'DOCTOR', 'RECEPTIONIST'),
  validateRequest(CreateAppointmentRequestDto),
  asyncHandler(async (req, res) => {
    const { hospitalId, userId } = getHospitalAndUser(req as AuthenticatedRequest);
    const body = req.body as CreateAppointmentRequestDto;
    const scheduledAt = parseScheduledAt(body.scheduledAt);
    const now = new Date();
    if (scheduledAt <= now) {
      throw new ValidationError('scheduledAt must be in the future');
    }

    const slotStart = getSlotStart(scheduledAt);
    const slotEnd = getSlotEnd(slotStart);

    const [doctor, patient] = await Promise.all([
      prisma.doctor.findFirst({
        where: { id: body.doctorId, hospitalId, isActive: true },
        select: { id: true },
      }),
      prisma.patient.findFirst({
        where: { id: body.patientId, hospitalId, isActive: true },
        select: { id: true },
      }),
    ]);

    if (!doctor) {
      throw new NotFoundError('Doctor not found for this hospital');
    }
    if (!patient) {
      throw new NotFoundError('Patient not found for this hospital');
    }

    const overlapping = await prisma.appointment.findFirst({
      where: {
        hospitalId,
        doctorId: body.doctorId,
        status: { not: AppointmentStatus.CANCELLED },
        scheduledAt: {
          gt: new Date(slotStart.getTime() - SLOT_MS),
          lt: slotEnd,
        },
      },
      select: { id: true, scheduledAt: true },
    });

    if (overlapping) {
      throw new AppError('Doctor already has an appointment in this 30-minute slot', 409);
    }

    const appointment = await prisma.appointment.create({
      data: {
        hospitalId,
        patientId: body.patientId,
        doctorId: body.doctorId,
        scheduledAt: slotStart,
        status: AppointmentStatus.SCHEDULED,
        notes: body.notes?.trim() || null,
      },
      select: appointmentSelect,
    });

    await logAppointmentAudit({
      req: req as AuthenticatedRequest,
      hospitalId,
      userId,
      appointmentId: appointment.id,
      operation: 'create',
      before: null,
      after: appointment,
    });

    res.status(201).json({
      success: true,
      message: 'Appointment created successfully',
      appointment,
    });
  })
);

router.get(
  '/',
  authenticate,
  authorize('ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST'),
  asyncHandler(async (req, res) => {
    const { hospitalId } = getHospitalAndUser(req as AuthenticatedRequest);
    const dateFilter = typeof req.query.date === 'string' ? req.query.date : undefined;
    const doctorId = typeof req.query.doctorId === 'string' ? req.query.doctorId : undefined;
    const statusQuery = typeof req.query.status === 'string' ? req.query.status.toUpperCase() : undefined;
    const status = statusQuery && statusQuery in AppointmentStatus ? (statusQuery as AppointmentStatus) : undefined;

    if (statusQuery && !status) {
      throw new ValidationError('Invalid status filter');
    }

    const dateRange = dateFilter ? normalizeDateFilter(dateFilter) : undefined;
    const appointments = await prisma.appointment.findMany({
      where: {
        hospitalId,
        ...(doctorId ? { doctorId } : {}),
        ...(status ? { status } : {}),
        ...(dateRange
          ? {
              scheduledAt: {
                gte: dateRange.start,
                lt: dateRange.end,
              },
            }
          : {}),
      },
      orderBy: { scheduledAt: 'asc' },
      take: 500,
      select: appointmentSelect,
    });

    res.status(200).json({ appointments });
  })
);

router.get(
  '/doctors',
  authenticate,
  authorize('ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST'),
  asyncHandler(async (req, res) => {
    const { hospitalId } = getHospitalAndUser(req as AuthenticatedRequest);
    const cache = redisSchema(hospitalId, 'appointments');
    const cacheKey = 'doctors:active';

    // Try cache first
    const cached = await cache.getJson<typeof doctorSelect[]>(cacheKey);
    if (cached !== null) {
      return res.status(200).json({ doctors: cached, fromCache: true });
    }

    const doctors = await prisma.doctor.findMany({
      where: { hospitalId, isActive: true },
      select: doctorSelect,
      orderBy: { name: 'asc' },
      take: 500,
    });

    // Store in cache
    await cache.setJson(cacheKey, doctors, DOCTORS_CACHE_TTL_SECONDS);

    return res.status(200).json({ doctors, fromCache: false });
  })
);

class CreateDoctorRequestDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  specialization?: string;
}

router.post(
  '/doctors',
  authenticate,
  authorize('ADMIN'),
  validateRequest(CreateDoctorRequestDto),
  asyncHandler(async (req, res) => {
    const { hospitalId, userId } = getHospitalAndUser(req as AuthenticatedRequest);
    const body = req.body as CreateDoctorRequestDto;

    const doctor = await prisma.doctor.create({
      data: {
        hospitalId,
        name: body.name.trim(),
        specialization: body.specialization?.trim() || null,
        isActive: true,
      },
      select: doctorSelect,
    });

    await prisma.auditLog.create({
      data: {
        hospitalId,
        userId,
        actor: userId,
        entityType: 'Doctor',
        entityId: doctor.id,
        changesJson: toJsonValue({ operation: 'create', after: doctor }),
        purpose: 'Doctor registration',
        timestamp: new Date(),
      },
    });

    // Invalidate the doctors cache for this hospital so the new doctor appears immediately
    const cache = redisSchema(hospitalId, 'appointments');
    await cache.del('doctors:active');

    res.status(201).json({
      success: true,
      message: 'Doctor created successfully',
      doctor,
    });
  })
);

router.patch(
  '/:id/status',
  authenticate,
  authorize('ADMIN', 'DOCTOR', 'RECEPTIONIST'),
  validateRequest(UpdateAppointmentStatusRequestDto),
  asyncHandler(async (req, res) => {
    const { hospitalId, userId } = getHospitalAndUser(req as AuthenticatedRequest);
    const id = req.params.id;
    const { status } = req.body as UpdateAppointmentStatusRequestDto;

    const existing = await prisma.appointment.findFirst({
      where: { id, hospitalId },
      select: appointmentSelect,
    });

    if (!existing) {
      throw new NotFoundError('Appointment not found');
    }

    const appointment = await prisma.appointment.update({
      where: { id },
      data: { status },
      select: appointmentSelect,
    });

    await logAppointmentAudit({
      req: req as AuthenticatedRequest,
      hospitalId,
      userId,
      appointmentId: appointment.id,
      operation: 'status_update',
      before: { status: existing.status },
      after: { status: appointment.status },
    });

    res.status(200).json({
      success: true,
      message: 'Appointment status updated',
      appointment,
    });
  })
);

router.get(
  '/availability',
  authenticate,
  authorize('ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST'),
  asyncHandler(async (req, res) => {
    const { hospitalId } = getHospitalAndUser(req as AuthenticatedRequest);
    const doctorId = typeof req.query.doctorId === 'string' ? req.query.doctorId : '';
    const date = typeof req.query.date === 'string' ? req.query.date : '';

    if (!doctorId) {
      throw new ValidationError('doctorId is required');
    }
    if (!date) {
      throw new ValidationError('date is required');
    }

    const doctor = await prisma.doctor.findFirst({
      where: { id: doctorId, hospitalId, isActive: true },
      select: { id: true },
    });
    if (!doctor) {
      throw new NotFoundError('Doctor not found for this hospital');
    }

    const { start, end } = normalizeDateFilter(date);

    const bookings = await prisma.appointment.findMany({
      where: {
        hospitalId,
        doctorId,
        status: { not: AppointmentStatus.CANCELLED },
        scheduledAt: {
          gte: start,
          lt: end,
        },
      },
      select: { scheduledAt: true },
      orderBy: { scheduledAt: 'asc' },
    });

    const bookedSlots = new Set(bookings.map((booking) => booking.scheduledAt.toISOString()));
    const openSlots: string[] = [];

    const workingStart = new Date(start);
    workingStart.setUTCHours(9, 0, 0, 0);
    const workingEnd = new Date(start);
    workingEnd.setUTCHours(17, 0, 0, 0);

    for (let slot = workingStart.getTime(); slot < workingEnd.getTime(); slot += SLOT_MS) {
      const iso = new Date(slot).toISOString();
      if (!bookedSlots.has(iso)) {
        openSlots.push(iso);
      }
    }

    res.status(200).json({
      doctorId,
      date,
      slotMinutes: SLOT_MINUTES,
      openSlots,
    });
  })
);

export { router as appointmentsRouter };
