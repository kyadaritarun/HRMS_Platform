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
import { businessCompanyRouter, businessPayrollRouter } from './routes/businessRecords.js';

import fs from 'fs';
import { isS3Configured, getS3FileStream } from './lib/storage.js';

export const app = express();

// Security and standard parsers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      'img-src': ["'self'", 'data:', 'https:'],
    },
  },
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

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// File serving for profile images: Stream directly from AWS S3 'image/' folder
const handleImageStreaming = async (req: express.Request, res: express.Response) => {
  const filename = req.params.filename;
  const s3Key = `image/${filename}`;

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
