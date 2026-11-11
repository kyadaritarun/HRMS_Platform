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

function formatMoney(amount: number | undefined | null, currency: string = ''): string {
  const num = Number(amount || 0);
  const formatted = num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return currency ? `${currency} ${formatted}` : formatted;
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
  const getSafeString = (val: any, fallback: string = '—'): string => {
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
    'UPTRIX TECHNOLOGIES';

  // Company Address
  const formatAddress = (addr: any): string => {
    if (!addr) return '';
    if (typeof addr === 'string') return addr;
    const parts = [addr.street, addr.addressLine2, addr.city, addr.state, addr.pinCode].filter(Boolean);
    return parts.join(', ');
  };

  const companyAddressStr =
    customConfig?.companyAddress !== undefined
      ? customConfig.companyAddress
      : formatAddress(company?.address);

  // Logo
  const logoUrl = customConfig?.logoUrl !== undefined ? customConfig.logoUrl : (company?.logo || '');

  // Contact & Website
  const contactStr = customConfig?.contact || '';
  const websiteStr = customConfig?.websiteOrEmail || (company as any)?.website || '';

  // Statutory Details
  const statutory = company?.settings?.statutory || (company as any)?.statutory || {};
  const statutoryItems: string[] = [];
  if (statutory.cin) statutoryItems.push(`CIN: ${statutory.cin}`);
  if (statutory.gstin) statutoryItems.push(`GSTIN: ${statutory.gstin}`);
  if (statutory.pan) statutoryItems.push(`PAN: ${statutory.pan}`);
  if (statutory.pfEstablishmentCode) statutoryItems.push(`PF Est: ${statutory.pfEstablishmentCode}`);

  const c = payslip.calculation || {};
  const emp = payslip.employee || ({} as any);
  const monthName = MONTH_NAMES[(Number(payslip.month) || 1) - 1] || 'Current Month';
  const currency = String(c.currency || 'INR');

  // Employee details matching generatePdf.ts
  const empName = `${getSafeString(emp.firstName, 'Employee')} ${getSafeString(emp.lastName, '')}`.trim();
  const empCode = emp.employeeNumber || (emp.id ? `EMP-${String(emp.id).padStart(3, '0')}` : 'EMP-001');
  const empDesignation = getSafeString(emp.jobTitle, 'Staff');
  const empDept = getSafeString(emp.department, 'General');
  const bankName = getSafeString(c.bankName || emp.bankName, 'HDFC Bank');
  const bankAccount = getSafeString(c.accountNumberMasked || emp.bankAccountMasked, '•••• ••••');
  const paymentMode = toTitleCase(c.paymentMode || 'Bank Transfer');
  const workingDays = c.workingDaysCount || 26;
  const presentDays = c.presentDays !== undefined ? c.presentDays : 22;
  const paidLeaves = c.paidLeaveDays || 0;
  const lopDays = c.totalLopDays || 0;
  const otHours = c.overtimeHours || 0;
  const baseSalary = Number(c.baseSalary || 0);
  const dailyRate = c.perDayRate !== undefined ? Number(c.perDayRate) : (baseSalary && workingDays ? Math.round((baseSalary / workingDays) * 100) / 100 : 0);

  // Structured Employee & Working Days Table matching generatePdf.ts
  const branchName = customConfig?.branchWisePayslip ? 'Main Corporate Branch' : null;

  const empRows = [
    [
      { label: 'Employee Name:', val: toTitleCase(empName) },
      { label: 'Employee Code:', val: empCode },
    ],
    [
      { label: 'Designation:', val: empDesignation },
      { label: 'Department:', val: empDept },
    ],
    [
      { label: 'Bank Name:', val: bankName },
      { label: 'Bank Account No:', val: bankAccount },
    ],
    [
      { label: 'Payment Mode:', val: paymentMode },
      { label: 'Pay Period:', val: `${monthName} ${payslip.year}` },
    ],
  ];

  if (branchName || emp.uanNumber) {
    empRows.push([
      { label: 'Work Location:', val: branchName || 'Headquarters' },
      { label: 'UAN / PF No:', val: emp.uanNumber || emp.pfNumber || '—' },
    ]);
  }

  // Custom Components
  const customList = Array.isArray(c.customComponents) ? c.customComponents : [];

  // Earnings Data matching generatePdf.ts
  const basicSalary = c.basicSalary !== undefined ? Number(c.basicSalary) : baseSalary;
  const hra = Number(c.hra || 0);
  const specialAllowance = Number(c.specialAllowance || 0);
  const bonus = Number(c.bonus || 0);
  const otPay = Number(c.overtimePay || 0);

  const earningsData: { name: string; val: number }[] = [
    { name: 'Basic Salary', val: basicSalary },
    { name: 'House Rent Allowance (HRA)', val: hra },
    { name: 'Special Allowance', val: specialAllowance },
    ...customList.filter((x) => x && x.type === 'EARNING').map((x) => ({ name: String(x.name), val: Number(x.amount) || 0 })),
    { name: 'Bonus / Performance Incentives', val: bonus },
    { name: `Overtime Pay (${otHours} hrs)`, val: otPay },
  ];

  // Deductions Data matching generatePdf.ts
  const lopDeduction = Number(c.leaveDeduction || c.lopDeduction || 0);
  const pf = Number(c.pf || 0);
  const pt = Number(c.pt || 0);
  const tds = Number(c.tds || 0);
  const otherDeductions = Number(c.otherDeductions || 0);

  const deductionsData: { name: string; val: number }[] = [
    { name: `Loss of Pay (LOP) [${lopDays} days]`, val: lopDeduction },
    { name: 'Provident Fund (PF)', val: pf },
    { name: 'Professional Tax (PT)', val: pt },
    { name: 'Income Tax (TDS)', val: tds },
    ...customList.filter((x) => x && x.type === 'DEDUCTION').map((x) => ({ name: String(x.name), val: Number(x.amount) || 0 })),
    { name: 'Other Statutory Deductions', val: otherDeductions },
  ];

  const rowCount = Math.max(earningsData.length, deductionsData.length);
  const grossEarnings = c.grossEarnings !== undefined ? Number(c.grossEarnings) : earningsData.reduce((s, e) => s + e.val, 0);
  const totalDeductions = c.totalDeductions !== undefined ? Number(c.totalDeductions) : deductionsData.reduce((s, d) => s + d.val, 0);
  const netSalary = c.netSalary !== undefined ? Number(c.netSalary) : (grossEarnings - totalDeductions);

  return (
    <div
      id="printable-payslip-sheet"
      className={`bg-white rounded-lg shadow-xl border border-slate-800 p-6 sm:p-8 w-full max-w-3xl text-slate-900 font-sans text-xs flex flex-col justify-between ${className}`}
      style={{ minHeight: '820px' }}
    >
      <div>
        {/* 1. Company Header */}
        <div className="text-center pb-3 space-y-1">
          {logoUrl && (
            <div className="flex justify-center mb-2">
              <img
                src={logoUrl}
                alt="Company Logo"
                className="h-10 max-h-12 max-w-[180px] object-contain"
              />
            </div>
          )}
          <h1 className="text-lg sm:text-xl font-bold uppercase tracking-wider text-slate-900">
            {companyNameStr}
          </h1>
          {companyAddressStr && (
            <p className="text-[11px] text-slate-600 font-medium max-w-xl mx-auto leading-relaxed">
              {companyAddressStr}
            </p>
          )}
          {(contactStr || websiteStr) && (
            <p className="text-[10px] text-slate-500 font-medium">
              {contactStr && `Contact: ${contactStr}`}
              {contactStr && websiteStr && '  •  '}
              {websiteStr && `${websiteStr}`}
            </p>
          )}
          {statutoryItems.length > 0 && (
            <p className="text-[10px] font-mono text-slate-500 font-semibold tracking-wide">
              {statutoryItems.join('  •  ')}
            </p>
          )}
        </div>

        {/* 2. Sub-Banner */}
        <div className="bg-slate-100 py-1.5 px-4 border-y border-slate-800 text-center font-bold text-[11px] uppercase tracking-wider text-slate-900">
          PAYSLIP FOR THE MONTH OF {monthName.toUpperCase()} {payslip.year}
        </div>

        {/* 3. Employee & Working Days Structured Matrix */}
        <div className="border-b border-slate-800 divide-y divide-slate-300 text-xs">
          {empRows.map((row, idx) => (
            <div key={idx} className="grid grid-cols-2 divide-x divide-slate-800">
              <div className="grid grid-cols-12 divide-x divide-slate-300 py-1 px-2">
                <span className="col-span-5 font-bold text-slate-700 text-[11px] pl-1">
                  {row[0].label}
                </span>
                <span className="col-span-7 font-normal text-slate-900 text-[11px] pl-2 truncate" title={row[0].val}>
                  {row[0].val}
                </span>
              </div>
              <div className="grid grid-cols-12 divide-x divide-slate-300 py-1 px-2">
                <span className="col-span-5 font-bold text-slate-700 text-[11px] pl-1">
                  {row[1].label}
                </span>
                <span className="col-span-7 font-normal text-slate-900 text-[11px] pl-2 truncate" title={row[1].val}>
                  {row[1].val}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* 4. Salary Table Header (Earnings vs Deductions) */}
        <div className="grid grid-cols-2 bg-slate-100 border-b border-slate-800 divide-x divide-slate-800 font-bold text-[11px] text-slate-900">
          <div className="flex justify-between py-1.5 px-3">
            <span>EARNINGS HEAD</span>
            <span>AMOUNT ({currency})</span>
          </div>
          <div className="flex justify-between py-1.5 px-3">
            <span>DEDUCTIONS HEAD</span>
            <span>AMOUNT ({currency})</span>
          </div>
        </div>

        {/* 5. Earnings & Deductions Dual Table Body */}
        <div className="divide-y divide-slate-200 border-b border-slate-800 text-[11px]">
          {Array.from({ length: rowCount }).map((_, i) => {
            const e = earningsData[i];
            const d = deductionsData[i];
            return (
              <div key={i} className="grid grid-cols-2 divide-x divide-slate-800 hover:bg-slate-50/50">
                {/* Earnings Column */}
                <div className="flex justify-between py-1.5 px-3">
                  <span className="text-slate-800">{e ? e.name : '—'}</span>
                  <span className="font-medium text-slate-900">
                    {e ? formatMoney(e.val, '') : '—'}
                  </span>
                </div>
                {/* Deductions Column */}
                <div className="flex justify-between py-1.5 px-3">
                  <span className="text-slate-800">{d ? d.name : '—'}</span>
                  <span className={`font-medium ${d && d.val > 0 ? 'text-slate-900' : 'text-slate-500'}`}>
                    {d ? formatMoney(d.val, '') : '—'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* 6. Totals Row */}
        <div className="grid grid-cols-2 bg-slate-50 border-b border-slate-800 divide-x divide-slate-800 font-bold text-[11px] text-slate-900">
          <div className="flex justify-between py-2 px-3">
            <span>Total Earnings (Gross):</span>
            <span>{formatMoney(grossEarnings, '')}</span>
          </div>
          <div className="flex justify-between py-2 px-3">
            <span>Total Deductions:</span>
            <span>{formatMoney(totalDeductions, '')}</span>
          </div>
        </div>

        {/* 7. Net Take-Home Pay Box */}
        <div className="bg-slate-100 py-2.5 px-3 border-b border-slate-800 flex justify-between items-center font-bold text-slate-900">
          <span className="text-xs uppercase tracking-wider">NET PAYABLE SALARY:</span>
          <span className="text-sm sm:text-base font-black">
            {formatMoney(netSalary, currency)}
          </span>
        </div>

        {/* 8. Amount in Words */}
        <div className="py-2 px-3 border-b border-slate-800 text-xs">
          <span className="font-bold text-slate-700 mr-2">Amount in Words:</span>
          <span className="font-medium text-slate-900">{numberToWordsINR(netSalary)}</span>
        </div>

        {/* 9. Payment Advice, Attendance & Policy Notes */}
        <div className="p-3 border-b border-slate-800 text-[11px] space-y-1 bg-white">
          <div className="font-bold text-slate-900 mb-1">Payment Advice &amp; Policy Notes:</div>
          <div className="text-slate-700 pl-2">
            • Mode of Transfer: {paymentMode} to {bankName} (A/C: {bankAccount}).
          </div>
          <div className="text-slate-700 pl-2">
            • Daily Calculation Rate: {formatMoney(dailyRate, currency)} per workable day (Base Salary ÷ {workingDays} workable days).
          </div>
          {customConfig?.showAttendanceSummary !== false && (
            <div className="text-slate-700 pl-2">
              • Attendance &amp; Working Days: {workingDays} Workable Days | {presentDays} Days Present | {paidLeaves} Paid Leaves | {lopDays} LOP Days applied.
            </div>
          )}
          {customConfig?.showLoanDetails && (
            <div className="text-slate-700 pl-2 font-medium text-[#5E4BE2]">
              • Loan &amp; Advance Recovery: Deducted EMI ₹2,500.00 | Remaining Outstanding Balance: ₹15,000.00.
            </div>
          )}
          <div className="text-slate-700 pl-2">
            • Remarks: {customConfig?.customNote || c.remarks || 'Monthly verified computerized payroll statement.'}
          </div>
        </div>

        {/* 10. System Generated Salary Statement Notice */}
        <div className="text-center py-3 text-xs font-semibold text-slate-700">
          System Generated Salary Statement
        </div>
      </div>

      {/* 11. Official Footer */}
      <div className="text-center text-[10px] text-slate-500 font-medium pt-3 border-t border-slate-200">
        Confidential • Corporate Payroll Record • System Generated by Uptrix HRMS Platform
      </div>
    </div>
  );
};

export default PayslipSheet;
