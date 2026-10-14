import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import {
  IconFileText,
  IconClock,
  IconCalendar,
  IconSend,
  IconFilter,
  IconChevronDown,
  IconAlertCircle,
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Status Filter
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);

  // Form state: Holiday, Days (default 1), Reason
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

      // If no holidays configured in the system yet, provide standard holiday options
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
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Approved
          </span>
        );
      case 'REJECTED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            Rejected
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            Pending
          </span>
        );
    }
  };

  const filteredRequests = requests.filter((r) => {
    if (statusFilter === 'ALL') return true;
    return r.status === statusFilter;
  });

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-10">
      {/* Top Card: Request Comp Off */}
      <div className="bg-white rounded-2xl border border-slate-200/70 p-6 shadow-xs">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-[#eeeffd] text-[#5452f6] flex items-center justify-center shrink-0 shadow-2xs">
            <IconFileText className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-slate-900">Request Comp Off</h2>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm flex items-center gap-2">
            <IconAlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 mb-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs sm:text-sm">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
            {/* Field 1: Holiday */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Holiday</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#5452f6]">
                  <IconCalendar className="w-4 h-4" />
                </div>
                <select
                  required
                  value={selectedHolidayId}
                  onChange={(e) => setSelectedHolidayId(e.target.value)}
                  className="w-full pl-9 pr-9 py-2.5 text-xs sm:text-sm bg-white border border-slate-200/90 rounded-xl text-slate-700 appearance-none focus:outline-hidden focus:border-[#5452f6] focus:ring-1 focus:ring-[#5452f6]/20 transition-all cursor-pointer"
                >
                  <option value="">Select holiday</option>
                  {holidays.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                  <IconChevronDown className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Field 2: Days */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Days</label>
              <input
                type="number"
                min={1}
                max={10}
                required
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-200/90 rounded-xl text-slate-700 focus:outline-hidden focus:border-[#5452f6] focus:ring-1 focus:ring-[#5452f6]/20 transition-all"
              />
            </div>

            {/* Field 3: Reason */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Reason</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <IconFileText className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  placeholder="Add a note (optional)"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-200/90 rounded-xl text-slate-700 placeholder:text-slate-400 focus:outline-hidden focus:border-[#5452f6] focus:ring-1 focus:ring-[#5452f6]/20 transition-all"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2.5 bg-[#5452f6] hover:bg-[#4338ca] text-white text-xs sm:text-sm font-semibold rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
          >
            <IconSend className="w-4 h-4" />
            <span>{isSubmitting ? 'Submitting...' : 'Submit Request'}</span>
          </button>
        </form>
      </div>

      {/* Bottom Card: My Comp Off Requests */}
      <div className="bg-white rounded-2xl border border-slate-200/70 shadow-xs overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#eeeffd] text-[#5452f6] flex items-center justify-center shrink-0 shadow-2xs">
              <IconClock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">My Comp Off Requests</h2>
              <p className="text-xs text-slate-500 mt-0.5">Track approvals and history.</p>
            </div>
          </div>

          {/* Status Filter Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-2xs cursor-pointer transition-colors"
            >
              <IconFilter className="w-3.5 h-3.5 text-slate-500" />
              <span>{statusFilter === 'ALL' ? 'All Status' : statusFilter}</span>
              <IconChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {isStatusDropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-36 bg-white rounded-xl shadow-lg border border-slate-100 py-1 z-30 animate-in fade-in zoom-in-95 duration-100">
                {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => {
                      setStatusFilter(st);
                      setIsStatusDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-xs font-medium transition-colors ${
                      statusFilter === st
                        ? 'bg-indigo-50 text-[#5452f6] font-semibold'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {st === 'ALL' ? 'All Status' : st}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/70 text-[11px] font-bold text-slate-400 tracking-wider uppercase border-b border-slate-100">
              <tr>
                <th className="px-6 py-3.5">HOLIDAY</th>
                <th className="px-6 py-3.5">DATE</th>
                <th className="px-6 py-3.5">DAYS</th>
                <th className="px-6 py-3.5">STATUS</th>
                <th className="px-6 py-3.5">APPROVER</th>
                <th className="px-6 py-3.5">NOTE</th>
                <th className="px-6 py-3.5 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                Array.from({ length: 2 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4">
                      <div className="w-24 h-4 bg-slate-200 rounded-sm" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-20 h-4 bg-slate-200 rounded-sm" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-12 h-4 bg-slate-200 rounded-sm" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-16 h-4 bg-slate-200 rounded-sm" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-24 h-4 bg-slate-200 rounded-sm" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-32 h-4 bg-slate-200 rounded-sm" />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="w-12 h-4 bg-slate-200 rounded-sm ml-auto" />
                    </td>
                  </tr>
                ))
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-14 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-[#eeeffd] text-[#5452f6] flex items-center justify-center mx-auto mb-3 shadow-2xs">
                      <IconCalendar className="w-7 h-7" />
                    </div>
                    <p className="text-sm font-bold text-slate-800">No comp off requests yet.</p>
                    <p className="text-xs text-slate-400 mt-1">Submit a request using the form above.</p>
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
                      <td className="px-6 py-4 font-semibold text-slate-900">{holidayName}</td>
                      <td className="px-6 py-4 text-xs font-mono text-slate-700">{holidayDate}</td>
                      <td className="px-6 py-4 font-bold text-slate-900">{r.days || 1} d</td>
                      <td className="px-6 py-4">{getStatusBadge(r.status)}</td>
                      <td className="px-6 py-4 text-xs text-slate-600">
                        {r.approver
                          ? `${r.approver.firstName} ${r.approver.lastName}`
                          : 'Reporting Manager'}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 max-w-xs truncate">
                        {r.reason || '—'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {r.status === 'PENDING' ? (
                          <button
                            onClick={() => handleCancel(r.id)}
                            className="px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
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
    </div>
  );
};

export default MyCompOffPage;
