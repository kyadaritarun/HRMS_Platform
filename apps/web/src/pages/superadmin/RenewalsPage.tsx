import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import {
  IconHome,
  IconCalendar,
  IconChevronLeft,
  IconChevronRight,
  IconFileInvoice,
  IconAlertTriangle,
  IconFilter,
  IconFileText,
  IconChevronDown,
  IconSearch,
  IconReceipt2,
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
  const [upcomingRenewals, setUpcomingRenewals] = useState<RenewalCompany[]>([]);
  const [expiredBilling, setExpiredBilling] = useState<RenewalCompany[]>([]);
  const [pendingInvoices, setPendingInvoices] = useState<InvoiceItem[]>([]);
  const [companies, setCompanies] = useState<CompanyFilterOption[]>([]);

  // Filter state
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('all');
  const [dateRangeStr, setDateRangeStr] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Search & Tab & Pagination states
  const [activeTab, setActiveTab] = useState<'UPCOMING' | 'EXPIRED' | 'INVOICES'>('UPCOMING');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

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
    // Default 30-day range
    const now = new Date();
    const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const startStr = `${past.getMonth() + 1}/${past.getDate()}/${past.getFullYear()}`;
    const endStr = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`;
    setDateRangeStr(`${startStr} - ${endStr}`);
    setStartDate(past.toISOString().split('T')[0]);
    setEndDate(now.toISOString().split('T')[0]);

    fetchData('all');
  }, []);

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

  // Filtered lists
  const filteredUpcoming = useMemo(() => {
    return upcomingRenewals.filter((r) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        r.name?.toLowerCase().includes(q) ||
        r.subdomain?.toLowerCase().includes(q) ||
        r.package?.name?.toLowerCase().includes(q) ||
        r.status?.toLowerCase().includes(q)
      );
    });
  }, [upcomingRenewals, search]);

  const filteredExpired = useMemo(() => {
    return expiredBilling.filter((r) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        r.name?.toLowerCase().includes(q) ||
        r.subdomain?.toLowerCase().includes(q) ||
        r.admin?.email?.toLowerCase().includes(q) ||
        r.admin?.firstName?.toLowerCase().includes(q) ||
        r.admin?.lastName?.toLowerCase().includes(q) ||
        r.planType?.toLowerCase().includes(q)
      );
    });
  }, [expiredBilling, search]);

  const filteredInvoices = useMemo(() => {
    return pendingInvoices.filter((inv) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        inv.invoiceNumber?.toLowerCase().includes(q) ||
        inv.company?.name?.toLowerCase().includes(q) ||
        inv.status?.toLowerCase().includes(q)
      );
    });
  }, [pendingInvoices, search]);

  const currentItems = useMemo(() => {
    if (activeTab === 'UPCOMING') return filteredUpcoming;
    if (activeTab === 'EXPIRED') return filteredExpired;
    return filteredInvoices;
  }, [activeTab, filteredUpcoming, filteredExpired, filteredInvoices]);

  const totalEntries = currentItems.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalEntries);
  const paginatedItems = useMemo(() => {
    return currentItems.slice(startIndex, endIndex);
  }, [currentItems, startIndex, endIndex]);

  return (
    <div className="space-y-6 pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <IconReceipt2 className="w-5 h-5 text-indigo-600 shrink-0" />
            <span>Renewals &amp; Billing</span>
          </h1>
         
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={async () => {
              try {
                const res = await api.post('/superadmin/trigger-expiry-alerts');
                alert(res.data?.message || 'Expiry alerts scan complete');
                fetchData();
              } catch (err: any) {
                alert(err.response?.data?.error || 'Failed to trigger expiry scan');
              }
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[#5E4BE2] to-[#4B39C3] hover:from-[#503ed0] hover:to-[#3e2fb3] text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer shrink-0"
          >
            <IconAlertTriangle className="w-4 h-4 shrink-0" />
            <span>Scan 10-Day Expiry Alerts</span>
          </button>
        </div>
      </div>

      {/* Toolbar: Search on Left & Filters on Right */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search on Left */}
        <div className="relative flex-1 max-w-md">
          <IconSearch className="w-4 h-4 text-slate-400 font-medium absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder={
              activeTab === 'INVOICES'
                ? 'Search by invoice number or company...'
                : 'Search by company name, plan, or domain...'
            }
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 text-xs font-medium bg-slate-50/70 border border-slate-200/80 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all text-slate-800"
          />
        </div>

        {/* Filters on Right */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Date Range Display */}
          <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-700 font-medium shrink-0">
            <IconCalendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{dateRangeStr || 'Current Period'}</span>
          </div>

          {/* Companies Dropdown */}
          <div className="relative inline-flex items-center">
            <select
              aria-label="Filter by company"
              value={selectedCompanyId}
              onChange={(e) => {
                setSelectedCompanyId(e.target.value);
                fetchData(e.target.value);
              }}
              className="appearance-none pl-3.5 pr-8 py-2 bg-white border border-slate-200/90 rounded-xl text-xs font-bold text-slate-700 shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-indigo-600/20 cursor-pointer hover:border-slate-300 transition-colors"
            >
              <option value="all">All Companies</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <IconChevronDown className="w-3.5 h-3.5 text-slate-400 font-medium absolute right-2.5 pointer-events-none" />
          </div>

          {/* Status / Category Dropdown */}
          <div className="relative min-w-[210px] shrink-0">
            <select
              aria-label="Filter category"
              value={activeTab}
              onChange={(e) => {
                setActiveTab(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-8 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200/90 rounded-xl shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-indigo-600/20 appearance-none cursor-pointer hover:border-slate-300 transition-colors"
            >
              <option value="UPCOMING">Upcoming Renewals ({filteredUpcoming.length})</option>
              <option value="EXPIRED">Expired Subscriptions ({filteredExpired.length})</option>
              <option value="INVOICES">Pending Invoices ({filteredInvoices.length})</option>
            </select>
            <IconFilter className="w-3.5 h-3.5 text-slate-400 font-medium absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <IconChevronDown className="w-3.5 h-3.5 text-slate-400 font-medium absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Unified Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Table Title Bar */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              {activeTab === 'UPCOMING' && <IconCalendar className="w-4 h-4" />}
              {activeTab === 'EXPIRED' && <IconAlertTriangle className="w-4 h-4 text-rose-500" />}
              {activeTab === 'INVOICES' && <IconFileInvoice className="w-4 h-4 text-amber-500" />}
            </div>
            <h2 className="text-sm font-bold text-slate-900">
              {activeTab === 'UPCOMING' && 'Upcoming Renewals'}
              {activeTab === 'EXPIRED' && 'Expired Subscriptions'}
              {activeTab === 'INVOICES' && 'Pending / Overdue Invoices'}
            </h2>
          </div>
          <Link
            to={activeTab === 'INVOICES' ? '/super-admin/invoices' : '/super-admin/companies'}
            className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-100/70 transition-colors"
          >
            <span>View All</span>
            <span>&rarr;</span>
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#e5e7eb] text-xs font-bold text-slate-900 border-b border-slate-300">
              {activeTab === 'UPCOMING' && (
                <tr>
                  <th className="px-6 py-3.5">Company</th>
                  <th className="px-6 py-3.5">Plan</th>
                  <th className="px-6 py-3.5">Renewal / End</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              )}
              {activeTab === 'EXPIRED' && (
                <tr>
                  <th className="px-6 py-3.5">Company</th>
                  <th className="px-6 py-3.5">Location</th>
                  <th className="px-6 py-3.5">Plan Type</th>
                  <th className="px-6 py-3.5">Date for Renewal</th>
                  <th className="px-6 py-3.5">Date of Expired</th>
                  <th className="px-6 py-3.5">Company Admin</th>
                  <th className="px-6 py-3.5">Phone</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              )}
              {activeTab === 'INVOICES' && (
                <tr>
                  <th className="px-6 py-3.5">Invoice</th>
                  <th className="px-6 py-3.5">Company</th>
                  <th className="px-6 py-3.5">Due Date</th>
                  <th className="px-6 py-3.5">Amount</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={activeTab === 'EXPIRED' ? 8 : activeTab === 'INVOICES' ? 6 : 5}
                    className="px-6 py-12 text-center text-slate-500 font-medium"
                  >
                    <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600" />
                  </td>
                </tr>
              ) : paginatedItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={activeTab === 'EXPIRED' ? 8 : activeTab === 'INVOICES' ? 6 : 5}
                    className="px-6 py-12 text-center"
                  >
                    <div className="w-12 h-12 rounded-full bg-indigo-50/80 text-indigo-500 flex items-center justify-center mx-auto mb-3">
                      <IconFileText className="w-6 h-6 stroke-[1.75]" />
                    </div>
                    <p className="font-bold text-slate-800 text-xs">No records found</p>
                    <p className="text-slate-500 font-medium text-xs mt-1">
                      {search ? 'Try clearing your search query.' : 'There are no records in the selected view.'}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item: any) => {
                  if (activeTab === 'UPCOMING') {
                    const r = item as RenewalCompany;
                    const end = r.subEndDate ? new Date(r.subEndDate).toLocaleDateString() : '-';
                    return (
                      <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-900">{r.name}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{r.subdomain}.peopleplus.uptrix.io</div>
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
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-indigo-600 hover:text-indigo-700 text-xs font-semibold shadow-2xs transition-colors ml-auto cursor-pointer"
                            title="Extend 30 Days"
                          >
                            <span>Extend 30d</span>
                          </button>
                        </td>
                      </tr>
                    );
                  }

                  if (activeTab === 'EXPIRED') {
                    const r = item as RenewalCompany;
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
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0">
                              {initial}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900">{r.name}</div>
                              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-600 border border-rose-200">
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
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-indigo-600 hover:text-indigo-700 text-xs font-semibold shadow-2xs transition-colors ml-auto cursor-pointer"
                            title="Extend 30 Days"
                          >
                            <span>Extend 30d</span>
                          </button>
                        </td>
                      </tr>
                    );
                  }

                  // INVOICES
                  const inv = item as InvoiceItem;
                  return (
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
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-indigo-600 hover:text-indigo-700 text-xs font-semibold shadow-2xs transition-colors ml-auto"
                          title="View Details"
                        >
                          <span>View</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Standardized Pagination Bar matching Admin / HR */}
        <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-medium">
          <span>
            Showing {totalEntries === 0 ? 0 : startIndex + 1} - {endIndex} of {totalEntries} entries
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1 || totalPages === 0}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              <IconChevronLeft className="w-3.5 h-3.5" />
              <span>Prev</span>
            </button>
            <span className="px-3 py-1 rounded-lg bg-[#5E4BE2] text-white font-bold text-xs shadow-2xs">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages || totalPages === 0}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              <span>Next</span>
              <IconChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RenewalsPage;