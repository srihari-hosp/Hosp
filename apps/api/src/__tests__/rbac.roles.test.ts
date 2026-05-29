import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../prisma/client.js', () => ({
  prisma: {
    patient: {
      findMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn(),
      createMany: vi.fn(),
    },
    hospital: {
      create: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

import { createApp } from '../app.js';
import { prisma } from '../prisma/client.js';

const mockedPrisma = prisma as unknown as {
  patient: {
    findMany: ReturnType<typeof vi.fn>;
  };
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

describe('Role-based access control', () => {
  beforeEach(() => {
    mockedPrisma.patient.findMany.mockReset();
    mockedPrisma.patient.findMany.mockResolvedValue([]);
  });

  it('allows ADMIN to access /patients', async () => {
    const app = createApp();
    const token = signToken('ADMIN');

    const response = await request(app).get('/patients').set('Cookie', `token=${token}`);

    expect(response.status).toBe(200);
    expect(mockedPrisma.patient.findMany).toHaveBeenCalledTimes(1);
  });

  it('allows DOCTOR to access /patients', async () => {
    const app = createApp();
    const token = signToken('DOCTOR');

    const response = await request(app).get('/patients').set('Cookie', `token=${token}`);

    expect(response.status).toBe(200);
    expect(mockedPrisma.patient.findMany).toHaveBeenCalledTimes(1);
  });

  it('allows STAFF role members to access /patients', async () => {
    const app = createApp();
    const token = signToken('NURSE');

    const response = await request(app).get('/patients').set('Cookie', `token=${token}`);

    expect(response.status).toBe(200);
    expect(mockedPrisma.patient.findMany).toHaveBeenCalledTimes(1);
  });

  it('denies PATIENT from accessing /patients', async () => {
    const app = createApp();
    const token = signToken('PATIENT');

    const response = await request(app).get('/patients').set('Cookie', `token=${token}`);

    expect(response.status).toBe(403);
    expect(mockedPrisma.patient.findMany).not.toHaveBeenCalled();
  });
});
