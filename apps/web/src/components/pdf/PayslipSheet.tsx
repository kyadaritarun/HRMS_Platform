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

function formatMoney(amount: number | undefined | null): string {
  const num = Number(amount || 0);
  return num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
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
      className={`bg-white rounded-2xl shadow-sm border border-slate-200/90 p-6 sm:p-10 w-full min-w-[700px] max-w-[860px] text-slate-900 font-sans text-xs flex flex-col justify-between space-y-6 ${className}`}
      style={{ minHeight: '850px' }}
    >
      <div className="space-y-6">
        {/* 1. Header Section (Exact match to screenshot) */}
        <div className="flex items-end justify-between gap-4">
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

          <div className="text-right shrink-0 whitespace-nowrap pb-0.5">
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

          <div className="grid grid-cols-2 gap-x-12 gap-y-2 text-xs">
            {/* Left Column */}
            <div className="space-y-2">
              <div className="flex items-center text-xs">
                <span className="w-36 text-slate-700 font-medium shrink-0">Employee Name</span>
                <span className="w-4 text-slate-400 shrink-0 text-center">:</span>
                <span className="font-semibold text-slate-900 truncate pl-1">
                  {toTitleCase(empName)}
                </span>
              </div>
              <div className="flex items-center text-xs">
                <span className="w-36 text-slate-700 font-medium shrink-0">Employee ID</span>
                <span className="w-4 text-slate-400 shrink-0 text-center">:</span>
                <span className="text-slate-800 pl-1">{empCode}</span>
              </div>
              <div className="flex items-center text-xs">
                <span className="w-36 text-slate-700 font-medium shrink-0">UAN Number</span>
                <span className="w-4 text-slate-400 shrink-0 text-center">:</span>
                <span className="text-slate-800 font-mono text-[11px] pl-1">{uanNumber}</span>
              </div>
              <div className="flex items-center text-xs">
                <span className="w-36 text-slate-700 font-medium shrink-0">PF Number</span>
                <span className="w-4 text-slate-400 shrink-0 text-center">:</span>
                <span className="text-slate-800 font-mono text-[11px] pl-1">{pfNumber}</span>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-2">
              <div className="flex items-center text-xs">
                <span className="w-36 text-slate-700 font-medium shrink-0">Bank Name</span>
                <span className="w-4 text-slate-400 shrink-0 text-center">:</span>
                <span className="text-slate-800 pl-1 truncate">{bankName}</span>
              </div>
              <div className="flex items-center text-xs">
                <span className="w-36 text-slate-700 font-medium shrink-0">Bank A/C No.</span>
                <span className="w-4 text-slate-400 shrink-0 text-center">:</span>
                <span className="text-slate-800 font-mono text-[11px] pl-1">{bankAccount}</span>
              </div>
              <div className="flex items-center text-xs">
                <span className="w-36 text-slate-700 font-medium shrink-0">IFSC Code</span>
                <span className="w-4 text-slate-400 shrink-0 text-center">:</span>
                <span className="text-slate-800 font-mono text-[11px] pl-1">{ifscCode}</span>
              </div>
              <div className="flex items-center text-xs">
                <span className="w-36 text-slate-700 font-medium shrink-0">Branch Name</span>
                <span className="w-4 text-slate-400 shrink-0 text-center">:</span>
                <span className="text-slate-800 pl-1 truncate">{branchName}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Earnings & Deductions Tables (Clean table-auto, No overflow clipping) */}
        <div className="grid grid-cols-12 gap-6 items-start">
          {/* Earnings Side (7 cols out of 12) */}
          <div className="col-span-7">
            <table className="w-full text-xs border-collapse table-auto">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-800 font-bold">
                  <th className="py-2.5 px-3 text-left font-bold">Earnings</th>
                  <th className="py-2.5 px-3 text-right font-bold whitespace-nowrap">Monthly Value (Rs.)</th>
                  <th className="py-2.5 px-3 text-right font-bold whitespace-nowrap">Amount (Rs.)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {earningsList.length > 0 ? (
                  earningsList.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/40">
                      <td className="py-2 px-3 text-slate-800 font-medium">{item.name}</td>
                      <td className="py-2 px-3 text-right font-mono text-slate-600 whitespace-nowrap pr-2">
                        {formatMoney(item.monthlyVal)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        {formatMoney(item.amount)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="py-3 px-3 text-slate-500">Standard Pay</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-500">0.00</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-500">0.00</td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200/90 font-bold text-slate-900 bg-slate-50/40">
                  <td className="py-2.5 px-3 text-left">Total Gross Earnings</td>
                  <td className="py-2.5 px-3 text-right font-mono whitespace-nowrap pr-2">
                    {formatMoney(grossMonthly)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono whitespace-nowrap">
                    {formatMoney(grossEarnings)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Deductions Side (5 cols out of 12) */}
          <div className="col-span-5">
            <table className="w-full text-xs border-collapse table-auto">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-800 font-bold">
                  <th className="py-2.5 px-3 text-left font-bold">Deductions</th>
                  <th className="py-2.5 px-3 text-right font-bold whitespace-nowrap">Amount (Rs.)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {deductionsList.length > 0 ? (
                  deductionsList.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/40">
                      <td className="py-2 px-3 text-slate-800 font-medium">{item.name}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        {formatMoney(item.amount)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="py-3 px-3 text-slate-500">Statutory Deductions</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-500">0.00</td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200/90 font-bold text-slate-900 bg-slate-50/40">
                  <td className="py-2.5 px-3 text-left">Total Deductions</td>
                  <td className="py-2.5 px-3 text-right font-mono whitespace-nowrap">
                    {formatMoney(totalDeductions)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* 4. Attendance Summary Box (Exact match to bottom container in screenshot) */}
        {customConfig?.showAttendanceSummary !== false && (
          <div className="border border-slate-200/90 rounded-xl p-5 bg-white shadow-2xs">
            <div className="grid grid-cols-12 gap-6 items-center text-xs">
              {/* Total Payable Days Column */}
              <div className="col-span-4 flex items-center justify-start border-r border-slate-200 pr-6">
                <div>
                  <span className="text-xs font-bold text-slate-700 block mb-0.5">
                    Total Payable Days
                  </span>
                  <span className="text-base font-extrabold text-slate-900 font-mono">
                    {totalPayableDays} Days
                  </span>
                </div>
              </div>

              {/* Middle Breakdown Column */}
              <div className="col-span-4 space-y-1.5 text-slate-700 font-medium border-r border-slate-200 pr-6">
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
              <div className="col-span-4 space-y-1.5 text-slate-700 font-medium">
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

        {/* 5. Total Net Payable Banner (Never breaks, single clean line, mint green) */}
        <div className="bg-[#ecfdf5] border border-emerald-200/90 rounded-xl px-5 py-4 flex items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-center gap-3 whitespace-nowrap shrink-0">
            <span className="text-sm sm:text-base font-extrabold text-slate-900 whitespace-nowrap">
              Total Net Payable :
            </span>
            <span className="text-base sm:text-lg font-black text-emerald-800 font-mono whitespace-nowrap">
              ₹ {formatMoney(netSalary)}
            </span>
          </div>

          <div className="text-xs font-semibold text-emerald-900/80 italic text-right whitespace-nowrap truncate pl-2">
            ({numberToWordsINR(netSalary)})
          </div>
        </div>
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
