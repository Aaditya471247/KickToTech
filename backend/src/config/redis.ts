import Redis from 'ioredis';
import { env } from './env';

/** Redis is optional: without REDIS_URL we use an in-memory cache and a single-node Socket.io. */
export const redis: Redis | null = env.REDIS_URL ? new Redis(env.REDIS_URL, { maxRetriesPerRequest: 2 }) : null;

redis?.on('error', (e) => console.error('[redis]', e.message));

const memory = new Map<string, { value: string; expires: number }>();

/** Cache-aside helper used for weather/market lookups. */
export async function cached<T>(key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T> {
  try {
    if (redis) {
      const hit = await redis.get(key);
      if (hit) return JSON.parse(hit) as T;
    } else {
      const hit = memory.get(key);
      if (hit && hit.expires > Date.now()) return JSON.parse(hit.value) as T;
    }
  } catch (e) {
    console.error('[cache] read failed', (e as Error).message);
  }
  const value = await loader();
  try {
    const raw = JSON.stringify(value);
    if (redis) await redis.set(key, raw, 'EX', ttlSeconds);
    else memory.set(key, { value: raw, expires: Date.now() + ttlSeconds * 1000 });
  } catch (e) {
    console.error('[cache] write failed', (e as Error).message);
  }
  return value;
}
