import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import api from '../../api/client';
import {
  IconTarget,
  IconPlus,
  IconCheck,
  IconX,
  IconClock,
  IconCalendar,
  IconAlertCircle,
  IconChevronRight,
  IconMessageCircle,
  IconAward,
  IconTrendingUp,
  IconChevronDown,
  IconSearch,
  IconEye,
  IconTrash,
  IconLoader2,
} from '@tabler/icons-react';

interface GoalComment {
  authorId: number;
  body: string;
  at: string;
}

export interface PerformanceCycle {
  id: string;
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
}

interface GoalRequest {
  id: number;
  userId: number;
  type: string;
  title: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  startDate?: string | null;
  endDate?: string | null;
  createdAt: string;
  meta?: {
    cycleId?: string;
    cycleName?: string;
    weight?: number;
    goalStatus?: 'NOT_STARTED' | 'IN_PROGRESS' | 'DONE';
    comments?: GoalComment[];
  } | null;
  approver?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
}

export const PerformanceGoalsPage: React.FC = () => {
  const [goals, setGoals] = useState<GoalRequest[]>([]);
  const [cycles, setCycles] = useState<PerformanceCycle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'ALL' | 'IN_PROGRESS' | 'DONE' | 'PENDING'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGoalForView, setSelectedGoalForView] = useState<GoalRequest | null>(null);
  const [goalToCancel, setGoalToCancel] = useState<GoalRequest | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  // Form State
  const [form, setForm] = useState({
    title: '',
    reason: '',
    cycleId: '',
    startDate: '',
    endDate: '',
    weight: 25,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Comment Modal
  const [commentModal, setCommentModal] = useState<{
    open: boolean;
    goalId?: number;
    note: string;
  }>({ open: false, note: '' });

  // Calculate allocated weightage for any cycle from current user's active goals
  const getCycleAllocatedWeight = (cycleId: string, cycleName?: string) => {
    return goals
      .filter((g) => g.status !== 'REJECTED' && g.status !== 'CANCELLED')
      .filter(
        (g) =>
          (g.meta?.cycleId && g.meta.cycleId === cycleId) ||
          (cycleName && g.meta?.cycleName === cycleName)
      )
      .reduce((sum, g) => sum + (Number(g.meta?.weight) || 0), 0);
  };

  // Only cycles that have NOT reached 100% weightage are available to be selected in Performance Objective
  const availableCycles = useMemo(() => {
    return cycles.filter((c) => getCycleAllocatedWeight(c.id, c.name) < 100);
  }, [cycles, goals]);

  const fetchCycles = async () => {
    try {
      const res = await api.get('/company/cycles');
      const perfCycles: PerformanceCycle[] = res.data?.performanceCycles || [];
      setCycles(perfCycles);
    } catch (err) {
      console.error('Failed to load company cycles:', err);
    }
  };

  const fetchGoals = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/requests', {
        params: { type: 'GOAL', scope: 'mine' },
      });
      setGoals(res.data?.items || []);
    } catch (err) {
      console.error('Failed to load performance goals:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
    fetchCycles();
  }, []);

  const handleOpenCreateModal = () => {
    setError(null);
    const eligible = cycles.filter((c) => getCycleAllocatedWeight(c.id, c.name) < 100);
    const defaultCycle = eligible.find((c) => c.isActive) || eligible[0];
    const allocated = defaultCycle ? getCycleAllocatedWeight(defaultCycle.id, defaultCycle.name) : 0;
    const remaining = Math.max(0, 100 - allocated);

    setForm({
      title: '',
      reason: '',
      cycleId: defaultCycle ? defaultCycle.id : '',
      startDate: defaultCycle?.startDate ? defaultCycle.startDate.split('T')[0] : '',
      endDate: defaultCycle?.endDate ? defaultCycle.endDate.split('T')[0] : '',
      weight: Math.min(25, remaining > 0 ? remaining : 25),
    });
    setIsModalOpen(true);
  };

  const handleCycleChange = (cycleId: string) => {
    const selected = cycles.find((c) => c.id === cycleId);
    const allocated = selected ? getCycleAllocatedWeight(selected.id, selected.name) : 0;
    const remaining = Math.max(0, 100 - allocated);

    setForm((prev) => ({
      ...prev,
      cycleId,
      startDate: selected?.startDate ? selected.startDate.split('T')[0] : '',
      endDate: selected?.endDate ? selected.endDate.split('T')[0] : '',
      weight: prev.weight > remaining ? remaining : (prev.weight || Math.min(25, remaining)),
    }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.reason.trim()) {
      setError('Title and description are required');
      return;
    }
    if (!form.cycleId && availableCycles.length > 0) {
      setError('Please select an appraisal cycle');
      return;
    }
    if (availableCycles.length === 0) {
      setError('All appraisal cycles are already 100% allocated with existing goals.');
      return;
    }

    const selectedCycle = cycles.find((c) => c.id === form.cycleId);
    if (selectedCycle) {
      const allocated = getCycleAllocatedWeight(selectedCycle.id, selectedCycle.name);
      const remaining = 100 - allocated;
      if (allocated >= 100) {
        setError(`"${selectedCycle.name}" has already reached 100% allocated weightage.`);
        return;
      }
      if (Number(form.weight) > remaining) {
        setError(
          `Weightage cannot exceed the remaining ${remaining}% for "${selectedCycle.name}" (already at ${allocated}%).`
        );
        return;
      }
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await api.post('/requests', {
        type: 'GOAL',
        title: form.title.trim(),
        reason: form.reason.trim(),
        startDate: form.startDate || (selectedCycle?.startDate ? selectedCycle.startDate.split('T')[0] : undefined),
        endDate: form.endDate || (selectedCycle?.endDate ? selectedCycle.endDate.split('T')[0] : undefined),
        meta: {
          cycleId: form.cycleId || undefined,
          cycleName: selectedCycle?.name || undefined,
          weight: Number(form.weight) || 25,
          goalStatus: 'NOT_STARTED',
          comments: [],
        },
      });
      setIsModalOpen(false);
      setForm({
        title: '',
        reason: '',
        cycleId: '',
        startDate: '',
        endDate: '',
        weight: 25,
      });
      fetchGoals();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create goal');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelGoal = async () => {
    if (!goalToCancel) return;
    setIsCancelling(true);
    try {
      await api.patch(`/requests/${goalToCancel.id}/cancel`);
      setGoalToCancel(null);
      fetchGoals();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to cancel goal request');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleUpdateProgress = async (goalId: number, goalStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'DONE') => {
    try {
      await api.patch(`/requests/${goalId}/progress`, { goalStatus });
      fetchGoals();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update goal progress');
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentModal.goalId || !commentModal.note.trim()) return;
    try {
      await api.patch(`/requests/${commentModal.goalId}/progress`, {
        note: commentModal.note.trim(),
      });
      setCommentModal({ open: false, note: '' });
      fetchGoals();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to add progress note');
    }
  };

  // KPI Counters: Goals for present year, number submitted, number progressed, number completed
  const currentYear = new Date().getFullYear();
  const presentYearGoals = goals.filter((g) => {
    const createdYear = new Date(g.createdAt).getFullYear();
    const startYear = g.startDate ? new Date(g.startDate).getFullYear() : null;
    return createdYear === currentYear || startYear === currentYear;
  });
  const presentYearCount = presentYearGoals.length;

  const submittedCount = goals.filter((g) => g.status === 'PENDING').length;

  const progressedCount = goals.filter(
    (g) => g.status === 'APPROVED' && (g.meta?.goalStatus === 'IN_PROGRESS' || g.meta?.goalStatus === 'NOT_STARTED')
  ).length;

  const completedCount = goals.filter((g) => g.meta?.goalStatus === 'DONE').length;

  const filteredGoals = goals.filter((g) => {
    // 1. Status Filter
    if (activeTab === 'PENDING' && g.status !== 'PENDING') return false;
    const progress = g.meta?.goalStatus || 'NOT_STARTED';
    if (activeTab === 'DONE' && progress !== 'DONE') return false;
    if (activeTab === 'IN_PROGRESS' && (g.status !== 'APPROVED' || progress === 'DONE')) return false;

    // 2. Search Query Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const titleMatch = g.title.toLowerCase().includes(q);
      const reasonMatch = g.reason?.toLowerCase().includes(q);
      const cycleMatch = g.meta?.cycleName?.toLowerCase().includes(q);
      const approverMatch =
        g.approver &&
        `${g.approver.firstName} ${g.approver.lastName} ${g.approver.email}`
          .toLowerCase()
          .includes(q);
      return titleMatch || reasonMatch || cycleMatch || approverMatch;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <IconTarget className="w-5 h-5 text-indigo-600 shrink-0" />
            <span>Performance Goals</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Define quarterly strategic goals, align key results with team managers, and track milestones.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          {/* Status Filter Dropdown */}
          <div className="relative">
            <select
              aria-label="Filter Goals"
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value as any)}
              className="appearance-none pl-3.5 pr-8 py-2 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold text-slate-700 shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-[#5E4BE2]/20 focus:border-[#5E4BE2] transition-all cursor-pointer"
            >
              <option value="ALL">All Goals</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="DONE">Achieved</option>
              <option value="PENDING">Pending Approval</option>
            </select>
            <IconChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#5E4BE2] to-[#4B39C3] hover:from-[#5340D4] hover:to-[#4130B4] text-white text-xs font-bold rounded-xl shadow-sm shadow-indigo-600/25 transition-all active:scale-[0.98] cursor-pointer"
          >
            <IconPlus className="w-4 h-4" />
            <span>Create New Goal</span>
          </button>
        </div>
      </div>

      {/* KPI Counters: Goals for present year, number submitted, number progressed, number completed */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Goals for Present Year */}
        <div
          onClick={() => setActiveTab('ALL')}
          className={`bg-white rounded-2xl border p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-all cursor-pointer ${
            activeTab === 'ALL' ? 'ring-2 ring-[#5E4BE2] border-[#5E4BE2]/50' : 'border-slate-200'
          }`}
          title="Filter: All Goals"
        >
          <div>
            <span className="text-xs font-bold text-slate-500">Goals for Present Year</span>
            <div className="text-2xl font-black text-slate-900 mt-1 leading-none tracking-tight">
              {presentYearCount}
            </div>
            <div className="text-[11px] font-bold text-indigo-600 mt-2">
              All tracked in {currentYear}
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5E4BE2]">
            <IconTarget className="w-5 h-5" />
          </div>
        </div>

        {/* 2. Number Submitted */}
        <div
          onClick={() => setActiveTab('PENDING')}
          className={`bg-white rounded-2xl border p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-all cursor-pointer ${
            activeTab === 'PENDING' ? 'ring-2 ring-amber-600 border-amber-300' : 'border-slate-200'
          }`}
          title="Filter: Pending Manager Approval"
        >
          <div>
            <span className="text-xs font-bold text-slate-500">Number Submitted</span>
            <div className="text-2xl font-black text-slate-900 mt-1 leading-none tracking-tight">
              {submittedCount}
            </div>
            <div className="text-[11px] font-bold text-amber-600 mt-2">
              Awaiting manager sign-off
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
            <IconClock className="w-5 h-5" />
          </div>
        </div>

        {/* 3. Number Progressed */}
        <div
          onClick={() => setActiveTab('IN_PROGRESS')}
          className={`bg-white rounded-2xl border p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-all cursor-pointer ${
            activeTab === 'IN_PROGRESS' ? 'ring-2 ring-purple-600 border-purple-300' : 'border-slate-200'
          }`}
          title="Filter: In Progress"
        >
          <div>
            <span className="text-xs font-bold text-slate-500">Number Progressed</span>
            <div className="text-2xl font-black text-slate-900 mt-1 leading-none tracking-tight">
              {progressedCount}
            </div>
            <div className="text-[11px] font-bold text-purple-600 mt-2">
              Goals underway
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
            <IconTrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* 4. Number Completed */}
        <div
          onClick={() => setActiveTab('DONE')}
          className={`bg-white rounded-2xl border p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-all cursor-pointer ${
            activeTab === 'DONE' ? 'ring-2 ring-emerald-600 border-emerald-300' : 'border-slate-200'
          }`}
          title="Filter: Completed / Achieved"
        >
          <div>
            <span className="text-xs font-bold text-slate-500">Number Completed</span>
            <div className="text-2xl font-black text-slate-900 mt-1 leading-none tracking-tight">
              {completedCount}
            </div>
            <div className="text-[11px] font-bold text-emerald-600 mt-2">
              Successfully fulfilled
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <IconAward className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Table Container Card: Goal, cycle, approval, action */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden space-y-4 p-5">
        {/* Table Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-700 text-xs font-bold shrink-0">
            <IconTarget className="w-4 h-4 text-[#5E4BE2]" />
            <span>Tracked Objectives ({filteredGoals.length})</span>
          </div>

          {/* Search Input */}
          <div className="relative w-full max-w-xs">
            <IconSearch className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search goals or cycles..."
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
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-slate-500 font-medium">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-[#5E4BE2] border-t-transparent mb-2" />
              <p className="text-xs font-medium">Loading performance goals...</p>
            </div>
          ) : filteredGoals.length === 0 ? (
            <div className="py-16 text-center text-slate-500 font-medium">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-[#5E4BE2] flex items-center justify-center mx-auto mb-3">
                <IconTarget className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-slate-700">No Goals Found</h4>
              <p className="text-xs text-slate-500 font-medium mt-1 max-w-sm mx-auto">
                {searchQuery
                  ? 'No goals match your search query.'
                  : 'Submit a quarterly strategic goal or OKR for manager approval.'}
              </p>
              <button
                onClick={handleOpenCreateModal}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#5E4BE2] to-[#4B39C3] hover:from-[#5340D4] hover:to-[#4130B4] text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                <IconPlus className="w-4 h-4" /> Create New Goal
              </button>
            </div>
          ) : (
            <table className="w-full min-w-[700px] text-left text-xs">
              <thead className="bg-[#e5e7eb] text-xs font-bold text-slate-900 border-b border-slate-300">
                <tr>
                  <th className="px-5 py-3.5 whitespace-nowrap">Goal</th>
                  <th className="px-5 py-3.5 whitespace-nowrap">Cycle</th>
                  <th className="px-5 py-3.5 whitespace-nowrap">Approval</th>
                  <th className="px-5 py-3.5 text-right whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredGoals.map((goal) => {
                  const meta = goal.meta || {};
                  const progress = meta.goalStatus || 'NOT_STARTED';
                  const matchedCycle = cycles.find((c) => c.id === meta.cycleId);
                  const cycleDisplayName = matchedCycle?.name || meta.cycleName || 'General Cycle';
                  const cId = meta.cycleId || matchedCycle?.id;
                  const isCycleFullyAllocated = cId ? getCycleAllocatedWeight(cId, cycleDisplayName) >= 100 : false;

                  return (
                    <tr key={goal.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* 1. Goal Column */}
                      <td className="px-5 py-4">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5E4BE2] shrink-0 mt-0.5">
                            <IconTarget className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 max-w-sm lg:max-w-md">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-900 text-xs sm:text-sm">
                                {goal.title}
                              </span>
                              {meta.weight !== undefined && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-[#5E4BE2] border border-indigo-100 shrink-0">
                                  Weight: {meta.weight}%
                                </span>
                              )}
                              {goal.status === 'APPROVED' && (
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${
                                    progress === 'DONE'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : progress === 'IN_PROGRESS'
                                      ? 'bg-blue-100 text-blue-800'
                                      : 'bg-slate-100 text-slate-700'
                                  }`}
                                >
                                  {progress === 'DONE' ? 'Completed' : progress === 'IN_PROGRESS' ? 'In Progress' : 'Not Started'}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 font-normal line-clamp-1 mt-1">
                              {goal.reason}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* 2. Cycle Column */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-500 shrink-0">
                            <IconCalendar className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900 text-xs">
                                {cycleDisplayName}
                              </span>
                              {isCycleFullyAllocated && (
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  100%
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                              {matchedCycle?.startDate && matchedCycle?.endDate
                                ? `${new Date(matchedCycle.startDate).toLocaleDateString()} — ${new Date(matchedCycle.endDate).toLocaleDateString()}`
                                : goal.endDate
                                ? `Target: ${new Date(goal.endDate).toLocaleDateString()}`
                                : 'Evaluation Window'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 3. Approval Column */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div>
                          {goal.status === 'APPROVED' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <IconCheck className="w-3.5 h-3.5" /> Approved
                            </span>
                          ) : goal.status === 'REJECTED' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <IconX className="w-3.5 h-3.5" /> Rejected
                            </span>
                          ) : goal.status === 'CANCELLED' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                              Cancelled
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <IconClock className="w-3.5 h-3.5" /> Pending Manager Approval
                            </span>
                          )}
                          <div className="text-[11px] text-slate-500 font-medium mt-1">
                            {goal.approver ? (
                              <span>
                                <span className="text-slate-400">Approver: </span>
                                <span className="text-slate-700 font-semibold">{goal.approver.firstName} {goal.approver.lastName}</span>
                              </span>
                            ) : (
                              <span className="text-slate-400">Reporting Manager</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 4. Action Column */}
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View details */}
                          <button
                            type="button"
                            onClick={() => setSelectedGoalForView(goal)}
                            title="View Goal Details"
                            className="w-8 h-8 rounded-lg border border-indigo-200/80 bg-white hover:bg-indigo-50 text-[#5E4BE2] flex items-center justify-center shadow-2xs transition-all cursor-pointer"
                          >
                            <IconEye className="w-4 h-4 stroke-[1.8]" />
                          </button>

                          {/* Cancel Pending Goal */}
                          {goal.status === 'PENDING' && (
                            <button
                              type="button"
                              onClick={() => setGoalToCancel(goal)}
                              title="Cancel Pending Goal"
                              className="w-8 h-8 rounded-lg border border-rose-200/80 bg-white hover:bg-rose-50 text-rose-600 flex items-center justify-center shadow-2xs transition-all cursor-pointer"
                            >
                              <IconTrash className="w-4 h-4 stroke-[1.8]" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ===================== DEFINE PERFORMANCE OBJECTIVE RIGHT-SIDE DRAWER ===================== */}
      {isModalOpen && typeof document !== 'undefined' ? (
        createPortal(
          <div className="fixed inset-0 z-[9999] overflow-hidden">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in cursor-pointer"
              onClick={() => setIsModalOpen(false)}
            />

            {/* Slide-over Right Sidebar Panel */}
            <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10 pointer-events-none">
              <div
                className="w-screen max-w-md sm:max-w-lg bg-white shadow-2xl flex flex-col h-full border-l border-slate-200 pointer-events-auto animate-in slide-in-from-right duration-300 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5E4BE2] shrink-0 shadow-2xs">
                      <IconTarget className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 leading-tight">
                        Performance Objective
                      </h3>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        Submit a key result or OKR to your manager for quarterly evaluation.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="p-2 rounded-xl text-slate-500 font-medium hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Close panel"
                  >
                    <IconX className="w-5 h-5" />
                  </button>
                </div>

                {error && (
                  <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex items-center gap-2 shrink-0">
                    <IconAlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Form Body - scrollable */}
                <form onSubmit={handleCreate} className="flex flex-col flex-1 min-h-0">
                  <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Objective Title <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                        placeholder="e.g. Optimize API latency by 40% & achieve 99.9% uptime"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#5E4BE2]/20 focus:border-[#5E4BE2] transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Key Results & Success Metrics <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        required
                        rows={4}
                        value={form.reason}
                        onChange={(e) => setForm({ ...form, reason: e.target.value })}
                        placeholder="Detail the measurable metrics, deliverables, and targets..."
                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#5E4BE2]/20 focus:border-[#5E4BE2] transition-all resize-none"
                      />
                    </div>

                    {/* Appraisal Cycle Selection - Full Width */}
                    <div>
                      <label htmlFor="cycle-select" className="block text-xs font-semibold text-slate-700 mb-1">
                        Appraisal Cycle <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <select
                          id="cycle-select"
                          required
                          value={form.cycleId}
                          onChange={(e) => handleCycleChange(e.target.value)}
                          className="w-full appearance-none px-3.5 py-2.5 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#5E4BE2]/20 focus:border-[#5E4BE2] transition-all cursor-pointer"
                        >
                          <option value="">
                            {availableCycles.length === 0
                              ? 'All appraisal cycles 100% allocated'
                              : 'Select appraisal cycle...'}
                          </option>
                          {availableCycles.map((c) => {
                            const allocated = getCycleAllocatedWeight(c.id, c.name);
                            const remaining = 100 - allocated;
                            return (
                              <option key={c.id} value={c.id}>
                                {c.name} ({remaining}% available){c.isActive ? ' — Active Cycle' : ''}
                              </option>
                            );
                          })}
                        </select>
                        <IconChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>

                      {availableCycles.length === 0 && (
                        <div className="mt-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
                          <IconAlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                          <span>All appraisal cycles have reached 100% goal weightage allocation.</span>
                        </div>
                      )}

                      {/* Selected Cycle Details Pill Card */}
                      {form.cycleId && (() => {
                        const c = cycles.find((x) => x.id === form.cycleId);
                        if (!c) return null;
                        const allocated = getCycleAllocatedWeight(c.id, c.name);
                        const remaining = Math.max(0, 100 - allocated);
                        return (
                          <div className="mt-2.5 p-3 rounded-xl bg-indigo-50/70 border border-indigo-100 flex flex-col gap-2 text-xs">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-7 h-7 rounded-lg bg-indigo-100 text-[#5E4BE2] flex items-center justify-center shrink-0">
                                  <IconCalendar className="w-3.5 h-3.5" />
                                </div>
                                <div className="min-w-0">
                                  <span className="font-bold text-slate-900 text-xs block truncate">
                                    {c.name}
                                  </span>
                                  {c.startDate && c.endDate && (
                                    <span className="text-[11px] text-slate-500 block">
                                      Evaluation Window: {new Date(c.startDate).toLocaleDateString()} — {new Date(c.endDate).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {c.isActive && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 shrink-0">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  Active
                                </span>
                              )}
                            </div>

                            {/* Weight Allocation Progress Bar */}
                            <div className="pt-2 border-t border-indigo-100/80 space-y-1">
                              <div className="flex items-center justify-between text-[11px] font-semibold">
                                <span className="text-slate-600">Cycle Weight Allocation</span>
                                <span className="text-indigo-700 font-bold">{allocated}% used ({remaining}% remaining)</span>
                              </div>
                              <div className="w-full h-1.5 bg-indigo-100/70 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-[#5E4BE2] rounded-full transition-all"
                                  style={{ width: `${Math.min(100, allocated)}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Weightage (%) */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-semibold text-slate-700">
                          Goal Weightage (%)
                        </label>
                        <span className="text-[11px] text-slate-400 font-medium">
                          Impact on overall appraisal
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="relative w-28 shrink-0">
                          <input
                            type="number"
                            min="5"
                            max={(() => {
                              const selectedCycle = cycles.find((c) => c.id === form.cycleId);
                              return selectedCycle
                                ? Math.max(0, 100 - getCycleAllocatedWeight(selectedCycle.id, selectedCycle.name))
                                : 100;
                            })()}
                            step="5"
                            value={form.weight}
                            onChange={(e) => setForm({ ...form, weight: Number(e.target.value) || 25 })}
                            className="w-full px-3.5 py-2.5 pr-8 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#5E4BE2]/20 focus:border-[#5E4BE2] transition-all"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                            %
                          </span>
                        </div>
                        {/* Quick Presets */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {(() => {
                            const selectedCycle = cycles.find((c) => c.id === form.cycleId);
                            const remaining = selectedCycle
                              ? Math.max(0, 100 - getCycleAllocatedWeight(selectedCycle.id, selectedCycle.name))
                              : 100;
                            const presets = [10, 20, 25, 50].filter((w) => w <= remaining);
                            if (remaining > 0 && !presets.includes(remaining) && remaining <= 100) {
                              presets.push(remaining);
                              presets.sort((a, b) => a - b);
                            }
                            return presets.map((w) => (
                              <button
                                key={w}
                                type="button"
                                onClick={() => setForm({ ...form, weight: w })}
                                className={`px-2.5 py-1.5 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                                  form.weight === w
                                    ? 'bg-[#5E4BE2] text-white border-[#5E4BE2] shadow-2xs'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                }`}
                              >
                                {w}%{w === remaining && remaining < 100 ? ' (Max)' : ''}
                              </button>
                            ));
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Drawer Footer */}
                  <div className="p-4 px-6 border-t border-slate-100 bg-slate-50/70 flex items-center justify-end gap-2.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#5E4BE2] to-[#4B39C3] hover:from-[#5340D4] hover:to-[#4130B4] disabled:opacity-50 transition-all shadow-sm shadow-indigo-600/25 cursor-pointer"
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit Goal'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>,
          document.body
        )
      ) : null}

      {/* ===================== COMMENT / PROGRESS NOTE RIGHT-SIDE DRAWER ===================== */}
      {commentModal.open && typeof document !== 'undefined' ? (
        createPortal(
          <div className="fixed inset-0 z-[9999] overflow-hidden">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in cursor-pointer"
              onClick={() => setCommentModal({ open: false, note: '' })}
            />

            {/* Slide-over Right Sidebar Panel */}
            <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10 pointer-events-none">
              <div
                className="w-screen max-w-md sm:max-w-md bg-white shadow-2xl flex flex-col h-full border-l border-slate-200 pointer-events-auto animate-in slide-in-from-right duration-300 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5E4BE2] shrink-0 shadow-2xs">
                      <IconMessageCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 leading-tight">
                        Add Milestone Progress Note
                      </h3>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        Record an update or milestone achievement towards this objective.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCommentModal({ open: false, note: '' })}
                    className="p-2 rounded-xl text-slate-500 font-medium hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Close panel"
                  >
                    <IconX className="w-5 h-5" />
                  </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleAddComment} className="flex flex-col flex-1 min-h-0">
                  <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Progress Update Note <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        required
                        rows={5}
                        value={commentModal.note}
                        onChange={(e) => setCommentModal({ ...commentModal, note: e.target.value })}
                        placeholder="e.g. Completed initial database index optimization; latency reduced by 22%."
                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#5E4BE2]/20 focus:border-[#5E4BE2] transition-all resize-none"
                      />
                    </div>
                  </div>

                  {/* Drawer Footer */}
                  <div className="p-4 px-6 border-t border-slate-100 bg-slate-50/70 flex items-center justify-end gap-2.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setCommentModal({ open: false, note: '' })}
                      className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#5E4BE2] to-[#4B39C3] hover:from-[#5340D4] hover:to-[#4130B4] transition-all shadow-sm shadow-indigo-600/25 cursor-pointer"
                    >
                      Save Progress Note
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>,
          document.body
        )
      ) : null}

      {/* ===================== VIEW GOAL DETAILS RIGHT-SIDE DRAWER ===================== */}
      {selectedGoalForView && typeof document !== 'undefined' ? (
        createPortal(
          <div className="fixed inset-0 z-[9999] overflow-hidden">
            <div
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in cursor-pointer"
              onClick={() => setSelectedGoalForView(null)}
            />
            <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10 pointer-events-none">
              <div
                className="w-screen max-w-md sm:max-w-lg bg-white shadow-2xl flex flex-col h-full border-l border-slate-200 pointer-events-auto animate-in slide-in-from-right duration-300 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5E4BE2] shrink-0 shadow-2xs">
                      <IconEye className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 leading-tight">
                        Goal Details
                      </h3>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        Objective breakdown, approval workflow, and milestone progress.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedGoalForView(null)}
                    className="p-2 rounded-xl text-slate-500 font-medium hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Close panel"
                  >
                    <IconX className="w-5 h-5" />
                  </button>
                </div>

                {/* Content Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                  {/* Status Banner */}
                  <div
                    className={`p-4 rounded-xl border flex items-start gap-3 ${
                      selectedGoalForView.status === 'APPROVED'
                        ? 'bg-emerald-50/80 border-emerald-200 text-emerald-800'
                        : selectedGoalForView.status === 'REJECTED'
                        ? 'bg-rose-50/80 border-rose-200 text-rose-800'
                        : selectedGoalForView.status === 'CANCELLED'
                        ? 'bg-slate-100 border-slate-200 text-slate-700'
                        : 'bg-amber-50/80 border-amber-200 text-amber-800'
                    }`}
                  >
                    {selectedGoalForView.status === 'APPROVED' ? (
                      <IconCheck className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
                    ) : selectedGoalForView.status === 'REJECTED' ? (
                      <IconAlertCircle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
                    ) : selectedGoalForView.status === 'CANCELLED' ? (
                      <IconX className="w-5 h-5 shrink-0 text-slate-500 mt-0.5" />
                    ) : (
                      <IconClock className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
                    )}
                    <div>
                      <div className="text-xs font-bold capitalize">
                        {selectedGoalForView.status === 'PENDING'
                          ? 'Pending Manager Approval'
                          : selectedGoalForView.status.toLowerCase()}
                      </div>
                      <div className="text-[11px] opacity-90 mt-0.5">
                        {selectedGoalForView.status === 'PENDING'
                          ? 'This goal has been submitted to your reporting manager for sign-off.'
                          : selectedGoalForView.status === 'APPROVED'
                          ? 'This goal is approved and actively tracked towards your appraisal.'
                          : selectedGoalForView.status === 'REJECTED'
                          ? 'This goal request was not approved by your reporting manager.'
                          : 'This goal was cancelled.'}
                      </div>
                    </div>
                  </div>

                  {/* Title & Key Results */}
                  <div className="space-y-3">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Objective Title
                      </span>
                      <h4 className="text-base font-bold text-slate-900 mt-0.5">
                        {selectedGoalForView.title}
                      </h4>
                    </div>

                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Key Results & Description
                      </span>
                      <p className="text-xs text-slate-600 leading-relaxed mt-0.5 whitespace-pre-line bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                        {selectedGoalForView.reason || 'No description provided.'}
                      </p>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Appraisal Cycle
                      </span>
                      <span className="text-xs font-bold text-slate-800 mt-0.5 block truncate">
                        {selectedGoalForView.meta?.cycleName || 'General Cycle'}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Goal Weightage
                      </span>
                      <span className="text-xs font-bold text-indigo-600 mt-0.5 block">
                        {selectedGoalForView.meta?.weight || 25}%
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Progress Status
                      </span>
                      <span className="text-xs font-bold text-slate-800 mt-0.5 block">
                        {selectedGoalForView.meta?.goalStatus === 'DONE'
                          ? 'Completed'
                          : selectedGoalForView.meta?.goalStatus === 'IN_PROGRESS'
                          ? 'In Progress'
                          : 'Not Started'}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Target Date
                      </span>
                      <span className="text-xs font-bold text-slate-800 mt-0.5 block">
                        {selectedGoalForView.endDate
                          ? new Date(selectedGoalForView.endDate).toLocaleDateString()
                          : 'N/A'}
                      </span>
                    </div>
                  </div>

                  {/* Manager Approver */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200/70 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Assigned Approver
                    </span>
                    <div className="flex items-center gap-2.5 pt-0.5">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 text-[#5E4BE2] font-bold text-xs flex items-center justify-center shrink-0">
                        {selectedGoalForView.approver
                          ? selectedGoalForView.approver.firstName[0]
                          : 'M'}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-800">
                          {selectedGoalForView.approver
                            ? `${selectedGoalForView.approver.firstName} ${selectedGoalForView.approver.lastName}`
                            : 'Reporting Manager'}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {selectedGoalForView.approver?.email || 'Awaiting manager review'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Progress Notes */}
                  {selectedGoalForView.meta?.comments && selectedGoalForView.meta.comments.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Milestone Progress Notes ({selectedGoalForView.meta.comments.length})
                      </span>
                      <div className="space-y-2">
                        {selectedGoalForView.meta.comments.map((c, i) => (
                          <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-xs">
                            <p className="text-slate-700 font-medium">{c.body}</p>
                            <span className="text-[10px] text-slate-400 mt-1 block">
                              {new Date(c.at).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="p-4 px-6 border-t border-slate-100 bg-slate-50/70 flex items-center justify-end gap-2.5 shrink-0">
                  {selectedGoalForView.status === 'PENDING' && (
                    <button
                      type="button"
                      onClick={() => {
                        const target = selectedGoalForView;
                        setSelectedGoalForView(null);
                        setGoalToCancel(target);
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer mr-auto"
                    >
                      Cancel Goal Request
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedGoalForView(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )
      ) : null}

      {/* ===================== CANCEL GOAL CONFIRMATION DIALOG ===================== */}
      {goalToCancel && typeof document !== 'undefined' ? (
        createPortal(
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in cursor-pointer"
              onClick={() => !isCancelling && setGoalToCancel(null)}
            />
            <div
              className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 z-10 animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <IconTrash className="w-6 h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-bold text-slate-900 leading-tight">
                    Cancel Goal Request?
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-1.5 leading-relaxed">
                    Are you sure you want to cancel the objective{' '}
                    <span className="font-bold text-slate-800">"{goalToCancel.title}"</span>?
                    This will withdraw the request from your manager and free up{' '}
                    <span className="font-bold text-slate-800">{goalToCancel.meta?.weight || 0}%</span> weightage in this appraisal cycle.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={isCancelling}
                  onClick={() => setGoalToCancel(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Keep Goal
                </button>
                <button
                  type="button"
                  disabled={isCancelling}
                  onClick={handleCancelGoal}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-all shadow-sm shadow-rose-600/25 cursor-pointer disabled:opacity-50"
                >
                  {isCancelling ? (
                    <>
                      <IconLoader2 className="w-4 h-4 animate-spin" />
                      <span>Cancelling...</span>
                    </>
                  ) : (
                    <span>Yes, Cancel Goal</span>
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      ) : null}
    </div>
  );
};

export default PerformanceGoalsPage;
