import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import {
  IconFolder,
  IconPlus,
  IconCheck,
  IconX,
  IconClock,
  IconAlertCircle,
  IconUpload,
  IconFileText,
  IconShieldCheck,
  IconRefresh,
  IconSearch,
  IconEye,
  IconDownload,
  IconDots,
  IconUser,
  IconSchool,
  IconBriefcase,
  IconShield,
  IconTrash,
} from '@tabler/icons-react';

interface EmployeeDocument {
  id: number;
  category: string;
  title: string;
  identifier?: string;
  notes?: string;
  fileUrl?: string | null;
  issueDate?: string | null;
  expiryDate?: string | null;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  rejectionNote?: string | null;
  createdAt: string;
}

export const MyDocumentsPage: React.FC = () => {
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [reuploadDocId, setReuploadDocId] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [actionMenuDocId, setActionMenuDocId] = useState<number | null>(null);

  // Upload Form
  const [form, setForm] = useState({
    category: 'IDENTITY',
    title: '',
    identifier: '',
    notes: '',
    issueDate: '',
    expiryDate: '',
  });
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/documents');
      setDocuments(res.data?.documents || []);
    } catch (err) {
      console.error('Failed to load my documents:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError('Document title is required');
      return;
    }
    setError(null);
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('category', form.category);
      formData.append('title', form.title.trim());
      if (form.identifier) formData.append('identifier', form.identifier.trim());
      if (form.notes) formData.append('notes', form.notes.trim());
      if (form.issueDate) formData.append('issueDate', form.issueDate);
      if (form.expiryDate) formData.append('expiryDate', form.expiryDate);
      if (file) formData.append('file', file);

      if (reuploadDocId) {
        await api.patch(`/documents/${reuploadDocId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await api.post('/documents', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      setIsUploadModalOpen(false);
      setReuploadDocId(null);
      setForm({
        category: 'IDENTITY',
        title: '',
        identifier: '',
        notes: '',
        issueDate: '',
        expiryDate: '',
      });
      setFile(null);
      fetchDocuments();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to upload document');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openReupload = (doc: EmployeeDocument) => {
    setReuploadDocId(doc.id);
    setForm({
      category: doc.category,
      title: doc.title,
      identifier: doc.identifier || '',
      notes: '',
      issueDate: doc.issueDate ? doc.issueDate.split('T')[0] : '',
      expiryDate: doc.expiryDate ? doc.expiryDate.split('T')[0] : '',
    });
    setFile(null);
    setError(null);
    setIsUploadModalOpen(true);
    setActionMenuDocId(null);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    try {
      await api.delete(`/documents/${id}`);
      fetchDocuments();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete document');
    } finally {
      setActionMenuDocId(null);
    }
  };

  const verifiedCount = documents.filter((d) => d.status === 'VERIFIED').length;
  const pendingCount = documents.filter((d) => d.status === 'PENDING').length;
  const rejectedCount = documents.filter((d) => d.status === 'REJECTED').length;

  const categoryTabs = [
    { id: 'ALL', label: 'All Documents', icon: IconFileText },
    { id: 'IDENTITY', label: 'Identity Proof', icon: IconUser },
    { id: 'EDUCATION', label: 'Education', icon: IconSchool },
    { id: 'EXPERIENCE', label: 'Employment', icon: IconBriefcase },
    { id: 'ONBOARDING', label: 'Compliance', icon: IconShield },
    { id: 'OTHER', label: 'Other', icon: IconClock },
  ];

  const filteredDocuments = documents.filter((doc) => {
    const matchesCategory =
      activeCategory === 'ALL' ||
      doc.category.toUpperCase() === activeCategory.toUpperCase();

    const matchesSearch =
      searchQuery.trim() === '' ||
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.identifier && doc.identifier.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <IconFolder className="w-5 h-5 text-indigo-600 shrink-0" />
            <span>My Documents</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Secure digital vault for your national identity cards, educational qualifications, and company compliance files.
          </p>
        </div>

        <button
          onClick={() => {
            setReuploadDocId(null);
            setForm({
              category: 'IDENTITY',
              title: '',
              identifier: '',
              notes: '',
              issueDate: '',
              expiryDate: '',
            });
            setFile(null);
            setError(null);
            setIsUploadModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#5E4BE2] to-[#4B39C3] hover:from-[#5340D4] hover:to-[#4130B4] text-white text-xs font-bold rounded-xl shadow-sm shadow-indigo-600/25 active:scale-[0.98] transition-all cursor-pointer self-start sm:self-auto shrink-0"
        >
          <IconPlus className="w-4 h-4" />
          <span>Upload New Document</span>
        </button>
      </div>

      {/* 2. KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Vault Files</span>
            <div className="text-2xl font-black text-slate-900 mt-0.5">{documents.length}</div>
            <span className="text-[11px] text-slate-400 font-medium">Stored digital records</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5E4BE2] shrink-0">
            <IconFileText className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Verified & Approved</span>
            <div className="text-2xl font-black text-slate-900 mt-0.5">{verifiedCount}</div>
            <span className="text-[11px] text-emerald-600 font-semibold">Cleared by HR</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <IconShieldCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Pending Review</span>
            <div className="text-2xl font-black text-slate-900 mt-0.5">{pendingCount}</div>
            <span className="text-[11px] text-amber-600 font-semibold">Awaiting validation</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
            <IconClock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Action Required</span>
            <div className="text-2xl font-black text-slate-900 mt-0.5">{rejectedCount}</div>
            <span className="text-[11px] text-rose-600 font-semibold">{rejectedCount > 0 ? 'Needs re-upload' : 'All clear'}</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
            <IconAlertCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Category Filter Tabs & Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl w-fit">
          {categoryTabs.map((tab) => {
            const isSelected = activeCategory === tab.id;
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveCategory(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-white text-[#5E4BE2] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <TabIcon className={`w-3.5 h-3.5 ${isSelected ? 'text-[#5E4BE2]' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Search Input */}
        <div className="relative w-full md:w-64">
          <IconSearch className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents..."
            className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-[#5E4BE2] focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* 4. Document List Cards */}
      <div className="space-y-3 sm:space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="p-5 bg-white rounded-2xl border border-slate-200 animate-pulse space-y-3">
                <div className="w-40 h-4 bg-slate-200 rounded-md" />
                <div className="w-64 h-3 bg-slate-200 rounded-md" />
              </div>
            ))}
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="w-12 h-12 rounded-full bg-indigo-50 text-[#5E4BE2] flex items-center justify-center mx-auto mb-3">
              <IconFolder className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No Documents Found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? 'No documents matched your search query.'
                : 'Upload your national ID, educational certificates, or company files to complete your vault.'}
            </p>
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#5E4BE2] to-[#4B39C3] hover:from-[#5340D4] hover:to-[#4130B4] text-white text-xs font-bold shadow-sm shadow-indigo-600/25 active:scale-[0.98] transition-all cursor-pointer"
            >
              <IconPlus className="w-4 h-4" /> Upload Document
            </button>
          </div>
        ) : (
          filteredDocuments.map((doc) => (
            <div
              key={doc.id}
              className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm hover:border-slate-300 hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex items-start sm:items-center gap-4 min-w-0 flex-1">
                {/* PDF File Type Badge */}
                <div className="w-11 h-12 rounded-xl bg-rose-50 border border-rose-100 flex flex-col items-center justify-center shrink-0 shadow-xs">
                  <IconFileText className="w-5 h-5 text-rose-500" />
                  <span className="text-[9px] font-black text-rose-600 uppercase tracking-tight">
                    PDF
                  </span>
                </div>

                {/* Info and Badges */}
                <div className="space-y-1.5 min-w-0 flex-1">
                  <h4 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                    {doc.title}
                  </h4>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Category pill */}
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider bg-indigo-50 text-[#5E4BE2] border border-indigo-100">
                      {doc.category}
                    </span>

                    {/* Status pill */}
                    {doc.status === 'VERIFIED' ? (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                        <IconCheck className="w-3.5 h-3.5 text-emerald-600" /> Authenticated & Verified
                      </span>
                    ) : doc.status === 'REJECTED' ? (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                        <IconX className="w-3.5 h-3.5 text-rose-600" /> Correction Required
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                        <IconClock className="w-3.5 h-3.5 text-amber-600" /> Verification Pending
                      </span>
                    )}

                    {/* Number / Identifier */}
                    {doc.identifier && (
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-medium text-slate-500 bg-slate-50 border border-slate-200">
                        No: {doc.identifier}
                      </span>
                    )}
                  </div>

                  {/* Upload Date and Issue Date */}
                  <div className="text-xs text-slate-400 flex flex-wrap items-center gap-2 pt-0.5">
                    <span>Uploaded {new Date(doc.createdAt).toLocaleDateString()}</span>
                    {doc.issueDate && (
                      <>
                        <span>•</span>
                        <span>Issued: {new Date(doc.issueDate).toLocaleDateString()}</span>
                      </>
                    )}
                    {doc.expiryDate && (
                      <>
                        <span>•</span>
                        <span>Expires: {new Date(doc.expiryDate).toLocaleDateString()}</span>
                      </>
                    )}
                  </div>

                  {/* Rejection Note */}
                  {doc.status === 'REJECTED' && doc.rejectionNote && (
                    <div className="mt-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                      <IconAlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <strong className="font-semibold block">HR Feedback / Reason:</strong>
                        <span>{doc.rejectionNote}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Action Buttons */}
              <div className="flex items-center gap-2 shrink-0 self-start md:self-center relative">
                {/* View File */}
                {doc.fileUrl ? (
                  <a
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-all"
                  >
                    <IconEye className="w-3.5 h-3.5 text-slate-500" />
                    <span>View File</span>
                  </a>
                ) : (
                  <button
                    disabled
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-400 text-xs font-semibold"
                  >
                    <IconEye className="w-3.5 h-3.5 text-slate-400" />
                    <span>View File</span>
                  </button>
                )}

                {/* Download Button */}
                {doc.fileUrl ? (
                  <a
                    href={doc.fileUrl}
                    download
                    className="w-8 h-8 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 flex items-center justify-center shadow-xs transition-all cursor-pointer"
                    title="Download document"
                  >
                    <IconDownload className="w-3.5 h-3.5" />
                  </a>
                ) : (
                  <button
                    disabled
                    className="w-8 h-8 rounded-xl border border-slate-200 bg-slate-50 text-slate-400 flex items-center justify-center"
                    title="No file available"
                  >
                    <IconDownload className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* More Options Button */}
                <div className="relative">
                  <button
                    onClick={() => setActionMenuDocId(actionMenuDocId === doc.id ? null : doc.id)}
                    className="w-8 h-8 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 flex items-center justify-center shadow-xs transition-all cursor-pointer"
                    title="More actions"
                  >
                    <IconDots className="w-3.5 h-3.5" />
                  </button>

                  {/* Dropdown Menu */}
                  {actionMenuDocId === doc.id && (
                    <div className="absolute right-0 mt-1 w-36 bg-white rounded-xl shadow-lg border border-slate-100 py-1 z-30 animate-in fade-in zoom-in-95 duration-100">
                      <button
                        onClick={() => openReupload(doc)}
                        className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer font-medium"
                      >
                        <IconRefresh className="w-3.5 h-3.5 text-slate-400" />
                        <span>Update / Edit</span>
                      </button>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="w-full px-3 py-2 text-left text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer font-medium"
                      >
                        <IconTrash className="w-3.5 h-3.5 text-rose-500" />
                        <span>Delete</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 5. Upload / Re-upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {reuploadDocId ? 'Re-upload Corrected Document' : 'Upload New KYC Document'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Securely upload and submit official records for verification.
                </p>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <IconX className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="mx-5 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex items-center gap-2">
                <IconAlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-[#5E4BE2]"
                  >
                    <option value="IDENTITY">National ID (Passport / SSN / Aadhaar)</option>
                    <option value="EDUCATION">Education Degree / Marksheet</option>
                    <option value="EXPERIENCE">Past Experience / Relieving</option>
                    <option value="ONBOARDING">Company Compliance / Contract</option>
                    <option value="OTHER">Other Proof</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Document Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. Passport, Master's Degree"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-[#5E4BE2]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Document Identifier / Number</label>
                <input
                  type="text"
                  value={form.identifier}
                  onChange={(e) => setForm({ ...form, identifier: e.target.value })}
                  placeholder="e.g. A12345678"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-[#5E4BE2]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Issue Date</label>
                  <input
                    type="date"
                    value={form.issueDate}
                    onChange={(e) => setForm({ ...form, issueDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-[#5E4BE2]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={form.expiryDate}
                    onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-[#5E4BE2]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Attach File (PDF, PNG, JPG)</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-[#5E4BE2] hover:file:bg-indigo-100 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Additional Context</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Optional context or comments for reviewer..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-[#5E4BE2]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#5E4BE2] to-[#4B39C3] hover:from-[#5340D4] hover:to-[#4130B4] disabled:opacity-50 transition-all shadow-sm shadow-indigo-600/25 active:scale-[0.98] cursor-pointer"
                >
                  {isSubmitting ? 'Uploading...' : reuploadDocId ? 'Submit Update' : 'Upload Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyDocumentsPage;
