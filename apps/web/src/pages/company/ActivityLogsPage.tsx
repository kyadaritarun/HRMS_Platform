import React, { useState, useEffect, useMemo } from 'react';
import api from '../../api/client';
import {
  IconHistory,
  IconShield,
  IconClock,
  IconUser,
  IconSearch,
  IconFilter,
  IconChevronLeft,
  IconChevronRight,
  IconRefresh,
  IconX,
  IconLock,
  IconKey,
  IconSettings,
  IconUsers,
  IconFileText,
  IconCheck,
} from '@tabler/icons-react';

interface ActivityLogItem {
  id: number;
  companyId: number;
  actorId?: number | null;
  action: string;
  objectType: string;
  objectId: string;
  message: string;
  metadata?: any;
  createdAt: string;
  actor?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  } | null;
}

export const ActivityLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const params: any = { page, pageSize };
      if (search.trim()) params.search = search.trim();
      if (actionFilter) params.action = actionFilter;
      const res = await api.get('/company/activity-logs', { params });
      setLogs(res.data?.items || []);
      setTotal(res.data?.total || 0);
    } catch (err) {
      console.error('Failed to load activity logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, actionFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const handleClearFilters = () => {
    setSearch('');
    setActionFilter('');
    setPage(1);
  };

  // KPI calculations based on current activity data
  const kpiStats = useMemo(() => {
    const securityCount = logs.filter(
      (l) =>
        l.action.toUpperCase().includes('LOGIN') ||
        l.action.toUpperCase().includes('AUTH') ||
        l.action.toUpperCase().includes('PASSWORD')
    ).length;

    const adminOpsCount = logs.filter(
      (l) =>
        l.action.toUpperCase().includes('CREATE') ||
        l.action.toUpperCase().includes('UPDATE') ||
        l.action.toUpperCase().includes('DELETE') ||
        l.action.toUpperCase().includes('CALCULAT') ||
        l.action.toUpperCase().includes('PUBLISH')
    ).length;

    const actorIds = new Set(
      logs.map((l) => l.actor?.id || l.actorId).filter(Boolean)
    );
    const uniqueActorsCount = actorIds.size || (logs.length > 0 ? 1 : 0);

    return {
      securityCount,
      adminOpsCount,
      uniqueActorsCount,
    };
  }, [logs]);

  const getActionBadgeColor = (action: string) => {
    const act = action.toUpperCase();
    if (
      act.includes('CREATE') ||
      act.includes('ONBOARD') ||
      act.includes('VERIFY') ||
      act.includes('APPROV')
    ) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200/80';
    }
    if (
      act.includes('DELETE') ||
      act.includes('REJECT') ||
      act.includes('TERMINAT')
    ) {
      return 'bg-rose-50 text-rose-700 border-rose-200/80';
    }
    if (
      act.includes('UPDATE') ||
      act.includes('EDIT') ||
      act.includes('PUBLISH') ||
      act.includes('CALCULAT')
    ) {
      return 'bg-blue-50 text-blue-700 border-blue-200/80';
    }
    if (
      act.includes('PASSWORD') ||
      act.includes('AUTH') ||
      act.includes('LOGIN')
    ) {
      return 'bg-amber-50 text-amber-700 border-amber-200/80';
    }
    return 'bg-slate-50 text-slate-700 border-slate-200/80';
  };

  const getActionAvatarGradient = (action: string) => {
    const act = action.toUpperCase();
    if (
      act.includes('CREATE') ||
      act.includes('ONBOARD') ||
      act.includes('VERIFY') ||
      act.includes('APPROV')
    ) {
      return 'from-emerald-500 to-teal-600';
    }
    if (
      act.includes('DELETE') ||
      act.includes('REJECT') ||
      act.includes('TERMINAT')
    ) {
      return 'from-rose-500 to-red-600';
    }
    if (
      act.includes('UPDATE') ||
      act.includes('EDIT') ||
      act.includes('PUBLISH') ||
      act.includes('CALCULAT')
    ) {
      return 'from-blue-500 to-indigo-600';
    }
    if (
      act.includes('PASSWORD') ||
      act.includes('AUTH') ||
      act.includes('LOGIN')
    ) {
      return 'from-amber-500 to-orange-600';
    }
    return 'from-[#5E4BE2] to-indigo-600';
  };

  const formatRelativeTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffSecs < 60) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <div className="space-y-6">
      {/* ===================== TOP HEADER BAR ===================== */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5E4BE2] shrink-0">
              <IconShield className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Tenant Audit Activity Logs
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Immutable organizational audit trail capturing administrative operations, policy changes, and security events.
          </p>
        </div>

        {/* Right CTA Button */}
        <button
          onClick={() => {
            setPage(1);
            fetchLogs();
          }}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#5E4BE2] to-[#4B39C3] hover:from-[#5340D4] hover:to-[#4130B4] text-white text-xs font-bold rounded-xl shadow-sm shadow-indigo-600/25 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer self-stretch sm:self-auto justify-center"
        >
          <IconRefresh className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Feed</span>
        </button>
      </div>

      {/* ===================== ROW 1: 4 KPI STAT CARDS ===================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Audit Events */}
        <div className="bg-white rounded-2xl border border-slate-200/70 p-4 shadow-xs flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <span className="text-xs font-bold text-slate-500">Total Audit Events</span>
            <div className="text-2xl font-black text-slate-900 mt-1 leading-none tracking-tight">
              {total.toLocaleString()}
            </div>
            <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 mt-2">
              <span>●</span>
              <span>Logged immutable actions</span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5E4BE2]">
            <IconHistory className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Security & Auth Events */}
        <div className="bg-white rounded-2xl border border-slate-200/70 p-4 shadow-xs flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <span className="text-xs font-bold text-slate-500">Security & Auth</span>
            <div className="text-2xl font-black text-slate-900 mt-1 leading-none tracking-tight">
              {kpiStats.securityCount.toLocaleString()}
            </div>
            <div className="text-[11px] font-bold text-amber-600 mt-2 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span>Logins & credential events</span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
            <IconKey className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Administrative Operations */}
        <div className="bg-white rounded-2xl border border-slate-200/70 p-4 shadow-xs flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <span className="text-xs font-bold text-slate-500">Admin Operations</span>
            <div className="text-2xl font-black text-slate-900 mt-1 leading-none tracking-tight">
              {kpiStats.adminOpsCount.toLocaleString()}
            </div>
            <div className="text-[11px] font-bold text-blue-600 mt-2">
              System changes & updates
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <IconSettings className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Active Initiators */}
        <div className="bg-white rounded-2xl border border-slate-200/70 p-4 shadow-xs flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <span className="text-xs font-bold text-slate-500">Active Initiators</span>
            <div className="text-2xl font-black text-slate-900 mt-1 leading-none tracking-tight">
              {kpiStats.uniqueActorsCount.toLocaleString()}
            </div>
            <div className="text-[11px] font-bold text-purple-600 mt-2">
              Unique users in current view
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
            <IconUsers className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ===================== ROW 2: SEARCH & FILTER BAR ===================== */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/70 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <IconSearch className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by message, actor name, or keyword..."
            className="w-full pl-10 pr-10 py-2.5 text-xs font-medium bg-slate-50/70 border border-slate-200/80 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#5E4BE2]/20 focus:border-[#5E4BE2] transition-all placeholder:text-slate-400 text-slate-800"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setPage(1);
                fetchLogs();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
            >
              <IconX className="w-3.5 h-3.5" />
            </button>
          )}
        </form>

        {/* Action Type Filter & Count Badge */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 min-w-[200px]">
            <IconFilter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2.5 text-xs font-semibold bg-slate-50/70 border border-slate-200/80 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#5E4BE2]/20 focus:border-[#5E4BE2] transition-all text-slate-700 cursor-pointer"
            >
              <option value="">All Action Types</option>
              <option value="LOGIN">LOGIN</option>
              <option value="CREATE_EMPLOYEE">CREATE_EMPLOYEE</option>
              <option value="UPDATE_EMPLOYEE">UPDATE_EMPLOYEE</option>
              <option value="CALCULATE_PAYROLL">CALCULATE_PAYROLL</option>
              <option value="PUBLISH_PAYSLIPS">PUBLISH_PAYSLIPS</option>
              <option value="VERIFY_DOCUMENT">VERIFY_DOCUMENT</option>
              <option value="REJECT_DOCUMENT">REJECT_DOCUMENT</option>
              <option value="UPLOAD_DOCUMENT">UPLOAD_DOCUMENT</option>
              <option value="CREATE_POLICY">CREATE_POLICY</option>
              <option value="CREATE_HOLIDAY">CREATE_HOLIDAY</option>
              <option value="CREATE_LEAVE_TYPE">CREATE_LEAVE_TYPE</option>
              <option value="PASSWORD_RESET">PASSWORD_RESET</option>
            </select>
          </div>

          {/* Event Count Pill */}
          <span className="hidden sm:inline-flex px-3 py-2 rounded-xl bg-indigo-50/70 text-[#5E4BE2] text-xs font-bold border border-indigo-100/60 shrink-0">
            {total} {total === 1 ? 'event' : 'events'}
          </span>
        </div>
      </div>

      {/* ===================== ROW 3: LOGS FEED ===================== */}
      <div className="bg-white rounded-2xl border border-slate-200/70 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-4 rounded-xl bg-slate-50/70 border border-slate-100 animate-pulse"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-200" />
                  <div className="space-y-2">
                    <div className="w-28 h-3.5 bg-slate-200 rounded-sm" />
                    <div className="w-64 h-3 bg-slate-100 rounded-sm" />
                  </div>
                </div>
                <div className="w-24 h-3 bg-slate-200 rounded-sm" />
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="p-16 text-center text-slate-400">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-[#5E4BE2] flex items-center justify-center mx-auto mb-3 shadow-2xs">
              <IconHistory className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No Activity Logs Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              {search || actionFilter
                ? 'Try adjusting your search query or clearing the action filter.'
                : 'Immutable administrative operations and user authentication records will appear here as team events occur.'}
            </p>
            {(search || actionFilter) && (
              <button
                onClick={handleClearFilters}
                className="mt-3 text-xs font-bold text-[#5E4BE2] hover:underline cursor-pointer"
              >
                Reset search & filters
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100/80">
            {logs.map((item) => {
              const actorName = item.actor
                ? `${item.actor.firstName} ${item.actor.lastName}`
                : `User #${item.actorId || '?'}`;
              const initials = item.actor
                ? `${item.actor.firstName?.[0] || ''}${item.actor.lastName?.[0] || ''}`.toUpperCase()
                : 'U';

              return (
                <div
                  key={item.id}
                  className="p-4 sm:p-5 hover:bg-indigo-50/20 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                >
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    {/* User Initials Avatar with Action-Specific Gradient */}
                    <div
                      className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${getActionAvatarGradient(
                        item.action
                      )} text-white flex items-center justify-center font-bold text-xs shadow-2xs shrink-0 mt-0.5`}
                    >
                      {initials}
                    </div>

                    <div className="space-y-1.5 min-w-0 flex-1">
                      {/* Action & Object Badges */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono border ${getActionBadgeColor(
                            item.action
                          )} shadow-2xs`}
                        >
                          {item.action}
                        </span>
                        {item.objectType && (
                          <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200/60">
                            {item.objectType} {item.objectId ? `#${item.objectId}` : ''}
                          </span>
                        )}
                      </div>

                      {/* Log Message */}
                      <p className="text-sm font-bold text-slate-900 leading-snug group-hover:text-[#5E4BE2] transition-colors">
                        {item.message}
                      </p>

                      {/* Actor Information */}
                      {item.actor ? (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <IconUser className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>
                            Triggered by{' '}
                            <strong className="text-slate-800 font-bold">
                              {actorName}
                            </strong>{' '}
                            <span className="text-slate-400">({item.actor.email})</span>
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                          <IconUser className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>Triggered by System / Actor #{item.actorId || 'N/A'}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Relative & Exact Timestamp */}
                  <div className="text-right sm:shrink-0 flex sm:flex-col items-center sm:items-end justify-between text-xs text-slate-400 gap-1 border-t sm:border-t-0 pt-2.5 sm:pt-0 border-slate-100">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50/90 border border-slate-200/60 text-slate-700 font-bold text-xs">
                      <IconClock className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span>{formatRelativeTime(item.createdAt)}</span>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-400">
                      {new Date(item.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      •{' '}
                      {new Date(item.createdAt).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ===================== PAGINATION FOOTER ===================== */}
        {total > pageSize && (
          <div className="p-4 bg-slate-50/70 border-t border-slate-100/90 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs font-semibold text-slate-500">
              Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of{' '}
              <strong className="text-slate-800">{total}</strong> events
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-600 transition-colors cursor-pointer shadow-2xs"
                title="Previous Page"
              >
                <IconChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-bold text-slate-700 px-2.5">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-600 transition-colors cursor-pointer shadow-2xs"
                title="Next Page"
              >
                <IconChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityLogsPage;
