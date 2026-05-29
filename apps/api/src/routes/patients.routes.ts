import { ConsentStatus, Gender, PatientType, Prisma } from '@prisma/client';
import { IsBoolean, IsEmail, IsEnum, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { randomUUID } from 'crypto';
import { Router } from 'express';
import { AuthError, NotFoundError, ValidationError } from '../errors/customErrors.js';
import { authenticate, type AuthenticatedRequest } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { prisma } from '../prisma/client.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { redisSchema } from '../utils/redis-schema.js';

// Cache TTL constants
const PATIENTS_CACHE_TTL_SECONDS = 5 * 60; // 5 minutes

const router = Router();

const patientSelect = {
  id: true,
  mrn: true,
  name: true,
  age: true,
  gender: true,
  phone: true,
  email: true,
  address: true,
  patientType: true,
  hospitalId: true,
  createdAt: true,
  updatedAt: true,
} as const;

class CreatePatientRequestDto {
  @IsString()
  @MinLength(2)
  mrn!: string;

  @IsOptional()
  @IsString()
  aadhaarNumber?: string;

  @IsString()
  @MinLength(2)
  name!: string;

  @IsInt()
  @Min(0)
  age!: number;

  @IsEnum(Gender)
  gender!: Gender;

  @IsString()
  @MinLength(7)
  phone!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  address?: string;

  @IsOptional()
  @IsString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  bloodGroup?: string;

  @IsOptional()
  @IsString()
  emergencyContactName?: string;

  @IsOptional()
  @IsString()
  @MinLength(7)
  emergencyContactPhone?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsEnum(ConsentStatus)
  consentStatus?: ConsentStatus;

  @IsOptional()
  @IsString()
  consentPurpose?: string;

  @IsOptional()
  @IsString()
  consentVersion?: string;

  @IsOptional()
  @IsString()
  consentCapturedAt?: string;

  @IsOptional()
  @IsString()
  consentRevokedAt?: string;

  @IsEnum(PatientType)
  patientType!: PatientType;
}

class UpdatePatientRequestDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  mrn?: string;

  @IsOptional()
  @IsString()
  aadhaarNumber?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  age?: number;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @IsString()
  @MinLength(7)
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  address?: string;

  @IsOptional()
  @IsString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  bloodGroup?: string;

  @IsOptional()
  @IsString()
  emergencyContactName?: string;

  @IsOptional()
  @IsString()
  @MinLength(7)
  emergencyContactPhone?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsEnum(ConsentStatus)
  consentStatus?: ConsentStatus;

  @IsOptional()
  @IsString()
  consentPurpose?: string;

  @IsOptional()
  @IsString()
  consentVersion?: string;

  @IsOptional()
  @IsString()
  consentCapturedAt?: string;

  @IsOptional()
  @IsString()
  consentRevokedAt?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsEnum(PatientType)
  patientType?: PatientType;
}

const getHospitalId = (req: AuthenticatedRequest): string => {
  const hospitalId = req.user?.hospitalId;
  if (!hospitalId) {
    throw new AuthError('Unauthorized');
  }
  return hospitalId;
};

const normalizeIndianMobile = (value: string, fieldName: string): string => {
  const digitsOnly = value.replace(/\D/g, '');
  const withoutCountryCode =
    digitsOnly.length === 12 && digitsOnly.startsWith('91')
      ? digitsOnly.slice(2)
      : digitsOnly;

  if (!/^[6-9]\d{9}$/.test(withoutCountryCode)) {
    throw new ValidationError(`${fieldName} must be a valid Indian mobile number`);
  }

  return `+91${withoutCountryCode}`;
};

const normalizeEmail = (value?: string): string | undefined => {
  if (value === undefined) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(normalized)) {
    throw new ValidationError('email must be a valid email address');
  }

  return normalized;
};

const isUniqueViolation = (error: unknown): boolean => {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
};

const isMissingColumnError = (error: unknown): boolean => {
  const code = (error as { code?: unknown } | null)?.code;
  const message = (error as { message?: unknown } | null)?.message;
  return (
    code === 'P2022' ||
    (typeof message === 'string' && message.includes('does not exist in the current database'))
  );
};

router.get(
  '/',
  authenticate,
  authorize('ADMIN', 'DOCTOR', 'STAFF'),
  asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req as AuthenticatedRequest);
    const search =
      typeof req.query.search === 'string'
        ? req.query.search.trim()
        : typeof req.query.q === 'string'
          ? req.query.q.trim()
          : '';

    const cache = redisSchema(hospitalId, 'patients');
    const cacheKey = `list:${search || 'all'}`;

    // Try cache first
    const cached = await cache.getJson<typeof patientSelect[]>(cacheKey);
    if (cached !== null) {
      return res.status(200).json({ patients: cached, fromCache: true });
    }

    const patients = await prisma.patient.findMany({
      where: {
        hospitalId,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: patientSelect,
    });

    // Store in cache
    await cache.setJson(cacheKey, patients, PATIENTS_CACHE_TTL_SECONDS);

    return res.status(200).json({ patients, fromCache: false });
  })
);

router.get(
  '/:id',
  authenticate,
  authorize('ADMIN', 'DOCTOR', 'STAFF'),
  asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req as AuthenticatedRequest);
    const id = req.params.id;

    const patient = await prisma.patient.findFirst({
      where: { id, hospitalId },
      select: patientSelect,
    });

    if (!patient) {
      throw new NotFoundError('Patient not found');
    }

    res.status(200).json({ patient });
  })
);

router.post(
  '/',
  authenticate,
  authorize('ADMIN', 'DOCTOR', 'STAFF'),
  validateRequest(CreatePatientRequestDto),
  asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req as AuthenticatedRequest);
    const body = req.body as CreatePatientRequestDto;
    const phone = normalizeIndianMobile(body.phone, 'phone');
    const email = normalizeEmail(body.email);
    const normalizedAddress = body.address?.trim();

    try {
      let patient;
      try {
        patient = await prisma.patient.create({
          data: {
            hospitalId,
            mrn: body.mrn.trim(),
            name: body.name.trim(),
            age: body.age,
            gender: body.gender,
            phone,
            email,
            address: normalizedAddress,
            patientType: body.patientType,
          },
          select: patientSelect,
        });
      } catch (error) {
        if (!isMissingColumnError(error)) {
          throw error;
        }

        const fallbackRows = await prisma.$queryRaw<
          Array<{
            id: string;
            mrn: string;
            name: string;
            age: number;
            gender: Gender;
            phone: string;
            email: string | null;
            address: string | null;
            patientType: PatientType;
            hospitalId: string;
            createdAt: Date;
            updatedAt: Date;
          }>
        >(Prisma.sql`
          INSERT INTO "Patient" (
            "id",
            "mrn",
            "name",
            "age",
            "gender",
            "phone",
            "email",
            "address",
            "patientType",
            "hospitalId",
            "createdAt",
            "updatedAt"
          )
          VALUES (
            ${randomUUID()},
            ${body.mrn.trim()},
            ${body.name.trim()},
            ${body.age},
            ${body.gender}::"Gender",
            ${phone},
            ${email ?? null},
            ${normalizedAddress ?? null},
            ${body.patientType}::"PatientType",
            ${hospitalId},
            NOW(),
            NOW()
          )
          RETURNING
            "id",
            "mrn",
            "name",
            "age",
            "gender",
            "phone",
            "email",
            "address",
            "patientType",
            "hospitalId",
            "createdAt",
            "updatedAt"
        `);

        patient = fallbackRows[0];
        if (!patient) {
          throw new ValidationError('Failed to create patient');
        }
      }

      // Invalidate patients cache for this hospital
      const cache = redisSchema(hospitalId, 'patients');
      await cache.clear();

      res.status(201).json({
        success: true,
        message: 'Patient created successfully',
        patient,
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ValidationError('MRN or Aadhaar number already exists for this hospital');
      }
      throw error;
    }
  })
);

router.patch(
  '/:id',
  authenticate,
  authorize('ADMIN', 'DOCTOR', 'STAFF'),
  validateRequest(UpdatePatientRequestDto),
  asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req as AuthenticatedRequest);
    const id = req.params.id;
    const body = req.body as UpdatePatientRequestDto;
    const phone =
      body.phone !== undefined ? normalizeIndianMobile(body.phone, 'phone') : undefined;
    const email = body.email !== undefined ? normalizeEmail(body.email) : undefined;

    const existing = await prisma.patient.findFirst({
      where: { id, hospitalId },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundError('Patient not found');
    }

    try {
      const patient = await prisma.patient.update({
        where: { id },
        data: {
          ...(body.mrn !== undefined ? { mrn: body.mrn.trim() } : {}),
          ...(body.name !== undefined ? { name: body.name.trim() } : {}),
          ...(body.age !== undefined ? { age: body.age } : {}),
          ...(body.gender !== undefined ? { gender: body.gender } : {}),
          ...(body.phone !== undefined ? { phone } : {}),
          ...(body.email !== undefined ? { email: email ?? null } : {}),
          ...(body.address !== undefined ? { address: body.address.trim() } : {}),
          ...(body.patientType !== undefined ? { patientType: body.patientType } : {}),
        },
        select: patientSelect,
      });

      // Invalidate patients cache for this hospital
      const cache = redisSchema(hospitalId, 'patients');
      await cache.clear();

      res.status(200).json({
        success: true,
        message: 'Patient updated successfully',
        patient,
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ValidationError('MRN or Aadhaar number already exists for this hospital');
      }
      throw error;
    }
  })
);

router.delete(
  '/:id',
  authenticate,
  authorize('ADMIN', 'DOCTOR'),
  asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req as AuthenticatedRequest);
    const id = req.params.id;

    const existing = await prisma.patient.findFirst({
      where: { id, hospitalId },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundError('Patient not found');
    }

      const patient = await prisma.patient.delete({
      where: { id },
      select: patientSelect,
    });

    // Invalidate patients cache for this hospital
    const cache = redisSchema(hospitalId, 'patients');
    await cache.clear();

    res.status(200).json({
      success: true,
      message: 'Patient deleted successfully',
      patient,
    });
  })
);

export { router as patientsRouter };
