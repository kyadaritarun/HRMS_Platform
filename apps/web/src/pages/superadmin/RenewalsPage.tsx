import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import {
  IconHome,
  IconCalendar,
  IconChevronLeft,
  IconChevronRight,
  IconRefresh,
  IconFileInvoice,
  IconWallet,
  IconAlertTriangle,
  IconFilter,
  IconFileText,
  IconChevronDown,
  IconDots,
} from '@tabler/icons-react';

interface CompanyAdmin {
  id?: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}

interface RenewalCompany {
  id: number;
  name: string;
  subdomain: string;
  planType: string;
  subEndDate: string;
  nextPaymentDate: string;
  status: string;
  package?: { name: string; employeeLimit?: number } | null;
  address?: any;
  admin?: CompanyAdmin | null;
}

interface InvoiceItem {
  id: number;
  invoiceNumber: string;
  amount: number | string;
  currency: string;
  dueDate: string;
  status: string;
  company?: { id: number; name: string } | null;
}

interface CompanyFilterOption {
  id: number;
  name: string;
  code: string;
}

export const RenewalsPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    renewalsCount: 0,
    pendingOverdueCount: 0,
    paidCount: 0,
  });

  const [upcomingRenewals, setUpcomingRenewals] = useState<RenewalCompany[]>([]);
  const [expiredBilling, setExpiredBilling] = useState<RenewalCompany[]>([]);
  const [pendingInvoices, setPendingInvoices] = useState<InvoiceItem[]>([]);
  const [companies, setCompanies] = useState<CompanyFilterOption[]>([]);

  // Filter state
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('all');
  const [dateRangeStr, setDateRangeStr] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Pagination states
  const [pageUpcoming, setPageUpcoming] = useState(1);
  const [pageExpired, setPageExpired] = useState(1);
  const [pageInvoices, setPageInvoices] = useState(1);
  const pageSize = 5;

  const fetchData = async (overrideCompId?: string) => {
    setIsLoading(true);
    try {
      const compId = overrideCompId !== undefined ? overrideCompId : selectedCompanyId;
      const params = new URLSearchParams();
      if (compId && compId !== 'all') {
        params.append('companyId', compId);
      }
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await api.get(`/superadmin/renewals-billing?${params.toString()}`);
      const data = res.data || {};

      setMetrics(
        data.metrics || {
          renewalsCount: data.upcomingRenewals?.length || 0,
          pendingOverdueCount: data.pendingOverdueInvoices?.length || 0,
          paidCount: data.paidInvoices?.length || 0,
        }
      );

      setUpcomingRenewals(data.upcomingRenewals || []);
      setExpiredBilling(data.expiredBilling || []);
      setPendingInvoices(data.pendingOverdueInvoices || []);
      setCompanies(data.companies || data.allCompanies || []);
    } catch (err) {
      console.error('Failed to load renewal billing data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Default 30-day range matching 9/8/2026 - 10/8/2026 format
    const now = new Date();
    const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const startStr = `${past.getMonth() + 1}/${past.getDate()}/${past.getFullYear()}`;
    const endStr = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`;
    setDateRangeStr(`${startStr} - ${endStr}`);
    setStartDate(past.toISOString().split('T')[0]);
    setEndDate(now.toISOString().split('T')[0]);

    fetchData('all');
  }, []);

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  const handleExtendCompany = async (companyId: number, days: number = 30) => {
    if (!window.confirm(`Extend subscription for ${days} days?`)) return;
    try {
      await api.post(`/superadmin/renewals-billing/${companyId}/extend`, { days });
      alert('Subscription extended successfully!');
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to extend subscription');
    }
  };

  // Pagination helpers
  const paginate = (items: any[], page: number) => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  };

  const totalUpcomingPages = Math.ceil(upcomingRenewals.length / pageSize) || 0;
  const totalExpiredPages = Math.ceil(expiredBilling.length / pageSize) || 0;
  const totalInvoicesPages = Math.ceil(pendingInvoices.length / pageSize) || 0;

  return (
    <div className="space-y-6 pb-16">
      {/* Page Header with Breadcrumbs & Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Renewal &amp; Expired Billing
          </h1>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1 font-medium">
            <Link to="/super-admin/dashboard" className="hover:text-brand-600 flex items-center gap-1">
              <IconHome className="w-3.5 h-3.5 text-slate-400" />
            </Link>
            <span className="text-slate-500 font-medium">Super Admin</span>
            <span className="text-slate-300">&gt;</span>
            <span className="text-slate-600 font-medium">Renewal &amp; Expired Billing</span>
          </div>
        </div>

        {/* Right Filters Bar */}
        <form onSubmit={handleFilter} className="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
          {/* Date Range Display */}
          <div className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 shadow-2xs font-medium">
            <IconCalendar className="w-4 h-4 text-slate-400 shrink-0" />
            <span>{dateRangeStr || '9/8/2026 - 10/8/2026'}</span>
          </div>

          {/* Companies Dropdown */}
          <div className="relative inline-flex items-center">
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="appearance-none pl-3.5 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 shadow-2xs focus:outline-hidden font-medium cursor-pointer"
            >
              <option value="all">All companies</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <IconChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
          </div>

          {/* Filter Button */}
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1.5 px-5 py-2 bg-[#5046e5] hover:bg-[#4338ca] text-white rounded-xl text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
          >
            <IconFilter className="w-3.5 h-3.5 shrink-0" />
            <span>Filter</span>
          </button>
        </form>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Renewals */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start gap-4 relative z-10">
            <div className="w-12 h-12 rounded-xl bg-indigo-50/80 text-indigo-600 border border-indigo-100/60 flex items-center justify-center shrink-0">
              <IconRefresh className="w-6 h-6 stroke-[1.75]" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Renewals</p>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
                {metrics.renewalsCount}
              </p>
              <p className="text-xs font-normal text-slate-400 mt-1">
                Companies due for renewal
              </p>
            </div>
          </div>
          {/* Decorative Wave */}
          <div className="absolute bottom-0 left-0 right-0 h-10 pointer-events-none overflow-hidden opacity-90">
            <svg viewBox="0 0 400 60" preserveAspectRatio="none" className="w-full h-full">
              <path
                d="M0 45 C 70 20, 140 55, 210 35 C 280 15, 340 45, 400 25 L 400 60 L 0 60 Z"
                fill="#6366f1"
                fillOpacity="0.06"
              />
              <path
                d="M0 45 C 70 20, 140 55, 210 35 C 280 15, 340 45, 400 25"
                fill="none"
                stroke="#818cf8"
                strokeWidth="2"
                strokeOpacity="0.5"
              />
            </svg>
          </div>
        </div>

        {/* Card 2: Pending / Overdue Invoices */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start gap-4 relative z-10">
            <div className="w-12 h-12 rounded-xl bg-amber-50/80 text-amber-500 border border-amber-100/60 flex items-center justify-center shrink-0">
              <IconFileInvoice className="w-6 h-6 stroke-[1.75]" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Pending / Overdue Invoices</p>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
                {metrics.pendingOverdueCount}
              </p>
              <p className="text-xs font-normal text-slate-400 mt-1">
                Unpaid or overdue invoices
              </p>
            </div>
          </div>
          {/* Decorative Wave */}
          <div className="absolute bottom-0 left-0 right-0 h-10 pointer-events-none overflow-hidden opacity-90">
            <svg viewBox="0 0 400 60" preserveAspectRatio="none" className="w-full h-full">
              <path
                d="M0 44 C 85 18, 150 52, 230 25 C 310 10, 360 42, 400 22 L 400 60 L 0 60 Z"
                fill="#f59e0b"
                fillOpacity="0.06"
              />
              <path
                d="M0 44 C 85 18, 150 52, 230 25 C 310 10, 360 42, 400 22"
                fill="none"
                stroke="#fbbf24"
                strokeWidth="2"
                strokeOpacity="0.5"
              />
            </svg>
          </div>
        </div>

        {/* Card 3: Paid Invoices (last 10) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start gap-4 relative z-10">
            <div className="w-12 h-12 rounded-xl bg-emerald-50/80 text-emerald-500 border border-emerald-100/60 flex items-center justify-center shrink-0">
              <IconWallet className="w-6 h-6 stroke-[1.75]" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Paid Invoices (last 10)</p>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
                {metrics.paidCount}
              </p>
              <p className="text-xs font-normal text-slate-400 mt-1">
                Invoices paid in selected period
              </p>
            </div>
          </div>
          {/* Decorative Wave */}
          <div className="absolute bottom-0 left-0 right-0 h-10 pointer-events-none overflow-hidden opacity-90">
            <svg viewBox="0 0 400 60" preserveAspectRatio="none" className="w-full h-full">
              <path
                d="M0 46 C 80 18, 150 54, 220 28 C 290 12, 350 40, 400 22 L 400 60 L 0 60 Z"
                fill="#10b981"
                fillOpacity="0.06"
              />
              <path
                d="M0 46 C 80 18, 150 54, 220 28 C 290 12, 350 40, 400 22"
                fill="none"
                stroke="#34d399"
                strokeWidth="2"
                strokeOpacity="0.5"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Table 1: Upcoming Renewals */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <IconCalendar className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-slate-900">Upcoming renewals</h2>
          </div>
          <Link
            to="/super-admin/companies"
            className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-100/70 transition-colors"
          >
            <span>View All</span>
            <span>&rarr;</span>
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-4">COMPANY</th>
                <th className="px-6 py-4">PLAN</th>
                <th className="px-6 py-4">RENEWAL / END</th>
                <th className="px-6 py-4">STATUS</th>
                <th className="px-6 py-4 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-400">
                    <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-brand-600" />
                  </td>
                </tr>
              ) : upcomingRenewals.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="w-12 h-12 rounded-full bg-indigo-50/80 text-indigo-500 flex items-center justify-center mx-auto mb-3">
                      <IconCalendar className="w-6 h-6 stroke-[1.75]" />
                    </div>
                    <p className="font-bold text-slate-800 text-xs">No upcoming renewals found</p>
                    <p className="text-slate-400 text-xs mt-1">
                      There are no companies with upcoming renewals in the selected period.
                    </p>
                  </td>
                </tr>
              ) : (
                paginate(upcomingRenewals, pageUpcoming).map((r) => {
                  const end = r.subEndDate ? new Date(r.subEndDate).toLocaleDateString() : '-';
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">{r.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{r.subdomain}.peopleplus.uptrix.io</div>
                      </td>
                      <td className="px-6 py-4">{r.package?.name || r.planType || 'Standard'}</td>
                      <td className="px-6 py-4">{end}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/80">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                          {r.status || 'Expiring soon'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleExtendCompany(r.id, 30)}
                          className="w-8 h-8 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-blue-600 flex items-center justify-center shadow-2xs transition-colors ml-auto"
                          title="Actions"
                        >
                          <IconDots className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="px-6 py-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>
            Page {totalUpcomingPages === 0 ? '0 of 0' : `${pageUpcoming} of ${totalUpcomingPages}`}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPageUpcoming((p) => Math.max(1, p - 1))}
              disabled={pageUpcoming <= 1 || totalUpcomingPages === 0}
              className="p-1 rounded-md hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <IconChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPageUpcoming((p) => Math.min(totalUpcomingPages, p + 1))}
              disabled={pageUpcoming >= totalUpcomingPages || totalUpcomingPages === 0}
              className="p-1 rounded-md hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <IconChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Table 2: Expired Billing */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center">
              <IconAlertTriangle className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-slate-900">Expired Billing</h2>
          </div>
          <Link
            to="/super-admin/companies"
            className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-100/70 transition-colors"
          >
            <span>View All</span>
            <span>&rarr;</span>
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-4">COMPANY</th>
                <th className="px-6 py-4">LOCATION</th>
                <th className="px-6 py-4">PLAN TYPE</th>
                <th className="px-6 py-4">DATE FOR RENEWAL</th>
                <th className="px-6 py-4">DATE OF EXPIRED</th>
                <th className="px-6 py-4">COMPANY ADMIN</th>
                <th className="px-6 py-4">PHONE</th>
                <th className="px-6 py-4 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-slate-400">
                    <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-brand-600" />
                  </td>
                </tr>
              ) : expiredBilling.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <div className="w-12 h-12 rounded-full bg-indigo-50/80 text-indigo-500 flex items-center justify-center mx-auto mb-3">
                      <IconFileText className="w-6 h-6 stroke-[1.75]" />
                    </div>
                    <p className="font-bold text-slate-800 text-xs">No expired billing records found</p>
                    <p className="text-slate-400 text-xs mt-1">
                      There are no expired subscriptions in the selected period.
                    </p>
                  </td>
                </tr>
              ) : (
                paginate(expiredBilling, pageExpired).map((r) => {
                  const initial = r.name ? r.name.charAt(0).toUpperCase() : 'C';
                  const locationStr =
                    r.address?.city || r.address?.state || r.address?.country || '-';
                  const dateRenewal = r.nextPaymentDate
                    ? new Date(r.nextPaymentDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: '2-digit',
                        year: 'numeric',
                      })
                    : '-';
                  const dateExpired = r.subEndDate
                    ? new Date(r.subEndDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: '2-digit',
                        year: 'numeric',
                      })
                    : '-';
                  const adminName =
                    r.admin?.firstName || r.admin?.lastName
                      ? `${r.admin.firstName || ''} ${r.admin.lastName || ''}`.trim()
                      : r.admin?.email || '-';
                  const phoneStr = r.admin?.phone || '-';

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* COMPANY with avatar and Expired tag */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0">
                            {initial}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{r.name}</div>
                            <span className="inline-block px-2 py-0.2 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-600 border border-rose-200">
                              Expired
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">{locationStr}</td>
                      <td className="px-6 py-4 capitalize">{r.planType ? r.planType.toLowerCase() : 'Monthly'}</td>
                      <td className="px-6 py-4">{dateRenewal}</td>
                      <td className="px-6 py-4 text-slate-800">{dateExpired}</td>
                      <td className="px-6 py-4 font-medium">{adminName}</td>
                      <td className="px-6 py-4 font-mono text-slate-600">{phoneStr}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleExtendCompany(r.id, 30)}
                          className="w-8 h-8 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-blue-600 flex items-center justify-center shadow-2xs transition-colors ml-auto"
                          title="Actions"
                        >
                          <IconDots className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="px-6 py-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>
            Page {totalExpiredPages === 0 ? '0 of 0' : `${pageExpired} of ${totalExpiredPages}`}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPageExpired((p) => Math.max(1, p - 1))}
              disabled={pageExpired <= 1 || totalExpiredPages === 0}
              className="p-1 rounded-md hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <IconChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPageExpired((p) => Math.min(totalExpiredPages, p + 1))}
              disabled={pageExpired >= totalExpiredPages || totalExpiredPages === 0}
              className="p-1 rounded-md hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <IconChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Table 3: Pending / Overdue Invoices */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-500 flex items-center justify-center">
              <IconFileInvoice className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-slate-900">Pending / Overdue invoices</h2>
          </div>
          <Link
            to="/super-admin/invoices"
            className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-100/70 transition-colors"
          >
            <span>View All</span>
            <span>&rarr;</span>
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-4">INVOICE</th>
                <th className="px-6 py-4">COMPANY</th>
                <th className="px-6 py-4">DUE</th>
                <th className="px-6 py-4">AMOUNT</th>
                <th className="px-6 py-4">STATUS</th>
                <th className="px-6 py-4 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-400">
                    <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-brand-600" />
                  </td>
                </tr>
              ) : pendingInvoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="w-12 h-12 rounded-full bg-indigo-50/80 text-indigo-500 flex items-center justify-center mx-auto mb-3">
                      <IconFileText className="w-6 h-6 stroke-[1.75]" />
                    </div>
                    <p className="font-bold text-slate-800 text-xs">No pending or overdue invoices</p>
                    <p className="text-slate-400 text-xs mt-1">
                      There are no pending or overdue invoices in the selected period.
                    </p>
                  </td>
                </tr>
              ) : (
                paginate(pendingInvoices, pageInvoices).map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4 font-mono font-semibold text-slate-900">
                      {inv.invoiceNumber}
                    </td>
                    <td className="px-6 py-4 font-medium">{inv.company?.name || '-'}</td>
                    <td className="px-6 py-4">
                      {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">
                      ₹{Number(inv.amount).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                          inv.status === 'OVERDUE'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${inv.status === 'OVERDUE' ? 'bg-rose-500' : 'bg-amber-500'}`}></span>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to="/super-admin/invoices"
                        className="w-8 h-8 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-blue-600 inline-flex items-center justify-center shadow-2xs transition-colors ml-auto"
                        title="View Details"
                      >
                        <IconDots className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="px-6 py-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing {pendingInvoices.length === 0 ? '0 to 0 of 0 entries' : `${(pageInvoices - 1) * pageSize + 1} to ${Math.min(pageInvoices * pageSize, pendingInvoices.length)} of ${pendingInvoices.length} entries`}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPageInvoices((p) => Math.max(1, p - 1))}
              disabled={pageInvoices <= 1 || totalInvoicesPages === 0}
              className="p-1 rounded-md hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <IconChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPageInvoices((p) => Math.min(totalInvoicesPages, p + 1))}
              disabled={pageInvoices >= totalInvoicesPages || totalInvoicesPages === 0}
              className="p-1 rounded-md hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <IconChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RenewalsPage;
