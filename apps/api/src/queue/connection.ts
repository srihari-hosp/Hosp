import type { RedisOptions } from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const parsedRedisUrl = new URL(redisUrl);

const parsedDb = parsedRedisUrl.pathname.length > 1
  ? Number(parsedRedisUrl.pathname.slice(1))
  : 0;

export const bullmqConnection: RedisOptions = {
  host: parsedRedisUrl.hostname,
  port: Number(parsedRedisUrl.port || 6379),
  username: parsedRedisUrl.username || undefined,
  password: parsedRedisUrl.password || undefined,
  db: Number.isFinite(parsedDb) ? parsedDb : 0,
  tls: parsedRedisUrl.protocol === 'rediss:' ? {} : undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

export const bullmqPrefix = process.env.NODE_ENV === 'production' ? 'hosp:prod' : 'hosp:dev';
