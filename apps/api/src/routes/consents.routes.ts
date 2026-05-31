import { IsArray, IsDateString, IsOptional, IsString, MinLength } from 'class-validator';
import { Prisma } from '@prisma/client';
import { Router } from 'express';
import { getRequestContext } from '../context/requestContext.js';
import { NotFoundError, ValidationError } from '../errors/customErrors.js';
import { authenticate, type AuthenticatedRequest } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { prisma } from '../prisma/client.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

const consentSelect = {
  id: true,
  purpose: true,
  grantedAt: true,
  revokedAt: true,
  status: true,
  dataTypes: true,
  expiryAt: true,
  patientId: true,
  hospitalId: true,
  patient: {
    select: {
      id: true,
      mrn: true,
      name: true,
    },
  },
} as const;

const toJsonValue = (value: unknown): Prisma.InputJsonValue => {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
};

const isMissingColumnError = (error: unknown): boolean =>
  (error as { code?: unknown } | null)?.code === 'P2022' ||
  (typeof (error as { message?: unknown } | null)?.message === 'string' &&
    ((error as { message?: string }).message?.includes('does not exist in the current database') ??
      false));

const updatePatientConsentSnapshot = async (
  patientId: string,
  data: Prisma.PatientUpdateInput
): Promise<void> => {
  try {
    await prisma.patient.update({
      where: { id: patientId },
      data,
      select: { id: true },
    });
  } catch (error) {
    // Older databases may not have the newer consent snapshot columns yet.
    if (!isMissingColumnError(error)) {
      throw error;
    }
  }
};

const logConsentAudit = async ({
  req,
  hospitalId,
  userId,
  entityId,
  operation,
  before,
  after,
  purpose,
}: {
  req: AuthenticatedRequest;
  hospitalId: string;
  userId: string;
  entityId: string;
  operation: 'grant' | 'withdraw';
  before: unknown;
  after: unknown;
  purpose?: string;
}) => {
  const context = getRequestContext();

  await prisma.auditLog.create({
    data: {
      hospitalId,
      userId,
      actor: context?.actor ?? userId,
      entityType: 'ConsentRecord',
      entityId,
      changesJson: toJsonValue({
        operation,
        before,
        after,
      }),
      consentVersion: context?.consentVersion ?? req.header('x-consent-version') ?? null,
      purpose: purpose ?? context?.purpose ?? null,
      retentionPolicy: context?.retentionPolicy ?? req.header('x-retention-policy') ?? null,
      ipAddress: context?.ipAddress ?? req.ip ?? null,
      userAgent: context?.userAgent ?? req.get('user-agent') ?? null,
      timestamp: new Date(),
    },
  });
};

const withConsentMetadata = <T extends { [key: string]: unknown }>(record: T) => {
  const parsed = record as T & {
    dataTypes?: unknown;
    expiryAt?: unknown;
  };

  return {
    ...record,
    dataTypes: Array.isArray(parsed.dataTypes) ? parsed.dataTypes : [],
    expiryAt:
      parsed.expiryAt instanceof Date || typeof parsed.expiryAt === 'string'
        ? parsed.expiryAt
        : null,
  };
};

type ConsentRow = {
  id: string;
  purpose: string;
  grantedAt: Date;
  revokedAt: Date | null;
  status: 'GRANTED' | 'REVOKED';
  patientId: string;
  hospitalId: string;
  patient: {
    id: string;
    mrn: string;
    name: string;
  };
};

const listConsents = async (hospitalId: string): Promise<ConsentRow[]> => {
  try {
    return await prisma.consentRecord.findMany({
      where: { hospitalId },
      orderBy: { grantedAt: 'desc' },
      select: consentSelect,
      take: 200,
    });
  } catch (error) {
    if (!isMissingColumnError(error)) {
      throw error;
    }

    const rows = await prisma.$queryRaw<
      Array<{
        id: string;
        purpose: string;
        grantedAt: Date;
        revokedAt: Date | null;
        status: 'GRANTED' | 'REVOKED';
        patientId: string;
        hospitalId: string;
        patient_id: string;
        patient_mrn: string;
        patient_name: string;
      }>
    >(Prisma.sql`
      SELECT
        c."id",
        c."purpose",
        c."grantedAt",
        c."revokedAt",
        c."status",
        c."patientId",
        c."hospitalId",
        p."id" AS "patient_id",
        p."mrn" AS "patient_mrn",
        p."name" AS "patient_name"
      FROM "ConsentRecord" c
      INNER JOIN "Patient" p ON p."id" = c."patientId"
      WHERE c."hospitalId" = ${hospitalId}
      ORDER BY c."grantedAt" DESC
      LIMIT 200
    `);

    return rows.map((row) => ({
      id: row.id,
      purpose: row.purpose,
      grantedAt: row.grantedAt,
      revokedAt: row.revokedAt,
      status: row.status,
      patientId: row.patientId,
      hospitalId: row.hospitalId,
      patient: {
        id: row.patient_id,
        mrn: row.patient_mrn,
        name: row.patient_name,
      },
    }));
  }
};

class GrantConsentRequestDto {
  @IsString()
  @MinLength(1)
  patientId!: string;

  @IsString()
  @MinLength(2)
  purpose!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dataTypes?: string[];

  @IsOptional()
  @IsDateString()
  expiryAt?: string;
}

router.get(
  '/',
  authenticate,
  authorize('ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST'),
  asyncHandler(async (req, res) => {
    const { hospitalId } = (req as AuthenticatedRequest).user ?? {};
    if (!hospitalId) {
      throw new ValidationError('Hospital context missing');
    }

    const records = await listConsents(hospitalId);

    res.status(200).json({ consents: records.map((record) => withConsentMetadata(record)) });
  })
);

router.post(
  '/',
  authenticate,
  authorize('ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST'),
  validateRequest(GrantConsentRequestDto),
  asyncHandler(async (req, res) => {
    const authUser = (req as AuthenticatedRequest).user;
    const hospitalId = authUser?.hospitalId;
    const userId = authUser?.userId;
    if (!hospitalId || !userId) {
      throw new ValidationError('Hospital context missing');
    }

    const { patientId, purpose, dataTypes = [], expiryAt } = req.body as GrantConsentRequestDto;

    const patient = await prisma.patient.findFirst({
      where: {
        id: patientId,
        hospitalId,
      },
      select: { id: true },
    });

    if (!patient) {
      throw new NotFoundError('Patient not found');
    }

    const consent = await prisma.consentRecord.create({
      data: {
        hospitalId,
        patientId,
        purpose: purpose.trim(),
        status: 'GRANTED',
        dataTypes,
        expiryAt: expiryAt ? new Date(expiryAt) : null,
      },
      select: consentSelect,
    });

    const consentVersion = req.header('x-consent-version') ?? null;
    await updatePatientConsentSnapshot(patientId, {
      consentStatus: 'GRANTED',
      consentPurpose: purpose.trim(),
      consentVersion,
      consentCapturedAt: new Date(),
      consentRevokedAt: null,
    });

    await logConsentAudit({
      req: req as AuthenticatedRequest,
      hospitalId,
      userId,
      entityId: consent.id,
      operation: 'grant',
      before: null,
      after: {
        id: consent.id,
        patientId: consent.patientId,
        purpose: consent.purpose,
        status: consent.status,
        dataTypes,
        expiryAt: expiryAt ?? null,
        grantedAt: consent.grantedAt,
      },
      purpose: consent.purpose,
    });

    res.status(201).json({
      success: true,
      message: 'Consent granted',
      consent: withConsentMetadata(consent),
    });
  })
);

const withdrawConsentHandler = asyncHandler(async (req, res) => {
  const authUser = (req as AuthenticatedRequest).user;
  const hospitalId = authUser?.hospitalId;
  const userId = authUser?.userId;
  if (!hospitalId || !userId) {
    throw new ValidationError('Hospital context missing');
  }

  const consentId = req.params.consentId;
  if (!consentId) {
    throw new ValidationError('Consent id is required');
  }

  const existing = await prisma.consentRecord.findFirst({
    where: {
      id: consentId,
      hospitalId,
    },
    select: consentSelect,
  });

  if (!existing) {
    throw new NotFoundError('Consent not found');
  }

  if (existing.status === 'REVOKED') {
    return res.status(200).json({
      success: true,
      message: 'Consent already withdrawn',
      consent: withConsentMetadata(existing),
    });
  }

  const consent = await prisma.consentRecord.update({
    where: { id: consentId },
    data: {
      status: 'REVOKED',
      revokedAt: new Date(),
    },
    select: consentSelect,
  });

  await updatePatientConsentSnapshot(consent.patientId, {
    consentStatus: 'REVOKED',
    consentPurpose: consent.purpose,
    consentRevokedAt: consent.revokedAt ?? new Date(),
  });

  await logConsentAudit({
    req: req as AuthenticatedRequest,
    hospitalId,
    userId,
    entityId: consent.id,
    operation: 'withdraw',
    before: {
      id: existing.id,
      patientId: existing.patientId,
      purpose: existing.purpose,
      status: existing.status,
      revokedAt: existing.revokedAt,
    },
    after: {
      id: consent.id,
      patientId: consent.patientId,
      purpose: consent.purpose,
      status: consent.status,
      revokedAt: consent.revokedAt,
    },
    purpose: consent.purpose,
  });

  res.status(200).json({
    success: true,
    message: 'Consent withdrawn',
    consent: withConsentMetadata(consent),
  });
});

router.patch(
  '/:consentId/revoke',
  authenticate,
  authorize('ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST'),
  withdrawConsentHandler
);

router.patch(
  '/:consentId/withdraw',
  authenticate,
  authorize('ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST'),
  withdrawConsentHandler
);

export { router as consentsRouter };
