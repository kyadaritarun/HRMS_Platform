import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import {
  IconReceipt2,
  IconDownload,
  IconCalendar,
  IconCash,
  IconCheck,
  IconBuilding,
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
  const [payslips, setPayslips] = useState<PayslipItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <IconReceipt2 className="w-7 h-7 text-brand-600" />
          My Monthly Payslips
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Access and download verified monthly salary statements and statutory tax summaries.
        </p>
      </div>

      {/* Grid of Payslip Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs animate-pulse space-y-3">
              <div className="w-24 h-4 bg-slate-200 rounded-sm" />
              <div className="w-36 h-6 bg-slate-200 rounded-sm" />
              <div className="w-full h-10 bg-slate-100 rounded-xl" />
            </div>
          ))
        ) : payslips.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-400 bg-white rounded-3xl border border-slate-200/80">
            <IconReceipt2 className="w-12 h-12 mx-auto mb-2 text-slate-300" />
            No published payslips found for your account yet.
          </div>
        ) : (
          payslips.map((p) => {
            const snap = p.snapshot || {};
            const netSalary = snap.netSalary || 0;
            const grossSalary = snap.grossSalary ?? snap.grossEarnings ?? snap.baseSalary ?? 0;
            const totalDeductions = snap.totalDeductions ?? snap.leaveDeduction ?? 0;
            const currency = snap.currency || 'INR';

            return (
              <div
                key={p.id}
                className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:border-slate-300 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-brand-700 bg-brand-50 px-2.5 py-1 rounded-lg">
                      {MONTH_NAMES[p.month - 1]} {p.year}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Verified
                    </span>
                  </div>

                  <span className="text-xs text-slate-400 font-medium">Net Take-Home Pay</span>
                  <div className="text-3xl font-black text-slate-900 mt-0.5">
                    ₹{netSalary.toLocaleString()}
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-1.5 text-xs text-slate-500">
                    <div className="flex justify-between">
                      <span>Gross CTC:</span>
                      <span className="font-semibold text-slate-800">₹{grossSalary.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Deductions:</span>
                      <span className="font-semibold text-rose-600">-₹{totalDeductions.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Bank Mode:</span>
                      <span className="font-medium text-slate-700">{snap.paymentMode || 'Direct Transfer'}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100">
                  <button
                    onClick={() => handleDownloadPdf(p.id, p.month, p.year)}
                    disabled={downloadingId === p.id}
                    className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
                  >
                    <IconDownload className="w-4 h-4" />
                    {downloadingId === p.id ? 'Generating PDF...' : 'Download PDF Payslip'}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default MyPayslipsPage;
