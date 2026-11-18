import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}

/**
 * Request ID Correlation Middleware.
 * Generates or propagates an X-Request-Id UUID header across all incoming requests.
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const existingId = req.headers['x-request-id'] as string | undefined;
  const requestId = existingId && existingId.trim() !== '' ? existingId : `req-${crypto.randomUUID()}`;

  req.id = requestId;
  res.setHeader('X-Request-Id', requestId);

  next();
}
