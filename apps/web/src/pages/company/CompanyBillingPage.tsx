import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { TaxInvoicePdfDrawer } from '../../components/pdf';
import TablePagination from '../../components/common/TablePagination';
import {
  IconCreditCard,
  IconCheck,
  IconReceipt2,
  IconPrinter,
  IconX,
  IconSearch,
  IconFileText,
  IconBuildingBank,
  IconCash,
  IconReceipt,
  IconQrcode,
  IconAlertTriangle,
  IconCrown,
  IconClock,
  IconLock,
} from '@tabler/icons-react';

interface InvoiceItem {
  id: number;
  invoiceNumber: string;
  amount: number | string;
  currency: string;
  billingCycle: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  issuedAt: string;
  paidAt?: string | null;
  payment?: any;
}

interface PackageItem {
  id: number;
  name: string;
  description: string;
  currency: string;
  priceMonthly: number;
  priceQuarterly: number;
  priceYearly: number;
  employeeLimit: number;
  enabledFeatures: string[];
}

interface BillingData {
  plan: {
    package?: {
      id: number;
      name: string;
      description?: string;
      employeeLimit: number;
      enabledFeatures?: string[];
      priceMonthly?: number;
      priceYearly?: number;
    } | null;
    planType?: string;
    subAmount?: number | string;
    subStartDate?: string;
    subEndDate?: string;
    nextPaymentDate?: string;
    subIsActive?: boolean;
    daysRemaining?: number | null;
    isExpiringSoon?: boolean;
  };
  availablePackages?: PackageItem[];
  activeEmployeeCount: number;
  invoices: InvoiceItem[];
}

const COMPANY_BRAND_NAME = import.meta.env.VITE_COMPANY_BRAND_NAME;
const COMPANY_LEGAL_NAME = import.meta.env.VITE_COMPANY_LEGAL_NAME;
const COMPANY_GSTIN = import.meta.env.VITE_COMPANY_GSTIN;
const COMPANY_ADDRESS = import.meta.env.VITE_COMPANY_ADDRESS;

export const CompanyBillingPage: React.FC = () => {
  const { company } = useAuth();
  const [data, setData] = useState<BillingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedInvoiceForView, setSelectedInvoiceForView] = useState<InvoiceItem | null>(null);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'PAID' | 'PENDING'>('ALL');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Upgrade Modal State
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [selectedPlanType, setSelectedPlanType] = useState<'MONTHLY' | 'YEARLY'>('YEARLY');
  const [selectedPackageId, setSelectedPackageId] = useState<number | null>(null);
  const [isProcessingUpgrade, setIsProcessingUpgrade] = useState(false);

  const getPaymentMethodInfo = (inv: InvoiceItem) => {
    const p = inv.payment || {};
    const method = String(p.method || p.paymentMethod || p.provider || '').toUpperCase();

    if (method.includes('UPI')) {
      return {
        label: 'UPI / QR',
        ref: p.reference || '',
        badgeClass: 'bg-purple-50 text-purple-700 border-purple-200/80',
        icon: <IconQrcode className="w-3.5 h-3.5 text-purple-600 shrink-0" />,
      };
    }
    if (method.includes('BANK') || method.includes('NEFT') || method.includes('RTGS') || method.includes('IMPS')) {
      return {
        label: 'Bank Transfer',
        ref: p.reference || '',
        badgeClass: 'bg-blue-50 text-blue-700 border-blue-200/80',
        icon: <IconBuildingBank className="w-3.5 h-3.5 text-blue-600 shrink-0" />,
      };
    }
    if (method.includes('CHECK') || method.includes('CHEQUE')) {
      return {
        label: 'Cheque',
        ref: p.reference || '',
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-200/80',
        icon: <IconReceipt className="w-3.5 h-3.5 text-amber-600 shrink-0" />,
      };
    }
    if (method.includes('CASH')) {
      return {
        label: 'Cash',
        ref: p.reference || '',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
        icon: <IconCash className="w-3.5 h-3.5 text-emerald-600 shrink-0" />,
      };
    }
    if (p.cardLast4 || method.includes('CARD') || method.includes('VISA') || method.includes('STRIPE') || method.includes('RAZORPAY')) {
      return {
        label: p.cardLast4 ? `Card •••• ${p.cardLast4}` : 'Razorpay / Card',
        ref: p.reference || '',
        badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
        icon: <IconCreditCard className="w-3.5 h-3.5 text-indigo-600 shrink-0" />,
      };
    }
    return {
      label: method || 'Online Gateway',
      ref: p.reference || '',
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
      icon: <IconBuildingBank className="w-3.5 h-3.5 text-slate-500 shrink-0" />,
    };
  };

  const fetchBilling = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/company/billing');
      setData(res.data);
      if (res.data?.availablePackages && res.data.availablePackages.length > 0) {
        setSelectedPackageId(res.data.availablePackages[res.data.availablePackages.length - 1].id);
      }
    } catch (err) {
      console.error('Failed to load company billing:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBilling();
  }, []);

  const handleUpgradeSubmit = async (pkgId: number) => {
    setIsProcessingUpgrade(true);
    try {
      const res = await api.post('/subscription/upgrade', {
        packageId: pkgId,
        planType: selectedPlanType,
      });

      const orderData = res.data;
      if (orderData?.paymentLinkUrl) {
        // Open payment link or redirect
        window.location.href = orderData.paymentLinkUrl;
      } else {
        alert('Upgrade order initiated. Redirecting to checkout...');
        setIsUpgradeModalOpen(false);
        fetchBilling();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to initiate plan upgrade');
    } finally {
      setIsProcessingUpgrade(false);
    }
  };

  const plan = data?.plan;
  const pkg = plan?.package || {
    name: 'Enterprise Tier',
    employeeLimit: 100,
    features: ['time_attendance_management', 'leave_management', 'payroll', 'claims', 'ai_assistant'],
  };

  const limit = pkg.employeeLimit || 100;

  const daysRemaining = plan?.daysRemaining ?? null;
  const isExpiringSoon = plan?.isExpiringSoon || (daysRemaining !== null && daysRemaining <= 10);

  const visibleInvoices = (data?.invoices || []).filter(
    (inv) => inv.status !== 'VOID' && inv.status !== 'CANCELLED'
  );

  const filteredInvoices = visibleInvoices.filter((inv) => {
    const term = search.trim().toLowerCase();
    const matchesSearch =
      !term ||
      inv.invoiceNumber.toLowerCase().includes(term) ||
      String(inv.payment?.method || inv.payment?.paymentMethod || inv.payment?.provider || '').toLowerCase().includes(term) ||
      String(inv.amount).includes(term);

    const statusNorm = (inv.status || 'PAID').toUpperCase();
    const matchesStatus =
      selectedStatus === 'ALL' ||
      (selectedStatus === 'PAID' && statusNorm === 'PAID') ||
      (selectedStatus === 'PENDING' && statusNorm === 'PENDING');

    return matchesSearch && matchesStatus;
  });

  // Paginated invoices for current page
  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredInvoices.slice(start, start + pageSize);
  }, [filteredInvoices, currentPage, pageSize]);

  return (
    <div className="space-y-6 pb-12 print:p-0 print:m-0 print:max-w-none">
      {/* ===================== TOP HEADER BAR ===================== */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <IconReceipt2 className="w-5 h-5 text-indigo-600 shrink-0" />
            <span>Subscription & Billing</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Official tax invoices compliant with Indian GST (SAC 998313). Download or view printable receipts.
          </p>
        </div>
      </div>

      {/* URGENT 10-DAY EXPIRY ALERT BANNER */}
      {isExpiringSoon && (
        <div className="rounded-2xl p-5 sm:p-6 bg-gradient-to-r from-rose-500 via-rose-600 to-amber-600 text-white shadow-xl shadow-rose-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in duration-200 print:hidden">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
              <IconAlertTriangle className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/25 text-white mb-1">
                Action Required • 10-Day Expiry Notice
              </div>
              <h3 className="text-base font-bold text-white">
                Your HRMS Subscription Expires in {daysRemaining} Day{daysRemaining === 1 ? '' : 's'}!
              </h3>
              <p className="text-xs text-rose-100 mt-0.5 max-w-xl">
                Platform access will terminate on {plan?.subEndDate ? new Date(plan.subEndDate).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' }) : 'soon'}. Renew or upgrade now via Razorpay to ensure zero disruption to employee biometric clock-ins and payroll.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsUpgradeModalOpen(true)}
            className="px-6 py-2.5 rounded-xl bg-white text-rose-700 hover:bg-rose-50 text-xs font-black shadow-md transition-all cursor-pointer whitespace-nowrap self-start sm:self-auto"
          >
            Renew Subscription Now
          </button>
        </div>
      )}

      {/* ===================== ROW 2: SEARCH & FILTERS BAR ===================== */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 print:hidden">
        {/* Search Input */}
        <div className="relative flex-1">
          <IconSearch className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search invoice by number or payment method..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-10 py-2.5 text-xs font-medium bg-slate-50/70 border border-slate-200/80 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#5E4BE2]/20 focus:border-[#5E4BE2] transition-all placeholder:text-slate-400 text-slate-800"
          />
          {search && (
            <button
              onClick={() => {
                setSearch('');
                setCurrentPage(1);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
            >
              <IconX className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status Filter Pills & Count */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center bg-slate-50/80 border border-slate-200/70 p-1 rounded-xl">
            {(['ALL', 'PAID', 'PENDING'] as const).map((mode) => {
              const label = mode === 'ALL' ? 'All' : mode === 'PAID' ? 'Paid' : 'Pending';
              const isActive = selectedStatus === mode;
              return (
                <button
                  key={mode}
                  onClick={() => {
                    setSelectedStatus(mode);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${isActive
                      ? 'bg-white text-[#5E4BE2] shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                    }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Record Count Badge */}
          <span className="hidden sm:inline-flex px-3 py-2 rounded-xl bg-indigo-50/70 text-[#5E4BE2] text-xs font-bold border border-indigo-100/60 shrink-0">
            {filteredInvoices.length} {filteredInvoices.length === 1 ? 'record' : 'records'}
          </span>
        </div>
      </div>

      {/* ===================== ROW 3: TAX INVOICES TABLE ===================== */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden print:hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-[#e5e7eb] text-xs font-bold text-slate-900 border-b border-slate-300">
              <tr>
                <th className="px-6 py-3.5 whitespace-nowrap">Invoice #</th>
                <th className="px-6 py-3.5 whitespace-nowrap">Billing Period</th>
                <th className="px-6 py-3.5 whitespace-nowrap">Issued Date</th>
                <th className="px-6 py-3.5 whitespace-nowrap">Payment Method</th>
                <th className="px-6 py-3.5 whitespace-nowrap">Amount (INR)</th>
                <th className="px-6 py-3.5 whitespace-nowrap">Status</th>
                <th className="px-6 py-3.5 whitespace-nowrap text-right">Tax Invoice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="w-28 h-3.5 bg-slate-200 rounded-sm" /></td>
                    <td className="px-6 py-4"><div className="w-36 h-3.5 bg-slate-200 rounded-sm" /></td>
                    <td className="px-6 py-4"><div className="w-24 h-3.5 bg-slate-200 rounded-sm" /></td>
                    <td className="px-6 py-4"><div className="w-24 h-3.5 bg-slate-200 rounded-sm" /></td>
                    <td className="px-6 py-4"><div className="w-24 h-3.5 bg-slate-200 rounded-sm" /></td>
                    <td className="px-6 py-4"><div className="w-16 h-4 bg-slate-200 rounded-full" /></td>
                    <td className="px-6 py-4 text-right"><div className="w-24 h-4 bg-slate-200 rounded-xl ml-auto" /></td>
                  </tr>
                ))
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-14 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-[#5E4BE2] flex items-center justify-center mx-auto mb-3 shadow-2xs">
                      <IconReceipt2 className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-slate-800">No invoices recorded</p>
                    <p className="text-xs text-slate-400 mt-1">
                      No tax invoices found matching your criteria. Invoices are generated automatically on subscription renewals.
                    </p>
                    {(search || selectedStatus !== 'ALL') && (
                      <button
                        onClick={() => {
                          setSearch('');
                          setSelectedStatus('ALL');
                        }}
                        className="mt-3 text-xs font-bold text-[#5E4BE2] hover:underline cursor-pointer"
                      >
                        Reset filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedInvoices.map((inv: InvoiceItem) => {
                  const methodInfo = getPaymentMethodInfo(inv);
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {inv.invoiceNumber}
                      </td>
                      <td className="px-6 py-4 text-xs whitespace-nowrap text-slate-600">
                        {new Date(inv.periodStart).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} –{' '}
                        {new Date(inv.periodEnd).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">
                        {new Date(inv.issuedAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4 text-xs whitespace-nowrap">
                        <div className="flex flex-col gap-0.5">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${methodInfo.badgeClass} whitespace-nowrap shrink-0 w-fit`}>
                            {methodInfo.icon}
                            {methodInfo.label}
                          </span>
                          {methodInfo.ref && (
                            <span className="text-[10px] text-slate-400 font-mono pl-0.5">
                              Ref: {methodInfo.ref}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900 whitespace-nowrap">
                        ₹{Number(inv.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap shrink-0">
                          <IconCheck className="w-3.5 h-3.5" />
                          {inv.status || 'PAID'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => setSelectedInvoiceForView(inv)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-[#5E4BE2] hover:text-[#4d3cc9] shadow-2xs transition-colors cursor-pointer whitespace-nowrap"
                        >
                          <IconFileText className="w-3.5 h-3.5" />
                          View Tax Invoice
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
        <TablePagination
          currentPage={currentPage}
          totalItems={filteredInvoices.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[5, 10, 20, 50]}
          itemName="invoices"
        />
      </div>

      {/* MODAL: UPGRADE / RENEW PLAN (3 TIERS) */}
      {isUpgradeModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl p-6 sm:p-8 border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-6 border-b border-slate-100">
              <div>
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <IconCrown className="w-6 h-6 text-[#5E4BE2]" />
                  Upgrade or Renew Platform Subscription
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Choose a subscription tier. Instant activation through Razorpay.
                </p>
              </div>
              <button
                onClick={() => setIsUpgradeModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <IconX className="w-5 h-5" />
              </button>
            </div>

            {/* Billing Cycle Switch */}
            <div className="flex items-center justify-center my-6">
              <div className="p-1 bg-slate-100 rounded-2xl flex items-center gap-1 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setSelectedPlanType('MONTHLY')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${selectedPlanType === 'MONTHLY' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Monthly Billing
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPlanType('YEARLY')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${selectedPlanType === 'YEARLY' ? 'bg-[#5E4BE2] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  <span>Yearly Billing</span>
                  <span className="text-[10px] bg-emerald-400 text-slate-950 font-black px-1.5 py-0.5 rounded-full">
                    SAVE 20%
                  </span>
                </button>
              </div>
            </div>

            {/* 3 Tier Plans Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {(data?.availablePackages || []).map((p) => {
                const isSelected = selectedPackageId === p.id;
                const price = selectedPlanType === 'YEARLY' ? Number(p.priceYearly) : Number(p.priceMonthly);
                const isCurrent = pkg.name === p.name;

                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPackageId(p.id)}
                    className={`rounded-2xl p-6 border-2 transition-all cursor-pointer flex flex-col justify-between relative ${isSelected ? 'border-[#5E4BE2] bg-[#5E4BE2]/5 shadow-lg shadow-[#5E4BE2]/10' : 'border-slate-200 hover:border-slate-300 bg-white'}`}
                  >
                    {isCurrent && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider">
                        Current Plan
                      </span>
                    )}

                    <div className="space-y-4">
                      <div>
                        <h4 className="text-base font-bold text-slate-900">{p.name}</h4>
                        <p className="text-[11px] text-slate-500 mt-1 min-h-[32px]">{p.description}</p>
                      </div>

                      <div className="pt-2 border-t border-slate-100">
                        <span className="text-2xl font-black text-slate-900 font-mono">
                          ₹{price.toLocaleString('en-IN')}
                        </span>
                        <span className="text-xs text-slate-400"> / {selectedPlanType.toLowerCase()}</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">+ 18% GST</span>
                      </div>

                      <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                        <div className="flex items-center gap-1.5 font-bold text-slate-800">
                          <IconCheck className="w-3.5 h-3.5 text-[#5E4BE2]" />
                          <span>Up to {p.employeeLimit} employees</span>
                        </div>
                        {(p.enabledFeatures || []).slice(0, 5).map((feat, idx) => (
                          <div key={idx} className="flex items-center gap-1.5 text-[11px] text-slate-600">
                            <IconCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>{feat.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isProcessingUpgrade}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpgradeSubmit(p.id);
                      }}
                      className={`w-full mt-6 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${isSelected ? 'bg-[#5E4BE2] text-white hover:bg-[#4d3cc9]' : 'bg-slate-100 text-slate-800 hover:bg-slate-200'}`}
                    >
                      <IconCreditCard className="w-4 h-4" />
                      <span>{isProcessingUpgrade ? 'Connecting...' : `Select & Pay with Razorpay`}</span>
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <IconLock className="w-3.5 h-3.5" />
                Payments processed securely by Razorpay • Instant GST Tax Receipt
              </span>
              <button
                type="button"
                onClick={() => setIsUpgradeModalOpen(false)}
                className="font-bold text-slate-600 hover:underline cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* DRAWER: AUTHENTIC PRINTABLE GST TAX INVOICE (RIGHT SIDE SLIDE-OVER) */}
      <TaxInvoicePdfDrawer
        invoice={selectedInvoiceForView}
        company={company}
        seatsCount={limit}
        onClose={() => setSelectedInvoiceForView(null)}
      />
    </div>
  );
};

export default CompanyBillingPage;
