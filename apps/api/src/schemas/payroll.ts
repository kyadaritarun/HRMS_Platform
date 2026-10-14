import { z } from 'zod';

export const AdjustmentsSchema = z.object({
  employeeId: z.number(),
  month: z.number().min(1).max(12),
  year: z.number().min(2020),
  bonus: z.number().min(0).default(0),
  otherDeductions: z.number().min(0).default(0),
  remarks: z.string().default(''),
});

export const PublishPayrollSchema = z.object({
  month: z.number().min(1).max(12),
  year: z.number().min(2020),
  employeeIds: z.array(z.number()).min(1, 'At least one employee must be selected to publish'),
  force: z.boolean().default(false),
});

export const UpdateSalarySchema = z.object({
  monthlySalary: z.number().min(0),
  currency: z.string().default('INR'),
  bankDetails: z
    .object({
      paymentMode: z.enum(['BANK_TRANSFER', 'CASH', 'CHEQUE']).default('BANK_TRANSFER'),
      bankName: z.string().default(''),
      accountNumber: z.string().default(''),
      ifscCode: z.string().default(''),
      panNumber: z.string().default(''),
    })
    .default({
      paymentMode: 'BANK_TRANSFER',
      bankName: '',
      accountNumber: '',
      ifscCode: '',
      panNumber: '',
    }),
});
