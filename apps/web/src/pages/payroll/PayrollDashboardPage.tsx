import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import {
  IconCash,
  IconCheck,
  IconCalendar,
  IconReceipt2,
  IconDownload,
  IconAlertCircle,
  IconPlayerPlay,
} from '@tabler/icons-react';

interface PayrollEmployee {
  employee: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    jobTitle: string;
    department: string;
  };
  payslipId: number | null;
  status: 'DRAFT' | 'PUBLISHED';
  publishedAt: string | null;
  calculation?: {
    grossSalary?: number;
    grossEarnings?: number;
    baseSalary?: number;
    netSalary?: number;
    lopDays?: number;
    totalLopDays?: number;
    lopDeduction?: number;
    leaveDeduction?: number;
    pfEmployee?: number;
    esiEmployee?: number;
    tds?: number;
    totalDeductions?: number;
    totalEarnings?: number;
    currency?: string;
  };
}

export const PayrollDashboardPage: React.FC = () => {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [employees, setEmployees] = useState<PayrollEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchPayroll = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/payroll/dashboard', { params: { month, year } });
      setEmployees(res.data?.employees || []);
    } catch (err) {
      console.error('Failed to load payroll:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayroll();
  }, [month, year]);

  const handlePublishAll = async () => {
    if (!window.confirm(`Publish payroll for ${employees.length} employees for ${month}/${year}?`)) return;
    setIsPublishing(true);
    setMessage(null);
    try {
      const empIds = employees.map((e) => e.employee.id);
      const res = await api.post('/payroll/publish', {
        month,
        year,
        employeeIds: empIds,
        force: true,
      });
      setMessage(`Successfully published payroll for ${res.data?.count} employees!`);
      fetchPayroll();
    } catch (err: any) {
      setMessage(`Error publishing payroll: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsPublishing(false);
    }
  };

  // Metrics
  const totalNet = employees.reduce((acc, e) => acc + (e.calculation?.netSalary ?? 0), 0);
  const totalGross = employees.reduce(
    (acc, e) => acc + (e.calculation?.grossSalary ?? e.calculation?.grossEarnings ?? e.calculation?.baseSalary ?? 0),
    0
  );
  const totalDeductions = employees.reduce((acc, e) => acc + (e.calculation?.totalDeductions ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <IconCash className="w-7 h-7 text-brand-600" />
            Payroll Calculation Engine
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Automated salary calculations with Loss of Pay (LOP), statutory deductions (PF/ESI/TDS), and payslip generation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl font-medium text-slate-700 shadow-xs"
          >
            {[
              'January', 'February', 'March', 'April', 'May', 'June',
              'July', 'August', 'September', 'October', 'November', 'December'
            ].map((m, idx) => (
              <option key={idx + 1} value={idx + 1}>{m}</option>
            ))}
          </select>

          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl font-medium text-slate-700 shadow-xs"
          >
            {[2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          <button
            onClick={handlePublishAll}
            disabled={isPublishing || employees.length === 0}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-sm transition-all shadow-brand-500/20 active:scale-95 disabled:opacity-50"
          >
            <IconPlayerPlay className="w-4 h-4" />
            {isPublishing ? 'Calculating & Publishing...' : 'Publish Payroll'}
          </button>
        </div>
      </div>

      {message && (
        <div className="p-4 rounded-2xl bg-brand-50 border border-brand-200 text-brand-800 text-sm flex items-center gap-2 animate-in fade-in">
          <IconCheck className="w-5 h-5 shrink-0 text-brand-600" />
          {message}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Gross CTC</span>
          <p className="text-2xl font-black text-slate-900 mt-1">₹{totalGross.toLocaleString()}</p>
          <span className="text-xs text-slate-500 mt-1 block">Scheduled earnings</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Statutory Deductions</span>
          <p className="text-2xl font-black text-rose-600 mt-1">₹{totalDeductions.toLocaleString()}</p>
          <span className="text-xs text-slate-500 mt-1 block">PF, ESI, TDS & LOP</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Net Payout Disbursed</span>
          <p className="text-2xl font-black text-emerald-600 mt-1">₹{totalNet.toLocaleString()}</p>
          <span className="text-xs text-slate-500 mt-1 block">Bank transfer liability</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Employees Processed</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{employees.length}</p>
          <span className="text-xs text-slate-500 mt-1 block">Active on payroll</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/80 text-xs font-semibold text-slate-500 uppercase border-b border-slate-100">
              <tr>
                <th className="px-6 py-3.5">Employee</th>
                <th className="px-6 py-3.5">Department</th>
                <th className="px-6 py-3.5">Gross CTC</th>
                <th className="px-6 py-3.5">LOP Days</th>
                <th className="px-6 py-3.5">Deductions</th>
                <th className="px-6 py-3.5">Net Pay</th>
                <th className="px-6 py-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="w-32 h-4 bg-slate-200 rounded-sm" /></td>
                    <td className="px-6 py-4"><div className="w-20 h-4 bg-slate-200 rounded-sm" /></td>
                    <td className="px-6 py-4"><div className="w-16 h-4 bg-slate-200 rounded-sm" /></td>
                    <td className="px-6 py-4"><div className="w-10 h-4 bg-slate-200 rounded-sm" /></td>
                    <td className="px-6 py-4"><div className="w-16 h-4 bg-slate-200 rounded-sm" /></td>
                    <td className="px-6 py-4"><div className="w-16 h-4 bg-slate-200 rounded-sm" /></td>
                    <td className="px-6 py-4"><div className="w-20 h-4 bg-slate-200 rounded-full" /></td>
                  </tr>
                ))
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    <IconCash className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    No employees found for this payroll run.
                  </td>
                </tr>
              ) : (
                employees.map((item) => (
                  <tr key={item.employee.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">
                        {item.employee.firstName} {item.employee.lastName}
                      </div>
                      <div className="text-xs text-slate-400">{item.employee.jobTitle}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-medium text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md">
                        {item.employee.department}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      ₹{(item.calculation?.grossSalary ?? item.calculation?.grossEarnings ?? item.calculation?.baseSalary ?? 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-semibold ${(item.calculation?.lopDays ?? item.calculation?.totalLopDays ?? 0) > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                        {item.calculation?.lopDays ?? item.calculation?.totalLopDays ?? 0} d
                      </span>
                    </td>
                    <td className="px-6 py-4 text-rose-600 font-medium">
                      -₹{(item.calculation?.totalDeductions ?? 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 font-black text-slate-900">
                      ₹{(item.calculation?.netSalary ?? 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        item.status === 'PUBLISHED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PayrollDashboardPage;
