import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const txLabOrderCreate = vi.fn();
const txLabOrderFindFirst = vi.fn();
const txLabOrderUpdate = vi.fn();
const txLabResultFindFirst = vi.fn();
const txLabResultUpsert = vi.fn();

vi.mock('../prisma/client', () => ({
  prisma: {
    patient: {
      findFirst: vi.fn(),
    },
    doctor: {
      findFirst: vi.fn(),
    },
    visit: {
      findFirst: vi.fn(),
    },
    labTest: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    labOrder: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    labResult: {
      findFirst: vi.fn(),
      upsert: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        labOrder: {
          create: txLabOrderCreate,
          findFirst: txLabOrderFindFirst,
          update: txLabOrderUpdate,
        },
        labResult: {
          findFirst: txLabResultFindFirst,
          upsert: txLabResultUpsert,
        },
      })
    ),
  },
}));

import { createApp } from '../app.js';
import { prisma } from '../prisma/client.js';

const mockedPrisma = prisma as unknown as {
  patient: { findFirst: ReturnType<typeof vi.fn> };
  doctor: { findFirst: ReturnType<typeof vi.fn> };
  visit: { findFirst: ReturnType<typeof vi.fn> };
  labTest: { findFirst: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn> };
  labOrder: { findFirst: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn> };
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

describe('Labs API', () => {
  beforeEach(() => {
    mockedPrisma.patient.findFirst.mockReset();
    mockedPrisma.doctor.findFirst.mockReset();
    mockedPrisma.visit.findFirst.mockReset();
    mockedPrisma.labTest.findFirst.mockReset();
    mockedPrisma.labTest.findMany.mockReset();
    mockedPrisma.labOrder.findFirst.mockReset();
    mockedPrisma.labOrder.findMany.mockReset();
    mockedPrisma.auditLog.create.mockReset();
    mockedPrisma.$transaction.mockClear();

    txLabOrderCreate.mockReset();
    txLabOrderFindFirst.mockReset();
    txLabOrderUpdate.mockReset();
    txLabResultFindFirst.mockReset();
    txLabResultUpsert.mockReset();
  });

  it('creates a lab order and audits the operation', async () => {
    const app = createApp();
    const token = signToken('DOCTOR');

    mockedPrisma.patient.findFirst.mockResolvedValue({ id: '11111111-1111-4111-8111-111111111111' });
    mockedPrisma.doctor.findFirst.mockResolvedValue({ id: '22222222-2222-4222-8222-222222222222' });
    mockedPrisma.labTest.findFirst.mockResolvedValue({
      id: '33333333-3333-4333-8333-333333333333',
      defaultUnit: 'mg/dL',
      referenceRange: '70-110',
    });
    txLabOrderCreate.mockResolvedValue({
      id: '44444444-4444-4444-8444-444444444444',
      orderNumber: 'LAB-20260508-090001-123',
      priority: 'ROUTINE',
      status: 'ORDERED',
      notes: 'Fasting sample',
      clinicalNotes: null,
      orderedAt: new Date('2026-05-08T09:00:01.000Z'),
      collectedAt: null,
      completedAt: null,
      hospitalId: 'hospital-1',
      patientId: '11111111-1111-4111-8111-111111111111',
      doctorId: '22222222-2222-4222-8222-222222222222',
      visitId: null,
      labTestId: '33333333-3333-4333-8333-333333333333',
      createdAt: new Date('2026-05-08T09:00:01.000Z'),
      updatedAt: new Date('2026-05-08T09:00:01.000Z'),
      patient: {
        id: '11111111-1111-4111-8111-111111111111',
        mrn: 'MRN-001',
        name: 'Asha',
        age: 31,
        gender: 'FEMALE',
      },
      doctor: {
        id: '22222222-2222-4222-8222-222222222222',
        name: 'Dr. Rao',
        specialization: 'General Medicine',
      },
      labTest: {
        id: '33333333-3333-4333-8333-333333333333',
        code: 'GLU-F',
        name: 'Fasting Blood Glucose',
        category: 'Biochemistry',
        sampleType: 'Blood',
        defaultUnit: 'mg/dL',
        referenceRange: '70-110',
        instructions: '8 hour fasting',
      },
      result: null,
    });
    mockedPrisma.auditLog.create.mockResolvedValue({ id: 'audit-1' });

    const response = await request(app)
      .post('/api/labs/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        patientId: '11111111-1111-4111-8111-111111111111',
        doctorId: '22222222-2222-4222-8222-222222222222',
        labTestId: '33333333-3333-4333-8333-333333333333',
        notes: 'Fasting sample',
      });

    expect(response.status).toBe(201);
    expect(response.body.order.status).toBe('ORDERED');
    expect(mockedPrisma.auditLog.create).toHaveBeenCalledTimes(1);
  });

  it('lists active lab tests with tenant scoping', async () => {
    const app = createApp();
    const token = signToken('LAB_TECH');
    const labTestFindMany = (mockedPrisma as unknown as { labTest: { findMany: ReturnType<typeof vi.fn> } }).labTest.findMany;

    labTestFindMany.mockResolvedValue([
      {
        id: '33333333-3333-4333-8333-333333333333',
        code: 'GLU-F',
        name: 'Fasting Blood Glucose',
        category: 'Biochemistry',
        sampleType: 'Blood',
        defaultUnit: 'mg/dL',
        referenceRange: '70-110',
        instructions: null,
        isActive: true,
        hospitalId: 'hospital-1',
        createdAt: new Date('2026-05-08T09:00:01.000Z'),
        updatedAt: new Date('2026-05-08T09:00:01.000Z'),
      },
    ]);

    const response = await request(app)
      .get('/api/labs/tests')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.tests).toHaveLength(1);
    expect(labTestFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          hospitalId: 'hospital-1',
          isActive: true,
        }),
      })
    );
  });

  it('lists lab orders scoped to authenticated tenant', async () => {
    const app = createApp();
    const token = signToken('DOCTOR');

    mockedPrisma.labOrder.findMany.mockResolvedValue([
      {
        id: '44444444-4444-4444-8444-444444444444',
        orderNumber: 'LAB-20260508-090001-123',
        priority: 'ROUTINE',
        status: 'ORDERED',
        notes: null,
        clinicalNotes: null,
        orderedAt: new Date('2026-05-08T09:00:01.000Z'),
        collectedAt: null,
        completedAt: null,
        hospitalId: 'hospital-1',
        patientId: '11111111-1111-4111-8111-111111111111',
        doctorId: '22222222-2222-4222-8222-222222222222',
        visitId: null,
        labTestId: '33333333-3333-4333-8333-333333333333',
        createdAt: new Date('2026-05-08T09:00:01.000Z'),
        updatedAt: new Date('2026-05-08T09:00:01.000Z'),
        patient: { id: '11111111-1111-4111-8111-111111111111', mrn: 'MRN-001', name: 'Asha', age: 31, gender: 'FEMALE' },
        doctor: { id: '22222222-2222-4222-8222-222222222222', name: 'Dr. Rao', specialization: 'General Medicine' },
        labTest: {
          id: '33333333-3333-4333-8333-333333333333',
          code: 'GLU-F',
          name: 'Fasting Blood Glucose',
          category: 'Biochemistry',
          sampleType: 'Blood',
          defaultUnit: 'mg/dL',
          referenceRange: '70-110',
          instructions: null,
        },
        result: null,
      },
    ]);

    const response = await request(app)
      .get('/api/labs/orders?status=ORDERED')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.orders).toHaveLength(1);
    expect(mockedPrisma.labOrder.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          hospitalId: 'hospital-1',
          status: 'ORDERED',
        }),
      })
    );
  });

  it('updates a lab result and audits result + order status changes', async () => {
    const app = createApp();
    const token = signToken('LAB_TECH');

    const existingOrder = {
      id: '55555555-5555-4555-8555-555555555555',
      orderNumber: 'LAB-20260508-100000-111',
      priority: 'ROUTINE',
      status: 'ORDERED',
      notes: null,
      clinicalNotes: null,
      orderedAt: new Date('2026-05-08T10:00:00.000Z'),
      collectedAt: null,
      completedAt: null,
      hospitalId: 'hospital-1',
      patientId: '11111111-1111-4111-8111-111111111111',
      doctorId: '22222222-2222-4222-8222-222222222222',
      visitId: null,
      labTestId: '33333333-3333-4333-8333-333333333333',
      createdAt: new Date('2026-05-08T10:00:00.000Z'),
      updatedAt: new Date('2026-05-08T10:00:00.000Z'),
      patient: { id: '11111111-1111-4111-8111-111111111111', mrn: 'MRN-001', name: 'Asha', age: 31, gender: 'FEMALE' },
      doctor: { id: '22222222-2222-4222-8222-222222222222', name: 'Dr. Rao', specialization: 'General Medicine' },
      labTest: {
        id: '33333333-3333-4333-8333-333333333333',
        code: 'GLU-F',
        name: 'Fasting Blood Glucose',
        category: 'Biochemistry',
        sampleType: 'Blood',
        defaultUnit: 'mg/dL',
        referenceRange: '70-110',
        instructions: null,
      },
      result: null,
    };
    txLabOrderFindFirst.mockResolvedValue(existingOrder);
    txLabResultFindFirst.mockResolvedValue(null);
    txLabResultUpsert.mockResolvedValue({
      id: '66666666-6666-4666-8666-666666666666',
      status: 'FINAL',
      resultValue: '96',
      unit: 'mg/dL',
      referenceRange: '70-110',
      interpretation: 'Normal',
      remarks: null,
      observedAt: new Date('2026-05-08T10:20:00.000Z'),
      reportedAt: new Date('2026-05-08T10:25:00.000Z'),
      verifiedAt: null,
      hospitalId: 'hospital-1',
      labOrderId: '55555555-5555-4555-8555-555555555555',
      patientId: '11111111-1111-4111-8111-111111111111',
      labTestId: '33333333-3333-4333-8333-333333333333',
      recordedById: 'user-1',
      createdAt: new Date('2026-05-08T10:25:00.000Z'),
      updatedAt: new Date('2026-05-08T10:25:00.000Z'),
    });
    txLabOrderUpdate.mockResolvedValue({
      ...existingOrder,
      status: 'COMPLETED',
      completedAt: new Date('2026-05-08T10:25:00.000Z'),
      result: {
        id: '66666666-6666-4666-8666-666666666666',
        status: 'FINAL',
        resultValue: '96',
        unit: 'mg/dL',
        referenceRange: '70-110',
        interpretation: 'Normal',
        remarks: null,
        observedAt: new Date('2026-05-08T10:20:00.000Z'),
        reportedAt: new Date('2026-05-08T10:25:00.000Z'),
        verifiedAt: null,
        hospitalId: 'hospital-1',
        labOrderId: '55555555-5555-4555-8555-555555555555',
        patientId: '11111111-1111-4111-8111-111111111111',
        labTestId: '33333333-3333-4333-8333-333333333333',
        recordedById: 'user-1',
        createdAt: new Date('2026-05-08T10:25:00.000Z'),
        updatedAt: new Date('2026-05-08T10:25:00.000Z'),
      },
    });
    mockedPrisma.auditLog.create.mockResolvedValue({ id: 'audit-2' });

    const response = await request(app)
      .patch('/api/labs/orders/55555555-5555-4555-8555-555555555555/result')
      .set('Authorization', `Bearer ${token}`)
      .send({
        resultValue: '96',
        interpretation: 'Normal',
        status: 'FINAL',
        observedAt: '2026-05-08T10:20:00.000Z',
        reportedAt: '2026-05-08T10:25:00.000Z',
      });

    expect(response.status).toBe(200);
    expect(response.body.result.status).toBe('FINAL');
    expect(response.body.order.status).toBe('COMPLETED');
    expect(mockedPrisma.auditLog.create).toHaveBeenCalledTimes(2);
  });

  it('prints a lab report as PDF and audits print action', async () => {
    const app = createApp();
    const token = signToken('DOCTOR');

    mockedPrisma.labOrder.findFirst.mockResolvedValue({
      id: '77777777-7777-4777-8777-777777777777',
      orderNumber: 'LAB-20260508-110000-222',
      priority: 'ROUTINE',
      status: 'COMPLETED',
      notes: null,
      clinicalNotes: 'Suspected hyperglycemia',
      orderedAt: new Date('2026-05-08T11:00:00.000Z'),
      collectedAt: new Date('2026-05-08T11:05:00.000Z'),
      completedAt: new Date('2026-05-08T11:30:00.000Z'),
      hospitalId: 'hospital-1',
      patientId: '11111111-1111-4111-8111-111111111111',
      doctorId: '22222222-2222-4222-8222-222222222222',
      visitId: null,
      labTestId: '33333333-3333-4333-8333-333333333333',
      createdAt: new Date('2026-05-08T11:00:00.000Z'),
      updatedAt: new Date('2026-05-08T11:30:00.000Z'),
      patient: { id: '11111111-1111-4111-8111-111111111111', mrn: 'MRN-001', name: 'Asha', age: 31, gender: 'FEMALE' },
      doctor: { id: '22222222-2222-4222-8222-222222222222', name: 'Dr. Rao', specialization: 'General Medicine' },
      labTest: {
        id: '33333333-3333-4333-8333-333333333333',
        code: 'GLU-F',
        name: 'Fasting Blood Glucose',
        category: 'Biochemistry',
        sampleType: 'Blood',
        defaultUnit: 'mg/dL',
        referenceRange: '70-110',
        instructions: '8 hour fasting',
      },
      result: {
        id: '88888888-8888-4888-8888-888888888888',
        status: 'FINAL',
        resultValue: '96',
        unit: 'mg/dL',
        referenceRange: '70-110',
        interpretation: 'Normal',
        remarks: 'Within normal limits',
        observedAt: new Date('2026-05-08T11:20:00.000Z'),
        reportedAt: new Date('2026-05-08T11:30:00.000Z'),
        verifiedAt: null,
        hospitalId: 'hospital-1',
        labOrderId: '77777777-7777-4777-8777-777777777777',
        patientId: '11111111-1111-4111-8111-111111111111',
        labTestId: '33333333-3333-4333-8333-333333333333',
        recordedById: 'user-1',
        createdAt: new Date('2026-05-08T11:30:00.000Z'),
        updatedAt: new Date('2026-05-08T11:30:00.000Z'),
      },
    });
    mockedPrisma.auditLog.create.mockResolvedValue({ id: 'audit-3' });

    const response = await request(app)
      .get('/api/labs/orders/77777777-7777-4777-8777-777777777777/report/pdf')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('application/pdf');
    expect(mockedPrisma.auditLog.create).toHaveBeenCalledTimes(1);
  });
});
