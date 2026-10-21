import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { PayslipPdfDrawer, PayslipData } from '../../components/pdf';
import {
  IconReceipt2,
  IconDownload,
  IconCalendar,
  IconCash,
  IconCheck,
  IconBuilding,
  IconEye,
  IconRefresh,
} from '@tabler/icons-react';

interface PayslipItem {
  id: number;
  month: number;
  year: number;
  status: string;
  publishedAt: string;
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

  const handleDownloadPdf = async (id: number, month: number, year: number) => {
    setDownloadingId(id);
    try {
      const res = await api.get(`/payroll/payslips/${id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Payslip_${MONTH_NAMES[month - 1]}_${year}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Failed to download payslip:', err);
      alert('Unable to generate payslip PDF.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleViewPayslip = (p: PayslipItem) => {
    const snap = p.snapshot || {};
    const empData = snap.employee || user || {};

    const formatted: PayslipData = {
      id: p.id,
      month: p.month,
      year: p.year,
      status: p.status,
      publishedAt: p.publishedAt,
      employee: {
        id: empData.id,
        firstName: empData.firstName || user?.firstName || 'Employee',
        lastName: empData.lastName || user?.lastName || '',
        email: empData.email || user?.email,
        jobTitle: empData.jobTitle || 'Employee',
        department: empData.department?.name || empData.department || 'Operations',
        panNumber: empData.panNumber,
        bankName: snap.bankName || empData.bankName,
        bankAccountMasked: snap.accountNumberMasked || empData.bankAccountMasked,
      },
      calculation: {
        baseSalary: snap.baseSalary,
        basicSalary: snap.basicSalary,
        hra: snap.hra,
        specialAllowance: snap.specialAllowance,
        grossSalary: snap.grossSalary ?? snap.grossEarnings,
        grossEarnings: snap.grossEarnings ?? snap.grossSalary,
        bonus: snap.bonus,
        overtimeHours: snap.overtimeHours,
        overtimePay: snap.overtimePay,
        customComponents: snap.customComponents,
        pf: snap.pf,
        pt: snap.pt,
        tds: snap.tds,
        lopDeduction: snap.lopDeduction ?? snap.leaveDeduction,
        leaveDeduction: snap.leaveDeduction ?? snap.lopDeduction,
        otherDeductions: snap.otherDeductions,
        totalDeductions: snap.totalDeductions,
        netSalary: snap.netSalary,
        workingDaysCount: snap.workingDaysCount,
        presentDays: snap.presentDays,
        totalLopDays: snap.totalLopDays,
        paymentMode: snap.paymentMode,
      },
    };

    setSelectedPayslipData(formatted);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5E4BE2] shrink-0">
            <IconReceipt2 className="w-4 h-4" />
          </div>
          My Monthly Payslips
        </h1>
        <p className="text-xs text-slate-500 font-medium mt-1">
          Access and download verified monthly salary statements and statutory tax summaries.
        </p>
      </div>

      {/* Table Form Container */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Table Top Header / Controls */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5E4BE2] shrink-0">
              <IconReceipt2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Published Salary Statements
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                {payslips.length} {payslips.length === 1 ? 'monthly statement' : 'monthly statements'} recorded
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={fetchPayslips}
            className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 shadow-2xs transition-all cursor-pointer"
          >
            <IconRefresh className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#5E4BE2]' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-xs">
            <thead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 bg-slate-50/50">
              <tr>
                <th className="px-5 py-3.5 whitespace-nowrap">PAYSLIP PERIOD</th>
                <th className="px-5 py-3.5 whitespace-nowrap">GROSS SALARY</th>
                <th className="px-5 py-3.5 whitespace-nowrap">DEDUCTIONS</th>
                <th className="px-5 py-3.5 whitespace-nowrap">NET TAKE-HOME</th>
                <th className="px-5 py-3.5 whitespace-nowrap">PAYMENT MODE</th>
                <th className="px-5 py-3.5 whitespace-nowrap">STATUS</th>
                <th className="px-5 py-3.5 text-right whitespace-nowrap">ACTIONS</th>
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
              ) : payslips.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-14 text-center">
                    <div className="w-12 h-12 rounded-full bg-indigo-50 text-[#5E4BE2] mx-auto flex items-center justify-center mb-3">
                      <IconReceipt2 className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-slate-800">No published payslips found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Your official monthly salary statements will appear here once published by payroll.
                    </p>
                  </td>
                </tr>
              ) : (
                payslips.map((p) => {
                  const snap = p.snapshot || {};
                  const netSalary = snap.netSalary || 0;
                  const grossSalary = snap.grossSalary ?? snap.grossEarnings ?? snap.baseSalary ?? 0;
                  const totalDeductions = snap.totalDeductions ?? snap.leaveDeduction ?? 0;
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

                      <td className="px-5 py-4 whitespace-nowrap font-medium text-slate-700">
                        ₹{grossSalary.toLocaleString()}
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap font-semibold text-rose-600">
                        -₹{totalDeductions.toLocaleString()}
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap font-black text-slate-900 text-sm">
                        ₹{netSalary.toLocaleString()}
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
      </div>

      {/* Right-Side Slide-Over PDF Drawer for Payslip */}
      <PayslipPdfDrawer
        payslip={selectedPayslipData}
        company={company}
        onClose={() => setSelectedPayslipData(null)}
      />
    </div>
  );
};

export default MyPayslipsPage;
