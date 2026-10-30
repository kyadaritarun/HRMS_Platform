import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../../api/client';
import TablePagination from '../../components/common/TablePagination';
import { useAuth } from '../../context/AuthContext';
import {
  IconReceipt2,
  IconPlus,
  IconCash,
  IconAlertCircle,
  IconUpload,
  IconChevronDown,
  IconSearch,
  IconClock,
  IconCheck,
  IconX,
  IconPaperclip,
  IconEye,
} from '@tabler/icons-react';

interface ClaimItem {
  id: number;
  userId?: number;
  title: string;
  amount: number;
  reason: string;
  status: string;
  createdAt: string;
  decisionNote?: string;
  resolvedAt?: string;
  meta?: {
    category?: string;
    claimDate?: string;
    currency?: string;
    receiptFileName?: string;
    [key: string]: any;
  };
  user: {
    id?: number;
    firstName: string;
    lastName: string;
    email: string;
    jobTitle?: string;
  };
  approver?: {
    id?: number;
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface ClaimCategory {
  id: string;
  name: string;
  description?: string;
}

export const ClaimsPage: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const isManager = Boolean(user?.isManager || (user as any)?._count?.reports > 0);
  const canPay = user?.role === 'COMPANY_ADMIN' || user?.role === 'HR' || user?.role === 'FINANCE';

  const getInitialScope = () => {
    if (canPay) return 'company';
    if (location.pathname.includes('/manage')) return 'assigned';
    return 'mine';
  };

  const [scope, setScope] = useState<string>(getInitialScope);

  useEffect(() => {
    if (location.pathname.includes('/manage')) {
      setScope(canPay ? 'company' : 'assigned');
    }
  }, [location.pathname, canPay]);

  const [claims, setClaims] = useState<ClaimItem[]>([]);
  const [categories, setCategories] = useState<ClaimCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<ClaimItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, categoryFilter, search, scope]);

  // Form State
  const [category, setCategory] = useState<string>('');
  const [claimDate, setClaimDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState<string>('');
  const [currency, setCurrency] = useState<string>('INR');
  const [description, setDescription] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [claimsRes, catRes] = await Promise.all([
        api.get('/requests', { params: { type: 'CLAIM', scope } }),
        api.get('/company/claims/categories').catch(() => ({ data: { categories: [] } })),
      ]);
      setClaims(claimsRes.data?.items || []);
      const fetchedCats = catRes.data?.categories || [];
      setCategories(fetchedCats);
    } catch (err) {
      console.error('Failed to load claims data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [scope]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be under 5MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleSubmitClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await api.post('/requests', {
        type: 'CLAIM',
        title: description.trim().slice(0, 50) || `${category || 'General'} Expense Claim`,
        amount: Number(amount),
        reason: description.trim(),
        meta: {
          category: category || 'General',
          claimDate,
          currency,
          receiptFileName: selectedFile ? selectedFile.name : undefined,
        },
      });

      // Reset Form
      setCategory('');
      setClaimDate(new Date().toISOString().split('T')[0]);
      setAmount('');
      setCurrency('INR');
      setDescription('');
      setSelectedFile(null);
      setIsCreating(false);
      setSuccessMsg('Expense claim submitted successfully for manager approval!');
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to submit claim');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkPaid = async (id: number) => {
    if (!window.confirm('Mark this approved claim as paid and disbursed?')) return;
    try {
      await api.patch(`/requests/${id}/pay`);
      setSuccessMsg('Claim marked as paid & disbursed successfully.');
      if (selectedClaim?.id === id) {
        setSelectedClaim(null);
      }
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || err.response?.data?.message || 'Failed to mark claim as paid');
    }
  };

  const handleCancelClaim = async (id: number) => {
    if (!window.confirm('Are you sure you want to cancel this pending expense claim?')) return;
    try {
      await api.patch(`/requests/${id}/cancel`);
      setSuccessMsg('Expense claim cancelled successfully.');
      if (selectedClaim?.id === id) {
        setSelectedClaim(null);
      }
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || err.response?.data?.message || 'Failed to cancel claim');
    }
  };

  const handleDecideClaim = async (id: number, decision: 'APPROVED' | 'REJECTED', note?: string) => {
    try {
      await api.patch(`/requests/${id}/decision`, { status: decision, note: note || '' });
      setSuccessMsg(`Expense claim ${decision === 'APPROVED' ? 'approved' : 'rejected'} successfully.`);
      setSelectedClaim(null);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || err.response?.data?.message || `Failed to ${decision.toLowerCase()} claim`);
    }
  };

  // Filtered Claims
  const filteredClaims = useMemo(() => {
    return claims.filter((claim) => {
      if (statusFilter !== 'ALL' && claim.status !== statusFilter) return false;
      if (categoryFilter && claim.meta?.category !== categoryFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const title = (claim.title || '').toLowerCase();
        const reason = (claim.reason || '').toLowerCase();
        const empName = `${claim.user?.firstName || ''} ${claim.user?.lastName || ''}`.toLowerCase();
        const cat = (claim.meta?.category || '').toLowerCase();
        return title.includes(q) || reason.includes(q) || empName.includes(q) || cat.includes(q);
      }
      return true;
    });
  }, [claims, statusFilter, categoryFilter, search]);

  const paginatedClaims = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredClaims.slice(start, start + pageSize);
  }, [filteredClaims, currentPage, pageSize]);

  const formatCurrency = (val: number, curr?: string) => {
    const c = (curr || 'INR').toUpperCase();
    const symbol = c === 'USD' ? '$' : c === 'EUR' ? '€' : c === 'GBP' ? '£' : '₹';
    return `${symbol} ${Number(val || 0).toLocaleString('en-IN')}`;
  };

  const formatExpenseDate = (dateVal?: string, fallbackDate?: string) => {
    const target = dateVal || fallbackDate;
    if (!target) return '—';
    const d = new Date(target);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getCategoryStyle = (catName?: string) => {
    const cat = (catName || '').toLowerCase();
    if (cat.includes('travel') || cat.includes('transport') || cat.includes('stay') || cat.includes('flight')) {
      return 'bg-blue-50 text-blue-700 border-blue-200/70';
    }
    if (
      cat.includes('meal') ||
      cat.includes('lunch') ||
      cat.includes('dinner') ||
      cat.includes('entertainment') ||
      cat.includes('food')
    ) {
      return 'bg-amber-50 text-amber-700 border-amber-200/70';
    }
    if (cat.includes('internet') || cat.includes('mobile') || cat.includes('phone') || cat.includes('reimbursement')) {
      return 'bg-purple-50 text-purple-700 border-purple-200/70';
    }
    if (cat.includes('office') || cat.includes('equipment') || cat.includes('hardware')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200/70';
    }
    return 'bg-slate-100 text-slate-700 border-slate-200/70';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/70 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            Disbursed &amp; Paid
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200/70 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
            Approved
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200/70 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
            Rejected
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200/70 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
            Pending Review
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ===================== CLAIMS OVERVIEW & TABLE ===================== */}
      <div className="space-y-6">
        {/* ===================== TOP HEADER BAR ===================== */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <IconReceipt2 className="w-5 h-5 text-indigo-600 shrink-0" />
              <span>Claims</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Submit out-of-pocket expenses, travel allowances, and track disbursement status.
            </p>
          </div>

          <button
            onClick={() => {
              setError(null);
              setIsCreating(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#5E4BE2] hover:bg-[#4D3BC9] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
          >
            <IconPlus className="w-4 h-4" />
            <span>New Claim</span>
          </button>
        </div>

        {successMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IconCheck className="w-4 h-4 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
            <button
              onClick={() => setSuccessMsg(null)}
              className="text-xs font-bold text-emerald-600 hover:underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* ===================== ROW 2: SEARCH & FILTERS BAR ===================== */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* 1. Search Input */}
          <div className="relative flex-1">
            <IconSearch className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by title, employee, or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 text-xs font-medium bg-slate-50/70 border border-slate-200/80 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#5E4BE2]/20 focus:border-[#5E4BE2] transition-all placeholder:text-slate-400 text-slate-800"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <IconX className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Dropdowns Group: Category, Scope, Status */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5">
            {/* 2. Category Dropdown */}
            <div className="relative min-w-[190px] shrink-0">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full appearance-none pl-3.5 pr-8 py-2.5 text-xs font-semibold bg-slate-50/70 border border-slate-200/80 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#5E4BE2]/20 focus:border-[#5E4BE2] transition-all text-slate-700 cursor-pointer"
              >
                <option value="">Category: All</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    Category: {c.name}
                  </option>
                ))}
                {categories.length === 0 && (
                  <>
                    <option value="Travel & Accommodation">Category: Travel & Accommodation</option>
                    <option value="Client Entertainment">Category: Client Entertainment</option>
                    <option value="Internet & Mobile Reimbursement">Category: Internet & Mobile</option>
                    <option value="Office Equipment">Category: Office Equipment</option>
                  </>
                )}
              </select>
              <IconChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* 3. Scope Dropdown */}
            {(isManager || canPay) && (
              <div className="relative min-w-[175px] shrink-0">
                <select
                  value={scope}
                  onChange={(e) => {
                    setScope(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full appearance-none pl-3.5 pr-8 py-2.5 text-xs font-semibold bg-slate-50/70 border border-slate-200/80 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#5E4BE2]/20 focus:border-[#5E4BE2] transition-all text-slate-700 cursor-pointer"
                >
                  <option value="mine">Scope: My Claims</option>
                  <option value="assigned">Scope: {isManager ? 'Team Claims' : 'Assigned to Me'}</option>
                  {canPay && <option value="company">Scope: All Company</option>}
                </select>
                <IconChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            )}

            {/* 4. Status Dropdown */}
            <div className="relative min-w-[150px] shrink-0">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full appearance-none pl-3.5 pr-8 py-2.5 text-xs font-semibold bg-slate-50/70 border border-slate-200/80 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#5E4BE2]/20 focus:border-[#5E4BE2] transition-all text-slate-700 cursor-pointer"
              >
                <option value="ALL">Status: All</option>
                <option value="PENDING">Status: Pending</option>
                <option value="APPROVED">Status: Approved</option>
                <option value="PAID">Status: Paid</option>
                <option value="REJECTED">Status: Rejected</option>
              </select>
              <IconChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* ===================== ROW 3: DATA TABLE ===================== */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#e5e7eb] text-xs font-bold text-slate-900 border-b border-slate-300">
                <tr>
                  <th className="px-6 py-3.5 whitespace-nowrap min-w-[200px]">Claim Details</th>
                  {scope !== 'mine' && (
                    <th className="px-6 py-3.5 whitespace-nowrap min-w-[180px]">Employee</th>
                  )}
                  <th className="px-6 py-3.5 whitespace-nowrap min-w-[150px]">Category</th>
                  <th className="px-6 py-3.5 whitespace-nowrap min-w-[130px]">Expense Date</th>
                  <th className="px-6 py-3.5 whitespace-nowrap min-w-[120px]">Amount</th>
                  <th className="px-6 py-3.5 whitespace-nowrap min-w-[140px]">Status</th>
                  <th className="px-6 py-3.5 text-right whitespace-nowrap min-w-[100px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-4">
                        <div className="w-36 h-3.5 bg-slate-200 rounded-sm" />
                      </td>
                      {scope !== 'mine' && (
                        <td className="px-6 py-4">
                          <div className="w-24 h-3.5 bg-slate-200 rounded-sm" />
                        </td>
                      )}
                      <td className="px-6 py-4">
                        <div className="w-20 h-3.5 bg-slate-200 rounded-sm" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="w-20 h-3.5 bg-slate-200 rounded-sm" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="w-16 h-3.5 bg-slate-200 rounded-sm" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="w-20 h-3.5 bg-slate-200 rounded-full" />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="w-14 h-6 bg-slate-200 rounded-lg ml-auto" />
                      </td>
                    </tr>
                  ))
                ) : filteredClaims.length === 0 ? (
                  <tr>
                    <td colSpan={scope !== 'mine' ? 7 : 6} className="py-12 text-center">
                      <div className="w-12 h-12 rounded-full bg-indigo-50 text-[#5E4BE2] flex items-center justify-center mx-auto mb-2">
                        <IconReceipt2 className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-800">No expense claims found</h4>
                      <p className="text-xs text-slate-400 mt-1">
                        {search
                          ? 'Try modifying your search or filter.'
                          : 'Click "New Claim" to submit your first claim.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  paginatedClaims.map((claim) => (
                    <tr key={claim.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Claim Details */}
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 flex items-center gap-2">
                          <span className="truncate max-w-[200px] sm:max-w-xs">{claim.title}</span>
                          {claim.meta?.receiptFileName && (
                            <span
                              title={`Receipt attached: ${claim.meta.receiptFileName}`}
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-50 text-[#5E4BE2] border border-indigo-100/80 shrink-0"
                            >
                              <IconPaperclip className="w-3 h-3" />
                              <span className="hidden sm:inline">Receipt</span>
                            </span>
                          )}
                        </div>
                        {claim.reason && claim.reason.trim() !== claim.title.trim() && (
                          <div className="text-[11px] text-slate-400 max-w-xs truncate mt-0.5">
                            {claim.reason}
                          </div>
                        )}
                      </td>

                      {/* Employee (Shown on Team & All Company views only) */}
                      {scope !== 'mine' && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-indigo-50 border border-indigo-100 text-[#5E4BE2] font-bold text-[11px] flex items-center justify-center shrink-0">
                              {claim.user?.firstName?.[0] || 'U'}
                              {claim.user?.lastName?.[0] || ''}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900 text-xs">
                                {claim.user?.firstName} {claim.user?.lastName}
                              </div>
                              <div className="text-[11px] text-slate-400 font-normal">
                                {claim.user?.email}
                              </div>
                            </div>
                          </div>
                        </td>
                      )}

                      {/* Category */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${getCategoryStyle(
                            claim.meta?.category
                          )}`}
                        >
                          {claim.meta?.category || 'General'}
                        </span>
                      </td>

                      {/* Expense Date */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-xs font-semibold text-slate-800">
                          {formatExpenseDate(claim.meta?.claimDate, claim.createdAt)}
                        </div>
                        {claim.meta?.claimDate &&
                          new Date(claim.meta.claimDate).toDateString() !==
                            new Date(claim.createdAt).toDateString() && (
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              Submitted{' '}
                              {new Date(claim.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </div>
                          )}
                      </td>

                      {/* Amount */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-bold text-slate-900 text-xs sm:text-sm">
                          {formatCurrency(claim.amount, claim.meta?.currency)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(claim.status)}</td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Details */}
                          <button
                            type="button"
                            onClick={() => setSelectedClaim(claim)}
                            title="View Details"
                            className="w-8 h-8 rounded-xl border border-slate-200 text-slate-600 hover:text-[#5E4BE2] hover:border-indigo-200 hover:bg-indigo-50/50 shadow-2xs transition-all flex items-center justify-center cursor-pointer"
                          >
                            <IconEye className="w-4 h-4" />
                          </button>

                          {/* Disburse (Finance/Admin on Approved) */}
                          {canPay && claim.status === 'APPROVED' && (
                            <button
                              type="button"
                              onClick={() => handleMarkPaid(claim.id)}
                              title="Disburse Reimbursement"
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <IconCash className="w-3.5 h-3.5" />
                              <span>Disburse</span>
                            </button>
                          )}

                          {/* Cancel Pending Claim (for owner) */}
                          {claim.status === 'PENDING' &&
                            (claim.userId === user?.id || scope === 'mine') && (
                              <button
                                type="button"
                                onClick={() => handleCancelClaim(claim.id)}
                                title="Cancel Claim"
                                className="w-8 h-8 rounded-xl border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50/50 shadow-2xs transition-all flex items-center justify-center cursor-pointer"
                              >
                                <IconX className="w-4 h-4" />
                              </button>
                            )}
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
            totalItems={filteredClaims.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
            pageSizeOptions={[5, 10, 20, 50]}
            itemName="claims"
          />
        </div>
      </div>

      {/* ===================== VIEW CLAIM DETAILS DRAWER ===================== */}
      {selectedClaim && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setSelectedClaim(null)}
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10 pointer-events-none">
            <div
              className="w-screen max-w-lg bg-white shadow-2xl flex flex-col h-full border-l border-slate-200 pointer-events-auto animate-in slide-in-from-right duration-250 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drawer Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5E4BE2] shrink-0">
                    <IconReceipt2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-slate-900">Claim #{selectedClaim.id}</h2>
                      {getStatusBadge(selectedClaim.status)}
                    </div>
                    <p className="text-xs text-slate-500 font-medium">Expense reimbursement details</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedClaim(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Close"
                >
                  <IconX className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Body */}
              <div className="p-6 space-y-5 flex-1 overflow-y-auto">
                {/* Amount & Category Highlight Card */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/60 to-purple-50/40 border border-indigo-100/80 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Claim Amount
                    </div>
                    <div className="text-2xl font-black text-slate-900 mt-0.5">
                      {formatCurrency(selectedClaim.amount, selectedClaim.meta?.currency)}
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${getCategoryStyle(
                      selectedClaim.meta?.category
                    )}`}
                  >
                    {selectedClaim.meta?.category || 'General'}
                  </span>
                </div>

                {/* Employee / Requester Info */}
                <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Requester Information
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 text-[#5E4BE2] font-bold text-xs flex items-center justify-center shrink-0">
                      {selectedClaim.user?.firstName?.[0] || 'U'}
                      {selectedClaim.user?.lastName?.[0] || ''}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900">
                        {selectedClaim.user?.firstName} {selectedClaim.user?.lastName}
                      </div>
                      <div className="text-xs text-slate-500">
                        {selectedClaim.user?.email}{' '}
                        {selectedClaim.user?.jobTitle ? `• ${selectedClaim.user.jobTitle}` : ''}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dates Breakdown */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50">
                    <div className="text-[11px] font-bold text-slate-400">Expense Date</div>
                    <div className="text-xs font-bold text-slate-800 mt-1">
                      {formatExpenseDate(selectedClaim.meta?.claimDate, selectedClaim.createdAt)}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50">
                    <div className="text-[11px] font-bold text-slate-400">Submitted On</div>
                    <div className="text-xs font-bold text-slate-800 mt-1">
                      {new Date(selectedClaim.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </div>
                  </div>
                </div>

                {/* Purpose / Details */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Purpose / Description</label>
                  <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80 text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                    <div className="font-bold text-slate-900 mb-1">{selectedClaim.title}</div>
                    {selectedClaim.reason && selectedClaim.reason.trim() !== selectedClaim.title.trim() && (
                      <div className="text-slate-600">{selectedClaim.reason}</div>
                    )}
                  </div>
                </div>

                {/* Receipt Proof Attachment */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Receipt / Proof Document</label>
                  {selectedClaim.meta?.receiptFileName ? (
                    <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-[#5E4BE2] flex items-center justify-center shrink-0">
                          <IconPaperclip className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-800 truncate">
                            {selectedClaim.meta.receiptFileName}
                          </div>
                          <div className="text-[10px] text-slate-400">Attached Expense Proof</div>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-md bg-slate-100 text-[11px] font-semibold text-slate-600">
                        Uploaded
                      </span>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-400">
                      No receipt or invoice was attached with this claim.
                    </div>
                  )}
                </div>

                {/* Decision Note / Approver comment if any */}
                {selectedClaim.decisionNote && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Approver Comments</label>
                    <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/70 text-xs text-amber-900">
                      {selectedClaim.decisionNote}
                    </div>
                  </div>
                )}
              </div>

              {/* Drawer Sticky Footer */}
              <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-end gap-2.5 sticky bottom-0 z-10 shrink-0">
                {/* Disburse button if approved & canPay */}
                {canPay && selectedClaim.status === 'APPROVED' && (
                  <button
                    type="button"
                    onClick={() => handleMarkPaid(selectedClaim.id)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    <IconCash className="w-4 h-4" />
                    <span>Disburse Payment</span>
                  </button>
                )}

                {/* Manager / Admin review: Approve & Reject (only one negative action) */}
                {selectedClaim.status === 'PENDING' && (isManager || canPay) && scope !== 'mine' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        const note = prompt('Optional rejection note:');
                        if (note !== null) {
                          handleDecideClaim(selectedClaim.id, 'REJECTED', note);
                        }
                      }}
                      className="px-3.5 py-2 text-xs font-bold text-rose-600 border border-rose-200/80 rounded-xl hover:bg-rose-50 shadow-2xs transition-colors cursor-pointer"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDecideClaim(selectedClaim.id, 'APPROVED')}
                      className="px-3.5 py-2 bg-[#5E4BE2] hover:bg-[#4D3BC9] text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                    >
                      Approve Claim
                    </button>
                  </>
                ) : (
                  /* Employee's own pending claim: Cancel Claim */
                  selectedClaim.status === 'PENDING' &&
                  (selectedClaim.userId === user?.id || scope === 'mine') && (
                    <button
                      type="button"
                      onClick={() => handleCancelClaim(selectedClaim.id)}
                      className="px-3.5 py-2 text-xs font-bold text-rose-600 border border-rose-200/80 rounded-xl hover:bg-rose-50 shadow-2xs transition-colors cursor-pointer"
                    >
                      Cancel Claim
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== RIGHT SIDEBAR DRAWER: FILE EXPENSE CLAIM ===================== */}
      {isCreating && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setIsCreating(false)}
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10 pointer-events-none">
            <div
              className="w-screen max-w-lg bg-white shadow-2xl flex flex-col h-full border-l border-slate-200 pointer-events-auto animate-in slide-in-from-right duration-250 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drawer Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5E4BE2] shrink-0">
                    <IconReceipt2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">File Expense Claim</h2>
                    <p className="text-xs text-slate-500 font-medium">Submit out-of-pocket expenses and upload receipts</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Close Drawer"
                >
                  <IconX className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Form Body */}
              <form onSubmit={handleSubmitClaim} className="flex-1 flex flex-col justify-between overflow-y-auto">
                <div className="p-6 space-y-5 flex-1">
                  {error && (
                    <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                      <IconAlertCircle className="w-4 h-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Category */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Category <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs font-medium bg-slate-50/70 border border-slate-200/80 rounded-xl text-slate-700 appearance-none focus:outline-hidden focus:border-[#5E4BE2] focus:ring-2 focus:ring-[#5E4BE2]/20 transition-all cursor-pointer"
                      >
                        <option value="">Select category</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.name}>
                            {c.name}
                          </option>
                        ))}
                        {categories.length === 0 && (
                          <>
                            <option value="Travel & Accommodation">Travel & Accommodation</option>
                            <option value="Client Entertainment">Client Entertainment</option>
                            <option value="Internet & Mobile Reimbursement">Internet & Mobile Reimbursement</option>
                            <option value="Office Equipment">Office Equipment</option>
                            <option value="Miscellaneous">Miscellaneous</option>
                          </>
                        )}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-400">
                        <IconChevronDown className="w-4 h-4" />
                      </div>
                    </div>
                  </div>

                  {/* Claim Date */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Claim Date <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={claimDate}
                      onChange={(e) => setClaimDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs font-medium bg-slate-50/70 border border-slate-200/80 rounded-xl text-slate-700 focus:outline-hidden focus:border-[#5E4BE2] focus:ring-2 focus:ring-[#5E4BE2]/20 transition-all"
                    />
                  </div>

                  {/* Amount & Currency */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Reimbursement Amount <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="w-24 px-3 py-2.5 text-xs font-bold bg-slate-50/70 border border-slate-200/80 rounded-xl text-slate-700 focus:outline-hidden focus:border-[#5E4BE2]"
                      >
                        <option value="INR">₹ INR</option>
                        <option value="USD">$ USD</option>
                        <option value="EUR">€ EUR</option>
                        <option value="GBP">£ GBP</option>
                      </select>
                      <input
                        type="number"
                        min="1"
                        step="any"
                        required
                        placeholder="e.g. 2500"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="flex-1 px-3.5 py-2.5 text-xs font-bold bg-slate-50/70 border border-slate-200/80 rounded-xl text-slate-800 focus:outline-hidden focus:border-[#5E4BE2] focus:ring-2 focus:ring-[#5E4BE2]/20"
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Purpose / Details <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={3}
                      required
                      placeholder="e.g. Flight ticket for client demonstration meeting"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs font-medium bg-slate-50/70 border border-slate-200/80 rounded-xl text-slate-800 focus:outline-hidden focus:border-[#5E4BE2] focus:ring-2 focus:ring-[#5E4BE2]/20 resize-none"
                    />
                  </div>

                  {/* File Upload */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Receipt or Invoice (Optional)
                    </label>
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-200 hover:border-[#5E4BE2] rounded-xl p-5 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-indigo-50/20"
                    >
                      <IconUpload className="w-7 h-7 text-[#5E4BE2] mx-auto mb-1.5" />
                      <p className="text-xs font-bold text-slate-700">
                        {selectedFile ? selectedFile.name : 'Click to upload proof (PDF or Image)'}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Max size: 5MB</p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        accept=".pdf,image/*"
                        onChange={handleFileChange}
                      />
                    </div>
                  </div>
                </div>

                {/* Drawer Sticky Footer */}
                <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-end gap-2.5 sticky bottom-0 z-10 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="px-3.5 py-2 text-xs font-bold text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 shadow-2xs transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-3.5 py-2 bg-[#5E4BE2] hover:bg-[#4D3BC9] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Claim'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClaimsPage;
