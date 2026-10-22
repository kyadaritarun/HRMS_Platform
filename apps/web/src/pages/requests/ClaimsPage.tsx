import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  IconArrowLeft,
  IconSearch,
  IconClock,
  IconCheck,
  IconX,
  IconFilter,
} from '@tabler/icons-react';

interface ClaimItem {
  id: number;
  title: string;
  amount: number;
  reason: string;
  status: string;
  createdAt: string;
  meta?: any;
  user: {
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
  const [claims, setClaims] = useState<ClaimItem[]>([]);
  const [categories, setCategories] = useState<ClaimCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
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
  }, [statusFilter, categoryFilter, search]);

  // Form State
  const [category, setCategory] = useState<string>('');
  const [claimDate, setClaimDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState<string>('');
  const [currency, setCurrency] = useState<string>('INR');
  const [description, setDescription] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canPay = user?.role === 'COMPANY_ADMIN' || user?.role === 'HR';

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const scope = canPay ? 'company' : 'mine';
      const [claimsRes, catRes] = await Promise.all([
        api.get('/requests?type=CLAIM&scope=' + scope),
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
  }, []);

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
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to mark claim as paid');
    }
  };

  // Financial Stats matching EmployeesPage KPI style
  const financialStats = useMemo(() => {
    const totalCount = claims.length;
    const totalAmount = claims.reduce((acc, c) => acc + (Number(c.amount) || 0), 0);

    const pendingClaims = claims.filter((c) => c.status === 'PENDING');
    const pendingAmount = pendingClaims.reduce((acc, c) => acc + (Number(c.amount) || 0), 0);

    const approvedClaims = claims.filter((c) => c.status === 'APPROVED');
    const approvedAmount = approvedClaims.reduce((acc, c) => acc + (Number(c.amount) || 0), 0);

    const paidClaims = claims.filter((c) => c.status === 'PAID');
    const paidAmount = paidClaims.reduce((acc, c) => acc + (Number(c.amount) || 0), 0);

    const rejectedClaims = claims.filter((c) => c.status === 'REJECTED');

    return {
      totalCount,
      totalAmount,
      pendingCount: pendingClaims.length,
      pendingAmount,
      approvedCount: approvedClaims.length,
      approvedAmount,
      paidCount: paidClaims.length,
      paidAmount,
      rejectedCount: rejectedClaims.length,
    };
  }, [claims]);

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/70 shadow-2xs">
            Disbursed & Paid
          </span>
        );
      case 'APPROVED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200/70 shadow-2xs">
            Approved for Payout
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

  return (
    <div className="space-y-6 pb-12">
      {/* View 1: Submit Claim Form */}
      {isCreating ? (
        <div className="space-y-4">
          <button
            onClick={() => setIsCreating(false)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-[#5E4BE2] transition-colors cursor-pointer"
          >
            <IconArrowLeft className="w-4 h-4" />
            <span>Back to Claims Desk</span>
          </button>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5E4BE2] shrink-0">
                <IconPlus className="w-4 h-4" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                File Expense Claim
              </h1>
            </div>
            <p className="text-xs text-slate-500 font-medium mb-6">
              Submit out-of-pocket expenses, travel allowances, and track disbursement status.
            </p>

            {error && (
              <div className="p-3 mb-5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <IconAlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmitClaim} className="space-y-5">
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
                        <option value="Travel & Transport">Travel & Transport</option>
                        <option value="Meals & Client Dinners">Meals & Client Dinners</option>
                        <option value="Office Equipment">Office Equipment</option>
                        <option value="Internet & Phone">Internet & Phone</option>
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

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-gradient-to-r from-[#5E4BE2] to-[#4B39C3] hover:from-[#5340D4] hover:to-[#4130B4] text-white text-xs font-bold rounded-xl shadow-sm shadow-indigo-600/25 transition-all cursor-pointer active:scale-[0.98] disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Claim'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        /* View 2: Claims Overview & Table */
        <div className="space-y-6">
          {/* ===================== TOP HEADER BAR ===================== */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5E4BE2] shrink-0">
                  <IconReceipt2 className="w-4 h-4" />
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Claims
                </h1>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Submit out-of-pocket expenses, travel allowances, and track disbursement status.
              </p>
            </div>

            <button
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#5E4BE2] to-[#4B39C3] hover:from-[#5340D4] hover:to-[#4130B4] text-white text-xs font-bold rounded-xl shadow-sm shadow-indigo-600/25 transition-all active:scale-[0.98] cursor-pointer"
            >
              <IconPlus className="w-4 h-4" />
              <span>File New Claim</span>
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
            {/* Search Input */}
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
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                  {categories.length === 0 && (
                    <>
                      <option value="Travel & Transport">Travel & Transport</option>
                      <option value="Meals & Client Dinners">Meals & Client Dinners</option>
                      <option value="Office Equipment">Office Equipment</option>
                    </>
                  )}
                </select>
              </div>

              {/* Status Pills */}
              <div className="flex items-center bg-slate-50/80 border border-slate-200/70 p-1 rounded-xl">
                {[
                  { id: 'ALL', label: 'All' },
                  { id: 'PENDING', label: 'Pending' },
                  { id: 'APPROVED', label: 'Approved' },
                  { id: 'PAID', label: 'Paid' },
                  { id: 'REJECTED', label: 'Rejected' },
                ].map((st) => {
                  const isActive = statusFilter === st.id;
                  return (
                    <button
                      key={st.id}
                      onClick={() => setStatusFilter(st.id)}
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

          {/* ===================== ROW 3: DATA TABLE ===================== */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#e5e7eb] text-xs font-bold text-slate-900 border-b border-slate-300">
                  <tr>
                    <th className="px-6 py-3.5">Claim Details</th>
                    <th className="px-6 py-3.5">Employee</th>
                    <th className="px-6 py-3.5">Category</th>
                    <th className="px-6 py-3.5">Amount</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Date</th>
                    {canPay && <th className="px-6 py-3.5 text-right">Finance Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="px-6 py-4">
                          <div className="w-36 h-3.5 bg-slate-200 rounded-sm" />
                        </td>
                        <td className="px-6 py-4">
                          <div className="w-24 h-3.5 bg-slate-200 rounded-sm" />
                        </td>
                        <td className="px-6 py-4">
                          <div className="w-16 h-3.5 bg-slate-200 rounded-sm" />
                        </td>
                        <td className="px-6 py-4">
                          <div className="w-16 h-3.5 bg-slate-200 rounded-sm" />
                        </td>
                        <td className="px-6 py-4">
                          <div className="w-20 h-3.5 bg-slate-200 rounded-full" />
                        </td>
                        <td className="px-6 py-4">
                          <div className="w-20 h-3.5 bg-slate-200 rounded-sm" />
                        </td>
                        {canPay && <td className="px-6 py-4" />}
                      </tr>
                    ))
                  ) : filteredClaims.length === 0 ? (
                    <tr>
                      <td colSpan={canPay ? 7 : 6} className="py-12 text-center">
                        <div className="w-12 h-12 rounded-full bg-indigo-50 text-[#5E4BE2] flex items-center justify-center mx-auto mb-2">
                          <IconReceipt2 className="w-6 h-6" />
                        </div>
                        <h4 className="text-sm font-bold text-slate-800">No expense claims found</h4>
                        <p className="text-xs text-slate-400 mt-1">
                          {search ? 'Try modifying your search or filter.' : 'Click "File New Claim" to submit your first claim.'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    paginatedClaims.map((claim) => (
                      <tr key={claim.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900">{claim.title}</div>
                          <div className="text-xs text-slate-400 max-w-xs truncate">{claim.reason}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-800">
                            {claim.user?.firstName} {claim.user?.lastName}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700">
                            {claim.meta?.category || 'General'}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-900 text-sm">
                          {claim.meta?.currency || '₹'}{' '}
                          {Number(claim.amount || 0).toLocaleString()}
                        </td>
                        <td className="px-6 py-4">{getStatusBadge(claim.status)}</td>
                        <td className="px-6 py-4 text-xs text-slate-500">
                          {new Date(claim.createdAt).toLocaleDateString()}
                        </td>
                        {canPay && (
                          <td className="px-6 py-4 text-right">
                            {claim.status === 'APPROVED' && (
                              <button
                                onClick={() => handleMarkPaid(claim.id)}
                                className="px-3 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-all flex items-center gap-1 ml-auto cursor-pointer"
                              >
                                <IconCash className="w-3.5 h-3.5" />
                                <span>Disburse</span>
                              </button>
                            )}
                          </td>
                        )}
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
      )}
    </div>
  );
};

export default ClaimsPage;
