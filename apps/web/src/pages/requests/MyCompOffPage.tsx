import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import api from '../../api/client';
import TablePagination from '../../components/common/TablePagination';
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
  IconPaperclip,
  IconExternalLink,
  IconEye,
  IconBriefcase,
  IconSun,
  IconDownload,
} from '@tabler/icons-react';

interface CompOffRequest {
  id: number;
  type: string;
  title: string;
  reason: string;
  status: string;
  startDate?: string;
  endDate?: string;
  days?: number;
  createdAt: string;
  meta?: {
    workType?: 'WEEKEND' | 'HOLIDAY';
    workedDate?: string;
    holidayId?: number | string;
    holidayName?: string;
    dayOfWeek?: string;
    attachmentUrl?: string;
    attachmentName?: string;
    note?: string;
  };
  approver?: { firstName: string; lastName: string };
  decisionNote?: string;
}

interface Holiday {
  id: number;
  name: string;
  date: string;
}

export const MyCompOffPage: React.FC = () => {
  const [requests, setRequests] = useState<CompOffRequest[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [compOffBalance, setCompOffBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewReq, setViewReq] = useState<CompOffRequest | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Search and Filter
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'WEEKEND' | 'HOLIDAY'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Form state
  const [workType, setWorkType] = useState<'WEEKEND' | 'HOLIDAY'>('WEEKEND');
  const [workedDate, setWorkedDate] = useState<string>(() => {
    // Default to last Saturday or today
    const d = new Date();
    const day = d.getDay(); // 0 is Sunday, 6 is Saturday
    if (day === 0) {
      // It's Sunday: use today
      return d.toISOString().split('T')[0];
    } else if (day === 6) {
      // It's Saturday: use today
      return d.toISOString().split('T')[0];
    }
    // Else last Saturday
    d.setDate(d.getDate() - (day + 1));
    return d.toISOString().split('T')[0];
  });
  const [selectedHolidayId, setSelectedHolidayId] = useState<string>('');
  const [customHolidayName, setCustomHolidayName] = useState<string>('');
  const [isCustomHoliday, setIsCustomHoliday] = useState<boolean>(false);
  const [days, setDays] = useState<number>(1);
  const [reason, setReason] = useState<string>('');
  const [attachmentUrl, setAttachmentUrl] = useState<string>('');
  const [attachmentName, setAttachmentName] = useState<string>('');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [reqRes, holRes, typesRes] = await Promise.all([
        api.get('/requests?type=COMP_OFF&scope=mine&pageSize=100'),
        api.get('/company/holidays').catch(() => ({ data: { holidays: [] } })),
        api.get('/company/leave-types').catch(() => ({ data: { leaveTypes: [] } })),
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

      // Check comp off balance
      const ltList = typesRes.data?.leaveTypes || [];
      const compOffType = ltList.find((lt: any) => lt.isCompOff || lt.code?.toUpperCase() === 'CO');
      if (compOffType && compOffType.balance !== undefined) {
        setCompOffBalance(Number(compOffType.balance));
      } else {
        // Fallback: sum of approved comp-off requests
        const approvedDays = (reqRes.data?.items || [])
          .filter((r: any) => r.status === 'APPROVED')
          .reduce((sum: number, r: any) => sum + Number(r.days || 1), 0);
        setCompOffBalance(approvedDays);
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

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, typeFilter]);

  // Compute day of week for selected workedDate
  const getDayInfo = (dateStr: string) => {
    if (!dateStr) return { dayName: '', isWeekend: false };
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    const dayIndex = date.getUTCDay();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const isWeekend = dayIndex === 0 || dayIndex === 6;
    return { dayName: days[dayIndex], isWeekend };
  };

  const handleOpenModal = () => {
    setError(null);
    setWorkType('WEEKEND');
    setDays(1);
    setReason('');
    setSelectedHolidayId('');
    setCustomHolidayName('');
    setIsCustomHoliday(false);
    setAttachmentUrl('');
    setAttachmentName('');
    setIsModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setAttachmentUrl(reader.result as string);
      setAttachmentName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    let effectiveDate = workedDate;
    let occasionTitle = '';
    let holidayNameStr = '';

    if (workType === 'WEEKEND') {
      if (!workedDate) {
        setError('Please select the weekend date you worked.');
        return;
      }
      const { dayName } = getDayInfo(workedDate);
      occasionTitle = `Weekend Work (${dayName}, ${workedDate})`;
    } else {
      // Holiday
      if (isCustomHoliday) {
        if (!customHolidayName.trim()) {
          setError('Please enter the holiday name.');
          return;
        }
        if (!workedDate) {
          setError('Please select the holiday date.');
          return;
        }
        holidayNameStr = customHolidayName.trim();
        occasionTitle = `Holiday Work — ${holidayNameStr}`;
      } else {
        const selectedHoliday = holidays.find((h) => String(h.id) === selectedHolidayId);
        if (!selectedHoliday) {
          setError('Please select a recognized holiday or enter a custom holiday.');
          return;
        }
        effectiveDate = selectedHoliday.date;
        holidayNameStr = selectedHoliday.name;
        occasionTitle = `Holiday Work — ${holidayNameStr}`;
      }
    }

    if (!reason.trim()) {
      setError('Please provide a brief description of the work delivered.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { dayName } = getDayInfo(effectiveDate);

      await api.post('/requests', {
        type: 'COMP_OFF',
        title: `Comp Off Request — ${occasionTitle}`,
        reason: reason.trim(),
        startDate: effectiveDate,
        days: Number(days) || 1,
        meta: {
          workType,
          workedDate: effectiveDate,
          dayOfWeek: dayName,
          holidayId: !isCustomHoliday && workType === 'HOLIDAY' ? selectedHolidayId : undefined,
          holidayName: holidayNameStr || undefined,
          attachmentUrl: attachmentUrl || undefined,
          attachmentName: attachmentName || undefined,
          note: reason.trim(),
        },
      });

      setIsModalOpen(false);
      setSuccessMsg(`Comp off request submitted for ${occasionTitle}! Routed to your manager.`);
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
      case 'CANCELLED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            Cancelled
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

  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || 'M';
  };

  const formatDateDisplay = (dateStr?: string) => {
    if (!dateStr) return '—';
    const [y, m, d] = dateStr.split('T')[0].split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    const month = date.toLocaleString('en-US', { month: 'short' });
    const day = date.getUTCDate();
    const year = date.getUTCFullYear();
    const dayName = date.toLocaleString('en-US', { weekday: 'short' });
    return `${month} ${day}, ${year} (${dayName})`;
  };

  // Metrics summary
  const approvedTotalDays = useMemo(() => {
    return requests
      .filter((r) => r.status === 'APPROVED')
      .reduce((sum, r) => sum + Number(r.days || 1), 0);
  }, [requests]);

  const pendingCount = useMemo(() => {
    return requests.filter((r) => r.status === 'PENDING').length;
  }, [requests]);

  const weekendCount = useMemo(() => {
    return requests.filter((r) => r.meta?.workType === 'WEEKEND' || r.title?.toLowerCase().includes('weekend')).length;
  }, [requests]);

  // Filter requests
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      const occasionName = (
        r.meta?.holidayName ||
        (r.title ? r.title.replace('Comp Off Request — ', '') : 'Comp Off')
      ).toLowerCase();
      const approverName = r.approver
        ? `${r.approver.firstName} ${r.approver.lastName}`.toLowerCase()
        : 'reporting manager';
      const note = (r.reason || '').toLowerCase();
      const q = search.toLowerCase().trim();

      const matchesSearch = !q || occasionName.includes(q) || approverName.includes(q) || note.includes(q);
      const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;

      const isWeekendReq = r.meta?.workType === 'WEEKEND' || r.title?.toLowerCase().includes('weekend');
      const matchesType =
        typeFilter === 'ALL' ||
        (typeFilter === 'WEEKEND' && isWeekendReq) ||
        (typeFilter === 'HOLIDAY' && !isWeekendReq);

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [requests, search, statusFilter, typeFilter]);

  const paginatedRequests = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRequests.slice(start, start + pageSize);
  }, [filteredRequests, currentPage, pageSize]);

  return (
    <div className="space-y-6 pb-10">
      {/* ===================== TOP HEADER BAR ===================== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <IconCalendar className="w-5 h-5 text-indigo-600 shrink-0" />
            <span>Comp Off</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Claim compensatory off days for working on weekends or recognized holidays.
          </p>
        </div>

        <button
          onClick={handleOpenModal}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-[#5E4BE2] hover:bg-[#4D3BC9] text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
        >
          <IconPlus className="w-4 h-4" />
          <span>Request Comp Off</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IconCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMsg(null)}
            className="text-emerald-600 hover:text-emerald-800 cursor-pointer p-0.5"
          >
            <IconX className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ===================== STATS METRIC CARDS ===================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Available Comp-Off Balance */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5E4BE2]">
                <IconClock className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-700">Available Balance</span>
            </div>
            <span className="text-xl font-black text-indigo-700 leading-none">
              {compOffBalance}
              <span className="text-xs font-semibold text-slate-400 ml-1">days</span>
            </span>
          </div>
          <div className="mt-3 text-[11px] text-slate-400 font-medium">
            Ready to be redeemed in My Leaves
          </div>
        </div>

        {/* Approved Days Earned */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                <IconCheck className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-700">Total Earned</span>
            </div>
            <span className="text-xl font-black text-emerald-700 leading-none">
              {approvedTotalDays}
              <span className="text-xs font-semibold text-slate-400 ml-1">days</span>
            </span>
          </div>
          <div className="mt-3 text-[11px] text-slate-400 font-medium">
            Approved by manager/HR
          </div>
        </div>

        {/* Pending Approval */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                <IconAlertCircle className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-700">Pending Review</span>
            </div>
            <span className="text-xl font-black text-amber-700 leading-none">
              {pendingCount}
              <span className="text-xs font-semibold text-slate-400 ml-1">req</span>
            </span>
          </div>
          <div className="mt-3 text-[11px] text-slate-400 font-medium">
            Awaiting manager action
          </div>
        </div>

        {/* Weekend Work Count */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                <IconBriefcase className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-700">Weekend Claims</span>
            </div>
            <span className="text-xl font-black text-blue-700 leading-none">
              {weekendCount}
              <span className="text-xs font-semibold text-slate-400 ml-1">req</span>
            </span>
          </div>
          <div className="mt-3 text-[11px] text-slate-400 font-medium">
            Saturday / Sunday shifts
          </div>
        </div>
      </div>

      {/* ===================== MAIN TABLE CARD ===================== */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Search & Filter Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center flex-1 max-w-xl">
            {/* Search Input */}
            <div className="relative flex-1">
              <IconSearch className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by occasion, reason, or approver..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-[#5E4BE2] text-slate-800 placeholder-slate-400"
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

            {/* Occasion Type Filter */}
            <div className="flex items-center bg-slate-50 border border-slate-200 p-1 rounded-xl shrink-0">
              <button
                onClick={() => setTypeFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  typeFilter === 'ALL'
                    ? 'bg-white text-[#5E4BE2] shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setTypeFilter('WEEKEND')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  typeFilter === 'WEEKEND'
                    ? 'bg-white text-[#5E4BE2] shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Weekend
              </button>
              <button
                onClick={() => setTypeFilter('HOLIDAY')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  typeFilter === 'HOLIDAY'
                    ? 'bg-white text-[#5E4BE2] shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Holiday
              </button>
            </div>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center bg-slate-50 border border-slate-200 p-1 rounded-xl shrink-0">
            {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  statusFilter === tab
                    ? 'bg-white text-[#5E4BE2] shadow-2xs font-bold'
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
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-[#e5e7eb] text-xs font-bold text-slate-900 border-b border-slate-300">
              <tr>
                <th className="px-6 py-3.5 whitespace-nowrap">Work Occasion</th>
                <th className="px-6 py-3.5 whitespace-nowrap">Date Worked</th>
                <th className="px-6 py-3.5 whitespace-nowrap">Days Credit</th>
                <th className="px-6 py-3.5 whitespace-nowrap">Status</th>
                <th className="px-6 py-3.5 whitespace-nowrap">Approver Name</th>
                <th className="px-6 py-3.5">Reason / Deliverables</th>
                <th className="px-6 py-3.5 text-right whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="w-32 h-4 bg-slate-200 rounded" /></td>
                    <td className="px-6 py-4"><div className="w-24 h-4 bg-slate-100 rounded" /></td>
                    <td className="px-6 py-4"><div className="w-16 h-4 bg-slate-100 rounded" /></td>
                    <td className="px-6 py-4"><div className="w-16 h-5 bg-slate-100 rounded-full" /></td>
                    <td className="px-6 py-4"><div className="w-24 h-4 bg-slate-100 rounded" /></td>
                    <td className="px-6 py-4"><div className="w-36 h-4 bg-slate-100 rounded" /></td>
                    <td className="px-6 py-4 text-right"><div className="w-12 h-4 bg-slate-100 rounded ml-auto" /></td>
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
                      {search || statusFilter !== 'ALL' || typeFilter !== 'ALL'
                        ? 'Try adjusting your search query or filters.'
                        : 'Click "Request Comp Off" above to submit hours worked on a weekend or holiday.'}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedRequests.map((r) => {
                  const isWeekend =
                    r.meta?.workType === 'WEEKEND' ||
                    r.title?.toLowerCase().includes('weekend');
                  const occasionName =
                    r.meta?.holidayName ||
                    (r.title ? r.title.replace('Comp Off Request — ', '') : (isWeekend ? 'Weekend Work' : 'Holiday Work'));

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Occasion / Type */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                              isWeekend
                                ? 'bg-blue-50 border border-blue-100 text-blue-600'
                                : 'bg-amber-50 border border-amber-100 text-amber-600'
                            }`}
                          >
                            {isWeekend ? (
                              <IconBriefcase className="w-4 h-4" />
                            ) : (
                              <IconSun className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900 text-xs">
                                {isWeekend ? 'Weekend Work' : occasionName}
                              </span>
                              {r.meta?.attachmentUrl && (
                                <span
                                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-indigo-50 border border-indigo-200/80 text-[#5E4BE2] text-[10px] font-bold"
                                  title={`Attached: ${r.meta.attachmentName || 'Document'}`}
                                >
                                  <IconPaperclip className="w-3 h-3" />
                                  <span>Doc</span>
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400 font-medium block mt-0.5">
                              {isWeekend ? (r.meta?.dayOfWeek || 'Saturday/Sunday') : 'Company Holiday'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Date Worked */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-xs font-semibold text-slate-700">
                          {formatDateDisplay(r.startDate || r.createdAt)}
                        </span>
                      </td>

                      {/* Days */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {r.days || 1} day{(r.days || 1) > 1 ? 's' : ''}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(r.status)}
                      </td>

                      {/* Approver */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-indigo-50 border border-indigo-100 text-[#5E4BE2] font-bold flex items-center justify-center text-[10px] shrink-0">
                            {r.approver
                              ? getInitials(r.approver.firstName, r.approver.lastName)
                              : 'M'}
                          </div>
                          <span className="text-xs text-slate-700 font-semibold">
                            {r.approver
                              ? `${r.approver.firstName} ${r.approver.lastName}`
                              : 'Reporting Manager'}
                          </span>
                        </div>
                      </td>

                      {/* Reason / Note */}
                      <td className="px-6 py-4 max-w-xs">
                        <p className="text-xs text-slate-600 truncate" title={r.reason}>
                          {r.reason || '—'}
                        </p>
                      </td>

                      {/* Action */}
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {r.status === 'PENDING' && (
                            <button
                              type="button"
                              onClick={() => handleCancel(r.id)}
                              className="px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200/80 rounded-xl shadow-2xs transition-colors cursor-pointer"
                            >
                              Cancel
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setViewReq(r)}
                            className="px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 border border-slate-200 rounded-xl shadow-2xs transition-colors cursor-pointer"
                          >
                            View
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
          totalItems={filteredRequests.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
          pageSizeOptions={[5, 10, 20, 50]}
          itemName="comp off requests"
        />
      </div>

      {/* ===================== REQUEST COMP OFF DRAWER ===================== */}
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
                    <h2 className="text-base font-bold text-slate-900">
                      Request Comp Off
                    </h2>
                    <p className="text-xs text-slate-400 font-medium">
                      Claim compensatory credit for weekend or holiday work
                    </p>
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
                    <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                      <IconAlertCircle className="w-4 h-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Work Occasion Type Selection */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">
                      When did you work? <span className="text-rose-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div
                        onClick={() => setWorkType('WEEKEND')}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                          workType === 'WEEKEND'
                            ? 'bg-indigo-50/70 border-[#5E4BE2] ring-1 ring-[#5E4BE2]/30 shadow-2xs'
                            : 'bg-slate-50 border-slate-200 hover:bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <IconBriefcase
                            className={`w-4 h-4 ${
                              workType === 'WEEKEND' ? 'text-[#5E4BE2]' : 'text-slate-500'
                            }`}
                          />
                          <span
                            className={`text-xs font-bold ${
                              workType === 'WEEKEND' ? 'text-[#5E4BE2]' : 'text-slate-800'
                            }`}
                          >
                            Weekend Work
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Saturday, Sunday, or rostered weekly off
                        </p>
                      </div>

                      <div
                        onClick={() => setWorkType('HOLIDAY')}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                          workType === 'HOLIDAY'
                            ? 'bg-indigo-50/70 border-[#5E4BE2] ring-1 ring-[#5E4BE2]/30 shadow-2xs'
                            : 'bg-slate-50 border-slate-200 hover:bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <IconSun
                            className={`w-4 h-4 ${
                              workType === 'HOLIDAY' ? 'text-[#5E4BE2]' : 'text-slate-500'
                            }`}
                          />
                          <span
                            className={`text-xs font-bold ${
                              workType === 'HOLIDAY' ? 'text-[#5E4BE2]' : 'text-slate-800'
                            }`}
                          >
                            Holiday Work
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Public, national, or company holiday
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* If Weekend Work: Date Selector */}
                  {workType === 'WEEKEND' && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Date Worked (Weekend / Off-Day) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={workedDate}
                        onChange={(e) => setWorkedDate(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-[#5E4BE2] font-semibold text-slate-800 transition-colors"
                      />
                      {workedDate && (
                        <div className="mt-1.5 flex items-center justify-between text-[11px]">
                          <span className="font-bold text-[#5E4BE2] flex items-center gap-1">
                            <IconClock className="w-3.5 h-3.5" />
                            Day: {getDayInfo(workedDate).dayName}
                          </span>
                          {!getDayInfo(workedDate).isWeekend && (
                            <span className="text-amber-600 font-medium">
                              Note: This date is a weekday. Proceed if it was your assigned off-day.
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* If Holiday Work: Select Holiday or Custom */}
                  {workType === 'HOLIDAY' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-semibold text-slate-700">
                          Holiday Worked <span className="text-rose-500">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setIsCustomHoliday(!isCustomHoliday);
                            setSelectedHolidayId('');
                            setCustomHolidayName('');
                          }}
                          className="text-[11px] font-bold text-[#5E4BE2] hover:underline cursor-pointer"
                        >
                          {isCustomHoliday ? '← Select from Holiday List' : '+ Other / Custom Holiday'}
                        </button>
                      </div>

                      {!isCustomHoliday ? (
                        <div className="relative">
                          <select
                            required
                            value={selectedHolidayId}
                            onChange={(e) => {
                              setSelectedHolidayId(e.target.value);
                              const found = holidays.find((h) => String(h.id) === e.target.value);
                              if (found && found.date) {
                                setWorkedDate(found.date);
                              }
                            }}
                            className="w-full pl-3.5 pr-8 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-[#5E4BE2] font-semibold text-slate-800 transition-colors appearance-none cursor-pointer"
                          >
                            <option value="">Select official holiday...</option>
                            {holidays.map((h) => (
                              <option key={h.id} value={h.id}>
                                {h.name} ({h.date ? new Date(h.date).toLocaleDateString() : 'Holiday'})
                              </option>
                            ))}
                          </select>
                          <IconChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div>
                            <input
                              type="text"
                              required
                              placeholder="Holiday Name (e.g. Regional Holiday, State Day)..."
                              value={customHolidayName}
                              onChange={(e) => setCustomHolidayName(e.target.value)}
                              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-[#5E4BE2] font-semibold text-slate-800 placeholder-slate-400"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Holiday Date <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="date"
                              required
                              value={workedDate}
                              onChange={(e) => setWorkedDate(e.target.value)}
                              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-[#5E4BE2] font-semibold text-slate-800"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Credit Days Selection */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Comp-Off Credit (Days) <span className="text-rose-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setDays(1)}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          days === 1
                            ? 'bg-indigo-50 border-[#5E4BE2] text-[#5E4BE2] shadow-2xs'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-white'
                        }`}
                      >
                        1.0 Day (Full Day)
                      </button>
                      <button
                        type="button"
                        onClick={() => setDays(0.5)}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          days === 0.5
                            ? 'bg-indigo-50 border-[#5E4BE2] text-[#5E4BE2] shadow-2xs'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-white'
                        }`}
                      >
                        0.5 Day (Half Day)
                      </button>
                    </div>
                  </div>

                  {/* Reason / Work Delivered */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Work Delivered / Justification <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      required
                      rows={3}
                      placeholder="Describe the tasks, release deployment, client emergency, or on-call coverage completed..."
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-[#5E4BE2] text-slate-800 placeholder-slate-400 resize-none transition-colors"
                    />
                  </div>

                  {/* Attachment Field */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Supporting Attachment (Email approval, logs, ticket screenshot)
                    </label>
                    <input
                      type="file"
                      onChange={handleFileChange}
                      className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-[#5E4BE2] hover:file:bg-indigo-100 cursor-pointer"
                    />
                    {attachmentName && (
                      <p className="text-[11px] text-slate-600 mt-1.5 flex items-center gap-1 font-medium">
                        <IconPaperclip className="w-3.5 h-3.5 text-[#5E4BE2]" />
                        <span>Attached: {attachmentName}</span>
                      </p>
                    )}
                  </div>

                  <div className="bg-indigo-50/60 border border-indigo-100/80 rounded-xl p-3 text-[11px] text-slate-600 space-y-1">
                    <p className="font-bold text-[#5E4BE2]">Approval Process:</p>
                    <p>
                      Once approved by your reporting manager, this compensatory credit will automatically be added to your leave balance.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-2xs cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-3.5 py-2 text-xs font-bold rounded-xl bg-[#5E4BE2] hover:bg-[#4D3BC9] text-white shadow-xs disabled:opacity-50 cursor-pointer transition-colors"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Comp Off Request'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ===================== VIEW REQUEST DETAILS DRAWER ===================== */}
      {viewReq && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] overflow-hidden">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setViewReq(null)}
          />
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10 pointer-events-none">
            <div
              className="w-screen max-w-md bg-white shadow-2xl flex flex-col h-full border-l border-slate-200 pointer-events-auto animate-in slide-in-from-right duration-200 overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5E4BE2] shrink-0">
                    <IconEye className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Comp Off Details</h2>
                    <p className="text-xs text-slate-400 font-medium">Request specifications &amp; status</p>
                  </div>
                </div>
                <button
                  onClick={() => setViewReq(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <IconX className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4 flex-1">
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <span className="text-xs font-bold text-slate-700">Request Status</span>
                  {getStatusBadge(viewReq.status)}
                </div>

                <div className="space-y-3 p-4 rounded-2xl border border-slate-200 text-xs">
                  <div>
                    <span className="text-slate-400 block font-medium">Work Occasion</span>
                    <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                      {viewReq.meta?.workType === 'WEEKEND' ? 'Weekend Work' : (viewReq.meta?.holidayName || 'Holiday Work')}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block font-medium">Date Worked</span>
                    <span className="font-semibold text-slate-800 mt-0.5 block">
                      {formatDateDisplay(viewReq.startDate || viewReq.createdAt)}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block font-medium">Credit Claimed</span>
                    <span className="font-semibold text-slate-800 mt-0.5 block">
                      {viewReq.days || 1} Day{Number(viewReq.days || 1) > 1 ? 's' : ''}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block font-medium">Approver Name</span>
                    <span className="font-semibold text-slate-800 mt-0.5 block">
                      {viewReq.approver
                        ? `${viewReq.approver.firstName} ${viewReq.approver.lastName}`
                        : 'Reporting Manager'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block font-medium">Work Delivered / Justification</span>
                    <p className="mt-1 p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 text-slate-700 leading-relaxed font-medium">
                      {viewReq.reason || '—'}
                    </p>
                  </div>

                  {viewReq.meta?.attachmentUrl && (
                    <div className="pt-2 border-t border-slate-100 space-y-2">
                      <span className="text-slate-400 block text-[11px] font-semibold">Attached Document</span>
                      {viewReq.meta.attachmentUrl.startsWith('data:image') && (
                        <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50 p-1.5 max-w-sm">
                          <img
                            src={viewReq.meta.attachmentUrl}
                            alt="Attachment preview"
                            className="w-full max-h-48 object-contain rounded-lg bg-white"
                          />
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <a
                          href={viewReq.meta.attachmentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200/70 text-[#5E4BE2] font-bold text-xs hover:bg-indigo-100 transition-colors"
                        >
                          <IconExternalLink className="w-3.5 h-3.5" />
                          <span>{viewReq.meta.attachmentName || 'View Document'}</span>
                        </a>
                        <a
                          href={viewReq.meta.attachmentUrl}
                          download={viewReq.meta.attachmentName || 'supporting-document'}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs transition-colors cursor-pointer"
                          title="Download attachment"
                        >
                          <IconDownload className="w-3.5 h-3.5 text-slate-500" />
                          <span>Download</span>
                        </a>
                      </div>
                    </div>
                  )}

                  {viewReq.decisionNote && (
                    <div className="pt-2 border-t border-slate-100">
                      <span className="text-slate-400 block font-medium mb-1">Manager Note</span>
                      <p className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-900 leading-relaxed font-medium">
                        {viewReq.decisionNote}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="p-5 border-t border-slate-100 flex items-center justify-between">
                {viewReq.status === 'PENDING' ? (
                  <button
                    onClick={() => {
                      const id = viewReq.id;
                      setViewReq(null);
                      handleCancel(id);
                    }}
                    className="px-3.5 py-2 text-xs font-bold rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-200/80 shadow-2xs transition-colors cursor-pointer"
                  >
                    Cancel Request
                  </button>
                ) : <div />}
                <button
                  type="button"
                  onClick={() => setViewReq(null)}
                  className="px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
                >
                  Close
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

export default MyCompOffPage;
