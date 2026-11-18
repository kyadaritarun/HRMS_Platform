import { describe, it, expect, vi } from 'vitest';
import { requestIdMiddleware } from '../middlewares/requestId.js';
import { errorHandler, AppError } from '../middlewares/errorHandler.js';
import { logAudit } from '../services/activityLog.js';
import prisma from '../lib/prisma.js';

describe('Part 4 - Enterprise Audit Trail & Request Tracing Tests', () => {
  it('requestIdMiddleware generates a unique X-Request-Id and attaches req.id', () => {
    const mockReq: any = { headers: {} };
    const mockRes: any = {
      setHeader: vi.fn(),
    };
    const mockNext = vi.fn();

    requestIdMiddleware(mockReq, mockRes, mockNext);

    expect(mockReq.id).toBeDefined();
    expect(mockReq.id).toMatch(/^req-/);
    expect(mockRes.setHeader).toHaveBeenCalledWith('X-Request-Id', mockReq.id);
    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  it('requestIdMiddleware propagates existing X-Request-Id if provided', () => {
    const mockReq: any = { headers: { 'x-request-id': 'client-assigned-12345' } };
    const mockRes: any = {
      setHeader: vi.fn(),
    };
    const mockNext = vi.fn();

    requestIdMiddleware(mockReq, mockRes, mockNext);

    expect(mockReq.id).toBe('client-assigned-12345');
    expect(mockRes.setHeader).toHaveBeenCalledWith('X-Request-Id', 'client-assigned-12345');
    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  it('errorHandler attaches requestId to JSON error response for instant tracing', () => {
    const mockReq: any = { id: 'req-test-9999', headers: {} };
    const mockRes: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const mockNext = vi.fn();

    const appError = new AppError(400, 'BAD_REQUEST', 'Invalid parameters provided');
    errorHandler(appError, mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'BAD_REQUEST',
        error: 'Invalid parameters provided',
        requestId: 'req-test-9999',
      })
    );
  });

  it('logAudit records audit metadata with actor, IP, user-agent, and state diffs', async () => {
    const createSpy = vi.spyOn(prisma.activityLog, 'create').mockResolvedValueOnce({
      id: 501,
      companyId: 10,
      actorId: 20,
      action: 'UPDATE_SALARY',
      objectType: 'User',
      objectId: '25',
      message: 'Monthly salary updated from 50000 to 60000',
      metadata: {},
      createdAt: new Date(),
    } as any);

    const mockReq: any = {
      id: 'req-audit-123',
      user: { id: 20, email: 'hr@uptrix.io', role: 'HR', companyId: 10 },
      company: { id: 10 },
      headers: { 'x-forwarded-for': '203.0.113.195', 'user-agent': 'Chrome/120' },
      socket: {},
    };

    const result = await logAudit(mockReq, {
      action: 'UPDATE_SALARY',
      objectType: 'User',
      objectId: '25',
      message: 'Monthly salary updated from 50000 to 60000',
      previousState: { salary: 50000 },
      newState: { salary: 60000 },
    });

    expect(result).toBeDefined();
    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          companyId: 10,
          actorId: 20,
          action: 'UPDATE_SALARY',
          metadata: expect.objectContaining({
            requestId: 'req-audit-123',
            ip: '203.0.113.195',
            previousState: { salary: 50000 },
            newState: { salary: 60000 },
          }),
        }),
      })
    );
  });
});
