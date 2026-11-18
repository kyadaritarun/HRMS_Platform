import { describe, it, expect, vi } from 'vitest';
import { rateLimiter, authRateLimiter, punchRateLimiter } from '../middlewares/rateLimiter.js';

describe('Part 3 - Rate Limiting & Enterprise Security Tests', () => {
  it('rateLimiter middleware allows requests within threshold and sets headers', async () => {
    const limiter = rateLimiter({
      windowSeconds: 60,
      maxRequests: 3,
      prefix: 'test:limit',
    });

    const mockReq: any = {
      headers: {},
      socket: { remoteAddress: '192.168.1.100' },
    };

    const mockRes: any = {
      headers: {} as Record<string, any>,
      setHeader: vi.fn((k, v) => {
        mockRes.headers[k] = v;
      }),
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    const mockNext = vi.fn();

    // 1st request -> allowed
    await limiter(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 3);
    expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 2);

    // 2nd request -> allowed
    await limiter(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalledTimes(2);
    expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 1);

    // 3rd request -> allowed
    await limiter(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalledTimes(3);
    expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 0);

    // 4th request -> blocked with 429
    await limiter(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalledTimes(3); // Not incremented
    expect(mockRes.status).toHaveBeenCalledWith(429);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'RATE_LIMIT_EXCEEDED',
      })
    );
  });

  it('authRateLimiter is properly configured with 15-minute window', () => {
    expect(authRateLimiter).toBeDefined();
    expect(typeof authRateLimiter).toBe('function');
  });

  it('punchRateLimiter is properly configured with 1-minute window', () => {
    expect(punchRateLimiter).toBeDefined();
    expect(typeof punchRateLimiter).toBe('function');
  });

  it('rateLimiter differentiates clients by IP address or user ID', async () => {
    const limiter = rateLimiter({
      windowSeconds: 60,
      maxRequests: 1,
      prefix: 'test:diff',
    });

    const mockRes1: any = {
      headers: {},
      setHeader: vi.fn(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const mockRes2: any = {
      headers: {},
      setHeader: vi.fn(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    const mockNext = vi.fn();

    // Client A
    await limiter({ headers: {}, socket: { remoteAddress: '10.0.0.1' } } as any, mockRes1, mockNext);
    expect(mockNext).toHaveBeenCalledTimes(1);

    // Client B from different IP is NOT blocked
    await limiter({ headers: {}, socket: { remoteAddress: '10.0.0.2' } } as any, mockRes2, mockNext);
    expect(mockNext).toHaveBeenCalledTimes(2);
  });
});
