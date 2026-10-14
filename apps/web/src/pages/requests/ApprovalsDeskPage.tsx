import React, { useState, useEffect, useMemo } from 'react';
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
    reqId?: number;
    decision?: 'APPROVED' | 'REJECTED';
    note: string;
  }>({ open: false, note: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // KPI stats matching EmployeesPage structure
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
        return <IconCalendar className="w-4 h-4 text-purple-600" />;
      case 'REGULARIZATION':
        return <IconClock className="w-4 h-4 text-blue-600" />;
      case 'CLAIM':
        return <IconReceipt2 className="w-4 h-4 text-emerald-600" />;
      case 'GOAL':
        return <IconTarget className="w-4 h-4 text-amber-600" />;
      case 'COMP_OFF':
        return <IconCalendar className="w-4 h-4 text-indigo-600" />;
      default:
        return <IconChecklist className="w-4 h-4 text-[#5E4BE2]" />;
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
              Approvals & Decisions Desk
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
          className="flex items-center gap-2 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 shadow-2xs transition-all cursor-pointer"
        >
          <IconRefresh className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* ===================== ROW 1: 4 KPI STAT CARDS ===================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Pending */}
        <div
          onClick={() => setSelectedStatus('PENDING')}
          className={`bg-white rounded-2xl border p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-all cursor-pointer ${
            selectedStatus === 'PENDING'
              ? 'border-amber-300 ring-2 ring-amber-400/30'
              : 'border-slate-200'
          }`}
        >
          <div>
            <span className="text-xs font-bold text-slate-500">Pending Review</span>
            <div className="text-2xl font-black text-slate-900 mt-1 leading-none tracking-tight">
              {kpiStats.pending}
            </div>
            <div className="text-[11px] font-bold text-amber-600 mt-2">
              Awaiting authorization
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
            <IconClock className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Approved */}
        <div
          onClick={() => setSelectedStatus('APPROVED')}
          className={`bg-white rounded-2xl border p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-all cursor-pointer ${
            selectedStatus === 'APPROVED'
              ? 'border-emerald-300 ring-2 ring-emerald-400/30'
              : 'border-slate-200'
          }`}
        >
          <div>
            <span className="text-xs font-bold text-slate-500">Approved Records</span>
            <div className="text-2xl font-black text-slate-900 mt-1 leading-none tracking-tight">
              {kpiStats.approved}
            </div>
            <div className="text-[11px] font-bold text-emerald-600 mt-2">
              Authorized & finalized
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <IconCheck className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Rejected */}
        <div
          onClick={() => setSelectedStatus('REJECTED')}
          className={`bg-white rounded-2xl border p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-all cursor-pointer ${
            selectedStatus === 'REJECTED'
              ? 'border-rose-300 ring-2 ring-rose-400/30'
              : 'border-slate-200'
          }`}
        >
          <div>
            <span className="text-xs font-bold text-slate-500">Returned / Rejected</span>
            <div className="text-2xl font-black text-slate-900 mt-1 leading-none tracking-tight">
              {kpiStats.rejected}
            </div>
            <div className="text-[11px] font-bold text-rose-600 mt-2">
              Sent back with feedback
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
            <IconX className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Total */}
        <div
          onClick={() => setSelectedStatus('ALL')}
          className={`bg-white rounded-2xl border p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-all cursor-pointer ${
            selectedStatus === 'ALL'
              ? 'border-indigo-300 ring-2 ring-indigo-400/30'
              : 'border-slate-200'
          }`}
        >
          <div>
            <span className="text-xs font-bold text-slate-500">Total Request Volume</span>
            <div className="text-2xl font-black text-slate-900 mt-1 leading-none tracking-tight">
              {kpiStats.total}
            </div>
            <div className="text-[11px] font-bold text-[#5E4BE2] mt-2">
              Full audit trail
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5E4BE2]">
            <IconChecklist className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ===================== ROW 2: SEARCH & FILTERS BAR ===================== */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <IconSearch className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by employee name, title or reason..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 text-xs font-medium bg-slate-50/70 border border-slate-200/80 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#5E4BE2]/20 focus:border-[#5E4BE2] transition-all placeholder:text-slate-400 text-slate-800"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
            >
              <IconX className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category Dropdown & Status Pills */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Request Category Dropdown */}
          <div className="min-w-[190px]">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-2.5 text-xs font-semibold bg-slate-50/70 border border-slate-200/80 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#5E4BE2]/20 focus:border-[#5E4BE2] transition-all text-slate-700 cursor-pointer"
            >
              <option value="">All Request Types</option>
              <option value="LEAVE">Leaves</option>
              <option value="REGULARIZATION">Regularizations</option>
              <option value="CLAIM">Expense Claims</option>
              <option value="COMP_OFF">Comp-Off</option>
              <option value="GOAL">Performance Goals</option>
            </select>
          </div>

          {/* Status Toggle Pills */}
          <div className="flex items-center bg-slate-50/80 border border-slate-200/70 p-1 rounded-xl">
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
                      ? 'bg-white text-[#5E4BE2] shadow-2xs'
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

      {/* ===================== ROW 3: REQUESTS LIST & EMPTY STATE ===================== */}
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm animate-pulse space-y-3"
            >
              <div className="w-48 h-4 bg-slate-200 rounded-md" />
              <div className="w-72 h-3 bg-slate-100 rounded-md" />
            </div>
          ))
        ) : filteredRequests.length === 0 ? (
          /* Empty State matching EmployeesPage / LeaveTypesPage */
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-indigo-50 text-[#5E4BE2] flex items-center justify-center mx-auto mb-3">
              <IconCheck className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">
              {selectedStatus === 'PENDING' ? 'Inbox Zero!' : 'No requests found'}
            </h4>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              {selectedStatus === 'PENDING'
                ? 'There are no pending approvals requiring your attention in this queue.'
                : 'No requests matched your current filter criteria.'}
            </p>
            {selectedStatus === 'PENDING' && kpiStats.approved > 0 && (
              <button
                onClick={() => setSelectedStatus('APPROVED')}
                className="mt-4 px-4 py-2 bg-gradient-to-r from-[#5E4BE2] to-[#4B39C3] hover:from-[#5340D4] hover:to-[#4130B4] text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
              >
                View Approved History ({kpiStats.approved})
              </button>
            )}
          </div>
        ) : (
          /* Requests Cards */
          filteredRequests.map((req) => (
            <div
              key={req.id}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-2 min-w-0 flex-1">
                {/* Meta Header */}
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-lg bg-slate-100 flex items-center justify-center">
                    {getTypeIcon(req.type)}
                  </span>
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    {req.type.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-slate-300">•</span>
                  <span className="text-xs text-slate-400">
                    Applied on {new Date(req.createdAt).toLocaleDateString()}
                  </span>
                  <span
                    className={`ml-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                      req.status === 'APPROVED'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : req.status === 'REJECTED'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    {req.status}
                  </span>
                </div>

                {/* Employee Info */}
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#5E4BE2] to-[#4B39C3] text-white font-bold text-xs flex items-center justify-center shrink-0">
                    {req.user?.firstName?.[0] || 'U'}{req.user?.lastName?.[0] || ''}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">
                      {req.user?.firstName} {req.user?.lastName}
                    </h3>
                    <p className="text-xs text-slate-400">{req.user?.jobTitle || req.user?.email}</p>
                  </div>
                </div>

                {/* Title */}
                {req.title && (
                  <h4 className="text-xs font-bold text-slate-900 leading-snug">
                    {req.title}
                  </h4>
                )}

                {/* Reason callout */}
                <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="font-bold text-slate-800">
                    {req.type === 'GOAL' ? 'Goal Description:' : 'Reason:'}
                  </span>{' '}
                  {req.reason}
                </p>

                {/* Period / Amount */}
                <div className="flex flex-wrap items-center gap-2.5 text-xs">
                  {req.startDate && (
                    <div className="text-slate-500 flex items-center gap-1.5">
                      <span className="font-semibold text-slate-700">Period:</span>
                      <span>
                        {new Date(req.startDate).toLocaleDateString()} — {new Date(req.endDate || req.startDate).toLocaleDateString()}
                      </span>
                      {req.days && <span className="font-bold text-slate-800">({req.days} days)</span>}
                    </div>
                  )}

                  {req.amount !== undefined && req.amount !== null && (
                    <div className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      Claim Amount: ₹{Number(req.amount).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              {req.status === 'PENDING' && (
                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  <button
                    onClick={() =>
                      setActionModal({ open: true, reqId: req.id, decision: 'REJECTED', note: '' })
                    }
                    className="px-4 py-2 rounded-xl border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <IconX className="w-4 h-4" />
                    <span>Reject</span>
                  </button>
                  <button
                    onClick={() =>
                      setActionModal({ open: true, reqId: req.id, decision: 'APPROVED', note: '' })
                    }
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <IconCheck className="w-4 h-4" />
                    <span>Approve</span>
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Decision Note Modal */}
      {actionModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6 border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">
                Confirm {actionModal.decision === 'APPROVED' ? 'Approval' : 'Rejection'}
              </h3>
              <button
                onClick={() => setActionModal({ open: false, note: '' })}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <IconX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDecisionSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Optional Feedback / Approver Note
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Approved, please hand over shift duties..."
                  value={actionModal.note}
                  onChange={(e) => setActionModal({ ...actionModal, note: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-[#5E4BE2] resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActionModal({ open: false, note: '' })}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-5 py-2 text-xs font-bold rounded-xl text-white shadow-sm disabled:opacity-50 cursor-pointer ${
                    actionModal.decision === 'APPROVED'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {isSubmitting ? 'Recording...' : `Confirm ${actionModal.decision}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalsDeskPage;
