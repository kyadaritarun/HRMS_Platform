import { z } from 'zod';

export const CreatePolicySchema = z.object({
  policyType: z.string().default('HR'),
  category: z.string().optional(),
  title: z.string().min(1, 'Title is required'),
  slug: z.string().optional(),
  body: z.string().optional().default(''),
  content: z.string().optional(),
  documentUrl: z.string().nullable().optional(),
  extractedText: z.string().optional().default(''),
  validUntil: z.string().nullable().optional(),
  version: z.union([z.string(), z.number()]).optional(),
  isMandatory: z
    .union([
      z.boolean(),
      z.string().transform((v) => v === 'true' || v === '1'),
    ])
    .optional(),
  isActive: z
    .union([
      z.boolean(),
      z.string().transform((v) => v === 'true' || v === '1'),
    ])
    .optional(),
});

export const UpdatePolicySchema = CreatePolicySchema.partial().extend({
  bumpVersion: z
    .union([
      z.boolean(),
      z.string().transform((v) => v === 'true' || v === '1'),
    ])
    .default(false),
});

