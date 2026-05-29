import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const txCreateVisit = vi.fn();
const txUpdateAppointment = vi.fn();
const { enqueuePrescriptionPdfGeneration } = vi.hoisted(() => ({
  enqueuePrescriptionPdfGeneration: vi.fn(),
}));

vi.mock('../prisma/client', () => ({
  prisma: {
    appointment: {
      findFirst: vi.fn(),
    },
    visit: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    prescription: {
      create: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        visit: {
          create: txCreateVisit,
        },
        appointment: {
          update: txUpdateAppointment,
        },
      })
    ),
  },
}));

vi.mock('../queue/queues.js', () => ({
  enqueuePrescriptionPdfGeneration,
}));

import { createApp } from '../app.js';
import { prisma } from '../prisma/client.js';

const mockedPrisma = prisma as unknown as {
  appointment: { findFirst: ReturnType<typeof vi.fn> };
  visit: {
    findFirst: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  prescription: { create: ReturnType<typeof vi.fn> };
  auditLog: { create: ReturnType<typeof vi.fn> };
  $transaction: ReturnType<typeof vi.fn>;
};

const signToken = (role: string, tenantId = 'hospital-1'): string => {
  const secret = process.env.ACCESS_TOKEN_SECRET ?? process.env.JWT_SECRET ?? 'test-jwt-secret';
  return jwt.sign(
    {
      userId: 'user-1',
      role,
      tenantId,
    },
    secret
  );
};

const visitRecord = {
  id: 'visit-1',
  chiefComplaint: 'Fever',
  diagnosis: 'Viral fever',
  notes: 'Hydration advised',
  visitedAt: new Date('2099-01-01T10:00:00.000Z'),
  hospitalId: 'hospital-1',
  appointmentId: 'appointment-1',
  patientId: 'patient-1',
  doctorId: 'doctor-1',
  createdAt: new Date('2099-01-01T10:00:00.000Z'),
  updatedAt: new Date('2099-01-01T10:00:00.000Z'),
  patient: { id: 'patient-1', mrn: 'MRN-1', name: 'Patient One' },
  doctor: { id: 'doctor-1', name: 'Doctor One', specialization: 'General Medicine' },
  appointment: {
    id: 'appointment-1',
    scheduledAt: new Date('2099-01-01T09:30:00.000Z'),
    status: 'COMPLETED',
  },
  prescriptions: [],
};

describe('Visits API', () => {
  beforeEach(() => {
    mockedPrisma.appointment.findFirst.mockReset();
    mockedPrisma.visit.findFirst.mockReset();
    mockedPrisma.visit.update.mockReset();
    mockedPrisma.prescription.create.mockReset();
    mockedPrisma.auditLog.create.mockReset();
    enqueuePrescriptionPdfGeneration.mockReset();
    mockedPrisma.$transaction.mockClear();
    txCreateVisit.mockReset();
    txUpdateAppointment.mockReset();
  });

  it('creates visit linked to appointment and marks appointment completed', async () => {
    const app = createApp();
    const token = signToken('DOCTOR');

    mockedPrisma.appointment.findFirst.mockResolvedValue({
      id: 'appointment-1',
      hospitalId: 'hospital-1',
      patientId: 'patient-1',
      doctorId: 'doctor-1',
      status: 'SCHEDULED',
    });
    mockedPrisma.visit.findFirst.mockResolvedValueOnce(null);
    txCreateVisit.mockResolvedValue(visitRecord);
    txUpdateAppointment.mockResolvedValue({ id: 'appointment-1' });
    mockedPrisma.auditLog.create.mockResolvedValue({ id: 'audit-visit-1' });

    const response = await request(app)
      .post('/api/visits')
      .set('Cookie', `token=${token}`)
      .send({
        appointmentId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        chiefComplaint: 'Fever',
        diagnosis: 'Viral fever',
      });

    expect(response.status).toBe(201);
    expect(mockedPrisma.$transaction).toHaveBeenCalledTimes(1);
    expect(txUpdateAppointment).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'COMPLETED' }),
      })
    );
    expect(mockedPrisma.auditLog.create).toHaveBeenCalledTimes(1);
  });

  it('returns 404 when appointment does not belong to same hospital', async () => {
    const app = createApp();
    const token = signToken('DOCTOR', 'hospital-a');

    mockedPrisma.appointment.findFirst.mockResolvedValue(null);

    const response = await request(app)
      .post('/api/visits')
      .set('Cookie', `token=${token}`)
      .send({
        appointmentId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        chiefComplaint: 'Headache',
      });

    expect(response.status).toBe(404);
    expect(mockedPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('adds prescription to visit and audits the operation', async () => {
    const app = createApp();
    const token = signToken('DOCTOR');

    mockedPrisma.visit.findFirst.mockResolvedValue({ id: 'visit-1' });
    mockedPrisma.prescription.create.mockResolvedValue({
      id: 'prescription-1',
      medication: 'Paracetamol',
      dosage: '500mg',
      frequency: 'Twice daily',
      durationDays: 5,
      instructions: null,
      hospitalId: 'hospital-1',
      visitId: 'visit-1',
      createdAt: new Date('2099-01-01T10:00:00.000Z'),
      updatedAt: new Date('2099-01-01T10:00:00.000Z'),
    });
    enqueuePrescriptionPdfGeneration.mockResolvedValue('hospital-1__prescription-1');
    mockedPrisma.auditLog.create.mockResolvedValue({ id: 'audit-rx-1' });

    const response = await request(app)
      .post('/api/visits/visit-1/prescription')
      .set('Cookie', `token=${token}`)
      .send({
        medication: 'Paracetamol',
        dosage: '500mg',
        frequency: 'Twice daily',
        durationDays: 5,
      });

    expect(response.status).toBe(202);
    expect(mockedPrisma.prescription.create).toHaveBeenCalledTimes(1);
    expect(enqueuePrescriptionPdfGeneration).toHaveBeenCalledTimes(1);
    expect(response.body.jobId).toBe('hospital-1__prescription-1');
    expect(mockedPrisma.auditLog.create).toHaveBeenCalledTimes(1);
  });

  it('returns full visit details including prescription', async () => {
    const app = createApp();
    const token = signToken('NURSE');

    mockedPrisma.visit.findFirst.mockResolvedValue({
      ...visitRecord,
      prescriptions: [
        {
          id: 'prescription-1',
          medication: 'Paracetamol',
          dosage: '500mg',
          frequency: 'Twice daily',
          durationDays: 5,
          instructions: null,
          hospitalId: 'hospital-1',
          visitId: 'visit-1',
          createdAt: new Date('2099-01-01T10:00:00.000Z'),
          updatedAt: new Date('2099-01-01T10:00:00.000Z'),
        },
      ],
    });

    const response = await request(app)
      .get('/api/visits/visit-1')
      .set('Cookie', `token=${token}`);

    expect(response.status).toBe(200);
    expect(response.body.visit.patient.name).toBe('Patient One');
    expect(response.body.visit.doctor.name).toBe('Doctor One');
    expect(response.body.visit.prescriptions).toHaveLength(1);
  });
});
