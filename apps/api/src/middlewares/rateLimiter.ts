import { Request, Response, NextFunction } from 'express';
import redis, { isRedisReady } from '../lib/redis.js';

interface RateLimitOptions {
  windowSeconds: number;
  maxRequests: number;
  prefix?: string;
  message?: string;
}

// In-memory fallback map: key -> { count, expiresAt }
const memoryLimits = new Map<string, { count: number; expiresAt: number }>();

/**
 * Distributed Sliding-Window Rate Limiter.
 * Uses Redis if available with automatic in-memory fallback.
 */
export function rateLimiter(options: RateLimitOptions) {
  const {
    windowSeconds,
    maxRequests,
    prefix = 'rl:general',
    message = 'Too many requests. Please try again later.',
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    // Determine unique client identifier from IP or User ID
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const clientIp = String(Array.isArray(ip) ? ip[0] : ip).split(',')[0].trim();
    const userIdentifier = req.user?.id ? `usr:${req.user.id}` : `ip:${clientIp}`;
    const key = `${prefix}:${userIdentifier}`;

    // 1. Try Redis Rate Limiting
    if (isRedisReady() && redis) {
      try {
        const current = await redis.incr(key);
        if (current === 1) {
          await redis.expire(key, windowSeconds);
        }

        res.setHeader('X-RateLimit-Limit', maxRequests);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - current));

        if (current > maxRequests) {
          const ttl = await redis.ttl(key);
          const retryAfter = ttl > 0 ? ttl : windowSeconds;
          res.setHeader('Retry-After', retryAfter);
          return res.status(429).json({
            error: 'RATE_LIMIT_EXCEEDED',
            message,
            retryAfter,
          });
        }

        return next();
      } catch {
        // Fall through to memory
      }
    }

    // 2. In-Memory Fallback
    const now = Date.now();
    let entry = memoryLimits.get(key);

    if (!entry || now > entry.expiresAt) {
      entry = { count: 1, expiresAt: now + windowSeconds * 1000 };
      memoryLimits.set(key, entry);
    } else {
      entry.count++;
    }

    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - entry.count));

    if (entry.count > maxRequests) {
      const retryAfter = Math.max(1, Math.ceil((entry.expiresAt - now) / 1000));
      res.setHeader('Retry-After', retryAfter);
      return res.status(429).json({
        error: 'RATE_LIMIT_EXCEEDED',
        message,
        retryAfter,
      });
    }

    return next();
  };
}

/**
 * Auth Rate Limiter: 15 login/reset attempts per 15 minutes.
 */
export const authRateLimiter = rateLimiter({
  windowSeconds: 900,
  maxRequests: 15,
  prefix: 'rl:auth',
  message: 'Too many authentication attempts. Please wait 15 minutes before trying again.',
});

/**
 * Punch Rate Limiter: 10 punches per minute (guards against rapid duplicate punches).
 */
export const punchRateLimiter = rateLimiter({
  windowSeconds: 60,
  maxRequests: 10,
  prefix: 'rl:punch',
  message: 'Punch rate limit reached. Please wait a minute before punching again.',
});
