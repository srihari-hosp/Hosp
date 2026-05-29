import { redis } from '../infra/redis.js';

export class RedisSchema {
  private namespace: string;

  constructor(hospitalId: string, module: string) {
    // Builds a namespaced "schema" e.g. 'hosp_abc:auth'
    this.namespace = `${hospitalId}:${module}`;
  }

  // ─── Internal key builder ────────────────────────────────────────────────────
  private k(key: string): string {
    return `${this.namespace}:${key}`;
  }

  // ─── String commands ─────────────────────────────────────────────────────────

  async set(key: string, value: string, ttlSeconds?: number): Promise<'OK'> {
    if (ttlSeconds) {
      return redis.set(this.k(key), value, 'EX', ttlSeconds) as Promise<'OK'>;
    }
    return redis.set(this.k(key), value) as Promise<'OK'>;
  }

  async get(key: string): Promise<string | null> {
    return redis.get(this.k(key));
  }

  async del(key: string): Promise<number> {
    return redis.del(this.k(key));
  }

  async exists(key: string): Promise<boolean> {
    const count = await redis.exists(this.k(key));
    return count === 1;
  }

  async ttl(key: string): Promise<number> {
    return redis.ttl(this.k(key));
  }

  async expire(key: string, ttlSeconds: number): Promise<number> {
    return redis.expire(this.k(key), ttlSeconds);
  }

  // ─── JSON helpers ────────────────────────────────────────────────────────────

  async setJson<T>(key: string, value: T, ttlSeconds?: number): Promise<'OK'> {
    return this.set(key, JSON.stringify(value), ttlSeconds);
  }

  async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.get(key);
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  // ─── Namespace-scoped flush (safe – uses SCAN not KEYS) ──────────────────────

  /**
   * Deletes ALL keys under this schema namespace.
   * Uses scanStream + pipeline so it never blocks Redis in production.
   */
  async clear(): Promise<void> {
    const prefix = redis.options.keyPrefix || '';
    const matchPattern = `${prefix}${this.namespace}:*`;

    const stream = redis.scanStream({
      match: matchPattern,
      count: 100,
    });

    for await (const keys of stream as AsyncIterable<string[]>) {
      if (keys.length > 0) {
        const pipeline = redis.pipeline();
        keys.forEach((key) => {
          // ioredis doesn't strip the prefix from SCAN results,
          // but del() will add it back, so we must strip it here to avoid double-prefixing.
          const plainKey = prefix && key.startsWith(prefix)
            ? key.slice(prefix.length)
            : key;
          pipeline.del(plainKey);
        });
        await pipeline.exec();
      }
    }
  }
}

// ─── Factory helper ───────────────────────────────────────────────────────────
/**
 * Creates a RedisSchema instance without `new`.
 *
 * @example
 * const authCache = redisSchema(hospitalId, 'auth');
 * await authCache.setJson('session:xyz', { userId: '...' }, 3600);
 */
export const redisSchema = (hospitalId: string, module: string): RedisSchema =>
  new RedisSchema(hospitalId, module);

