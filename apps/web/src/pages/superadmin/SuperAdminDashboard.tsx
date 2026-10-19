import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import {
  IconBuildingSkyscraper,
  IconCheck,
  IconReceipt2,
  IconCash,
  IconAlertTriangle,
  IconTrendingUp,
  IconPlus,
  IconClock,
  IconUsers,
  IconShieldLock,
  IconCalendar,
  IconExternalLink,
  IconMail,
  IconPhone,
  IconX,
  IconCopy,
  IconChecklist,
  IconRefresh,
  IconPackage,
} from '@tabler/icons-react';
import Chart from 'react-apexcharts';

interface MonthCount {
  label: string;
  key: string;
  count: number;
}

interface RevenueMonth {
  label: string;
  key: string;
  total: number;
}

interface DashboardData {
  welcomeName: string;
  range: {
    start: string;
    end: string;
  };
  kpis: {
    totalCompanies: number;
    activeCompanies: number;
    inactiveCompanies: number;
    totalSubscriptions: number;
    totalRevenue: number;
    rangeRevenue: number;
    newCompaniesInRange: number;
  };
  monthCounts: MonthCount[];
  revenueMonths: RevenueMonth[];
  invoiceStatusCounts: {
    pending: number;
    overdue: number;
    paid: number;
    total: number;
    totalAmount: number;
  };
  latestCompanies: any[];
  recentSubscriptions: any[];
  renewals: any[];
  licenseOveruse: any[];
  packagesCount: number;
}

export const SuperAdminDashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Range state
  const [activePreset, setActivePreset] = useState<string>('6M');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Table active tab
  const [activeTab, setActiveTab] = useState<'companies' | 'renewals' | 'overuse' | 'subscriptions'>('companies');

  // Add Super Admin Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalForm, setModalForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
  });
  const [isSubmittingAdmin, setIsSubmittingAdmin] = useState(false);
  const [createdAdminResult, setCreatedAdminResult] = useState<{ email: string; tempPassword?: string } | null>(null);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [copiedPass, setCopiedPass] = useState(false);

  const calculateRangeDates = (preset: string) => {
    const today = new Date();
    const endStr = today.toISOString().split('T')[0];
    let start = new Date();

    if (preset === '7D') {
      start.setDate(today.getDate() - 7);
    } else if (preset === '30D') {
      start.setDate(today.getDate() - 30);
    } else if (preset === '3M') {
      start.setMonth(today.getMonth() - 3);
    } else if (preset === '6M') {
      start.setMonth(today.getMonth() - 6);
    } else if (preset === '1Y') {
      start.setFullYear(today.getFullYear() - 1);
    } else if (preset === 'ALL') {
      start = new Date('2024-01-01');
    }

    const startStr = start.toISOString().split('T')[0];
    return { startStr, endStr };
  };

  const fetchDashboard = async (start?: string, end?: string) => {
    setIsLoading(true);
    try {
      let query = '';
      if (start && end) {
        query = `?start=${start}&end=${end}`;
      }
      const res = await api.get(`/superadmin/dashboard${query}`);
      setData(res.data);
      if (res.data?.range) {
        setStartDate(res.data.range.start);
        setEndDate(res.data.range.end);
      }
    } catch (err) {
      console.error('Failed to load superadmin dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const { startStr, endStr } = calculateRangeDates(activePreset);
    fetchDashboard(startStr, endStr);
  }, [activePreset]);

  const handleCustomRangeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (startDate && endDate) {
      setActivePreset('CUSTOM');
      fetchDashboard(startDate, endDate);
    }
  };

  const handleAddSuperAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError(null);
    setIsSubmittingAdmin(true);
    try {
      const res = await api.post('/superadmin/super-admins', {
        fullName: modalForm.fullName.trim(),
        email: modalForm.email.trim().toLowerCase(),
        phone: modalForm.phone.trim(),
        password: modalForm.password.trim() || undefined,
      });

      setCreatedAdminResult({
        email: res.data?.user?.email,
        tempPassword: res.data?.tempPassword,
      });
      setModalForm({ fullName: '', email: '', phone: '', password: '' });
    } catch (err: any) {
      setAdminError(err.response?.data?.error || err.response?.data?.message || 'Failed to provision Super Admin');
    } finally {
      setIsSubmittingAdmin(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPass(true);
    setTimeout(() => setCopiedPass(false), 2000);
  };

  const kpis = data?.kpis || {
    totalCompanies: 0,
    activeCompanies: 0,
    inactiveCompanies: 0,
    totalSubscriptions: 0,
    totalRevenue: 0,
    rangeRevenue: 0,
    newCompaniesInRange: 0,
  };

  // ApexCharts Data mapped from real backend month buckets
  const monthLabels = data?.monthCounts?.map((m) => m.label) || ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
  const monthValues = data?.monthCounts?.map((m) => m.count) || [0, 0, 0, 0, 0, 0];

  const companiesChartOptions: ApexCharts.ApexOptions = {
    chart: { type: 'bar', toolbar: { show: false }, zoom: { enabled: false } },
    colors: ['#4f46e5'],
    plotOptions: { bar: { borderRadius: 6, columnWidth: '40%' } },
    xaxis: { categories: monthLabels, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { min: 0, forceNiceScale: true },
    dataLabels: { enabled: false },
    grid: { borderColor: '#f1f5f9', strokeDashArray: 4 },
    tooltip: { y: { formatter: (val) => `${val} Companies` } },
  };
  const companiesChartSeries = [{ name: 'Companies Onboarded', data: monthValues }];

  const revenueLabels = data?.revenueMonths?.map((r) => r.label) || monthLabels;
  const revenueValues = data?.revenueMonths?.map((r) => r.total) || [0, 0, 0, 0, 0, 0];

  const revenueChartOptions: ApexCharts.ApexOptions = {
    chart: { type: 'area', toolbar: { show: false }, zoom: { enabled: false } },
    colors: ['#10b981'],
    stroke: { curve: 'smooth', width: 2.5 },
    fill: {
      type: 'gradient',
      gradient: { shadeIntensity: 1, opacityFrom: 0.45, opacityTo: 0.05 },
    },
    xaxis: { categories: revenueLabels, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: {
      labels: {
        formatter: (val) => `₹${Number(val).toLocaleString()}`,
      },
    },
    dataLabels: { enabled: false },
    grid: { borderColor: '#f1f5f9', strokeDashArray: 4 },
    tooltip: { y: { formatter: (val) => `₹${Number(val).toLocaleString()}` } },
  };
  const revenueChartSeries = [{ name: 'Monthly Revenue', data: revenueValues }];

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb Context */}



      {/* Date Range & Filter Toolbar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1">
            <IconCalendar className="w-3.5 h-3.5" /> Range:
          </span>
          {(['7D', '30D', '3M', '6M', '1Y', 'ALL'] as const).map((preset) => (
            <button
              key={preset}
              onClick={() => setActivePreset(preset)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activePreset === preset
                ? 'bg-[#4338ca] text-white shadow-xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
                }`}
            >
              {preset === '7D'
                ? '7 Days'
                : preset === '30D'
                  ? '30 Days'
                  : preset === '3M'
                    ? '3 Months'
                    : preset === '6M'
                      ? '6 Months'
                      : preset === '1Y'
                        ? '1 Year'
                        : 'All Time'}
            </button>
          ))}
        </div>

        {/* Custom Date Form */}
        <form onSubmit={handleCustomRangeSubmit} className="flex items-center gap-2">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50/70"
          />
          <span className="text-xs text-slate-400">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50/70"
          />
          <button
            type="submit"
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
          >
            Apply
          </button>
        </form>
      </div>

      {/* KPI Stat Cards (6 Key Dimensions) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Total Companies */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Companies</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-brand-600 flex items-center justify-center">
              <IconBuildingSkyscraper className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{kpis.totalCompanies}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            <span className="font-semibold text-emerald-600">+{kpis.newCompaniesInRange}</span> in period
          </div>
        </div>

        {/* Active Tenants */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active Tenants</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <IconCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{kpis.activeCompanies}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            {kpis.inactiveCompanies} inactive / suspended
          </div>
        </div>

        {/* Paid Subscriptions */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Paid Invoices</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <IconReceipt2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{kpis.totalSubscriptions}</div>
          <div className="text-[11px] text-amber-600 font-semibold mt-1">
            {data?.renewals?.length || 0} renewals in 14d
          </div>
        </div>

        {/* Lifetime Revenue */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Lifetime Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <IconCash className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            ₹{Number(kpis.totalRevenue).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">All paid subscriptions</div>
        </div>

        {/* Range Revenue */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Range Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <IconTrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600">
            ₹{Number(kpis.rangeRevenue || 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Selected period revenue</div>
        </div>

        {/* Overuse Alerts */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">License Overuse</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <IconAlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600">{data?.licenseOveruse?.length || 0}</div>
          <div className="text-[11px] text-rose-600 font-semibold mt-1">Companies above limit</div>
        </div>
      </div>

      {/* Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Tenant Growth Velocity</h3>
              <p className="text-xs text-slate-400">Monthly companies onboarded within selected range</p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-brand-700">
              {kpis.newCompaniesInRange} Total
            </span>
          </div>
          <Chart options={companiesChartOptions} series={companiesChartSeries} type="bar" height={260} />
        </div>

        <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Monthly Platform SaaS Revenue</h3>
              <p className="text-xs text-slate-400">Aggregated payments collected across tenants</p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
              ₹{Number(kpis.rangeRevenue || 0).toLocaleString()}
            </span>
          </div>
          <Chart options={revenueChartOptions} series={revenueChartSeries} type="area" height={260} />
        </div>
      </div>

      {/* Invoices Status Breakdown Bar */}
      {data?.invoiceStatusCounts && (
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <IconReceipt2 className="w-5 h-5 text-indigo-600" />
            <div>
              <span className="text-xs font-bold text-slate-900">Billing & Invoice Health Snapshot</span>
              <p className="text-[11px] text-slate-500">Live reconciliation of tenant subscription billing</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-slate-600">Paid:</span>
              <span className="text-slate-900 font-bold">{data.invoiceStatusCounts.paid}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="text-slate-600">Pending:</span>
              <span className="text-slate-900 font-bold">{data.invoiceStatusCounts.pending}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span className="text-slate-600">Overdue:</span>
              <span className="text-slate-900 font-bold">{data.invoiceStatusCounts.overdue}</span>
            </div>
            <Link
              to="/super-admin/invoices"
              className="text-brand-600 hover:text-brand-700 font-bold ml-2 flex items-center gap-1"
            >
              All Invoices <IconExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* Segmented Data Tables Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table Tabs Header */}
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setActiveTab('companies')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${activeTab === 'companies'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
            >
              <IconBuildingSkyscraper className="w-4 h-4" />
              Latest Onboardings ({data?.latestCompanies?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('renewals')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${activeTab === 'renewals'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
            >
              <IconClock className="w-4 h-4" />
              Renewals & Expired ({data?.renewals?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('overuse')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${activeTab === 'overuse'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
            >
              <IconAlertTriangle className="w-4 h-4" />
              License Overuse Alerts ({data?.licenseOveruse?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('subscriptions')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${activeTab === 'subscriptions'
                ? 'bg-brand-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
            >
              <IconChecklist className="w-4 h-4" />
              Active Subscriptions ({data?.recentSubscriptions?.length || 0})
            </button>
          </div>

          <div className="text-xs text-slate-400">
            {activeTab === 'companies' && (
              <Link to="/super-admin/companies" className="text-brand-600 font-bold hover:underline">
                View All Companies &rarr;
              </Link>
            )}
            {activeTab === 'renewals' && (
              <Link to="/super-admin/renewals-billing" className="text-brand-600 font-bold hover:underline">
                Manage Renewals &rarr;
              </Link>
            )}
            {activeTab === 'overuse' && (
              <span className="text-rose-600 font-semibold">Immediate attention needed</span>
            )}
            {activeTab === 'subscriptions' && (
              <Link to="/super-admin/renewals-billing" className="text-brand-600 font-bold hover:underline">
                Subscription Desk &rarr;
              </Link>
            )}
          </div>
        </div>

        {/* Content Body based on tab */}
        <div className="p-6">
          {/* TAB 1: LATEST COMPANIES */}
          {activeTab === 'companies' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider font-semibold">
                    <th className="pb-3 pl-2">Company</th>
                    <th className="pb-3">Subdomain</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Assigned Package</th>
                    <th className="pb-3">Plan Type</th>
                    <th className="pb-3 pr-2 text-right">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(!data?.latestCompanies || data.latestCompanies.length === 0) ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No companies registered yet.
                      </td>
                    </tr>
                  ) : (
                    data.latestCompanies.map((c: any) => (
                      <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 pl-2">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs uppercase">
                              {c.name?.slice(0, 2) || 'CO'}
                            </div>
                            <span className="font-bold text-slate-900 text-sm">{c.name}</span>
                          </div>
                        </td>
                        <td className="py-3.5 font-mono text-slate-600">{c.subdomain}.uptrix.io</td>
                        <td className="py-3.5">
                          <span
                            className={`px-2.5 py-0.5 rounded-full font-semibold text-[11px] ${c.isActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                          >
                            {c.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-3.5 font-semibold text-slate-700">{c.package?.name || 'Standard'}</td>
                        <td className="py-3.5 text-slate-600">{c.planType || 'MONTHLY'}</td>
                        <td className="py-3.5 pr-2 text-right text-slate-500">
                          {new Date(c.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 2: RENEWALS & EXPIRED */}
          {activeTab === 'renewals' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider font-semibold">
                    <th className="pb-3 pl-2">Company</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Plan / Package</th>
                    <th className="pb-3">Primary Contact</th>
                    <th className="pb-3 pr-2 text-right">Expiration / Due Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(!data?.renewals || data.renewals.length === 0) ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        <IconCheck className="w-8 h-8 text-emerald-500 mx-auto mb-1" />
                        No expiring or overdue subscriptions found.
                      </td>
                    </tr>
                  ) : (
                    data.renewals.map((r: any) => (
                      <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 pl-2 font-bold text-slate-900">{r.name}</td>
                        <td className="py-3.5">
                          <span
                            className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] ${r.status === 'Expired'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-900'
                              }`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="py-3.5 font-medium text-slate-700">
                          {r.package?.name || 'Custom Plan'} ({r.planType})
                        </td>
                        <td className="py-3.5 text-slate-600">
                          {r.admin?.email || 'admin@tenant.com'}
                        </td>
                        <td className="py-3.5 pr-2 text-right font-semibold text-slate-900">
                          {r.subEndDate ? new Date(r.subEndDate).toLocaleDateString() : 'N/A'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 3: LICENSE OVERUSE ALERTS */}
          {activeTab === 'overuse' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider font-semibold">
                    <th className="pb-3 pl-2">Company</th>
                    <th className="pb-3">Primary Contact</th>
                    <th className="pb-3">Phone</th>
                    <th className="pb-3 text-center">Seat Limit</th>
                    <th className="pb-3 text-center">Active Users</th>
                    <th className="pb-3 pr-2 text-right">Quota Overrun</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(!data?.licenseOveruse || data.licenseOveruse.length === 0) ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-emerald-600 font-semibold">
                        <IconCheck className="w-8 h-8 text-emerald-500 mx-auto mb-1" />
                        No license overages detected! All companies operate within allocated limits.
                      </td>
                    </tr>
                  ) : (
                    data.licenseOveruse.map((item: any) => (
                      <tr key={item.companyId} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 pl-2 font-bold text-slate-900">{item.companyName}</td>
                        <td className="py-3.5 text-slate-700">{item.admin?.email || '-'}</td>
                        <td className="py-3.5 text-slate-600">{item.admin?.phone || '-'}</td>
                        <td className="py-3.5 text-center font-semibold text-slate-700">{item.seatLimit}</td>
                        <td className="py-3.5 text-center font-bold text-slate-900">{item.activeUsers}</td>
                        <td className="py-3.5 pr-2 text-right">
                          <span className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 font-extrabold">
                            +{item.excessSeats} seats
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 4: RECENT SUBSCRIPTIONS */}
          {activeTab === 'subscriptions' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider font-semibold">
                    <th className="pb-3 pl-2">Company</th>
                    <th className="pb-3">Package</th>
                    <th className="pb-3">Plan Cycle</th>
                    <th className="pb-3">Subdomain</th>
                    <th className="pb-3 pr-2 text-right">Subscription Start</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(!data?.recentSubscriptions || data.recentSubscriptions.length === 0) ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        No active subscriptions on record.
                      </td>
                    </tr>
                  ) : (
                    data.recentSubscriptions.map((sub: any) => (
                      <tr key={sub.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 pl-2 font-bold text-slate-900">{sub.name}</td>
                        <td className="py-3.5 font-semibold text-brand-600">{sub.package?.name || 'Standard'}</td>
                        <td className="py-3.5 text-slate-600">{sub.planType}</td>
                        <td className="py-3.5 font-mono text-slate-500">{sub.subdomain}.uptrix.io</td>
                        <td className="py-3.5 pr-2 text-right text-slate-600">
                          {sub.subStartDate ? new Date(sub.subStartDate).toLocaleDateString() : 'N/A'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ADD SUPER ADMIN MODAL (Matching Django AddSuperAdmin modal workflow) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <IconShieldLock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Provision New Super Admin</h3>
                  <p className="text-xs text-slate-500">Add platform-level operator with full tenant oversight</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center"
              >
                <IconX className="w-5 h-5" />
              </button>
            </div>

            {createdAdminResult ? (
              <div className="py-6 space-y-4">
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
                  <div className="flex items-center gap-2 font-bold text-sm mb-1 text-emerald-900">
                    <IconCheck className="w-5 h-5 text-emerald-600" />
                    Super Admin Created Successfully!
                  </div>
                  Account for <span className="font-mono font-bold">{createdAdminResult.email}</span> is ready.
                </div>

                {createdAdminResult.tempPassword && (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <span className="text-xs font-semibold text-slate-500">Auto-Generated Temporary Password:</span>
                    <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-300 font-mono text-sm font-bold text-slate-900">
                      <span>{createdAdminResult.tempPassword}</span>
                      <button
                        onClick={() => copyToClipboard(createdAdminResult.tempPassword!)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs flex items-center gap-1 font-sans transition-colors"
                      >
                        {copiedPass ? <IconCheck className="w-3.5 h-3.5 text-emerald-600" /> : <IconCopy className="w-3.5 h-3.5" />}
                        {copiedPass ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      User must change this temporary password within 5 days on their initial login.
                    </p>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      setCreatedAdminResult(null);
                    }}
                    className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleAddSuperAdmin} className="py-4 space-y-4">
                {adminError && (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                    <IconAlertTriangle className="w-4 h-4 shrink-0" />
                    {adminError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    value={modalForm.fullName}
                    onChange={(e) => setModalForm({ ...modalForm, fullName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-brand-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="admin@platform.io"
                    value={modalForm.email}
                    onChange={(e) => setModalForm({ ...modalForm, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-brand-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number (Optional)</label>
                  <input
                    type="tel"
                    placeholder="+91 99999 99999"
                    value={modalForm.phone}
                    onChange={(e) => setModalForm({ ...modalForm, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-brand-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Custom Password (Leave blank to auto-generate temporary password)
                  </label>
                  <input
                    type="password"
                    placeholder="Optional password"
                    value={modalForm.password}
                    onChange={(e) => setModalForm({ ...modalForm, password: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-brand-600"
                  />
                </div>

                <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 text-[11px] text-indigo-900 leading-relaxed">
                  <span className="font-bold">Security Note:</span> If no password is provided, a secure temporary password will be generated. The user will be required to change it on their first login.
                </div>

                <div className="flex items-center justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingAdmin}
                    className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-brand-500/20"
                  >
                    {isSubmittingAdmin ? 'Provisioning...' : 'Create Super Admin'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminDashboard;
