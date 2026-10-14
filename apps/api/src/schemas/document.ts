import { z } from 'zod';

export const UploadDocumentSchema = z.object({
  category: z.enum(['IDENTITY', 'EDUCATION', 'EXPERIENCE', 'ONBOARDING', 'OTHER']),
  title: z.string().min(1, 'Title is required'),
  identifier: z.string().default(''),
  notes: z.string().default(''),
  issueDate: z.string().optional(),
  expiryDate: z.string().optional(),
  data: z.record(z.unknown()).default({}),
});

export const RejectDocumentSchema = z.object({
  rejectionNote: z.string().min(1, 'Rejection note is required'),
});
