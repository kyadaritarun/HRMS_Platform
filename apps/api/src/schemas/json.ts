import { z } from 'zod';

// Company.address
export const AddressJsonSchema = z.object({
  line1: z.string().default(''),
  line2: z.string().default(''),
  city: z.string().default(''),
  state: z.string().default(''),
  postalCode: z.string().default(''),
  country: z.string().default(''),
});
export type AddressJson = z.infer<typeof AddressJsonSchema>;

// Company.shifts (array)
export const ShiftJsonSchema = z.object({
  id: z.string(), // uuid
  name: z.string(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Must be HH:mm'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Must be HH:mm'),
  workingDays: z.string().default('mon,tue,wed,thu,fri'),
  isDefault: z.boolean().default(false),
});
export const ShiftsListJsonSchema = z.array(ShiftJsonSchema);
export type ShiftJson = z.infer<typeof ShiftJsonSchema>;

// Company.settings
export const CompanySettingsJsonSchema = z.object({
  claimCategories: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      isActive: z.boolean().default(true),
    })
  ).default([]),
  claimCurrencies: z.array(
    z.object({
      code: z.string(),
      isActive: z.boolean().default(true),
    })
  ).default([]),
  quickLinks: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      url: z.string(),
      audience: z.enum(['ALL', 'EMPLOYEE', 'HR', 'ADMIN']).default('ALL'),
      sortOrder: z.number().default(0),
      isActive: z.boolean().default(true),
    })
  ).default([]),
  performanceCycles: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      description: z.string().default(''),
      startDate: z.string(),
      endDate: z.string(),
      isActive: z.boolean().default(true),
    })
  ).default([]),
});
export type CompanySettingsJson = z.infer<typeof CompanySettingsJsonSchema>;

// User.bankDetails
export const BankDetailsJsonSchema = z.object({
  paymentMode: z.enum(['BANK_TRANSFER', 'CASH', 'CHEQUE']).default('BANK_TRANSFER'),
  bankName: z.string().default(''),
  accountNumber: z.string().default(''),
  ifscCode: z.string().default(''),
  panNumber: z.string().default(''),
});
export type BankDetailsJson = z.infer<typeof BankDetailsJsonSchema>;

// User.emergencyContact
export const EmergencyContactJsonSchema = z.object({
  name: z.string().default(''),
  relationship: z.string().default(''),
  phone: z.string().default(''),
});
export type EmergencyContactJson = z.infer<typeof EmergencyContactJsonSchema>;

// LeaveType.accrual
export const AccrualJsonSchema = z.object({
  frequency: z.enum(['NONE', 'MONTHLY', 'YEARLY']).default('NONE'),
  amount: z.number().default(0),
});
export type AccrualJson = z.infer<typeof AccrualJsonSchema>;

// Request.meta per type
export const LeaveMetaSchema = z.object({
  isHalfDay: z.boolean().default(false),
});

export const CompOffMetaSchema = z.object({
  holidayId: z.number().optional(),
});

export const RegularizationMetaSchema = z.object({
  requestedCheckIn: z.string().regex(/^\d{2}:\d{2}$/, 'Must be HH:mm').optional(),
  requestedCheckOut: z.string().regex(/^\d{2}:\d{2}$/, 'Must be HH:mm').optional(),
  appliedAttendanceId: z.number().optional(),
});

export const ClaimMetaSchema = z.object({
  category: z.string().default(''),
  currency: z.string().default('INR'),
  receiptUrl: z.string().optional(),
});

export const GoalMetaSchema = z.object({
  cycleId: z.string().default(''),
  weight: z.number().default(0),
  goalStatus: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'DONE']).default('NOT_STARTED'),
  comments: z.array(
    z.object({
      authorId: z.number(),
      body: z.string(),
      at: z.string(),
    })
  ).default([]),
});

export const TaskMetaSchema = z.object({
  taskStatus: z.enum(['TODO', 'DONE']).default('TODO'),
});

// Document.data
export const EducationDataSchema = z.object({
  degree: z.string().default(''),
  specialization: z.string().default(''),
  university: z.string().default(''),
  yearOfJoining: z.union([z.number(), z.string()]).optional(),
  yearOfCompletion: z.union([z.number(), z.string()]).optional(),
  score: z.string().default(''),
  location: z.string().default(''),
});

export const ExperienceDataSchema = z.object({
  organization: z.string().default(''),
  title: z.string().default(''),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  location: z.string().default(''),
  description: z.string().default(''),
});

// Document.versions
export const DocumentVersionJsonSchema = z.object({
  version: z.number(),
  fileUrl: z.string(),
  uploadedById: z.number(),
  at: z.string(),
  snapshot: z.record(z.unknown()).default({}),
});
export const DocumentVersionsListSchema = z.array(DocumentVersionJsonSchema);

// Ticket.comments
export const TicketCommentJsonSchema = z.object({
  id: z.string(),
  authorId: z.number(),
  authorName: z.string().optional(),
  body: z.string(),
  isInternal: z.boolean().default(false),
  createdAt: z.string(),
});
export const TicketCommentsListSchema = z.array(TicketCommentJsonSchema);
export type TicketCommentJson = z.infer<typeof TicketCommentJsonSchema>;

// Payslip.snapshot
export const CustomSalaryComponentSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  type: z.enum(['EARNING', 'DEDUCTION']),
  amount: z.number().min(0),
});

export const PayslipSnapshotJsonSchema = z.object({
  baseSalary: z.number(),
  basicSalary: z.number().optional(),
  hra: z.number().optional(),
  specialAllowance: z.number().optional(),
  currency: z.string(),
  totalCalendarDays: z.number(),
  workingDaysCount: z.number(),
  presentDays: z.number(),
  paidLeaveDays: z.number(),
  unpaidLeaveDays: z.number(),
  absentDays: z.number(),
  totalLopDays: z.number(),
  perDayRate: z.number(),
  leaveDeduction: z.number(),
  bonus: z.number(),
  pf: z.number().optional(),
  pt: z.number().optional(),
  tds: z.number().optional(),
  otherDeductions: z.number(),
  customComponents: z.array(CustomSalaryComponentSchema).default([]).optional(),
  totalDeductions: z.number(),
  grossEarnings: z.number(),
  netSalary: z.number(),
  paymentMode: z.string(),
  bankName: z.string(),
  accountNumberMasked: z.string(),
  remarks: z.string().default(''),
});
export type PayslipSnapshotJson = z.infer<typeof PayslipSnapshotJsonSchema>;

// Notification.payload (KUDOS)
export const KudosPayloadSchema = z.object({
  senderId: z.number(),
  senderName: z.string().optional(),
  badge: z.string(),
  message: z.string().optional(),
});

// Invoice.payment
export const InvoicePaymentJsonSchema = z.object({
  provider: z.string().default('MANUAL'),
  reference: z.string().default(''),
  status: z.string().default('PENDING'),
  billingEmail: z.string().default(''),
});

// Server.deployments
export const DeploymentJsonSchema = z.object({
  id: z.string(),
  companyId: z.number(),
  domain: z.string(),
  stage: z.string(),
  success: z.boolean().nullable(),
  failedStage: z.string().optional(),
  failureReason: z.string().optional(),
  isRetry: z.boolean().default(false),
  startedById: z.number(),
  startedAt: z.string(),
  completedAt: z.string().optional(),
  log: z.array(z.string()).default([]),
});
