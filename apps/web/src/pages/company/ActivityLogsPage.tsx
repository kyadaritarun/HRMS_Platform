import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import api, { getFileUrl } from '../../api/client';
import TablePagination from '../../components/common/TablePagination';
import {
  IconClock,
  IconSearch,
  IconFilter,
  IconRefresh,
  IconX,
  IconCheck,
  IconMail,
  IconSend,
  IconCopy,
  IconAlertCircle,
  IconKey,
  IconUsers,
  IconMailForward,
} from '@tabler/icons-react';

interface AccountCreationLogItem {
  id: number;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  personalEmail?: string;
  employeeNumber: string;
  role: string;
  jobTitle: string;
  profilePhoto?: string | null;
  createdAt: string;
  emailStatus: 'SENT' | 'PENDING' | 'FAILED';
  lastEmailSentAt?: string | null;
  errorMessage?: string;
}

export const ActivityLogsPage: React.FC = () => {
  // Account creation logs state
  const [accountLogs, setAccountLogs] = useState<AccountCreationLogItem[]>([]);
  const [total, setTotal] = useState(0);

  // Pagination & Filtering
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [search, setSearch] = useState('');
  const [emailStatusFilter, setEmailStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Action states for Resend Email
  const [resendingId, setResendingId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [brokenPhotos, setBrokenPhotos] = useState<Record<number, boolean>>({});

  const getEmployeePhotoUrl = (photo?: string | null): string | null => {
    if (!photo) return null;
    if (photo.includes('.amazonaws.com/image/')) {
      const filename = photo.split('.amazonaws.com/image/')[1];
      return getFileUrl(`/image/${filename}`);
    }
    if (photo.includes('.amazonaws.com/uploads/')) {
      const filename = photo.split('.amazonaws.com/uploads/')[1];
      return getFileUrl(`/uploads/${filename}`);
    }
    if (photo.startsWith('/image/') || photo.startsWith('/uploads/')) {
      return getFileUrl(photo);
    }
    if (photo.startsWith('http://') || photo.startsWith('https://')) {
      return photo;
    }
    return getFileUrl(photo);
  };

  // Modal displaying resent credentials
  const [resentModal, setResentModal] = useState<{
    isOpen: boolean;
    email: string;
    name: string;
    tempPassword?: string;
    sentAt: string;
  } | null>(null);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  // Fetch account creation logs (Created employee accounts & their emails)
  const fetchAccountLogs = async () => {
    setIsLoading(true);
    try {
      const params: any = { page, pageSize };
      if (search.trim()) params.search = search.trim();
      if (emailStatusFilter) params.emailStatus = emailStatusFilter;

      const res = await api.get('/company/account-creation-logs', { params });
      setAccountLogs(res.data?.items || []);
      setTotal(res.data?.total || 0);
    } catch (err) {
      console.error('Failed to load employee account logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAccountLogs();
  }, [page, pageSize, emailStatusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchAccountLogs();
  };

  const handleClearFilters = () => {
    setSearch('');
    setEmailStatusFilter('');
    setPage(1);
  };

  // Handle Resend Credentials Email
  const handleResendEmail = async (account: AccountCreationLogItem) => {
    setResendingId(account.id);
    try {
      const res = await api.post('/company/resend-credentials', { userId: account.id });
      const tempPass = res.data?.tempPassword;
      const sentTime = res.data?.sentAt || new Date().toISOString();

      setToast({
        message: `Onboarding credentials email has been resent to ${account.email}!`,
        type: 'success',
      });

      // Update row in state
      setAccountLogs((prev) =>
        prev.map((item) =>
          item.id === account.id
            ? { ...item, emailStatus: 'SENT', lastEmailSentAt: sentTime }
            : item
        )
      );

      // Open credentials confirmation modal
      setResentModal({
        isOpen: true,
        email: account.email,
        name: account.name,
        tempPassword: tempPass,
        sentAt: sentTime,
      });
    } catch (err: any) {
      console.error('Failed to resend credentials:', err);
      const msg = err.response?.data?.message || err.response?.data?.error || 'Failed to resend credentials email.';
      setToast({ message: msg, type: 'error' });
    } finally {
      setResendingId(null);
    }
  };

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  const formatRelativeTime = (isoString?: string | null) => {
    if (!isoString) return 'Just now';
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

      if (diffSec < 60) return 'Just now';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHr = Math.floor(diffMin / 60);
      if (diffHr < 24) return `${diffHr}h ago`;
      const diffDays = Math.floor(diffHr / 24);
      if (diffDays < 30) return `${diffDays}d ago`;
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return isoString;
    }
  };

  // KPI stats for accounts
  const accountStats = useMemo(() => {
    const sentCount = accountLogs.filter((a) => a.emailStatus === 'SENT').length;
    const pendingCount = accountLogs.filter((a) => a.emailStatus !== 'SENT').length;
    return {
      total: total || accountLogs.length,
      sentCount: sentCount || total,
      pendingCount,
    };
  }, [accountLogs, total]);

  return (
    <div className="space-y-6 relative pb-12">
      {/* ===================== FLOATING TOAST NOTIFICATION ===================== */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 max-w-sm w-[calc(100%-3rem)] animate-in slide-in-from-top-4 fade-in duration-200">
          <div
            className={`p-4 rounded-2xl border shadow-xl flex items-start gap-3 backdrop-blur-md ${
              toast.type === 'success'
                ? 'bg-emerald-50/95 border-emerald-200 text-emerald-950 shadow-emerald-900/10'
                : 'bg-rose-50/95 border-rose-200 text-rose-950 shadow-rose-900/10'
            }`}
          >
            <div
              className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
              }`}
            >
              {toast.type === 'success' ? <IconCheck className="w-4 h-4" /> : <IconAlertCircle className="w-4 h-4" />}
            </div>
            <div className="flex-1 text-xs">
              <strong className="block font-bold">
                {toast.type === 'success' ? 'Email Dispatched' : 'Action Failed'}
              </strong>
              <p className="mt-0.5 text-slate-700">{toast.message}</p>
            </div>
            <button
              onClick={() => setToast(null)}
              className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
            >
              <IconX className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ===================== TOP HEADER BAR ===================== */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <IconMail className="w-5 h-5 text-[#5E4BE2] shrink-0" />
            <span>Employee Account Emails</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            When employee accounts are created, their login ID and password are sent to their email. If not received, click "Resend Email" below to dispatch their login credentials.
          </p>
        </div>

        {/* Right CTA Button */}
        <button
          onClick={() => {
            setPage(1);
            fetchAccountLogs();
          }}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#5E4BE2] to-[#4B39C3] hover:from-[#5340D4] hover:to-[#4130B4] text-white text-xs font-bold rounded-xl shadow-sm shadow-indigo-600/25 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer self-stretch sm:self-auto justify-center"
        >
          <IconRefresh className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Feed</span>
        </button>
      </div>

      {/* ===================== KPI STATS CARDS ===================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#5E4BE2] flex items-center justify-center shrink-0">
            <IconUsers className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">
              Accounts Created
            </span>
            <div className="text-lg font-black text-slate-900 font-mono">
              {accountStats.total} <span className="text-xs font-normal text-slate-400">Employees</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <IconSend className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">
              Credentials Dispatched
            </span>
            <div className="text-lg font-black text-slate-900 font-mono">
              {accountStats.sentCount} <span className="text-xs font-normal text-emerald-600 font-bold">Sent</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <IconKey className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">
              Login ID & Password
            </span>
            <div className="text-xs font-bold text-slate-700 mt-1">
              Automated Welcome Email
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
            <IconMailForward className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">
              Resend Action
            </span>
            <div className="text-xs font-bold text-teal-700 mt-1">
              1-Click Fresh Passwords
            </div>
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
            placeholder="Search by employee email (e.g. ganesh@kyadari.com), name, or ID..."
            className="w-full pl-10 pr-10 py-2.5 text-xs font-medium bg-slate-50/70 border border-slate-200/80 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#5E4BE2]/20 focus:border-[#5E4BE2] transition-all placeholder:text-slate-400 text-slate-800"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setPage(1);
                fetchAccountLogs();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
            >
              <IconX className="w-3.5 h-3.5" />
            </button>
          )}
        </form>

        {/* Filters & Count */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 min-w-[200px]">
            <IconFilter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={emailStatusFilter}
              onChange={(e) => {
                setEmailStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2.5 text-xs font-semibold bg-slate-50/70 border border-slate-200/80 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#5E4BE2]/20 focus:border-[#5E4BE2] transition-all text-slate-700 cursor-pointer"
            >
              <option value="">All Email Statuses</option>
              <option value="SENT">Credentials Sent</option>
              <option value="PENDING">Pending / Not Sent</option>
              <option value="FAILED">Delivery Failed</option>
            </select>
          </div>

          {/* Event Count Pill */}
          <span className="hidden sm:inline-flex px-3 py-2 rounded-xl bg-indigo-50/70 text-[#5E4BE2] text-xs font-bold border border-indigo-100/60 shrink-0">
            {total} {total === 1 ? 'account' : 'accounts'}
          </span>
        </div>
      </div>

      {/* ===================== ROW 3: CREATED EMPLOYEE ACCOUNT EMAILS FEED ===================== */}
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
        ) : accountLogs.length === 0 ? (
          <div className="p-16 text-center text-slate-400">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-[#5E4BE2] flex items-center justify-center mx-auto mb-3 shadow-2xs">
              <IconMail className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No Employee Accounts Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              {search || emailStatusFilter
                ? 'Try adjusting your search query or clearing the status filter.'
                : 'Employee accounts created by HR or Administrators will appear here with credential email dispatch status.'}
            </p>
            {(search || emailStatusFilter) && (
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
            {accountLogs.map((account) => {
              const initials = `${account.firstName?.[0] || ''}${account.lastName?.[0] || ''}`.toUpperCase() || 'EM';
              const isResending = resendingId === account.id;

              return (
                <div
                  key={account.id}
                  className="p-4 sm:p-5 hover:bg-indigo-50/20 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                >
                  {/* Left: Avatar / Photo + Details */}
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    {/* User Photo or Initials Avatar */}
                    {getEmployeePhotoUrl(account.profilePhoto) && !brokenPhotos[account.id] ? (
                      <img
                        src={getEmployeePhotoUrl(account.profilePhoto)!}
                        alt={account.name}
                        onError={() => setBrokenPhotos((prev) => ({ ...prev, [account.id]: true }))}
                        className="w-11 h-11 rounded-2xl object-cover border border-slate-200/80 shadow-xs shrink-0 mt-0.5 bg-slate-100"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#5E4BE2] to-[#7A67EE] text-white flex items-center justify-center font-black text-xs shadow-xs shrink-0 mt-0.5">
                        {initials}
                      </div>
                    )}

                    <div className="space-y-1 min-w-0 flex-1">
                      {/* Name + Badges */}
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#5E4BE2] transition-colors">
                          {account.name}
                        </h3>
                        <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/60 font-mono">
                          {account.employeeNumber}
                        </span>
                        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200/60">
                          {account.role}
                        </span>
                        {account.jobTitle && (
                          <span className="text-[11px] text-slate-400 hidden sm:inline">
                            • {account.jobTitle}
                          </span>
                        )}
                      </div>

                      {/* WORK EMAIL - Prominently Displayed */}
                      <div className="flex items-center gap-2 pt-0.5">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50/80 border border-indigo-100/80 text-xs font-mono font-bold text-slate-900">
                          <IconMail className="w-3.5 h-3.5 text-[#5E4BE2]" />
                          <span>{account.email}</span>
                          <button
                            onClick={() => handleCopyEmail(account.email)}
                            className="text-slate-400 hover:text-[#5E4BE2] p-0.5 ml-1 cursor-pointer transition-colors"
                            title="Copy email address"
                          >
                            {copiedEmail === account.email ? (
                              <IconCheck className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <IconCopy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                        {account.personalEmail && (
                          <span className="text-[11px] text-slate-400 truncate hidden lg:inline">
                            Personal: {account.personalEmail}
                          </span>
                        )}
                      </div>

                      {/* Creation Time */}
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-0.5">
                        <IconClock className="w-3 h-3 text-slate-400" />
                        <span>
                          Account Created: {new Date(account.createdAt).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}{' '}
                          at{' '}
                          {new Date(account.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}{' '}
                          ({formatRelativeTime(account.createdAt)})
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Email Delivery Status & RESEND EMAIL Button */}
                  <div className="flex sm:flex-row md:flex-col lg:flex-row items-start sm:items-center md:items-end lg:items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                    {/* Delivery Status */}
                    <div className="text-left md:text-right">
                      {account.emailStatus === 'SENT' ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[11px] font-bold">
                          <IconCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Credentials Sent</span>
                        </div>
                      ) : account.emailStatus === 'FAILED' ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200/80 text-[11px] font-bold">
                          <IconAlertCircle className="w-3.5 h-3.5 text-rose-600" />
                          <span>Delivery Failed</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200/80 text-[11px] font-bold">
                          <IconClock className="w-3.5 h-3.5 text-amber-600" />
                          <span>Pending Dispatch</span>
                        </div>
                      )}
                      {account.lastEmailSentAt && (
                        <span className="block text-[10px] text-slate-400 mt-0.5">
                          Sent {formatRelativeTime(account.lastEmailSentAt)}
                        </span>
                      )}
                    </div>

                    {/* RESEND EMAIL ACTION BUTTON */}
                    <button
                      onClick={() => handleResendEmail(account)}
                      disabled={isResending}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#5E4BE2] hover:bg-[#4D3CC9] text-white shadow-xs hover:shadow-md transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer shrink-0"
                    >
                      <IconMailForward className={`w-4 h-4 ${isResending ? 'animate-spin' : ''}`} />
                      <span>{isResending ? 'Resending...' : 'Resend Email'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ===================== PAGINATION FOOTER ===================== */}
        <TablePagination
          currentPage={page}
          totalItems={total}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
          pageSizeOptions={[10, 15, 25, 50, 100]}
          itemName="accounts"
        />
      </div>

      {/* ========================================================================= */}
      {/* MODAL: RESENT CREDENTIALS CONFIRMATION                                    */}
      {/* ========================================================================= */}
      {resentModal && resentModal.isOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl p-6 border border-slate-200 animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <IconCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Credentials Resent Successfully</h3>
                  <p className="text-[11px] text-slate-500">Official onboarding email dispatched</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setResentModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <IconX className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="py-4 space-y-4 text-xs">
              <p className="text-slate-600">
                A welcome onboarding email with login ID and temporary password has been dispatched to{' '}
                <strong className="text-slate-900">{resentModal.name}</strong>.
              </p>

              {/* Account Credentials Box */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Work Email / Login ID
                  </span>
                  <div className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-slate-200">
                    <span className="font-mono font-bold text-slate-900 text-sm select-all">
                      {resentModal.email}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyEmail(resentModal.email)}
                      className="text-xs font-semibold text-[#5E4BE2] hover:underline cursor-pointer flex items-center gap-1"
                    >
                      {copiedEmail === resentModal.email ? <IconCheck className="w-3.5 h-3.5" /> : <IconCopy className="w-3.5 h-3.5" />}
                      <span>{copiedEmail === resentModal.email ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                {resentModal.tempPassword && (
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      New Generated Temporary Password
                    </span>
                    <div className="flex items-center justify-between bg-purple-50/60 px-3 py-2 rounded-lg border border-purple-200">
                      <code className="font-mono font-bold text-[#5E4BE2] text-sm select-all">
                        {resentModal.tempPassword}
                      </code>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(resentModal.tempPassword || '');
                          setCopiedPassword(true);
                          setTimeout(() => setCopiedPassword(false), 2000);
                        }}
                        className="text-xs font-semibold text-[#5E4BE2] hover:underline cursor-pointer flex items-center gap-1"
                      >
                        {copiedPassword ? <IconCheck className="w-3.5 h-3.5 text-emerald-600" /> : <IconCopy className="w-3.5 h-3.5" />}
                        <span>{copiedPassword ? 'Copied' : 'Copy Password'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Security info notice */}
              <div className="rounded-xl p-3 bg-amber-50 border border-amber-200/80 flex items-start gap-2.5 text-amber-900">
                <IconAlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  The employee will be required to set their own permanent password upon their first sign-in. This temporary password will expire in 72 hours.
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setResentModal(null)}
                className="px-4 py-2 text-xs font-bold bg-[#5E4BE2] hover:bg-[#4D3CC9] text-white rounded-xl cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ActivityLogsPage;
