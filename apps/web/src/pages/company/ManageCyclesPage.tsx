import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '../../api/client';
import {
  IconCalendarEvent,
  IconPlus,
  IconCheck,
  IconX,
  IconAlertCircle,
  IconTarget,
  IconCalendar,
  IconSearch,
  IconEye,
  IconTrash,
  IconLoader2,
  IconAlertTriangle,
} from '@tabler/icons-react';

interface PerformanceCycle {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export const ManageCyclesPage: React.FC = () => {
  const [perfCycles, setPerfCycles] = useState<PerformanceCycle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Drawer / Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [perfForm, setPerfForm] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    isActive: true,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Deletion state
  const [cycleToDelete, setCycleToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchCycles = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/company/cycles');
      setPerfCycles(res.data?.performanceCycles || []);
    } catch (err) {
      console.error('Failed to load cycles:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCycles();
  }, []);

  const handleDeleteCycle = async () => {
    if (!cycleToDelete) return;
    setIsDeleting(true);
    try {
      await api.delete(`/company/cycles/${cycleToDelete.id}?type=performance`);
      setCycleToDelete(null);
      fetchCycles();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete cycle');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      if (!perfForm.name || !perfForm.startDate || !perfForm.endDate) {
        setError('Name, start date, and end date are required');
        setIsSubmitting(false);
        return;
      }
      await api.post('/company/cycles', {
        type: 'performance',
        cycle: { ...perfForm, id: editingId || undefined },
      });
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <IconCalendarEvent className="w-5 h-5 text-indigo-600 shrink-0" />
            <span>Manage Cycles</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Configure appraisal evaluation periods and OKR submission windows.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingId(null);
            setError(null);
            setPerfForm({ name: '', description: '', startDate: '', endDate: '', isActive: true });
            setIsModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#5E4BE2] hover:bg-[#4D3BC9] text-white font-bold text-xs shadow-xs transition-colors cursor-pointer shrink-0"
        >
          <IconPlus className="w-4 h-4" />
          <span>Add Appraisal Cycle</span>
        </button>
      </div>

      {/* Main Table Container Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden space-y-4 p-5">
        {/* Search Toolbar */}
        <div className="flex items-center justify-start">
          {/* Search Input on the Left */}
          <div className="relative w-full max-w-xs sm:max-w-sm">
            <IconSearch className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium pointer-events-none" />
            <input
              type="text"
              placeholder="Search cycles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50/70 border border-slate-200/90 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5E4BE2]/20 focus:border-[#5E4BE2] text-slate-800 placeholder-slate-400 transition-all"
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
            <div className="p-12 text-center text-slate-500 font-medium">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-[#5E4BE2] border-t-transparent mb-2" />
              <p className="text-xs font-medium">Loading operational cycles...</p>
            </div>
          ) : filteredPerfCycles.length === 0 ? (
            <div className="py-16 text-center text-slate-500 font-medium">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-[#5E4BE2] flex items-center justify-center mx-auto mb-3">
                <IconTarget className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-slate-700">No Performance Cycles Found</h4>
              <p className="text-xs text-slate-500 font-medium mt-1 max-w-sm mx-auto">
                {searchQuery
                  ? 'No cycles match your search query.'
                  : 'Get started by creating an appraisal cycle for quarterly or annual reviews.'}
              </p>
              <button
                onClick={() => {
                  setEditingId(null);
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
            <table className="w-full min-w-[700px] text-left text-xs">
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
                    {/* Name */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5E4BE2] shrink-0">
                          <IconTarget className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 block text-xs">
                            {cycle.name}
                          </span>
                          <span className="text-[11px] text-slate-500 font-normal block mt-0.5">
                            {cycle.description || 'Appraisal evaluation and review window'}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Window */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <IconCalendar className="w-4 h-4 text-slate-500 font-medium" />
                        <div>
                          <span className="font-semibold text-slate-800 text-xs block">
                            {cycle.startDate ? new Date(cycle.startDate).toLocaleDateString() : 'N/A'} —{' '}
                            {cycle.endDate ? new Date(cycle.endDate).toLocaleDateString() : 'N/A'}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium block">
                            Appraisal timeframe
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Duration */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="px-3 py-1 rounded-full bg-slate-100 font-semibold text-slate-800 text-xs border border-slate-200/80">
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
                      <div className="flex items-center justify-end gap-1.5">
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
                            setError(null);
                            setIsModalOpen(true);
                          }}
                          title="View &amp; Configure Cycle"
                          className="w-8 h-8 rounded-lg border border-indigo-200/80 bg-white hover:bg-indigo-50 text-[#5E4BE2] flex items-center justify-center shadow-2xs transition-all cursor-pointer"
                        >
                          <IconEye className="w-4 h-4 stroke-[1.8]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setCycleToDelete({ id: cycle.id, name: cycle.name })}
                          title="Delete Cycle"
                          className="w-8 h-8 rounded-lg border border-rose-200/80 bg-white hover:bg-rose-50 text-rose-600 flex items-center justify-center shadow-2xs transition-all cursor-pointer"
                        >
                          <IconTrash className="w-4 h-4 stroke-[1.8]" />
                        </button>
                      </div>
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

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col justify-between border-l border-slate-200 animate-in slide-in-from-right duration-200">
              {/* Drawer Header */}
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 text-[#5E4BE2] flex items-center justify-center shrink-0">
                    <IconTarget className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold tracking-wider uppercase text-slate-500">
                      Cycle Configuration
                    </span>
                    <h2 className="text-base font-bold text-slate-900 mt-0.5">
                      {editingId ? 'Configure Appraisal Cycle' : 'New Performance Appraisal Cycle'}
                    </h2>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-500 font-medium hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
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

      {/* Delete Confirmation Modal */}
      {cycleToDelete &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div
              className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4 border border-rose-100">
                  <IconAlertTriangle className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">Delete Cycle</h3>
                <p className="text-xs text-slate-600 font-medium mt-1.5 leading-relaxed">
                  Are you sure you want to delete <strong className="text-slate-900">{cycleToDelete.name}</strong>? This action cannot be undone.
                </p>

                <div className="flex items-center justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setCycleToDelete(null)}
                    disabled={isDeleting}
                    className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200/90 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteCycle}
                    disabled={isDeleting}
                    className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isDeleting && <IconLoader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Delete Cycle</span>
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default ManageCyclesPage;
