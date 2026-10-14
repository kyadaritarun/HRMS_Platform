import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import {
  IconMail,
  IconSearch,
  IconCheck,
  IconAlertCircle,
  IconEye,
  IconX,
  IconClock,
  IconRefresh,
  IconSend,
  IconBuilding,
  IconCopy,
  IconServer,
  IconChevronLeft,
  IconChevronRight,
  IconCode,
  IconBrowser,
  IconFilter,
  IconHome,
  IconAlertTriangle,
} from '@tabler/icons-react';

export interface EmailLogItem {
  id: number;
  companyId?: number | null;
  company?: {
    id: number;
    name: string;
    subdomain: string;
  } | null;
  invoiceId?: number | null;
  subject: string;
  toEmail: string;
  cc?: string;
  bcc?: string;
  bodyHtml: string;
  category: string;
  templateKey?: string;
  status: 'SENT' | 'FAILED' | 'QUEUED' | string;
  errorMessage?: string;
  sentAt?: string | null;
  createdAt: string;
}

export const EmailsPage: React.FC = () => {
  const [emails, setEmails] = useState<EmailLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [selectedEmail, setSelectedEmail] = useState<EmailLogItem | null>(null);
  const [previewTab, setPreviewTab] = useState<'rendered' | 'raw'>('rendered');
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Send Test Email Modal State
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [testTo, setTestTo] = useState('alerts@uptrix.io');
  const [testSubject, setTestSubject] = useState('Office 365 SMTP Relay Verification — Uptrix HRMS');
  const [testCategory, setTestCategory] = useState('TEST');
  const [testHtml, setTestHtml] = useState(
    `<p>Hello Administrator,</p><p>This is a real-time test notification sent via <strong>Microsoft Office 365 Exchange SMTP relay</strong> (alerts@uptrix.io).</p><p>If you received this message, the email notification engine is operating at full capacity.</p>`
  );
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testFeedback, setTestFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Resend State
  const [resendingId, setResendingId] = useState<number | null>(null);
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const fetchEmails = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/superadmin/emails');
      setEmails(res.data?.emails || []);
    } catch (err: any) {
      console.error('Failed to load email logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmails();
  }, []);

  // Filter logs
  const filtered = useMemo(() => {
    return emails.filter((e) => {
      const recipient = (e.toEmail || (e as any).recipient || '').toLowerCase();
      const subject = (e.subject || '').toLowerCase();
      const body = (e.bodyHtml || (e as any).body || '').toLowerCase();
      const companyName = (e.company?.name || '').toLowerCase();
      const q = search.trim().toLowerCase();

      const matchesSearch =
        !q ||
        recipient.includes(q) ||
        subject.includes(q) ||
        body.includes(q) ||
        companyName.includes(q);

      const status = (e.status || 'SENT').toUpperCase();
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'SENT' && (status === 'SENT' || status === 'DELIVERED')) ||
        (statusFilter === 'FAILED' && status === 'FAILED') ||
        (statusFilter === 'QUEUED' && status === 'QUEUED');

      const category = (e.category || (e as any).templateType || 'SYSTEM').toUpperCase();
      const matchesCategory =
        categoryFilter === 'ALL' || category === categoryFilter.toUpperCase();

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [emails, search, statusFilter, categoryFilter]);

  // Pagination
  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  // Handle Copy Email Address
  const copyToClipboard = (text: string, id: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Quick Resend Action
  const handleResend = async (log: EmailLogItem) => {
    setResendingId(log.id);
    setActionNotice(null);
    try {
      await api.post(`/superadmin/emails/${log.id}/resend`);
      setActionNotice({
        type: 'success',
        text: `Email successfully queued and resent to ${log.toEmail || (log as any).recipient}`,
      });
      fetchEmails();
    } catch (err: any) {
      setActionNotice({
        type: 'error',
        text: err?.response?.data?.error || err.message || 'Failed to resend email',
      });
    } finally {
      setResendingId(null);
      setTimeout(() => setActionNotice(null), 6000);
    }
  };

  // Send Test Email
  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testTo) return;
    setIsSendingTest(true);
    setTestFeedback(null);
    try {
      const res = await api.post('/superadmin/emails/test', {
        to: testTo,
        subject: testSubject,
        html: testHtml,
        category: testCategory,
      });
      setTestFeedback({
        type: 'success',
        text: res.data?.message || `Test email dispatched to ${testTo} via Office 365!`,
      });
      setTimeout(() => {
        setIsTestModalOpen(false);
        setTestFeedback(null);
        fetchEmails();
      }, 1800);
    } catch (err: any) {
      setTestFeedback({
        type: 'error',
        text: err?.response?.data?.error || err.message || 'Failed to dispatch test email',
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  // Metrics
  const totalEmails = emails.length;
  const sentCount = emails.filter((e) => (e.status || '').toUpperCase() === 'SENT').length;
  const failedCount = emails.filter((e) => (e.status || '').toUpperCase() === 'FAILED').length;
  const deliveryRate = totalEmails > 0 ? Math.round((sentCount / totalEmails) * 100) : 100;

  // Format Category Badge
  const getCategoryBadge = (category?: string) => {
    const cat = (category || 'SYSTEM').toUpperCase();
    if (cat.includes('ONBOARD') || cat.includes('CREDENTIAL')) {
      return 'bg-purple-50 text-purple-700 border-purple-200';
    }
    if (cat.includes('BILL') || cat.includes('INVOICE') || cat.includes('PAY')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (cat.includes('PASSWORD') || cat.includes('RESET') || cat.includes('AUTH')) {
      return 'bg-amber-50 text-amber-700 border-amber-200';
    }
    if (cat.includes('TEST')) {
      return 'bg-blue-50 text-blue-700 border-blue-200';
    }
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <div className="p-2 bg-brand-50 text-brand-600 rounded-xl border border-brand-100">
              <IconMail className="w-6 h-6 stroke-[2]" />
            </div>
            System Email Notification Logs
          </h1>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1 font-medium">
            <Link to="/super-admin/dashboard" className="hover:text-brand-600 flex items-center gap-1">
              <IconHome className="w-3.5 h-3.5 text-slate-400" />
            </Link>
            <span className="text-slate-500 font-medium">Super Admin</span>
            <span className="text-slate-300">&gt;</span>
            <span className="text-slate-600 font-medium">Email Notification Logs</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchEmails()}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200/90 rounded-xl hover:bg-slate-50 transition-colors shadow-2xs"
            title="Refresh email logs"
          >
            <IconRefresh className={`w-4 h-4 text-slate-500 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => {
              setIsTestModalOpen(true);
              setTestFeedback(null);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl transition-colors shadow-xs shadow-brand-500/20"
          >
            <IconSend className="w-4 h-4" />
            Send Test Email
          </button>
        </div>
      </div>

      {/* Action Notification Banner */}
      {actionNotice && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between text-xs font-medium ${
            actionNotice.type === 'success'
              ? 'bg-emerald-50/90 border-emerald-200 text-emerald-800'
              : 'bg-rose-50/90 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionNotice.type === 'success' ? (
              <IconCheck className="w-4 h-4 text-emerald-600" />
            ) : (
              <IconAlertCircle className="w-4 h-4 text-rose-600" />
            )}
            <span>{actionNotice.text}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="text-slate-400 hover:text-slate-600">
            <IconX className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 4 KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Emails */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500">Total Dispatched</p>
              <p className="text-2xl font-extrabold text-slate-900 mt-1">{totalEmails}</p>
              <p className="text-xs font-medium text-slate-500 mt-1">Audit log records</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
              <IconMail className="w-5 h-5 stroke-[2]" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Retention Period</span>
            <span className="font-semibold text-slate-700">Permanent</span>
          </div>
        </div>

        {/* Card 2: Delivered */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500">Successfully Sent</p>
              <p className="text-2xl font-extrabold text-emerald-600 mt-1">{sentCount}</p>
              <p className="text-xs font-semibold text-emerald-600 mt-1 flex items-center gap-1">
                <IconCheck className="w-3.5 h-3.5" />
                <span>{deliveryRate}% success rate</span>
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
              <IconCheck className="w-5 h-5 stroke-[2]" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Delivery State</span>
            <span className="font-semibold text-emerald-600">Optimal</span>
          </div>
        </div>

        {/* Card 3: Failed / Errors */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500">Failed / Bounced</p>
              <p className="text-2xl font-extrabold text-rose-600 mt-1">{failedCount}</p>
              <p className="text-xs font-medium text-slate-500 mt-1">
                {failedCount === 0 ? 'Zero delivery failures' : 'Requires review'}
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center shrink-0">
              <IconAlertCircle className="w-5 h-5 stroke-[2]" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Fail Rate</span>
            <span className="font-semibold text-rose-600">
              {totalEmails > 0 ? ((failedCount / totalEmails) * 100).toFixed(1) : '0'}%
            </span>
          </div>
        </div>

        {/* Card 4: Office 365 Relay Gateway */}
        <div className="bg-gradient-to-br from-slate-900 to-indigo-950 p-5 rounded-2xl border border-slate-800 shadow-[0_2px_12px_rgba(0,0,0,0.05)] text-white relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <p className="text-xs font-semibold text-slate-300">Office 365 SMTP</p>
              </div>
              <p className="text-base font-bold text-white mt-1">smtp.office365.com</p>
              <p className="text-[11px] font-mono text-indigo-200 mt-0.5 truncate max-w-[170px]" title="alerts@uptrix.io">
                alerts@uptrix.io
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-white/10 text-indigo-300 border border-white/10 flex items-center justify-center shrink-0">
              <IconServer className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-300">
            <span>Port / TLS</span>
            <span className="font-mono font-semibold text-emerald-400">587 (STARTTLS)</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:max-w-md">
          <IconSearch className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by recipient email, subject, company, or message..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-brand-500 text-slate-900 placeholder:text-slate-400 transition-colors"
          />
          {search && (
            <button
              onClick={() => {
                setSearch('');
                setCurrentPage(1);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <IconX className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider hidden sm:inline">
              Status:
            </span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-brand-500 text-slate-700"
            >
              <option value="ALL">All Statuses</option>
              <option value="SENT">Delivered (Sent)</option>
              <option value="FAILED">Failed</option>
              <option value="QUEUED">Queued</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider hidden sm:inline">
              Category:
            </span>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-brand-500 text-slate-700"
            >
              <option value="ALL">All Categories</option>
              <option value="ONBOARDING">Onboarding / Credentials</option>
              <option value="BILLING">Billing & Invoices</option>
              <option value="PASSWORD_RESET">Password Resets</option>
              <option value="SYSTEM">System Alerts</option>
              <option value="TEST">SMTP Tests</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Recipient To</th>
                <th className="px-6 py-4">Subject Line</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Dispatched At</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4">
                      <div className="w-36 h-4 bg-slate-200 rounded-md mb-1.5" />
                      <div className="w-20 h-3 bg-slate-100 rounded-md" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-56 h-4 bg-slate-200 rounded-md mb-1" />
                      <div className="w-32 h-3 bg-slate-100 rounded-md" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-24 h-5 bg-slate-200 rounded-full" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-20 h-5 bg-slate-200 rounded-full" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-28 h-4 bg-slate-200 rounded-md" />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="w-16 h-7 bg-slate-200 rounded-lg ml-auto" />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-slate-400">
                    <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3 text-slate-400">
                      <IconMail className="w-6 h-6" />
                    </div>
                    <p className="text-base font-semibold text-slate-700">No email notification logs found</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      {search || statusFilter !== 'ALL' || categoryFilter !== 'ALL'
                        ? 'Try clearing your search filters to view recorded emails.'
                        : 'No email messages have been sent yet. Click "Send Test Email" to dispatch your first notification.'}
                    </p>
                    {(search || statusFilter !== 'ALL' || categoryFilter !== 'ALL') && (
                      <button
                        onClick={() => {
                          setSearch('');
                          setStatusFilter('ALL');
                          setCategoryFilter('ALL');
                          setCurrentPage(1);
                        }}
                        className="mt-4 px-3.5 py-1.5 text-xs font-semibold text-brand-600 bg-brand-50 rounded-xl hover:bg-brand-100 transition-colors"
                      >
                        Reset All Filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log) => {
                  const toEmail = log.toEmail || (log as any).recipient || 'Unknown Recipient';
                  const isSent = (log.status || '').toUpperCase() === 'SENT';
                  const isFailed = (log.status || '').toUpperCase() === 'FAILED';
                  const isQueued = (log.status || '').toUpperCase() === 'QUEUED';

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition-colors group">
                      {/* Recipient */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-900">{toEmail}</span>
                          <button
                            onClick={() => copyToClipboard(toEmail, log.id)}
                            className="text-slate-300 hover:text-slate-600 transition-colors opacity-0 group-hover:opacity-100 p-0.5"
                            title="Copy email address"
                          >
                            {copiedId === log.id ? (
                              <IconCheck className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <IconCopy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                        {log.company?.name ? (
                          <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5 font-medium">
                            <IconBuilding className="w-3 h-3 text-slate-400" />
                            <span>{log.company.name}</span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider block mt-0.5">
                            System Notification
                          </span>
                        )}
                      </td>

                      {/* Subject */}
                      <td className="px-6 py-4 max-w-sm">
                        <p
                          className="font-medium text-slate-900 text-xs truncate"
                          title={log.subject}
                        >
                          {log.subject || '(No Subject)'}
                        </p>
                        {/* Body snippet */}
                        <p className="text-[11px] text-slate-400 truncate mt-0.5 font-sans">
                          {(log.bodyHtml || (log as any).body || '')
                            .replace(/<[^>]*>/g, '')
                            .slice(0, 70)}
                        </p>
                      </td>

                      {/* Category */}
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${getCategoryBadge(
                            log.category || (log as any).templateType
                          )}`}
                        >
                          {log.category || (log as any).templateType || 'SYSTEM'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        {isSent ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <IconCheck className="w-3 h-3" />
                            Delivered
                          </span>
                        ) : isFailed ? (
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 cursor-help"
                            title={log.errorMessage || 'Failed to dispatch'}
                          >
                            <IconAlertCircle className="w-3 h-3" />
                            Failed
                          </span>
                        ) : isQueued ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <IconClock className="w-3 h-3" />
                            Queued
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            {log.status}
                          </span>
                        )}
                      </td>

                      {/* Dispatched At */}
                      <td className="px-6 py-4 text-xs text-slate-600">
                        <div className="font-medium text-slate-800">
                          {new Date(log.sentAt || log.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {new Date(log.sentAt || log.createdAt).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedEmail(log);
                              setPreviewTab('rendered');
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                            title="Preview Message Content"
                          >
                            <IconEye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleResend(log)}
                            disabled={resendingId === log.id}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-brand-50 transition-colors disabled:opacity-50"
                            title="Resend this email via Office 365"
                          >
                            <IconRefresh
                              className={`w-4 h-4 ${resendingId === log.id ? 'animate-spin text-brand-600' : ''}`}
                            />
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

        {/* Pagination & Count */}
        <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Showing <span className="font-semibold text-slate-800">{filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</span> to{' '}
            <span className="font-semibold text-slate-800">
              {Math.min(currentPage * pageSize, filtered.length)}
            </span>{' '}
            of <span className="font-semibold text-slate-800">{filtered.length}</span> log records
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <IconChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-7 h-7 rounded-lg text-xs font-semibold transition-colors ${
                    currentPage === i + 1
                      ? 'bg-brand-600 text-white shadow-2xs'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <IconChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Email Preview Modal */}
      {selectedEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-brand-50 text-brand-600 rounded-xl">
                  <IconMail className="w-5 h-5 stroke-[2]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">
                    {selectedEmail.subject || 'Email Preview'}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                    Category: {selectedEmail.category || (selectedEmail as any).templateType || 'SYSTEM'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedEmail(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
              >
                <IconX className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Metadata Bar */}
            <div className="p-6 overflow-y-auto space-y-4">
              {/* Delivery Status Banner if Failed */}
              {selectedEmail.status === 'FAILED' && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-800">
                  <IconAlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Delivery Error:</span>
                    <p className="mt-0.5 font-mono text-[11px]">
                      {selectedEmail.errorMessage || 'Unknown error occurred while contacting SMTP host.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Envelope Metadata Card */}
              <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/70 space-y-2 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                      From:
                    </span>
                    <span className="text-slate-900 font-semibold flex items-center gap-1.5">
                      Uptrix Platform &lt;alerts@uptrix.io&gt;
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-100 text-indigo-700 font-mono">
                        O365
                      </span>
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                      To:
                    </span>
                    <span className="font-mono text-slate-900 font-bold text-xs">
                      {selectedEmail.toEmail || (selectedEmail as any).recipient}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Dispatched At:
                    </span>
                    <span className="text-slate-700 font-medium">
                      {new Date(selectedEmail.sentAt || selectedEmail.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Status:
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 font-semibold ${
                        selectedEmail.status === 'SENT'
                          ? 'text-emerald-700'
                          : selectedEmail.status === 'FAILED'
                          ? 'text-rose-700'
                          : 'text-amber-700'
                      }`}
                    >
                      {selectedEmail.status === 'SENT' ? (
                        <>
                          <IconCheck className="w-3.5 h-3.5" /> Delivered Successfully
                        </>
                      ) : selectedEmail.status === 'FAILED' ? (
                        <>
                          <IconAlertCircle className="w-3.5 h-3.5" /> Delivery Failed
                        </>
                      ) : (
                        <>
                          <IconClock className="w-3.5 h-3.5" /> Queued
                        </>
                      )}
                    </span>
                  </div>
                </div>

                {selectedEmail.company && (
                  <div className="pt-1 border-t border-slate-200/60 text-slate-600">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Company Workspace:
                    </span>
                    <span>
                      {selectedEmail.company.name} ({selectedEmail.company.subdomain}.uptrix.io)
                    </span>
                  </div>
                )}
              </div>

              {/* View Switcher: Rendered vs Raw HTML */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-bold text-slate-700">Message Content</span>
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                  <button
                    onClick={() => setPreviewTab('rendered')}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg flex items-center gap-1.5 transition-colors ${
                      previewTab === 'rendered'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <IconBrowser className="w-3.5 h-3.5" />
                    Rendered HTML
                  </button>
                  <button
                    onClick={() => setPreviewTab('raw')}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg flex items-center gap-1.5 transition-colors ${
                      previewTab === 'raw'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <IconCode className="w-3.5 h-3.5" />
                    Raw Code
                  </button>
                </div>
              </div>

              {/* Message Content Container */}
              {previewTab === 'rendered' ? (
                <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-inner max-h-80 overflow-y-auto">
                  {selectedEmail.bodyHtml || (selectedEmail as any).body ? (
                    <div
                      className="prose prose-sm max-w-none text-slate-800 text-xs font-sans leading-relaxed"
                      dangerouslySetInnerHTML={{
                        __html: selectedEmail.bodyHtml || (selectedEmail as any).body,
                      }}
                    />
                  ) : (
                    <p className="text-slate-400 text-center italic py-6">
                      No HTML body recorded for this email.
                    </p>
                  )}
                </div>
              ) : (
                <div className="relative">
                  <pre className="p-4 bg-slate-900 text-emerald-300 rounded-2xl font-mono text-[11px] max-h-80 overflow-y-auto whitespace-pre-wrap">
                    {selectedEmail.bodyHtml || (selectedEmail as any).body || 'No content.'}
                  </pre>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        selectedEmail.bodyHtml || (selectedEmail as any).body || '',
                        selectedEmail.id
                      )
                    }
                    className="absolute top-3 right-3 px-2 py-1 text-[10px] font-medium bg-slate-800 text-slate-300 rounded-md hover:bg-slate-700 flex items-center gap-1"
                  >
                    <IconCopy className="w-3 h-3" />
                    Copy
                  </button>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <button
                onClick={() => handleResend(selectedEmail)}
                disabled={resendingId === selectedEmail.id}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 flex items-center gap-2 shadow-2xs"
              >
                <IconRefresh
                  className={`w-3.5 h-3.5 ${resendingId === selectedEmail.id ? 'animate-spin' : ''}`}
                />
                Resend Message
              </button>
              <button
                onClick={() => setSelectedEmail(null)}
                className="px-5 py-2 text-xs font-semibold rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-xs"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Test Email Modal */}
      {isTestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-brand-50 text-brand-600 rounded-xl">
                  <IconSend className="w-5 h-5 stroke-[2]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">
                    Send Live Test Notification
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                    Relayed via Microsoft Office 365 (alerts@uptrix.io)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsTestModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
              >
                <IconX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendTest} className="p-6 space-y-4">
              {testFeedback && (
                <div
                  className={`p-3.5 rounded-2xl border text-xs font-medium flex items-center gap-2 ${
                    testFeedback.type === 'success'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  {testFeedback.type === 'success' ? (
                    <IconCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <IconAlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{testFeedback.text}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Recipient Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. alerts@uptrix.io or your inbox"
                  value={testTo}
                  onChange={(e) => setTestTo(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-brand-500 text-slate-900"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  You can specify your own email address to check delivery in your inbox.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Subject Line <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={testSubject}
                  onChange={(e) => setTestSubject(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-brand-500 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Category Tag
                  </label>
                  <select
                    value={testCategory}
                    onChange={(e) => setTestCategory(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-brand-500 text-slate-900"
                  >
                    <option value="TEST">TEST</option>
                    <option value="SYSTEM">SYSTEM</option>
                    <option value="ONBOARDING">ONBOARDING</option>
                    <option value="BILLING">BILLING</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Gateway Relayer
                  </label>
                  <div className="px-3 py-2 text-xs bg-slate-100 text-slate-700 rounded-xl border border-slate-200 font-mono">
                    smtp.office365.com:587
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Message HTML / Body
                </label>
                <textarea
                  rows={4}
                  value={testHtml}
                  onChange={(e) => setTestHtml(e.target.value)}
                  className="w-full p-3 font-mono text-[11px] bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-brand-500 text-slate-900"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsTestModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSendingTest}
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-brand-600 text-white hover:bg-brand-700 transition-colors flex items-center gap-2 shadow-xs shadow-brand-500/20 disabled:opacity-50"
                >
                  {isSendingTest ? (
                    <>
                      <IconRefresh className="w-4 h-4 animate-spin" />
                      Dispatching via Office 365...
                    </>
                  ) : (
                    <>
                      <IconSend className="w-4 h-4" />
                      Send via Office 365
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailsPage;
