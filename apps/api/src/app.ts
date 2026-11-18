import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import { tenantMiddleware } from './middlewares/tenant.js';
import { authMiddleware } from './middlewares/auth.js';
import { tenantMatchMiddleware } from './middlewares/tenantMatch.js';
import { policyComplianceMiddleware } from './middlewares/policyCompliance.js';
import { errorHandler } from './middlewares/errorHandler.js';
import authRoutes from './routes/auth.js';
import superadminRoutes from './routes/superadmin.js';
import companyRoutes from './routes/company.js';
import employeesRoutes from './routes/employees.js';
import documentsRoutes from './routes/documents.js';
import attendanceRoutes from './routes/attendance.js';
import requestsRoutes from './routes/requests.js';
import notificationsRoutes from './routes/notifications.js';
import payrollRoutes from './routes/payroll.js';
import ticketsRoutes from './routes/tickets.js';
import policiesRoutes from './routes/policies.js';
import appreciationsRoutes from './routes/appreciations.js';
import orgStructureRoutes from './routes/orgStructure.js';
import assistantRoutes from './routes/assistant.js';
import subscriptionRoutes from './routes/subscription.js';
import referralsRoutes from './routes/referrals.js';
import reportsRoutes from './routes/reports.js';
import { businessCompanyRouter, businessPayrollRouter } from './routes/businessRecords.js';
import { getHelplineConfig } from './services/helplineService.js';

import fs from 'fs';
import { isS3Configured, getS3FileStream } from './lib/storage.js';
import prisma from './lib/prisma.js';
import redis, { isRedisReady } from './lib/redis.js';
import { getActiveConnectionCount } from './services/realtimeService.js';

import { requestIdMiddleware } from './middlewares/requestId.js';

export const app = express();

// Assign and propagate X-Request-Id correlation ID
app.use(requestIdMiddleware);

// Security and standard parsers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginEmbedderPolicy: false,
  frameguard: false,
  contentSecurityPolicy: false,
}));

const configuredOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://hrms.tarunkyadari.in',
  'http://hrms.tarunkyadari.in',
  ...configuredOrigins,
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. server-to-server, curl, mobile) or matching origins
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        origin.endsWith('.localhost:3000') ||
        origin.endsWith('.tarunkyadari.in') ||
        origin === 'https://hrms.tarunkyadari.in' ||
        origin === 'http://hrms.tarunkyadari.in'
      ) {
        callback(null, true);
      } else {
        callback(null, true); // Permissive fallback
      }
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// File serving for profile images: Stream directly from AWS S3 'image/' folder
const handleImageStreaming = async (req: express.Request, res: express.Response) => {
  const filename = req.params.filename;
  const s3Key = `image/${filename}`;

  res.removeHeader('X-Frame-Options');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Security-Policy', "frame-ancestors *");

  if (isS3Configured()) {
    try {
      const s3Stream = await getS3FileStream(s3Key);
      if (s3Stream && s3Stream.Body) {
        if (s3Stream.ContentType) res.setHeader('Content-Type', s3Stream.ContentType);
        if (s3Stream.ContentLength) res.setHeader('Content-Length', s3Stream.ContentLength);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return (s3Stream.Body as any).pipe(res);
      }
    } catch {
      // S3 stream error
    }
  }

  return res.status(404).json({ error: 'Image not found in AWS S3' });
};

app.get(['/image/:filename(*)', '/images/:filename(*)', '/api/v1/image/:filename(*)'], handleImageStreaming);

// File serving for uploads: Stream directly from AWS S3
app.get(['/uploads/:filename(*)', '/api/v1/uploads/:filename(*)'], async (req, res) => {
  let filename = req.params.filename;
  if (filename.startsWith('uploads/')) {
    filename = filename.replace(/^uploads\//, '');
  }
  const s3Key = filename.startsWith('image/') ? filename : `uploads/${filename}`;

  res.removeHeader('X-Frame-Options');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Security-Policy', "frame-ancestors *");

  if (isS3Configured()) {
    try {
      const s3Stream = await getS3FileStream(s3Key);
      if (s3Stream && s3Stream.Body) {
        if (s3Stream.ContentType) res.setHeader('Content-Type', s3Stream.ContentType);
        if (s3Stream.ContentLength) res.setHeader('Content-Length', s3Stream.ContentLength);
        res.setHeader('Content-Disposition', 'inline');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return (s3Stream.Body as any).pipe(res);
      }
    } catch {
      // S3 stream error
    }
  }

  return res.status(404).json({ error: 'File not found in AWS S3' });
});

// Tenant resolution middleware (attaches req.company if subdomain found)
app.use(tenantMiddleware);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Deep telemetry & diagnostic health check
app.get(['/health/system', '/api/v1/health/system'], async (_req, res) => {
  const dbStart = Date.now();
  let dbStatus = 'healthy';
  let dbLatencyMs = 0;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - dbStart;
  } catch {
    dbStatus = 'degraded';
  }

  const redisStart = Date.now();
  let redisStatus = 'offline';
  let redisLatencyMs = 0;
  if (isRedisReady() && redis) {
    try {
      await redis.ping();
      redisStatus = 'healthy';
      redisLatencyMs = Date.now() - redisStart;
    } catch {
      redisStatus = 'degraded';
    }
  }

  const memory = process.memoryUsage();
  const uptimeSeconds = Math.floor(process.uptime());
  const isHealthy = dbStatus === 'healthy';

  return res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'degraded',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    uptimeSeconds,
    services: {
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
        provider: 'PostgreSQL',
      },
      cacheAndQueue: {
        status: redisStatus,
        latencyMs: redisLatencyMs,
        provider: 'Redis (ioredis + BullMQ)',
      },
      storage: {
        status: isS3Configured() ? 'healthy' : 'fallback_or_disabled',
        provider: 'AWS S3',
      },
      realtimeSSE: {
        status: 'active',
        activeConnections: getActiveConnectionCount(),
      },
    },
    system: {
      memoryRssMb: Math.round(memory.rss / (1024 * 1024)),
      memoryHeapUsedMb: Math.round(memory.heapUsed / (1024 * 1024)),
      nodeVersion: process.version,
    },
  });
});

// Mount API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/superadmin', superadminRoutes);
app.use('/api/v1/company', companyRoutes);
app.use('/api/v1/company', businessCompanyRouter);
app.use('/api/v1/company/documents', documentsRoutes);
app.use('/api/v1/employees', employeesRoutes);
app.use('/api/v1/documents', documentsRoutes);
app.use(['/api/v1/attendance', '/api/v1/company/attendance'], attendanceRoutes);
app.use('/api/v1/requests', requestsRoutes);
app.use('/api/v1/notifications', notificationsRoutes);
app.use('/api/v1/payroll', payrollRoutes);
app.use('/api/v1/payroll', businessPayrollRouter);
app.use('/api/v1/tickets', ticketsRoutes);
app.use('/api/v1/policies', policiesRoutes);
app.use('/api/v1/company/policies', policiesRoutes);
app.use('/api/v1/appreciations', appreciationsRoutes);
app.use('/api/v1/org-structure', orgStructureRoutes);
app.use('/api/v1/assistant', assistantRoutes);
app.use('/api/v1/subscription', subscriptionRoutes);
app.use('/api/v1/referrals', referralsRoutes);
app.use(['/api/v1/reports', '/api/v1/company/reports'], reportsRoutes);

// Global Helpline endpoint accessible across all companies
app.get('/api/v1/helpline', async (_req, res) => {
  const config = await getHelplineConfig();
  res.json({ config });
});

// Protected tenant test endpoint
app.get(
  '/api/v1/protected-tenant-test',
  authMiddleware,
  tenantMatchMiddleware,
  policyComplianceMiddleware,
  (req, res) => {
    res.json({ success: true, companyId: req.user!.companyId, role: req.user!.role });
  }
);

// Error handling middleware
app.use(errorHandler);

export default app;
