import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '../../api/client';
import {
  IconCalendarEvent,
  IconPlus,
  IconCheck,
  IconX,
  IconAlertCircle,
  IconCash,
  IconTarget,
  IconCalendar,
  IconSearch,
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
  const [searchQuery, setSearchQuery] = useState('');

  // Drawer / Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'PERFORMANCE' | 'PAYROLL'>('PERFORMANCE');
  const [editingId, setEditingId] = useState<string | null>(null);

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

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      if (modalType === 'PERFORMANCE') {
        if (!perfForm.name || !perfForm.startDate || !perfForm.endDate) {
          setError('Name, start date, and end date are required');
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
      setEditingId(null);
      fetchCycles();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save cycle');
    } finally {
      setIsSubmitting(false);
    }
  };

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <IconCalendarEvent className="w-5 h-5 text-indigo-600 shrink-0" />
            <span>Manage Cycles</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure appraisal evaluation periods, OKR submission windows, and monthly payroll cutoff schedules.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingId(null);
            setModalType(activeTab);
            setError(null);
            if (activeTab === 'PERFORMANCE') {
              setPerfForm({ name: '', description: '', startDate: '', endDate: '', isActive: true });
            } else {
              setPayrollForm({ name: '', payDay: 30, cutoffDay: 25, freezeAttendance: true, isActive: true });
            }
            setIsModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#5E4BE2] hover:bg-[#4D3BC9] text-white font-bold text-xs shadow-xs transition-colors cursor-pointer shrink-0"
        >
          <IconPlus className="w-4 h-4" />
          <span>{activeTab === 'PERFORMANCE' ? 'Add Appraisal Cycle' : 'Add Payroll Cycle'}</span>
        </button>
      </div>

      {/* Main Table Container Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden space-y-4 p-5">
        {/* Search & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Segmented Tab Switcher */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 p-1 rounded-xl shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('PERFORMANCE')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'PERFORMANCE'
                  ? 'bg-white text-[#5E4BE2] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <IconTarget className="w-3.5 h-3.5" />
              <span>Performance & OKR Cycles ({perfCycles.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('PAYROLL')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'PAYROLL'
                  ? 'bg-white text-[#5E4BE2] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <IconCash className="w-3.5 h-3.5" />
              <span>Payroll Processing Cycles ({payrollCycles.length})</span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 max-w-xs">
            <IconSearch className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search cycles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#5E4BE2] text-slate-800 placeholder-slate-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <IconX className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-slate-400">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-[#5E4BE2] border-t-transparent mb-2" />
              <p className="text-xs font-medium">Loading operational cycles...</p>
            </div>
          ) : activeTab === 'PERFORMANCE' ? (
            filteredPerfCycles.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-[#5E4BE2] flex items-center justify-center mx-auto mb-3">
                  <IconTarget className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-semibold text-slate-700">No Performance Cycles Found</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  {searchQuery
                    ? 'No cycles match your search query.'
                    : 'Define evaluation windows and milestones for employee appraisal reviews.'}
                </p>
                <button
                  onClick={() => {
                    setEditingId(null);
                    setModalType('PERFORMANCE');
                    setError(null);
                    setPerfForm({ name: '', description: '', startDate: '', endDate: '', isActive: true });
                    setIsModalOpen(true);
                  }}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#5E4BE2] to-[#4B39C3] hover:from-[#5340D4] hover:to-[#4130B4] text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  <IconPlus className="w-4 h-4" /> Add Appraisal Cycle
                </button>
              </div>
            ) : (
              <table className="w-full min-w-[850px] text-left text-xs">
                <thead className="bg-[#e5e7eb] text-xs font-bold text-slate-900 border-b border-slate-300">
                  <tr>
                    <th className="px-5 py-3.5 whitespace-nowrap">Cycle Name &amp; Description</th>
                    <th className="px-5 py-3.5 whitespace-nowrap">Evaluation Window</th>
                    <th className="px-5 py-3.5 whitespace-nowrap">Duration</th>
                    <th className="px-5 py-3.5 whitespace-nowrap">Status</th>
                    <th className="px-5 py-3.5 text-right whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPerfCycles.map((cycle) => (
                    <tr key={cycle.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Name & Description */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5E4BE2] shrink-0">
                            <IconTarget className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block text-xs">
                              {cycle.name}
                            </span>
                            <span className="text-[11px] text-slate-500 font-normal block mt-0.5 line-clamp-1 max-w-xs">
                              {cycle.description || 'Year-end OKRs & performance evaluations'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Evaluation Window */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <IconCalendar className="w-4 h-4 text-slate-400 shrink-0" />
                          <div>
                            <span className="font-semibold text-slate-800 block text-xs">
                              {new Date(cycle.startDate).toLocaleDateString()} — {new Date(cycle.endDate).toLocaleDateString()}
                            </span>
                            <span className="text-[10px] text-slate-400">Appraisal timeframe</span>
                          </div>
                        </div>
                      </td>

                      {/* Duration */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="px-3 py-1 rounded-full bg-slate-100 font-bold text-slate-700 text-xs border border-slate-200/80">
                          {getCycleDuration(cycle.startDate, cycle.endDate)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        {cycle.isActive ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            ACTIVE CYCLE
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            UPCOMING / ARCHIVED
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(cycle.id);
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
                          className="px-3 py-1.5 text-xs font-bold text-[#5E4BE2] hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
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
            <div className="py-16 text-center text-slate-400">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center mx-auto mb-3">
                <IconCash className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-slate-700">No Payroll Schedules Configured</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {searchQuery
                  ? 'No payroll schedules match your search query.'
                  : 'Configure monthly cutoff days, disbursement schedules, and automated ledger freezing.'}
              </p>
              <button
                onClick={() => {
                  setEditingId(null);
                  setModalType('PAYROLL');
                  setError(null);
                  setPayrollForm({ name: '', payDay: 30, cutoffDay: 25, freezeAttendance: true, isActive: true });
                  setIsModalOpen(true);
                }}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#5E4BE2] to-[#4B39C3] hover:from-[#5340D4] hover:to-[#4130B4] text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                <IconPlus className="w-4 h-4" /> Add Payroll Cycle
              </button>
            </div>
          ) : (
            <table className="w-full min-w-[850px] text-left text-xs">
              <thead className="bg-[#e5e7eb] text-xs font-bold text-slate-900 border-b border-slate-300">
                <tr>
                  <th className="px-5 py-3.5 whitespace-nowrap">Payroll Run Name</th>
                  <th className="px-5 py-3.5 whitespace-nowrap">Cutoff Day</th>
                  <th className="px-5 py-3.5 whitespace-nowrap">Disbursement / Pay Day</th>
                  <th className="px-5 py-3.5 whitespace-nowrap">Attendance Lock</th>
                  <th className="px-5 py-3.5 whitespace-nowrap">Status</th>
                  <th className="px-5 py-3.5 text-right whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPayrollCycles.map((cycle) => (
                  <tr key={cycle.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Name */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shrink-0">
                          <IconCash className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 block text-xs">
                            {cycle.name}
                          </span>
                          <span className="text-[11px] text-slate-500 font-normal block mt-0.5">
                            Automatic payroll ledger generation & payslips
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Cutoff Day */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="px-3 py-1 rounded-full bg-slate-100 font-semibold text-slate-800 text-xs border border-slate-200/80">
                        {cycle.cutoffDay}th of month
                      </span>
                    </td>

                    {/* Disbursement Day */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="px-3 py-1 rounded-full bg-purple-50 font-bold text-purple-700 text-xs border border-purple-200/80">
                        {cycle.payDay}th of month
                      </span>
                    </td>

                    {/* Freeze Attendance */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      {cycle.freezeAttendance ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <IconCheck className="w-3.5 h-3.5 text-emerald-600" />
                          Auto-Freeze
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                          Manual
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      {cycle.isActive ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          ACTIVE
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          INACTIVE
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(cycle.id);
                          setPayrollForm({
                            name: cycle.name,
                            cutoffDay: cycle.cutoffDay,
                            payDay: cycle.payDay,
                            freezeAttendance: cycle.freezeAttendance,
                            isActive: cycle.isActive,
                          });
                          setModalType('PAYROLL');
                          setError(null);
                          setIsModalOpen(true);
                        }}
                        className="px-3 py-1.5 text-xs font-bold text-[#5E4BE2] hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
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
      </div>

      {/* Add / Configure Cycle Right-Side Slide-Over Drawer */}
      {isModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] overflow-hidden">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsModalOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10 pointer-events-none">
            <div
              className="w-screen max-w-md bg-white shadow-2xl flex flex-col h-full border-l border-slate-200 pointer-events-auto animate-in slide-in-from-right duration-200 overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drawer Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5E4BE2] shrink-0">
                    <IconCalendarEvent className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-[#5E4BE2] uppercase tracking-wider">
                      Cycle Configuration
                    </span>
                    <h2 className="text-base font-bold text-slate-900 mt-0.5">
                      {modalType === 'PERFORMANCE'
                        ? editingId
                          ? 'Configure Appraisal Cycle'
                          : 'New Performance Appraisal Cycle'
                        : editingId
                        ? 'Configure Payroll Schedule'
                        : 'New Payroll Schedule'}
                    </h2>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <IconX className="w-5 h-5" />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleCreateOrUpdate} className="p-6 space-y-5 flex-1 flex flex-col justify-between">
                <div className="space-y-4">
                  {error && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex items-center gap-2">
                      <IconAlertCircle className="w-4 h-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  {modalType === 'PERFORMANCE' ? (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Cycle Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={perfForm.name}
                          onChange={(e) => setPerfForm({ ...perfForm, name: e.target.value })}
                          placeholder="e.g. Q3 2026 OKR Review Cycle"
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-hidden focus:border-[#5E4BE2] transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">Description</label>
                        <input
                          type="text"
                          value={perfForm.description}
                          onChange={(e) => setPerfForm({ ...perfForm, description: e.target.value })}
                          placeholder="e.g. Quarterly milestone targets for engineering & product"
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-hidden focus:border-[#5E4BE2] transition-colors"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                            Start Date <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="date"
                            required
                            value={perfForm.startDate}
                            onChange={(e) => setPerfForm({ ...perfForm, startDate: e.target.value })}
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-hidden focus:border-[#5E4BE2] transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                            End Date <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="date"
                            required
                            value={perfForm.endDate}
                            onChange={(e) => setPerfForm({ ...perfForm, endDate: e.target.value })}
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-hidden focus:border-[#5E4BE2] transition-colors"
                          />
                        </div>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <label className="flex items-center gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={perfForm.isActive}
                            onChange={(e) => setPerfForm({ ...perfForm, isActive: e.target.checked })}
                            className="w-4 h-4 text-[#5E4BE2] rounded-sm border-slate-300 focus:ring-[#5E4BE2]"
                          />
                          <span className="text-xs font-semibold text-slate-800">
                            Active Cycle (Visible to employees for OKR submission)
                          </span>
                        </label>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Payroll Run Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={payrollForm.name}
                          onChange={(e) => setPayrollForm({ ...payrollForm, name: e.target.value })}
                          placeholder="e.g. Regular Salaried Payroll Run"
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-hidden focus:border-[#5E4BE2] transition-colors"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                            Cutoff Day (1-31) <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="31"
                            required
                            value={payrollForm.cutoffDay}
                            onChange={(e) => setPayrollForm({ ...payrollForm, cutoffDay: Number(e.target.value) })}
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-hidden focus:border-[#5E4BE2] transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                            Pay Day (1-31) <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="31"
                            required
                            value={payrollForm.payDay}
                            onChange={(e) => setPayrollForm({ ...payrollForm, payDay: Number(e.target.value) })}
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-hidden focus:border-[#5E4BE2] transition-colors"
                          />
                        </div>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                        <label className="flex items-center gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={payrollForm.freezeAttendance}
                            onChange={(e) => setPayrollForm({ ...payrollForm, freezeAttendance: e.target.checked })}
                            className="w-4 h-4 text-[#5E4BE2] rounded-sm border-slate-300 focus:ring-[#5E4BE2]"
                          />
                          <span className="text-xs font-semibold text-slate-800">
                            Auto-Freeze attendance on cutoff day
                          </span>
                        </label>

                        <label className="flex items-center gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={payrollForm.isActive}
                            onChange={(e) => setPayrollForm({ ...payrollForm, isActive: e.target.checked })}
                            className="w-4 h-4 text-[#5E4BE2] rounded-sm border-slate-300 focus:ring-[#5E4BE2]"
                          />
                          <span className="text-xs font-semibold text-slate-800">
                            Set as active primary payroll cycle
                          </span>
                        </label>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-[#5E4BE2] to-[#4B39C3] hover:from-[#5340D4] hover:to-[#4130B4] disabled:opacity-50 shadow-xs cursor-pointer transition-all"
                  >
                    {isSubmitting ? 'Saving...' : editingId ? 'Update Cycle' : 'Save Cycle'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ManageCyclesPage;
