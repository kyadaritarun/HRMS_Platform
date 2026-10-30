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
  IconEye,
  IconEdit,
  IconPaperclip,
  IconExternalLink,
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
  leaveTypeId?: number;
  createdAt: string;
  leaveType?: { id?: number; name: string; code: string };
  approver?: { firstName: string; lastName: string };
  decisionNote?: string;
  meta?: any;
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
  const [editingReqId, setEditingReqId] = useState<number | null>(null);
  const [viewReq, setViewReq] = useState<RequestItem | null>(null);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedTypeFilter]);

  const [form, setForm] = useState<{
    leaveTypeId: string;
    startDate: string;
    endDate: string;
    reason: string;
    attachmentUrl?: string;
    attachmentName?: string;
  }>({
    leaveTypeId: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    reason: '',
    attachmentUrl: '',
    attachmentName: '',
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [reqRes, typesRes] = await Promise.all([
        api.get('/requests?type=LEAVE&scope=mine&pageSize=100'),
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

  const handleOpenNew = () => {
    setEditingReqId(null);
    setForm({
      leaveTypeId: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      reason: '',
      attachmentUrl: '',
      attachmentName: '',
    });
    setError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (req: RequestItem) => {
    setEditingReqId(req.id);
    const meta = (req as any).meta || {};
    setForm({
      leaveTypeId: String((req as any).leaveTypeId || req.leaveType?.id || ''),
      startDate: req.startDate ? req.startDate.split('T')[0] : new Date().toISOString().split('T')[0],
      endDate: req.endDate ? req.endDate.split('T')[0] : new Date().toISOString().split('T')[0],
      reason: req.reason || '',
      attachmentUrl: meta.attachmentUrl || '',
      attachmentName: meta.attachmentName || '',
    });
    setError(null);
    setIsModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({
        ...prev,
        attachmentUrl: reader.result as string,
        attachmentName: file.name,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.leaveTypeId || !form.reason.trim()) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const payload: any = {
        type: 'LEAVE',
        leaveTypeId: Number(form.leaveTypeId),
        startDate: form.startDate,
        endDate: form.endDate,
        reason: form.reason.trim(),
        title: `Leave application (${form.startDate} to ${form.endDate})`,
        meta: {
          attachmentUrl: form.attachmentUrl || undefined,
          attachmentName: form.attachmentName || undefined,
        },
      };

      if (editingReqId) {
        await api.put(`/requests/${editingReqId}`, payload);
      } else {
        await api.post('/requests', payload);
      }

      setIsModalOpen(false);
      setEditingReqId(null);
      setForm({
        leaveTypeId: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        reason: '',
        attachmentUrl: '',
        attachmentName: '',
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

  const formatDateRange = (start?: string, end?: string) => {
    if (!start) return '—';
    const s = new Date(start);
    const e = end ? new Date(end) : s;
    const sMonth = s.toLocaleString('en-US', { month: 'short' });
    const sDay = s.getDate();
    const eMonth = e.toLocaleString('en-US', { month: 'short' });
    const eDay = e.getDate();

    if (start.split('T')[0] === (end ? end.split('T')[0] : start.split('T')[0])) {
      return `${sMonth} ${sDay}`;
    }
    return `${sMonth} ${sDay} - ${eMonth} ${eDay}`;
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

  // Base 5 leave quota categories matching the design
  const quotaCategories: LeaveQuota[] = [
    {
      code: 'CL',
      name: 'Casual Leave',
      allowed: 15,
      used: 0,
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
      used: 0,
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
      used: 0,
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
      used: 0,
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

  // Calculate live approved usage from requests
  const { approvedUsageByTypeId, approvedUsageByCode } = useMemo(() => {
    const byId: Record<number, number> = {};
    const byCode: Record<string, number> = {};

    requests.forEach((req) => {
      if (req.status === 'APPROVED' && req.days) {
        const d = Number(req.days);
        const tid = (req as any).leaveTypeId || req.leaveType?.id;
        if (tid) {
          byId[tid] = (byId[tid] || 0) + d;
        }
        const c = req.leaveType?.code?.toUpperCase();
        if (c) {
          byCode[c] = (byCode[c] || 0) + d;
        }
      }
    });

    return { approvedUsageByTypeId: byId, approvedUsageByCode: byCode };
  }, [requests]);

  // Dynamically map API types and real approved usage
  const mappedQuotas = useMemo(() => {
    return quotaCategories.map((base) => {
      const apiType = leaveTypes.find(
        (lt) =>
          lt.code?.toUpperCase() === base.code ||
          (base.code === 'EL' && lt.code?.toUpperCase() === 'PL') ||
          (base.code === 'CO' && (lt.code?.toUpperCase() === 'CO' || lt.isCompOff)) ||
          lt.name?.toLowerCase().includes(base.name.toLowerCase().split(' ')[0])
      );

      const allowed = apiType
        ? Number(apiType.defaultAllocation ?? apiType.daysAllowed ?? base.allowed)
        : base.allowed;

      // Calculate approved used days
      let used = 0;
      if (apiType?.id && approvedUsageByTypeId[apiType.id] !== undefined) {
        used = approvedUsageByTypeId[apiType.id];
      } else if (approvedUsageByCode[base.code] !== undefined) {
        used = approvedUsageByCode[base.code];
      } else if (base.code === 'EL' && approvedUsageByCode['PL'] !== undefined) {
        used = approvedUsageByCode['PL'];
      } else if (apiType?.used !== undefined) {
        used = Number(apiType.used);
      }

      // Remaining balance: directly reflects allowed minus approved used
      const remaining = Math.max(0, allowed - used);

      return {
        ...base,
        allowed,
        used,
        remaining,
      };
    });
  }, [leaveTypes, requests, approvedUsageByTypeId, approvedUsageByCode]);

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
          <h1 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <IconCalendarEvent className="w-5 h-5 text-indigo-600 shrink-0" />
            <span>Leaves</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Apply for leave, check available balances, and track manager approval status.
          </p>
        </div>

        <button
          onClick={handleOpenNew}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#5E4BE2] hover:bg-[#4D3BC9] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
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
              className={`bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between transition-all hover:border-slate-300 ${isCompOff ? 'cursor-pointer hover:border-indigo-300' : ''
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
                    className={`w-full text-left px-3.5 py-2 text-xs font-medium transition-colors ${selectedTypeFilter === 'ALL'
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
                      className={`w-full text-left px-3.5 py-2 text-xs font-medium transition-colors ${selectedTypeFilter === q.code
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
                <th className="px-6 py-3.5">Date</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Approver Name</th>
                <th className="px-6 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4">
                      <div className="w-28 h-4 bg-slate-200 rounded-sm" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-24 h-4 bg-slate-200 rounded-sm" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-20 h-4 bg-slate-200 rounded-full" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-28 h-4 bg-slate-200 rounded-sm" />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="w-16 h-4 bg-slate-200 rounded-sm ml-auto" />
                    </td>
                  </tr>
                ))
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-14 text-center">
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
                    <td className="px-6 py-4 font-bold text-slate-900 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span>{req.leaveType?.name || 'Casual Leave'}</span>
                        {req.meta?.attachmentUrl && (
                          <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-indigo-50 border border-indigo-200/80 text-[#5E4BE2] text-[10px] font-bold shrink-0"
                            title={`Attached: ${req.meta.attachmentName || 'Document'}`}
                          >
                            <IconPaperclip className="w-3 h-3" />
                            <span>Doc</span>
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold text-slate-700 whitespace-nowrap">
                      {formatDateRange(req.startDate, req.endDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(req.status)}</td>
                    <td className="px-6 py-4 text-xs text-slate-600 font-medium whitespace-nowrap">
                      {req.approver
                        ? `${req.approver.firstName} ${req.approver.lastName}`
                        : 'Reporting Manager'}
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {req.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleOpenEdit(req)}
                              className="px-2.5 py-1 text-xs font-bold text-[#5E4BE2] hover:bg-indigo-50 border border-indigo-200/80 rounded-lg transition-colors cursor-pointer"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleCancel(req.id)}
                              className="px-2.5 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200/80 rounded-lg transition-colors cursor-pointer"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => setViewReq(req)}
                          className="px-2.5 py-1 text-xs font-bold text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                        >
                          View
                        </button>
                      </div>
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

      {/* Apply / Edit Leave Right-Side Slide-Over Drawer */}
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
                    <h2 className="text-base font-bold text-slate-900">
                      {editingReqId ? 'Edit Leave Application' : 'Apply for Leave'}
                    </h2>
                    <p className="text-xs text-slate-400 font-medium">
                      {editingReqId ? 'Update your pending request details' : 'Submit leave application to your manager'}
                    </p>
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

                  {/* Live Balance Summary Chips */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-500 block uppercase tracking-wider">
                      Available Leave Balances
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {mappedQuotas.map((q) => {
                        const matchedLt = leaveTypes.find(
                          (lt) =>
                            lt.code?.toUpperCase() === q.code ||
                            lt.name?.toLowerCase().includes(q.name.toLowerCase().split(' ')[0])
                        );
                        const isSelected = String(matchedLt?.id) === form.leaveTypeId;
                        return (
                          <div
                            key={q.code}
                            onClick={() => {
                              if (matchedLt) setForm((prev) => ({ ...prev, leaveTypeId: String(matchedLt.id) }));
                            }}
                            className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-50/70 border-[#5E4BE2] ring-1 ring-[#5E4BE2]/30 shadow-2xs'
                                : 'bg-slate-50 border-slate-200/80 hover:bg-white hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-800">{q.name}</span>
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600">
                                {q.code}
                              </span>
                            </div>
                            <div className="text-sm font-black text-[#5E4BE2] mt-1">
                              {q.remaining}{' '}
                              <span className="text-[11px] font-semibold text-slate-400 font-sans">left</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Leave Category *
                    </label>
                    <select
                      required
                      value={form.leaveTypeId}
                      onChange={(e) => setForm({ ...form, leaveTypeId: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-[#5E4BE2] text-slate-800 cursor-pointer"
                    >
                      <option value="">Select leave category</option>
                      {leaveTypes.map((lt) => {
                        const q = mappedQuotas.find(
                          (mq) =>
                            mq.code === lt.code?.toUpperCase() ||
                            lt.name?.toLowerCase().includes(mq.name.toLowerCase().split(' ')[0])
                        );
                        return (
                          <option key={lt.id} value={lt.id}>
                            {lt.name} {q ? `(${q.remaining} remaining)` : ''}
                          </option>
                        );
                      })}
                      {/* Fallbacks if leaveTypes empty */}
                      {leaveTypes.length === 0 && (
                        <>
                          <option value="1">Casual Leave (15 remaining)</option>
                          <option value="2">Sick Leave (15 remaining)</option>
                          <option value="3">Earned Leave (20 remaining)</option>
                          <option value="4">Floater Holiday (5 remaining)</option>
                          <option value="5">Comp Off (5 remaining)</option>
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
                      rows={3}
                      placeholder="Provide context for your manager..."
                      value={form.reason}
                      onChange={(e) => setForm({ ...form, reason: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-[#5E4BE2] text-slate-800 resize-none"
                    />
                  </div>

                  {/* Attachment Field */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Attachment (Medical note, travel receipt, etc.)
                    </label>
                    <input
                      type="file"
                      onChange={handleFileChange}
                      className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-[#5E4BE2] hover:file:bg-indigo-100 cursor-pointer"
                    />
                    {form.attachmentName && (
                      <p className="text-[11px] text-slate-600 mt-1 flex items-center gap-1 font-medium">
                        <IconPaperclip className="w-3.5 h-3.5 text-[#5E4BE2]" />
                        <span>Attached: {form.attachmentName}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-3.5 py-2 text-xs font-bold rounded-xl bg-[#5E4BE2] hover:bg-[#4D3BC9] text-white shadow-xs disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* View Leave Request Drawer */}
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
                    <h2 className="text-base font-bold text-slate-900">Leave Details</h2>
                    <p className="text-xs text-slate-400 font-medium">Application review &amp; history</p>
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
                  <span className="text-xs font-bold text-slate-700">Application Status</span>
                  {getStatusBadge(viewReq.status)}
                </div>

                <div className="space-y-3 p-4 rounded-2xl border border-slate-200 text-xs">
                  <div>
                    <span className="text-slate-400 block font-medium">Leave Category</span>
                    <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                      {viewReq.leaveType?.name || 'Casual Leave'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block font-medium">Leave Dates</span>
                    <span className="font-semibold text-slate-800 mt-0.5 block">
                      {formatDateRange(viewReq.startDate, viewReq.endDate)}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block font-medium">Duration</span>
                    <span className="font-semibold text-slate-800 mt-0.5 block">
                      {viewReq.days ? `${viewReq.days} day(s)` : '1 day'}
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
                    <span className="text-slate-400 block font-medium">Reason</span>
                    <p className="mt-1 p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 text-slate-700 leading-relaxed font-medium">
                      {viewReq.reason}
                    </p>
                  </div>

                  {viewReq.meta?.attachmentUrl && (
                    <div className="pt-2 border-t border-slate-100">
                      <span className="text-slate-400 block font-medium mb-1">Attached Document</span>
                      <a
                        href={viewReq.meta.attachmentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200/70 text-[#5E4BE2] font-bold text-xs hover:bg-indigo-100 transition-colors"
                      >
                        <IconExternalLink className="w-3.5 h-3.5" />
                        <span>{viewReq.meta.attachmentName || 'View Attachment'}</span>
                      </a>
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
              <div className="p-4 border-t border-slate-100 flex items-center justify-end">
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

export default MyLeavesPage;
