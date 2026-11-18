import './database.js';
import { PrismaClient } from '@prisma/client';
import { buildDatabaseUrl } from './database.js';
import { invalidateTenantCache } from '../services/cacheService.js';
import { emitToUser } from '../services/realtimeService.js';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: buildDatabaseUrl(),
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

prisma.$use(async (params, next) => {
  const result = await next(params);
  if (params.model === 'Company' && ['update', 'delete', 'upsert'].includes(params.action)) {
    try {
      const companyId = params.args?.where?.id || result?.id;
      const subdomain = params.args?.where?.subdomain || result?.subdomain;
      invalidateTenantCache(companyId, subdomain).catch(() => {});
    } catch {
      // safe ignore
    }
  }

  // Real-time instant push notification to user
  if (params.model === 'Notification' && params.action === 'create' && result?.userId) {
    try {
      emitToUser(result.userId, 'notification', result);
    } catch {
      // safe ignore
    }
  }

  return result;
});

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export default prisma;
