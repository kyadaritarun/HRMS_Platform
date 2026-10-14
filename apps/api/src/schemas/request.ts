import { z } from 'zod';

export const CreateRequestSchema = z.object({
  type: z.enum(['LEAVE', 'COMP_OFF', 'REGULARIZATION', 'CLAIM', 'GOAL', 'TASK']),
  title: z.string().default(''),
  reason: z.string().min(1, 'Reason or description is required'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  days: z.number().optional(),
  amount: z.number().optional(),
  leaveTypeId: z.number().optional(),
  meta: z.record(z.unknown()).default({}),
});

export const DecisionRequestSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  note: z.string().optional(),
});
