import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { OfferLetterPdfDrawer } from '../../components/pdf';
import TablePagination from '../../components/common/TablePagination';
import {
  IconFileCertificate,
  IconPlus,
  IconSearch,
  IconFilter,
  IconChevronDown,
  IconX,
  IconEye,
  IconSparkles,
  IconTrash,
  IconPaperclip,
  IconRefresh,
  IconFileText,
} from '@tabler/icons-react';

export interface SalaryComponentItem {
  id: string;
  name: string;
  monthly: number | string;
}

export interface AttachedFileItem {
  id: string;
  name: string;
  size: string;
}

export interface OfferLetterItem {
  id: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone?: string;
  jobTitle: string;
  department: string;
  annualCtc: number;
  monthlySalary: number;
  joiningDate: string;
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'JOINED' | 'DECLINED';
  createdAt: string;
  includeSalaryBreakdown?: boolean;
  includeTermsAndConditions?: boolean;
  terms?: {
    probationMonths: number;
    noticeDays: number;
    workMode: string;
    workingHours: string;
  };
  breakdown: {
    basicMonthly: number;
    hraMonthly: number;
    specialAllowanceMonthly: number;
    pfMonthly?: number;
    ptMonthly?: number;
    netMonthly: number;
    customComponents?: Array<{ name: string; monthly: number }>;
  };
  attachedFiles?: Array<{ name: string; size?: string }>;
}

export const OfferLettersPage: React.FC = () => {
  const { company } = useAuth();

  // Generated offer letters repository loaded from backend API
  const [offerLetters, setOfferLetters] = useState<OfferLetterItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchOfferLetters = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/company/offer-letters');
      setOfferLetters(res.data?.offerLetters || []);
    } catch (err) {
      console.error('Failed to load offer letters:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOfferLetters();
  }, []);

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [previewLetter, setPreviewLetter] = useState<OfferLetterItem | null>(null);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterStatus]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Form State
  const [form, setForm] = useState({
    candidateName: '',
    candidateEmail: '',
    candidatePhone: '',
    jobTitle: '',
    department: 'Engineering',
    workMode: 'On-site (WFO)',
    annualCtc: '600000',
    joiningDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    probationMonths: '3',
    noticeDays: '30',
    workingHours: '09:30 AM - 06:30 PM (Mon to Fri)',
    status: 'DRAFT' as OfferLetterItem['status'],
    includeSalaryBreakdown: true,
    includeTermsAndConditions: true,
    basicMonthly: '25000',
    hraMonthly: '10000',
    specialAllowanceMonthly: '15000',
    customComponents: [] as SalaryComponentItem[],
    attachedFiles: [] as AttachedFileItem[],
  });

  // Handle live recalculation when Annual CTC is edited
  const handleCtcChange = (newAnnualCtc: string) => {
    const ctc = Number(newAnnualCtc) || 0;
    const monthly = Math.round(ctc / 12);
    const basic = Math.round(monthly * 0.5);
    const hra = Math.round(monthly * 0.2);
    const customSum = form.customComponents.reduce((sum, c) => sum + (Number(c.monthly) || 0), 0);
    const special = Math.max(0, monthly - basic - hra - customSum);

    setForm((prev) => ({
      ...prev,
      annualCtc: newAnnualCtc,
      basicMonthly: String(basic),
      hraMonthly: String(hra),
      specialAllowanceMonthly: String(special),
    }));
  };

  const handleResetToStandardSplit = () => {
    const ctc = Number(form.annualCtc) || 0;
    const monthly = Math.round(ctc / 12);
    const basic = Math.round(monthly * 0.5);
    const hra = Math.round(monthly * 0.2);
    const customSum = form.customComponents.reduce((sum, c) => sum + (Number(c.monthly) || 0), 0);
    const special = Math.max(0, monthly - basic - hra - customSum);

    setForm((prev) => ({
      ...prev,
      basicMonthly: String(basic),
      hraMonthly: String(hra),
      specialAllowanceMonthly: String(special),
    }));
  };

  const handleAddCustomField = () => {
    const newField: SalaryComponentItem = {
      id: `comp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: 'Custom Allowance',
      monthly: 0,
    };
    setForm((prev) => ({
      ...prev,
      customComponents: [...prev.customComponents, newField],
    }));
  };

  const handleUpdateCustomField = (id: string, updates: Partial<SalaryComponentItem>) => {
    setForm((prev) => ({
      ...prev,
      customComponents: prev.customComponents.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    }));
  };

  const handleRemoveCustomField = (id: string) => {
    setForm((prev) => ({
      ...prev,
      customComponents: prev.customComponents.filter((c) => c.id !== id),
    }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles: AttachedFileItem[] = Array.from(files).map((f) => {
      const sizeInKb = Math.round(f.size / 1024);
      const sizeStr = sizeInKb > 1024 ? `${(sizeInKb / 1024).toFixed(1)} MB` : `${sizeInKb} KB`;
      return {
        id: `file_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: f.name,
        size: sizeStr,
      };
    });

    setForm((prev) => ({
      ...prev,
      attachedFiles: [...prev.attachedFiles, ...newFiles],
    }));

    if (e.target) e.target.value = '';
  };

  const handleRemoveFile = (id: string) => {
    setForm((prev) => ({
      ...prev,
      attachedFiles: prev.attachedFiles.filter((f) => f.id !== id),
    }));
  };

  // Calculate live salary totals accurately
  const basicVal = Number(form.basicMonthly) || 0;
  const hraVal = Number(form.hraMonthly) || 0;
  const specialVal = Number(form.specialAllowanceMonthly) || 0;
  const customSum = form.customComponents.reduce((sum, c) => sum + (Number(c.monthly) || 0), 0);

  const ctcMonthly = basicVal + hraVal + specialVal + customSum;
  const ctcAnnual = Number(form.annualCtc) || ctcMonthly * 12;
  const pfMonthly = ctcMonthly > 0 ? Math.round(Math.min(basicVal * 0.12, 1800)) : 0;
  const ptMonthly = ctcMonthly > 0 ? 200 : 0;
  const netMonthly = Math.max(0, ctcMonthly - pfMonthly - ptMonthly);

  const handleUpdateStatus = async (id: string, newStatus: OfferLetterItem['status']) => {
    try {
      await api.patch(`/company/offer-letters/${id}/status`, { status: newStatus });
      setOfferLetters((prev) => prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item)));
      if (previewLetter && previewLetter.id === id) {
        setPreviewLetter({ ...previewLetter, status: newStatus });
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleUpdateOptions = (
    id: string,
    options: { includeSalaryBreakdown?: boolean; includeTermsAndConditions?: boolean }
  ) => {
    setOfferLetters((prev) => prev.map((item) => (item.id === id ? { ...item, ...options } : item)));
    if (previewLetter && previewLetter.id === id) {
      setPreviewLetter({ ...previewLetter, ...options });
    }
  };

  const handleSaveOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.candidateName || !form.jobTitle || (!form.annualCtc && ctcAnnual <= 0)) {
      alert('Please fill in candidate name, job title, and CTC.');
      return;
    }

    try {
      const payload = {
        candidateName: form.candidateName.trim(),
        candidateEmail: form.candidateEmail.trim(),
        candidatePhone: form.candidatePhone.trim(),
        jobTitle: form.jobTitle.trim(),
        department: form.department,
        annualCtc: ctcAnnual,
        monthlySalary: ctcMonthly,
        joiningDate: form.joiningDate,
        status: form.status || 'DRAFT',
        terms: {
          probationMonths: Number(form.probationMonths) || 3,
          noticeDays: Number(form.noticeDays) || 30,
          workMode: form.workMode,
          workingHours: form.workingHours,
        },
        breakdown: {
          basicMonthly: basicVal,
          hraMonthly: hraVal,
          specialAllowanceMonthly: specialVal,
          pfMonthly,
          ptMonthly,
          netMonthly,
          customComponents: form.customComponents.map((c) => ({
            name: c.name,
            monthly: Number(c.monthly) || 0,
          })),
        },
        customComponents: form.customComponents,
        attachedFiles: form.attachedFiles,
      };

      const res = await api.post('/company/offer-letters', payload);
      const created = res.data?.offerLetter;
      if (created) {
        setOfferLetters((prev) => [created, ...prev]);
        setPreviewLetter(created);
      } else {
        await fetchOfferLetters();
      }
      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Failed to create offer letter:', err);
      alert(err.response?.data?.error?.message || 'Failed to create offer letter');
    }
  };

  const filtered = offerLetters.filter((o) => {
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      o.candidateName.toLowerCase().includes(q) ||
      o.jobTitle.toLowerCase().includes(q) ||
      o.department.toLowerCase().includes(q);

    if (filterStatus === 'ALL') return matchesSearch;
    return matchesSearch && o.status === filterStatus;
  });

  const paginatedLetters = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner (Hero Banner) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <IconFileCertificate className="w-5 h-5 text-indigo-600 shrink-0" />
            <span>Offer Letters</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Generate, customize, and issue formal employment offer letters with automated CTC salary breakdowns.
          </p>
        </div>

        {/* Primary CTA: Generate New Offer Letter */}
        <button
          onClick={() => {
            setForm({
              candidateName: '',
              candidateEmail: '',
              candidatePhone: '',
              jobTitle: '',
              department: '',
              workMode: 'On-site (WFO)',
              annualCtc: '',
              joiningDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
              probationMonths: '3',
              noticeDays: '30',
              workingHours: '09:30 AM - 06:30 PM (Mon to Fri)',
              status: 'DRAFT',
              includeSalaryBreakdown: true,
              includeTermsAndConditions: true,
              basicMonthly: '0',
              hraMonthly: '0',
              specialAllowanceMonthly: '0',
              customComponents: [],
              attachedFiles: [],
            });
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#5E4BE2] hover:bg-[#4D3BC9] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer shrink-0"
        >
          <IconPlus className="w-4 h-4" />
          <span>Generate Letter</span>
        </button>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-[#5E4BE2] flex items-center justify-center shrink-0">
              <IconFileCertificate className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">All Offer Letters</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                View and manage issued employment contracts and offer letters.
              </p>
            </div>
          </div>

          {/* Right Controls: Search & Filter */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <IconSearch className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search candidate, role, or department..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500 text-slate-800 placeholder-slate-400"
              />
            </div>

            {/* Filter Dropdown */}
            <div className="relative">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="appearance-none pl-8 pr-7 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500 text-slate-700 cursor-pointer"
              >
                <option value="ALL">All Status</option>
                <option value="DRAFT">Draft</option>
                <option value="SENT">Sent</option>
                <option value="ACCEPTED">Accepted</option>
                <option value="JOINED">Joined</option>
                <option value="DECLINED">Declined</option>
              </select>
              <IconFilter className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <IconChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Table Structure */}
        <div className="overflow-x-auto border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#e5e7eb] text-xs font-bold text-slate-900 border-b border-slate-300">
              <tr>
                <th className="px-5 py-3.5">Candidate</th>
                <th className="px-5 py-3.5">Role &amp; Department</th>
                <th className="px-5 py-3.5">Annual CTC</th>
                <th className="px-5 py-3.5">Joining Date</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <div className="w-12 h-12 rounded-full bg-indigo-50 text-[#5E4BE2] flex items-center justify-center mx-auto mb-2">
                      <IconFileCertificate className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-800">No offer letters found</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      {search ? 'Try modifying your search filter.' : 'Click "Generate New Offer Letter" to issue your first offer.'}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedLetters.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Candidate */}
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-900 text-xs">{item.candidateName}</div>
                      <div className="text-[11px] text-slate-400 font-normal">{item.candidateEmail}</div>
                    </td>

                    {/* Role & Department */}
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-800 text-xs">{item.jobTitle}</div>
                      <span className="inline-block mt-0.5 text-[10px] font-medium text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200/60">
                        {item.department}
                      </span>
                    </td>

                    {/* Annual CTC */}
                    <td className="px-5 py-3.5 font-bold text-slate-900 text-xs">
                      ₹{item.annualCtc.toLocaleString('en-IN')}
                    </td>

                    {/* Joining Date */}
                    <td className="px-5 py-3.5 text-xs text-slate-600 font-medium">
                      {new Date(item.joiningDate).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>

                    {/* Interactive Status Selector */}
                    <td className="px-5 py-3.5">
                      <div className="relative inline-block">
                        <select
                          value={item.status}
                          onChange={(e) => handleUpdateStatus(item.id, e.target.value as any)}
                          className={`appearance-none pl-6 pr-6 py-1 rounded-full text-[10px] font-bold cursor-pointer border transition-colors ${
                            item.status === 'JOINED'
                              ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100/70'
                              : item.status === 'ACCEPTED'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100/70'
                              : item.status === 'SENT'
                              ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100/70'
                              : item.status === 'DECLINED'
                              ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100/70'
                              : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200/70'
                          }`}
                          title="Click to update status"
                        >
                          <option value="DRAFT">Draft</option>
                          <option value="SENT">Sent</option>
                          <option value="ACCEPTED">Accepted</option>
                          <option value="JOINED">Joined</option>
                          <option value="DECLINED">Declined</option>
                        </select>
                        <span className={`w-1.5 h-1.5 rounded-full absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${
                          item.status === 'JOINED'
                            ? 'bg-purple-600'
                            : item.status === 'ACCEPTED'
                            ? 'bg-emerald-600'
                            : item.status === 'SENT'
                            ? 'bg-blue-600'
                            : item.status === 'DECLINED'
                            ? 'bg-rose-600'
                            : 'bg-slate-500'
                        }`} />
                        <IconChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </td>

                    {/* Clean View Action Icon */}
                    <td className="px-5 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => setPreviewLetter(item)}
                        className="w-8 h-8 rounded-xl border border-slate-200 bg-white hover:bg-indigo-50 hover:border-indigo-300 text-slate-700 hover:text-[#5E4BE2] inline-flex items-center justify-center shadow-2xs transition-all cursor-pointer"
                        title="View Offer Letter"
                      >
                        <IconEye className="w-4 h-4 stroke-[1.8]" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <TablePagination
          currentPage={currentPage}
          totalItems={filtered.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
          pageSizeOptions={[5, 10, 20, 50]}
          itemName="offer letters"
        />
      </div>

      {/* GENERATE OFFER LETTER DRAWER (RIGHT SIDE SLIDE-OVER) */}
      {isModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] overflow-hidden no-print">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
            onClick={() => setIsModalOpen(false)}
          />

          {/* Right-Side Drawer Container */}
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10 pointer-events-none">
            <div
              className="w-screen max-w-2xl bg-white shadow-2xl flex flex-col h-full border-l border-slate-200 pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drawer Top Header (Sticky) */}
              <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-white shrink-0">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-50 text-[#5E4BE2] flex items-center justify-center shrink-0">
                      <IconFileCertificate className="w-4 h-4" />
                    </div>
                    Employment Offer Letter
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Enter candidate details and CTC salary. The compensation components will be calculated automatically.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 cursor-pointer transition-colors"
                  title="Close"
                >
                  <IconX className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Scrollable Body (Form) */}
              <form onSubmit={handleSaveOffer} className="flex-1 overflow-y-auto p-6 space-y-4 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Candidate Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={form.candidateName}
                        onChange={(e) => setForm({ ...form, candidateName: e.target.value })}
                        placeholder="e.g. Rahul Sharma"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-hidden focus:border-[#5E4BE2]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Candidate Email Address *
                      </label>
                      <input
                        type="email"
                        required
                        value={form.candidateEmail}
                        onChange={(e) => setForm({ ...form, candidateEmail: e.target.value })}
                        placeholder="e.g. rahul.sharma@gmail.com"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-hidden focus:border-[#5E4BE2]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Phone Number
                      </label>
                      <input
                        type="text"
                        value={form.candidatePhone}
                        onChange={(e) => setForm({ ...form, candidatePhone: e.target.value })}
                        placeholder="e.g. +91 98765 43210"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-hidden focus:border-[#5E4BE2]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Designation / Role Title *
                      </label>
                      <input
                        type="text"
                        required
                        value={form.jobTitle}
                        onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}
                        placeholder="e.g. Senior Software Engineer"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-hidden focus:border-[#5E4BE2]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Department
                      </label>
                      <select
                        value={form.department}
                        onChange={(e) => setForm({ ...form, department: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-hidden focus:border-[#5E4BE2] cursor-pointer"
                      >
                        <option value="Engineering">Engineering</option>
                        <option value="Product">Product</option>
                        <option value="Marketing">Marketing</option>
                        <option value="Sales">Sales</option>
                        <option value="Human Resources">Human Resources</option>
                        <option value="Finance & Operations">Finance &amp; Operations</option>
                      </select>
                    </div>

                    {/* Work Mode: Only On-site and Remote (Hybrid Removed) */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Work Mode
                      </label>
                      <select
                        value={form.workMode}
                        onChange={(e) => setForm({ ...form, workMode: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-hidden focus:border-[#5E4BE2] cursor-pointer"
                      >
                        <option value="On-site (WFO)">On-site (WFO)</option>
                        <option value="Remote (WFH)">Remote (WFH)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Date of Joining *
                      </label>
                      <input
                        type="date"
                        required
                        value={form.joiningDate}
                        onChange={(e) => setForm({ ...form, joiningDate: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-hidden focus:border-[#5E4BE2]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Annual CTC (₹ INR) *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-slate-400 font-bold text-xs">₹</span>
                        <input
                          type="number"
                          required
                          min="0"
                          step="5000"
                          value={form.annualCtc}
                          onChange={(e) => handleCtcChange(e.target.value)}
                          placeholder="e.g. 600000"
                          className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:border-[#5E4BE2]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Initial Offer Status
                      </label>
                      <select
                        value={form.status}
                        onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-hidden focus:border-[#5E4BE2] cursor-pointer"
                      >
                        <option value="DRAFT">Draft (Internal review)</option>
                        <option value="SENT">Sent (Issued to candidate)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Probation Period
                      </label>
                      <select
                        value={form.probationMonths}
                        onChange={(e) => setForm({ ...form, probationMonths: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-hidden focus:border-[#5E4BE2] cursor-pointer"
                      >
                        <option value="3">3 Months</option>
                        <option value="6">6 Months</option>
                        <option value="1">1 Month</option>
                        <option value="0">Direct Confirmation (0 Months)</option>
                      </select>
                    </div>
                  </div>

                  {/* Live Salary Structure Breakdown Card with Editable Fields & + Add Field */}
                  <div className={`border rounded-2xl p-4 mt-2 transition-all ${form.includeSalaryBreakdown ? 'bg-indigo-50/50 border-indigo-100' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                          <IconSparkles className="w-4 h-4 text-[#5E4BE2]" /> Automated Salary &amp; CTC Structure
                        </span>
                        {form.includeSalaryBreakdown && (
                          <span className="text-xs font-bold text-[#5E4BE2] bg-white px-2 py-0.5 rounded-lg border border-indigo-100">
                            Gross: ₹{ctcMonthly.toLocaleString('en-IN')}/mo
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {form.includeSalaryBreakdown && (
                          <button
                            type="button"
                            onClick={handleResetToStandardSplit}
                            className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 bg-white hover:bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-200 transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                            title="Recalculate 50% Basic, 20% HRA, remainder Special Allowance"
                          >
                            <IconRefresh className="w-3 h-3" />
                            <span>Auto Split</span>
                          </button>
                        )}
                        {/* Option: Include or omit breakdown table in offer letter */}
                        <label className="flex items-center gap-2 cursor-pointer select-none bg-white px-2.5 py-1 rounded-lg border border-indigo-100 shadow-2xs hover:border-[#5E4BE2] transition-colors">
                          <input
                            type="checkbox"
                            checked={form.includeSalaryBreakdown}
                            onChange={(e) => setForm({ ...form, includeSalaryBreakdown: e.target.checked })}
                            className="w-3.5 h-3.5 text-[#5E4BE2] rounded border-slate-300 focus:ring-[#5E4BE2] cursor-pointer"
                          />
                          <span className="text-xs font-semibold text-slate-700">
                            Include breakdown in Offer Letter
                          </span>
                        </label>
                      </div>
                    </div>

                    {form.includeSalaryBreakdown ? (
                      <div className="space-y-3">
                        {/* Editable Component Fields */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                          {/* Basic Salary */}
                          <div className="bg-white p-2.5 rounded-xl border border-indigo-100/60 shadow-2xs">
                            <span className="text-[10px] text-slate-500 font-semibold block mb-1">Basic Salary</span>
                            <div className="relative">
                              <span className="absolute left-2 top-1.5 text-slate-400 text-xs font-bold">₹</span>
                              <input
                                type="number"
                                min="0"
                                value={form.basicMonthly}
                                onChange={(e) => setForm({ ...form, basicMonthly: e.target.value })}
                                className="w-full pl-5 pr-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:border-[#5E4BE2]"
                              />
                            </div>
                            <span className="text-[10px] text-slate-400 font-medium block mt-1">
                              ₹{((Number(form.basicMonthly) || 0) * 12).toLocaleString('en-IN')}/yr
                            </span>
                          </div>

                          {/* HRA */}
                          <div className="bg-white p-2.5 rounded-xl border border-indigo-100/60 shadow-2xs">
                            <span className="text-[10px] text-slate-500 font-semibold block mb-1">House Rent (HRA)</span>
                            <div className="relative">
                              <span className="absolute left-2 top-1.5 text-slate-400 text-xs font-bold">₹</span>
                              <input
                                type="number"
                                min="0"
                                value={form.hraMonthly}
                                onChange={(e) => setForm({ ...form, hraMonthly: e.target.value })}
                                className="w-full pl-5 pr-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:border-[#5E4BE2]"
                              />
                            </div>
                            <span className="text-[10px] text-slate-400 font-medium block mt-1">
                              ₹{((Number(form.hraMonthly) || 0) * 12).toLocaleString('en-IN')}/yr
                            </span>
                          </div>

                          {/* Special Allowance */}
                          <div className="bg-white p-2.5 rounded-xl border border-indigo-100/60 shadow-2xs">
                            <span className="text-[10px] text-slate-500 font-semibold block mb-1">Special Allowance</span>
                            <div className="relative">
                              <span className="absolute left-2 top-1.5 text-slate-400 text-xs font-bold">₹</span>
                              <input
                                type="number"
                                min="0"
                                value={form.specialAllowanceMonthly}
                                onChange={(e) => setForm({ ...form, specialAllowanceMonthly: e.target.value })}
                                className="w-full pl-5 pr-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:border-[#5E4BE2]"
                              />
                            </div>
                            <span className="text-[10px] text-slate-400 font-medium block mt-1">
                              ₹{((Number(form.specialAllowanceMonthly) || 0) * 12).toLocaleString('en-IN')}/yr
                            </span>
                          </div>

                          {/* Net Take-Home (Calculated) */}
                          <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-100 shadow-2xs flex flex-col justify-between">
                            <div>
                              <span className="text-[10px] text-emerald-700 font-semibold block">Net Take-Home</span>
                              <span className="font-bold text-emerald-800 text-sm mt-1 block">
                                ₹{netMonthly.toLocaleString('en-IN')}
                              </span>
                            </div>
                            <span className="text-[10px] text-emerald-600 block mt-1">
                              (Pre-tax • -₹{pfMonthly} PF)
                            </span>
                          </div>
                        </div>

                        {/* Custom Component Fields Added by User */}
                        {form.customComponents.length > 0 && (
                          <div className="space-y-2 pt-2 border-t border-indigo-100">
                            <span className="text-[11px] font-bold text-indigo-900 block">
                              Additional Salary Components:
                            </span>
                            {form.customComponents.map((comp) => (
                              <div
                                key={comp.id}
                                className="flex items-center gap-2 bg-white p-2 rounded-xl border border-indigo-100 shadow-2xs"
                              >
                                <input
                                  type="text"
                                  value={comp.name}
                                  onChange={(e) => handleUpdateCustomField(comp.id, { name: e.target.value })}
                                  placeholder="Component Name (e.g. Conveyance, Medical)"
                                  className="flex-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:outline-hidden focus:border-[#5E4BE2]"
                                />
                                <div className="relative w-36">
                                  <span className="absolute left-2.5 top-1.5 text-slate-400 text-xs font-bold">₹</span>
                                  <input
                                    type="number"
                                    min="0"
                                    value={comp.monthly}
                                    onChange={(e) =>
                                      handleUpdateCustomField(comp.id, { monthly: Number(e.target.value) || 0 })
                                    }
                                    placeholder="Monthly"
                                    className="w-full pl-6 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:border-[#5E4BE2]"
                                  />
                                </div>
                                <span className="text-[11px] text-slate-400 font-medium w-24 text-right">
                                  ₹{((Number(comp.monthly) || 0) * 12).toLocaleString('en-IN')}/yr
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveCustomField(comp.id)}
                                  className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                                  title="Remove component"
                                >
                                  <IconTrash className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* + Add Component / Field Button */}
                        <div className="flex items-center justify-between pt-1">
                          <button
                            type="button"
                            onClick={handleAddCustomField}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-indigo-50 border border-dashed border-[#5E4BE2] text-[#5E4BE2] text-xs font-bold transition-all cursor-pointer shadow-2xs hover:shadow-xs"
                          >
                            <IconPlus className="w-3.5 h-3.5" />
                            <span>+ Add Salary Field / Component</span>
                          </button>

                          <div className="text-right text-[11px] text-slate-500">
                            Total Annual CTC: <strong className="text-slate-900">₹{ctcAnnual.toLocaleString('en-IN')}</strong>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500 bg-white/70 p-2.5 rounded-xl border border-slate-200/60 flex items-center justify-between">
                        <span>
                          Breakdown table <strong>will not be included</strong> in the offer letter. The letter will state the total CTC (<strong>₹{ctcAnnual.toLocaleString('en-IN')}/yr</strong>).
                        </span>
                        <span className="text-[11px] text-[#5E4BE2] font-semibold">
                          Gross: ₹{ctcMonthly.toLocaleString('en-IN')}/mo
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Attached Files & Documents Section */}
                  <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <IconPaperclip className="w-4 h-4 text-slate-500" />
                          <span>Enclosed Files &amp; Attachments</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Attach signed offer letters, NDAs, company handbook, or joining policies.
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-semibold cursor-pointer transition-colors shadow-2xs"
                      >
                        <IconPlus className="w-3.5 h-3.5 text-[#5E4BE2]" />
                        <span>Add File</span>
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </div>

                    {/* File List */}
                    {form.attachedFiles.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {form.attachedFiles.map((f) => (
                          <div
                            key={f.id}
                            className="inline-flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-xs text-slate-700 shadow-2xs"
                          >
                            <IconFileText className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            <span className="font-medium max-w-[180px] truncate" title={f.name}>
                              {f.name}
                            </span>
                            <span className="text-[10px] text-slate-400">({f.size})</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveFile(f.id)}
                              className="text-slate-400 hover:text-red-500 p-0.5 ml-1 transition-colors cursor-pointer"
                            >
                              <IconX className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Standard Terms & Conditions Option Card */}
                  <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold text-slate-800">
                        Include Standard Terms &amp; Conditions (Annexure B)
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Attaches legal clauses (code of conduct, working hours, probation, notice period, confidentiality, IP, BGV).
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={form.includeTermsAndConditions}
                        onChange={(e) => setForm({ ...form, includeTermsAndConditions: e.target.checked })}
                        className="w-4 h-4 text-[#5E4BE2] rounded border-slate-300 focus:ring-[#5E4BE2] cursor-pointer"
                      />
                    </label>
                  </div>
                </div>

                <div className="sticky bottom-0 -mx-6 -mb-6 p-6 bg-white/95 backdrop-blur-xs border-t border-slate-100 flex items-center justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#5E4BE2] hover:bg-[#4D3BC9] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    <IconSparkles className="w-4 h-4" />
                    <span>Generate</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* FORMAL LETTER PREVIEW DRAWER (RIGHT SIDE SLIDE-OVER) */}
      <OfferLetterPdfDrawer
        letter={previewLetter}
        company={company}
        onClose={() => setPreviewLetter(null)}
        onUpdateStatus={(newStatus) => {
          if (previewLetter) {
            handleUpdateStatus(previewLetter.id, newStatus);
          }
        }}
        onUpdateOptions={handleUpdateOptions}
      />
    </div>
  );
};

export default OfferLettersPage;
