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
  IconPencil,
  IconTrash,
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<ClaimCategory | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
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

  const handleOpenAdd = () => {
    setEditingId(null);
    setError(null);
    setForm({ name: '', maxLimit: 10000, requiresReceipt: true, description: '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cat: ClaimCategory) => {
    setEditingId(cat.id);
    setError(null);
    setForm({
      name: cat.name,
      maxLimit: cat.maxLimit,
      requiresReceipt: cat.requiresReceipt,
      description: cat.description || '',
    });
    setIsModalOpen(true);
  };

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Category name is required');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      if (editingId) {
        await api.put(`/company/claims/categories/${editingId}`, {
          ...form,
          maxLimit: Number(form.maxLimit) || 0,
        });
      } else {
        await api.post('/company/claims/categories', {
          ...form,
          maxLimit: Number(form.maxLimit) || 0,
        });
      }
      setIsModalOpen(false);
      setEditingId(null);
      setForm({ name: '', maxLimit: 10000, requiresReceipt: true, description: '' });
      fetchCategories();
    } catch (err: any) {
      setError(err.response?.data?.error || `Failed to ${editingId ? 'update' : 'add'} claim category`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!categoryToDelete) return;
    setIsDeleting(true);
    try {
      await api.delete(`/company/claims/categories/${categoryToDelete.id}`);
      setCategoryToDelete(null);
      fetchCategories();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete category');
    } finally {
      setIsDeleting(false);
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
      {/* Header with Breadcrumb & Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Claim Categories</h1>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Application &gt; Claim &amp; Reimbursement Categories
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#5E4BE2] to-[#4B39C3] hover:opacity-95 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition-all cursor-pointer shrink-0"
        >
          <IconPlus className="w-4 h-4" />
          <span>Add Claim Category</span>
        </button>
      </div>

      {/* 4 Stat Cards Strip (matching Tenants & Companies sample) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Categories */}
        <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
              <IconReceipt2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500">Total Categories</span>
              <div className="text-2xl font-black text-slate-900 mt-0.5 leading-none">
                {totalCount}
              </div>
              <p className="text-[11px] font-medium text-blue-600 mt-1">
                Registered policies
              </p>
            </div>
          </div>
          <svg className="absolute bottom-0 right-0 w-32 h-10 pointer-events-none opacity-40" viewBox="0 0 120 40" fill="none">
            <path d="M0 35 C30 35, 60 10, 120 20 L120 40 L0 40 Z" fill="#93C5FD" />
          </svg>
        </div>

        {/* Card 2: Active Policies */}
        <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
              <IconCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500">Active Policies</span>
              <div className="text-2xl font-black text-slate-900 mt-0.5 leading-none">
                {activeCount}
              </div>
              <p className="text-[11px] font-medium text-emerald-600 mt-1">
                Ready for claims
              </p>
            </div>
          </div>
          <div className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0 self-start">
            <IconCheck className="w-3.5 h-3.5" />
          </div>
          <svg className="absolute bottom-0 right-0 w-32 h-10 pointer-events-none opacity-40" viewBox="0 0 120 40" fill="none">
            <path d="M0 35 C30 35, 60 10, 120 20 L120 40 L0 40 Z" fill="#86EFAC" />
          </svg>
        </div>

        {/* Card 3: Proof Required */}
        <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
              <IconFileCertificate className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500">Proof Required</span>
              <div className="text-2xl font-black text-slate-900 mt-0.5 leading-none">
                {receiptMandatoryCount}
              </div>
              <p className="text-[11px] font-medium text-amber-600 mt-1">
                Bill upload enforced
              </p>
            </div>
          </div>
          <svg className="absolute bottom-0 right-0 w-32 h-10 pointer-events-none opacity-40" viewBox="0 0 120 40" fill="none">
            <path d="M0 35 C30 35, 60 10, 120 20 L120 40 L0 40 Z" fill="#FDE68A" />
          </svg>
        </div>

        {/* Card 4: Capped Allowances */}
        <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
              <IconCash className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500">Capped Allowances</span>
              <div className="text-2xl font-black text-slate-900 mt-0.5 leading-none">
                {cappedCount}
              </div>
              <p className="text-[11px] font-medium text-rose-600 mt-1">
                Budget caps applied
              </p>
            </div>
          </div>
          <svg className="absolute bottom-0 right-0 w-32 h-10 pointer-events-none opacity-40" viewBox="0 0 120 40" fill="none">
            <path d="M0 35 C30 35, 60 10, 120 20 L120 40 L0 40 Z" fill="#FECDD3" />
          </svg>
        </div>
      </div>

      {/* Main Table Container Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
        {/* Filter Pills & Search Bar (matching Tenants & Companies) */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Pill Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                filterType === 'ALL'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Categories ({totalCount})
            </button>
            <button
              onClick={() => setFilterType('RECEIPT_REQUIRED')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                filterType === 'RECEIPT_REQUIRED'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-amber-100/70 text-amber-800 hover:bg-amber-100'
              }`}
            >
              Receipt Required ({receiptMandatoryCount})
            </button>
            <button
              onClick={() => setFilterType('CAPPED')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                filterType === 'CAPPED'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-emerald-100/70 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              Capped ({cappedCount})
            </button>
          </div>

          {/* Search Box on right */}
          <div className="relative">
            <IconSearch className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search claim categories by name or keyword..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-full focus:bg-white focus:outline-hidden focus:border-[#5E4BE2] focus:ring-2 focus:ring-[#5E4BE2]/10 text-slate-800 placeholder-slate-400 w-full sm:w-64 transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <IconX className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto border border-slate-100 rounded-2xl overflow-hidden">
          <table className="w-full min-w-[850px] text-left text-xs">
            <thead className="bg-slate-50/90 text-xs font-bold text-slate-700 border-b border-slate-100">
              <tr>
                <th className="px-5 py-3.5 whitespace-nowrap">Category Name</th>
                <th className="px-5 py-3.5">Description &amp; Guidelines</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Max Cap Per Claim</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Proof Required</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Status</th>
                <th className="px-5 py-3.5 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-200" />
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
                    <td className="px-5 py-4">
                      <div className="w-16 h-5 bg-slate-100 rounded-full" />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="w-14 h-5 bg-slate-100 rounded-full ml-auto" />
                    </td>
                  </tr>
                ))
              ) : filteredCategories.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-500 font-medium">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-[#5E4BE2] flex items-center justify-center mx-auto mb-3">
                      <IconReceipt2 className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold text-slate-700">No Claim Categories Found</p>
                    <p className="text-xs text-slate-400 font-medium mt-1">
                      {search
                        ? 'Try adjusting your search query or filter.'
                        : 'Add your first company expense category to let employees submit claims.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredCategories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Category Name with Rounded Box */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 text-[#5E4BE2] flex items-center justify-center shrink-0">
                          <IconReceipt2 className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-slate-900 text-xs">{cat.name}</span>
                      </div>
                    </td>

                    {/* Description */}
                    <td className="px-5 py-4">
                      <p className="text-xs text-slate-500 max-w-md line-clamp-1 font-normal">
                        {cat.description || 'Corporate expense reimbursement policy.'}
                      </p>
                    </td>

                    {/* Cap per Claim */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="font-bold text-slate-900 text-xs font-mono">
                        {cat.maxLimit > 0 ? `₹${Number(cat.maxLimit).toLocaleString('en-IN')}` : 'No Cap / Custom'}
                      </span>
                    </td>

                    {/* Proof Required */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      {cat.requiresReceipt ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200/80">
                          <IconFileCertificate className="w-3.5 h-3.5 text-amber-600" />
                          Mandatory Bill Proof
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200/60">
                          Optional / Non-taxable
                        </span>
                      )}
                    </td>

                    {/* Status with Colored Dot (matching In Process style) */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      {cat.isActive !== false ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                          Inactive
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(cat)}
                          title="Edit Category"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-[#5E4BE2] hover:bg-indigo-50 transition-colors cursor-pointer"
                        >
                          <IconPencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setCategoryToDelete(cat)}
                          title="Delete Category"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        >
                          <IconTrash className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination (matching Tenants & Companies sample) */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-slate-500 font-medium">
          <div>
            Showing 1 - {filteredCategories.length} of {categories.length} entries
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-400 font-medium text-xs disabled:opacity-50 cursor-not-allowed"
            >
              &lt; Prev
            </button>
            <button
              type="button"
              className="w-7 h-7 rounded-lg bg-[#5E4BE2] text-white font-bold text-xs flex items-center justify-center shadow-xs"
            >
              1
            </button>
            <button
              type="button"
              disabled
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-400 font-medium text-xs disabled:opacity-50 cursor-not-allowed"
            >
              Next &gt;
            </button>
          </div>
        </div>
      </div>

      {/* Delete Category Confirmation Dialog */}
      {categoryToDelete && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <IconAlertCircle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900">Delete Category?</h3>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Are you sure you want to delete <span className="font-bold text-slate-800">"{categoryToDelete.name}"</span>? Employees will no longer be able to submit claims under this category.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setCategoryToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Category Right-Side Slide-Over Drawer */}
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
                      {editingId ? 'Edit Claim Category' : 'Add Claim Category'}
                    </h2>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-500 font-medium hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <IconX className="w-5 h-5" />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleCreateOrUpdate} className="p-6 space-y-5 flex-1 flex flex-col justify-between">
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
                    <span className="text-[11px] text-slate-500 font-medium mt-1 block">Set 0 for unlimited / custom claim amount</span>
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
                        <span className="text-[11px] text-slate-500 font-medium">Employees must upload bill attachment before submitting.</span>
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
                    {isSubmitting ? 'Saving...' : editingId ? 'Update Category' : 'Add Category'}
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
