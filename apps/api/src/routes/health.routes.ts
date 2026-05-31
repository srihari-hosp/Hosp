import { Router } from 'express';
import { checkRedisHealth } from '../infra/redis.js';
import { prisma } from '../prisma/client.js';

const router = Router();

const checkDbHealth = async (): Promise<'connected' | 'disconnected'> => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return 'connected';
  } catch {
    return 'disconnected';
  }
};

router.get('/health', async (_req, res) => {
  const database = await checkDbHealth();
  const status = database === 'connected' ? 'OK' : 'DEGRADED';

  return res.status(status === 'OK' ? 200 : 503).json({
    status,
    database,
    timestamp: new Date().toISOString(),
  });
});

export default router;
