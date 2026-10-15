import React, { useState, useEffect, useMemo } from 'react';
import api from '../../api/client';
import {
  IconFolderCheck,
  IconCheck,
  IconX,
  IconClock,
  IconAlertCircle,
  IconSearch,
  IconExternalLink,
  IconRefresh,
} from '@tabler/icons-react';

interface DocumentItem {
  id: number;
  userId: number;
  title: string;
  category: string;
  identifier?: string;
  fileUrl: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  rejectionNote?: string;
  notes?: string;
  createdAt: string;
  user: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    jobTitle?: string;
    department?: { name: string };
  };
}

export const DocumentReviewPage: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'PENDING' | 'VERIFIED' | 'REJECTED' | 'ALL'>('PENDING');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [rejectModal, setRejectModal] = useState<{
    open: boolean;
    docId?: number;
    docTitle?: string;
    employeeName?: string;
    rejectionNote: string;
  }>({
    open: false,
    rejectionNote: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/company/documents/review', {
        params: { status: 'ALL' },
      });
      setDocuments(res.data?.documents || []);
    } catch (err) {
      console.error('Failed to load documents for review:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleVerify = async (docId: number, title: string) => {
    if (!window.confirm(`Are you sure you want to approve and verify "${title}"?`)) return;
    try {
      await api.patch(`/company/documents/${docId}/verify`);
      fetchDocuments();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to verify document');
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectModal.docId || !rejectModal.rejectionNote.trim()) return;
    setIsSubmitting(true);
    try {
      await api.patch(`/company/documents/${rejectModal.docId}/reject`, {
        rejectionNote: rejectModal.rejectionNote.trim(),
      });
      setRejectModal({ open: false, rejectionNote: '' });
      fetchDocuments();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to reject document');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Real-time KPI Counts matching EmployeesPage
  const counts = useMemo(() => {
    return {
      pending: documents.filter((d) => d.status === 'PENDING').length,
      verified: documents.filter((d) => d.status === 'VERIFIED').length,
      rejected: documents.filter((d) => d.status === 'REJECTED').length,
      total: documents.length,
    };
  }, [documents]);

  // Filtered documents
  const filteredDocs = useMemo(() => {
    return documents.filter((doc) => {
      if (statusFilter !== 'ALL' && doc.status !== statusFilter) return false;
      if (categoryFilter && doc.category !== categoryFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const userName = `${doc.user.firstName} ${doc.user.lastName}`.toLowerCase();
        const email = doc.user.email.toLowerCase();
        const title = doc.title.toLowerCase();
        const ident = (doc.identifier || '').toLowerCase();
        const dept = (doc.user.department?.name || '').toLowerCase();
        return (
          userName.includes(q) ||
          email.includes(q) ||
          title.includes(q) ||
          ident.includes(q) ||
          dept.includes(q)
        );
      }
      return true;
    });
  }, [documents, statusFilter, categoryFilter, search]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/70 shadow-2xs">
            Verified
          </span>
        );
      case 'REJECTED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200/70 shadow-2xs">
            Rejected
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200/70 shadow-2xs">
            Pending Review
          </span>
        );
    }
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'IDENTITY':
        return 'bg-blue-50 text-blue-700 border-blue-200/70';
      case 'EDUCATION':
        return 'bg-purple-50 text-purple-700 border-purple-200/70';
      case 'EXPERIENCE':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200/70';
      case 'ONBOARDING':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200/70';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200/70';
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ===================== TOP HEADER BAR ===================== */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5E4BE2] shrink-0">
              <IconFolderCheck className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Document Review
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Review and digitally authenticate identity documents, certificates, and employment paperwork uploaded by staff.
          </p>
        </div>

        <button
          onClick={fetchDocuments}
          className="flex items-center gap-2 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 shadow-2xs transition-all cursor-pointer"
        >
          <IconRefresh className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* ===================== ROW 1: 4 KPI STAT CARDS ===================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Pending Action */}
        <div
          onClick={() => setStatusFilter('PENDING')}
          className={`bg-white rounded-2xl border p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-all cursor-pointer ${
            statusFilter === 'PENDING'
              ? 'border-amber-300 ring-2 ring-amber-400/30'
              : 'border-slate-200'
          }`}
        >
          <div>
            <span className="text-xs font-bold text-slate-500">Pending Action</span>
            <div className="text-2xl font-black text-slate-900 mt-1 leading-none tracking-tight">
              {counts.pending}
            </div>
            <div className="text-[11px] font-bold text-amber-600 mt-2">
              Awaiting compliance verification
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
            <IconClock className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Verified Records */}
        <div
          onClick={() => setStatusFilter('VERIFIED')}
          className={`bg-white rounded-2xl border p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-all cursor-pointer ${
            statusFilter === 'VERIFIED'
              ? 'border-emerald-300 ring-2 ring-emerald-400/30'
              : 'border-slate-200'
          }`}
        >
          <div>
            <span className="text-xs font-bold text-slate-500">Verified Records</span>
            <div className="text-2xl font-black text-slate-900 mt-1 leading-none tracking-tight">
              {counts.verified}
            </div>
            <div className="text-[11px] font-bold text-emerald-600 mt-2">
              Authenticated employee files
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <IconCheck className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Rejected / Returned */}
        <div
          onClick={() => setStatusFilter('REJECTED')}
          className={`bg-white rounded-2xl border p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-all cursor-pointer ${
            statusFilter === 'REJECTED'
              ? 'border-rose-300 ring-2 ring-rose-400/30'
              : 'border-slate-200'
          }`}
        >
          <div>
            <span className="text-xs font-bold text-slate-500">Rejected / Returned</span>
            <div className="text-2xl font-black text-slate-900 mt-1 leading-none tracking-tight">
              {counts.rejected}
            </div>
            <div className="text-[11px] font-bold text-rose-600 mt-2">
              Returned for re-upload
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
            <IconX className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Total Documents */}
        <div
          onClick={() => setStatusFilter('ALL')}
          className={`bg-white rounded-2xl border p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-all cursor-pointer ${
            statusFilter === 'ALL'
              ? 'border-indigo-300 ring-2 ring-indigo-400/30'
              : 'border-slate-200'
          }`}
        >
          <div>
            <span className="text-xs font-bold text-slate-500">Total KYC Files</span>
            <div className="text-2xl font-black text-slate-900 mt-1 leading-none tracking-tight">
              {counts.total}
            </div>
            <div className="text-[11px] font-bold text-[#5E4BE2] mt-2">
              All compliance files
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5E4BE2]">
            <IconFolderCheck className="w-5 h-5" />
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
            placeholder="Search by employee name, title or ID..."
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
          <div className="min-w-[190px]">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2.5 text-xs font-semibold bg-slate-50/70 border border-slate-200/80 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#5E4BE2]/20 focus:border-[#5E4BE2] transition-all text-slate-700 cursor-pointer"
            >
              <option value="">All Categories</option>
              <option value="IDENTITY">Identity (Aadhaar / SSN)</option>
              <option value="EDUCATION">Education Certificates</option>
              <option value="EXPERIENCE">Past Experience</option>
              <option value="ONBOARDING">Onboarding Paperwork</option>
              <option value="OTHER">Other Documents</option>
            </select>
          </div>

          {/* Status Pills */}
          <div className="flex items-center bg-slate-50/80 border border-slate-200/70 p-1 rounded-xl">
            {(['PENDING', 'VERIFIED', 'REJECTED', 'ALL'] as const).map((st) => {
              const isActive = statusFilter === st;
              return (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all capitalize cursor-pointer ${
                    isActive
                      ? 'bg-white text-[#5E4BE2] shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {st === 'ALL' ? 'All' : st.toLowerCase()}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ===================== ROW 3: DOCUMENTS LIST & EMPTY STATE ===================== */}
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm animate-pulse space-y-3"
            >
              <div className="w-48 h-4 bg-slate-200 rounded-md" />
              <div className="w-72 h-3 bg-slate-100 rounded-md" />
            </div>
          ))
        ) : filteredDocs.length === 0 ? (
          /* Empty state matching EmployeesPage / LeaveTypesPage */
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-indigo-50 text-[#5E4BE2] flex items-center justify-center mx-auto mb-3">
              <IconFolderCheck className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">No documents found</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              {statusFilter === 'PENDING'
                ? 'There are no pending documents awaiting compliance verification.'
                : 'No documents match the selected filter criteria.'}
            </p>
            {statusFilter === 'PENDING' && counts.verified > 0 && (
              <button
                onClick={() => setStatusFilter('VERIFIED')}
                className="mt-4 px-4 py-2 bg-gradient-to-r from-[#5E4BE2] to-[#4B39C3] hover:from-[#5340D4] hover:to-[#4130B4] text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
              >
                View Verified Records ({counts.verified})
              </button>
            )}
          </div>
        ) : (
          filteredDocs.map((doc) => (
            <div
              key={doc.id}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              {/* Employee & Document Info */}
              <div className="space-y-2.5 min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold font-mono border ${getCategoryColor(
                      doc.category
                    )}`}
                  >
                    {doc.category}
                  </span>
                  {getStatusBadge(doc.status)}
                  {doc.identifier && (
                    <span className="text-[11px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                      ID: {doc.identifier}
                    </span>
                  )}
                </div>

                <div>
                  <h4 className="text-sm font-bold text-slate-900 leading-snug">{doc.title}</h4>
                  {doc.notes && <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{doc.notes}</p>}
                </div>

                {/* Submitter details */}
                <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <div className="w-5 h-5 rounded-full bg-indigo-50 text-[#5E4BE2] border border-indigo-100 flex items-center justify-center text-[10px] font-black">
                      {doc.user.firstName?.[0] || 'U'}
                    </div>
                    <span>
                      {doc.user.firstName} {doc.user.lastName}
                    </span>
                  </div>
                  <span>•</span>
                  <span>{doc.user.email}</span>
                  {doc.user.department && (
                    <>
                      <span>•</span>
                      <span className="text-slate-600 font-semibold">{doc.user.department.name}</span>
                    </>
                  )}
                  <span>•</span>
                  <span className="text-slate-400">
                    Uploaded on {new Date(doc.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {/* Rejection Note alert if rejected */}
                {doc.status === 'REJECTED' && doc.rejectionNote && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2 text-xs text-rose-700">
                    <IconAlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-bold block">Rejection Feedback:</strong>
                      <span>{doc.rejectionNote}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Action buttons & preview link */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                {doc.fileUrl ? (
                  <a
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors"
                  >
                    <IconExternalLink className="w-4 h-4 text-slate-500" />
                    <span>View File</span>
                  </a>
                ) : (
                  <span className="text-xs text-slate-400 italic px-2 py-1">No file attached</span>
                )}

                {doc.status === 'PENDING' && (
                  <>
                    <button
                      onClick={() => handleVerify(doc.id, doc.title)}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-2xs transition-all cursor-pointer"
                    >
                      <IconCheck className="w-4 h-4" />
                      <span>Approve & Verify</span>
                    </button>

                    <button
                      onClick={() =>
                        setRejectModal({
                          open: true,
                          docId: doc.id,
                          docTitle: doc.title,
                          employeeName: `${doc.user.firstName} ${doc.user.lastName}`,
                          rejectionNote: '',
                        })
                      }
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-rose-50 border border-rose-200 text-rose-600 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <IconX className="w-4 h-4" />
                      <span>Reject</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Reject Reason Modal */}
      {rejectModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
                <IconX className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Reject Document Submission</h3>
              <p className="text-xs text-slate-500 mt-1">
                Provide feedback so {rejectModal.employeeName} can rectify and re-upload &quot;
                {rejectModal.docTitle}&quot;.
              </p>
            </div>

            <form onSubmit={handleRejectSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Rejection Reason / Required Correction <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={rejectModal.rejectionNote}
                  onChange={(e) => setRejectModal({ ...rejectModal, rejectionNote: e.target.value })}
                  placeholder="e.g. Scanned document is blurry, or government ID has expired. Please provide a clear, valid copy."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectModal({ open: false, rejectionNote: '' })}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !rejectModal.rejectionNote.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 transition-all shadow-sm cursor-pointer"
                >
                  {isSubmitting ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentReviewPage;
