import React from 'react';
import { createPortal } from 'react-dom';
import { IconArrowLeft, IconPrinter, IconX, IconReceipt2 } from '@tabler/icons-react';

export interface PayslipData {
  id?: number | string;
  month: number;
  year: number;
  status?: string;
  publishedAt?: string | null;
  employee: {
    id?: number | string;
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
    workingDaysCount?: number;
    presentDays?: number;
    totalLopDays?: number;
    paidLeaveDays?: number;
    unpaidLeaveDays?: number;
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
    address?: string;
  } | null;
  onClose: () => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const PayslipPdfDrawer: React.FC<PayslipPdfDrawerProps> = ({
  payslip,
  company,
  onClose,
}) => {
  if (!payslip || typeof document === 'undefined') return null;

  const handlePrint = () => {
    window.print();
  };

  const c = payslip.calculation || {};
  const emp = payslip.employee || {};
  const monthName = MONTH_NAMES[(payslip.month || 1) - 1] || 'Current Month';

  // Calculate earnings
  const base = c.baseSalary || 0;
  const basic = c.basicSalary !== undefined ? c.basicSalary : Math.round(base * 0.5);
  const hra = c.hra !== undefined ? c.hra : Math.round(base * 0.2);
  const customEarn = (c.customComponents || []).filter((x) => x.type === 'EARNING');
  const customEarnSum = customEarn.reduce((sum, x) => sum + (Number(x.amount) || 0), 0);
  const special = c.specialAllowance !== undefined ? c.specialAllowance : Math.max(0, base - basic - hra - customEarnSum);
  const bonus = c.bonus || 0;
  const otPay = c.overtimePay || 0;
  const grossEarnings = c.grossEarnings !== undefined ? c.grossEarnings : (basic + hra + special + bonus + otPay + customEarnSum);

  // Calculate deductions
  const pf = c.pf || 0;
  const pt = c.pt !== undefined ? c.pt : 200;
  const tds = c.tds || 0;
  const lop = c.leaveDeduction || c.lopDeduction || 0;
  const other = c.otherDeductions || 0;
  const customDed = (c.customComponents || []).filter((x) => x.type === 'DEDUCTION');
  const customDedSum = customDed.reduce((sum, x) => sum + (Number(x.amount) || 0), 0);
  const totalDeductions = c.totalDeductions !== undefined ? c.totalDeductions : (pf + pt + tds + lop + other + customDedSum);

  const netSalary = c.netSalary !== undefined ? c.netSalary : (grossEarnings - totalDeductions);

  return createPortal(
    <>
      {/* Scoped Print Styles: Prevents blank leading pages and isolates payslip */}
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
            min-height: 0 !important;
            overflow: visible !important;
          }
          #printable-payslip-wrapper {
            position: static !important;
            inset: auto !important;
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            z-index: 99999 !important;
          }
          .drawer-backdrop,
          .drawer-header-actions,
          .no-print {
            display: none !important;
          }
          #printable-payslip-sheet {
            box-shadow: none !important;
            border: 1px solid #cbd5e1 !important;
            margin: 0 auto !important;
            width: 100% !important;
            max-width: 800px !important;
            padding: 24px !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
          }
          @page {
            size: A4 portrait;
            margin: 12mm;
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
                  {emp.firstName} {emp.lastName} ({emp.jobTitle || 'Employee'})
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
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
            {/* The Printable Payslip Document */}
            <div
              id="printable-payslip-sheet"
              className="bg-white rounded-xl shadow-lg border border-slate-200 p-8 sm:p-10 w-full max-w-3xl text-slate-800 font-sans text-xs flex flex-col justify-between"
            >
              <div>
                {/* Company Header / Letterhead */}
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b-2 border-slate-800">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                      {company?.name || 'UPTRIX TECHNOLOGIES'}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {company?.address || 'Cyber City, Financial District, Hyderabad, Telangana, India'}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Domain: {company?.subdomain ? `${company.subdomain}.uptrix.com` : 'uptrix.com'}
                    </p>
                  </div>
                  <div className="sm:text-right">
                    <span className="inline-block px-3 py-1 bg-slate-900 text-white text-xs font-bold uppercase tracking-wider rounded-md">
                      SALARY SLIP
                    </span>
                    <p className="text-xs font-bold text-slate-700 mt-2">
                      Pay Period: {monthName} {payslip.year}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Generated: {payslip.publishedAt ? new Date(payslip.publishedAt).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN')}
                    </p>
                  </div>
                </div>

                {/* Employee Information Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-5 border-b border-slate-200 bg-slate-50/60 p-4 rounded-xl mt-5">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Employee Name</span>
                    <span className="text-xs font-bold text-slate-900">{emp.firstName} {emp.lastName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Employee ID</span>
                    <span className="text-xs font-semibold text-slate-800">EMP-#{emp.id || '101'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Designation</span>
                    <span className="text-xs font-semibold text-slate-800">{emp.jobTitle || 'Senior Software Engineer'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Department</span>
                    <span className="text-xs font-semibold text-slate-800">{emp.department || 'Engineering'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Bank Name</span>
                    <span className="text-xs font-medium text-slate-700">{c.bankName || emp.bankName || 'HDFC Bank'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Bank Account</span>
                    <span className="text-xs font-medium text-slate-700">{c.accountNumberMasked || emp.bankAccountMasked || '•••• •••• 4821'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">PAN Number</span>
                    <span className="text-xs font-medium text-slate-700">{emp.panNumber || 'ABCDE1234F'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Payment Mode</span>
                    <span className="text-xs font-medium text-slate-700">{c.paymentMode || 'Direct Deposit'}</span>
                  </div>
                </div>

                {/* Attendance Summary Strip */}
                <div className="grid grid-cols-3 gap-3 my-5">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Working Days</span>
                    <span className="text-base font-black text-slate-900">{c.workingDaysCount || 22}</span>
                  </div>
                  <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 text-center">
                    <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Present Days</span>
                    <span className="text-base font-black text-emerald-800">{c.presentDays || 22}</span>
                  </div>
                  <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-100 text-center">
                    <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">Loss of Pay (LOP)</span>
                    <span className="text-base font-black text-rose-800">{c.totalLopDays || 0}</span>
                  </div>
                </div>

                {/* Earnings & Deductions Dual Table */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  {/* Earnings Table */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex justify-between font-bold text-[10px] text-slate-500 uppercase tracking-wider">
                      <span>Earnings</span>
                      <span>Amount</span>
                    </div>
                    <div className="divide-y divide-slate-100">
                      <div className="px-4 py-2.5 flex justify-between">
                        <span className="text-slate-600">Basic Salary</span>
                        <span className="font-semibold text-slate-900">₹{basic.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="px-4 py-2.5 flex justify-between">
                        <span className="text-slate-600">House Rent Allowance (HRA)</span>
                        <span className="font-semibold text-slate-900">₹{hra.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="px-4 py-2.5 flex justify-between">
                        <span className="text-slate-600">Special Allowance</span>
                        <span className="font-semibold text-slate-900">₹{special.toLocaleString('en-IN')}</span>
                      </div>
                      {bonus > 0 && (
                        <div className="px-4 py-2.5 flex justify-between bg-emerald-50/30">
                          <span className="text-emerald-700 font-medium">Bonus / Incentives</span>
                          <span className="font-semibold text-emerald-800">+₹{bonus.toLocaleString('en-IN')}</span>
                        </div>
                      )}
                      {otPay > 0 && (
                        <div className="px-4 py-2.5 flex justify-between bg-amber-50/30">
                          <span className="text-amber-700 font-medium">Overtime Pay ({c.overtimeHours || 0}h)</span>
                          <span className="font-semibold text-amber-800">+₹{otPay.toLocaleString('en-IN')}</span>
                        </div>
                      )}
                      {customEarn.map((item, idx) => (
                        <div key={idx} className="px-4 py-2.5 flex justify-between bg-indigo-50/30">
                          <span className="text-indigo-700 font-medium">{item.name}</span>
                          <span className="font-semibold text-indigo-800">+₹{(Number(item.amount) || 0).toLocaleString('en-IN')}</span>
                        </div>
                      ))}
                    </div>
                    <div className="bg-slate-50/80 px-4 py-2.5 border-t border-slate-200 flex justify-between font-bold text-slate-900">
                      <span>Total Earnings (Gross)</span>
                      <span>₹{grossEarnings.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  {/* Deductions Table */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex justify-between font-bold text-[10px] text-slate-500 uppercase tracking-wider">
                      <span>Deductions</span>
                      <span>Amount</span>
                    </div>
                    <div className="divide-y divide-slate-100">
                      <div className="px-4 py-2.5 flex justify-between">
                        <span className="text-slate-600">Provident Fund (PF)</span>
                        <span className="font-semibold text-slate-900">₹{pf.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="px-4 py-2.5 flex justify-between">
                        <span className="text-slate-600">Professional Tax (PT)</span>
                        <span className="font-semibold text-slate-900">₹{pt.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="px-4 py-2.5 flex justify-between">
                        <span className="text-slate-600">Income Tax (TDS)</span>
                        <span className="font-semibold text-slate-900">₹{tds.toLocaleString('en-IN')}</span>
                      </div>
                      {lop > 0 && (
                        <div className="px-4 py-2.5 flex justify-between bg-rose-50/30">
                          <span className="text-rose-700 font-medium">Leave / LOP Deduction</span>
                          <span className="font-semibold text-rose-800">-₹{lop.toLocaleString('en-IN')}</span>
                        </div>
                      )}
                      {other > 0 && (
                        <div className="px-4 py-2.5 flex justify-between">
                          <span className="text-slate-600">Other Deductions</span>
                          <span className="font-semibold text-slate-900">-₹{other.toLocaleString('en-IN')}</span>
                        </div>
                      )}
                      {customDed.map((item, idx) => (
                        <div key={idx} className="px-4 py-2.5 flex justify-between bg-rose-50/30">
                          <span className="text-rose-700 font-medium">{item.name}</span>
                          <span className="font-semibold text-rose-800">-₹{(Number(item.amount) || 0).toLocaleString('en-IN')}</span>
                        </div>
                      ))}
                    </div>
                    <div className="bg-slate-50/80 px-4 py-2.5 border-t border-slate-200 flex justify-between font-bold text-rose-700">
                      <span>Total Deductions</span>
                      <span>-₹{totalDeductions.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>

                {/* Net Salary Highlight Box */}
                <div className="mt-5 p-5 bg-indigo-50/70 border border-indigo-100 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">
                      Net Take-Home Salary
                    </span>
                    <span className="text-xs text-slate-500">
                      (Total Gross Earnings minus Total Statutory Deductions)
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black text-slate-900">
                      ₹{netSalary.toLocaleString('en-IN')}
                    </div>
                    <div className="text-[11px] font-semibold text-emerald-600">
                      Disbursed via Direct Bank Transfer
                    </div>
                  </div>
                </div>
              </div>

              {/* Signatures & Footer */}
              <div className="mt-12 pt-8 border-t border-slate-200">
                <div className="grid grid-cols-2 gap-8 text-center text-xs">
                  <div>
                    <div className="h-10 border-b border-dashed border-slate-300 mx-auto w-40" />
                    <p className="font-bold text-slate-800 mt-2">Employee Signature</p>
                    <p className="text-[10px] text-slate-400">Date: _______________</p>
                  </div>
                  <div>
                    <div className="h-10 border-b border-dashed border-slate-300 mx-auto w-40" />
                    <p className="font-bold text-slate-800 mt-2">Authorized Signatory</p>
                    <p className="text-[10px] text-slate-400">{company?.name || 'HR & Payroll Dept'}</p>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 text-center text-[10px] text-slate-400">
                  This is a computer-generated salary slip and does not require a physical seal if authenticated electronically.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};
