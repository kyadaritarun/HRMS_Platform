import { z } from 'zod';

export const CustomSalaryComponentSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  type: z.enum(['EARNING', 'DEDUCTION']),
  amount: z.number().min(0),
});

export const AdjustmentsSchema = z.object({
  employeeId: z.number(),
  month: z.number().min(1).max(12),
  year: z.number().min(2020),
  basicSalary: z.number().min(0).optional(),
  hra: z.number().min(0).optional(),
  specialAllowance: z.number().min(0).optional(),
  bonus: z.number().min(0).default(0),
  pf: z.number().min(0).default(0),
  pt: z.number().min(0).default(0),
  tds: z.number().min(0).default(0),
  otherDeductions: z.number().min(0).default(0),
  customComponents: z.array(CustomSalaryComponentSchema).default([]).optional(),
  remarks: z.string().default(''),
  force: z.boolean().default(false).optional(),
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
  basicSalary: z.number().min(0).optional(),
  hra: z.number().min(0).optional(),
  specialAllowance: z.number().min(0).optional(),
  pf: z.number().min(0).optional(),
  pt: z.number().min(0).optional(),
  tds: z.number().min(0).optional(),
  customComponents: z.array(CustomSalaryComponentSchema).default([]).optional(),
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
