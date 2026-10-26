import React from 'react';
import { createPortal } from 'react-dom';
import { IconArrowLeft, IconPrinter, IconX, IconReceipt2, IconDownload } from '@tabler/icons-react';

export interface PayslipData {
  id?: number | string;
  month: number;
  year: number;
  status?: string;
  publishedAt?: string | null;
  employee: {
    id?: number | string;
    employeeNumber?: string;
    firstName: string;
    lastName: string;
    email?: string;
    jobTitle?: string;
    department?: string;
    panNumber?: string;
    bankName?: string;
    bankAccountMasked?: string;
    pfNumber?: string;
    uanNumber?: string;
    dateOfJoining?: string;
  };
  calculation: {
    baseSalary?: number;
    basicSalary?: number;
    hra?: number;
    specialAllowance?: number;
    grossSalary?: number;
    grossEarnings?: number;
    bonus?: number;
    overtimeHours?: number;
    overtimePay?: number;
    customComponents?: { name: string; type: 'EARNING' | 'DEDUCTION'; amount: number }[];
    pf?: number;
    pt?: number;
    tds?: number;
    lopDeduction?: number;
    leaveDeduction?: number;
    otherDeductions?: number;
    totalDeductions?: number;
    netSalary?: number;
    perDayRate?: number;
    workingDaysCount?: number;
    presentDays?: number;
    totalLopDays?: number;
    paidLeaveDays?: number;
    unpaidLeaveDays?: number;
    totalCalendarDays?: number;
    currency?: string;
    paymentMode?: string;
    bankName?: string;
    accountNumberMasked?: string;
    remarks?: string;
  };
}

export interface PayslipPdfDrawerProps {
  payslip: PayslipData | null;
  company?: {
    name?: string;
    subdomain?: string;
    address?: any;
  } | null;
  onClose: () => void;
  onDownloadPdf?: (id: number | string, month: number, year: number) => void;
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

export const PayslipPdfDrawer: React.FC<PayslipPdfDrawerProps> = ({
  payslip,
  company,
  onClose,
  onDownloadPdf,
}) => {
  if (!payslip || typeof document === 'undefined') return null;

  const handlePrint = () => {
    window.print();
  };

  const getSafeString = (val: any, fallback: string = '—'): string => {
    if (val === null || val === undefined) return fallback;
    if (typeof val === 'string') return val.trim() || fallback;
    if (typeof val === 'number') return String(val);
    if (typeof val === 'object' && val.name && typeof val.name === 'string') return val.name.trim() || fallback;
    return fallback;
  };

  const companyNameStr = getSafeString(company?.name, 'UPTRIX TECHNOLOGIES');


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
  const totalCalendarDays = c.totalCalendarDays || 30;
  const workingDays = c.workingDaysCount || 22;
  const presentDays = c.presentDays !== undefined ? c.presentDays : 22;
  const paidLeaves = c.paidLeaveDays || 0;
  const lopDays = c.totalLopDays || 0;
  const otHours = c.overtimeHours || 0;
  const baseSalary = Number(c.baseSalary || 0);
  const dailyRate = c.perDayRate !== undefined ? Number(c.perDayRate) : (baseSalary && workingDays ? Math.round((baseSalary / workingDays) * 100) / 100 : 0);

  // Structured Employee & Working Days Table matching generatePdf.ts
  const empRows = [
    [
      { label: 'Employee Name:', val: toTitleCase(empName) },
      { label: 'Employee Code:', val: empCode }
    ],
    [
      { label: 'Designation:', val: empDesignation },
      { label: 'Department:', val: empDept }
    ],
    [
      { label: 'Bank Name:', val: bankName },
      { label: 'Bank Account No:', val: bankAccount }
    ],
    [
      { label: 'Payment Mode:', val: paymentMode },
      { label: 'Pay Period:', val: `${monthName} ${payslip.year}` }
    ]
  ];

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

  return createPortal(
    <>
      {/* Scoped Print Styles: Isolates payslip sheet and avoids blank pages */}
      <style>{`
        @media print {
          #root {
            display: none !important;
          }
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            min-height: auto !important;
            overflow: visible !important;
          }
          #printable-payslip-wrapper {
            position: static !important;
            inset: auto !important;
            display: block !important;
            width: 100% !important;
            height: auto !important;
            min-height: auto !important;
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            z-index: auto !important;
          }
          #printable-payslip-wrapper > div.relative {
            position: static !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            min-height: auto !important;
            overflow: visible !important;
            background: #ffffff !important;
            border: none !important;
            box-shadow: none !important;
            display: block !important;
          }
          #printable-payslip-wrapper .flex-1 {
            overflow: visible !important;
            height: auto !important;
            padding: 0 !important;
            display: block !important;
          }
          .drawer-backdrop,
          .drawer-header-actions,
          .no-print {
            display: none !important;
          }
          #printable-payslip-sheet {
            box-shadow: none !important;
            border: 1px solid #1e293b !important;
            margin: 0 auto !important;
            width: 100% !important;
            max-width: 100% !important;
            padding: 16px !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
            display: block !important;
          }
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
        }
      `}</style>

      {/* Main Container */}
      <div
        id="printable-payslip-wrapper"
        className="fixed inset-0 z-[9999] overflow-hidden flex justify-end"
      >
        {/* Backdrop (Dark overlay) */}
        <div
          className="drawer-backdrop fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
          onClick={onClose}
        />

        {/* Right-Side Slide-Over Drawer Sheet */}
        <div
          className="relative w-full max-w-4xl bg-slate-100/90 backdrop-blur-md shadow-2xl flex flex-col h-full z-10 border-l border-slate-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Bar / Actions Header */}
          <div className="drawer-header-actions px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 shadow-xs">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <IconArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <div className="h-4 w-px bg-slate-200" />
              <div>
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <IconReceipt2 className="w-4 h-4 text-[#5E4BE2]" />
                  Payslip — {monthName} {payslip.year}
                </span>
                <span className="text-[11px] text-slate-400 block font-normal">
                  {empName} ({empDesignation})
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              {onDownloadPdf && payslip.id && (
                <button
                  type="button"
                  onClick={() => onDownloadPdf(payslip.id!, payslip.month, payslip.year)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-xs transition-all cursor-pointer"
                >
                  <IconDownload className="w-4 h-4 text-slate-500" />
                  <span>Download PDF</span>
                </button>
              )}

              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#5E4BE2] hover:bg-[#4d3cc9] text-white text-xs font-bold shadow-xs hover:shadow-md transition-all cursor-pointer"
              >
                <IconPrinter className="w-4 h-4" />
                <span>Print / Save PDF</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                title="Close Drawer"
              >
                <IconX className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Drawer Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center">
            {/* The Printable Payslip Document matching generatePdf.ts */}
            <div
              id="printable-payslip-sheet"
              className="bg-white rounded-lg shadow-xl border border-slate-800 p-6 sm:p-8 w-full max-w-3xl text-slate-900 font-sans text-xs flex flex-col justify-between"
              style={{ minHeight: '820px' }}
            >
              <div>
                {/* 1. Company Header */}
                <div className="text-center pb-3">
                  <h1 className="text-lg sm:text-xl font-bold uppercase tracking-wider text-slate-900">
                    {companyNameStr}
                  </h1>
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

                {/* 9. Payment Advice & Policy Notes */}
                <div className="p-3 border-b border-slate-800 text-[11px] space-y-1 bg-white">
                  <div className="font-bold text-slate-900 mb-1">Payment Advice &amp; Policy Notes:</div>
                  <div className="text-slate-700 pl-2">
                    • Mode of Transfer: {paymentMode} to {bankName} (A/C: {bankAccount}).
                  </div>
                  <div className="text-slate-700 pl-2">
                    • Daily Calculation Rate: {formatMoney(dailyRate, currency)} per workable day (Base Salary ÷ {workingDays} workable days).
                  </div>
                  <div className="text-slate-700 pl-2">
                    • Attendance &amp; LOP: Computed strictly on system check-ins. {lopDays} days LOP deduction applied.
                  </div>
                  <div className="text-slate-700 pl-2">
                    • Remarks: {c.remarks || 'Monthly verified computerized payroll statement.'}
                  </div>
                </div>

                {/* 10. System Generated Salary Statement Notice */}
                <div className="text-center py-3 text-xs font-semibold text-slate-700">
                  System Generated Salary Statement
                </div>
              </div>

              {/* 11. Official Footer */}
              <div className="text-center text-[10px] text-slate-400 pt-3 border-t border-slate-200">
                Confidential • Corporate Payroll Record • System Generated by Uptrix HRMS Platform
              </div>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};

export default PayslipPdfDrawer;
