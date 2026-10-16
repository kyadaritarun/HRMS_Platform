import React, { useState, useEffect, useMemo } from 'react';
import api from '../../api/client';
import {
  IconFileText,
  IconPlus,
  IconTrash,
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchPolicies = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/policies');
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

  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      setFormError('Please provide both a title and policy guidelines content.');
      return;
    }

    setFormError(null);
    setIsSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        slug: slug.trim() || undefined,
        category,
        policyType: category,
        version,
        validUntil: validUntil || null,
        body: body.trim(),
        content: body.trim(),
        isMandatory,
      };

      if (editingPolicy) {
        await api.patch(`/policies/${editingPolicy.id}`, payload);
      } else {
        await api.post('/policies', payload);
      }

      setIsFormModalOpen(false);
      fetchPolicies();
    } catch (err: any) {
      setFormError(err.response?.data?.error || err.response?.data?.message || 'Failed to save policy');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePolicy = async (p: PolicyItem) => {
    if (!window.confirm(`Are you sure you want to delete policy "${p.title}"? This will remove all compliance records for this document.`)) {
      return;
    }

    try {
      await api.delete(`/policies/${p.id}`);
      fetchPolicies();
    } catch (err: any) {
      alert(err.response?.data?.error || err.response?.data?.message || 'Failed to delete policy');
    }
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
              onChange={(e) => setSearch(e.target.value)}
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
                onChange={(e) => setSelectedCategory(e.target.value)}
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
                onChange={(e) => setSelectedCompliance(e.target.value)}
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
            <thead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 bg-slate-50/60">
              <tr>
                <th className="px-5 py-3.5 whitespace-nowrap min-w-[280px]">POLICY TITLE & GUIDELINES</th>
                <th className="px-5 py-3.5 whitespace-nowrap">CATEGORY</th>
                <th className="px-5 py-3.5 whitespace-nowrap">VERSION</th>
                <th className="px-5 py-3.5 whitespace-nowrap">COMPLIANCE TYPE</th>
                <th className="px-5 py-3.5 whitespace-nowrap min-w-[170px]">STAFF ACKNOWLEDGMENT</th>
                <th className="px-5 py-3.5 whitespace-nowrap">PUBLISHED DATE</th>
                <th className="px-5 py-3.5 whitespace-nowrap text-right">ACTIONS</th>
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
                filteredPolicies.map((p) => {
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
                            <button
                              onClick={() => setViewingPolicy(p)}
                              className="font-bold text-xs text-slate-900 group-hover:text-[#5E4BE2] transition-colors leading-tight line-clamp-1 block text-left cursor-pointer hover:underline"
                            >
                              {p.title}
                            </button>
                            <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                              {p.body || p.content || 'Official guidelines document'}
                            </p>
                            {p.slug && (
                              <span className="text-[10px] font-mono text-slate-400 block mt-0.5 truncate">
                                slug: {p.slug}
                              </span>
                            )}
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

                      {/* Actions */}
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5 shrink-0">
                          {/* Preview Policy */}
                          <button
                            onClick={() => setViewingPolicy(p)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-[#5E4BE2] hover:bg-indigo-50 transition-colors cursor-pointer"
                            title="Preview Policy Document"
                          >
                            <IconEye className="w-4 h-4" />
                          </button>

                          {/* Edit / Bump Version */}
                          <button
                            onClick={() => handleOpenEditModal(p)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                            title="Edit & Bump Version"
                          >
                            <IconPencil className="w-4 h-4" />
                          </button>

                          {/* Delete Policy */}
                          <button
                            onClick={() => handleDeletePolicy(p)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete Policy"
                          >
                            <IconTrash className="w-4 h-4" />
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
      </div>

      {/* ===================== MODAL 1: VIEW / READ POLICY MODAL ===================== */}
      {viewingPolicy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div
            className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[85vh] animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 sm:p-6 border-b border-slate-100 flex items-start justify-between gap-3 bg-gradient-to-r from-slate-50 via-indigo-50/20 to-white">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-[#5E4BE2] flex items-center justify-center shrink-0 shadow-2xs border border-indigo-100/60 mt-0.5">
                  <IconFileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap">
                      v{viewingPolicy.version}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase whitespace-nowrap ${
                        viewingPolicy.isMandatory !== false
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-indigo-50 text-[#5E4BE2] border border-indigo-200'
                      }`}
                    >
                      {viewingPolicy.isMandatory !== false ? 'Mandatory Sign-off' : 'General Guidance'}
                    </span>
                  </div>
                  <h3 className="text-base font-black text-slate-900 mt-1 break-words">
                    {viewingPolicy.title}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5 truncate">
                    Identifier: {viewingPolicy.slug}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setViewingPolicy(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
              >
                <IconX className="w-5 h-5" />
              </button>
            </div>

            {/* Document Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs leading-relaxed text-slate-700 max-h-[55vh]">
              <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/60 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Official Clauses & Policy Scope
                </span>
                <p className="text-xs text-slate-800 whitespace-pre-line leading-relaxed font-normal">
                  {viewingPolicy.body || viewingPolicy.content || 'No text content available for this policy document.'}
                </p>
              </div>

              {/* Compliance Acknowledgment Status Box */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white text-[#5E4BE2] flex items-center justify-center font-bold text-xs shadow-2xs border border-indigo-100 shrink-0">
                    <IconCheck className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">Compliance & Employee Sign-offs</h4>
                    <p className="text-[11px] text-slate-500">
                      {Array.isArray(viewingPolicy.acceptances) ? viewingPolicy.acceptances.length : 0} employees have digitally acknowledged this policy version.
                    </p>
                  </div>
                </div>
                <span className="text-xs font-black text-[#5E4BE2] bg-white px-2.5 py-1 rounded-lg border border-indigo-100 shadow-2xs whitespace-nowrap self-start sm:self-auto shrink-0">
                  {viewingPolicy.validUntil
                    ? `Valid until ${new Date(viewingPolicy.validUntil).toLocaleDateString()}`
                    : 'Indefinite validity'}
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <span className="text-xs text-slate-400">
                Published on {new Date(viewingPolicy.createdAt).toLocaleDateString()}
              </span>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  onClick={() => {
                    const p = viewingPolicy;
                    setViewingPolicy(null);
                    handleOpenEditModal(p);
                  }}
                  className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-indigo-50 text-[#5E4BE2] hover:bg-indigo-100 transition-colors cursor-pointer"
                >
                  Edit Document
                </button>
                <button
                  onClick={() => setViewingPolicy(null)}
                  className="px-4 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MODAL 2: PUBLISH / EDIT POLICY MODAL ===================== */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div
            className="bg-white rounded-3xl max-w-xl w-full shadow-2xl p-5 sm:p-6 border border-slate-100 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-[#5E4BE2] flex items-center justify-center font-bold">
                  <IconFileCheck className="w-4 h-4" />
                </div>
                <h3 className="text-base font-black text-slate-900">
                  {editingPolicy ? 'Edit Policy Document' : 'Publish New Policy Document'}
                </h3>
              </div>
              <button
                onClick={() => setIsFormModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <IconX className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <IconAlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSavePolicy} className="space-y-4">
              {/* Policy Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Policy Document Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Information Security & Device Usage Policy"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-indigo-500 font-medium text-slate-800"
                />
              </div>

              {/* Slug / Code */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Unique Slug Identifier
                </label>
                <input
                  type="text"
                  placeholder="e.g. info-sec-policy-2026"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-indigo-500 font-mono text-slate-600"
                />
              </div>

              {/* Category & Version */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Operational Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-indigo-500 font-medium text-slate-800"
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
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-indigo-500 font-mono text-slate-800"
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
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-indigo-500 text-slate-700 font-medium"
                />
              </div>

              {/* Policy Body */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Policy Content, Clauses & Guidelines *
                </label>
                <textarea
                  required
                  rows={5}
                  placeholder="Detail the mandatory compliance clauses, obligations, internal procedures, and penalty guidelines..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-indigo-500 font-normal text-slate-800 resize-none leading-relaxed"
                />
              </div>

              {/* Mandatory Sign-off Toggle */}
              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80 cursor-pointer hover:bg-slate-100/60 transition-colors">
                <input
                  type="checkbox"
                  checked={isMandatory}
                  onChange={(e) => setIsMandatory(e.target.checked)}
                  className="w-4 h-4 rounded text-[#5E4BE2] focus:ring-[#5E4BE2] cursor-pointer"
                />
                <div>
                  <span className="text-xs font-bold text-slate-900 block leading-tight">
                    Mandatory Compliance Sign-off
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Requires all company employees to digitally read and acknowledge this version upon login.
                  </span>
                </div>
              </label>

              {/* Footer Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-[#5E4BE2] hover:bg-[#4d3cc9] text-white shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting
                    ? 'Publishing...'
                    : editingPolicy
                    ? 'Update & Publish'
                    : 'Publish to Organization'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagePoliciesPage;
