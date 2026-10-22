import React, { useState, useEffect, useMemo } from 'react';
import api from '../../api/client';
import TablePagination from '../../components/common/TablePagination';
import {
  IconFileCertificate,
  IconPlus,
  IconCheck,
  IconX,
  IconAlertCircle,
  IconCalendar,
  IconSearch,
  IconFilter,
  IconChevronDown,
  IconPencil,
  IconTrash,
  IconClock,
  IconShieldCheck,
  IconSparkles,
  IconUserPlus,
} from '@tabler/icons-react';

interface LeaveType {
  id: number;
  name: string;
  code: string;
  defaultAllocation?: number | string;
  daysAllowed?: number | string;
  isPaid: boolean;
  requiresApproval?: boolean;
  allowHalfDay?: boolean;
  allowCarry?: boolean;
  isCompOff?: boolean;
  carryForwardMax?: number;
  encashableMax?: number;
  requiresDocument?: boolean;
  color?: string;
  isActive?: boolean;
}

export const LeaveTypesPage: React.FC = () => {
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterType]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<LeaveType | null>(null);
  const [form, setForm] = useState({
    name: '',
    code: '',
    defaultAllocation: '12',
    isPaid: true,
    requiresApproval: true,
    allowHalfDay: true,
    allowCarry: false,
    isCompOff: false,
    color: 'blue',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaveTypes = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/company/leave-types');
      setLeaveTypes(res.data?.leaveTypes || []);
    } catch (err) {
      console.error('Failed to load leave types:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaveTypes();
  }, []);

  const handleOpenAdd = () => {
    setEditingPolicy(null);
    setForm({
      name: '',
      code: '',
      defaultAllocation: '12',
      isPaid: true,
      requiresApproval: true,
      allowHalfDay: true,
      allowCarry: false,
      isCompOff: false,
      color: 'blue',
    });
    setError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (policy: LeaveType) => {
    setEditingPolicy(policy);
    const alloc = policy.defaultAllocation ?? policy.daysAllowed ?? 12;
    setForm({
      name: policy.name,
      code: policy.code,
      defaultAllocation: String(alloc),
      isPaid: policy.isPaid,
      requiresApproval: policy.requiresApproval ?? true,
      allowHalfDay: policy.allowHalfDay ?? true,
      allowCarry: policy.allowCarry ?? false,
      isCompOff: policy.isCompOff ?? false,
      color: policy.color || 'blue',
    });
    setError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        defaultAllocation: Number(form.defaultAllocation) || 0,
        isPaid: form.isPaid,
        requiresApproval: form.requiresApproval,
        allowHalfDay: form.allowHalfDay,
        allowCarry: form.allowCarry,
        isCompOff: form.isCompOff,
        color: form.color,
      };

      if (editingPolicy) {
        await api.patch(`/company/leave-types/${editingPolicy.id}`, payload);
      } else {
        await api.post('/company/leave-types', payload);
      }

      setIsModalOpen(false);
      fetchLeaveTypes();
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to save leave policy');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to deactivate this leave policy? Existing requests will be preserved.')) return;
    try {
      await api.delete(`/company/leave-types/${id}`);
      fetchLeaveTypes();
    } catch (err: any) {
      alert(err.response?.data?.error || err.response?.data?.message || 'Failed to delete leave policy');
    }
  };

  // Badges & styling helpers
  const getPolicyColor = (code: string, color?: string) => {
    const c = (color || '').toLowerCase();
    if (c === 'rose' || code.includes('SICK') || code === 'SL') {
      return {
        badge: 'bg-rose-50 text-rose-700 border-rose-200/80',
        dot: 'bg-rose-500',
      };
    }
    if (c === 'emerald' || c === 'green' || code.includes('CAS') || code === 'CL') {
      return {
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
        dot: 'bg-emerald-500',
      };
    }
    if (c === 'purple' || code.includes('MAT') || code === 'ML' || code === 'PL') {
      return {
        badge: 'bg-purple-50 text-purple-700 border-purple-200/80',
        dot: 'bg-purple-500',
      };
    }
    if (c === 'amber' || code.includes('COMP') || code === 'CO') {
      return {
        badge: 'bg-amber-50 text-amber-700 border-amber-200/80',
        dot: 'bg-amber-500',
      };
    }
    return {
      badge: 'bg-blue-50 text-blue-700 border-blue-200/80',
      dot: 'bg-blue-500',
    };
  };

  // Filtered Leave Types
  const filteredLeaveTypes = leaveTypes.filter((lt) => {
    const q = search.toLowerCase().trim();
    const matchesSearch = !q || lt.name.toLowerCase().includes(q) || lt.code.toLowerCase().includes(q);

    if (filterType === 'PAID') {
      return matchesSearch && lt.isPaid;
    }
    if (filterType === 'UNPAID') {
      return matchesSearch && !lt.isPaid;
    }
    if (filterType === 'CARRY') {
      return matchesSearch && lt.allowCarry;
    }
    return matchesSearch;
  });

  const paginatedLeaveTypes = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLeaveTypes.slice(start, start + pageSize);
  }, [filteredLeaveTypes, currentPage, pageSize]);

  // KPI calculations
  const totalPolicies = leaveTypes.length;
  const paidPolicies = leaveTypes.filter((l) => l.isPaid).length;
  const carryPolicies = leaveTypes.filter((l) => l.allowCarry).length;
  const totalDaysQuota = leaveTypes.reduce((acc, l) => acc + (Number(l.defaultAllocation ?? l.daysAllowed) || 0), 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner (Hero Banner) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5E4BE2] shrink-0">
              <IconFileCertificate className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Leave Types
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Configure leave types, annual quotas, carry-forward rules, and approval policies.
          </p>
        </div>

        {/* Primary CTA: Add Leave Type */}
        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#5E4BE2] hover:bg-[#4d3cc9] text-white text-xs font-bold shadow-xs hover:shadow-md transition-all cursor-pointer shrink-0"
        >
          <IconPlus className="w-4 h-4" />
          <span>Add Leave Type</span>
        </button>
      </div>



      {/* Main Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
        {/* Section Header & Search/Filter Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <IconCalendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">All Leave Types</h2>
              <p className="text-xs text-slate-400 mt-0.5">View and manage leave types, annual quotas, and approval rules.</p>
            </div>
          </div>

          {/* Right Controls: Search & Filter */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <IconSearch className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search leave types by name or code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500 text-slate-800 placeholder-slate-400"
              />
            </div>

            {/* Filter Dropdown */}
            <div className="relative">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="appearance-none pl-8 pr-7 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500 text-slate-700 cursor-pointer"
              >
                <option value="ALL">All Leave Types</option>
                <option value="PAID">Paid Leave Only</option>
                <option value="UNPAID">Unpaid (LOP)</option>
                <option value="CARRY">Carry Forward Allowed</option>
              </select>
              <IconFilter className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <IconChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#e5e7eb] text-xs font-bold text-slate-900 border-b border-slate-300">
              <tr>
                <th className="px-5 py-3.5">Leave Type & Code</th>
                <th className="px-5 py-3.5">Annual Quota</th>
                <th className="px-5 py-3.5">Type</th>
                <th className="px-5 py-3.5">Rules & Approval</th>
                <th className="px-5 py-3.5">Carry Forward</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-indigo-600 border-t-transparent mb-2" />
                    <p className="text-xs">Loading leave types...</p>
                  </td>
                </tr>
              ) : filteredLeaveTypes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-2">
                      <IconFileCertificate className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-800">No leave types found</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      {search ? 'Try modifying your search or filter.' : 'Click "Add Leave Type" to configure your first leave type.'}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedLeaveTypes.map((policy) => {
                  const quota = policy.defaultAllocation ?? policy.daysAllowed ?? 0;
                  const colorMeta = getPolicyColor(policy.code, policy.color);

                  return (
                    <tr key={policy.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Name & Code */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <span className={`px-2 py-0.5 rounded-lg border font-mono font-bold text-xs ${colorMeta.badge} shrink-0`}>
                            {policy.code}
                          </span>
                          <div>
                            <span className="font-bold text-slate-900 block">{policy.name}</span>
                            {policy.isCompOff && (
                              <span className="text-[10px] text-purple-600 font-semibold block">Comp-Off Policy</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Annual Quota */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-baseline gap-1">
                          <span className="font-extrabold text-sm text-slate-900">{quota}</span>
                          <span className="text-slate-400 text-[11px] font-medium">Days / yr</span>
                        </div>
                      </td>

                      {/* Type: Paid vs Unpaid */}
                      <td className="px-4 py-3.5">
                        {policy.isPaid ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Paid Leave
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            Unpaid (LOP)
                          </span>
                        )}
                      </td>

                      {/* Policy Rules */}
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {policy.requiresApproval !== false ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
                              Requires Approval
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-600">
                              Auto-Approve
                            </span>
                          )}

                          {policy.allowHalfDay && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-teal-50 text-teal-700 border border-teal-200/60">
                              Half-Day OK
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Carry Forward */}
                      <td className="px-4 py-3.5">
                        {policy.allowCarry ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-xs">
                            <IconCheck className="w-3.5 h-3.5 text-emerald-600" />
                            Allowed
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs font-normal">
                            No Carry
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Active
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEdit(policy)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                            title="Edit Leave Policy"
                          >
                            <IconPencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(policy.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Deactivate Policy"
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

        <TablePagination
          currentPage={currentPage}
          totalItems={filteredLeaveTypes.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
          pageSizeOptions={[5, 10, 20, 50]}
          itemName="leave types"
        />
      </div>

      {/* Add / Edit Policy Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div
            className="bg-white rounded-3xl max-w-lg w-full shadow-2xl p-6 border border-slate-100 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <IconFileCertificate className="w-5 h-5 text-indigo-600" />
                {editingPolicy ? 'Edit Leave Type' : 'Create Leave Type'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <IconX className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <IconAlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Leave Type Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Annual Leave, Casual Leave, Sick Leave"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-indigo-500 font-medium text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Leave Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. AL, SL, CL"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-indigo-500 font-mono font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Annual Quota (Days) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    required
                    placeholder="12"
                    value={form.defaultAllocation}
                    onChange={(e) => setForm({ ...form, defaultAllocation: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-indigo-500 font-bold text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Badge Color Theme</label>
                  <select
                    value={form.color}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-indigo-500 font-medium text-slate-800 cursor-pointer"
                  >
                    <option value="blue">Blue (Standard)</option>
                    <option value="emerald">Emerald (Casual / Positive)</option>
                    <option value="rose">Rose (Sick / Emergency)</option>
                    <option value="purple">Purple (Parental / Special)</option>
                    <option value="amber">Amber (Compensatory)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Leave Type Category</label>
                  <select
                    value={form.isPaid ? 'PAID' : 'UNPAID'}
                    onChange={(e) => setForm({ ...form, isPaid: e.target.value === 'PAID' })}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-indigo-500 font-medium text-slate-800 cursor-pointer"
                  >
                    <option value="PAID">Paid Leave (Salary Maintained)</option>
                    <option value="UNPAID">Unpaid Leave (Loss of Pay)</option>
                  </select>
                </div>
              </div>

              {/* Toggles */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-2.5">
                <span className="text-[11px] font-bold text-slate-600 block uppercase tracking-wider mb-1">
                  Policy Permissions & Behavior
                </span>

                <label className="flex items-center gap-2.5 text-xs font-medium text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.requiresApproval}
                    onChange={(e) => setForm({ ...form, requiresApproval: e.target.checked })}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Requires Manager / HR Approval</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs font-medium text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.allowHalfDay}
                    onChange={(e) => setForm({ ...form, allowHalfDay: e.target.checked })}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Allow Half-Day Requests (0.5 day)</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs font-medium text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.allowCarry}
                    onChange={(e) => setForm({ ...form, allowCarry: e.target.checked })}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Allow Carry-Forward to Next Year</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs font-medium text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.isCompOff}
                    onChange={(e) => setForm({ ...form, isCompOff: e.target.checked })}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Compensatory Off Policy</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Saving...' : editingPolicy ? 'Update Leave Type' : 'Create Leave Type'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveTypesPage;
