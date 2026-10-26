import React, { useState, useEffect, useMemo } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { PayslipPdfDrawer, PayslipData } from '../../components/pdf';
import TablePagination from '../../components/common/TablePagination';
import {
  IconReceipt2,
  IconDownload,
  IconCalendar,
  IconCheck,
  IconEye,
  IconRefresh,
  IconChevronDown,
  IconX,
} from '@tabler/icons-react';

interface PayslipItem {
  id: number;
  month: number;
  year: number;
  status: string;
  publishedAt: string;
  netSalary?: number;
  snapshot: any;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const MyPayslipsPage: React.FC = () => {
  const { user, company } = useAuth();
  const [payslips, setPayslips] = useState<PayslipItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [selectedPayslipData, setSelectedPayslipData] = useState<PayslipData | null>(null);

  // Filters
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchPayslips = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/payroll/my-payslips');
      setPayslips(res.data?.payslips || []);
    } catch (err) {
      console.error('Failed to load payslips:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayslips();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedYear, selectedMonth]);

  // Extract available years from payslips list + default recent years
  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const set = new Set<number>([currentYear, currentYear - 1, currentYear - 2]);
    payslips.forEach((p) => {
      if (p.year) set.add(Number(p.year));
    });
    return Array.from(set).sort((a, b) => b - a);
  }, [payslips]);

  const filteredPayslips = useMemo(() => {
    return payslips.filter((p) => {
      const matchYear = selectedYear === 'ALL' || String(p.year) === selectedYear;
      const matchMonth = selectedMonth === 'ALL' || String(p.month) === selectedMonth;
      return matchYear && matchMonth;
    });
  }, [payslips, selectedYear, selectedMonth]);

  const paginatedPayslips = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPayslips.slice(start, start + pageSize);
  }, [filteredPayslips, currentPage, pageSize]);

  const handleDownloadPdf = async (id: number | string, month: number, year: number) => {
    setDownloadingId(Number(id));
    try {
      const res = await api.get(`/payroll/payslips/${id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Payslip_${MONTH_NAMES[month - 1]}_${year}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      console.error('Failed to download payslip:', err);
      alert('Unable to generate payslip PDF.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleViewPayslip = (p: PayslipItem) => {
    try {
      let snap = p.snapshot || {};
      if (typeof snap === 'string') {
        try {
          snap = JSON.parse(snap);
        } catch (e) {
          snap = {};
        }
      }

      const empData = (snap && typeof snap === 'object' && snap.employee) || user || {};

      const formatted: PayslipData = {
        id: p.id,
        month: p.month,
        year: p.year,
        status: p.status,
        publishedAt: p.publishedAt,
        employee: {
          id: empData.id || user?.id,
          employeeNumber: empData.employeeNumber || (empData.id ? `EMP-${String(empData.id).padStart(3, '0')}` : undefined),
          firstName: String(empData.firstName || user?.firstName || 'Employee'),
          lastName: String(empData.lastName || user?.lastName || ''),
          email: String(empData.email || user?.email || ''),
          jobTitle: String(empData.jobTitle || user?.jobTitle || 'Staff'),
          department: typeof empData.department === 'string'
            ? empData.department
            : empData.department?.name || (user as any)?.department?.name || 'General',
          panNumber: String(empData.panNumber || (user as any)?.panNumber || '—'),
          bankName: String(snap?.bankName || empData.bankName || (user as any)?.bankName || 'HDFC Bank'),
          bankAccountMasked: String(snap?.accountNumberMasked || empData.bankAccountMasked || (user as any)?.bankAccountMasked || '••••'),
        },
        calculation: {
          baseSalary: Number(snap?.baseSalary ?? snap?.monthlySalary ?? p.netSalary ?? 0),
          basicSalary: snap?.basicSalary !== undefined ? Number(snap.basicSalary) : undefined,
          hra: snap?.hra !== undefined ? Number(snap.hra) : undefined,
          specialAllowance: snap?.specialAllowance !== undefined ? Number(snap.specialAllowance) : undefined,
          grossSalary: Number(snap?.grossSalary ?? snap?.grossEarnings ?? snap?.baseSalary ?? p.netSalary ?? 0),
          grossEarnings: Number(snap?.grossEarnings ?? snap?.grossSalary ?? snap?.baseSalary ?? p.netSalary ?? 0),
          bonus: Number(snap?.bonus ?? 0),
          overtimeHours: Number(snap?.overtimeHours ?? 0),
          overtimePay: Number(snap?.overtimePay ?? 0),
          customComponents: Array.isArray(snap?.customComponents) ? snap.customComponents : [],
          pf: Number(snap?.pf ?? 0),
          pt: Number(snap?.pt ?? 0),
          tds: Number(snap?.tds ?? 0),
          lopDeduction: Number(snap?.lopDeduction ?? snap?.leaveDeduction ?? 0),
          leaveDeduction: Number(snap?.leaveDeduction ?? snap?.lopDeduction ?? 0),
          otherDeductions: Number(snap?.otherDeductions ?? 0),
          totalDeductions: Number(snap?.totalDeductions ?? 0),
          netSalary: Number(snap?.netSalary ?? p.netSalary ?? 0),
          perDayRate: snap?.perDayRate !== undefined ? Number(snap.perDayRate) : undefined,
          totalCalendarDays: Number(snap?.totalCalendarDays ?? 30),
          workingDaysCount: Number(snap?.workingDaysCount ?? 22),
          presentDays: Number(snap?.presentDays ?? 22),
          paidLeaveDays: Number(snap?.paidLeaveDays ?? 0),
          unpaidLeaveDays: Number(snap?.unpaidLeaveDays ?? 0),
          totalLopDays: Number(snap?.totalLopDays ?? 0),
          currency: String(snap?.currency || 'INR'),
          paymentMode: String(snap?.paymentMode || 'Bank Transfer'),
          bankName: String(snap?.bankName || empData.bankName || 'Direct Transfer'),
          accountNumberMasked: String(snap?.accountNumberMasked || empData.bankAccountMasked || '••••'),
          remarks: snap?.remarks || '',
        },
      };

      setSelectedPayslipData(formatted);
    } catch (err) {
      console.error('Failed to view payslip:', err);
      // Fallback: download PDF directly if drawer preparation encounters an error
      handleDownloadPdf(p.id, p.month, p.year);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header — renamed to just "Payslips" */}
      <div>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5E4BE2] shrink-0">
            <IconReceipt2 className="w-4 h-4" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Payslips
          </h1>
        </div>
        <p className="text-xs text-slate-500 font-medium mt-1">
          Access and download verified monthly salary statements and statutory tax summaries.
        </p>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Table Top Header & Year / Month Filters */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5E4BE2] shrink-0">
              <IconReceipt2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Published Salary Statements
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                {filteredPayslips.length} {filteredPayslips.length === 1 ? 'monthly statement' : 'monthly statements'} found
              </p>
            </div>
          </div>

          {/* Filter Controls: Year, Month, Refresh */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Year Selector */}
            <div className="relative">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="pl-3 pr-8 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-[#5E4BE2] text-slate-800 appearance-none cursor-pointer shadow-2xs"
              >
                <option value="ALL">All Years</option>
                {availableYears.map((yr) => (
                  <option key={yr} value={String(yr)}>
                    {yr}
                  </option>
                ))}
              </select>
              <IconChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Month Selector */}
            <div className="relative">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="pl-3 pr-8 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-[#5E4BE2] text-slate-800 appearance-none cursor-pointer shadow-2xs"
              >
                <option value="ALL">All Months</option>
                {MONTH_NAMES.map((mName, idx) => (
                  <option key={idx + 1} value={String(idx + 1)}>
                    {mName}
                  </option>
                ))}
              </select>
              <IconChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Clear Filter Button */}
            {(selectedYear !== 'ALL' || selectedMonth !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setSelectedYear('ALL');
                  setSelectedMonth('ALL');
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors cursor-pointer"
                title="Reset filters"
              >
                <IconX className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}

            <button
              type="button"
              onClick={fetchPayslips}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 shadow-2xs transition-all cursor-pointer"
            >
              <IconRefresh className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#5E4BE2]' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-xs">
            <thead className="bg-[#e5e7eb] text-xs font-bold text-slate-900 border-b border-slate-300">
              <tr>
                <th className="px-5 py-3.5 whitespace-nowrap">Payslip Period</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Gross Salary</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Deductions</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Net Take-Home</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Payment Mode</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Status</th>
                <th className="px-5 py-3.5 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-5 py-4"><div className="w-32 h-4 bg-slate-200 rounded-sm" /></td>
                    <td className="px-5 py-4"><div className="w-20 h-4 bg-slate-200 rounded-sm" /></td>
                    <td className="px-5 py-4"><div className="w-20 h-4 bg-slate-100 rounded-sm" /></td>
                    <td className="px-5 py-4"><div className="w-24 h-4 bg-slate-200 rounded-sm" /></td>
                    <td className="px-5 py-4"><div className="w-24 h-4 bg-slate-100 rounded-sm" /></td>
                    <td className="px-5 py-4"><div className="w-16 h-4 bg-slate-200 rounded-sm" /></td>
                    <td className="px-5 py-4 text-right"><div className="w-28 h-7 bg-slate-100 rounded-xl ml-auto" /></td>
                  </tr>
                ))
              ) : filteredPayslips.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-14 text-center">
                    <div className="w-12 h-12 rounded-full bg-indigo-50 text-[#5E4BE2] mx-auto flex items-center justify-center mb-3">
                      <IconReceipt2 className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-slate-800">No payslips found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {selectedYear !== 'ALL' || selectedMonth !== 'ALL'
                        ? 'Try adjusting your Year or Month filter criteria.'
                        : 'Your official monthly salary statements will appear here once published by payroll.'}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedPayslips.map((p) => {
                  let snap = p.snapshot || {};
                  if (typeof snap === 'string') {
                    try {
                      snap = JSON.parse(snap);
                    } catch (e) {
                      snap = {};
                    }
                  }
                  const netSalary = Number(snap.netSalary ?? p.netSalary ?? 0);
                  const grossSalary = Number(snap.grossSalary ?? snap.grossEarnings ?? snap.baseSalary ?? netSalary);
                  const totalDeductions = Number(snap.totalDeductions ?? snap.leaveDeduction ?? 0);
                  const paymentMode = snap.paymentMode ? String(snap.paymentMode).replace(/_/g, ' ') : 'Bank Transfer';

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5E4BE2] shrink-0">
                            <IconCalendar className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 text-xs block">
                              {MONTH_NAMES[p.month - 1]} {p.year}
                            </span>
                            {p.publishedAt && (
                              <span className="text-[11px] text-slate-400 block mt-0.5">
                                Disbursed {new Date(p.publishedAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap font-semibold text-slate-700">
                        ₹{grossSalary.toLocaleString('en-IN')}
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap font-semibold text-rose-600">
                        -₹{totalDeductions.toLocaleString('en-IN')}
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap font-black text-slate-900 text-sm">
                        ₹{netSalary.toLocaleString('en-IN')}
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200/70">
                          {paymentMode}
                        </span>
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <IconCheck className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                          <span>Verified</span>
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleViewPayslip(p)}
                            className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-[#5E4BE2] font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                          >
                            <IconEye className="w-3.5 h-3.5" />
                            <span>View &amp; Print</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadPdf(p.id, p.month, p.year)}
                            disabled={downloadingId === p.id}
                            className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs transition-colors cursor-pointer disabled:opacity-50"
                            title="Download PDF"
                          >
                            <IconDownload className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <TablePagination
          currentPage={currentPage}
          totalItems={filteredPayslips.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
          pageSizeOptions={[5, 10, 20, 50]}
          itemName="payslips"
        />
      </div>

      {/* Right-Side Slide-Over PDF Drawer for Payslip */}
      <PayslipPdfDrawer
        payslip={selectedPayslipData}
        company={company}
        onClose={() => setSelectedPayslipData(null)}
        onDownloadPdf={handleDownloadPdf}
      />
    </div>
  );
};

export default MyPayslipsPage;
