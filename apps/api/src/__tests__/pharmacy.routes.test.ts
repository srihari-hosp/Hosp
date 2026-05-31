import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const txPrescriptionFindFirst = vi.fn();
const txMedicineFindFirst = vi.fn();
const txStockBatchFindFirst = vi.fn();
const txStockBatchUpdate = vi.fn();
const txStockBatchUpdateMany = vi.fn();
const txStockBatchFindFirstOrThrow = vi.fn();
const txDispenseCreate = vi.fn();

vi.mock('../prisma/client', () => ({
  prisma: {
    medicine: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    stockBatch: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    dispenseRecord: {
      create: vi.fn(),
    },
    prescription: {
      findFirst: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        prescription: { findFirst: txPrescriptionFindFirst },
        medicine: { findFirst: txMedicineFindFirst },
        stockBatch: { 
          findFirst: txStockBatchFindFirst, 
          update: txStockBatchUpdate,
          updateMany: txStockBatchUpdateMany,
          findFirstOrThrow: txStockBatchFindFirstOrThrow
        },
        dispenseRecord: { create: txDispenseCreate },
      })
    ),
  },
}));

import { createApp } from '../app.js';
import { prisma } from '../prisma/client.js';

const mockedPrisma = prisma as unknown as {
  medicine: {
    create: ReturnType<typeof vi.fn>;
  };
  auditLog: {
    create: ReturnType<typeof vi.fn>;
  };
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

describe('Pharmacy API', () => {
  beforeEach(() => {
    mockedPrisma.medicine.create.mockReset();
    mockedPrisma.auditLog.create.mockReset();
    mockedPrisma.$transaction.mockClear();

    txPrescriptionFindFirst.mockReset();
    txMedicineFindFirst.mockReset();
    txStockBatchFindFirst.mockReset();
    txStockBatchUpdate.mockReset();
    txDispenseCreate.mockReset();
  });

  it('creates medicine and writes an audit log', async () => {
    const app = createApp();
    const token = signToken('PHARMACIST');

    mockedPrisma.medicine.create.mockResolvedValue({
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      code: 'MED-001',
      name: 'Paracetamol 650',
      genericName: 'Paracetamol',
      manufacturer: 'ABC Pharma',
      hsnCode: '3004',
      gstRate: '12.00',
      unitPrice: '18.50',
      scheduleCategory: 'OTC',
      isActive: true,
      hospitalId: 'hospital-1',
      createdAt: new Date('2026-02-21T10:00:00.000Z'),
      updatedAt: new Date('2026-02-21T10:00:00.000Z'),
    });
    mockedPrisma.auditLog.create.mockResolvedValue({ id: 'audit-1' });

    const response = await request(app)
      .post('/api/pharmacy/medicines')
      .set('Authorization', `Bearer ${token}`)
      .send({
        code: 'MED-001',
        name: 'Paracetamol 650',
        genericName: 'Paracetamol',
        manufacturer: 'ABC Pharma',
        hsnCode: '3004',
        gstRate: 12,
        unitPrice: 18.5,
        scheduleCategory: 'OTC',
      });

    expect(response.status).toBe(201);
    expect(response.body.medicine.code).toBe('MED-001');
    expect(mockedPrisma.auditLog.create).toHaveBeenCalledTimes(1);
  });

  it('dispenses from valid stock and decrements available quantity', async () => {
    const app = createApp();
    const token = signToken('PHARMACIST');

    txPrescriptionFindFirst.mockResolvedValue({
      id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      hospitalId: 'hospital-1',
      visit: {
        id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        patientId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      },
    });
    txMedicineFindFirst.mockResolvedValue({
      id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      code: 'MED-001',
      name: 'Paracetamol 650',
      genericName: 'Paracetamol',
      manufacturer: 'ABC Pharma',
      hsnCode: '3004',
      gstRate: '12.00',
      unitPrice: '18.50',
      scheduleCategory: 'OTC',
      isActive: true,
      hospitalId: 'hospital-1',
      createdAt: new Date('2026-02-21T10:00:00.000Z'),
      updatedAt: new Date('2026-02-21T10:00:00.000Z'),
    });
    txStockBatchFindFirst.mockResolvedValue({
      id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
      batchNo: 'BATCH-001',
      vendorName: 'Vendor',
      expiryDate: new Date('2099-12-31T00:00:00.000Z'),
      receivedQty: 100,
      availableQty: 10,
      purchasePrice: '15.00',
      mrp: '20.00',
      receivedAt: new Date('2026-02-01T00:00:00.000Z'),
      notes: null,
      isActive: true,
      hospitalId: 'hospital-1',
      medicineId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      createdAt: new Date('2026-02-01T00:00:00.000Z'),
      updatedAt: new Date('2026-02-01T00:00:00.000Z'),
    });
    txStockBatchUpdateMany.mockResolvedValue({ count: 1 });
    txStockBatchFindFirstOrThrow.mockResolvedValue({
      id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
      batchNo: 'BATCH-001',
      vendorName: 'Vendor',
      expiryDate: new Date('2099-12-31T00:00:00.000Z'),
      receivedQty: 100,
      availableQty: 8,
      purchasePrice: '15.00',
      mrp: '20.00',
      receivedAt: new Date('2026-02-01T00:00:00.000Z'),
      notes: null,
      isActive: true,
      hospitalId: 'hospital-1',
      medicineId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      createdAt: new Date('2026-02-01T00:00:00.000Z'),
      updatedAt: new Date('2026-02-21T00:00:00.000Z'),
    });
    txDispenseCreate.mockResolvedValue({
      id: '99999999-9999-4999-8999-999999999999',
      quantity: 2,
      unitPrice: '18.50',
      gstRate: '12.00',
      totalAmount: '41.44',
      dispensedAt: new Date('2026-02-21T10:00:00.000Z'),
      notes: null,
      hospitalId: 'hospital-1',
      patientId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      prescriptionId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      medicineId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      stockBatchId: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
      dispensedById: 'user-1',
      createdAt: new Date('2026-02-21T10:00:00.000Z'),
      updatedAt: new Date('2026-02-21T10:00:00.000Z'),
      patient: { id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', mrn: 'MRN-001', name: 'Rajesh Kumar' },
      medicine: { id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', code: 'MED-001', name: 'Paracetamol 650' },
      stockBatch: { id: 'ffffffff-ffff-4fff-8fff-ffffffffffff', batchNo: 'BATCH-001', expiryDate: new Date('2099-12-31T00:00:00.000Z') },
    });
    mockedPrisma.auditLog.create.mockResolvedValue({ id: 'audit-2' });

    const response = await request(app)
      .post('/api/pharmacy/dispense')
      .set('Authorization', `Bearer ${token}`)
      .send({
        prescriptionId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        medicineId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
        quantity: 2,
      });

    expect(response.status).toBe(201);
    expect(response.body.stockBatch.availableQty).toBe(8);
    expect(txStockBatchUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          availableQty: {
            decrement: 2,
          },
        },
      })
    );
    expect(mockedPrisma.auditLog.create).toHaveBeenCalledTimes(2);
  });

  it('rejects dispense when only expired stock is available', async () => {
    const app = createApp();
    const token = signToken('PHARMACIST');

    txPrescriptionFindFirst.mockResolvedValue({
      id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      hospitalId: 'hospital-1',
      visit: {
        id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        patientId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      },
    });
    txMedicineFindFirst.mockResolvedValue({
      id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      code: 'MED-001',
      name: 'Paracetamol 650',
      genericName: 'Paracetamol',
      manufacturer: 'ABC Pharma',
      hsnCode: '3004',
      gstRate: '12.00',
      unitPrice: '18.50',
      scheduleCategory: 'OTC',
      isActive: true,
      hospitalId: 'hospital-1',
      createdAt: new Date('2026-02-21T10:00:00.000Z'),
      updatedAt: new Date('2026-02-21T10:00:00.000Z'),
    });
    txStockBatchFindFirst.mockResolvedValue(null);

    const response = await request(app)
      .post('/api/pharmacy/dispense')
      .set('Authorization', `Bearer ${token}`)
      .send({
        prescriptionId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        medicineId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
        quantity: 2,
      });

    expect(response.status).toBe(400);
    expect(txStockBatchUpdate).not.toHaveBeenCalled();
    expect(txDispenseCreate).not.toHaveBeenCalled();
  });
});
