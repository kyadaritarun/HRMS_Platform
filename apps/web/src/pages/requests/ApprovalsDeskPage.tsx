import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import api from '../../api/client';
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
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [allMetricsRequests, setAllMetricsRequests] = useState<ApprovalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('PENDING');
  const [search, setSearch] = useState<string>('');
  const [actionModal, setActionModal] = useState<{
    open: boolean;
    req?: ApprovalRequest;
    reqId?: number;
    decision?: 'APPROVED' | 'REJECTED';
    note: string;
  }>({ open: false, note: '' });
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
      const scope = user?.role === 'COMPANY_ADMIN' || user?.role === 'HR' ? 'company' : 'assigned';
      const res = await api.get('/requests', { params: { scope, pageSize: 100 } });
      setAllMetricsRequests(res.data?.items || []);
    } catch (err) {
      console.error('Failed to load metric overview requests:', err);
    }
  };

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const scope = user?.role === 'COMPANY_ADMIN' || user?.role === 'HR' ? 'company' : 'assigned';
      const params: any = { scope };
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
  }, [selectedType, selectedStatus]);

  const handleDecisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionModal.reqId || !actionModal.decision) return;
    setIsSubmitting(true);
    try {
      await api.patch(`/requests/${actionModal.reqId}/decision`, {
        status: actionModal.decision,
        note: actionModal.note.trim() || undefined,
      });
      setActionModal({ open: false, note: '' });
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
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5E4BE2] shrink-0">
              <IconChecklist className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Approval Requests
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Review, authorize, or return leave requests, attendance regularizations, and performance goals.
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

          {/* Right Controls: Category & Status */}
          <div className="flex flex-wrap items-center gap-2.5">
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
            <thead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 bg-slate-50/50">
              <tr>
                <th className="px-4 py-3 whitespace-nowrap">EMPLOYEE</th>
                <th className="px-4 py-3 whitespace-nowrap">TYPE</th>
                <th className="px-4 py-3 whitespace-nowrap">REQUEST TITLE</th>
                <th className="px-4 py-3 whitespace-nowrap">REASON &amp; DETAILS</th>
                <th className="px-4 py-3 whitespace-nowrap">APPLIED ON</th>
                <th className="px-4 py-3 whitespace-nowrap">STATUS</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">ACTIONS</th>
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
                filteredRequests.map((req) => (
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
                      <div className="font-semibold text-slate-800 text-xs max-w-xs truncate">
                        {req.title || (req.type === 'CLAIM' ? `Expense Claim #${req.id}` : `${req.type.replace('_', ' ')} Request`)}
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

                    {/* Action buttons */}
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      {req.status === 'PENDING' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              setActionModal({ open: true, req, reqId: req.id, decision: 'REJECTED', note: '' })
                            }
                            className="px-2.5 py-1.5 rounded-lg border border-rose-200 text-rose-700 bg-rose-50/60 hover:bg-rose-100 font-bold text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <IconX className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setActionModal({ open: true, req, reqId: req.id, decision: 'APPROVED', note: '' })
                            }
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <IconCheck className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] font-medium text-slate-400">Decided</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Decision Note Modal with Portal */}
      {actionModal.open && typeof document !== 'undefined' ? (
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6 border border-slate-100 animate-in zoom-in-95">
              {(() => {
                const targetReq = actionModal.req || requests.find((r) => r.id === actionModal.reqId);
                return (
                  <>
                    <div className="flex items-start justify-between mb-4 gap-3">
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                            actionModal.decision === 'APPROVED'
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-200/80'
                              : 'bg-rose-50 text-rose-600 border-rose-200/80'
                          }`}
                        >
                          {actionModal.decision === 'APPROVED' ? (
                            <IconCheck className="w-5 h-5" />
                          ) : (
                            <IconX className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-slate-900 leading-tight">
                            {getRequestTypeHeading(targetReq?.type, actionModal.decision)}
                          </h3>
                          {targetReq?.user && (
                            <p className="text-xs text-slate-500 mt-1">
                              Requested by <span className="font-semibold text-slate-800">{targetReq.user.firstName} {targetReq.user.lastName}</span>
                              {targetReq.days ? <span className="text-slate-600 font-medium"> ({targetReq.days} days)</span> : null}
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActionModal({ open: false, note: '' })}
                        className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 cursor-pointer shrink-0"
                      >
                        <IconX className="w-4 h-4" />
                      </button>
                    </div>

                    <form onSubmit={handleDecisionSubmit} className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          {actionModal.decision === 'APPROVED'
                            ? 'Approver Remarks / Note (Optional)'
                            : 'Reason for Rejection (Optional)'}
                        </label>
                        <textarea
                          rows={3}
                          placeholder={
                            actionModal.decision === 'APPROVED'
                              ? 'e.g. Approved. Please coordinate handover before taking leave...'
                              : 'e.g. Please provide additional documentation or reschedule...'
                          }
                          value={actionModal.note}
                          onChange={(e) => setActionModal({ ...actionModal, note: e.target.value })}
                          className="w-full px-3.5 py-2.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-[#5E4BE2] focus:ring-2 focus:ring-[#5E4BE2]/10 resize-none transition-all placeholder:text-slate-400"
                        />
                      </div>

                      <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setActionModal({ open: false, note: '' })}
                          className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className={`inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-xl text-white shadow-xs disabled:opacity-50 cursor-pointer transition-colors ${
                            actionModal.decision === 'APPROVED'
                              ? 'bg-emerald-600 hover:bg-emerald-700'
                              : 'bg-rose-600 hover:bg-rose-700'
                          }`}
                        >
                          {isSubmitting ? (
                            <span>Recording...</span>
                          ) : (
                            <>
                              {actionModal.decision === 'APPROVED' ? (
                                <IconCheck className="w-3.5 h-3.5" />
                              ) : (
                                <IconX className="w-3.5 h-3.5" />
                              )}
                              <span>{actionModal.decision === 'APPROVED' ? 'Approve Request' : 'Reject Request'}</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </>
                );
              })()}
            </div>
          </div>,
          document.body
        )
      ) : null}
    </div>
  );
};

export default ApprovalsDeskPage;
