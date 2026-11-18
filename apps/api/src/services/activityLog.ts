import { Request } from 'express';
import prisma from '../lib/prisma.js';

export interface LogActivityOptions {
  companyId: number;
  actorId?: number;
  action: string;
  objectType?: string;
  objectId?: string;
  message: string;
  metadata?: any;
}

export interface AuditContextOptions {
  action: string;
  objectType: string;
  objectId?: string;
  message: string;
  previousState?: any;
  newState?: any;
  details?: Record<string, any>;
}

export async function logActivity(opts: LogActivityOptions) {
  try {
    return await prisma.activityLog.create({
      data: {
        companyId: opts.companyId,
        actorId: opts.actorId,
        action: opts.action,
        objectType: opts.objectType || '',
        objectId: opts.objectId || '',
        message: opts.message,
        metadata: opts.metadata || {},
      },
    });
  } catch (error: any) {
    console.error('[ActivityLog Error]', error.message);
    return null;
  }
}

/**
 * Enterprise Audit Trail Helper (Part 4)
 * Extracts actor context, IP, user-agent, correlation requestId, and records state diffs.
 */
export async function logAudit(req: Request, opts: AuditContextOptions) {
  const companyId = req.company?.id || req.user?.companyId;
  if (!companyId) return null;

  const actorId = req.user?.id;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
  const clientIp = String(Array.isArray(ip) ? ip[0] : ip).split(',')[0].trim();
  const userAgent = req.headers['user-agent'] || '';
  const requestId = req.id || (req.headers['x-request-id'] as string) || '';

  const metadata = {
    requestId,
    ip: clientIp,
    userAgent,
    actorEmail: req.user?.email,
    actorRole: req.user?.role,
    previousState: opts.previousState !== undefined ? opts.previousState : undefined,
    newState: opts.newState !== undefined ? opts.newState : undefined,
    ...opts.details,
  };

  return await logActivity({
    companyId,
    actorId,
    action: opts.action,
    objectType: opts.objectType,
    objectId: opts.objectId,
    message: opts.message,
    metadata,
  });
}
