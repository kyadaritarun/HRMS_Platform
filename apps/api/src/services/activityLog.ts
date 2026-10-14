import prisma from '../lib/prisma.js';

interface LogActivityOptions {
  companyId: number;
  actorId?: number;
  action: string;
  objectType?: string;
  objectId?: string;
  message: string;
  metadata?: any;
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
