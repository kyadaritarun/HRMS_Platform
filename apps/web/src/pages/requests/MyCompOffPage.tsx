import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '../../api/client';
import {
  IconCalendar,
  IconPlus,
  IconX,
  IconSearch,
  IconChevronDown,
  IconAlertCircle,
  IconClock,
  IconFileText,
  IconCheck,
} from '@tabler/icons-react';

interface CompOffRequest {
  id: number;
  type: string;
  title: string;
  reason: string;
  status: string;
  startDate?: string;
  days?: number;
  createdAt: string;
  meta?: any;
  approver?: { firstName: string; lastName: string };
}

interface Holiday {
  id: number;
  name: string;
  date: string;
}

export const MyCompOffPage: React.FC = () => {
  const [requests, setRequests] = useState<CompOffRequest[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Search and Filter
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');

  // Form state
  const [selectedHolidayId, setSelectedHolidayId] = useState<string>('');
  const [days, setDays] = useState<number>(1);
  const [reason, setReason] = useState<string>('');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [reqRes, holRes] = await Promise.all([
        api.get('/requests?type=COMP_OFF&scope=mine'),
        api.get('/company/holidays').catch(() => ({ data: { holidays: [] } })),
      ]);
      setRequests(reqRes.data?.items || []);
      const fetchedHolidays = holRes.data?.holidays || [];

      if (fetchedHolidays.length === 0) {
        setHolidays([
          { id: 101, name: 'Republic Day', date: '2026-01-26' },
          { id: 102, name: 'Holi', date: '2026-03-04' },
          { id: 103, name: 'Good Friday', date: '2026-04-03' },
          { id: 104, name: 'Labor Day', date: '2026-05-01' },
          { id: 105, name: 'Independence Day', date: '2026-08-15' },
          { id: 106, name: 'Gandhi Jayanti', date: '2026-10-02' },
          { id: 107, name: 'Diwali', date: '2026-11-08' },
          { id: 108, name: 'Christmas', date: '2026-12-25' },
        ]);
      } else {
        setHolidays(fetchedHolidays);
      }
    } catch (err) {
      console.error('Failed to load comp off data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const selectedHoliday = holidays.find((h) => String(h.id) === selectedHolidayId);
    if (!selectedHoliday) {
      setError('Please select a holiday for comp off.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/requests', {
        type: 'COMP_OFF',
        title: `Comp Off Request — ${selectedHoliday.name}`,
        reason: reason.trim() || `Worked on holiday: ${selectedHoliday.name}`,
        startDate: selectedHoliday.date,
        days: Number(days) || 1,
        meta: {
          holidayId: selectedHoliday.id,
          holidayName: selectedHoliday.name,
          holidayDate: selectedHoliday.date,
          note: reason.trim(),
        },
      });

      setSelectedHolidayId('');
      setDays(1);
      setReason('');
      setIsModalOpen(false);
      setSuccessMsg('Comp off request submitted successfully to your manager!');
      fetchData();
    } catch (err: any) {
      setError(
        err.response?.data?.message || err.response?.data?.error || 'Failed to submit comp off request'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async (id: number) => {
    if (!window.confirm('Cancel this pending comp off request?')) return;
    try {
      await api.patch(`/requests/${id}/cancel`);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to cancel request');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Approved
          </span>
        );
      case 'REJECTED':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            Rejected
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            Pending
          </span>
        );
    }
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || 'M';
  };

  const filteredRequests = requests.filter((r) => {
    const holidayName = (
      r.meta?.holidayName ||
      (r.title ? r.title.replace('Comp Off Request — ', '') : 'Holiday')
    ).toLowerCase();
    const approverName = r.approver
      ? `${r.approver.firstName} ${r.approver.lastName}`.toLowerCase()
      : 'reporting manager';
    const note = (r.reason || '').toLowerCase();
    const q = search.toLowerCase().trim();

    const matchesSearch = !q || holidayName.includes(q) || approverName.includes(q) || note.includes(q);
    if (statusFilter === 'ALL') return matchesSearch;
    return matchesSearch && r.status === statusFilter;
  });

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <IconCalendar className="w-7 h-7 text-[#5E4BE2]" />
            Comp Off
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Apply for compensatory off days worked on public or company holidays.
          </p>
        </div>

        <button
          onClick={() => {
            setError(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#5E4BE2] to-[#4B39C3] hover:from-[#5340D4] hover:to-[#4130B4] text-white font-bold text-sm shadow-sm transition-all cursor-pointer active:scale-95"
        >
          <IconPlus className="w-4 h-4" />
          Request Comp Off
        </button>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between">
          <span>{successMsg}</span>
          <button
            type="button"
            onClick={() => setSuccessMsg(null)}
            className="text-emerald-600 hover:text-emerald-800 cursor-pointer p-0.5"
          >
            <IconX className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Table Container Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden space-y-4 p-5">
        {/* Search & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <IconSearch className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by holiday, approver, or note..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#5E4BE2] text-slate-800 placeholder-slate-400"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <IconX className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center bg-slate-50 border border-slate-200 p-1 rounded-xl shrink-0">
            {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === tab
                    ? 'bg-white text-[#5E4BE2] shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab === 'ALL'
                  ? 'All Status'
                  : tab.charAt(0) + tab.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto -mx-5 -mb-5">
          <table className="w-full min-w-[850px] text-left text-xs">
            <thead className="bg-[#e5e7eb] text-xs font-bold text-slate-900 border-b border-slate-300">
              <tr>
                <th className="px-5 py-3.5 whitespace-nowrap">Holiday Worked</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Date</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Days</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Status</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Approver</th>
                <th className="px-5 py-3.5">Reason / Note</th>
                <th className="px-5 py-3.5 text-right whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-5 py-4">
                      <div className="w-28 h-4 bg-slate-200 rounded" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="w-20 h-4 bg-slate-100 rounded" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="w-12 h-4 bg-slate-100 rounded" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="w-16 h-5 bg-slate-100 rounded-full" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="w-24 h-4 bg-slate-100 rounded" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="w-36 h-4 bg-slate-100 rounded" />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="w-12 h-4 bg-slate-100 rounded ml-auto" />
                    </td>
                  </tr>
                ))
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-[#5E4BE2] flex items-center justify-center mx-auto mb-3">
                      <IconCalendar className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold text-slate-700">No comp off requests found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {search || statusFilter !== 'ALL'
                        ? 'Try adjusting your search query or status filter.'
                        : 'Click "Request Comp Off" above to submit compensatory off days.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredRequests.map((r) => {
                  const holidayName =
                    r.meta?.holidayName ||
                    (r.title ? r.title.replace('Comp Off Request — ', '') : 'Holiday');
                  const holidayDate = r.startDate
                    ? new Date(r.startDate).toLocaleDateString()
                    : new Date(r.createdAt).toLocaleDateString();

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Holiday */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 text-[#5E4BE2] flex items-center justify-center shrink-0">
                            <IconCalendar className="w-4 h-4" />
                          </div>
                          <span className="font-bold text-slate-900 text-xs">{holidayName}</span>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="text-xs font-mono text-slate-600">{holidayDate}</span>
                      </td>

                      {/* Days */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {r.days || 1} day{(r.days || 1) > 1 ? 's' : ''}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        {getStatusBadge(r.status)}
                      </td>

                      {/* Approver */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 font-semibold flex items-center justify-center text-[10px] shrink-0">
                            {r.approver
                              ? getInitials(r.approver.firstName, r.approver.lastName)
                              : 'M'}
                          </div>
                          <span className="text-xs text-slate-700 font-medium">
                            {r.approver
                              ? `${r.approver.firstName} ${r.approver.lastName}`
                              : 'Reporting Manager'}
                          </span>
                        </div>
                      </td>

                      {/* Reason / Note */}
                      <td className="px-5 py-4">
                        <p className="text-xs text-slate-600 max-w-sm truncate">
                          {r.reason || '—'}
                        </p>
                      </td>

                      {/* Action */}
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        {r.status === 'PENDING' ? (
                          <button
                            type="button"
                            onClick={() => handleCancel(r.id)}
                            className="px-2.5 py-1 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Request Comp Off Right-Side Slide-Over Drawer */}
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
                    <IconCalendar className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-[#5E4BE2] uppercase tracking-wider">
                      Compensatory Off
                    </span>
                    <h2 className="text-base font-bold text-slate-900 mt-0.5">
                      Request Comp Off
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
              <form onSubmit={handleSubmit} className="p-6 space-y-5 flex-1 flex flex-col justify-between">
                <div className="space-y-4">
                  {error && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                      <IconAlertCircle className="w-4 h-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Holiday selection */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Holiday Worked <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        required
                        value={selectedHolidayId}
                        onChange={(e) => setSelectedHolidayId(e.target.value)}
                        className="w-full pl-3.5 pr-8 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-[#5E4BE2] font-semibold text-slate-800 transition-colors appearance-none cursor-pointer"
                      >
                        <option value="">Select holiday worked...</option>
                        {holidays.map((h) => (
                          <option key={h.id} value={h.id}>
                            {h.name} ({h.date ? new Date(h.date).toLocaleDateString() : 'Holiday'})
                          </option>
                        ))}
                      </select>
                      <IconChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  {/* Days */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Days <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min={0.5}
                      max={10}
                      step={0.5}
                      required
                      value={days}
                      onChange={(e) => setDays(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-[#5E4BE2] font-semibold text-slate-800 transition-colors"
                    />
                  </div>

                  {/* Reason / Note */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Reason / Work Note
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Briefly describe the work delivered on this holiday..."
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-[#5E4BE2] text-slate-800 placeholder-slate-400 resize-none transition-colors"
                    />
                  </div>

                  <div className="bg-indigo-50/60 border border-indigo-100/80 rounded-xl p-3 text-[11px] text-slate-600 space-y-1">
                    <p className="font-bold text-[#5E4BE2]">Approval Process:</p>
                    <p>Your request will be routed directly to your reporting manager for approval.</p>
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
                    className="px-5 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-[#5E4BE2] to-[#4B39C3] hover:from-[#5340D4] hover:to-[#4130B4] text-white shadow-xs disabled:opacity-50 cursor-pointer transition-all"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Request'}
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

export default MyCompOffPage;
