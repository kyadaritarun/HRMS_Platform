import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import {
  IconCreditCard,
  IconCheck,
  IconReceipt2,
  IconPrinter,
  IconX,
  IconFileText,
  IconBuildingBank,
  IconCash,
  IconReceipt,
  IconQrcode,
  IconSparkles,
  IconAlertTriangle,
  IconShieldCheck,
  IconArrowUpRight,
  IconCrown,
  IconClock,
  IconUsers,
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

export const CompanyBillingPage: React.FC = () => {
  const { company } = useAuth();
  const [data, setData] = useState<BillingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedInvoiceForView, setSelectedInvoiceForView] = useState<InvoiceItem | null>(null);

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
  const activeCount = data?.activeEmployeeCount || 1;
  const seatPercentage = Math.min(100, Math.round((activeCount / limit) * 100));

  const daysRemaining = plan?.daysRemaining ?? null;
  const isExpiringSoon = plan?.isExpiringSoon || (daysRemaining !== null && daysRemaining <= 10);

  const visibleInvoices = (data?.invoices || []).filter(
    (inv) => inv.status !== 'VOID' && inv.status !== 'CANCELLED'
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 print:p-0 print:m-0 print:max-w-none">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <IconReceipt2 className="w-7 h-7 text-[#5E4BE2]" />
            Subscription & Billing
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your company's tier, employee capacity limits, and GST tax invoices.
          </p>
        </div>

        <button
          onClick={() => setIsUpgradeModalOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#5E4BE2] to-[#7B69EE] hover:from-[#4d3cc9] hover:to-[#6855dd] text-white text-xs font-bold shadow-md shadow-[#5E4BE2]/20 hover:shadow-lg transition-all cursor-pointer shrink-0"
        >
          <IconSparkles className="w-4 h-4" />
          <span>Upgrade or Renew Plan</span>
        </button>
      </div>

      {/* URGENT 10-DAY EXPIRY ALERT BANNER */}
      {isExpiringSoon && (
        <div className="rounded-3xl p-5 sm:p-6 bg-gradient-to-r from-rose-500 via-rose-600 to-amber-600 text-white shadow-xl shadow-rose-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in duration-200 print:hidden">
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

      {/* CURRENT SUBSCRIPTION OVERVIEW CARD */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-6 print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#5E4BE2]/10 text-[#5E4BE2] flex items-center justify-center font-bold">
              <IconCrown className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900">{pkg.name}</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {plan?.subIsActive ? 'Active Plan' : 'Inactive'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
                  {plan?.planType || 'MONTHLY'} Billing
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Workspace Tenant: <strong className="text-slate-800">{company?.subdomain || 'yourcompany'}.uptrix.io</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-right">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Subscription Expiry
              </span>
              <span className="text-xs font-bold text-slate-900">
                {plan?.subEndDate ? new Date(plan.subEndDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'Permanent'}
              </span>
              {daysRemaining !== null && (
                <span className={`text-[11px] font-semibold block ${daysRemaining <= 10 ? 'text-rose-600 font-bold' : 'text-slate-500'}`}>
                  {daysRemaining} days remaining
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Seat Usage & Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="flex items-center gap-1.5 font-semibold">
                <IconUsers className="w-4 h-4 text-slate-400" />
                Seat Capacity
              </span>
              <strong className="text-slate-900 font-bold">{activeCount} / {limit} Seats</strong>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2 mt-2 overflow-hidden">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${seatPercentage >= 90 ? 'bg-rose-500' : 'bg-[#5E4BE2]'}`}
                style={{ width: `${seatPercentage}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              {limit - activeCount} seats remaining for new hires
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 mb-1">
              <IconCreditCard className="w-4 h-4 text-slate-400" />
              Subscription Price
            </span>
            <div className="text-lg font-black text-slate-900 font-mono mt-1">
              ₹{Number(plan?.subAmount || (plan?.planType === 'YEARLY' ? 49999 : 4999)).toLocaleString('en-IN')}
              <span className="text-xs font-normal text-slate-500"> / {plan?.planType?.toLowerCase() || 'month'}</span>
            </div>
            <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">
              Includes 18% GST Compliance
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 mb-1">
              <IconShieldCheck className="w-4 h-4 text-slate-400" />
              Upgrade Availability
            </span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs font-bold text-slate-800">Higher Tiers Ready</span>
              <button
                onClick={() => setIsUpgradeModalOpen(true)}
                className="text-xs font-bold text-[#5E4BE2] hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <span>View Plans</span>
                <IconArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Instant activation via Razorpay
            </span>
          </div>
        </div>
      </div>

      {/* TAX INVOICES & BILLING RECORDS */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden print:hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <IconReceipt2 className="w-5 h-5 text-[#5E4BE2]" />
              Official Tax Invoices & Billing Receipts
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Official tax invoices compliant with Indian GST (SAC 998313). Download or view printable receipts.
            </p>
          </div>

          {visibleInvoices.length > 0 && (
            <span className="text-xs font-semibold text-slate-500">
              {visibleInvoices.length} invoice{visibleInvoices.length === 1 ? '' : 's'} recorded
            </span>
          )}
        </div>

        {visibleInvoices.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <IconReceipt2 className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <h4 className="text-sm font-bold text-slate-700">No Billing Invoices Generated Yet</h4>
            <p className="text-xs text-slate-500 mt-1">Invoices appear automatically upon renewal or billing cycles.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase border-b border-slate-100">
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
                {visibleInvoices.map((inv) => {
                  const methodInfo = getPaymentMethodInfo(inv);
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {inv.invoiceNumber}
                      </td>
                      <td className="px-6 py-4 text-xs whitespace-nowrap">
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
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: UPGRADE / RENEW PLAN (3 TIERS) */}
      {isUpgradeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl p-6 sm:p-8 border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-8">
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
        </div>
      )}

      {/* MODAL: AUTHENTIC PRINTABLE GST TAX INVOICE */}
      {selectedInvoiceForView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto print:static print:inset-auto print:bg-white print:p-0 print:overflow-visible">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl p-8 border border-slate-200 my-8 animate-in fade-in zoom-in-95 duration-150 print:border-none print:shadow-none print:p-6 print:m-0 print:max-w-none print:w-full print:rounded-none">
            {/* Modal Controls Bar */}
            <div className="flex items-center justify-between pb-6 border-b border-slate-100 print:hidden no-print">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Official GST Tax Invoice • SAC 998313
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer"
                >
                  <IconPrinter className="w-3.5 h-3.5" />
                  Print / PDF
                </button>
                <button
                  onClick={() => setSelectedInvoiceForView(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
                >
                  <IconX className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Invoice Body */}
            <div className="pt-6 space-y-6 print:pt-0">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">UPTRIX HRMS</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Uptrix Cloud Solutions India Pvt. Ltd.</p>
                  <p className="text-[11px] text-slate-400">GSTIN: 36AAACU9182F1Z8 • SAC Code: 998313</p>
                  <p className="text-[11px] text-slate-400">Cyber City, Financial District, Hyderabad, India</p>
                </div>

                <div className="text-right">
                  <div className="inline-block px-3 py-1 rounded-full text-xs font-black tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 mb-2">
                    PAID IN FULL
                  </div>
                  <div className="font-mono font-bold text-slate-900 text-base">
                    {selectedInvoiceForView.invoiceNumber}
                  </div>
                  <span className="text-xs text-slate-500 block">
                    Issued: {new Date(selectedInvoiceForView.issuedAt).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">BILLED TO</span>
                  <strong className="text-slate-900 block mt-1 text-sm">
                    {company?.name || 'Company Workspace'}
                  </strong>
                  <span className="text-slate-600 block mt-0.5">
                    Tenant: {company?.subdomain || 'company'}.uptrix.io
                  </span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">BILLING PERIOD & TRANSACTION</span>
                  <span className="text-slate-700 block mt-1">
                    Period: <strong>{new Date(selectedInvoiceForView.periodStart).toLocaleDateString()} to {new Date(selectedInvoiceForView.periodEnd).toLocaleDateString()}</strong>
                  </span>
                  <span className="text-slate-700 block mt-0.5">
                    Payment Method: <strong>{getPaymentMethodInfo(selectedInvoiceForView).label}</strong>
                  </span>
                  {selectedInvoiceForView.payment?.reference && (
                    <span className="text-slate-500 block mt-0.5 font-mono text-[11px]">
                      Reference / UTR: {selectedInvoiceForView.payment.reference}
                    </span>
                  )}
                </div>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 font-bold text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Item Description</th>
                      <th className="px-4 py-3 text-center">HSN/SAC</th>
                      <th className="px-4 py-3 text-center">Qty / Seats</th>
                      <th className="px-4 py-3 text-right">Amount (INR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="px-4 py-3.5">
                        <strong className="text-slate-900 block">
                          {selectedInvoiceForView.payment?.itemDescription || 'Enterprise SaaS Platform Annual Subscription'}
                        </strong>
                        <span className="text-slate-500 text-[11px]">
                          Automated Payroll, GPS Geofenced Attendance, KYC Vault & Priority SLA
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center font-mono">998313</td>
                      <td className="px-4 py-3.5 text-center font-bold">{limit} Seats</td>
                      <td className="px-4 py-3.5 text-right font-bold text-slate-900">
                        ₹{(Number(selectedInvoiceForView.amount) * 0.84745).toFixed(2)}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 text-slate-500">Central GST (CGST @ 9%)</td>
                      <td className="px-4 py-2.5 text-center font-mono">998313</td>
                      <td className="px-4 py-2.5 text-center">9%</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-slate-700">
                        ₹{(Number(selectedInvoiceForView.amount) * 0.07627).toFixed(2)}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 text-slate-500">State GST (SGST @ 9%)</td>
                      <td className="px-4 py-2.5 text-center font-mono">998313</td>
                      <td className="px-4 py-2.5 text-center">9%</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-slate-700">
                        ₹{(Number(selectedInvoiceForView.amount) * 0.07627).toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                  <tfoot className="bg-slate-50 border-t border-slate-200 font-bold text-sm">
                    <tr>
                      <td colSpan={3} className="px-4 py-3.5 text-right text-slate-900">Total Paid Amount:</td>
                      <td className="px-4 py-3.5 text-right text-brand-600 font-black">
                        ₹{Number(selectedInvoiceForView.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="pt-2 text-[11px] text-slate-400 leading-relaxed border-t border-slate-100 flex items-center justify-between">
                <span>This is a digitally generated tax receipt and requires no physical signature.</span>
                <span className="font-semibold text-slate-500">Uptrix HRMS Billing Platform</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyBillingPage;
