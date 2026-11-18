import redis, { isRedisReady } from '../lib/redis.js';

export { isRedisReady };

/**
 * Retrieves a parsed JSON value from Redis by key.
 * Returns null if key doesn't exist, Redis is unavailable, or parsing fails.
 */
export async function getCache<T>(key: string): Promise<T | null> {
  if (!isRedisReady() || !redis) return null;
  try {
    const raw = await redis.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Saves a JSON-serializable value into Redis with a TTL in seconds.
 * Fails silently if Redis is offline.
 */
export async function setCache(key: string, value: any, ttlSeconds = 300): Promise<boolean> {
  if (!isRedisReady() || !redis) return false;
  try {
    const serialized = JSON.stringify(value);
    await redis.set(key, serialized, 'EX', ttlSeconds);
    return true;
  } catch {
    return false;
  }
}

/**
 * Removes one or more keys from Redis.
 */
export async function deleteCache(key: string): Promise<boolean> {
  if (!isRedisReady() || !redis) return false;
  try {
    await redis.del(key);
    return true;
  } catch {
    return false;
  }
}

/**
 * Invalidates keys matching a pattern (e.g. 'tenant:id:*').
 */
export async function invalidatePattern(pattern: string): Promise<number> {
  if (!isRedisReady() || !redis) return 0;
  try {
    const keys = await redis.keys(pattern);
    if (keys && keys.length > 0) {
      return await redis.del(...keys);
    }
    return 0;
  } catch {
    return 0;
  }
}

/**
 * Invalidate all cached data for a specific tenant company.
 */
export async function invalidateTenantCache(companyId?: number, subdomain?: string | null): Promise<void> {
  if (companyId) {
    await deleteCache(`tenant:id:${companyId}`);
  }
  if (subdomain) {
    await deleteCache(`tenant:subdomain:${subdomain.toLowerCase()}`);
  }
}

/**
 * Helper to get cached value or compute and store it if cache miss.
 */
export async function getOrSetCache<T>(
  key: string,
  ttlSeconds: number,
  fetchFn: () => Promise<T>
): Promise<T> {
  const cached = await getCache<T>(key);
  if (cached !== null && cached !== undefined) {
    return cached;
  }

  const fresh = await fetchFn();
  if (fresh !== null && fresh !== undefined) {
    setCache(key, fresh, ttlSeconds).catch(() => {});
  }
  return fresh;
}
