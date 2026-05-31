import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../prisma/client', () => ({
  prisma: {
    patient: {
      count: vi.fn(),
    },
    appointment: {
      count: vi.fn(),
    },
    payment: {
      aggregate: vi.fn(),
    },
  },
}));

import { createApp } from '../app.js';
import { prisma } from '../prisma/client.js';
import { __clearDashboardCacheForTests } from '../routes/dashboard.routes.js';

const mockedPrisma = prisma as unknown as {
  patient: { count: ReturnType<typeof vi.fn> };
  appointment: { count: ReturnType<typeof vi.fn> };
  payment: { aggregate: ReturnType<typeof vi.fn> };
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

describe('Dashboard reporting API', () => {
  beforeEach(() => {
    mockedPrisma.patient.count.mockReset();
    mockedPrisma.appointment.count.mockReset();
    mockedPrisma.payment.aggregate.mockReset();
    __clearDashboardCacheForTests('hospital-1');
  });

  it('returns dashboard summary aggregates with tenant filters', async () => {
    const app = createApp();
    const token = signToken('ADMIN');

    mockedPrisma.patient.count.mockResolvedValue(125);
    mockedPrisma.appointment.count.mockResolvedValue(18);
    mockedPrisma.payment.aggregate
      .mockResolvedValueOnce({ _sum: { amount: '125000.5' } })
      .mockResolvedValueOnce({ _sum: { amount: '420000.75' } });

    const response = await request(app)
      .get('/api/dashboard/summary')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.headers['x-cache']).toBe('MISS');
    expect(response.body.summary).toEqual({
      totalPatients: 125,
      todayAppointments: 18,
      revenueLast7Days: 125000.5,
      revenueLast30Days: 420000.75,
    });
    expect(mockedPrisma.patient.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ hospitalId: 'hospital-1' }),
      })
    );
    expect(mockedPrisma.appointment.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ hospitalId: 'hospital-1' }),
      })
    );
  });

  it('serves cached summary response for repeated request within 5 minutes', async () => {
    const app = createApp();
    const token = signToken('DOCTOR');

    mockedPrisma.patient.count.mockResolvedValue(55);
    mockedPrisma.appointment.count.mockResolvedValue(8);
    mockedPrisma.payment.aggregate
      .mockResolvedValueOnce({ _sum: { amount: '1000' } })
      .mockResolvedValueOnce({ _sum: { amount: '3000' } });

    const first = await request(app)
      .get('/api/dashboard/summary')
      .set('Authorization', `Bearer ${token}`);
    const second = await request(app)
      .get('/api/dashboard/summary')
      .set('Authorization', `Bearer ${token}`);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(first.headers['x-cache']).toBe('MISS');
    expect(second.headers['x-cache']).toBe('HIT');
    expect(mockedPrisma.patient.count).toHaveBeenCalledTimes(1);
    expect(mockedPrisma.appointment.count).toHaveBeenCalledTimes(1);
    expect(mockedPrisma.payment.aggregate).toHaveBeenCalledTimes(2);
  });

  it('returns appointment trend for given days and enforces tenant filter', async () => {
    const app = createApp();
    const token = signToken('RECEPTIONIST');
    mockedPrisma.appointment.count.mockResolvedValue(3);

    const response = await request(app)
      .get('/api/dashboard/appointments-trend?days=7')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.days).toBe(7);
    expect(response.body.trend).toHaveLength(7);
    expect(mockedPrisma.appointment.count).toHaveBeenCalledTimes(7);
    expect(mockedPrisma.appointment.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ hospitalId: 'hospital-1' }),
      })
    );
  });

  it('returns revenue trend and rejects invalid days query', async () => {
    const app = createApp();
    const token = signToken('ADMIN');
    mockedPrisma.payment.aggregate.mockResolvedValue({ _sum: { amount: '100.25' } });

    const ok = await request(app)
      .get('/api/dashboard/revenue-trend?days=3')
      .set('Authorization', `Bearer ${token}`);
    const bad = await request(app)
      .get('/api/dashboard/revenue-trend?days=500')
      .set('Authorization', `Bearer ${token}`);

    expect(ok.status).toBe(200);
    expect(ok.body.days).toBe(3);
    expect(ok.body.trend).toHaveLength(3);
    expect(mockedPrisma.payment.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ hospitalId: 'hospital-1' }),
      })
    );
    expect(bad.status).toBe(400);
  });
});
