import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import api from '../../api/client';
import {
  IconReceipt2,
  IconPlus,
  IconCheck,
  IconX,
  IconAlertCircle,
  IconCash,
  IconFileCertificate,
  IconSearch,
} from '@tabler/icons-react';

interface ClaimCategory {
  id: string;
  name: string;
  maxLimit: number;
  requiresReceipt: boolean;
  description: string;
  isActive: boolean;
}

export const ClaimCategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<ClaimCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'RECEIPT_REQUIRED' | 'CAPPED'>('ALL');

  const [form, setForm] = useState({
    name: '',
    maxLimit: 10000,
    requiresReceipt: true,
    description: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/company/claims/categories');
      setCategories(res.data?.categories || []);
    } catch (err) {
      console.error('Failed to load claim categories:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Category name is required');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await api.post('/company/claims/categories', {
        ...form,
        maxLimit: Number(form.maxLimit) || 0,
      });
      setIsModalOpen(false);
      setForm({ name: '', maxLimit: 10000, requiresReceipt: true, description: '' });
      fetchCategories();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add claim category');
    } finally {
      setIsSubmitting(false);
    }
  };

  // KPI Calculations
  const totalCount = categories.length;
  const activeCount = categories.filter((c) => c.isActive !== false).length;
  const receiptMandatoryCount = categories.filter((c) => c.requiresReceipt).length;
  const cappedCount = categories.filter((c) => c.maxLimit > 0).length;

  // Filtered categories
  const filteredCategories = useMemo(() => {
    return categories.filter((cat) => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        cat.name.toLowerCase().includes(q) ||
        (cat.description && cat.description.toLowerCase().includes(q));
      if (!matchesSearch) return false;

      if (filterType === 'RECEIPT_REQUIRED') return cat.requiresReceipt;
      if (filterType === 'CAPPED') return cat.maxLimit > 0;
      return true;
    });
  }, [categories, search, filterType]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <IconReceipt2 className="w-5 h-5 text-indigo-600 shrink-0" />
            <span>Claim Categories</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Define corporate reimbursement categories, max claim caps, and mandatory invoice proof requirements.
          </p>
        </div>

        <button
          onClick={() => {
            setError(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#5E4BE2] hover:bg-[#4D3BC9] text-white font-bold text-xs shadow-xs transition-colors cursor-pointer shrink-0"
        >
          <IconPlus className="w-4 h-4" />
          <span>Add Claim Category</span>
        </button>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500">Total Categories</span>
            <div className="text-2xl font-black text-slate-900 mt-1 leading-none tracking-tight">
              {totalCount}
            </div>
            <div className="text-[11px] font-bold text-indigo-600 mt-1.5">
              Expense headings
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5E4BE2] shrink-0">
            <IconReceipt2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500">Active Policies</span>
            <div className="text-2xl font-black text-slate-900 mt-1 leading-none tracking-tight">
              {activeCount}
            </div>
            <div className="text-[11px] font-bold text-emerald-600 mt-1.5">
              Available for submission
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <IconCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500">Proof Required</span>
            <div className="text-2xl font-black text-slate-900 mt-1 leading-none tracking-tight">
              {receiptMandatoryCount}
            </div>
            <div className="text-[11px] font-bold text-amber-600 mt-1.5">
              Mandatory invoice receipt
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
            <IconFileCertificate className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500">Capped Allowances</span>
            <div className="text-2xl font-black text-slate-900 mt-1 leading-none tracking-tight">
              {cappedCount}
            </div>
            <div className="text-[11px] font-bold text-purple-600 mt-1.5">
              Maximum ceiling limits
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shrink-0">
            <IconCash className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Table Container Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden space-y-4 p-5">
        {/* Search & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <IconSearch className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search claim categories by name or description..."
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

          {/* Filter Tabs */}
          <div className="flex items-center bg-slate-50 border border-slate-200 p-1 rounded-xl shrink-0">
            {(['ALL', 'RECEIPT_REQUIRED', 'CAPPED'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilterType(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filterType === tab
                    ? 'bg-white text-[#5E4BE2] shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab === 'ALL'
                  ? 'All Categories'
                  : tab === 'RECEIPT_REQUIRED'
                  ? `Receipt Required (${receiptMandatoryCount})`
                  : 'Capped'}
              </button>
            ))}
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden">
          <table className="w-full min-w-[850px] text-left text-xs">
            <thead className="bg-[#e5e7eb] text-xs font-bold text-slate-900 border-b border-slate-300">
              <tr>
                <th className="px-5 py-3.5 whitespace-nowrap">Category Name</th>
                <th className="px-5 py-3.5">Description &amp; Guidelines</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Max Cap Per Claim</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Proof Required</th>
                <th className="px-5 py-3.5 text-right whitespace-nowrap">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-slate-200" />
                        <div className="w-32 h-4 bg-slate-200 rounded" />
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="w-3/4 h-3.5 bg-slate-100 rounded" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="w-20 h-4 bg-slate-100 rounded" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="w-24 h-5 bg-slate-100 rounded-full" />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="w-16 h-5 bg-slate-100 rounded-full ml-auto" />
                    </td>
                  </tr>
                ))
              ) : filteredCategories.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-slate-400">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-[#5E4BE2] flex items-center justify-center mx-auto mb-3">
                      <IconReceipt2 className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold text-slate-700">No Claim Categories Found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {search
                        ? 'Try adjusting your search query or filter.'
                        : 'Add your first company expense category to let employees submit claims.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredCategories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Category Name */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                          <IconReceipt2 className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-slate-900 text-xs">{cat.name}</span>
                      </div>
                    </td>

                    {/* Description */}
                    <td className="px-5 py-4">
                      <p className="text-xs text-slate-600 max-w-md line-clamp-1">
                        {cat.description || 'Corporate expense reimbursement policy.'}
                      </p>
                    </td>

                    {/* Cap per Claim */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="font-bold text-slate-900 text-xs">
                        {cat.maxLimit > 0 ? `₹${Number(cat.maxLimit).toLocaleString()}` : 'No Cap / Custom'}
                      </span>
                    </td>

                    {/* Proof Required */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      {cat.requiresReceipt ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          <IconFileCertificate className="w-3.5 h-3.5 text-amber-600" />
                          Mandatory Bill Proof
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                          Optional / Non-taxable
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        ACTIVE
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Category Right-Side Slide-Over Drawer */}
      {isModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] overflow-hidden">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsModalOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10 pointer-events-none">
            <div
              className="w-screen max-w-md bg-white shadow-2xl flex flex-col h-full border-l border-slate-200 pointer-events-auto animate-in slide-in-from-right duration-200 overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drawer Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5E4BE2] shrink-0">
                    <IconReceipt2 className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-[#5E4BE2] uppercase tracking-wider">
                      Expense Management
                    </span>
                    <h2 className="text-base font-bold text-slate-900 mt-0.5">
                      Add Claim Category
                    </h2>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <IconX className="w-5 h-5" />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleCreate} className="p-6 space-y-5 flex-1 flex flex-col justify-between">
                <div className="space-y-4">
                  {error && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex items-center gap-2">
                      <IconAlertCircle className="w-4 h-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Category Title <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g. Relocation & Moving Allowance"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-hidden focus:border-[#5E4BE2] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Max Cap per Claim (INR)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="500"
                      value={form.maxLimit}
                      onChange={(e) => setForm({ ...form, maxLimit: Number(e.target.value) || 0 })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-hidden focus:border-[#5E4BE2] transition-colors"
                    />
                    <span className="text-[11px] text-slate-400 mt-1 block">Set 0 for unlimited / custom claim amount</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Description & Policy Guidelines
                    </label>
                    <textarea
                      rows={3}
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="Policy rules and permissible expenditures..."
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-hidden focus:border-[#5E4BE2] resize-none transition-colors"
                    />
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        id="requiresReceipt"
                        checked={form.requiresReceipt}
                        onChange={(e) => setForm({ ...form, requiresReceipt: e.target.checked })}
                        className="w-4 h-4 text-[#5E4BE2] rounded-sm border-slate-300 focus:ring-[#5E4BE2] mt-0.5"
                      />
                      <div className="text-xs">
                        <span className="font-bold text-slate-800 block">Require invoice receipt proof</span>
                        <span className="text-[11px] text-slate-500">Employees must upload bill attachment before submitting.</span>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-[#5E4BE2] to-[#4B39C3] hover:from-[#5340D4] hover:to-[#4130B4] disabled:opacity-50 shadow-xs cursor-pointer transition-all"
                  >
                    {isSubmitting ? 'Saving...' : 'Add Category'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ClaimCategoriesPage;
