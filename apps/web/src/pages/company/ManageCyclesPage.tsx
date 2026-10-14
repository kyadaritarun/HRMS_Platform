import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import {
  IconCalendarEvent,
  IconPlus,
  IconCheck,
  IconX,
  IconAlertCircle,
  IconClock,
  IconCash,
  IconTarget,
  IconCalendar,
  IconSearch,
  IconTable,
  IconLayoutGrid,
} from '@tabler/icons-react';

interface PerformanceCycle {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

interface PayrollCycle {
  id: string;
  name: string;
  payDay: number;
  cutoffDay: number;
  freezeAttendance: boolean;
  isActive: boolean;
}

export const ManageCyclesPage: React.FC = () => {
  const [perfCycles, setPerfCycles] = useState<PerformanceCycle[]>([]);
  const [payrollCycles, setPayrollCycles] = useState<PayrollCycle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'PERFORMANCE' | 'PAYROLL'>('PERFORMANCE');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'PERFORMANCE' | 'PAYROLL'>('PERFORMANCE');
  const [perfForm, setPerfForm] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    isActive: true,
  });
  const [payrollForm, setPayrollForm] = useState({
    name: '',
    payDay: 30,
    cutoffDay: 25,
    freezeAttendance: true,
    isActive: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCycles = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/company/cycles');
      setPerfCycles(res.data?.performanceCycles || []);
      setPayrollCycles(res.data?.payrollCycles || []);
    } catch (err) {
      console.error('Failed to load cycles:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCycles();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      if (modalType === 'PERFORMANCE') {
        if (!perfForm.name || !perfForm.startDate || !perfForm.endDate) {
          setError('Name and date ranges are required');
          setIsSubmitting(false);
          return;
        }
        await api.post('/company/cycles', {
          type: 'performance',
          cycle: perfForm,
        });
      } else {
        if (!payrollForm.name) {
          setError('Cycle name is required');
          setIsSubmitting(false);
          return;
        }
        await api.post('/company/cycles', {
          type: 'payroll',
          cycle: payrollForm,
        });
      }
      setIsModalOpen(false);
      fetchCycles();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save cycle');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activePerfCount = perfCycles.filter((c) => c.isActive).length;
  const freezeAttendanceCount = payrollCycles.filter((c) => c.freezeAttendance).length;

  const getCycleDuration = (start: string, end: string) => {
    try {
      const s = new Date(start);
      const e = new Date(end);
      const diffTime = Math.abs(e.getTime() - s.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays >= 85 && diffDays <= 100) return `${diffDays} Days (Quarterly)`;
      if (diffDays >= 350) return `${diffDays} Days (Annual)`;
      return `${diffDays} Days`;
    } catch {
      return 'Custom Range';
    }
  };

  const filteredPerfCycles = perfCycles.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredPayrollCycles = payrollCycles.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5E4BE2] shrink-0">
              <IconCalendarEvent className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Manage Operational Cycles
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Configure appraisal evaluation periods, OKR submission windows, and monthly payroll cutoff schedules.
          </p>
        </div>

        <button
          onClick={() => {
            setModalType(activeTab);
            setError(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#5E4BE2] to-[#4B39C3] hover:from-[#5340D4] hover:to-[#4130B4] text-white text-xs font-bold rounded-xl shadow-sm shadow-indigo-600/25 transition-all active:scale-[0.98] cursor-pointer self-start sm:self-auto"
        >
          <IconPlus className="w-4 h-4" />
          <span>{activeTab === 'PERFORMANCE' ? 'Add Appraisal Cycle' : 'Add Payroll Cycle'}</span>
        </button>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <span className="text-xs font-bold text-slate-500">Performance Cycles</span>
            <div className="text-2xl font-black text-slate-900 mt-1 leading-none tracking-tight">
              {perfCycles.length}
            </div>
            <div className="text-[11px] font-bold text-indigo-600 mt-2">
              OKR review schedules
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5E4BE2]">
            <IconTarget className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <span className="text-xs font-bold text-slate-500">Active Appraisals</span>
            <div className="text-2xl font-black text-slate-900 mt-1 leading-none tracking-tight">
              {activePerfCount}
            </div>
            <div className="text-[11px] font-bold text-emerald-600 mt-2">
              Currently accepting reviews
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <IconCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <span className="text-xs font-bold text-slate-500">Payroll Cycles</span>
            <div className="text-2xl font-black text-slate-900 mt-1 leading-none tracking-tight">
              {payrollCycles.length}
            </div>
            <div className="text-[11px] font-bold text-purple-600 mt-2">
              Monthly pay runs
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
            <IconCash className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <span className="text-xs font-bold text-slate-500">Auto Freeze Cutoff</span>
            <div className="text-2xl font-black text-slate-900 mt-1 leading-none tracking-tight">
              {freezeAttendanceCount}
            </div>
            <div className="text-[11px] font-bold text-amber-600 mt-2">
              Automated lock enabled
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
            <IconClock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Table / Card Content Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Control Header Bar */}
        <div className="p-3.5 sm:p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Segmented Tab Switcher */}
          <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl w-fit">
            <button
              type="button"
              onClick={() => setActiveTab('PERFORMANCE')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'PERFORMANCE'
                  ? 'bg-white text-[#5E4BE2] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <IconTarget className="w-3.5 h-3.5" />
              <span>Performance & OKR Cycles ({perfCycles.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('PAYROLL')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'PAYROLL'
                  ? 'bg-white text-[#5E4BE2] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <IconCash className="w-3.5 h-3.5" />
              <span>Payroll Processing Cycles ({payrollCycles.length})</span>
            </button>
          </div>

          {/* Right Controls: Search & View Switcher */}
          <div className="flex items-center gap-2.5 self-end sm:self-auto w-full sm:w-auto">
            <div className="relative flex-1 sm:w-60">
              <IconSearch className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search cycles..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-[#5E4BE2] focus:bg-white transition-all"
              />
            </div>

            {/* Toggle Table vs Cards */}
            <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                title="Table View"
                className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white text-[#5E4BE2] shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <IconTable className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                title="Card View"
                className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'cards'
                    ? 'bg-white text-[#5E4BE2] shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <IconLayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Content Body */}
        {isLoading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-indigo-600 border-t-transparent mb-2" />
            <p className="text-xs">Loading operational cycles...</p>
          </div>
        ) : viewMode === 'table' ? (
          /* TABLE FORM VIEW */
          <div className="overflow-x-auto">
            {activeTab === 'PERFORMANCE' ? (
              filteredPerfCycles.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <div className="w-12 h-12 rounded-full bg-indigo-50 text-[#5E4BE2] flex items-center justify-center mx-auto mb-3">
                    <IconTarget className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">No Performance Cycles Found</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    {searchQuery
                      ? 'No cycles match your search query.'
                      : 'Define evaluation windows and milestones for employee appraisal reviews.'}
                  </p>
                  <button
                    onClick={() => {
                      setModalType('PERFORMANCE');
                      setError(null);
                      setIsModalOpen(true);
                    }}
                    className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#5E4BE2] to-[#4B39C3] hover:from-[#5340D4] hover:to-[#4130B4] text-white text-xs font-bold shadow-sm shadow-indigo-600/25 cursor-pointer"
                  >
                    <IconPlus className="w-4 h-4" /> Add Appraisal Cycle
                  </button>
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 bg-slate-50/50">
                    <tr>
                      <th className="px-5 py-3.5">CYCLE NAME & DESCRIPTION</th>
                      <th className="px-4 py-3.5">EVALUATION WINDOW</th>
                      <th className="px-4 py-3.5">DURATION</th>
                      <th className="px-4 py-3.5">STATUS</th>
                      <th className="px-5 py-3.5 text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPerfCycles.map((cycle) => (
                      <tr key={cycle.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* Name & Description */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5E4BE2] shrink-0">
                              <IconTarget className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="font-bold text-slate-900 block text-sm leading-snug">
                                {cycle.name}
                              </span>
                              <span className="text-[11px] text-slate-500 font-normal block mt-0.5 line-clamp-1">
                                {cycle.description || 'Year-end OKRs & performance evaluations'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Evaluation Window */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <IconCalendar className="w-4 h-4 text-slate-400 shrink-0" />
                            <div>
                              <span className="font-semibold text-slate-800 block">
                                {new Date(cycle.startDate).toLocaleDateString()} — {new Date(cycle.endDate).toLocaleDateString()}
                              </span>
                              <span className="text-[10px] text-slate-400">Quarterly window</span>
                            </div>
                          </div>
                        </td>

                        {/* Duration */}
                        <td className="px-4 py-3.5">
                          <span className="px-2.5 py-1 rounded-lg bg-slate-100 font-semibold text-slate-700 text-[11px] border border-slate-200/80">
                            {getCycleDuration(cycle.startDate, cycle.endDate)}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3.5">
                          {cycle.isActive ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              ACTIVE CYCLE
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              UPCOMING / ARCHIVED
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-3.5 text-right">
                          <button
                            onClick={() => {
                              setPerfForm({
                                name: cycle.name,
                                description: cycle.description || '',
                                startDate: cycle.startDate ? cycle.startDate.split('T')[0] : '',
                                endDate: cycle.endDate ? cycle.endDate.split('T')[0] : '',
                                isActive: cycle.isActive,
                              });
                              setModalType('PERFORMANCE');
                              setError(null);
                              setIsModalOpen(true);
                            }}
                            className="text-xs font-semibold text-[#5E4BE2] hover:text-[#4B39C3] hover:underline cursor-pointer"
                          >
                            Configure
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            ) : filteredPayrollCycles.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <div className="w-12 h-12 rounded-full bg-indigo-50 text-[#5E4BE2] flex items-center justify-center mx-auto mb-3">
                  <IconCash className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">No Payroll Schedules Configured</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  {searchQuery
                    ? 'No payroll schedules match your search query.'
                    : 'Configure monthly cutoff days, disbursement schedules, and automated ledger freezing.'}
                </p>
                <button
                  onClick={() => {
                    setModalType('PAYROLL');
                    setError(null);
                    setIsModalOpen(true);
                  }}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#5E4BE2] to-[#4B39C3] hover:from-[#5340D4] hover:to-[#4130B4] text-white text-xs font-bold shadow-sm shadow-indigo-600/25 cursor-pointer"
                >
                  <IconPlus className="w-4 h-4" /> Add Payroll Cycle
                </button>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 bg-slate-50/50">
                  <tr>
                    <th className="px-5 py-3.5">PAYROLL RUN NAME</th>
                    <th className="px-4 py-3.5">CUTOFF DAY</th>
                    <th className="px-4 py-3.5">DISBURSEMENT / PAY DAY</th>
                    <th className="px-4 py-3.5">ATTENDANCE LOCK</th>
                    <th className="px-4 py-3.5">STATUS</th>
                    <th className="px-5 py-3.5 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPayrollCycles.map((cycle) => (
                    <tr key={cycle.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Name */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shrink-0">
                            <IconCash className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block text-sm leading-snug">
                              {cycle.name}
                            </span>
                            <span className="text-[11px] text-slate-500 font-normal block mt-0.5">
                              Automatic payroll ledger generation & payslips
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Cutoff Day */}
                      <td className="px-4 py-3.5">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 font-semibold text-slate-800 text-[11px] border border-slate-200">
                          {cycle.cutoffDay}th of month
                        </span>
                      </td>

                      {/* Disbursement Day */}
                      <td className="px-4 py-3.5">
                        <span className="px-2.5 py-1 rounded-lg bg-purple-50 font-bold text-purple-700 text-[11px] border border-purple-100">
                          {cycle.payDay}th of month
                        </span>
                      </td>

                      {/* Freeze Attendance */}
                      <td className="px-4 py-3.5">
                        {cycle.freezeAttendance ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <IconCheck className="w-3.5 h-3.5 text-emerald-600" />
                            Auto-Freeze
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            Manual Lock
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        {cycle.isActive ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            PRIMARY RUN
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            SECONDARY
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => {
                            setPayrollForm({
                              name: cycle.name,
                              payDay: cycle.payDay,
                              cutoffDay: cycle.cutoffDay,
                              freezeAttendance: cycle.freezeAttendance,
                              isActive: cycle.isActive,
                            });
                            setModalType('PAYROLL');
                            setError(null);
                            setIsModalOpen(true);
                          }}
                          className="text-xs font-semibold text-[#5E4BE2] hover:text-[#4B39C3] hover:underline cursor-pointer"
                        >
                          Configure
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          /* CARD FORM VIEW */
          <div className="p-4 sm:p-5">
            {activeTab === 'PERFORMANCE' ? (
              filteredPerfCycles.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <div className="w-12 h-12 rounded-full bg-indigo-50 text-[#5E4BE2] flex items-center justify-center mx-auto mb-3">
                    <IconTarget className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">No Performance Cycles Found</h4>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredPerfCycles.map((cycle) => (
                    <div
                      key={cycle.id}
                      className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all space-y-4 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-base font-bold text-slate-900">{cycle.name}</h3>
                              {cycle.isActive ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  ACTIVE CYCLE
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200/70">
                                  UPCOMING / ARCHIVED
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                              {cycle.description}
                            </p>
                          </div>
                          <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                            <IconTarget className="w-5 h-5" />
                          </div>
                        </div>
                      </div>

                      <div className="p-3 bg-slate-50/80 rounded-xl text-xs text-slate-600 flex items-center justify-between border border-slate-100">
                        <span className="text-slate-500 font-medium">Evaluation Window:</span>
                        <span className="font-bold text-slate-800">
                          {new Date(cycle.startDate).toLocaleDateString()} — {new Date(cycle.endDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : filteredPayrollCycles.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <div className="w-12 h-12 rounded-full bg-indigo-50 text-[#5E4BE2] flex items-center justify-center mx-auto mb-3">
                  <IconCash className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">No Payroll Schedules Configured</h4>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredPayrollCycles.map((cycle) => (
                  <div
                    key={cycle.id}
                    className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all space-y-4 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-slate-900">{cycle.name}</h3>
                            {cycle.isActive && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                PRIMARY RUN
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                            Automatic payroll ledger generation & payslip locking.
                          </p>
                        </div>
                        <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                          <IconCash className="w-5 h-5" />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100">
                        <span className="text-slate-400 block text-[11px] font-medium">Monthly Cutoff Day</span>
                        <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                          {cycle.cutoffDay}th of month
                        </span>
                      </div>
                      <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100">
                        <span className="text-slate-400 block text-[11px] font-medium">Disbursement / Pay Day</span>
                        <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                          {cycle.payDay}th of month
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Cycle Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5E4BE2] shrink-0">
                  <IconCalendarEvent className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {modalType === 'PERFORMANCE' ? 'New Performance Appraisal Cycle' : 'New Payroll Schedule'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Configure cycle parameters and validity period.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <IconX className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex items-center gap-2">
                <IconAlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {modalType === 'PERFORMANCE' ? (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Cycle Name</label>
                    <input
                      type="text"
                      required
                      value={perfForm.name}
                      onChange={(e) => setPerfForm({ ...perfForm, name: e.target.value })}
                      placeholder="e.g. Q3 2026 OKR Review Cycle"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-hidden focus:border-[#5E4BE2]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                    <input
                      type="text"
                      value={perfForm.description}
                      onChange={(e) => setPerfForm({ ...perfForm, description: e.target.value })}
                      placeholder="e.g. Quarterly milestone targets for engineering & product"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-hidden focus:border-[#5E4BE2]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date</label>
                      <input
                        type="date"
                        required
                        value={perfForm.startDate}
                        onChange={(e) => setPerfForm({ ...perfForm, startDate: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-hidden focus:border-[#5E4BE2]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">End Date</label>
                      <input
                        type="date"
                        required
                        value={perfForm.endDate}
                        onChange={(e) => setPerfForm({ ...perfForm, endDate: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-hidden focus:border-[#5E4BE2]"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Cycle Name</label>
                    <input
                      type="text"
                      required
                      value={payrollForm.name}
                      onChange={(e) => setPayrollForm({ ...payrollForm, name: e.target.value })}
                      placeholder="e.g. Regular Salaried Payroll Run"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-hidden focus:border-[#5E4BE2]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Cutoff Day (1-31)</label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={payrollForm.cutoffDay}
                        onChange={(e) => setPayrollForm({ ...payrollForm, cutoffDay: Number(e.target.value) })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-hidden focus:border-[#5E4BE2]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Pay Day (1-31)</label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={payrollForm.payDay}
                        onChange={(e) => setPayrollForm({ ...payrollForm, payDay: Number(e.target.value) })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-hidden focus:border-[#5E4BE2]"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#5E4BE2] to-[#4B39C3] hover:from-[#5340D4] hover:to-[#4130B4] disabled:opacity-50 shadow-sm shadow-indigo-600/25 cursor-pointer"
                >
                  {isSubmitting ? 'Saving...' : 'Save Cycle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageCyclesPage;
