import Redis from 'ioredis';

const rawRedisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
// Force IPv4 127.0.0.1 instead of 'localhost' to prevent Node.js 18+ ::1 IPv6 resolution failures
const redisUrl = rawRedisUrl.replace('://localhost', '://127.0.0.1');

export let redis: Redis | null = null;

try {
  redis = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    lazyConnect: true,
    family: 4, // Force IPv4
    retryStrategy(times) {
      if (process.env.NODE_ENV === 'test') {
        if (times > 1) return null;
        return 50;
      }
      return Math.min(times * 200, 3000);
    },
  });

  redis.on('ready', () => {
    console.log('[Redis] Connected and ready');
  });

  redis.on('error', (err) => {
    // Silent warn on local development without Redis
    if (process.env.NODE_ENV !== 'test') {
      console.warn('[Redis] Connection warning (running in graceful fallback mode):', err.message);
    }
  });

  redis.connect().catch(() => {
    // Handled by retryStrategy
  });
} catch (e) {
  redis = null;
}

export const isRedisReady = (): boolean => {
  return redis !== null && redis.status === 'ready';
};

export default redis;
