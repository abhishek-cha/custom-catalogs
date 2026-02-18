import { getRedis } from './redis';

const CACHE_TTL = parseInt(process.env.CACHE_TTL_SECONDS ?? '') || 12 * 60 * 60;

// In-memory fallback for local dev (no Redis)
const memoryCache = new Map<string, { value: unknown; expiresAt: number }>();

export async function getCached<T>(key: string): Promise<T | null> {
  const redis = getRedis();
  if (redis) return redis.get<T>(key);

  const entry = memoryCache.get(key);
  if (entry && Date.now() < entry.expiresAt) return entry.value as T;
  return null;
}

export async function setCached(key: string, value: unknown): Promise<void> {
  const redis = getRedis();
  if (redis) {
    await redis.set(key, value, { ex: CACHE_TTL });
    return;
  }
  memoryCache.set(key, { value, expiresAt: Date.now() + CACHE_TTL * 1000 });
}
