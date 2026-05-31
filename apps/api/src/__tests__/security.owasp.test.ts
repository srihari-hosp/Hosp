import request from 'supertest';
import { createApp } from '../app.js';

describe('OWASP Top 10 security checks', () => {
  it('A05 Security Misconfiguration: should return secure helmet headers', async () => {
    const app = createApp();
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
  });

  it('A05 Security Misconfiguration: should restrict CORS to configured frontend origin', async () => {
    const app = createApp();
    const allowed = await request(app)
      .get('/health')
      .set('Origin', 'http://localhost:3000');
    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:3000');

    const denied = await request(app)
      .get('/health')
      .set('Origin', 'http://evil.example');
    expect(denied.status).toBe(403);
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('A01 Broken Access Control: should block unauthorized access to /auth/me', async () => {
    const app = createApp();
    const response = await request(app).get('/auth/me');

    expect(response.status).toBe(401);
  });

  it('A03 Injection: should reject malformed login payload with unknown fields', async () => {
    const app = createApp();
    const response = await request(app).post('/auth/login').send({
      email: 'not-an-email',
      password: 'short',
      isAdmin: true,
      query: "' OR '1'='1",
    });

    expect(response.status).toBe(400);
  });

  it('A04 Insecure Design: should enforce rate limiting for repeated requests', async () => {
    const prevWindow = process.env.RATE_LIMIT_WINDOW_MS;
    const prevMax = process.env.RATE_LIMIT_MAX;
    process.env.RATE_LIMIT_WINDOW_MS = '60000';
    process.env.RATE_LIMIT_MAX = '2';
    try {
      const app = createApp();
      const first = await request(app).get('/');
      const second = await request(app).get('/');
      const third = await request(app).get('/');

      expect(first.status).toBe(200);
      expect(second.status).toBe(200);
      expect(third.status).toBe(429);
      expect(third.body.error).toBe('Too many requests, please try again later.');
    } finally {
      if (prevWindow === undefined) delete process.env.RATE_LIMIT_WINDOW_MS;
      else process.env.RATE_LIMIT_WINDOW_MS = prevWindow;
      if (prevMax === undefined) delete process.env.RATE_LIMIT_MAX;
      else process.env.RATE_LIMIT_MAX = prevMax;
    }
  });
});
