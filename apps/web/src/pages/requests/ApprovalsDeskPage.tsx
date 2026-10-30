import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import api from '../../api/client';
import TablePagination from '../../components/common/TablePagination';
import { useAuth } from '../../context/AuthContext';
import {
  IconChecklist,
  IconCheck,
  IconX,
  IconAlertCircle,
  IconCalendar,
  IconClock,
  IconReceipt2,
  IconSearch,
  IconRefresh,
  IconTarget,
  IconFilter,
  IconChevronDown,
  IconEye,
  IconFileSearch,
  IconExternalLink,
  IconPaperclip,
  IconDownload,
} from '@tabler/icons-react';

interface ApprovalRequest {
  id: number;
  type: string;
  title: string;
  reason: string;
  status: string;
  startDate?: string;
  endDate?: string;
  days?: number;
  amount?: number;
  createdAt: string;
  user: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    jobTitle: string;
  };
  leaveType?: { name: string; code: string };
  meta?: any;
}

export const ApprovalsDeskPage: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const isAdminOrHr = user?.role === 'COMPANY_ADMIN' || user?.role === 'HR';
  const isManager = Boolean(user?.isManager || (user as any)?._count?.reports > 0);
  const [scope, setScope] = useState<'assigned' | 'company'>(isAdminOrHr ? 'company' : 'assigned');
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [allMetricsRequests, setAllMetricsRequests] = useState<ApprovalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('PENDING');
  const [search, setSearch] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedType, selectedStatus, search]);
  const [reviewModal, setReviewModal] = useState<{
    open: boolean;
    req?: ApprovalRequest;
    decision: 'APPROVED' | 'REJECTED' | '';
    note: string;
  }>({ open: false, decision: '', note: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getRequestTypeHeading = (type?: string, decision?: 'APPROVED' | 'REJECTED') => {
    const action = decision === 'APPROVED' ? 'Approve' : 'Reject';
    switch (type) {
      case 'LEAVE':
        return `${action} Leave Request`;
      case 'REGULARIZATION':
        return `${action} Attendance Regularization`;
      case 'COMP_OFF':
        return `${action} Comp-Off Request`;
      case 'CLAIM':
        return `${action} Expense Claim`;
      case 'GOAL':
        return `${action} Performance Goal`;
      default:
        return `${action} Request`;
    }
  };

  useEffect(() => {
    if (location.pathname.includes('/leaves')) setSelectedType('LEAVE');
    else if (location.pathname.includes('/regularizations')) setSelectedType('REGULARIZATION');
    else if (location.pathname.includes('/comp-off')) setSelectedType('COMP_OFF');
    else if (location.pathname.includes('/goals')) setSelectedType('GOAL');
    else if (location.pathname.includes('/claims')) setSelectedType('CLAIM');
  }, [location.pathname]);

  const fetchMetricsOverview = async () => {
    try {
      const activeScope = isAdminOrHr ? scope : 'assigned';
      const res = await api.get('/requests', { params: { scope: activeScope, pageSize: 100 } });
      setAllMetricsRequests(res.data?.items || []);
    } catch (err) {
      console.error('Failed to load metric overview requests:', err);
    }
  };

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const activeScope = isAdminOrHr ? scope : 'assigned';
      const params: any = { scope: activeScope };
      if (selectedStatus && selectedStatus !== 'ALL') {
        params.status = selectedStatus;
      }
      if (selectedType) {
        params.type = selectedType;
      }
      const res = await api.get('/requests', { params });
      setRequests(res.data?.items || []);
    } catch (err) {
      console.error('Failed to load requests:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    fetchMetricsOverview();
  }, [selectedType, selectedStatus, scope]);

  const openAttachmentSafe = (url?: string, name?: string) => {
    if (!url) return;
    if (url.startsWith('data:')) {
      try {
        const arr = url.split(',');
        const mime = arr[0].match(/:(.*?);/)?.[1] || 'application/octet-stream';
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const blob = new Blob([u8arr], { type: mime });
        const blobUrl = URL.createObjectURL(blob);
        const win = window.open(blobUrl, '_blank');
        if (!win) {
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = name || 'supporting-document';
          a.click();
        }
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
        return;
      } catch (e) {
        console.error('Failed to open data url blob:', e);
      }
    }
    window.open(url, '_blank');
  };

  const handleOpenReview = (req: ApprovalRequest) => {
    setReviewModal({
      open: true,
      req,
      decision: req.status === 'PENDING' ? '' : (req.status as any),
      note: '',
    });
  };

  const handleDecisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewModal.req?.id || !reviewModal.decision) return;
    if (reviewModal.decision === 'REJECTED' && !reviewModal.note.trim()) {
      alert('Please provide a comment or reason for rejection.');
      return;
    }
    setIsSubmitting(true);
    try {
      await api.patch(`/requests/${reviewModal.req.id}/decision`, {
        status: reviewModal.decision,
        note: reviewModal.note.trim() || undefined,
      });
      setReviewModal({ open: false, decision: '', note: '' });
      fetchRequests();
      fetchMetricsOverview();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to complete approval decision');
    } finally {
      setIsSubmitting(false);
    }
  };

  // KPI stats
  const kpiStats = useMemo(() => {
    const list = selectedType
      ? allMetricsRequests.filter((r) => r.type === selectedType)
      : allMetricsRequests;

    const pending = list.filter((r) => r.status === 'PENDING').length;
    const approved = list.filter((r) => r.status === 'APPROVED').length;
    const rejected = list.filter((r) => r.status === 'REJECTED').length;
    const total = list.length;

    return { pending, approved, rejected, total };
  }, [allMetricsRequests, selectedType]);

  // Filtered requests by search
  const filteredRequests = useMemo(() => {
    if (!search.trim()) return requests;
    const q = search.toLowerCase();
    return requests.filter((req) => {
      const empName = `${req.user?.firstName || ''} ${req.user?.lastName || ''}`.toLowerCase();
      const empEmail = (req.user?.email || '').toLowerCase();
      const title = (req.title || '').toLowerCase();
      const reason = (req.reason || '').toLowerCase();
      const type = (req.type || '').toLowerCase();
      return (
        empName.includes(q) ||
        empEmail.includes(q) ||
        title.includes(q) ||
        reason.includes(q) ||
        type.includes(q)
      );
    });
  }, [requests, search]);

  const paginatedRequests = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRequests.slice(start, start + pageSize);
  }, [filteredRequests, currentPage, pageSize]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'LEAVE':
        return <IconCalendar className="w-3.5 h-3.5 text-purple-600" />;
      case 'REGULARIZATION':
        return <IconClock className="w-3.5 h-3.5 text-blue-600" />;
      case 'CLAIM':
        return <IconReceipt2 className="w-3.5 h-3.5 text-emerald-600" />;
      case 'GOAL':
        return <IconTarget className="w-3.5 h-3.5 text-amber-600" />;
      case 'COMP_OFF':
        return <IconCalendar className="w-3.5 h-3.5 text-indigo-600" />;
      default:
        return <IconChecklist className="w-3.5 h-3.5 text-[#5E4BE2]" />;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ===================== TOP HEADER BAR ===================== */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <IconChecklist className="w-5 h-5 text-indigo-600 shrink-0" />
            <span>Approval Requests</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isManager && !isAdminOrHr
              ? 'Review, authorize, or return leave, attendance, and expense requests submitted by your team members.'
              : 'Review, authorize, or return leave requests, attendance regularizations, and performance goals.'}
          </p>
        </div>

        <button
          onClick={() => {
            fetchRequests();
            fetchMetricsOverview();
          }}
          className="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 shadow-xs transition-all cursor-pointer"
        >
          <IconRefresh className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#5E4BE2]' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* ===================== TABLE FORM CONTAINER ===================== */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
        {/* Search & Filter Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <IconSearch className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search employee, title, reason..."
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

          {/* Right Controls: Scope, Category & Status */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Scope Toggle for HR / Admin */}
            {isAdminOrHr && (
              <div className="flex items-center bg-slate-50 border border-slate-200 p-1 rounded-xl shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setScope('company');
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    scope === 'company'
                      ? 'bg-white text-[#5E4BE2] shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  All Company
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setScope('assigned');
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    scope === 'assigned'
                      ? 'bg-white text-[#5E4BE2] shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Assigned to Me
                </button>
              </div>
            )}
            {/* Request Type Dropdown */}
            <div className="relative shrink-0">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="appearance-none pl-8 pr-7 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#5E4BE2] text-slate-700 cursor-pointer"
              >
                <option value="">All Request Types</option>
                <option value="LEAVE">Leaves</option>
                <option value="REGULARIZATION">Regularizations</option>
                <option value="CLAIM">Expense Claims</option>
                <option value="COMP_OFF">Comp-Off</option>
                <option value="GOAL">Performance Goals</option>
              </select>
              <IconFilter className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <IconChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Status Segmented Buttons */}
            <div className="flex items-center bg-slate-50 border border-slate-200 p-1 rounded-xl shrink-0">
              {[
                { id: 'PENDING', label: 'Pending' },
                { id: 'APPROVED', label: 'Approved' },
                { id: 'REJECTED', label: 'Rejected' },
                { id: 'ALL', label: 'All' },
              ].map((st) => {
                const isActive = selectedStatus === st.id;
                return (
                  <button
                    key={st.id}
                    onClick={() => setSelectedStatus(st.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-white text-[#5E4BE2] shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {st.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Table Structure */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-xs">
            <thead className="bg-[#e5e7eb] text-xs font-bold text-slate-900 border-b border-slate-300">
              <tr>
                <th className="px-5 py-3.5 whitespace-nowrap">Employee</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Type</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Request Title</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Reason &amp; Details</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Applied On</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Status</th>
                <th className="px-5 py-3.5 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 py-4"><div className="w-32 h-4 bg-slate-100 rounded-sm" /></td>
                    <td className="px-4 py-4"><div className="w-20 h-4 bg-slate-100 rounded-sm" /></td>
                    <td className="px-4 py-4"><div className="w-40 h-4 bg-slate-100 rounded-sm" /></td>
                    <td className="px-4 py-4"><div className="w-48 h-4 bg-slate-100 rounded-sm" /></td>
                    <td className="px-4 py-4"><div className="w-20 h-4 bg-slate-100 rounded-sm" /></td>
                    <td className="px-4 py-4"><div className="w-16 h-4 bg-slate-100 rounded-sm" /></td>
                    <td className="px-4 py-4 text-right"><div className="w-24 h-6 bg-slate-100 rounded-md ml-auto" /></td>
                  </tr>
                ))
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="w-12 h-12 rounded-full bg-indigo-50 text-[#5E4BE2] flex items-center justify-center mx-auto mb-2">
                      <IconCheck className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-800">
                      {selectedStatus === 'PENDING' ? 'Inbox Zero!' : 'No approval requests found'}
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      {selectedStatus === 'PENDING'
                        ? 'There are no pending requests requiring your action in this queue.'
                        : 'No records matched your selected filters or search keyword.'}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Employee info */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 text-[#5E4BE2] font-bold text-xs flex items-center justify-center shrink-0">
                          {req.user?.firstName?.[0] || 'U'}{req.user?.lastName?.[0] || ''}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-xs">
                            {req.user?.firstName} {req.user?.lastName}
                          </div>
                          <div className="text-[11px] text-slate-400 font-normal">
                            {req.user?.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Request Type badge */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 font-semibold text-[10px] text-slate-700 uppercase tracking-wide">
                        {getTypeIcon(req.type)}
                        <span>{req.type.replace('_', ' ')}</span>
                      </div>
                    </td>

                    {/* Title / Subject */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5 max-w-xs">
                        <span className="font-semibold text-slate-800 text-xs truncate">
                          {req.title || (req.type === 'CLAIM' ? `Expense Claim #${req.id}` : `${req.type.replace('_', ' ')} Request`)}
                        </span>
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
                      {req.startDate && (
                        <div className="text-[11px] text-slate-400 font-normal mt-0.5">
                          {new Date(req.startDate).toLocaleDateString()} — {new Date(req.endDate || req.startDate).toLocaleDateString()}
                          {req.days && <span className="font-semibold text-slate-600 ml-1">({req.days} days)</span>}
                        </div>
                      )}
                    </td>

                    {/* Reason / Claim Amount */}
                    <td className="px-4 py-3.5">
                      <div className="text-slate-600 text-xs max-w-xs truncate" title={req.reason}>
                        {req.reason || '—'}
                      </div>
                      {req.amount !== undefined && req.amount !== null && (
                        <div className="mt-1 inline-block text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          Claim: ₹{Number(req.amount).toLocaleString('en-IN')}
                        </div>
                      )}
                    </td>

                    {/* Applied Date */}
                    <td className="px-4 py-3.5 text-xs text-slate-600 font-medium whitespace-nowrap">
                      {new Date(req.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>

                    {/* Status badge */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border whitespace-nowrap ${
                          req.status === 'APPROVED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : req.status === 'REJECTED'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {req.status}
                      </span>
                    </td>

                    {/* Action button */}
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      {req.status === 'PENDING' ? (
                        <button
                          type="button"
                          onClick={() => handleOpenReview(req)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#5E4BE2] hover:bg-[#4d3cc9] text-white font-semibold text-xs shadow-xs hover:shadow-md transition-all cursor-pointer whitespace-nowrap active:scale-95"
                        >
                          <IconFileSearch className="w-3.5 h-3.5" />
                          <span>Review Request</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenReview(req)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs shadow-2xs transition-all cursor-pointer whitespace-nowrap"
                        >
                          <IconEye className="w-3.5 h-3.5 text-slate-400" />
                          <span>View Details</span>
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
          itemName="requests"
        />
      </div>

      {/* Comprehensive Request Review & Decision Drawer / Modal */}
      {reviewModal.open && reviewModal.req && typeof document !== 'undefined' ? (
        createPortal(
          <div className="fixed inset-0 z-[9999] overflow-hidden">
            <div
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
              onClick={() => setReviewModal({ open: false, decision: '', note: '' })}
            />
            <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10 pointer-events-none">
              <div
                className="w-screen max-w-xl bg-white shadow-2xl flex flex-col h-full border-l border-slate-200 pointer-events-auto animate-in slide-in-from-right duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-white shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5E4BE2] shrink-0">
                      {getTypeIcon(reviewModal.req.type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-[#5E4BE2] bg-indigo-50 px-2 py-0.5 rounded-md">
                          #{reviewModal.req.id} • {reviewModal.req.type.replace('_', ' ')}
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                            reviewModal.req.status === 'APPROVED'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : reviewModal.req.status === 'REJECTED'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {reviewModal.req.status}
                        </span>
                      </div>
                      <h2 className="text-base font-bold text-slate-900 mt-0.5 leading-snug">
                        {reviewModal.req.title || `${reviewModal.req.type.replace('_', ' ')} Request`}
                      </h2>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReviewModal({ open: false, decision: '', note: '' })}
                    className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
                  >
                    <IconX className="w-5 h-5" />
                  </button>
                </div>

                {/* Form / Scroll Content */}
                <form onSubmit={handleDecisionSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
                  {/* Requester Profile Banner */}
                  <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#5E4BE2] to-indigo-500 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                      {reviewModal.req.user?.firstName?.[0] || 'U'}{reviewModal.req.user?.lastName?.[0] || ''}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold text-slate-900 truncate">
                        {reviewModal.req.user?.firstName} {reviewModal.req.user?.lastName}
                      </h4>
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        {reviewModal.req.user?.email} {reviewModal.req.user?.jobTitle ? `• ${reviewModal.req.user.jobTitle}` : ''}
                      </p>
                      <span className="text-[10px] text-slate-400 block mt-1">
                        Submitted on {new Date(reviewModal.req.createdAt).toLocaleString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Request Key Metrics & Details Card */}
                  <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-3 shadow-2xs">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                      <IconCalendar className="w-4 h-4 text-slate-500" />
                      Request Specifications
                    </span>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      {reviewModal.req.startDate && (
                        <div>
                          <span className="text-slate-400 block text-[11px]">Start Date</span>
                          <span className="font-bold text-slate-800">
                            {new Date(reviewModal.req.startDate).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                      )}
                      {reviewModal.req.endDate && (
                        <div>
                          <span className="text-slate-400 block text-[11px]">End Date</span>
                          <span className="font-bold text-slate-800">
                            {new Date(reviewModal.req.endDate).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                      )}
                      {reviewModal.req.days !== undefined && reviewModal.req.days !== null && (
                        <div>
                          <span className="text-slate-400 block text-[11px]">Duration</span>
                          <span className="font-bold text-slate-800">{reviewModal.req.days} Day(s)</span>
                        </div>
                      )}
                      {reviewModal.req.amount !== undefined && reviewModal.req.amount !== null && (
                        <div>
                          <span className="text-slate-400 block text-[11px]">Total Claim Amount</span>
                          <span className="font-mono font-bold text-emerald-700 text-sm">
                            ₹{Number(reviewModal.req.amount).toLocaleString('en-IN')}
                          </span>
                        </div>
                      )}
                      {reviewModal.req.leaveType?.name && (
                        <div>
                          <span className="text-slate-400 block text-[11px]">Leave Category</span>
                          <span className="font-bold text-slate-800">{reviewModal.req.leaveType.name}</span>
                        </div>
                      )}
                      {reviewModal.req.type === 'REGULARIZATION' && (
                        <>
                          <div>
                            <span className="text-slate-400 block text-[11px]">Correction Scope</span>
                            <span className="font-bold text-[#5E4BE2]">
                              {reviewModal.req.meta?.regularizeType === 'CHECK_IN_ONLY'
                                ? 'Check-in Time Only'
                                : reviewModal.req.meta?.regularizeType === 'CHECK_OUT_ONLY'
                                ? 'Check-out Time Only'
                                : 'Full Day (Check-in & Check-out)'}
                            </span>
                          </div>
                          {reviewModal.req.meta?.requestedCheckIn && (
                            <div>
                              <span className="text-slate-400 block text-[11px]">Requested Check-in</span>
                              <span className="font-mono font-bold text-slate-800">
                                {reviewModal.req.meta.requestedCheckIn}
                              </span>
                            </div>
                          )}
                          <div>
                            <span className="text-slate-400 block text-[11px]">Requested Check-out</span>
                            <span className="font-mono font-bold text-slate-800">
                              {reviewModal.req.meta?.requestedCheckOut
                                ? reviewModal.req.meta.requestedCheckOut
                                : 'Not Required (Ongoing Shift / Check-in only)'}
                            </span>
                          </div>
                        </>
                      )}
                      {reviewModal.req.type === 'COMP_OFF' && (
                        <>
                          <div>
                            <span className="text-slate-400 block text-[11px]">Work Occasion</span>
                            <span className="font-bold text-slate-800">
                              {reviewModal.req.meta?.workType === 'WEEKEND' ? 'Weekend Work' : 'Holiday Work'}
                              {reviewModal.req.meta?.dayOfWeek ? ` (${reviewModal.req.meta.dayOfWeek})` : ''}
                            </span>
                          </div>
                          {reviewModal.req.meta?.holidayName && (
                            <div>
                              <span className="text-slate-400 block text-[11px]">Holiday Name</span>
                              <span className="font-bold text-slate-800">
                                {reviewModal.req.meta.holidayName}
                              </span>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Attachment preview if submitted */}
                    {reviewModal.req.meta?.attachmentUrl && (
                      <div className="pt-2 border-t border-slate-100 space-y-2">
                        <span className="text-slate-400 block text-[11px] font-semibold">Supporting Attachment</span>
                        
                        {/* Inline Image Thumbnail if image (logs screenshot, email approval, receipt) */}
                        {reviewModal.req.meta.attachmentUrl.startsWith('data:image') && (
                          <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50 p-1.5 max-w-sm">
                            <img
                              src={reviewModal.req.meta.attachmentUrl}
                              alt="Attachment preview"
                              className="w-full max-h-52 object-contain rounded-lg bg-white"
                            />
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openAttachmentSafe(reviewModal.req?.meta?.attachmentUrl, reviewModal.req?.meta?.attachmentName)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200/80 text-[#5E4BE2] font-bold text-xs hover:bg-indigo-100 transition-colors cursor-pointer"
                          >
                            <IconEye className="w-3.5 h-3.5" />
                            <span>{reviewModal.req.meta.attachmentName || 'View Document'}</span>
                          </button>
                          <a
                            href={reviewModal.req.meta.attachmentUrl}
                            download={reviewModal.req.meta.attachmentName || 'supporting-attachment'}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs transition-colors cursor-pointer"
                            title="Download attachment file"
                          >
                            <IconDownload className="w-3.5 h-3.5 text-slate-500" />
                            <span>Download</span>
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Reason / Statement Box */}
                    <div className="pt-2 border-t border-slate-100">
                      <span className="text-slate-400 block text-[11px] mb-1 font-semibold">Employee Stated Reason / Note</span>
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700 leading-relaxed font-medium italic">
                        "{reviewModal.req.reason || 'No specific reason entered by employee.'}"
                      </div>
                    </div>
                  </div>

                  {/* Review & Decision Section */}
                  {reviewModal.req.status === 'PENDING' ? (
                    <div className="p-4 bg-indigo-50/40 rounded-2xl border border-indigo-100 space-y-4">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <IconChecklist className="w-4 h-4 text-[#5E4BE2]" />
                          Reviewer Decision &amp; Feedback
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Review the details above, then select your decision action and add your comments below.
                        </p>
                      </div>

                      {/* Dropdown for Decision */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          Select Decision Action <span className="text-rose-500">*</span>
                        </label>
                        <select
                          value={reviewModal.decision}
                          onChange={(e) =>
                            setReviewModal({
                              ...reviewModal,
                              decision: e.target.value as any,
                            })
                          }
                          className="w-full px-3.5 py-2.5 text-xs font-semibold bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:border-[#5E4BE2] focus:ring-2 focus:ring-[#5E4BE2]/20 text-slate-800 cursor-pointer shadow-2xs"
                        >
                          <option value="">-- Choose Decision Action --</option>
                          <option value="APPROVED">Approve Request</option>
                          <option value="REJECTED">Reject Request</option>
                        </select>
                      </div>

                      {/* Comment Box */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-bold text-slate-700">
                            Decision Comment / Remarks
                          </label>
                          {reviewModal.decision === 'REJECTED' && (
                            <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                              Required for rejection
                            </span>
                          )}
                        </div>
                        <textarea
                          rows={3}
                          value={reviewModal.note}
                          onChange={(e) => setReviewModal({ ...reviewModal, note: e.target.value })}
                          placeholder={
                            reviewModal.decision === 'REJECTED'
                              ? 'Enter justification or feedback for the employee...'
                              : 'Add approval note or instructions for the employee (optional)...'
                          }
                          className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:border-[#5E4BE2] focus:ring-2 focus:ring-[#5E4BE2]/20 transition-all placeholder:text-slate-400 font-medium text-slate-800"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-1.5 text-xs">
                      <span className="font-bold text-slate-800 block">Decision Record</span>
                      <p className="text-slate-600">
                        This request is already finalized as <strong className="uppercase">{reviewModal.req.status}</strong>.
                      </p>
                    </div>
                  )}

                  {/* Sticky Footer Actions */}
                  <div className="sticky bottom-0 -mx-6 -mb-6 p-4 bg-white/95 backdrop-blur-xs border-t border-slate-100 flex items-center justify-end gap-2.5 mt-6">
                    <button
                      type="button"
                      onClick={() => setReviewModal({ open: false, decision: '', note: '' })}
                      className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
                    >
                      Close
                    </button>

                    {reviewModal.req.status === 'PENDING' && (
                      <button
                        type="submit"
                        disabled={
                          isSubmitting ||
                          !reviewModal.decision ||
                          (reviewModal.decision === 'REJECTED' && !reviewModal.note.trim())
                        }
                        className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl text-white shadow-xs transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                          reviewModal.decision === 'APPROVED'
                            ? 'bg-emerald-600 hover:bg-emerald-700'
                            : reviewModal.decision === 'REJECTED'
                            ? 'bg-rose-600 hover:bg-rose-700'
                            : 'bg-slate-700 hover:bg-slate-800'
                        }`}
                      >
                        {isSubmitting ? (
                          <span>Submitting...</span>
                        ) : (
                          <>
                            {reviewModal.decision === 'APPROVED' ? (
                              <IconCheck className="w-4 h-4" />
                            ) : reviewModal.decision === 'REJECTED' ? (
                              <IconX className="w-4 h-4" />
                            ) : null}
                            <span>
                              {reviewModal.decision === 'APPROVED'
                                ? 'Confirm Approval'
                                : reviewModal.decision === 'REJECTED'
                                ? 'Confirm Rejection'
                                : 'Select Decision Action'}
                            </span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          </div>,
          document.body
        )
      ) : null}
    </div>
  );
};

export default ApprovalsDeskPage;
