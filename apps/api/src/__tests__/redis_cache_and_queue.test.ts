import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCache, setCache, deleteCache, getOrSetCache, invalidateTenantCache } from '../services/cacheService.js';
import { queueEmail } from '../services/emailQueue.js';
import * as mailerModule from '../lib/mailer.js';

describe('Part 1 - Redis Cache & Fallback Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getCache returns null gracefully when Redis is disconnected', async () => {
    const val = await getCache('sample_key');
    expect(val).toBeNull();
  });

  it('setCache returns false gracefully when Redis is disconnected', async () => {
    const result = await setCache('sample_key', { foo: 'bar' });
    expect(result).toBe(false);
  });

  it('deleteCache returns false gracefully when Redis is disconnected', async () => {
    const result = await deleteCache('sample_key');
    expect(result).toBe(false);
  });

  it('getOrSetCache invokes fetch function and returns data on cache miss/fallback', async () => {
    const mockFetcher = vi.fn().mockResolvedValue({ id: 101, name: 'Uptrix Global' });
    const result = await getOrSetCache('tenant:id:101', 300, mockFetcher);

    expect(mockFetcher).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ id: 101, name: 'Uptrix Global' });
  });

  it('invalidateTenantCache executes without throwing error', async () => {
    await expect(invalidateTenantCache(101, 'uptrix')).resolves.not.toThrow();
  });

  it('queueEmail safely dispatches via sendEmail fallback when Redis queue is offline', async () => {
    const sendEmailSpy = vi.spyOn(mailerModule, 'sendEmail').mockResolvedValueOnce({ success: true });

    await queueEmail({
      to: 'employee@uptrix.io',
      subject: 'Holiday Notice',
      html: '<p>Holiday tomorrow</p>',
    });

    expect(sendEmailSpy).toHaveBeenCalledTimes(1);
    expect(sendEmailSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'employee@uptrix.io',
        subject: 'Holiday Notice',
      })
    );
  });
});
