import { Redis } from 'ioredis';

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';

export const redis = new Redis(redisUrl, {
  keyPrefix: process.env.NODE_ENV === 'production' ? 'hosp:prod:' : 'hosp:dev:',
  lazyConnect: true,
  maxRetriesPerRequest: 1,
  enableReadyCheck: false,
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});

export const checkRedisHealth = async (): Promise<'connected' | 'disconnected'> => {
  try {
    if (redis.status === 'end') {
      await redis.connect();
    } else if (redis.status === 'wait') {
      await redis.connect();
    }

    const pong = await redis.ping();
    return pong === 'PONG' ? 'connected' : 'disconnected';
  } catch {
    return 'disconnected';
  }
};
