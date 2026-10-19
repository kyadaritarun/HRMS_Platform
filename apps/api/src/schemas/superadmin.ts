import { z } from 'zod';

export const SuperAdminCreateCompanySchema = z.object({
  name: z.string().min(1, 'Company name is required'),
  code: z.string().min(1).toUpperCase().optional(),
  subdomain: z.string().min(1, 'Subdomain is required').toLowerCase(),
  customDomain: z.string().nullable().optional(),
  logo: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  address: z.any().optional(),
  packageId: z.number().nullable().optional(),
  planType: z.enum(['MONTHLY', 'QUARTERLY', 'YEARLY']).default('MONTHLY'),
  subAmount: z.number().min(0).optional(),
  workingDays: z.string().default('mon,tue,wed,thu,fri'),
  timezone: z.string().default('Asia/Kolkata'),
  allowedEmailDomains: z.string().default(''),
  isActive: z.boolean().default(true),
  adminName: z.string().optional(),
  adminEmail: z.string().optional(),
  adminPhone: z.string().optional(),
  paymentStatus: z.enum(['IN_PROCESS', 'PAYMENT_DONE', 'DECLINE']).optional(),
  sendPaymentLink: z.boolean().default(true).optional(),
});

export const SuperAdminUpdateCompanySchema = SuperAdminCreateCompanySchema.partial().extend({
  isActive: z.boolean().optional(),
  subIsActive: z.boolean().optional(),
  subEndDate: z.string().nullable().optional(),
  nextPaymentDate: z.string().nullable().optional(),
  paymentStatus: z.enum(['IN_PROCESS', 'PAYMENT_DONE', 'DECLINE']).optional(),
});

export const SuperAdminPackageSchema = z.object({
  name: z.string().min(1, 'Package name is required'),
  description: z.string().default(''),
  currency: z.string().default('INR'),
  priceMonthly: z.number().min(0).optional(),
  priceQuarterly: z.number().min(0).optional(),
  priceYearly: z.number().min(0).optional(),
  employeeLimit: z.number().min(1).default(10),
  billingDefault: z.enum(['MONTHLY', 'QUARTERLY', 'YEARLY']).default('MONTHLY'),
  enabledFeatures: z.array(z.string()).default([]),
  tier: z.enum(['BASIC', 'MEDIUM', 'CUSTOM']).optional(),
  companyName: z.string().optional(),
});

export const SuperAdminInvoiceSchema = z.object({
  companyId: z.number(),
  amount: z.number().min(0),
  currency: z.string().default('INR'),
  billingCycle: z.enum(['MONTHLY', 'QUARTERLY', 'YEARLY', 'ANNUAL', 'OVERUSE_SEATS']).default('MONTHLY'),
  periodStart: z.string(),
  periodEnd: z.string(),
  dueDate: z.string(),
  status: z.enum(['DRAFT', 'PENDING', 'PAID', 'OVERDUE', 'CANCELLED', 'VOID']).default('PENDING'),
  paymentMethod: z.string().optional(),
  paymentReference: z.string().optional(),
  sendEmail: z.boolean().optional(),
  notes: z.string().optional(),
});
