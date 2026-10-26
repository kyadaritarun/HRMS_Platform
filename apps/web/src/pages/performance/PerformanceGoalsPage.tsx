import React, { useState, useEffect } from 'react';
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
} from '@tabler/icons-react';

interface GoalComment {
  authorId: number;
  body: string;
  at: string;
}

interface GoalRequest {
  id: number;
  userId: number;
  type: string;
  title: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  startDate?: string | null;
  endDate?: string | null;
  createdAt: string;
  meta?: {
    cycleId?: string;
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
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'ALL' | 'IN_PROGRESS' | 'DONE' | 'PENDING'>('ALL');

  // Form State
  const [form, setForm] = useState({
    title: '',
    reason: '',
    startDate: new Date().toISOString().split('T')[0],
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
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.reason.trim()) {
      setError('Title and description are required');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await api.post('/requests', {
        type: 'GOAL',
        title: form.title.trim(),
        reason: form.reason.trim(),
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        meta: {
          weight: Number(form.weight) || 25,
          goalStatus: 'NOT_STARTED',
          comments: [],
        },
      });
      setIsModalOpen(false);
      setForm({
        title: '',
        reason: '',
        startDate: new Date().toISOString().split('T')[0],
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

  const filteredGoals = goals.filter((g) => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'PENDING') return g.status === 'PENDING';
    const progress = g.meta?.goalStatus || 'NOT_STARTED';
    if (activeTab === 'DONE') return progress === 'DONE';
    if (activeTab === 'IN_PROGRESS') return progress === 'IN_PROGRESS' || progress === 'NOT_STARTED';
    return true;
  });

  const completedCount = goals.filter((g) => g.meta?.goalStatus === 'DONE').length;
  const inProgressCount = goals.filter(
    (g) => g.status === 'APPROVED' && g.meta?.goalStatus !== 'DONE'
  ).length;
  const pendingApprovalCount = goals.filter((g) => g.status === 'PENDING').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5E4BE2] shrink-0">
              <IconTarget className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Performance Goals
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Define quarterly strategic goals, align key results with team managers, and track milestones.
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
          <span>Create New Goal</span>
        </button>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <span className="text-xs font-bold text-slate-500">Total Objectives</span>
            <div className="text-2xl font-black text-slate-900 mt-1 leading-none tracking-tight">
              {goals.length}
            </div>
            <div className="text-[11px] font-bold text-indigo-600 mt-2">
              All tracked OKRs
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5E4BE2]">
            <IconTarget className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <span className="text-xs font-bold text-slate-500">Active Objectives</span>
            <div className="text-2xl font-black text-slate-900 mt-1 leading-none tracking-tight">
              {inProgressCount}
            </div>
            <div className="text-[11px] font-bold text-purple-600 mt-2">
              Goals underway
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
            <IconTrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <span className="text-xs font-bold text-slate-500">Completed / Achieved</span>
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

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <span className="text-xs font-bold text-slate-500">Manager Approval</span>
            <div className="text-2xl font-black text-slate-900 mt-1 leading-none tracking-tight">
              {pendingApprovalCount}
            </div>
            <div className="text-[11px] font-bold text-amber-600 mt-2">
              Awaiting sign-off
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
            <IconClock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-slate-50/80 border border-slate-200/70 p-1 rounded-xl">
          {(['ALL', 'IN_PROGRESS', 'DONE', 'PENDING'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${activeTab === tab
                  ? 'bg-white text-[#5E4BE2] shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              {tab === 'ALL'
                ? 'All Goals'
                : tab === 'IN_PROGRESS'
                  ? 'In Progress'
                  : tab === 'DONE'
                    ? 'Achieved'
                    : 'Pending Approval'}
            </button>
          ))}
        </div>
      </div>

      {/* Goals Cards */}
      <div className="space-y-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm animate-pulse space-y-3">
              <div className="w-48 h-4 bg-slate-200 rounded-md" />
              <div className="w-72 h-3 bg-slate-100 rounded-md" />
            </div>
          ))
        ) : filteredGoals.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
            <div className="w-12 h-12 rounded-full bg-indigo-50 text-[#5E4BE2] flex items-center justify-center mx-auto mb-3">
              <IconTarget className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No Goals in this Category</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Set ambitious performance targets to track personal professional growth and deliver business outcomes.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#5E4BE2] to-[#4B39C3] hover:from-[#5340D4] hover:to-[#4130B4] text-white text-xs font-bold shadow-sm shadow-indigo-600/25 cursor-pointer"
            >
              <IconPlus className="w-4 h-4" /> Create First Goal
            </button>
          </div>
        ) : (
          filteredGoals.map((goal) => {
            const meta = goal.meta || {};
            const progress = meta.goalStatus || 'NOT_STARTED';
            const comments = Array.isArray(meta.comments) ? meta.comments : [];

            return (
              <div
                key={goal.id}
                className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Approval Status Badge */}
                      {goal.status === 'APPROVED' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <IconCheck className="w-3.5 h-3.5" /> Approved
                        </span>
                      ) : goal.status === 'REJECTED' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          <IconX className="w-3.5 h-3.5" /> Rejected
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          <IconClock className="w-3.5 h-3.5" /> Pending Manager Approval
                        </span>
                      )}

                      {/* Weightage */}
                      {meta.weight !== undefined && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-indigo-50 text-[#5E4BE2] border border-indigo-100">
                          Weight: {meta.weight}%
                        </span>
                      )}

                      {/* Execution Progress */}
                      {goal.status === 'APPROVED' && (
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-md ${progress === 'DONE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : progress === 'IN_PROGRESS'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                        >
                          Status: {progress.replace('_', ' ')}
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-slate-900">{goal.title}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">{goal.reason}</p>
                  </div>

                  {/* Actions / Target Date */}
                  <div className="flex flex-col sm:items-end gap-2 shrink-0">
                    {goal.endDate && (
                      <div className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                        <IconCalendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>Target: {new Date(goal.endDate).toLocaleDateString()}</span>
                      </div>
                    )}

                    {/* Progress Toggle */}
                    {goal.status === 'APPROVED' && (
                      <div className="flex items-center gap-1.5 pt-1">
                        <select
                          value={progress}
                          onChange={(e) =>
                            handleUpdateProgress(
                              goal.id,
                              e.target.value as 'NOT_STARTED' | 'IN_PROGRESS' | 'DONE'
                            )
                          }
                          className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 cursor-pointer outline-hidden"
                        >
                          <option value="NOT_STARTED">Not Started</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="DONE">Completed / Done</option>
                        </select>

                        <button
                          onClick={() => setCommentModal({ open: true, goalId: goal.id, note: '' })}
                          className="p-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
                          title="Add progress note"
                        >
                          <IconMessageCircle className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Approver Details */}
                {goal.approver && (
                  <div className="text-xs text-slate-500 flex items-center gap-1.5 pt-2 border-t border-slate-100">
                    <span className="font-semibold text-slate-700">Reporting Approver:</span>
                    <span>
                      {goal.approver.firstName} {goal.approver.lastName} ({goal.approver.email})
                    </span>
                  </div>
                )}

                {/* Progress notes feed if any */}
                {comments.length > 0 && (
                  <div className="pt-2 border-t border-slate-100 space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Progress Notes ({comments.length})
                    </span>
                    <div className="space-y-1">
                      {comments.map((c, idx) => (
                        <div key={idx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700 flex items-start justify-between gap-2">
                          <span>{c.body}</span>
                          <span className="text-[10px] text-slate-400 shrink-0">
                            {new Date(c.at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* New Goal Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5E4BE2]">
                  <IconTarget className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Define Performance Objective</h3>
                  <p className="text-xs text-slate-500">
                    Submit a key result or OKR to your manager for quarterly evaluation.
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Objective Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Optimize API latency by 40% & achieve 99.9% uptime"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-hidden focus:border-[#5E4BE2]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Key Results & Success Metrics <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  placeholder="Detail the measurable metrics, deliverables, and targets..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-hidden focus:border-[#5E4BE2] resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Target Completion Date</label>
                  <input
                    type="date"
                    required
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-hidden focus:border-[#5E4BE2]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Weightage (%)</label>
                  <input
                    type="number"
                    min="5"
                    max="100"
                    value={form.weight}
                    onChange={(e) => setForm({ ...form, weight: Number(e.target.value) || 25 })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-hidden focus:border-[#5E4BE2]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#5E4BE2] to-[#4B39C3] hover:from-[#5340D4] hover:to-[#4130B4] disabled:opacity-50 transition-all shadow-sm shadow-indigo-600/25 cursor-pointer"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Goal for Approval'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Comment / Progress Note Modal */}
      {commentModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5E4BE2]">
                  <IconMessageCircle className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Add Milestone Progress Note</h3>
                  <p className="text-xs text-slate-500">
                    Record an update or milestone achievement towards this objective.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCommentModal({ open: false, note: '' })}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <IconX className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddComment} className="p-6 space-y-4">
              <div>
                <textarea
                  required
                  rows={3}
                  value={commentModal.note}
                  onChange={(e) => setCommentModal({ ...commentModal, note: e.target.value })}
                  placeholder="e.g. Completed initial database index optimization; latency reduced by 22%."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-hidden focus:border-[#5E4BE2] resize-none"
                />
              </div>
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCommentModal({ open: false, note: '' })}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#5E4BE2] to-[#4B39C3] hover:from-[#5340D4] hover:to-[#4130B4] transition-all shadow-sm shadow-indigo-600/25 cursor-pointer"
                >
                  Save Progress Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformanceGoalsPage;
