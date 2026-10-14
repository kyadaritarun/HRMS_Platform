import { z } from 'zod';

export const CreateEmployeeSchema = z.object({
  email: z.string().email(),
  username: z.string().min(2),
  firstName: z.string().min(1),
  lastName: z.string().default(''),
  phone: z.string().default(''),
  role: z.enum(['COMPANY_ADMIN', 'HR', 'EMPLOYEE']).default('EMPLOYEE'),
  departmentId: z.number().nullable().optional(),
  managerId: z.number().nullable().optional(),
  jobTitle: z.string().default(''),
  shiftId: z.string().nullable().optional(),
  workMode: z.enum(['WFO', 'WFH', 'HYBRID']).default('WFO'),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME']).default('FULL_TIME'),
  employeeNumber: z.string().default(''),
  joiningDate: z.string().optional(),
  dateOfBirth: z.string().optional(),
  probationStart: z.string().optional(),
  probationEnd: z.string().optional(),
  noticePeriodDays: z.number().nullable().optional(),
  personalEmail: z.string().default(''),
  emergencyContact: z
    .object({
      name: z.string().default(''),
      relationship: z.string().default(''),
      phone: z.string().default(''),
    })
    .default({ name: '', relationship: '', phone: '' }),
  monthlySalary: z.number().min(0).default(0),
  currency: z.string().default('INR'),
  bankDetails: z
    .object({
      paymentMode: z.enum(['BANK_TRANSFER', 'CASH', 'CHEQUE']).default('BANK_TRANSFER'),
      bankName: z.string().default(''),
      accountNumber: z.string().default(''),
      ifscCode: z.string().default(''),
      panNumber: z.string().default(''),
    })
    .default({ paymentMode: 'BANK_TRANSFER', bankName: '', accountNumber: '', ifscCode: '', panNumber: '' }),
  hrPermissions: z.array(z.string()).nullable().optional(),
  canManagePerformance: z.boolean().default(false),
});

export const UpdateEmployeeSchema = CreateEmployeeSchema.partial();
