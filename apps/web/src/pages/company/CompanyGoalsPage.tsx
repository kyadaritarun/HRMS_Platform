import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import api from '../../api/client';
import {
  IconTarget,
  IconPlus,
  IconSearch,
  IconFilter,
  IconPencil,
  IconTrash,
  IconCheck,
  IconAlertCircle,
  IconCalendar,
  IconTrendingUp,
  IconAward,
  IconUsers,
  IconLoader2,
  IconX,
  IconChevronDown,
  IconArrowUpRight,
  IconEye,
  IconChartBar,
  IconSparkles,
} from '@tabler/icons-react';

export interface CompanyGoalItem {
  id: string;
  title: string;
  description: string;
  category: string;
  targetPeriod: string;
  targetMetric: string;
  progress: number;
  status: 'ON_TRACK' | 'AT_RISK' | 'COMPLETED' | 'PLANNED';
  ownerName: string;
  createdAt?: string;
  updatedAt?: string;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string; bar: string }> = {
  'Revenue & Growth': {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200/80',
    bar: 'bg-emerald-500',
  },
  'Product & Technology': {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200/80',
    bar: 'bg-blue-500',
  },
  'Customer Success': {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200/80',
    bar: 'bg-amber-500',
  },
  'People & Culture': {
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200/80',
    bar: 'bg-[#5E4BE2]',
  },
  'Operational Excellence': {
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-300',
    bar: 'bg-slate-600',
  },
};

const DEFAULT_CATEGORY_COLOR = {
  bg: 'bg-indigo-50',
  text: 'text-[#5E4BE2]',
  border: 'border-indigo-100',
  bar: 'bg-[#5E4BE2]',
};

export const CompanyGoalsPage: React.FC = () => {
  const [goals, setGoals] = useState<CompanyGoalItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Modal State for Create / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<CompanyGoalItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form State
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'Revenue & Growth',
    targetPeriod: 'FY 2026-27',
    targetMetric: '',
    progress: 50,
    status: 'ON_TRACK' as 'ON_TRACK' | 'AT_RISK' | 'COMPLETED' | 'PLANNED',
    ownerName: 'Executive Leadership',
  });

  // Delete Confirmation Modal
  const [goalToDelete, setGoalToDelete] = useState<CompanyGoalItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // View Goal Details Drawer State
  const [selectedGoalForView, setSelectedGoalForView] = useState<CompanyGoalItem | null>(null);
  const [drawerProgress, setDrawerProgress] = useState<number>(0);
  const [isUpdatingProgress, setIsUpdatingProgress] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Fetch Company Goals
  const fetchCompanyGoals = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/company/goals');
      setGoals(res.data?.companyGoals || []);
    } catch (err) {
      console.error('Failed to load company goals:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanyGoals();
  }, []);

  // Filtered Goals
  const filteredGoals = useMemo(() => {
    return goals.filter((g) => {
      const matchesSearch =
        !searchQuery.trim() ||
        g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.targetMetric.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.ownerName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCat = selectedCategory === 'ALL' || g.category === selectedCategory;
      const matchesStatus = selectedStatus === 'ALL' || g.status === selectedStatus;

      return matchesSearch && matchesCat && matchesStatus;
    });
  }, [goals, searchQuery, selectedCategory, selectedStatus]);

  // Metrics
  const stats = useMemo(() => {
    const total = goals.length;
    const onTrack = goals.filter((g) => g.status === 'ON_TRACK').length;
    const atRisk = goals.filter((g) => g.status === 'AT_RISK').length;
    const completed = goals.filter((g) => g.status === 'COMPLETED').length;
    const avgProgress = total > 0 ? Math.round(goals.reduce((acc, g) => acc + (g.progress || 0), 0) / total) : 0;

    return { total, onTrack, atRisk, completed, avgProgress };
  }, [goals]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingGoal(null);
    setFormError(null);
    setForm({
      title: '',
      description: '',
      category: 'Revenue & Growth',
      targetPeriod: 'FY 2026-27',
      targetMetric: '',
      progress: 0,
      status: 'ON_TRACK',
      ownerName: 'Executive Leadership',
    });
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (goal: CompanyGoalItem) => {
    setEditingGoal(goal);
    setFormError(null);
    setForm({
      title: goal.title,
      description: goal.description || '',
      category: goal.category || 'Revenue & Growth',
      targetPeriod: goal.targetPeriod || 'FY 2026-27',
      targetMetric: goal.targetMetric || '',
      progress: goal.progress || 0,
      status: goal.status || 'ON_TRACK',
      ownerName: goal.ownerName || 'Executive Leadership',
    });
    setIsModalOpen(true);
  };

  // Save Goal Handler
  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setFormError('Goal title is required');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      if (editingGoal) {
        // Update
        const res = await api.patch(`/company/goals/${editingGoal.id}`, form);
        setGoals(res.data?.companyGoals || []);
      } else {
        // Create
        const res = await api.post('/company/goals', form);
        setGoals(res.data?.companyGoals || []);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Failed to save company goal:', err);
      setFormError(err.response?.data?.error || 'Failed to save company goal. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Handler
  const handleDeleteConfirm = async () => {
    if (!goalToDelete) return;
    setIsDeleting(true);
    try {
      const res = await api.delete(`/company/goals/${goalToDelete.id}`);
      setGoals(res.data?.companyGoals || []);
      setGoalToDelete(null);
    } catch (err) {
      console.error('Failed to delete company goal:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // View Drawer Handlers
  const handleOpenViewDrawer = (goal: CompanyGoalItem) => {
    setSelectedGoalForView(goal);
    setDrawerProgress(goal.progress || 0);
  };

  const handleQuickUpdateStatus = async (newStatus: 'ON_TRACK' | 'AT_RISK' | 'COMPLETED' | 'PLANNED') => {
    if (!selectedGoalForView) return;
    setIsUpdatingStatus(true);
    try {
      const res = await api.patch(`/company/goals/${selectedGoalForView.id}`, { status: newStatus });
      setGoals(res.data?.companyGoals || []);
      setSelectedGoalForView((prev) => (prev ? { ...prev, status: newStatus } : null));
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update goal status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleQuickUpdateProgress = async () => {
    if (!selectedGoalForView) return;
    setIsUpdatingProgress(true);
    try {
      const res = await api.patch(`/company/goals/${selectedGoalForView.id}`, { progress: drawerProgress });
      setGoals(res.data?.companyGoals || []);
      setSelectedGoalForView((prev) => (prev ? { ...prev, progress: drawerProgress } : null));
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update goal progress');
    } finally {
      setIsUpdatingProgress(false);
    }
  };

  const getStatusPill = (status: string) => {
    switch (status) {
      case 'ON_TRACK':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            On Track
          </span>
        );
      case 'AT_RISK':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            At Risk
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <IconCheck className="w-3 h-3 stroke-[2.5]" />
            Completed
          </span>
        );
      case 'PLANNED':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            Planned
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <IconTarget className="w-5 h-5 text-indigo-600 shrink-0" />
            <span>Company Goals</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Define strategic goals and align organizational targets.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#5E4BE2] to-[#4B39C3] hover:from-[#5340D4] hover:to-[#4130B4] text-white text-xs font-bold rounded-xl shadow-sm shadow-indigo-600/25 transition-all active:scale-[0.98] cursor-pointer shrink-0"
        >
          <IconPlus className="w-4 h-4" />
          <span>Add Goal</span>
        </button>
      </div>
      
      {/* ===================== MAIN GOALS CONTAINER (TABLE / CARDS) ===================== */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden space-y-4 p-5">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Search Input (Left) */}
          <div className="relative w-full max-w-xs sm:max-w-sm">
            <IconSearch className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search goals, metrics, owners..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#5E4BE2] text-slate-800 placeholder-slate-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <IconX className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filters (Right) */}
          <div className="flex items-center gap-2.5 flex-wrap sm:justify-end">
            {/* Category Filter */}
            <div className="relative">
              <select
                aria-label="Filter Pillar"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none cursor-pointer transition-colors shadow-2xs"
              >
                <option value="ALL">All Pillars / Categories</option>
                <option value="Revenue & Growth">Revenue &amp; Growth</option>
                <option value="Product & Technology">Product &amp; Tech</option>
                <option value="Customer Success">Customer Success</option>
                <option value="People & Culture">People &amp; Culture</option>
                <option value="Operational Excellence">Operations</option>
              </select>
              <IconChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <select
                aria-label="Filter Status"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none cursor-pointer transition-colors shadow-2xs"
              >
                <option value="ALL">All Statuses</option>
                <option value="ON_TRACK">On Track</option>
                <option value="AT_RISK">At Risk</option>
                <option value="COMPLETED">Completed</option>
                <option value="PLANNED">Planned</option>
              </select>
              <IconChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="py-16 text-center">
            <IconLoader2 className="w-8 h-8 text-[#5E4BE2] animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-medium mt-2">Loading organizational goals...</p>
          </div>
        ) : filteredGoals.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-[#5E4BE2] flex items-center justify-center mx-auto mb-2">
              <IconTarget className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">No company goals match your criteria</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Try adjusting your search filters or click the button below to define a new strategic goal for your company.
            </p>
            <button
              type="button"
              onClick={handleOpenCreate}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[#5E4BE2] to-[#4B39C3] hover:from-[#5340D4] hover:to-[#4130B4] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <IconPlus className="w-4 h-4" />
              <span>Add Company Goal</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden">
            <table className="w-full min-w-[700px] text-left text-xs">
              <thead className="bg-[#e5e7eb] text-xs font-bold text-slate-900 border-b border-slate-300">
                <tr>
                  <th className="px-5 py-3.5 whitespace-nowrap">Goal</th>
                  <th className="px-5 py-3.5 whitespace-nowrap">Period</th>
                  <th className="px-5 py-3.5 whitespace-nowrap">Status</th>
                  <th className="px-5 py-3.5 whitespace-nowrap">Executive Owner</th>
                  <th className="px-5 py-3.5 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredGoals.map((goal) => {
                  return (
                    <tr
                      key={goal.id}
                      onClick={() => handleOpenViewDrawer(goal)}
                      className="hover:bg-indigo-50/30 transition-all cursor-pointer group"
                    >
                      {/* 1. Goal */}
                      <td className="px-5 py-4">
                        <div className="min-w-0 max-w-md">
                          <span className="font-bold text-slate-900 text-xs sm:text-sm group-hover:text-[#5E4BE2] transition-colors block">
                            {goal.title}
                          </span>
                          {goal.description && (
                            <p className="text-[11px] text-slate-500 font-normal line-clamp-2 mt-0.5">
                              {goal.description}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* 2. Period */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                          <IconCalendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{goal.targetPeriod || 'FY 2026-27'}</span>
                        </div>
                      </td>

                      {/* 3. Status */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        {getStatusPill(goal.status)}
                      </td>

                      {/* 4. Executive Owner */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <IconUsers className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-semibold text-slate-800 text-xs">
                            {goal.ownerName || 'Executive Leadership'}
                          </span>
                        </div>
                        <span className="text-[10px] text-emerald-600 font-medium block mt-0.5">
                          Active for OKR Alignment
                        </span>
                      </td>

                      {/* 5. Actions */}
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <div
                          className="flex items-center justify-end gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => handleOpenViewDrawer(goal)}
                            title="View Goal Details"
                            className="w-8 h-8 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-[#5E4BE2] hover:bg-indigo-50/50 hover:border-indigo-200 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                          >
                            <IconEye className="w-4 h-4 stroke-[1.8]" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(goal)}
                            title="Edit Goal"
                            className="w-8 h-8 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-slate-900 hover:bg-slate-50 hover:border-slate-300 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                          >
                            <IconPencil className="w-4 h-4 stroke-[1.8]" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setGoalToDelete(goal)}
                            title="Delete Goal"
                            className="w-8 h-8 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-rose-600 hover:bg-rose-50/50 hover:border-rose-200 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                          >
                            <IconTrash className="w-4 h-4 stroke-[1.8]" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ===================== CREATE / EDIT DRAWER (RIGHT SIDE) ===================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setIsModalOpen(false)}
          />

          <div className="fixed inset-y-0 right-0 max-w-xl w-full flex pl-10 pointer-events-none">
            <div className="w-full bg-white shadow-2xl flex flex-col border-l border-slate-200 pointer-events-auto animate-in slide-in-from-right duration-300 h-full">
              {/* Drawer Header */}
              <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-4 bg-slate-50/60">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 text-[#5E4BE2] flex items-center justify-center shrink-0">
                    <IconTarget className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                      {editingGoal ? 'Edit Company Goal' : 'Add Company Goal'}
                    </h2>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                      This goal will be available to all employees for performance alignment
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-9 h-9 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
                >
                  <IconX className="w-5 h-5" />
                </button>
              </div>

              {/* Form Body (Scrollable) */}
              <form
                onSubmit={handleSaveGoal}
                className="flex-1 overflow-y-auto p-6 space-y-5 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  {formError && (
                    <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                      <IconAlertCircle className="w-4 h-4 shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  {/* Goal Title */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Goal Title <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Accelerate Enterprise ARR Growth to $10M"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5E4BE2]/20 focus:border-[#5E4BE2] transition-all"
                    />
                  </div>

                  {/* Category & Target Period Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Strategic Pillar</label>
                      <select
                        value={form.category}
                        onChange={(e) => setForm({ ...form, category: e.target.value })}
                        className="w-full px-3 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none cursor-pointer"
                      >
                        <option value="Revenue & Growth">Revenue &amp; Growth</option>
                        <option value="Product & Technology">Product &amp; Tech</option>
                        <option value="Customer Success">Customer Success</option>
                        <option value="People & Culture">People &amp; Culture</option>
                        <option value="Operational Excellence">Operations</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Target Period</label>
                      <input
                        type="text"
                        placeholder="e.g. FY 2026-27"
                        value={form.targetPeriod}
                        onChange={(e) => setForm({ ...form, targetPeriod: e.target.value })}
                        className="w-full px-3 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Description & Key Results */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Strategic Description &amp; Key Results
                    </label>
                    <textarea
                      rows={4}
                      placeholder="Outline key deliverables, targets, and strategic context for employees aligning their OKRs..."
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5E4BE2]/20 focus:border-[#5E4BE2] transition-all"
                    />
                  </div>

                  {/* Executive Owner & Status */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Executive Owner / Team</label>
                      <input
                        type="text"
                        placeholder="e.g. Executive Leadership"
                        value={form.ownerName}
                        onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
                        className="w-full px-3 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Status</label>
                      <select
                        value={form.status}
                        onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                        className="w-full px-3 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none cursor-pointer"
                      >
                        <option value="ON_TRACK">On Track</option>
                        <option value="AT_RISK">At Risk</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="PLANNED">Planned</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Drawer Footer Actions */}
                <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-[#5E4BE2] to-[#4B39C3] hover:from-[#5340D4] hover:to-[#4130B4] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <IconLoader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving Goal...</span>
                      </>
                    ) : (
                      <span>{editingGoal ? 'Update Goal' : 'Create Goal'}</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ===================== DELETE CONFIRMATION MODAL ===================== */}
      {goalToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <IconTrash className="w-5 h-5" />
            </div>
            <div className="text-center">
              <h3 className="text-sm font-bold text-slate-900">Delete Company Goal?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to remove &quot;{goalToDelete.title}&quot;? Employees will no longer be able to align future objectives to it.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setGoalToDelete(null)}
                className="flex-1 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Keep Goal
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== VIEW GOAL DETAILS SLIDE-OVER DRAWER ===================== */}
      {selectedGoalForView &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-50 overflow-hidden">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in"
              onClick={() => setSelectedGoalForView(null)}
            />

            <div className="fixed inset-y-0 right-0 max-w-xl w-full flex pl-10 pointer-events-none">
              <div className="w-full bg-white shadow-2xl flex flex-col border-l border-slate-200 pointer-events-auto animate-in slide-in-from-right duration-300">
                {/* Drawer Header */}
                <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-4 bg-slate-50/60">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                          (CATEGORY_COLORS[selectedGoalForView.category] || DEFAULT_CATEGORY_COLOR).bg
                        } ${
                          (CATEGORY_COLORS[selectedGoalForView.category] || DEFAULT_CATEGORY_COLOR).text
                        } ${
                          (CATEGORY_COLORS[selectedGoalForView.category] || DEFAULT_CATEGORY_COLOR).border
                        }`}
                      >
                        {selectedGoalForView.category}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-200/70 text-slate-700">
                        {selectedGoalForView.targetPeriod || 'FY 2026-27'}
                      </span>
                    </div>
                    <h2 className="text-lg font-black text-slate-900 tracking-tight leading-snug">
                      {selectedGoalForView.title}
                    </h2>
                    <p className="text-xs text-slate-500 flex items-center gap-1.5">
                      <IconUsers className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        Owner:{' '}
                        <strong className="text-slate-700">
                          {selectedGoalForView.ownerName || 'Executive Leadership'}
                        </strong>
                      </span>
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedGoalForView(null)}
                    className="w-9 h-9 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
                  >
                    <IconX className="w-5 h-5" />
                  </button>
                </div>

                {/* Drawer Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {/* Status Quick Switcher */}
                  <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/70 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Execution Status
                      </label>
                      {getStatusPill(selectedGoalForView.status)}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                      {(['ON_TRACK', 'AT_RISK', 'COMPLETED', 'PLANNED'] as const).map((st) => (
                        <button
                          key={st}
                          type="button"
                          disabled={isUpdatingStatus}
                          onClick={() => handleQuickUpdateStatus(st)}
                          className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                            selectedGoalForView.status === st
                              ? 'bg-white border-[#5E4BE2] text-[#5E4BE2] shadow-xs'
                              : 'bg-white/60 border-slate-200 text-slate-600 hover:bg-white hover:text-slate-900'
                          }`}
                        >
                          {st === 'ON_TRACK' && 'On Track'}
                          {st === 'AT_RISK' && 'At Risk'}
                          {st === 'COMPLETED' && 'Completed'}
                          {st === 'PLANNED' && 'Planned'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Progress Interactive Slider */}
                  <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <IconChartBar className="w-4 h-4 text-[#5E4BE2]" />
                        <span className="text-xs font-bold text-slate-800">Current Progress</span>
                      </div>
                      <span className="text-sm font-black font-mono text-[#5E4BE2]">
                        {drawerProgress}%
                      </span>
                    </div>

                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={drawerProgress}
                      onChange={(e) => setDrawerProgress(Number(e.target.value))}
                      className="w-full accent-[#5E4BE2] cursor-pointer"
                    />

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-1.5">
                        <div className="w-24 h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              (CATEGORY_COLORS[selectedGoalForView.category] || DEFAULT_CATEGORY_COLOR).bar
                            }`}
                            style={{ width: `${Math.min(100, Math.max(0, drawerProgress))}%` }}
                          />
                        </div>
                        <span className="text-[11px] text-slate-400">Target 100%</span>
                      </div>

                      {drawerProgress !== selectedGoalForView.progress && (
                        <button
                          type="button"
                          disabled={isUpdatingProgress}
                          onClick={handleQuickUpdateProgress}
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#5E4BE2] hover:bg-[#4B39C3] text-white text-xs font-bold rounded-lg shadow-xs transition-all cursor-pointer disabled:opacity-50"
                        >
                          {isUpdatingProgress ? (
                            <IconLoader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <IconCheck className="w-3 h-3 stroke-[2.5]" />
                          )}
                          <span>Save Progress</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Period & Category Overview */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Evaluation Period
                    </p>
                    <p className="text-sm font-bold text-slate-800 mt-1">
                      {selectedGoalForView.targetPeriod || 'FY 2026-27'}
                    </p>
                  </div>

                  {/* Objective Narrative / Details */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Strategic Objective &amp; Context
                    </h3>
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 text-xs text-slate-700 leading-relaxed font-normal">
                      {selectedGoalForView.description || (
                        <span className="italic text-slate-400">No descriptive narrative provided.</span>
                      )}
                    </div>
                  </div>

                  {/* OKR Cascade Alignment Info Banner */}
                  <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex items-start gap-3">
                    <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                      <IconSparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-emerald-900">Cascading OKR Alignment</h4>
                      <p className="text-[11px] text-emerald-700 mt-0.5 leading-normal">
                        This strategic goal is surfaced across all employee Performance Goals pages. Employees can link their individual appraisal goals to this target to track company-wide contribution.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Drawer Footer */}
                <div className="p-5 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      const target = selectedGoalForView;
                      setSelectedGoalForView(null);
                      handleOpenEdit(target);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl shadow-2xs transition-colors cursor-pointer"
                  >
                    <IconPencil className="w-3.5 h-3.5" />
                    <span>Edit Goal Details</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedGoalForView(null)}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default CompanyGoalsPage;

