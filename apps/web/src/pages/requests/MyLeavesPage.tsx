import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import TablePagination from '../../components/common/TablePagination';
import {
  IconCalendarEvent,
  IconCalendar,
  IconPlus,
  IconX,
  IconAlertCircle,
  IconPlane,
  IconSun,
  IconBriefcase,
  IconFileText,
  IconChevronDown,
} from '@tabler/icons-react';

interface RequestItem {
  id: number;
  type: string;
  title: string;
  reason: string;
  status: string;
  startDate?: string;
  endDate?: string;
  days?: number;
  createdAt: string;
  leaveType?: { name: string; code: string };
  approver?: { firstName: string; lastName: string };
}

interface LeaveQuota {
  code: string;
  name: string;
  allowed: number;
  used: number;
  badgeBg: string;
  badgeText: string;
  iconBg: string;
  iconColor: string;
  barColor: string;
  type: 'calendar' | 'medical' | 'plane' | 'sun' | 'briefcase';
}

export const MyLeavesPage: React.FC = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('ALL');
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedTypeFilter]);

  const [form, setForm] = useState({
    leaveTypeId: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    reason: '',
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [reqRes, typesRes] = await Promise.all([
        api.get('/requests?type=LEAVE&scope=mine'),
        api.get('/company/leave-types'),
      ]);
      setRequests(reqRes.data?.items || []);
      setLeaveTypes(typesRes.data?.leaveTypes || []);
    } catch (err) {
      console.error('Failed to load leaves:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.leaveTypeId || !form.reason.trim()) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await api.post('/requests', {
        type: 'LEAVE',
        leaveTypeId: Number(form.leaveTypeId),
        startDate: form.startDate,
        endDate: form.endDate,
        reason: form.reason.trim(),
        title: `Leave application (${form.startDate} to ${form.endDate})`,
      });
      setIsModalOpen(false);
      setForm({
        leaveTypeId: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        reason: '',
      });
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to submit leave');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async (id: number) => {
    if (!window.confirm('Cancel this pending leave request?')) return;
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
            Pending Review
          </span>
        );
    }
  };

  // Base 5 leave quota categories matching the design
  const quotaCategories: LeaveQuota[] = [
    {
      code: 'CL',
      name: 'Casual Leave',
      allowed: 15,
      used: 12,
      badgeBg: 'bg-blue-100/80',
      badgeText: 'text-blue-700',
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-500',
      barColor: 'bg-blue-500',
      type: 'calendar',
    },
    {
      code: 'SL',
      name: 'Sick Leave',
      allowed: 15,
      used: 10,
      badgeBg: 'bg-emerald-100/80',
      badgeText: 'text-emerald-700',
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-500',
      barColor: 'bg-emerald-500',
      type: 'medical',
    },
    {
      code: 'EL',
      name: 'Earned Leave',
      allowed: 20,
      used: 15,
      badgeBg: 'bg-purple-100/80',
      badgeText: 'text-purple-700',
      iconBg: 'bg-purple-50',
      iconColor: 'text-purple-500',
      barColor: 'bg-[#8b5cf6]',
      type: 'plane',
    },
    {
      code: 'FH',
      name: 'Floater Holiday',
      allowed: 5,
      used: 2,
      badgeBg: 'bg-amber-100/80',
      badgeText: 'text-amber-700',
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-500',
      barColor: 'bg-amber-500',
      type: 'sun',
    },
    {
      code: 'CO',
      name: 'Comp Off',
      allowed: 5,
      used: 0,
      badgeBg: 'bg-rose-100/80',
      badgeText: 'text-rose-700',
      iconBg: 'bg-rose-50',
      iconColor: 'text-rose-500',
      barColor: 'bg-rose-400',
      type: 'briefcase',
    },
  ];

  // Dynamically map API types if available
  const mappedQuotas = quotaCategories.map((base) => {
    const apiType = leaveTypes.find(
      (lt) =>
        lt.code?.toUpperCase() === base.code ||
        lt.name?.toLowerCase().includes(base.name.toLowerCase().split(' ')[0])
    );
    const allowed = apiType?.daysAllowed ?? base.allowed;
    const used = base.used;
    const remaining = Math.max(0, allowed - used);
    return {
      ...base,
      allowed,
      remaining,
    };
  });

  // Filter requests
  const filteredRequests = requests.filter((req) => {
    if (selectedTypeFilter === 'ALL') return true;
    return (
      req.leaveType?.code?.toUpperCase() === selectedTypeFilter ||
      req.leaveType?.name?.toLowerCase().includes(selectedTypeFilter.toLowerCase())
    );
  });

  const paginatedRequests = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRequests.slice(start, start + pageSize);
  }, [filteredRequests, currentPage, pageSize]);

  const renderQuotaIcon = (type: LeaveQuota['type'], iconColor: string) => {
    switch (type) {
      case 'calendar':
        return <IconCalendar className={`w-4 h-4 ${iconColor}`} />;
      case 'medical':
        return (
          <svg
            className={`w-4 h-4 ${iconColor}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 4h-1a2 2 0 0 0 -2 2v3.5h0a5.5 5.5 0 0 0 11 0v-3.5a2 2 0 0 0 -2 -2h-1" />
            <path d="M8 15a6 6 0 1 0 12 0v-3" />
            <path d="M11 3v2" />
            <path d="M6 3v2" />
            <circle cx="20" cy="10" r="2" />
          </svg>
        );
      case 'plane':
        return <IconPlane className={`w-4 h-4 ${iconColor}`} />;
      case 'sun':
        return <IconSun className={`w-4 h-4 ${iconColor}`} />;
      case 'briefcase':
        return <IconBriefcase className={`w-4 h-4 ${iconColor}`} />;
      default:
        return <IconCalendar className={`w-4 h-4 ${iconColor}`} />;
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5 max-w-7xl mx-auto pb-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5E4BE2] shrink-0">
              <IconCalendarEvent className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Leaves
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Apply for leave, check available balances, and track manager approval status.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#5E4BE2] to-[#4B39C3] hover:from-[#5340D4] hover:to-[#4130B4] text-white text-xs font-bold rounded-xl shadow-sm shadow-indigo-600/25 transition-all active:scale-[0.98] cursor-pointer"
        >
          <IconPlus className="w-4 h-4" />
          <span>Apply for Leave</span>
        </button>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm flex items-center gap-2">
          <IconAlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Leave Quota Cards (5 Columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {mappedQuotas.map((quota) => {
          const percentage = quota.allowed > 0 ? (quota.used / quota.allowed) * 100 : 0;
          const isCompOff = quota.code === 'CO';
          return (
            <div
              key={quota.code}
              onClick={() => {
                if (isCompOff) {
                  navigate('/comp-off');
                }
              }}
              className={`bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between transition-all hover:border-slate-300 ${
                isCompOff ? 'cursor-pointer hover:border-indigo-300' : ''
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-xl ${quota.iconBg} flex items-center justify-center shrink-0`}
                    >
                      {renderQuotaIcon(quota.type, quota.iconColor)}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 truncate">
                        {quota.name}
                      </h4>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xl font-black text-slate-900 leading-none">
                      {quota.remaining}
                    </span>
                    <span className="text-xs font-medium text-slate-400 ml-1">
                      left
                    </span>
                  </div>
                </div>

                {/* Clean progress bar */}
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-3">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${quota.barColor}`}
                    style={{ width: `${Math.min(100, percentage)}%` }}
                  />
                </div>
              </div>

              <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400 font-medium">
                <span>{quota.used} used</span>
                <span>{quota.allowed} total</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Leave Applications History Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table Header / Action Row */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5E4BE2] shrink-0">
              <IconCalendar className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">
              Leave Applications History
            </h3>
          </div>

          {/* Filters: Dropdown + Date Range */}
          <div className="flex items-center gap-2">
            {/* Filter Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
              >
                <span>
                  {selectedTypeFilter === 'ALL'
                    ? 'All Leave Types'
                    : mappedQuotas.find((q) => q.code === selectedTypeFilter)?.name ||
                      selectedTypeFilter}
                </span>
                <IconChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {isTypeDropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-44 bg-white rounded-xl shadow-lg border border-slate-100 py-1 z-30 animate-in fade-in zoom-in-95 duration-100">
                  <button
                    onClick={() => {
                      setSelectedTypeFilter('ALL');
                      setIsTypeDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-xs font-medium transition-colors ${
                      selectedTypeFilter === 'ALL'
                        ? 'bg-indigo-50 text-[#5E4BE2] font-semibold'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    All Leave Types
                  </button>
                  {mappedQuotas.map((q) => (
                    <button
                      key={q.code}
                      onClick={() => {
                        setSelectedTypeFilter(q.code);
                        setIsTypeDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3.5 py-2 text-xs font-medium transition-colors ${
                        selectedTypeFilter === q.code
                          ? 'bg-indigo-50 text-[#5E4BE2] font-semibold'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {q.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Date range display badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-600 shadow-2xs">
              <IconCalendar className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {new Date(Date.now() - 30 * 86400000).toLocaleDateString([], {
                  month: 'numeric',
                  day: 'numeric',
                  year: 'numeric',
                })}{' '}
                -{' '}
                {new Date().toLocaleDateString([], {
                  month: 'numeric',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-[#e5e7eb] text-xs font-bold text-slate-900 border-b border-slate-300">
              <tr>
                <th className="px-6 py-3.5">Leave Type</th>
                <th className="px-6 py-3.5">Dates Duration</th>
                <th className="px-6 py-3.5">Days</th>
                <th className="px-6 py-3.5">Reason</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Approver</th>
                <th className="px-6 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4">
                      <div className="w-24 h-4 bg-slate-200 rounded-sm" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-32 h-4 bg-slate-200 rounded-sm" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-12 h-4 bg-slate-200 rounded-sm" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-40 h-4 bg-slate-100 rounded-sm" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-20 h-4 bg-slate-200 rounded-full" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-20 h-4 bg-slate-200 rounded-sm" />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="w-12 h-4 bg-slate-200 rounded-sm ml-auto" />
                    </td>
                  </tr>
                ))
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-14 text-center">
                    <div className="w-12 h-12 rounded-full bg-indigo-50 text-[#5E4BE2] mx-auto flex items-center justify-center mb-3">
                      <IconFileText className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-slate-800">No leave requests applied yet.</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Start by applying for a leave using the button above.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 mr-2">
                        {req.leaveType?.code || 'LV'}
                      </span>
                      {req.leaveType?.name || 'General Leave'}
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-700">
                      {req.startDate ? new Date(req.startDate).toLocaleDateString() : 'N/A'} —{' '}
                      {req.endDate ? new Date(req.endDate).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">
                      {req.days ? `${req.days} d` : '1 d'}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600 max-w-xs truncate">
                      {req.reason}
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(req.status)}</td>
                    <td className="px-6 py-4 text-xs text-slate-600">
                      {req.approver
                        ? `${req.approver.firstName} ${req.approver.lastName}`
                        : 'Reporting Manager'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {req.status === 'PENDING' && (
                        <button
                          onClick={() => handleCancel(req.id)}
                          className="px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))
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
          itemName="leave requests"
        />
      </div>

      {/* Apply for Leave Right-Side Slide-Over Drawer */}
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
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5E4BE2] shrink-0">
                    <IconCalendarEvent className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Apply for Leave</h2>
                    <p className="text-xs text-slate-400 font-medium">Submit leave application to your manager</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <IconX className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Body / Form */}
              <form onSubmit={handleApply} className="p-6 flex-1 flex flex-col justify-between space-y-5">
                <div className="space-y-4">
                  {error && (
                    <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                      <IconAlertCircle className="w-4 h-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Leave Policy Category *
                    </label>
                    <select
                      required
                      value={form.leaveTypeId}
                      onChange={(e) => setForm({ ...form, leaveTypeId: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-[#5E4BE2] text-slate-800"
                    >
                      <option value="">Select leave type</option>
                      {leaveTypes.map((lt) => (
                        <option key={lt.id} value={lt.id}>
                          {lt.name} ({lt.code}) — {lt.daysAllowed} days/yr
                        </option>
                      ))}
                      {/* Fallbacks if leaveTypes empty */}
                      {leaveTypes.length === 0 && (
                        <>
                          <option value="1">Casual Leave (CL) — 15 days/yr</option>
                          <option value="2">Sick Leave (SL) — 15 days/yr</option>
                          <option value="3">Earned Leave (EL) — 20 days/yr</option>
                          <option value="4">Floater Holiday (FH) — 5 days/yr</option>
                          <option value="5">Comp Off (CO) — 5 days/yr</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Start Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={form.startDate}
                        onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                        className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-[#5E4BE2] text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        End Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={form.endDate}
                        onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                        className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-[#5E4BE2] text-slate-800"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Reason for Absence *
                    </label>
                    <textarea
                      required
                      rows={4}
                      placeholder="Provide context for your manager..."
                      value={form.reason}
                      onChange={(e) => setForm({ ...form, reason: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-[#5E4BE2] text-slate-800 resize-none"
                    />
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 text-xs font-bold rounded-xl bg-gradient-to-r from-[#5E4BE2] to-[#4B39C3] hover:from-[#5340D4] hover:to-[#4130B4] text-white shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Application'}
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

export default MyLeavesPage;
