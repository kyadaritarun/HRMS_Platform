import React, { useState, useEffect, useMemo } from 'react';
import {
  IconPlus,
  IconRefresh,
  IconSearch,
  IconFileText,
  IconUser,
  IconBriefcase,
  IconClock,
  IconMessageDots,
  IconMessageCheck,
  IconX,
  IconLoader2,
  IconFilter,
  IconChevronDown,
} from '@tabler/icons-react';
import api from '../../api/client';
import TablePagination from '../../components/common/TablePagination';
import { useAuth } from '../../context/AuthContext';
import { ReferLeadModal } from '../../components/referrals/ReferLeadModal';
import { ResumeViewerModal } from '../../components/referrals/ResumeViewerModal';

// ----------------------------------------------------------------------------
// HR Feedback Modal Dialog
// ----------------------------------------------------------------------------
interface HRFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  referral: any | null;
  onSuccess: () => void;
  onViewResume?: (url: string, name?: string, role?: string) => void;
}

const HRFeedbackModal: React.FC<HRFeedbackModalProps> = ({
  isOpen,
  onClose,
  referral,
  onSuccess,
  onViewResume,
}) => {
  const [status, setStatus] = useState('SCREENING');
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (referral) {
      setStatus(referral.status || 'SCREENING');
      setFeedback(referral.hrFeedback || '');
      setError(null);
    }
  }, [referral]);

  if (!isOpen || !referral) return null;

  const employeeName = referral.candidateName || referral.ownerName || 'Employee';
  const jobRole = referral.jobRole || referral.businessName || 'Position';
  const referrer = referral.referrerName || 'Employee';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await api.patch(`/referrals/${referral.id}/status`, {
        status,
        hrFeedback: feedback.trim(),
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to save feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10 pointer-events-none">
        <div
          className="w-screen max-w-lg bg-white shadow-2xl border-l border-slate-200 flex flex-col h-full animate-in slide-in-from-right duration-300 pointer-events-auto overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-white shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shrink-0">
                <IconMessageDots className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">HR Review &amp; Feedback</h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  For {employeeName} • Referred by {referrer}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Close drawer"
            >
              <IconX className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
              {error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                  {error}
                </div>
              )}

              {/* Referral Details Card */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Referred Employee:</span>
                  <span className="font-bold text-slate-900">{employeeName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Position &amp; Job ID:</span>
                  <span className="font-semibold text-indigo-700">
                    {jobRole} {referral.jobId ? `(${referral.jobId})` : ''}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Referred By:</span>
                  <span className="font-semibold text-slate-800">
                    {referrer} {referral.referrerEmail ? `(${referral.referrerEmail})` : ''}
                  </span>
                </div>
                {referral.resumeUrl && (
                  <div className="flex justify-between items-center pt-2 border-t border-slate-200/60">
                    <span className="text-slate-500 font-medium">Resume:</span>
                    <button
                      type="button"
                      onClick={() => onViewResume?.(referral.resumeUrl, employeeName, jobRole)}
                      className="inline-flex items-center gap-1 font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                    >
                      <IconFileText className="w-3.5 h-3.5" />
                      <span>View Resume</span>
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Hiring Pipeline Stage <span className="text-rose-500">*</span>
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-semibold focus:outline-hidden focus:border-indigo-500 cursor-pointer"
                >
                  <option value="NEW_LEAD">Referred / Under Review</option>
                  <option value="SCREENING">Screening</option>
                  <option value="INTERVIEWING">Interviewing</option>
                  <option value="OFFERED">Offer Extended</option>
                  <option value="HIRED">Hired</option>
                  <option value="REJECTED">Not Selected</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  HR Feedback for Referring Employee <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={6}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="e.g. Employee resume shortlisted. Technical round scheduled for Tuesday at 3 PM with engineering team..."
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50/60 border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 focus:bg-white transition-all resize-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  This feedback is visible to {referrer} in their referral table and sent via email notification.
                </p>
              </div>
            </div>

            {/* Pinned Action Footer */}
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50/70 shrink-0">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting && <IconLoader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Save &amp; Send Feedback</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------------
// Main Page: Employee Referrals (Styled matching Shift Management)
// ----------------------------------------------------------------------------
export const ReferEarnPage: React.FC = () => {
  const { user } = useAuth();
  const isHrOrAdmin = user?.role === 'COMPANY_ADMIN' || user?.role === 'HR';

  const [activeTab, setActiveTab] = useState<'my_referrals' | 'company_leads'>(
    isHrOrAdmin ? 'company_leads' : 'my_referrals'
  );

  const [isReferModalOpen, setIsReferModalOpen] = useState(false);
  const [selectedForFeedback, setSelectedForFeedback] = useState<any | null>(null);
  const [viewingResume, setViewingResume] = useState<{
    url: string;
    name: string;
    role?: string;
  } | null>(null);

  const handleOpenResume = (url: string, name?: string, role?: string) => {
    if (!url) return;
    setViewingResume({
      url,
      name: name || 'Candidate',
      role,
    });
  };

  const [loading, setLoading] = useState(true);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [companyLeads, setCompanyLeads] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/referrals/my');
      if (res.data?.success) {
        setReferrals(res.data.referrals || []);
      }

      if (isHrOrAdmin) {
        try {
          const compRes = await api.get('/referrals/company');
          if (compRes.data?.success) {
            setCompanyLeads(compRes.data.leads || []);
          }
        } catch {
          // Graceful fallback
        }
      }
    } catch (err) {
      console.error('Failed to load referral data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateStatus = async (leadId: number, newStatus: string) => {
    try {
      await api.patch(`/referrals/${leadId}/status`, { status: newStatus });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update status');
    }
  };

  // Filtered lists
  const filteredReferrals = useMemo(() => {
    return referrals.filter((r) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (r.candidateName || r.ownerName)?.toLowerCase().includes(q) ||
        (r.jobRole || r.businessName)?.toLowerCase().includes(q) ||
        r.jobId?.toLowerCase().includes(q) ||
        r.email?.toLowerCase().includes(q) ||
        r.mobileNumber?.includes(q) ||
        r.hrFeedback?.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (statusFilter !== 'ALL') {
        if (statusFilter === 'NEW_LEAD' && r.status !== 'NEW_LEAD' && r.status !== 'REFERRED') return false;
        if (statusFilter !== 'NEW_LEAD' && r.status !== statusFilter) return false;
      }

      return true;
    });
  }, [referrals, searchQuery, statusFilter]);

  const filteredCompanyLeads = useMemo(() => {
    return companyLeads.filter((r) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (r.candidateName || r.ownerName)?.toLowerCase().includes(q) ||
        (r.jobRole || r.businessName)?.toLowerCase().includes(q) ||
        r.jobId?.toLowerCase().includes(q) ||
        r.referrerName?.toLowerCase().includes(q) ||
        r.referrerEmail?.toLowerCase().includes(q) ||
        r.email?.toLowerCase().includes(q) ||
        r.hrFeedback?.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (statusFilter !== 'ALL') {
        if (statusFilter === 'NEW_LEAD' && r.status !== 'NEW_LEAD' && r.status !== 'REFERRED') return false;
        if (statusFilter !== 'NEW_LEAD' && r.status !== statusFilter) return false;
      }

      return true;
    });
  }, [companyLeads, searchQuery, statusFilter]);

  // Active items and pagination
  const activeItems = activeTab === 'company_leads' ? filteredCompanyLeads : filteredReferrals;
  const totalPages = Math.max(1, Math.ceil(activeItems.length / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedItems = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return activeItems.slice(start, start + pageSize);
  }, [activeItems, safeCurrentPage, pageSize]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'HIRED':
      case 'CONVERTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Hired
          </span>
        );
      case 'OFFERED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
            Offer Extended
          </span>
        );
      case 'INTERVIEWING':
      case 'DEMO_SCHEDULED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Interviewing
          </span>
        );
      case 'SCREENING':
      case 'CONTACTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
            Screening
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
            Not Selected
          </span>
        );
      case 'NEW_LEAD':
      case 'REFERRED':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            Referred / Under Review
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* 1. Header (Matching Shift Management) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <IconBriefcase className="w-5 h-5 text-indigo-600 shrink-0" />
            <span>Employee Referrals</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Refer qualified peers for open company positions, review employee referral profiles, and track HR feedback.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsReferModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <IconPlus className="w-4 h-4" />
            <span>Refer an Employee</span>
          </button>
        </div>
      </div>

      {/* 2. Main Content Card (Matching Shift Management & Departments) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
        {/* Controls Bar: Tabs on left, Search & Filters on right */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Left: Tab Switcher */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            {isHrOrAdmin && (
              <button
                type="button"
                onClick={() => setActiveTab('company_leads')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'company_leads'
                    ? 'bg-white text-indigo-600 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Employee Referrals ({companyLeads.length})
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveTab('my_referrals')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'my_referrals'
                  ? 'bg-white text-indigo-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              My Referrals ({referrals.length})
            </button>
          </div>

          {/* Right Controls: Search, Status Filter, Refresh */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative min-w-[200px] sm:w-64">
              <IconSearch className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search employees, roles, referrers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500 text-slate-800 placeholder-slate-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  title="Clear search"
                >
                  <IconX className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Status Filter */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none pl-8 pr-7 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500 text-slate-700 cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="NEW_LEAD">Referred / Under Review</option>
                <option value="SCREENING">Screening</option>
                <option value="INTERVIEWING">Interviewing</option>
                <option value="OFFERED">Offer Extended</option>
                <option value="HIRED">Hired</option>
                <option value="REJECTED">Not Selected</option>
              </select>
              <IconFilter className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <IconChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <button
              type="button"
              onClick={fetchData}
              title="Refresh table"
              className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer shrink-0"
            >
              <IconRefresh className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 3. Table Structure (Matching Shift Management & Departments) */}
        <div className="overflow-x-auto border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden">
          {loading ? (
            <div className="p-16 text-center text-slate-500 font-medium flex flex-col items-center justify-center gap-2 bg-white">
              <IconLoader2 className="w-6 h-6 animate-spin text-indigo-600" />
              <span className="text-xs font-semibold text-slate-600">Loading employee referrals...</span>
            </div>
          ) : activeItems.length === 0 ? (
            <div className="p-16 text-center text-slate-500 font-medium flex flex-col items-center justify-center gap-3 bg-white">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <IconBriefcase className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">No employee referrals found</h4>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {searchQuery || statusFilter !== 'ALL'
                    ? 'Try adjusting your search query or status filter.'
                    : 'Click "Refer an Employee" to submit your first referral.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsReferModalOpen(true)}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              >
                <IconPlus className="w-4 h-4" />
                <span>Refer an Employee</span>
              </button>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-[#e5e7eb] text-xs font-bold text-slate-900 border-b border-slate-300">
                {activeTab === 'company_leads' ? (
                  <tr>
                    <th className="px-5 py-3.5">Employee &amp; Role</th>
                    <th className="px-4 py-3.5">Referred By</th>
                    <th className="px-4 py-3.5">Contact</th>
                    <th className="px-4 py-3.5">Resume</th>
                    <th className="px-4 py-3.5">Hiring Stage</th>
                    <th className="px-5 py-3.5">HR Review &amp; Feedback</th>
                  </tr>
                ) : (
                  <tr>
                    <th className="px-5 py-3.5">Employee &amp; Role</th>
                    <th className="px-4 py-3.5">Job ID</th>
                    <th className="px-4 py-3.5">Contact Details</th>
                    <th className="px-4 py-3.5">Resume</th>
                    <th className="px-4 py-3.5">Submitted On</th>
                    <th className="px-4 py-3.5">Hiring Status</th>
                    <th className="px-5 py-3.5">HR Feedback</th>
                  </tr>
                )}
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {activeTab === 'company_leads'
                  ? (paginatedItems.map((lead) => {
                      const cName = lead.candidateName || lead.ownerName || 'Employee';
                      const jRole = lead.jobRole || lead.businessName || 'Position';
                      return (
                        <tr key={lead.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="font-bold text-slate-900">{cName}</div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                              <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">
                                {jRole}
                              </span>
                              {lead.jobId && <span className="font-mono text-slate-400 text-[10px]">({lead.jobId})</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <IconUser className="w-3.5 h-3.5 text-indigo-600" />
                              <span>{lead.referrerName || 'Employee'}</span>
                            </div>
                            <div className="text-[11px] text-slate-500">{lead.referrerEmail}</div>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="text-slate-800 font-mono text-xs">+91 {lead.mobileNumber}</div>
                            <div className="text-[11px] text-slate-500">{lead.email}</div>
                          </td>
                          <td className="px-4 py-3.5">
                            {lead.resumeUrl ? (
                              <button
                                type="button"
                                onClick={() =>
                                  handleOpenResume(
                                    lead.resumeUrl,
                                    lead.candidateName || lead.ownerName,
                                    lead.jobRole || lead.businessName
                                  )
                                }
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs border border-indigo-200 transition-colors cursor-pointer"
                              >
                                <IconFileText className="w-3.5 h-3.5" />
                                <span>View Resume</span>
                              </button>
                            ) : (
                              <span className="text-slate-400 text-xs italic">No resume</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            <select
                              value={lead.status}
                              onChange={(e) => handleUpdateStatus(lead.id, e.target.value)}
                              className="px-2.5 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-semibold focus:outline-hidden focus:border-indigo-500 cursor-pointer"
                            >
                              <option value="NEW_LEAD">Referred / Under Review</option>
                              <option value="SCREENING">Screening</option>
                              <option value="INTERVIEWING">Interviewing</option>
                              <option value="OFFERED">Offer Extended</option>
                              <option value="HIRED">Hired</option>
                              <option value="REJECTED">Not Selected</option>
                            </select>
                          </td>
                          <td className="px-5 py-3.5 max-w-xs">
                            {lead.hrFeedback ? (
                              <div className="space-y-1">
                                <p className="text-xs text-slate-700 line-clamp-2 bg-slate-50 p-2 rounded-xl border border-slate-200/80">
                                  "{lead.hrFeedback}"
                                </p>
                                <button
                                  type="button"
                                  onClick={() => setSelectedForFeedback(lead)}
                                  className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer"
                                >
                                  <IconMessageDots className="w-3 h-3" />
                                  <span>Edit Feedback</span>
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setSelectedForFeedback(lead)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs border border-indigo-200 transition-colors cursor-pointer"
                              >
                                <IconMessageDots className="w-3.5 h-3.5" />
                                <span>Give Feedback</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    }))
                  : (paginatedItems.map((r) => {
                      const cName = r.candidateName || r.ownerName || 'Employee';
                      const jRole = r.jobRole || r.businessName || 'Position';
                      const displayNotes = r.notes && !r.notes.startsWith('Job ID:') ? r.notes : null;
                      return (
                        <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="font-bold text-slate-900">{cName}</div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                              <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">
                                {jRole}
                              </span>
                              {displayNotes && <span className="text-slate-400 font-normal truncate max-w-[150px]">• {displayNotes}</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 font-mono text-xs font-semibold text-slate-700">
                            {r.jobId || 'N/A'}
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="text-slate-800 font-mono text-xs">+91 {r.mobileNumber}</div>
                            <div className="text-[11px] text-slate-500">{r.email}</div>
                          </td>
                          <td className="px-4 py-3.5">
                            {r.resumeUrl ? (
                              <button
                                type="button"
                                onClick={() => handleOpenResume(r.resumeUrl, cName, jRole)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs border border-indigo-200 transition-colors cursor-pointer"
                              >
                                <IconFileText className="w-3.5 h-3.5" />
                                <span>View Resume</span>
                              </button>
                            ) : (
                              <span className="text-slate-400 text-xs italic">No resume</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-slate-500">
                            {r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                          </td>
                          <td className="px-4 py-3.5">{getStatusBadge(r.status)}</td>
                          <td className="px-5 py-3.5 max-w-xs">
                            {r.hrFeedback ? (
                              <div className="p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-100 text-slate-800">
                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-700 uppercase tracking-wider mb-1">
                                  <IconMessageCheck className="w-3.5 h-3.5 text-indigo-600" />
                                  <span>HR Feedback</span>
                                  {r.hrFeedbackAt && (
                                    <span className="text-slate-400 font-normal">
                                      • {new Date(r.hrFeedbackAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-700 leading-snug break-words">
                                  {r.hrFeedback}
                                </p>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-500 text-xs font-medium">
                                <IconClock className="w-3.5 h-3.5 text-slate-400" />
                                <span>Awaiting HR review</span>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    }))}
              </tbody>
            </table>
          )}
        </div>

        {/* 4. Table Pagination (Matching Shift Management & Departments) */}
        {activeItems.length > 0 && (
          <TablePagination
            currentPage={safeCurrentPage}
            totalItems={activeItems.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            pageSizeOptions={[10, 25, 50, 100]}
            itemName="referrals"
          />
        )}
      </div>

      {/* Refer an Employee Right Drawer */}
      <ReferLeadModal
        isOpen={isReferModalOpen}
        onClose={() => setIsReferModalOpen(false)}
        onSuccess={fetchData}
      />

      {/* HR Feedback Modal */}
      <HRFeedbackModal
        isOpen={Boolean(selectedForFeedback)}
        referral={selectedForFeedback}
        onClose={() => setSelectedForFeedback(null)}
        onSuccess={fetchData}
        onViewResume={handleOpenResume}
      />

      {/* Resume Viewer Modal */}
      <ResumeViewerModal
        isOpen={Boolean(viewingResume)}
        onClose={() => setViewingResume(null)}
        resumeUrl={viewingResume?.url || null}
        candidateName={viewingResume?.name}
        jobRole={viewingResume?.role}
      />
    </div>
  );
};

export default ReferEarnPage;
