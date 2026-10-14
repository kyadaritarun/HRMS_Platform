import { z } from 'zod';

export const DepartmentSchema = z.object({
  name: z.string().min(1, 'Department name is required'),
  parentId: z.number().nullable().optional(),
});

export const HolidaySchema = z.object({
  name: z.string().min(1, 'Holiday name is required'),
  date: z.string().min(1, 'Date is required (YYYY-MM-DD)'),
  type: z.enum(['PUBLIC', 'FLOATER', 'OPTIONAL', 'MANDATORY', 'RESTRICTED']).default('PUBLIC'),
  description: z.string().default(''),
});

export const LeaveTypeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required').toUpperCase(),
  defaultAllocation: z.number().min(0).default(0),
  isPaid: z.boolean().default(true),
  requiresApproval: z.boolean().default(true),
  allowHalfDay: z.boolean().default(false),
  allowCarry: z.boolean().default(false),
  isCompOff: z.boolean().default(false),
  color: z.string().default('blue'),
  accrual: z
    .object({
      frequency: z.enum(['NONE', 'MONTHLY', 'YEARLY']).default('NONE'),
      amount: z.number().default(0),
    })
    .default({ frequency: 'NONE', amount: 0 }),
});

export const CompanySettingsUpdateSchema = z.object({
  workingDays: z.string().optional(),
  timezone: z.string().optional(),
  allowedEmailDomains: z.string().optional(),
  shifts: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        startTime: z.string(),
        endTime: z.string(),
        workingDays: z.string(),
        isDefault: z.boolean().default(false),
      })
    )
    .optional(),
  settings: z.record(z.unknown()).optional(),
});
