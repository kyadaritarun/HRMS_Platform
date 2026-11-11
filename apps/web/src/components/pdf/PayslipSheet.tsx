import React from 'react';
import { PayslipData } from './PayslipPdfDrawer';

export interface PayslipCustomConfig {
  companyName?: string;
  companyAddress?: string;
  contact?: string;
  websiteOrEmail?: string;
  logoUrl?: string;
  autoReleasePayslip?: boolean;
  branchWisePayslip?: boolean;
  showLoanDetails?: boolean;
  showAttendanceSummary?: boolean;
  customNote?: string;
}

export interface PayslipSheetProps {
  payslip: PayslipData;
  company?: {
    name?: string;
    subdomain?: string;
    address?: any;
    settings?: any;
    statutory?: any;
    logo?: string | null;
  } | null;
  customConfig?: PayslipCustomConfig;
  className?: string;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function formatMoney(amount: number | undefined | null, showDecimals: boolean = true): string {
  const num = Number(amount || 0);
  return num.toLocaleString('en-IN', {
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  });
}

function toTitleCase(str: string | undefined | null): string {
  if (!str) return '—';
  return str
    .replace(/_/g, ' ')
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function numberToWordsINR(amount: number): string {
  if (!amount || isNaN(amount) || amount <= 0) return 'Zero Rupees Only';

  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function inWords(n: number): string {
    if (n === 0) return '';
    if (n < 20) return a[n] + ' ';
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '') + ' ';
    return a[Math.floor(n / 100)] + ' Hundred ' + (n % 100 !== 0 ? inWords(n % 100) : '');
  }

  const integerPart = Math.floor(amount);
  const decimalPart = Math.round((amount - integerPart) * 100);

  let str = '';
  const crore = Math.floor(integerPart / 10000000);
  let rem = integerPart % 10000000;
  const lakh = Math.floor(rem / 100000);
  rem = rem % 100000;
  const thousand = Math.floor(rem / 1000);
  rem = rem % 1000;
  const hundred = rem;

  if (crore > 0) str += inWords(crore).trim() + ' Crore ';
  if (lakh > 0) str += inWords(lakh).trim() + ' Lakh ';
  if (thousand > 0) str += inWords(thousand).trim() + ' Thousand ';
  if (hundred > 0) str += inWords(hundred).trim() + ' ';

  str = str.trim() + ' Rupees';

  if (decimalPart > 0) {
    str += ' and ' + inWords(decimalPart).trim() + ' Paise';
  }

  return str + ' Only';
}

export const PayslipSheet: React.FC<PayslipSheetProps> = ({
  payslip,
  company,
  customConfig,
  className = '',
}) => {
  const getSafeString = (val: any, fallback: string = '-'): string => {
    if (val === null || val === undefined) return fallback;
    if (typeof val === 'string') return val.trim() || fallback;
    if (typeof val === 'number') return String(val);
    if (typeof val === 'object' && val.name && typeof val.name === 'string') return val.name.trim() || fallback;
    return fallback;
  };

  // Company Name
  const companyNameStr =
    customConfig?.companyName?.trim() ||
    company?.name ||
    'WhiteScholars EduFutures Academy Private Limited';

  // Company Address
  const formatAddress = (addr: any): string => {
    if (!addr) return '';
    if (typeof addr === 'string') return addr;
    const parts = [addr.street, addr.addressLine2, addr.city, addr.state, addr.pinCode].filter(Boolean);
    return parts.join(', ');
  };

  const defaultAddrFallback =
    '5th Floor, Aero Hamd Building, Above HDFC Bank, Pillar no. 675A, Dharma Reddy Colony Phase 2, Hyder Nagar, Kukatpally, Hyderabad, Telangana 500 072';

  const companyAddressStr =
    customConfig?.companyAddress !== undefined
      ? customConfig.companyAddress
      : formatAddress(company?.address) || defaultAddrFallback;

  // Logo
  const logoUrl = customConfig?.logoUrl !== undefined ? customConfig.logoUrl : (company?.logo || '');

  // Contact & Website
  const contactStr = customConfig?.contact || '';
  const websiteStr = customConfig?.websiteOrEmail || (company as any)?.website || '';

  const c = payslip.calculation || {};
  const emp = payslip.employee || ({} as any);
  const monthName = MONTH_NAMES[(Number(payslip.month) || 1) - 1] || 'Current Month';

  // Employee details matching user screenshot
  const empName = `${getSafeString(emp.firstName, '')} ${getSafeString(emp.lastName, '')}`.trim() || 'John Doe';
  const empCode = emp.employeeNumber || (emp.id ? `EMP-${String(emp.id).padStart(3, '0')}` : 'EMP001');
  const empDesignation = getSafeString(emp.jobTitle, 'Senior Software Engineer');
  const empDept = getSafeString(emp.department, 'Engineering');

  let dojFormatted = '-';
  if (emp.dateOfJoining) {
    try {
      const d = new Date(emp.dateOfJoining);
      if (!isNaN(d.getTime())) {
        dojFormatted = d.toLocaleDateString('en-GB');
      } else {
        dojFormatted = String(emp.dateOfJoining);
      }
    } catch {
      dojFormatted = String(emp.dateOfJoining);
    }
  }

  const uanNumber = getSafeString(emp.uanNumber, '-');
  const workLocation = customConfig?.branchWisePayslip
    ? getSafeString((emp as any)?.branchName || (emp as any)?.location, 'Corporate HQ')
    : getSafeString((emp as any)?.location, '-');

  const bankName = getSafeString(c.bankName || emp.bankName, '-');
  const bankAccount = getSafeString(c.accountNumberMasked || emp.bankAccountMasked, '-');
  const ifscCode = getSafeString((emp as any)?.ifscCode || (c as any)?.ifscCode, '-');
  const branchName = getSafeString((emp as any)?.branchName, '-');
  const pfNumber = getSafeString(emp.pfNumber, '-');
  const esicNumber = getSafeString((emp as any)?.esicNumber, '-');

  // Days Breakdown matching bottom box
  const workedDays = c.presentDays !== undefined ? c.presentDays : (c.workingDaysCount ? c.workingDaysCount - (c.totalLopDays || 0) : 0);
  const holidayDays = (c as any)?.holidayDays !== undefined ? (c as any).holidayDays : 0;
  const paidLeaveDays = c.paidLeaveDays !== undefined ? c.paidLeaveDays : 0;
  const weeklyOffDays = (c as any)?.weeklyOffDays !== undefined ? (c as any).weeklyOffDays : 0;
  const unpaidDays = c.totalLopDays !== undefined ? c.totalLopDays : (c.unpaidLeaveDays !== undefined ? c.unpaidLeaveDays : '-');

  // Total payable days
  const totalPayableDays = typeof unpaidDays === 'number'
    ? Number(workedDays) + Number(holidayDays) + Number(paidLeaveDays) + Number(weeklyOffDays)
    : (c.workingDaysCount || (Number(workedDays) + Number(paidLeaveDays)));

  // Custom Components
  const customList = Array.isArray(c.customComponents) ? c.customComponents : [];

  // Earnings
  const baseSalary = Number(c.baseSalary || 0);
  const basicSalary = c.basicSalary !== undefined ? Number(c.basicSalary) : (baseSalary ? Math.round(baseSalary * 0.5) : 0);
  const hra = Number(c.hra || (baseSalary ? Math.round(baseSalary * 0.25) : 0));
  const specialAllowance = Number(c.specialAllowance || (baseSalary ? Math.round(baseSalary * 0.15) : 0));
  const bonus = Number(c.bonus || 0);

  const earningsList: { name: string; monthlyVal: number; amount: number }[] = [];
  if (basicSalary > 0 || baseSalary > 0) {
    earningsList.push({ name: 'Basic Salary', monthlyVal: basicSalary, amount: basicSalary });
  }
  if (hra > 0) {
    earningsList.push({ name: 'House Rent Allowance (HRA)', monthlyVal: hra, amount: hra });
  }
  if (specialAllowance > 0) {
    earningsList.push({ name: 'Special Allowance', monthlyVal: specialAllowance, amount: specialAllowance });
  }
  if (bonus > 0) {
    earningsList.push({ name: 'Bonus / Performance Incentives', monthlyVal: bonus, amount: bonus });
  }

  customList.filter((x) => x && x.type === 'EARNING').forEach((x) => {
    const val = Number(x.amount) || 0;
    earningsList.push({ name: String(x.name), monthlyVal: val, amount: val });
  });

  const grossMonthly = earningsList.reduce((acc, curr) => acc + curr.monthlyVal, 0);
  const grossEarnings = c.grossEarnings !== undefined ? Number(c.grossEarnings) : earningsList.reduce((acc, curr) => acc + curr.amount, 0);

  // Deductions
  const deductionsList: { name: string; amount: number }[] = [];
  const lopDeduction = Number(c.leaveDeduction || c.lopDeduction || 0);
  const pf = Number(c.pf || 0);
  const pt = Number(c.pt || 0);
  const tds = Number(c.tds || 0);
  const otherDeductions = Number(c.otherDeductions || 0);

  if (pf > 0) deductionsList.push({ name: 'Provident Fund (PF)', amount: pf });
  if (pt > 0) deductionsList.push({ name: 'Professional Tax (PT)', amount: pt });
  if (tds > 0) deductionsList.push({ name: 'Income Tax (TDS)', amount: tds });
  if (lopDeduction > 0) deductionsList.push({ name: `Loss of Pay (LOP) [${c.totalLopDays || 0}d]`, amount: lopDeduction });
  if (otherDeductions > 0) deductionsList.push({ name: 'Other Deductions', amount: otherDeductions });

  customList.filter((x) => x && x.type === 'DEDUCTION').forEach((x) => {
    deductionsList.push({ name: String(x.name), amount: Number(x.amount) || 0 });
  });

  const totalDeductions = c.totalDeductions !== undefined ? Number(c.totalDeductions) : deductionsList.reduce((acc, curr) => acc + curr.amount, 0);
  const netSalary = c.netSalary !== undefined ? Number(c.netSalary) : (grossEarnings - totalDeductions);

  return (
    <div
      id="printable-payslip-sheet"
      className={`bg-white rounded-xl shadow-lg border border-slate-200/90 p-6 sm:p-10 w-full max-w-4xl text-slate-900 font-sans text-xs flex flex-col justify-between space-y-6 ${className}`}
      style={{ minHeight: '850px' }}
    >
      <div className="space-y-6">
        {/* 1. Header Section (Exact match to screenshot) */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1.5 max-w-xl">
            {logoUrl && (
              <div className="mb-2">
                <img
                  src={logoUrl}
                  alt="Company Logo"
                  className="h-10 max-h-12 max-w-[200px] object-contain"
                />
              </div>
            )}
            <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
              {companyNameStr}
            </h1>
            {companyAddressStr && (
              <p className="text-[11px] text-slate-500 leading-relaxed font-normal">
                {companyAddressStr}
              </p>
            )}
            {(contactStr || websiteStr) && (
              <p className="text-[11px] text-slate-500 font-normal">
                {contactStr && `Contact: ${contactStr}`}
                {contactStr && websiteStr && '  •  '}
                {websiteStr && `${websiteStr}`}
              </p>
            )}
          </div>

          <div className="sm:text-right shrink-0 pt-2 sm:pt-6">
            <span className="text-xs sm:text-sm font-bold text-slate-900">
              Payslip from — {monthName} {payslip.year}
            </span>
          </div>
        </div>

        {/* Full-width Divider Line */}
        <div className="h-px bg-slate-200 w-full" />

        {/* 2. Employee Details Section (2 Balanced Columns with aligned colons) */}
        <div>
          <h2 className="text-sm font-bold text-slate-900 mb-3.5 tracking-tight">
            Employee Details
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-2 text-xs">
            {/* Left Column */}
            <div className="space-y-2">
              <div className="grid grid-cols-12 items-baseline">
                <span className="col-span-5 text-slate-700 font-medium">Employee Name</span>
                <span className="col-span-1 text-slate-400">:</span>
                <span className="col-span-6 font-semibold text-slate-900 truncate">
                  {toTitleCase(empName)}
                </span>
              </div>
              <div className="grid grid-cols-12 items-baseline">
                <span className="col-span-5 text-slate-700 font-medium">Code</span>
                <span className="col-span-1 text-slate-400">:</span>
                <span className="col-span-6 text-slate-800">
                  {empCode}
                </span>
              </div>
              <div className="grid grid-cols-12 items-baseline">
                <span className="col-span-5 text-slate-700 font-medium">Designation</span>
                <span className="col-span-1 text-slate-400">:</span>
                <span className="col-span-6 text-slate-800">
                  {empDesignation}
                </span>
              </div>
              <div className="grid grid-cols-12 items-baseline">
                <span className="col-span-5 text-slate-700 font-medium">Department</span>
                <span className="col-span-1 text-slate-400">:</span>
                <span className="col-span-6 text-slate-800">
                  {empDept}
                </span>
              </div>
              <div className="grid grid-cols-12 items-baseline">
                <span className="col-span-5 text-slate-700 font-medium">Date of Joining</span>
                <span className="col-span-1 text-slate-400">:</span>
                <span className="col-span-6 text-slate-800">
                  {dojFormatted}
                </span>
              </div>
              <div className="grid grid-cols-12 items-baseline">
                <span className="col-span-5 text-slate-700 font-medium">UAN Number</span>
                <span className="col-span-1 text-slate-400">:</span>
                <span className="col-span-6 text-slate-800 font-mono text-[11px]">
                  {uanNumber}
                </span>
              </div>
              <div className="grid grid-cols-12 items-baseline">
                <span className="col-span-5 text-slate-700 font-medium">Work Location</span>
                <span className="col-span-1 text-slate-400">:</span>
                <span className="col-span-6 text-slate-800">
                  {workLocation}
                </span>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-2">
              <div className="grid grid-cols-12 items-baseline">
                <span className="col-span-5 text-slate-700 font-medium">Bank Name</span>
                <span className="col-span-1 text-slate-400">:</span>
                <span className="col-span-6 text-slate-800">
                  {bankName}
                </span>
              </div>
              <div className="grid grid-cols-12 items-baseline">
                <span className="col-span-5 text-slate-700 font-medium">Bank A/C No.</span>
                <span className="col-span-1 text-slate-400">:</span>
                <span className="col-span-6 text-slate-800 font-mono text-[11px]">
                  {bankAccount}
                </span>
              </div>
              <div className="grid grid-cols-12 items-baseline">
                <span className="col-span-5 text-slate-700 font-medium">IFSC Code</span>
                <span className="col-span-1 text-slate-400">:</span>
                <span className="col-span-6 text-slate-800 font-mono text-[11px]">
                  {ifscCode}
                </span>
              </div>
              <div className="grid grid-cols-12 items-baseline">
                <span className="col-span-5 text-slate-700 font-medium">Branch Name</span>
                <span className="col-span-1 text-slate-400">:</span>
                <span className="col-span-6 text-slate-800">
                  {branchName}
                </span>
              </div>
              <div className="grid grid-cols-12 items-baseline">
                <span className="col-span-5 text-slate-700 font-medium">PF Number</span>
                <span className="col-span-1 text-slate-400">:</span>
                <span className="col-span-6 text-slate-800 font-mono text-[11px]">
                  {pfNumber}
                </span>
              </div>
              <div className="grid grid-cols-12 items-baseline">
                <span className="col-span-5 text-slate-700 font-medium">ESIC Number</span>
                <span className="col-span-1 text-slate-400">:</span>
                <span className="col-span-6 text-slate-800 font-mono text-[11px]">
                  {esicNumber}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Earnings & Deductions Tables (Exact layout matching screenshot) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
          {/* Earnings Side (7 cols) */}
          <div className="md:col-span-7 border border-slate-200/90 rounded-xl overflow-hidden bg-white shadow-2xs">
            {/* Header */}
            <div className="bg-slate-50/90 px-4 py-2.5 border-b border-slate-200/90 grid grid-cols-12 text-xs font-bold text-slate-800">
              <span className="col-span-5">Earnings</span>
              <span className="col-span-4 text-right">Monthly Value (Rs.)</span>
              <span className="col-span-3 text-right">Amount (Rs.)</span>
            </div>

            {/* List */}
            <div className="divide-y divide-slate-100 min-h-[90px]">
              {earningsList.length > 0 ? (
                earningsList.map((item, idx) => (
                  <div key={idx} className="px-4 py-2 grid grid-cols-12 text-xs text-slate-700 hover:bg-slate-50/40">
                    <span className="col-span-5 font-medium text-slate-800">{item.name}</span>
                    <span className="col-span-4 text-right font-mono text-slate-600">
                      {formatMoney(item.monthlyVal)}
                    </span>
                    <span className="col-span-3 text-right font-mono text-slate-900 font-semibold">
                      {formatMoney(item.amount)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="px-4 py-3 grid grid-cols-12 text-xs text-slate-500">
                  <span className="col-span-5">Standard Pay</span>
                  <span className="col-span-4 text-right font-mono">0.00</span>
                  <span className="col-span-3 text-right font-mono">0.00</span>
                </div>
              )}
            </div>

            {/* Total Row */}
            <div className="bg-slate-50/90 border-t border-slate-200/90 px-4 py-2.5 grid grid-cols-12 text-xs font-bold text-slate-900">
              <span className="col-span-5">Total Gross Earnings</span>
              <span className="col-span-4 text-right font-mono">
                {formatMoney(grossMonthly)}
              </span>
              <span className="col-span-3 text-right font-mono">
                {formatMoney(grossEarnings)}
              </span>
            </div>
          </div>

          {/* Deductions Side (5 cols) */}
          <div className="md:col-span-5 border border-slate-200/90 rounded-xl overflow-hidden bg-white shadow-2xs">
            {/* Header */}
            <div className="bg-slate-50/90 px-4 py-2.5 border-b border-slate-200/90 grid grid-cols-12 text-xs font-bold text-slate-800">
              <span className="col-span-7">Deductions</span>
              <span className="col-span-5 text-right">Amount (Rs.)</span>
            </div>

            {/* List */}
            <div className="divide-y divide-slate-100 min-h-[90px]">
              {deductionsList.length > 0 ? (
                deductionsList.map((item, idx) => (
                  <div key={idx} className="px-4 py-2 grid grid-cols-12 text-xs text-slate-700 hover:bg-slate-50/40">
                    <span className="col-span-7 font-medium text-slate-800">{item.name}</span>
                    <span className="col-span-5 text-right font-mono text-slate-900 font-semibold">
                      {formatMoney(item.amount)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="px-4 py-3 grid grid-cols-12 text-xs text-slate-500">
                  <span className="col-span-7">Statutory Deductions</span>
                  <span className="col-span-5 text-right font-mono">0.00</span>
                </div>
              )}
            </div>

            {/* Total Row */}
            <div className="bg-slate-50/90 border-t border-slate-200/90 px-4 py-2.5 grid grid-cols-12 text-xs font-bold text-slate-900">
              <span className="col-span-7">Total Deductions</span>
              <span className="col-span-5 text-right font-mono">
                {formatMoney(totalDeductions)}
              </span>
            </div>
          </div>
        </div>

        {/* 4. Attendance Summary Box (Exact match to bottom container in screenshot) */}
        {customConfig?.showAttendanceSummary !== false && (
          <div className="border border-slate-200/90 rounded-xl p-5 bg-white shadow-2xs">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center text-xs">
              {/* Total Payable Days Column */}
              <div className="md:col-span-4 flex items-center justify-start border-b md:border-b-0 md:border-r border-slate-200 pb-3 md:pb-0 md:pr-6">
                <div>
                  <span className="text-xs font-bold text-slate-800 block mb-0.5">
                    Total Payable Days
                  </span>
                  <span className="text-base font-extrabold text-slate-900 font-mono">
                    {totalPayableDays} Days
                  </span>
                </div>
              </div>

              {/* Middle Breakdown Column */}
              <div className="md:col-span-4 space-y-1.5 text-slate-700 font-medium border-b md:border-b-0 md:border-r border-slate-200 pb-3 md:pb-0 md:pr-6">
                <div className="flex items-center justify-between">
                  <span>Worked Day</span>
                  <span className="font-mono text-slate-900 font-semibold">: {workedDays}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Holiday</span>
                  <span className="font-mono text-slate-900 font-semibold">: {holidayDays}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Paid Leaves</span>
                  <span className="font-mono text-slate-900 font-semibold">: {paidLeaveDays}</span>
                </div>
              </div>

              {/* Right Breakdown Column */}
              <div className="md:col-span-4 space-y-1.5 text-slate-700 font-medium">
                <div className="flex items-center justify-between">
                  <span>Weekly Off</span>
                  <span className="font-mono text-slate-900 font-semibold">: {weeklyOffDays}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Unpaid Days</span>
                  <span className="font-mono text-slate-900 font-semibold">: {unpaidDays}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 5. Total Net Payable Banner (Exact match to green banner in screenshot) */}
        <div className="bg-emerald-50 border border-emerald-200/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="text-sm sm:text-base font-extrabold text-slate-900">
              Total Net Payable :
            </span>
            <span className="text-base sm:text-lg font-black text-emerald-800 font-mono">
              ₹ {formatMoney(netSalary)}
            </span>
          </div>

          <div className="text-[11px] font-semibold text-emerald-900/80 sm:text-right italic">
            ({numberToWordsINR(netSalary)})
          </div>
        </div>

        {/* 6. Active Loan Details (Optional toggle) */}
        {customConfig?.showLoanDetails && (
          <div className="border border-indigo-100 rounded-xl p-3.5 bg-indigo-50/30 text-xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-slate-800">Company Loan &amp; Advance Details</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">Active</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-slate-600">
              <div>Total Loan: <span className="font-mono font-bold text-slate-800">₹25,000.00</span></div>
              <div>Monthly EMI: <span className="font-mono font-bold text-slate-800">₹2,500.00</span></div>
              <div>Remaining: <span className="font-mono font-bold text-indigo-700">₹15,000.00</span></div>
            </div>
          </div>
        )}
      </div>

      {/* 7. Footer Disclaimer Note */}
      {customConfig?.customNote && (
        <div className="pt-4 border-t border-slate-100 text-center">
          <p className="text-[10px] text-slate-400 italic">
            {customConfig.customNote}
          </p>
        </div>
      )}
    </div>
  );
};

export default PayslipSheet;
