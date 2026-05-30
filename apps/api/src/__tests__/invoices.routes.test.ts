import jwt from 'jsonwebtoken';
import { Prisma } from '@prisma/client';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const txPatientFindFirst = vi.fn();
const txVisitFindFirst = vi.fn();
const txTariffFindFirst = vi.fn();
const txInvoiceFindFirst = vi.fn();
const txInvoiceCreate = vi.fn();
const txPaymentCreate = vi.fn();
const txInvoiceUpdate = vi.fn();
const txInvoiceUpdateMany = vi.fn();
const txInvoiceFindUnique = vi.fn();
const { enqueueInvoicePdfGeneration } = vi.hoisted(() => ({
  enqueueInvoicePdfGeneration: vi.fn(),
}));

const txAuditLogCreate = vi.fn();

vi.mock('../prisma/client', () => ({
  prisma: {
    invoice: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    payment: {
      create: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        patient: { findFirst: txPatientFindFirst },
        visit: { findFirst: txVisitFindFirst },
        tariffItem: { findFirst: txTariffFindFirst },
        invoice: { findFirst: txInvoiceFindFirst, create: txInvoiceCreate, update: txInvoiceUpdate, updateMany: txInvoiceUpdateMany, findUnique: txInvoiceFindUnique },
        payment: { create: txPaymentCreate },
        auditLog: { create: txAuditLogCreate },
      })
    ),
  },
}));

vi.mock('../queue/queues.js', () => ({
  enqueueInvoicePdfGeneration,
}));

import { createApp } from '../app.js';
import { prisma } from '../prisma/client.js';

const mockedPrisma = prisma as unknown as {
  invoice: {
    findMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
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

describe('Invoices API', () => {
  beforeEach(() => {
    txPatientFindFirst.mockReset();
    txVisitFindFirst.mockReset();
    txTariffFindFirst.mockReset();
    txInvoiceFindFirst.mockReset();
    txInvoiceCreate.mockReset();
    txPaymentCreate.mockReset();
    txInvoiceUpdate.mockReset();
    txInvoiceUpdateMany.mockReset();
    txInvoiceFindUnique.mockReset();
    enqueueInvoicePdfGeneration.mockReset();
    mockedPrisma.invoice.findMany.mockReset();
    mockedPrisma.invoice.findFirst.mockReset();
    mockedPrisma.auditLog.create.mockReset();
    mockedPrisma.$transaction.mockClear();
  });

  it('creates invoice with GST totals and invoice number', async () => {
    const app = createApp();
    const token = signToken('RECEPTIONIST');

    txPatientFindFirst.mockResolvedValue({ id: 'patient-1' });
    txVisitFindFirst.mockResolvedValue({ id: 'visit-1' });
    txTariffFindFirst.mockResolvedValue(null);
    txInvoiceFindFirst.mockResolvedValueOnce(null);
    txInvoiceCreate.mockResolvedValue({
      id: 'invoice-1',
      invoiceNumber: 'INV-202602-001',
      invoiceYear: 2026,
      invoiceMonth: 2,
      invoiceSeq: 1,
      status: 'UNPAID',
      subtotal: '200.00',
      gstTotal: '36.00',
      total: '236.00',
      amountPaid: '0.00',
      dueDate: null,
      notes: null,
      hospitalId: 'hospital-1',
      patientId: 'patient-1',
      visitId: 'visit-1',
      createdAt: new Date('2026-02-20T10:00:00.000Z'),
      updatedAt: new Date('2026-02-20T10:00:00.000Z'),
      patient: { id: 'patient-1', mrn: 'MRN-001', name: 'Patient 1', phone: '9999999999' },
      visit: null,
      items: [],
      payments: [],
    });
    mockedPrisma.auditLog.create.mockResolvedValue({ id: 'audit-1' });

    const response = await request(app)
      .post('/api/invoices')
      .set('Authorization', `Bearer ${token}`)
      .send({
        patientId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        visitId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        items: [{ description: 'Consultation', quantity: 2, unitPrice: 100 }],
      });

    expect(response.status).toBe(201);
    expect(response.body.invoice.invoiceNumber).toBe('INV-202602-001');
    expect(mockedPrisma.auditLog.create).toHaveBeenCalledTimes(1);
  });

  it('returns 400 for invalid invoice status filter', async () => {
    const app = createApp();
    const token = signToken('ADMIN');

    const response = await request(app)
      .get('/api/invoices?status=BAD')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(400);
  });

  it('queues invoice pdf generation', async () => {
    const app = createApp();
    const token = signToken('ADMIN');

    mockedPrisma.invoice.findFirst.mockResolvedValue({
      id: 'invoice-1',
      invoiceNumber: 'INV-202602-001',
      pdfUrl: null,
      pdfGeneratedAt: null,
    });
    enqueueInvoicePdfGeneration.mockResolvedValue('hospital-1__invoice-1');

    const response = await request(app)
      .post('/api/invoices/invoice-1/pdf')
      .set('Authorization', `Bearer ${token}`)
      .send();

    expect(response.status).toBe(202);
    expect(enqueueInvoicePdfGeneration).toHaveBeenCalledTimes(1);
    expect(response.body.jobId).toBe('hospital-1__invoice-1');
  });

  it('records partial payment and updates invoice status', async () => {
    const app = createApp();
    const token = signToken('ADMIN');

    txInvoiceFindFirst.mockResolvedValue({
      id: 'invoice-1',
      patientId: 'patient-1',
      total: new Prisma.Decimal(236),
      amountPaid: new Prisma.Decimal(0),
      status: 'UNPAID',
    });
    txPaymentCreate.mockResolvedValue({
      id: 'payment-1',
      amount: '100.00',
      method: 'CASH',
      referenceNo: null,
      notes: null,
      receivedAt: new Date('2026-02-20T10:00:00.000Z'),
      createdAt: new Date('2026-02-20T10:00:00.000Z'),
      updatedAt: new Date('2026-02-20T10:00:00.000Z'),
    });
    txInvoiceUpdateMany.mockResolvedValue({ count: 1 });
    txInvoiceFindUnique.mockResolvedValue({
      id: 'invoice-1',
      invoiceNumber: 'INV-202602-001',
      invoiceYear: 2026,
      invoiceMonth: 2,
      invoiceSeq: 1,
      status: 'PARTIALLY_PAID',
      subtotal: '200.00',
      gstTotal: '36.00',
      total: '236.00',
      amountPaid: '100.00',
      dueDate: null,
      notes: null,
      hospitalId: 'hospital-1',
      patientId: 'patient-1',
      visitId: 'visit-1',
      createdAt: new Date('2026-02-20T10:00:00.000Z'),
      updatedAt: new Date('2026-02-20T10:00:00.000Z'),
      patient: { id: 'patient-1', mrn: 'MRN-001', name: 'Patient 1', phone: '9999999999' },
      visit: null,
      items: [],
      payments: [],
    });
    mockedPrisma.auditLog.create.mockResolvedValue({ id: 'audit-x' });

    const response = await request(app)
      .post('/api/invoices/invoice-1/payment')
      .set('Authorization', `Bearer ${token}`)
      .send({
        amount: 100,
        method: 'CASH',
      });

    expect(response.status).toBe(201);
    expect(response.body.invoice.status).toBe('PARTIALLY_PAID');
    expect(txAuditLogCreate).toHaveBeenCalledTimes(2);
  });
});
