import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import api from '../../api/client';
import TablePagination from '../../components/common/TablePagination';
import {
  IconFileText,
  IconPlus,
  IconX,
  IconCheck,
  IconAlertCircle,
  IconSearch,
  IconFilter,
  IconShieldLock,
  IconFileCheck,
  IconEye,
  IconPencil,
  IconChevronDown,
  IconUsers,
  IconCalendar,
  IconHeartHandshake,
  IconDeviceLaptop,
  IconBook2,
  IconSparkles,
  IconChecklist,
  IconClock,
  IconAward,
  IconPlayerPause,
  IconPlayerPlay,
  IconPaperclip,
  IconUpload,
  IconExternalLink,
  IconTrash,
  IconFileTypePdf,
} from '@tabler/icons-react';

interface PolicyItem {
  id: number;
  title: string;
  slug: string;
  policyType?: string;
  category?: string;
  body?: string;
  content?: string;
  version: number | string;
  isMandatory?: boolean;
  isActive?: boolean;
  documentUrl?: string | null;
  validUntil?: string | null;
  acceptances?: { userId: number; version: number | string; at: string }[] | any;
  createdAt: string;
  updatedAt?: string;
  hasAccepted?: boolean;
}

export const ManagePoliciesPage: React.FC = () => {
  const [policies, setPolicies] = useState<PolicyItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedCompliance, setSelectedCompliance] = useState('ALL');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [viewingPolicy, setViewingPolicy] = useState<PolicyItem | null>(null);
  const [editingPolicy, setEditingPolicy] = useState<PolicyItem | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [category, setCategory] = useState('CODE_OF_CONDUCT');
  const [version, setVersion] = useState('1.0');
  const [validUntil, setValidUntil] = useState('');
  const [body, setBody] = useState('');
  const [isMandatory, setIsMandatory] = useState(true);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [existingDocumentUrl, setExistingDocumentUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Deactivate Confirmation Toaster
  const [deactivatingPolicy, setDeactivatingPolicy] = useState<PolicyItem | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [deactivateError, setDeactivateError] = useState('');

  // Floating Toast Notification
  const [toast, setToast] = useState<{
    type: 'success' | 'error' | 'info';
    title: string;
    message: string;
  } | null>(null);

  // Auto dismiss toast after 4.5 seconds
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [toast]);

  const fetchPolicies = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/policies?all=true');
      setPolicies(res.data?.policies || []);
    } catch (err) {
      console.error('Failed to load policies:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingPolicy(null);
    setTitle('');
    setSlug('');
    setCategory('CODE_OF_CONDUCT');
    setVersion('1.0');
    setValidUntil('');
    setBody('');
    setIsMandatory(true);
    setAttachedFile(null);
    setExistingDocumentUrl(null);
    setIsDragging(false);
    setFormError(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (p: PolicyItem) => {
    setEditingPolicy(p);
    setTitle(p.title);
    setSlug(p.slug || '');
    setCategory(p.category || p.policyType || 'CODE_OF_CONDUCT');
    setVersion(String(p.version || '1.0'));
    setValidUntil(p.validUntil ? p.validUntil.split('T')[0] : '');
    setBody(p.body || p.content || '');
    setIsMandatory(p.isMandatory !== false);
    setAttachedFile(null);
    setExistingDocumentUrl(p.documentUrl || null);
    setIsDragging(false);
    setFormError(null);
    setIsFormModalOpen(true);
  };

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!editingPolicy) {
      const autoSlug = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      setSlug(autoSlug);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setFormError('File size exceeds the 10MB limit. Please upload a smaller document.');
        return;
      }
      setAttachedFile(file);
      setFormError(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setFormError('File size exceeds the 10MB limit. Please upload a smaller document.');
        return;
      }
      setAttachedFile(file);
      setFormError(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError('Please provide a policy document title.');
      return;
    }

    if (validUntil && validUntil.trim()) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selectedDate = new Date(validUntil);
      selectedDate.setHours(0, 0, 0, 0);
      if (selectedDate < today) {
        setFormError('Review / Valid Until Date cannot be in the past. Please select today or a future date.');
        return;
      }
    }

    if (!attachedFile && !existingDocumentUrl) {
      setFormError('Please attach a policy document (PDF, DOC, DOCX).');
      return;
    }

    setFormError(null);
    setIsSubmitting(true);
    const parsedVersion = Math.max(1, Math.round(parseFloat(version) || 1));

    try {
      if (attachedFile) {
        const formData = new FormData();
        formData.append('title', title.trim());
        if (slug.trim()) formData.append('slug', slug.trim());
        formData.append('category', category);
        formData.append('policyType', category);
        formData.append('version', String(parsedVersion));
        if (validUntil) formData.append('validUntil', validUntil);
        formData.append('isMandatory', String(isMandatory));
        formData.append('file', attachedFile);
        if (body.trim()) formData.append('body', body.trim());

        if (editingPolicy) {
          await api.patch(`/policies/${editingPolicy.id}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          setToast({
            type: 'success',
            title: 'Policy Updated',
            message: `Policy "${title.trim()}" was updated with new document successfully.`,
          });
        } else {
          await api.post('/policies', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          setToast({
            type: 'success',
            title: 'Policy Created',
            message: `Policy "${title.trim()}" was published successfully.`,
          });
        }
      } else {
        const payload = {
          title: title.trim(),
          slug: slug.trim() || undefined,
          category,
          policyType: category,
          version: parsedVersion,
          validUntil: validUntil || null,
          body: body.trim(),
          content: body.trim(),
          documentUrl: existingDocumentUrl,
          isMandatory,
        };

        if (editingPolicy) {
          await api.patch(`/policies/${editingPolicy.id}`, payload);
          setToast({
            type: 'success',
            title: 'Policy Updated',
            message: `Policy "${title.trim()}" was updated successfully.`,
          });
        }
      }

      setIsFormModalOpen(false);
      fetchPolicies();
    } catch (err: any) {
      setFormError(err.response?.data?.error || err.response?.data?.message || 'Failed to save policy');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivatePolicy = (p: PolicyItem) => {
    setDeactivatingPolicy(p);
    setDeactivateError('');
  };

  const handleConfirmDeactivate = async () => {
    if (!deactivatingPolicy) return;
    const policyTitle = deactivatingPolicy.title;
    setIsDeactivating(true);
    setDeactivateError('');
    try {
      await api.patch(`/policies/${deactivatingPolicy.id}`, { isActive: false });
      setDeactivatingPolicy(null);
      fetchPolicies();
      setToast({
        type: 'success',
        title: 'Policy Deactivated',
        message: `Policy "${policyTitle}" has been deactivated.`,
      });
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.response?.data?.message || 'Failed to deactivate policy';
      setDeactivateError(errMsg);
      setToast({
        type: 'error',
        title: 'Action Failed',
        message: errMsg,
      });
    } finally {
      setIsDeactivating(false);
    }
  };

  const handleReactivatePolicy = async (p: PolicyItem) => {
    try {
      await api.patch(`/policies/${p.id}`, { isActive: true });
      fetchPolicies();
      setToast({
        type: 'success',
        title: 'Policy Reactivated',
        message: `Policy "${p.title}" is now active.`,
      });
    } catch (err: any) {
      setToast({
        type: 'error',
        title: 'Action Failed',
        message: err.response?.data?.error || err.response?.data?.message || 'Failed to reactivate policy',
      });
    }
  };

  // Helper to ensure policy documents stream through API proxy rather than hitting private S3 URLs directly
  const getDocumentPreviewUrl = (url?: string | null) => {
    if (!url) return '';
    if (url.includes('amazonaws.com')) {
      const filename = url.split('/uploads/').pop() || url.split('/').pop();
      return `/uploads/${filename}`;
    }
    if (url.startsWith('/uploads/')) {
      return url;
    }
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `/uploads/${url.replace(/^\/+/, '')}`;
  };

  // Helper for Category Presentation
  const getCategoryMeta = (cat?: string) => {
    const c = (cat || 'HR').toUpperCase();
    switch (c) {
      case 'IT_SECURITY':
        return {
          label: 'IT & Cyber Security',
          badge: 'bg-blue-50 text-blue-700 border-blue-200/60',
          icon: IconDeviceLaptop,
          color: 'text-blue-600',
          bg: 'bg-blue-50',
        };
      case 'POSH':
        return {
          label: 'Anti-Harassment (POSH)',
          badge: 'bg-rose-50 text-rose-700 border-rose-200/60',
          icon: IconHeartHandshake,
          color: 'text-rose-600',
          bg: 'bg-rose-50',
        };
      case 'CODE_OF_CONDUCT':
        return {
          label: 'Code of Conduct',
          badge: 'bg-purple-50 text-purple-700 border-purple-200/60',
          icon: IconShieldLock,
          color: 'text-purple-600',
          bg: 'bg-purple-50',
        };
      case 'LEAVE_POLICY':
      case 'LEAVE':
        return {
          label: 'Leave & Attendance',
          badge: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
          icon: IconCalendar,
          color: 'text-emerald-600',
          bg: 'bg-emerald-50',
        };
      case 'REMOTE_WORK':
        return {
          label: 'Remote & Hybrid Work',
          badge: 'bg-cyan-50 text-cyan-700 border-cyan-200/60',
          icon: IconDeviceLaptop,
          color: 'text-cyan-600',
          bg: 'bg-cyan-50',
        };
      default:
        return {
          label: 'General HR Policy',
          badge: 'bg-indigo-50 text-indigo-700 border-indigo-200/60',
          icon: IconBook2,
          color: 'text-indigo-600',
          bg: 'bg-indigo-50',
        };
    }
  };

  // KPI Calculations
  const totalCount = policies.length;
  const mandatoryCount = policies.filter((p) => p.isMandatory !== false).length;
  const totalAcceptancesCount = policies.reduce((acc, p) => {
    const list = Array.isArray(p.acceptances) ? p.acceptances : [];
    return acc + list.length;
  }, 0);
  const avgAcceptanceRate = totalCount > 0 ? Math.round((totalAcceptancesCount / (totalCount * 35)) * 100) : 0;

  // Filtered Policies
  const filteredPolicies = useMemo(() => {
    return policies.filter((p) => {
      const q = search.toLowerCase().trim();
      const titleMatch = p.title.toLowerCase().includes(q) || (p.slug && p.slug.toLowerCase().includes(q));
      const contentMatch = (p.body || p.content || '').toLowerCase().includes(q);
      const matchesSearch = !q || titleMatch || contentMatch;

      const pCat = (p.category || p.policyType || 'HR').toUpperCase();
      const matchesCategory =
        selectedCategory === 'ALL' ||
        pCat === selectedCategory ||
        (selectedCategory === 'LEAVE' && (pCat === 'LEAVE_POLICY' || pCat === 'LEAVE'));

      const pMandatory = p.isMandatory !== false;
      const matchesCompliance =
        selectedCompliance === 'ALL' ||
        (selectedCompliance === 'MANDATORY' && pMandatory) ||
        (selectedCompliance === 'OPTIONAL' && !pMandatory);

      return matchesSearch && matchesCategory && matchesCompliance;
    });
  }, [policies, search, selectedCategory, selectedCompliance]);

  // Paginated policies for current page
  const paginatedPolicies = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPolicies.slice(start, start + pageSize);
  }, [filteredPolicies, currentPage, pageSize]);

  return (
    <div className="space-y-6 pb-12">
      {/* ===================== TOP HERO BAR ===================== */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5E4BE2] shrink-0">
              <IconFileCheck className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Manage Policies
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Author and publish official HR guidelines, mandatory employee compliance documents, and revisions.
          </p>
        </div>

        {/* Primary CTA */}
        <button
          onClick={handleOpenCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#5E4BE2] hover:bg-[#4d3cc9] text-white text-xs font-bold shadow-xs hover:shadow-md transition-all cursor-pointer shrink-0"
        >
          <IconPlus className="w-4 h-4" />
          <span>Publish New Policy</span>
        </button>
      </div>


      {/* ===================== ROW 2: SEARCH, FILTERS & TABLE CONTAINER ===================== */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Toolbar Header */}
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-50/40">
          {/* Search Input */}
          <div className="relative flex-1">
            <IconSearch className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search policies by title, category, or clauses..."
              className="w-full pl-10 pr-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500 text-slate-800 placeholder-slate-400 font-medium"
            />
          </div>

          {/* Filters & Actions */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5">
            {/* Category Dropdown */}
            <div className="relative flex-1 sm:flex-none">
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full sm:w-auto appearance-none pl-8 pr-7 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500 text-slate-700 cursor-pointer"
              >
                <option value="ALL">All Categories</option>
                <option value="CODE_OF_CONDUCT">Code of Conduct</option>
                <option value="IT_SECURITY">IT & Cyber Security</option>
                <option value="POSH">Anti-Harassment (POSH)</option>
                <option value="LEAVE">Leave & Attendance</option>
                <option value="REMOTE_WORK">Remote & Hybrid</option>
                <option value="HR">General HR</option>
              </select>
              <IconFilter className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <IconChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Compliance Filter */}
            <div className="relative flex-1 sm:flex-none">
              <select
                value={selectedCompliance}
                onChange={(e) => {
                  setSelectedCompliance(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full sm:w-auto appearance-none pl-8 pr-7 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500 text-slate-700 cursor-pointer"
              >
                <option value="ALL">All Compliance</option>
                <option value="MANDATORY">Mandatory Sign-off</option>
                <option value="OPTIONAL">General Guidance</option>
              </select>
              <IconShieldLock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <IconChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Record Count Badge */}
            <span className="hidden sm:inline-flex px-3 py-2 rounded-xl bg-indigo-50/70 text-[#5E4BE2] text-xs font-bold border border-indigo-100/60 shrink-0">
              {filteredPolicies.length} {filteredPolicies.length === 1 ? 'policy' : 'policies'}
            </span>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-xs">
            <thead className="bg-[#e5e7eb] text-xs font-bold text-slate-900 border-b border-slate-300">
              <tr>
                <th className="px-5 py-3.5 whitespace-nowrap min-w-[280px]">Policy Title</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Category</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Version</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Compliance Type</th>
                <th className="px-5 py-3.5 whitespace-nowrap min-w-[170px]">Staff Acknowledgment</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Published Date</th>
                <th className="px-5 py-3.5 whitespace-nowrap text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-200" />
                        <div className="space-y-1.5">
                          <div className="w-36 h-3.5 bg-slate-200 rounded-sm" />
                          <div className="w-48 h-3 bg-slate-100 rounded-sm" />
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap"><div className="w-28 h-6 bg-slate-200 rounded-lg" /></td>
                    <td className="px-5 py-4 whitespace-nowrap"><div className="w-12 h-5 bg-slate-200 rounded-md" /></td>
                    <td className="px-5 py-4 whitespace-nowrap"><div className="w-32 h-6 bg-slate-200 rounded-full" /></td>
                    <td className="px-5 py-4 whitespace-nowrap"><div className="w-32 h-3 bg-slate-200 rounded-sm" /></td>
                    <td className="px-5 py-4 whitespace-nowrap"><div className="w-24 h-3 bg-slate-200 rounded-sm" /></td>
                    <td className="px-5 py-4 whitespace-nowrap text-right"><div className="w-16 h-4 bg-slate-200 rounded-full ml-auto" /></td>
                  </tr>
                ))
              ) : filteredPolicies.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-14 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-[#5E4BE2] flex items-center justify-center mx-auto mb-3 shadow-2xs">
                      <IconFileCheck className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-slate-800">No corporate policies found</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      {search || selectedCategory !== 'ALL' || selectedCompliance !== 'ALL'
                        ? 'Try modifying or clearing your search filters.'
                        : 'Start by publishing official HR rules, employee guidelines, and mandatory compliance documents.'}
                    </p>
                    {search || selectedCategory !== 'ALL' || selectedCompliance !== 'ALL' ? (
                      <button
                        onClick={() => {
                          setSearch('');
                          setSelectedCategory('ALL');
                          setSelectedCompliance('ALL');
                        }}
                        className="mt-3 text-xs font-bold text-[#5E4BE2] hover:underline cursor-pointer"
                      >
                        Reset filters
                      </button>
                    ) : (
                      <button
                        onClick={handleOpenCreateModal}
                        className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#5E4BE2] hover:bg-[#4d3cc9] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                      >
                        <IconPlus className="w-4 h-4" />
                        <span>Publish First Policy</span>
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedPolicies.map((p) => {
                  const meta = getCategoryMeta(p.category || p.policyType);
                  const Icon = meta.icon;
                  const isMandatoryPolicy = p.isMandatory !== false;
                  const acceptancesList = Array.isArray(p.acceptances) ? p.acceptances : [];
                  const acceptCount = acceptancesList.length;
                  const acceptPercentage = Math.min(100, Math.round((acceptCount / 35) * 100));

                  return (
                    <tr key={p.id} className="hover:bg-indigo-50/20 transition-colors group">
                      {/* Policy Title & Guidelines */}
                      <td className="px-5 py-4">
                        <div className="flex items-start gap-3 min-w-[260px] max-w-sm">
                          <div className={`w-9 h-9 rounded-xl ${meta.bg} ${meta.color} flex items-center justify-center shrink-0 mt-0.5 border border-slate-100 shadow-2xs`}>
                            <Icon className="w-4 h-4 shrink-0" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setViewingPolicy(p)}
                                className="font-bold text-xs text-slate-900 group-hover:text-[#5E4BE2] transition-colors leading-tight line-clamp-1 block text-left cursor-pointer hover:underline"
                              >
                                {p.title}
                              </button>
                              {p.isActive === false && (
                                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                                  Deactivated
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5 flex items-center gap-1.5">
                              {p.documentUrl ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#5E4BE2]">
                                  <IconPaperclip className="w-3.5 h-3.5 shrink-0" />
                                  <span>Attached Document</span>
                                </span>
                              ) : (
                                <span>{p.body || p.content || 'Official guidelines document'}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border whitespace-nowrap shrink-0 ${meta.badge}`}>
                          <Icon className="w-3.5 h-3.5 shrink-0" />
                          <span>{meta.label}</span>
                        </span>
                      </td>

                      {/* Version */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap">
                          v{p.version}
                        </span>
                      </td>

                      {/* Compliance Type */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase whitespace-nowrap shrink-0 ${
                            isMandatoryPolicy
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-indigo-50 text-[#5E4BE2] border border-indigo-200'
                          }`}
                        >
                          {isMandatoryPolicy ? (
                            <>
                              <IconShieldLock className="w-3.5 h-3.5 shrink-0" />
                              <span>MANDATORY SIGN-OFF</span>
                            </>
                          ) : (
                            <>
                              <IconFileText className="w-3.5 h-3.5 shrink-0" />
                              <span>GENERAL GUIDANCE</span>
                            </>
                          )}
                        </span>
                      </td>

                      {/* Staff Acknowledgment */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="space-y-1.5 w-36">
                          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 whitespace-nowrap">
                            <span className="shrink-0">{acceptCount} / 35 staff</span>
                            <span className="font-bold text-slate-900 shrink-0">{acceptPercentage}%</span>
                          </div>
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                acceptPercentage >= 80 ? 'bg-emerald-500' : acceptPercentage >= 50 ? 'bg-indigo-500' : 'bg-amber-500'
                              }`}
                              style={{ width: `${acceptPercentage}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Published Date */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium whitespace-nowrap">
                          <IconCalendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="whitespace-nowrap">
                            {new Date(p.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                      </td>

                      {/* Actions: View, Edit, Deactivate */}
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2 shrink-0">
                          {/* View Policy */}
                          <button
                            type="button"
                            onClick={() => setViewingPolicy(p)}
                            className="w-8 h-8 rounded-xl border border-slate-200 bg-white hover:bg-[#F0EEFF] hover:border-indigo-300 text-slate-700 hover:text-[#5E4BE2] flex items-center justify-center shadow-2xs transition-all cursor-pointer"
                            title="View Policy Document"
                          >
                            <IconEye className="w-4 h-4 stroke-[1.8]" />
                          </button>

                          {/* Edit Policy */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(p)}
                            className="w-8 h-8 rounded-xl border border-slate-200 bg-white hover:bg-blue-50 hover:border-blue-300 text-slate-900 hover:text-blue-600 flex items-center justify-center shadow-2xs transition-all cursor-pointer"
                            title="Edit Policy"
                          >
                            <IconPencil className="w-4 h-4 stroke-[1.8]" />
                          </button>

                          {/* Deactivate / Reactivate */}
                          {p.isActive !== false ? (
                            <button
                              type="button"
                              onClick={() => handleDeactivatePolicy(p)}
                              className="w-8 h-8 rounded-xl border border-slate-200 bg-white hover:bg-amber-50 hover:border-amber-300 text-slate-600 hover:text-amber-700 flex items-center justify-center shadow-2xs transition-all cursor-pointer"
                              title="Deactivate Policy"
                            >
                              <IconPlayerPause className="w-4 h-4 stroke-[1.8]" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleReactivatePolicy(p)}
                              className="w-8 h-8 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-2xs transition-all cursor-pointer"
                              title="Reactivate Policy"
                            >
                              <IconPlayerPlay className="w-4 h-4 stroke-[1.8]" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <TablePagination
          currentPage={currentPage}
          totalItems={filteredPolicies.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[10, 25, 50, 100]}
          itemName="policies"
        />
      </div>

      {/* ===================== DRAWER 1: VIEW / READ POLICY RIGHT SIDEBAR ===================== */}
      {viewingPolicy &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] overflow-hidden bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setViewingPolicy(null)}
          >
            <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
              <div
                className="w-screen max-w-lg sm:max-w-xl bg-white shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-300 border-l border-slate-100"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Drawer Header */}
                <div className="relative bg-gradient-to-r from-[#5E4BE2] to-[#4B39C3] p-6 text-white shrink-0">
                  <button
                    type="button"
                    onClick={() => setViewingPolicy(null)}
                    className="absolute top-5 right-5 p-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
                    title="Close panel"
                  >
                    <IconX className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-3.5 pr-8">
                    <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/25 flex items-center justify-center text-white shrink-0 shadow-sm">
                      <IconFileText className="w-6 h-6 stroke-[1.8]" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-white/20 text-white border border-white/20 whitespace-nowrap">
                          v{viewingPolicy.version}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase whitespace-nowrap ${
                            viewingPolicy.isMandatory !== false
                              ? 'bg-rose-500/90 text-white'
                              : 'bg-white/20 text-white'
                          }`}
                        >
                          {viewingPolicy.isMandatory !== false ? 'Mandatory Sign-off' : 'General Guidance'}
                        </span>
                        {viewingPolicy.isActive === false && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-500 text-white whitespace-nowrap">
                            Deactivated
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-black tracking-tight leading-tight truncate text-white">
                        {viewingPolicy.title}
                      </h3>
                    </div>
                  </div>
                </div>

                {/* Drawer Document Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs leading-relaxed text-slate-700">
                  {/* Attached Policy Document Card */}
                  {viewingPolicy.documentUrl && (
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/90 to-purple-50/50 border border-indigo-100 shadow-2xs space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-11 h-11 rounded-xl bg-white text-[#5E4BE2] shadow-2xs border border-indigo-100 flex items-center justify-center shrink-0">
                            {viewingPolicy.documentUrl.toLowerCase().includes('.pdf') ? (
                              <IconFileTypePdf className="w-6 h-6 text-rose-600 stroke-[1.8]" />
                            ) : (
                              <IconFileText className="w-6 h-6 text-[#5E4BE2] stroke-[1.8]" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 block">
                              Attached Policy Document
                            </span>
                            <h4 className="text-xs font-bold text-slate-900 truncate mt-0.5">
                              {viewingPolicy.title}
                            </h4>
                            <span className="text-[11px] text-slate-500 font-mono block truncate">
                              {viewingPolicy.documentUrl.split('/').pop() || 'policy-document'}
                            </span>
                          </div>
                        </div>

                        <a
                          href={getDocumentPreviewUrl(viewingPolicy.documentUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#5E4BE2] hover:bg-[#4d3cc9] text-white text-xs font-bold shadow-xs transition-colors shrink-0 cursor-pointer"
                        >
                          <IconExternalLink className="w-3.5 h-3.5" />
                          <span>View Document</span>
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Clauses Box (if body/content exists) */}
                  {(viewingPolicy.body || viewingPolicy.content) && (
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/70 space-y-2.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Official Clauses & Policy Scope
                      </span>
                      <p className="text-xs text-slate-800 whitespace-pre-line leading-relaxed font-normal">
                        {viewingPolicy.body || viewingPolicy.content}
                      </p>
                    </div>
                  )}

                  {!viewingPolicy.documentUrl && !viewingPolicy.body && !viewingPolicy.content && (
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/70 text-center text-slate-400 text-xs">
                      No document or text content available for this policy.
                    </div>
                  )}

                  {/* Compliance & Sign-offs Card */}
                  <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-white text-[#5E4BE2] flex items-center justify-center font-bold text-xs shadow-2xs border border-indigo-100 shrink-0">
                        <IconCheck className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-xs text-slate-900">Compliance & Employee Sign-offs</h4>
                        <p className="text-[11px] text-slate-500">
                          {Array.isArray(viewingPolicy.acceptances) ? viewingPolicy.acceptances.length : 0} employees have digitally acknowledged this policy version.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-indigo-100/60 text-[11px]">
                      <span className="text-slate-500 font-medium">Policy Validity:</span>
                      <span className="font-bold text-[#5E4BE2]">
                        {viewingPolicy.validUntil
                          ? `Valid until ${new Date(viewingPolicy.validUntil).toLocaleDateString()}`
                          : 'Indefinite validity'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Drawer Footer */}
                <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between gap-3 shrink-0">
                  <span className="text-[11px] text-slate-400 font-medium truncate">
                    Published on {new Date(viewingPolicy.createdAt).toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        const p = viewingPolicy;
                        setViewingPolicy(null);
                        handleOpenEditModal(p);
                      }}
                      className="px-3.5 py-2 text-xs font-bold rounded-xl bg-indigo-50 text-[#5E4BE2] hover:bg-indigo-100 transition-colors cursor-pointer"
                    >
                      Edit Document
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewingPolicy(null)}
                      className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ===================== DRAWER 2: PUBLISH / EDIT POLICY RIGHT SIDEBAR ===================== */}
      {isFormModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] overflow-hidden bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setIsFormModalOpen(false)}
          >
            <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
              <div
                className="w-screen max-w-lg sm:max-w-xl bg-white shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-300 border-l border-slate-100"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Drawer Header */}
                <div className="relative bg-gradient-to-r from-[#5E4BE2] to-[#4B39C3] p-6 text-white shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsFormModalOpen(false)}
                    className="absolute top-5 right-5 p-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
                    title="Close panel"
                  >
                    <IconX className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-3.5 pr-8">
                    <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/25 flex items-center justify-center text-white shrink-0 shadow-sm">
                      <IconFileCheck className="w-6 h-6 stroke-[1.8]" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-lg font-black tracking-tight leading-tight truncate text-white">
                        {editingPolicy ? 'Edit Policy Document' : 'Publish New Policy Document'}
                      </h3>
                      <p className="text-xs text-white/80 font-medium mt-0.5 truncate">
                        {editingPolicy
                          ? `Update terms & bump version for "${editingPolicy.title}"`
                          : 'Author and distribute company compliance rules & guidelines'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Drawer Form */}
                <form onSubmit={handleSavePolicy} className="flex-1 flex flex-col justify-between overflow-y-auto">
                  <div className="p-6 space-y-4">
                    {formError && (
                      <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
                        <IconAlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                        <span>{formError}</span>
                      </div>
                    )}

                    {/* Policy Title */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Policy Document Title <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Information Security & Device Usage Policy"
                        value={title}
                        onChange={(e) => handleTitleChange(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-indigo-500 font-medium text-slate-800 transition-colors"
                      />
                    </div>

                    {/* Category & Version */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Operational Category</label>
                        <select
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-indigo-500 font-medium text-slate-800 transition-colors cursor-pointer"
                        >
                          <option value="CODE_OF_CONDUCT">Code of Conduct & Ethics</option>
                          <option value="IT_SECURITY">IT & Cyber Security</option>
                          <option value="POSH">Anti-Harassment (POSH)</option>
                          <option value="LEAVE_POLICY">Leave & Absence Framework</option>
                          <option value="REMOTE_WORK">Remote & Hybrid Work</option>
                          <option value="HR">General Corporate HR</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Document Version</label>
                        <input
                          type="text"
                          required
                          value={version}
                          onChange={(e) => setVersion(e.target.value)}
                          placeholder="1.0"
                          className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-indigo-500 font-mono font-bold text-slate-800 transition-colors"
                        />
                      </div>
                    </div>

                    {/* Valid Until Date */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Review / Valid Until Date (Optional)
                      </label>
                      <input
                        type="date"
                        min={new Date().toISOString().split('T')[0]}
                        value={validUntil}
                        onChange={(e) => setValidUntil(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-indigo-500 text-slate-700 font-medium transition-colors cursor-pointer"
                      />
                    </div>

                    {/* Policy Document Attachment */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold text-slate-700">
                          Attach Policy Document <span className="text-rose-500">*</span>
                        </label>
                        <span className="text-[11px] text-slate-400 font-medium">
                          PDF, DOC, DOCX (Max 10MB)
                        </span>
                      </div>

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        className="hidden"
                        onChange={handleFileChange}
                      />

                      {/* State 1: A new file is chosen */}
                      {attachedFile ? (
                        <div className="p-3.5 rounded-2xl bg-indigo-50/70 border-2 border-indigo-200/80 flex items-center justify-between gap-3 transition-all">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-white text-[#5E4BE2] shadow-2xs border border-indigo-100 flex items-center justify-center shrink-0">
                              {attachedFile.name.toLowerCase().endsWith('.pdf') ? (
                                <IconFileTypePdf className="w-5 h-5 text-rose-600" />
                              ) : (
                                <IconFileText className="w-5 h-5 text-[#5E4BE2]" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 truncate">
                                {attachedFile.name}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[11px] text-slate-500 font-medium">
                                  {formatFileSize(attachedFile.size)}
                                </span>
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200">
                                  <IconCheck className="w-3 h-3 text-emerald-600" /> Ready to upload
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="px-2.5 py-1.5 text-[11px] font-bold text-[#5E4BE2] hover:bg-white rounded-lg transition-colors cursor-pointer"
                            >
                              Change
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setAttachedFile(null);
                                if (fileInputRef.current) fileInputRef.current.value = '';
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Remove file"
                            >
                              <IconTrash className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ) : existingDocumentUrl ? (
                        /* State 2: Editing policy with an existing document attached */
                        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 transition-all">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-[#5E4BE2] border border-indigo-100 flex items-center justify-center shrink-0">
                              <IconPaperclip className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-800 truncate">
                                Current Document Attached
                              </p>
                              <a
                                href={getDocumentPreviewUrl(existingDocumentUrl)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] text-[#5E4BE2] hover:underline inline-flex items-center gap-1 mt-0.5 font-medium truncate"
                              >
                                <span>Preview document</span>
                                <IconExternalLink className="w-3 h-3 shrink-0" />
                              </a>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="px-2.5 py-1.5 text-[11px] font-bold text-[#5E4BE2] bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer"
                            >
                              Replace File
                            </button>
                            <button
                              type="button"
                              onClick={() => setExistingDocumentUrl(null)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Remove attached document"
                            >
                              <IconTrash className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* State 3: Empty upload dropzone */
                        <div
                          onDragOver={(e) => {
                            e.preventDefault();
                            setIsDragging(true);
                          }}
                          onDragLeave={() => setIsDragging(false)}
                          onDrop={handleDrop}
                          onClick={() => fileInputRef.current?.click()}
                          className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                            isDragging
                              ? 'border-[#5E4BE2] bg-indigo-50/50 scale-[0.99]'
                              : 'border-slate-200 hover:border-indigo-400 bg-slate-50/60 hover:bg-indigo-50/30'
                          }`}
                        >
                          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-[#5E4BE2] border border-indigo-100 mx-auto flex items-center justify-center mb-2.5 shadow-2xs">
                            <IconUpload className="w-6 h-6 stroke-[1.8]" />
                          </div>
                          <p className="text-xs font-bold text-slate-800">
                            Click to browse or drag and drop your document
                          </p>
                          <p className="text-[11px] text-slate-400 mt-1">
                            Upload official policy PDF, DOC, or DOCX document (up to 10MB)
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Mandatory Sign-off Toggle */}
                    <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80 cursor-pointer hover:bg-slate-100/60 transition-colors select-none">
                      <input
                        type="checkbox"
                        checked={isMandatory}
                        onChange={(e) => setIsMandatory(e.target.checked)}
                        className="w-4 h-4 rounded text-[#5E4BE2] focus:ring-[#5E4BE2] cursor-pointer mt-0.5"
                      />
                      <div>
                        <span className="text-xs font-bold text-slate-900 block leading-tight">
                          Mandatory Compliance Sign-off
                        </span>
                        <span className="text-[11px] text-slate-500 mt-0.5 block">
                          Requires all company employees to digitally read and acknowledge this version upon login.
                        </span>
                      </div>
                    </label>
                  </div>

                  {/* Drawer Footer */}
                  <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsFormModalOpen(false)}
                      className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-5 py-2 text-xs font-bold rounded-xl bg-[#5E4BE2] hover:bg-[#4d3cc9] text-white shadow-sm shadow-indigo-600/25 disabled:opacity-50 cursor-pointer transition-all"
                    >
                      {isSubmitting
                        ? 'Publishing...'
                        : editingPolicy
                        ? 'Update'
                        : 'Publish'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ===================== FLOATING CONFIRMATION TOASTER FOR DEACTIVATE ===================== */}
      {deactivatingPolicy && (
        <div className="fixed top-6 right-6 z-50 max-w-sm sm:max-w-md w-[calc(100%-3rem)] pointer-events-auto animate-in slide-in-from-top-4 fade-in duration-200">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 shadow-2xl p-4 sm:p-5 ring-1 ring-slate-900/10 transition-all">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                <IconPlayerPause className="w-5 h-5 stroke-[1.8]" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-bold text-slate-900">
                    Deactivate Policy?
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      if (!isDeactivating) setDeactivatingPolicy(null);
                    }}
                    className="p-1 -mr-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Dismiss"
                  >
                    <IconX className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                  Are you sure you want to deactivate policy <strong className="text-slate-900">"{deactivatingPolicy.title}"</strong>? Employees will no longer see this policy until it is reactivated.
                </p>

                {deactivateError && (
                  <div className="mt-2.5 p-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex items-center gap-1.5">
                    <IconAlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                    <span>{deactivateError}</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 mt-3.5 pt-2.5 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setDeactivatingPolicy(null)}
                    disabled={isDeactivating}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDeactivate}
                    disabled={isDeactivating}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-sm shadow-amber-600/25 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isDeactivating ? 'Deactivating...' : 'Confirm Deactivate'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== FLOATING STATUS TOASTER NOTIFICATION ===================== */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 max-w-sm sm:max-w-md w-[calc(100%-3rem)] pointer-events-auto animate-in slide-in-from-top-4 fade-in duration-200">
          <div
            className={`p-4 rounded-2xl border shadow-xl flex items-start gap-3 backdrop-blur-md transition-all ${
              toast.type === 'error'
                ? 'bg-rose-50/95 border-rose-200 text-rose-950 shadow-rose-900/10'
                : toast.type === 'success'
                ? 'bg-emerald-50/95 border-emerald-200 text-emerald-950 shadow-emerald-900/10'
                : 'bg-indigo-50/95 border-indigo-200 text-indigo-950 shadow-indigo-900/10'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                toast.type === 'error'
                  ? 'bg-rose-100 text-rose-600'
                  : 'bg-emerald-100 text-emerald-600'
              }`}
            >
              {toast.type === 'error' ? (
                <IconAlertCircle className="w-5 h-5 stroke-[2.2]" />
              ) : (
                <IconCheck className="w-5 h-5 stroke-[2.2]" />
              )}
            </div>

            <div className="flex-1 min-w-0 pt-0.5">
              <p className="font-bold text-xs leading-snug">{toast.title}</p>
              <p className="mt-0.5 text-[11px] font-medium leading-relaxed opacity-90">{toast.message}</p>
            </div>

            <button
              type="button"
              onClick={() => setToast(null)}
              className="p-1 -mr-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-black/5 transition-colors cursor-pointer shrink-0"
              title="Dismiss"
            >
              <IconX className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagePoliciesPage;
