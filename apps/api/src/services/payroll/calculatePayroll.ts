import { toDateKey, isWorkableDay, getDaysInMonth } from '../../lib/dates.js';

export function round2(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

export interface SalaryComponentItem {
  id?: string;
  name: string;
  type: 'EARNING' | 'DEDUCTION';
  amount: number;
}

export interface PayrollInput {
  monthlySalary: number;
  basicSalary?: number;
  hra?: number;
  specialAllowance?: number;
  bonus?: number;
  pf?: number;
  pt?: number;
  tds?: number;
  otherDeductions?: number;
  customComponents?: SalaryComponentItem[];
  currency?: string;
  paymentMode?: string;
  bankName?: string;
  accountNumber?: string;
  remarks?: string;
  joiningDate?: Date | null;
  workingDaysStr?: string;
  holidays?: { date: Date }[];
  leaves?: {
    startDate: Date | null;
    endDate: Date | null;
    isPaid: boolean;
    isHalfDay: boolean;
    days?: number;
  }[];
  attendances?: {
    checkIn: Date;
    durationHours?: number | any;
  }[];
}

export interface PayrollResult {
  baseSalary: number;
  basicSalary: number;
  hra: number;
  specialAllowance: number;
  currency: string;
  totalCalendarDays: number;
  workingDaysCount: number;
  presentDays: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  absentDays: number;
  totalLopDays: number;
  overtimeHours: number;
  overtimePay: number;
  perDayRate: number;
  leaveDeduction: number;
  bonus: number;
  pf: number;
  pt: number;
  tds: number;
  otherDeductions: number;
  customComponents: SalaryComponentItem[];
  totalDeductions: number;
  grossEarnings: number;
  netSalary: number;
  paymentMode: string;
  bankName: string;
  accountNumberMasked: string;
  remarks: string;
}

export function calculateEmployeePayroll(
  year: number,
  month: number, // 1 to 12
  input: PayrollInput
): PayrollResult {
  const bonus = round2(input.bonus || 0);
  const otherDeductions = round2(input.otherDeductions || 0);
  const monthlySalary = round2(input.monthlySalary || 0);
  const currency = input.currency || 'INR';
  const paymentMode = input.paymentMode || 'BANK_TRANSFER';
  const bankName = input.bankName || '';
  const acct = input.accountNumber || '';
  const accountNumberMasked = acct.length > 4 ? `••••••••${acct.slice(-4)}` : acct ? '••••' : 'N/A';
  const remarks = input.remarks || '';

  // 1. Calendar days & Workable dates in month
  const calendarDays = getDaysInMonth(year, month);
  const totalCalendarDays = calendarDays.length;

  const holidayKeys = new Set(
    (input.holidays || []).map((h) => toDateKey(h.date))
  );
  const workingDaysStr = input.workingDaysStr || 'mon,tue,wed,thu,fri';

  // Workable dates in entire month
  const allWorkableDates = calendarDays.filter((d) =>
    isWorkableDay(d, workingDaysStr, holidayKeys)
  );

  const workingDaysCount = allWorkableDates.length;
  const divisor = workingDaysCount > 0 ? workingDaysCount : totalCalendarDays;
  const perDayRate = round2(monthlySalary / divisor);

  // 2. Joining date proration: workable dates on or after joiningDate
  const joiningDateKey = input.joiningDate ? toDateKey(input.joiningDate) : null;
  const expectedWorkableDates = allWorkableDates.filter((d) => {
    if (!joiningDateKey) return true;
    return toDateKey(d) >= joiningDateKey;
  });

  // 3. Attendance distinct dates in month
  const presentDateKeys = new Set<string>();
  for (const att of input.attendances || []) {
    const key = toDateKey(att.checkIn);
    // Attribute to checkIn date
    const attDate = new Date(att.checkIn);
    if (attDate.getUTCFullYear() === year && attDate.getUTCMonth() + 1 === month) {
      presentDateKeys.add(key);
    }
  }
  const presentDays = presentDateKeys.size;

  // 4. Approved Leaves in month
  let paidLeaveDays = 0;
  let unpaidLeaveDays = 0;
  const leaveDateKeys = new Set<string>();

  for (const leave of input.leaves || []) {
    if (!leave.startDate) continue;
    const lStart = new Date(leave.startDate);
    const lEnd = leave.endDate ? new Date(leave.endDate) : lStart;

    // Check every expected workable date overlapping this leave
    for (const wd of expectedWorkableDates) {
      const wdTime = wd.getTime();
      const sTime = new Date(Date.UTC(lStart.getUTCFullYear(), lStart.getUTCMonth(), lStart.getUTCDate())).getTime();
      const eTime = new Date(Date.UTC(lEnd.getUTCFullYear(), lEnd.getUTCMonth(), lEnd.getUTCDate())).getTime();

      if (wdTime >= sTime && wdTime <= eTime) {
        const key = toDateKey(wd);
        const dayPortion = leave.isHalfDay ? 0.5 : 1;

        if (leave.isPaid) {
          paidLeaveDays += dayPortion;
        } else {
          unpaidLeaveDays += dayPortion;
        }

        if (!leave.isHalfDay) {
          leaveDateKeys.add(key);
        }
      }
    }
  }

  // 5. Absent Days: expected workable dates NOT in presentDates AND NOT in leaveDates
  let absentDays = 0;
  for (const wd of expectedWorkableDates) {
    const key = toDateKey(wd);
    if (!presentDateKeys.has(key) && !leaveDateKeys.has(key)) {
      absentDays++;
    }
  }

  // 6. Overtime Calculation (duration > 8 hours on attendance)
  let overtimeHours = 0;
  for (const att of input.attendances || []) {
    const dur = Number((att as any).durationHours || 0);
    if (dur > 8) {
      overtimeHours += dur - 8;
    }
  }
  overtimeHours = round2(overtimeHours);
  const hourlyRate = divisor > 0 ? round2(perDayRate / 8) : 0;
  const overtimePay = round2(overtimeHours * hourlyRate * 1.5);

  // 7. Salary Component Breakup (Earnings & Deductions)
  const customComponents: SalaryComponentItem[] = (input.customComponents || [])
    .map((c) => ({
      id: c.id,
      name: String(c.name || '').trim(),
      type: (c.type === 'DEDUCTION' ? 'DEDUCTION' : 'EARNING') as 'EARNING' | 'DEDUCTION',
      amount: round2(Number(c.amount) || 0),
    }))
    .filter((c) => c.name && c.amount > 0);

  const customEarningsTotal = round2(
    customComponents
      .filter((c) => c.type === 'EARNING')
      .reduce((acc, c) => acc + c.amount, 0)
  );

  const customDeductionsTotal = round2(
    customComponents
      .filter((c) => c.type === 'DEDUCTION')
      .reduce((acc, c) => acc + c.amount, 0)
  );

  const basicSalary = input.basicSalary !== undefined && input.basicSalary >= 0
    ? round2(input.basicSalary)
    : round2(monthlySalary * 0.5);

  const hra = input.hra !== undefined && input.hra >= 0
    ? round2(input.hra)
    : round2(monthlySalary * 0.2);

  const specialAllowance = input.specialAllowance !== undefined && input.specialAllowance >= 0
    ? round2(input.specialAllowance)
    : Math.max(0, round2(monthlySalary - basicSalary - hra - customEarningsTotal));

  const pf = round2(input.pf || 0);
  const pt = round2(input.pt || 0);
  const tds = round2(input.tds || 0);

  // 8. Loss of Pay (LOP) and Total Deductions
  const totalLopDays = round2(unpaidLeaveDays + absentDays);
  const leaveDeduction = round2(perDayRate * totalLopDays);
  const totalDeductions = round2(leaveDeduction + pf + pt + tds + otherDeductions + customDeductionsTotal);
  const grossEarnings = round2(basicSalary + hra + specialAllowance + bonus + overtimePay + customEarningsTotal);
  const netSalary = Math.max(0, round2(grossEarnings - totalDeductions));

  return {
    baseSalary: monthlySalary,
    basicSalary,
    hra,
    specialAllowance,
    currency,
    totalCalendarDays,
    workingDaysCount,
    presentDays,
    paidLeaveDays,
    unpaidLeaveDays,
    absentDays,
    totalLopDays,
    overtimeHours,
    overtimePay,
    perDayRate,
    leaveDeduction,
    bonus,
    pf,
    pt,
    tds,
    otherDeductions,
    customComponents,
    totalDeductions,
    grossEarnings,
    netSalary,
    paymentMode,
    bankName,
    accountNumberMasked,
    remarks,
  };
}
