import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export let redis: Redis | null = null;

try {
  redis = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    lazyConnect: true,
    retryStrategy(times) {
      if (times > 3) return null; // stop retrying if redis is not running
      return Math.min(times * 100, 2000);
    },
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

export default redis;
