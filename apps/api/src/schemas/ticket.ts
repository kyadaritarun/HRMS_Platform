import { z } from 'zod';

export const CreateTicketSchema = z.object({
  category: z.string().optional(),
  department: z.string().optional(),
  subject: z.string().optional(),
  title: z.string().optional(),
  description: z.string().min(1, 'Description is required'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'URGENT']).default('MEDIUM'),
  departmentId: z.number().nullable().optional(),
}).refine((data) => Boolean(data.subject || data.title), {
  message: 'Subject or title is required',
});

export const AddTicketCommentSchema = z.object({
  body: z.string().optional(),
  message: z.string().optional(),
  isInternal: z.boolean().default(false),
}).refine((data) => Boolean(data.body || data.message), {
  message: 'Comment body or message is required',
});

export const UpdateTicketSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'URGENT']).optional(),
  assigneeId: z.number().nullable().optional(),
});

