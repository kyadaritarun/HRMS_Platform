import React, { useState, useEffect, useMemo } from 'react';
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
      const matchesSearch = !q || cat.name.toLowerCase().includes(q) || (cat.description && cat.description.toLowerCase().includes(q));
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
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5E4BE2] shrink-0">
              <IconReceipt2 className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Expense Claim Categories
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Define corporate reimbursement categories, max claim caps, and mandatory invoice proof requirements.
          </p>
        </div>

        <button
          onClick={() => {
            setError(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#5E4BE2] to-[#4B39C3] hover:from-[#5340D4] hover:to-[#4130B4] text-white text-xs font-bold rounded-xl shadow-sm shadow-indigo-600/25 transition-all active:scale-[0.98] cursor-pointer self-start sm:self-auto"
        >
          <IconPlus className="w-4 h-4" />
          <span>Add Claim Category</span>
        </button>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <span className="text-xs font-bold text-slate-500">Total Categories</span>
            <div className="text-2xl font-black text-slate-900 mt-1 leading-none tracking-tight">
              {totalCount}
            </div>
            <div className="text-[11px] font-bold text-indigo-600 mt-2">
              Expense headings
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5E4BE2]">
            <IconReceipt2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <span className="text-xs font-bold text-slate-500">Active Policies</span>
            <div className="text-2xl font-black text-slate-900 mt-1 leading-none tracking-tight">
              {activeCount}
            </div>
            <div className="text-[11px] font-bold text-emerald-600 mt-2">
              Available for submission
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <IconCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <span className="text-xs font-bold text-slate-500">Proof Required</span>
            <div className="text-2xl font-black text-slate-900 mt-1 leading-none tracking-tight">
              {receiptMandatoryCount}
            </div>
            <div className="text-[11px] font-bold text-amber-600 mt-2">
              Mandatory invoice receipt
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
            <IconFileCertificate className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <span className="text-xs font-bold text-slate-500">Capped Allowances</span>
            <div className="text-2xl font-black text-slate-900 mt-1 leading-none tracking-tight">
              {cappedCount}
            </div>
            <div className="text-[11px] font-bold text-purple-600 mt-2">
              Maximum ceiling limits
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
            <IconCash className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <IconSearch className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search claim categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50/80 border border-slate-200/90 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-[#5E4BE2] focus:bg-white transition-all"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-50/80 border border-slate-200/70 p-1 rounded-xl">
          {(['ALL', 'RECEIPT_REQUIRED', 'CAPPED'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilterType(tab)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${
                filterType === tab
                  ? 'bg-white text-[#5E4BE2] shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
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

      {/* Grid of Categories */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-44 rounded-2xl bg-white border border-slate-200 shadow-sm animate-pulse" />
          ))}
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-indigo-50 text-[#5E4BE2] flex items-center justify-center mx-auto mb-3">
            <IconReceipt2 className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">No Claim Categories Configured</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {search ? 'Try adjusting your search query.' : 'Add your first company expense reimbursement category to let employees submit claims.'}
          </p>
          <button
            onClick={() => {
              setError(null);
              setIsModalOpen(true);
            }}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#5E4BE2] to-[#4B39C3] hover:from-[#5340D4] hover:to-[#4130B4] text-white text-xs font-bold shadow-sm shadow-indigo-600/25 cursor-pointer"
          >
            <IconPlus className="w-4 h-4" /> Add Claim Category
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCategories.map((cat) => (
            <div
              key={cat.id}
              className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-xs">
                    <IconReceipt2 className="w-4 h-4" />
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    ACTIVE
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900">{cat.name}</h3>
                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{cat.description || 'Corporate expense reimbursement policy.'}</p>
              </div>

              <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Cap per Claim:</span>
                  <span className="font-bold text-slate-900">
                    {cat.maxLimit > 0 ? `₹${Number(cat.maxLimit).toLocaleString()}` : 'No Cap / Custom'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Receipt Required:</span>
                  <span className={`font-semibold ${cat.requiresReceipt ? 'text-amber-700' : 'text-slate-600'}`}>
                    {cat.requiresReceipt ? 'Mandatory Bill Proof' : 'Optional / Non-taxable'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Category Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5E4BE2] shrink-0">
                  <IconReceipt2 className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Add Reimbursement Category</h3>
                  <p className="text-xs text-slate-500">
                    Configure limits and verification requirements.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <IconX className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex items-center gap-2">
                <IconAlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Category Title</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Relocation & Moving Allowance"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-hidden focus:border-[#5E4BE2]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Max Cap per Claim (INR)</label>
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={form.maxLimit}
                  onChange={(e) => setForm({ ...form, maxLimit: Number(e.target.value) || 0 })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-hidden focus:border-[#5E4BE2]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description & Guidelines</label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Policy rules and permissible expenditures..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-hidden focus:border-[#5E4BE2] resize-none"
                />
              </div>

              <div className="flex items-center gap-2.5 pt-1">
                <input
                  type="checkbox"
                  id="requiresReceipt"
                  checked={form.requiresReceipt}
                  onChange={(e) => setForm({ ...form, requiresReceipt: e.target.checked })}
                  className="w-4 h-4 text-[#5E4BE2] rounded-sm border-slate-300 focus:ring-[#5E4BE2]"
                />
                <label htmlFor="requiresReceipt" className="text-xs font-medium text-slate-700 cursor-pointer">
                  Require invoice receipt upload for claim submission
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#5E4BE2] to-[#4B39C3] hover:from-[#5340D4] hover:to-[#4130B4] disabled:opacity-50 shadow-sm shadow-indigo-600/25 cursor-pointer"
                >
                  {isSubmitting ? 'Saving...' : 'Add Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClaimCategoriesPage;
