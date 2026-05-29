import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../prisma/client', () => ({
  prisma: {
    doctor: {
      findFirst: vi.fn(),
    },
    patient: {
      findFirst: vi.fn(),
    },
    appointment: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

import { createApp } from '../app.js';
import { prisma } from '../prisma/client.js';

const mockedPrisma = prisma as unknown as {
  doctor: { findFirst: ReturnType<typeof vi.fn> };
  patient: { findFirst: ReturnType<typeof vi.fn> };
  appointment: {
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  auditLog: { create: ReturnType<typeof vi.fn> };
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

const baseAppointment = {
  id: '11111111-1111-4111-8111-111111111111',
  patientId: '22222222-2222-4222-8222-222222222222',
  doctorId: '33333333-3333-4333-8333-333333333333',
  hospitalId: 'hospital-1',
  scheduledAt: new Date('2099-01-01T10:00:00.000Z'),
  status: 'SCHEDULED',
  notes: null,
  createdAt: new Date('2099-01-01T09:00:00.000Z'),
  updatedAt: new Date('2099-01-01T09:00:00.000Z'),
  patient: { id: '22222222-2222-4222-8222-222222222222', mrn: 'MRN-1', name: 'Test Patient' },
  doctor: { id: '33333333-3333-4333-8333-333333333333', name: 'Test Doctor', specialization: 'General' },
};

describe('Appointments API', () => {
  beforeEach(() => {
    mockedPrisma.doctor.findFirst.mockReset();
    mockedPrisma.patient.findFirst.mockReset();
    mockedPrisma.appointment.findFirst.mockReset();
    mockedPrisma.appointment.findMany.mockReset();
    mockedPrisma.appointment.create.mockReset();
    mockedPrisma.appointment.update.mockReset();
    mockedPrisma.auditLog.create.mockReset();
  });

  it('creates an appointment and writes an audit log', async () => {
    const app = createApp();
    const token = signToken('RECEPTIONIST');

    mockedPrisma.doctor.findFirst.mockResolvedValue({ id: '33333333-3333-4333-8333-333333333333' });
    mockedPrisma.patient.findFirst.mockResolvedValue({ id: '22222222-2222-4222-8222-222222222222' });
    mockedPrisma.appointment.findFirst.mockResolvedValue(null);
    mockedPrisma.appointment.create.mockResolvedValue(baseAppointment);
    mockedPrisma.auditLog.create.mockResolvedValue({ id: 'audit-1' });

    const response = await request(app)
      .post('/api/appointments')
      .set('Cookie', `token=${token}`)
      .send({
        doctorId: '33333333-3333-4333-8333-333333333333',
        patientId: '22222222-2222-4222-8222-222222222222',
        scheduledAt: '2099-01-01T10:11:00.000Z',
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(mockedPrisma.appointment.create).toHaveBeenCalledTimes(1);
    expect(mockedPrisma.appointment.create.mock.calls[0][0].data.scheduledAt.toISOString()).toBe(
      '2099-01-01T10:00:00.000Z'
    );
    expect(mockedPrisma.auditLog.create).toHaveBeenCalledTimes(1);
  });

  it('prevents double booking and returns 409', async () => {
    const app = createApp();
    const token = signToken('RECEPTIONIST');

    mockedPrisma.doctor.findFirst.mockResolvedValue({ id: '33333333-3333-4333-8333-333333333333' });
    mockedPrisma.patient.findFirst.mockResolvedValue({ id: '22222222-2222-4222-8222-222222222222' });
    mockedPrisma.appointment.findFirst.mockResolvedValue({
      id: 'appointment-existing',
      scheduledAt: new Date('2099-01-01T10:00:00.000Z'),
    });

    const response = await request(app)
      .post('/api/appointments')
      .set('Cookie', `token=${token}`)
      .send({
        doctorId: '33333333-3333-4333-8333-333333333333',
        patientId: '22222222-2222-4222-8222-222222222222',
        scheduledAt: '2099-01-01T10:20:00.000Z',
      });

    expect(response.status).toBe(409);
    expect(mockedPrisma.appointment.create).not.toHaveBeenCalled();
  });

  it('returns availability as open 30-minute slots', async () => {
    const app = createApp();
    const token = signToken('DOCTOR');

    mockedPrisma.doctor.findFirst.mockResolvedValue({ id: 'doctor-1' });
    mockedPrisma.appointment.findMany.mockResolvedValue([
      { scheduledAt: new Date('2099-01-01T09:30:00.000Z') },
    ]);

    const response = await request(app)
      .get('/api/appointments/availability?doctorId=doctor-1&date=2099-01-01')
      .set('Cookie', `token=${token}`);

    expect(response.status).toBe(200);
    expect(response.body.slotMinutes).toBe(30);
    expect(response.body.openSlots).not.toContain('2099-01-01T09:30:00.000Z');
    expect(response.body.openSlots).toContain('2099-01-01T09:00:00.000Z');
  });

  it('applies tenant context in list queries', async () => {
    const app = createApp();
    const token = signToken('NURSE', 'hospital-tenant-2');

    mockedPrisma.appointment.findMany.mockResolvedValue([]);

    const response = await request(app)
      .get('/api/appointments?date=2099-01-01')
      .set('Cookie', `token=${token}`);

    expect(response.status).toBe(200);
    expect(mockedPrisma.appointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          hospitalId: 'hospital-tenant-2',
        }),
      })
    );
  });

  it('updates status and audits the change', async () => {
    const app = createApp();
    const token = signToken('DOCTOR');

    mockedPrisma.appointment.findFirst.mockResolvedValue(baseAppointment);
    mockedPrisma.appointment.update.mockResolvedValue({
      ...baseAppointment,
      status: 'COMPLETED',
    });
    mockedPrisma.auditLog.create.mockResolvedValue({ id: 'audit-2' });

    const response = await request(app)
      .patch('/api/appointments/appointment-1/status')
      .set('Cookie', `token=${token}`)
      .send({ status: 'COMPLETED' });

    expect(response.status).toBe(200);
    expect(response.body.appointment.status).toBe('COMPLETED');
    expect(mockedPrisma.auditLog.create).toHaveBeenCalledTimes(1);
  });
});
