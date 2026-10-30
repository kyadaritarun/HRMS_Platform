import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  IconPlayerPause,
  IconPlayerPlay,
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

const COLOR_OPTIONS = [
  {
    value: 'blue',
    label: 'Blue',
    desc: 'Standard',
    colorDot: 'bg-blue-500',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200/80',
  },
  {
    value: 'emerald',
    label: 'Emerald',
    desc: 'Casual / Positive',
    colorDot: 'bg-emerald-500',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
  },
  {
    value: 'rose',
    label: 'Rose',
    desc: 'Sick / Emergency',
    colorDot: 'bg-rose-500',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200/80',
  },
  {
    value: 'purple',
    label: 'Purple',
    desc: 'Parental / Special',
    colorDot: 'bg-purple-500',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200/80',
  },
  {
    value: 'amber',
    label: 'Amber',
    desc: 'Compensatory',
    colorDot: 'bg-amber-500',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200/80',
  },
];

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

  // Color theme dropdown state
  const colorDropdownRef = useRef<HTMLDivElement>(null);
  const [isColorDropdownOpen, setIsColorDropdownOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (colorDropdownRef.current && !colorDropdownRef.current.contains(event.target as Node)) {
        setIsColorDropdownOpen(false);
      }
    };
    if (isColorDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isColorDropdownOpen]);

  // Delete / Deactivate confirmation toaster
  const [deletingPolicy, setDeletingPolicy] = useState<LeaveType | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

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

  const fetchLeaveTypes = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/company/leave-types?all=true');
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
    setIsColorDropdownOpen(false);
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
    setIsColorDropdownOpen(false);
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
        setToast({
          type: 'success',
          title: 'Leave Policy Updated',
          message: `Policy "${form.name.trim()}" was updated successfully.`,
        });
      } else {
        await api.post('/company/leave-types', payload);
        setToast({
          type: 'success',
          title: 'Leave Policy Created',
          message: `Policy "${form.name.trim()}" was created successfully.`,
        });
      }

      setIsModalOpen(false);
      fetchLeaveTypes();
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to save leave policy');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (policy: LeaveType) => {
    setDeletingPolicy(policy);
    setDeleteError('');
  };

  const handleConfirmDelete = async () => {
    if (!deletingPolicy) return;
    const policyName = deletingPolicy.name;
    const policyCode = deletingPolicy.code;
    setIsDeleting(true);
    setDeleteError('');
    try {
      await api.delete(`/company/leave-types/${deletingPolicy.id}`);
      setDeletingPolicy(null);
      fetchLeaveTypes();
      setToast({
        type: 'success',
        title: 'Leave Policy Deleted',
        message: `Policy "${policyName}" (${policyCode}) has been permanently deleted.`,
      });
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.response?.data?.message || 'Failed to delete leave policy';
      setDeleteError(errMsg);
      setToast({
        type: 'error',
        title: 'Delete Failed',
        message: errMsg,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleActive = async (policy: LeaveType) => {
    const nextActive = policy.isActive === false;
    try {
      await api.patch(`/company/leave-types/${policy.id}`, { isActive: nextActive });
      fetchLeaveTypes();
      setToast({
        type: 'success',
        title: nextActive ? 'Policy Activated' : 'Policy Deactivated',
        message: `Policy "${policy.name}" (${policy.code}) is now ${nextActive ? 'Active' : 'Deactivated'}.`,
      });
    } catch (err: any) {
      setToast({
        type: 'error',
        title: 'Action Failed',
        message: err.response?.data?.error || err.response?.data?.message || 'Failed to update policy status',
      });
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

    if (filterType === 'ACTIVE') {
      return matchesSearch && lt.isActive !== false;
    }
    if (filterType === 'INACTIVE') {
      return matchesSearch && lt.isActive === false;
    }
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
          <h1 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <IconFileCertificate className="w-5 h-5 text-indigo-600 shrink-0" />
            <span>Leave Types</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure leave types, annual quotas, carry-forward rules, and approval policies.
          </p>
        </div>

        {/* Primary CTA: Add Leave Type */}
        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#5E4BE2] hover:bg-[#4D3BC9] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer shrink-0"
        >
          <IconPlus className="w-4 h-4" />
          <span>Create Leave</span>
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
                  <option value="ACTIVE">Active Policies Only</option>
                  <option value="INACTIVE">Deactivated Policies</option>
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
        <div className="overflow-x-auto border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden">
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
                      {search ? 'Try modifying your search or filter.' : 'Click "Create Leave" to configure your first leave type.'}
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
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
                              Requires Approval
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200/60">
                              Auto-Approve
                            </span>
                          )}

                          {policy.allowHalfDay && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-teal-50 text-teal-700 border border-teal-200/60">
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
                        {policy.isActive !== false ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            Deactivated
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Edit button */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(policy)}
                            className="w-8 h-8 rounded-xl border border-slate-200 bg-white hover:bg-blue-50 hover:border-blue-300 text-slate-700 hover:text-blue-600 flex items-center justify-center shadow-2xs transition-all cursor-pointer"
                            title="Edit Leave Policy"
                          >
                            <IconPencil className="w-4 h-4 stroke-[1.8]" />
                          </button>

                          {/* Deactivate / Reactivate button */}
                          {policy.isActive !== false ? (
                            <button
                              type="button"
                              onClick={() => handleToggleActive(policy)}
                              className="w-8 h-8 rounded-xl border border-slate-200 bg-white hover:bg-amber-50 hover:border-amber-300 text-slate-600 hover:text-amber-700 flex items-center justify-center shadow-2xs transition-all cursor-pointer"
                              title="Deactivate Policy (Pause Requests)"
                            >
                              <IconPlayerPause className="w-4 h-4 stroke-[1.8]" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleToggleActive(policy)}
                              className="w-8 h-8 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-2xs transition-all cursor-pointer"
                              title="Reactivate Policy"
                            >
                              <IconPlayerPlay className="w-4 h-4 stroke-[1.8]" />
                            </button>
                          )}

                          {/* Delete button */}
                          <button
                            type="button"
                            onClick={() => handleDelete(policy)}
                            className="w-8 h-8 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-300 text-rose-600 hover:text-rose-700 flex items-center justify-center shadow-2xs transition-all cursor-pointer"
                            title="Delete Policy Permanently"
                          >
                            <IconTrash className="w-4 h-4 stroke-[1.8]" />
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

      {/* ===================== ADD / EDIT LEAVE TYPE RIGHT SIDEBAR DRAWER ===================== */}
      {isModalOpen && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] overflow-hidden bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
          onClick={() => setIsModalOpen(false)}
        >
          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div
              className="w-screen max-w-md bg-white shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-300 border-l border-slate-100"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drawer Header */}
              <div className="relative bg-gradient-to-r from-[#5E4BE2] to-[#4B39C3] p-6 text-white shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="absolute top-5 right-5 p-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
                  title="Close panel"
                >
                  <IconX className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-3.5 pr-8">
                  <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/25 flex items-center justify-center text-white shrink-0 shadow-sm">
                    <IconFileCertificate className="w-6 h-6 stroke-[1.8]" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg font-black tracking-tight leading-tight truncate">
                      {editingPolicy ? 'Edit Leave' : 'Create Leave'}
                    </h3>
                    <p className="text-xs text-white/80 font-medium mt-0.5 truncate">
                      {editingPolicy ? `Configure quota & rules for "${editingPolicy.name}"` : 'Setup a new company leave quota and policy rules'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Drawer Form Body */}
              <form onSubmit={handleSave} className="flex-1 flex flex-col justify-between overflow-y-auto">
                <div className="p-6 space-y-4">
                  {error && (
                    <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
                      <IconAlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Leave Type Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Annual Leave, Casual Leave, Sick Leave"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-indigo-500 font-medium text-slate-800 transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Leave Code <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. AL, SL, CL"
                        value={form.code}
                        onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                        className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-indigo-500 font-mono font-bold text-slate-800 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Annual Quota (Days) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        required
                        placeholder="12"
                        value={form.defaultAllocation}
                        onChange={(e) => setForm({ ...form, defaultAllocation: e.target.value })}
                        className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-indigo-500 font-bold text-slate-800 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative" ref={colorDropdownRef}>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Badge Color Theme</label>
                      <button
                        type="button"
                        onClick={() => setIsColorDropdownOpen(!isColorDropdownOpen)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100/70 focus:bg-white focus:outline-hidden focus:border-indigo-500 font-medium text-slate-800 cursor-pointer transition-all flex items-center justify-between gap-1.5 h-[38px] shadow-2xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {(() => {
                            const cur = COLOR_OPTIONS.find((c) => c.value === form.color) || COLOR_OPTIONS[0];
                            return (
                              <>
                                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${cur.colorDot} shadow-2xs`} />
                                <span className="truncate text-left text-xs">
                                  <span className="font-semibold text-slate-800">{cur.label}</span>
                                  <span className="text-slate-400 text-[11px] ml-1">({cur.desc})</span>
                                </span>
                              </>
                            );
                          })()}
                        </div>
                        <IconChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${isColorDropdownOpen ? 'rotate-180 text-indigo-600' : ''}`} />
                      </button>

                      {isColorDropdownOpen && (
                        <div className="absolute left-0 w-full min-w-[200px] top-full mt-1 bg-white rounded-xl border border-slate-200/90 shadow-lg py-1 z-40 max-h-56 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150">
                          {COLOR_OPTIONS.map((opt) => {
                            const isSelected = form.color === opt.value;
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => {
                                  setForm({ ...form, color: opt.value });
                                  setIsColorDropdownOpen(false);
                                }}
                                className={`w-full px-2.5 py-1.5 text-left flex items-center justify-between gap-2 transition-colors cursor-pointer text-xs ${
                                  isSelected ? 'bg-indigo-50/70 font-semibold text-indigo-900' : 'hover:bg-slate-50 text-slate-700'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${opt.colorDot} shadow-2xs`} />
                                  <span className="truncate">
                                    <span>{opt.label}</span>{' '}
                                    <span className="text-slate-400 text-[11px]">({opt.desc})</span>
                                  </span>
                                </div>
                                {isSelected && <IconCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                      <select
                        value={form.isPaid ? 'PAID' : 'UNPAID'}
                        onChange={(e) => setForm({ ...form, isPaid: e.target.value === 'PAID' })}
                        className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-indigo-500 font-medium text-slate-800 cursor-pointer transition-colors"
                      >
                        <option value="PAID">Paid (Salary Kept)</option>
                        <option value="UNPAID">Unpaid (Loss of Pay)</option>
                      </select>
                    </div>
                  </div>

                  {/* Policy Permissions & Behavior Toggles */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                    <span className="text-[11px] font-bold text-slate-600 block uppercase tracking-wider">
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
                </div>

                {/* Drawer Footer */}
                <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 text-xs font-bold rounded-xl bg-[#5E4BE2] hover:bg-[#4d3cc9] text-white shadow-sm shadow-indigo-600/25 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {isSubmitting ? 'Saving...' : editingPolicy ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ===================== FLOATING CONFIRMATION TOASTER ===================== */}
      {deletingPolicy && (
        <div className="fixed top-6 right-6 z-50 max-w-sm sm:max-w-md w-[calc(100%-3rem)] pointer-events-auto animate-in slide-in-from-top-4 fade-in duration-200">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 shadow-2xl p-4 sm:p-5 ring-1 ring-slate-900/10 transition-all">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <IconTrash className="w-5 h-5 stroke-[1.8]" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-bold text-slate-900">
                    Delete Leave Policy?
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      if (!isDeleting) setDeletingPolicy(null);
                    }}
                    className="p-1 -mr-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Dismiss"
                  >
                    <IconX className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                  Are you sure you want to permanently delete <strong className="text-slate-900">"{deletingPolicy.name}" ({deletingPolicy.code})</strong>? This will permanently remove this leave policy from the system and release leave code <strong>{deletingPolicy.code}</strong>.
                </p>

                {deleteError && (
                  <div className="mt-2.5 p-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex items-center gap-1.5">
                    <IconAlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                    <span>{deleteError}</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 mt-3.5 pt-2.5 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setDeletingPolicy(null)}
                    disabled={isDeleting}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDelete}
                    disabled={isDeleting}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-sm shadow-rose-600/25 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isDeleting ? 'Deleting...' : 'Delete Permanently'}
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

export default LeaveTypesPage;
