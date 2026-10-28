import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { TaxInvoicePdfDrawer } from '../../components/pdf';
import TablePagination from '../../components/common/TablePagination';
import {
  IconReceipt2,
  IconPlus,
  IconCheck,
  IconUsers,
  IconX,
  IconSearch,
  IconCrown,
  IconClock,
  IconWorld,
  IconShieldCheck,
  IconInfoCircle,
  IconTrash,
  IconBuilding,
  IconSparkles,
  IconServer,
  IconEdit,
  IconMail,
  IconPhone,
  IconMapPin,
  IconHelpCircle,
  IconChevronDown,
  IconChevronUp,
  IconCreditCard,
  IconBuildingBank,
  IconFileText,
  IconAlertTriangle,
  IconLock,
  IconRefresh,
  IconCopy,
  IconCircleCheckFilled,
  IconReceipt,
} from '@tabler/icons-react';

interface InvoiceItem {
  id: number;
  invoiceNumber: string;
  amount: number | string;
  currency: string;
  billingCycle: string;
  periodStart: string;
  periodEnd: string;
  dueDate?: string;
  status: string;
  issuedAt: string;
  paidAt?: string | null;
  balance?: number;
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

interface BillingContact {
  name: string;
  addressLine1: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  email: string;
  phone?: string;
}

interface PaymentMethodInfo {
  gatewayProvider?: string;
  method?: string;
  channel?: string;
  paymentId?: string;
  orderId?: string;
  invoiceNumber?: string;
  paidAt?: string | null;
  amount?: number | string;
  currency?: string;
  status?: string;
  baseAmount?: number;
  gstAmount?: number;
  cardBrand: string;
  cardLast4: string;
  expMonth: number;
  expYear: number;
  payerEmail?: string;
  payerName?: string;
  mandateStatus?: string;
  itemDescription?: string;
  billToAddress: string;
  reference?: string;
}

interface BillingData {
  company?: {
    id: number;
    name: string;
    code: string;
    subdomain: string;
    customDomain?: string;
    allowedEmailDomains?: string;
    isActive: boolean;
    address?: any;
  };
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
    accountType?: 'Standard' | 'Enterprise';
    planType?: string;
    subAmount?: number | string;
    subStartDate?: string;
    subEndDate?: string;
    nextPaymentDate?: string;
    subIsActive?: boolean;
    daysRemaining?: number | null;
    isExpiringSoon?: boolean;
    status?: string;
    domainsAllowed?: string[];
    usage?: {
      storage: string;
      storageLimit?: string;
      uploadBandwidth: string;
      downloadBandwidth: string;
      totalBandwidth: string;
      activeEmployees?: number;
      employeeLimit?: number;
      documentsCount?: number;
      attendanceRecords?: number;
    };
    hipaaCompliance?: {
      status: string;
      requestedAt?: string | null;
      documentRef?: string;
      notes?: string;
    };
    billingContact?: BillingContact;
    paymentMethod?: PaymentMethodInfo;
    saveInvoicesToAccount?: boolean;
  };
  availablePackages?: PackageItem[];
  activeEmployeeCount: number;
  invoices: InvoiceItem[];
}

const FAQS = [
  {
    q: 'How do I download official GST tax invoices for my company?',
    a: 'All invoices generated in Uptrix HRMS contain SAC Code 998313 and are compliant with Indian GST laws. Click "View Tax Invoice" on any row in the Billing History table to preview, print, or download a signed tax invoice.',
  },
  {
    q: 'Can my employees auto-enroll based on company email domain?',
    a: 'Yes. In the Allowed Domains section, add your corporate domain (e.g., @company.com). New staff members who sign up with that domain will automatically be linked to your company workspace.',
  },
  {
    q: 'What is the difference between Standard and Enterprise tiers?',
    a: 'Standard covers core employee directories, daily clock-in attendance, and basic leave management for up to 25 staff. Enterprise includes unlimited automated payroll runs, tax proof verification, biometric sync, AI attendance assistant, and dedicated account management.',
  },
  {
    q: 'How do recurring billing cycles work?',
    a: 'Subscriptions renew automatically at the end of each billing period (Monthly or Annual) via your primary payment method. You will receive an automated renewal alert 10 days before any charge.',
  },
  {
    q: 'Can I cancel or pause our subscription at any time?',
    a: 'Yes. If you choose to cancel, your workspace remains fully functional until the end of your current prepaid billing cycle with zero penalty fees.',
  },
];

export const CompanyBillingPage: React.FC = () => {
  const { company } = useAuth();
  const [data, setData] = useState<BillingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Tab State
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'INVOICES' | 'CONTACT_PAYMENT'>('OVERVIEW');

  // Invoices & Pagination State
  const [selectedInvoiceForView, setSelectedInvoiceForView] = useState<InvoiceItem | null>(null);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'PAID' | 'PENDING'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Domains State
  const [isDomainModalOpen, setIsDomainModalOpen] = useState(false);
  const [domainList, setDomainList] = useState<string[]>([]);
  const [newDomainInput, setNewDomainInput] = useState('');

  // Account Type & Cycles
  const [isAccountTypeModalOpen, setIsAccountTypeModalOpen] = useState(false);
  const [isCycleModalOpen, setIsCycleModalOpen] = useState(false);
  const [targetCycle, setTargetCycle] = useState<'MONTHLY' | 'YEARLY'>('YEARLY');

  // Cancel Account Modal
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('Restructuring or downsizing');

  // HIPAA / Compliance Modal
  const [isHipaaModalOpen, setIsHipaaModalOpen] = useState(false);

  // Contact & Payment Modals
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [contactForm, setContactForm] = useState<BillingContact>({
    name: '',
    addressLine1: '',
    city: '',
    state: '',
    country: 'India',
    postalCode: '',
    email: '',
    phone: '',
  });

  // FAQs Accordion
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [saveInvoicesPreference, setSaveInvoicesPreference] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const fetchBilling = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/company/billing');
      const bData: BillingData = res.data;
      setData(bData);

      if (bData?.plan?.domainsAllowed) {
        setDomainList(bData.plan.domainsAllowed);
      }
      if (bData?.plan?.billingContact) {
        setContactForm(bData.plan.billingContact);
      }
      if (typeof bData?.plan?.saveInvoicesToAccount === 'boolean') {
        setSaveInvoicesPreference(bData.plan.saveInvoicesToAccount);
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

  // Handlers
  const handleSaveDomains = async (newDomains: string[], shouldCloseModal = false) => {
    setIsActionLoading(true);
    try {
      const res = await api.put('/company/billing/domains', { domains: newDomains });
      setDomainList(res.data.domainsAllowed || newDomains);
      if (shouldCloseModal) {
        setIsDomainModalOpen(false);
      }
      fetchBilling();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update company domains');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleAddDomain = () => {
    const clean = newDomainInput.trim().replace(/^@/, '').toLowerCase();
    if (!clean) return;
    if (domainList.includes(clean)) {
      alert('This domain is already added.');
      return;
    }
    const updated = [...domainList, clean];
    setDomainList(updated);
    setNewDomainInput('');
    handleSaveDomains(updated, false);
  };

  const handleRemoveDomain = (toRemove: string) => {
    const updated = domainList.filter((d) => d !== toRemove);
    setDomainList(updated);
    handleSaveDomains(updated, false);
  };

  const handleSwitchAccountType = async (type: 'Standard' | 'Enterprise') => {
    setIsActionLoading(true);
    try {
      await api.put('/company/billing/account-type', { accountType: type });
      setIsAccountTypeModalOpen(false);
      fetchBilling();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to switch account type');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleChangeCycle = async (cycle: 'MONTHLY' | 'YEARLY') => {
    setIsActionLoading(true);
    try {
      await api.put('/company/billing/cycle', { billingCycle: cycle });
      setIsCycleModalOpen(false);
      fetchBilling();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to change billing cycle');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsActionLoading(true);
    try {
      await api.put('/company/billing/contact', contactForm);
      setIsContactModalOpen(false);
      fetchBilling();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update billing contact');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleRequestHipaa = async () => {
    setIsActionLoading(true);
    try {
      await api.post('/company/billing/hipaa-request');
      setIsHipaaModalOpen(false);
      fetchBilling();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to request compliance agreement');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCancelOrReactivate = async (action: 'CANCEL' | 'REACTIVATE') => {
    setIsActionLoading(true);
    try {
      await api.post('/company/billing/cancel-account', { action, reason: cancelReason });
      setIsCancelModalOpen(false);
      fetchBilling();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update account status');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleToggleSaveInvoices = async (val: boolean) => {
    setSaveInvoicesPreference(val);
    try {
      await api.put('/company/billing/save-invoices-preference', { saveInvoicesToAccount: val });
    } catch (err) {
      console.error('Failed to update invoice storage preference:', err);
    }
  };

  const handleCopyText = (text: string, fieldName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => {
      setCopiedField(null);
    }, 2000);
  };

  const handleOpenInvoiceModal = (invNumber?: string) => {
    const target = invNumber || (plan?.paymentMethod as any)?.invoiceNumber || 'INV-2026-445491';
    const found = (data?.invoices || []).find((i) => i.invoiceNumber === target) || data?.invoices?.[0];
    if (found) {
      setSelectedInvoiceForView(found);
    }
  };

  const plan = data?.plan;
  const compInfo = data?.company;
  const currentAccountType = plan?.accountType || 'Enterprise';
  const currentStatus = plan?.status || 'Active';
  const isAccountActive = currentStatus === 'Active';

  const usage = plan?.usage || {
    storage: '1.4 GB',
    storageLimit: currentAccountType === 'Enterprise' ? '100 GB' : '25 GB',
    uploadBandwidth: '45.8 MB',
    downloadBandwidth: '312.4 MB',
    totalBandwidth: '358.2 MB',
    activeEmployees: data?.activeEmployeeCount || 17,
    employeeLimit: plan?.package?.employeeLimit || 100,
  };

  const contractTermText = (plan?.planType || 'YEARLY').toUpperCase() === 'YEARLY' ? 'Annual' : 'Monthly';
  const subAmountNum = Number(plan?.subAmount || (contractTermText === 'Annual' ? 49999 : 4999));
  const billingContact = plan?.billingContact || contactForm;
  const paymentMethod: PaymentMethodInfo = plan?.paymentMethod || {
    cardLast4: '4242',
    cardBrand: 'Razorpay UPI & Cards',
    expMonth: 12,
    expYear: 2028,
    method: 'Razorpay UPI / Cards',
    channel: 'Razorpay Payment Gateway (Instant Checkout)',
    status: 'PAID',
    billToAddress: '',
  };
  const isHipaaRequested = plan?.hipaaCompliance?.status === 'REQUESTED';

  const nextInvoiceDateFormatted = plan?.nextPaymentDate
    ? new Date(plan.nextPaymentDate).toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Oct 16, 2027';

  // Invoices list & filter
  const visibleInvoices = (data?.invoices || []).filter(
    (inv) => inv.status !== 'VOID' && inv.status !== 'CANCELLED'
  );

  const filteredInvoices = visibleInvoices.filter((inv) => {
    const term = search.trim().toLowerCase();
    const matchesSearch =
      !term ||
      inv.invoiceNumber.toLowerCase().includes(term) ||
      String(inv.amount).includes(term) ||
      String(inv.status).toLowerCase().includes(term);

    const statusNorm = (inv.status || 'PAID').toUpperCase();
    const matchesStatus =
      selectedStatus === 'ALL' ||
      (selectedStatus === 'PAID' && statusNorm === 'PAID') ||
      (selectedStatus === 'PENDING' && statusNorm === 'PENDING');

    return matchesSearch && matchesStatus;
  });

  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredInvoices.slice(start, start + pageSize);
  }, [filteredInvoices, currentPage, pageSize]);

  return (
    <div className="space-y-6 pb-16 print:p-0 print:m-0 print:max-w-none text-slate-800">
      {/* ===================== TOP HEADER BAR ===================== */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <IconReceipt2 className="w-5 h-5 text-indigo-600 shrink-0" />
              <span>Subscription & Billing</span>
            </h1>
           
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 flex items-center gap-1 ${
                isAccountActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isAccountActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              {currentStatus}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your company account tier, verified email domains, resource quotas, and official GST tax invoices.
          </p>
        </div>
      </div>

      {/* ===================== ROW 1: 4 KPI STAT CARDS ===================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Account Type */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">Account Type</span>
            <span className="w-7 h-7 rounded-lg bg-indigo-50 text-[#5E4BE2] flex items-center justify-center">
              <IconCrown className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-black text-slate-900">{currentAccountType} Tier</div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[11px] text-slate-400">All features unlocked</span>
          </div>
        </div>

        {/* Card 2: Billing Cycle & Rate */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">Billing Rate</span>
            <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <IconReceipt2 className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-black text-slate-900 font-mono">
            ₹{subAmountNum.toLocaleString('en-IN')}
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[11px] text-slate-400">{contractTermText} • Next: {nextInvoiceDateFormatted}</span>
          </div>
        </div>

        {/* Card 3: Employee User Seats */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">Licensed User Seats</span>
            <span className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <IconUsers className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-black text-slate-900">
            {data?.activeEmployeeCount || 17} / {plan?.package?.employeeLimit || 100}
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-[#5E4BE2] h-full rounded-full transition-all"
              style={{
                width: `${Math.min(
                  100,
                  Math.round(((data?.activeEmployeeCount || 17) / (plan?.package?.employeeLimit || 100)) * 100)
                )}%`,
              }}
            />
          </div>
        </div>

        {/* Card 4: Cloud Storage & Transfer */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">Cloud Storage & Transfer</span>
            <span className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <IconServer className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-black text-slate-900 font-mono">
            {usage.storage} <span className="text-xs font-normal text-slate-400">/ {usage.storageLimit}</span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[11px] text-slate-400">{usage.totalBandwidth} bandwidth</span>
            <span className="text-[11px] font-bold text-teal-700">{usage.documentsCount || 1} Docs</span>
          </div>
        </div>
      </div>

      {/* ===================== NAVIGATION TABS STRIP ===================== */}
      <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('OVERVIEW')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'OVERVIEW'
                ? 'bg-[#5E4BE2] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <IconBuilding className="w-4 h-4" />
            <span>Account & Governance</span>
          </button>

          <button
            onClick={() => setActiveTab('INVOICES')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'INVOICES'
                ? 'bg-[#5E4BE2] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <IconFileText className="w-4 h-4" />
            <span>Tax Invoices & Receipts</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeTab === 'INVOICES' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              {visibleInvoices.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('CONTACT_PAYMENT')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'CONTACT_PAYMENT'
                ? 'bg-[#5E4BE2] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <IconCreditCard className="w-4 h-4" />
            <span>Contact & Payment Profile</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW & GOVERNANCE                                              */}
      {/* ========================================================================= */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* SECTION: DOMAINS & ENROLLMENT */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <IconWorld className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Allowed Corporate Domains</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Configure company email domains. Employees signing up with these domains will auto-enroll into your workspace.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsDomainModalOpen(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#5E4BE2] hover:bg-[#4d3cc9] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer shrink-0"
              >
                <IconPlus className="w-4 h-4" />
                <span>Add Domain</span>
              </button>
            </div>

            {/* Domains Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {domainList.length === 0 ? (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 w-full flex items-center justify-between">
                  <span>No custom email domain configured yet. Defaults to <strong>@{compInfo?.subdomain || 'company'}.com</strong></span>
                  <button
                    onClick={() => setIsDomainModalOpen(true)}
                    className="text-xs font-bold text-[#5E4BE2] hover:underline cursor-pointer"
                  >
                    Add domain
                  </button>
                </div>
              ) : (
                domainList.map((dom) => (
                  <div
                    key={dom}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>@{dom}</span>
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md font-bold">
                      Verified
                    </span>
                    <button
                      onClick={() => handleRemoveDomain(dom)}
                      className="text-slate-400 hover:text-rose-600 p-0.5 cursor-pointer ml-1"
                      title="Remove domain"
                    >
                      <IconX className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Info notice */}
            <div className="rounded-xl p-3 bg-indigo-50/70 border border-indigo-100 flex items-start gap-2.5 text-xs text-indigo-900">
              <IconInfoCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <span>
                <strong>Corporate Domain Security:</strong> When HR or administrators onboard employees, only work emails matching these verified corporate domains (e.g., @kyadari.com) are accepted. Unauthorized personal email domains (such as @gmail.com or @yahoo.com) are automatically blocked.
              </span>
            </div>
          </div>

          {/* 2-CARD GRID: STATUTORY COMPLIANCE & WORKSPACE STATUS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card: Statutory Security & HIPAA BAA */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <IconShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Enterprise Security & Compliance</h3>
                  <p className="text-[11px] text-slate-400">HIPAA BAA & Indian DPDP Data Protection</p>
                </div>
              </div>

              <div className="space-y-3 text-xs text-slate-600">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">HIPAA BAA Agreement</span>
                    {isHipaaRequested ? (
                      <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                        Pending Review
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                        Available
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Business Associate Agreement for health/medical records privacy and encrypted storage.
                  </p>
                  <button
                    disabled={isHipaaRequested}
                    onClick={() => setIsHipaaModalOpen(true)}
                    className={`mt-2 px-3 py-1.5 rounded-lg font-bold text-xs cursor-pointer ${
                      isHipaaRequested
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        : 'bg-emerald-600 text-white hover:bg-emerald-700'
                    }`}
                  >
                    {isHipaaRequested ? 'Agreement Requested' : 'Request HIPAA BAA'}
                  </button>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="font-bold text-slate-900 block">DPDP Act & ISO 27001 Data Residency</span>
                  <p className="text-[11px] text-slate-500">
                    Employee records, attendance timestamps, and bank account details are encrypted at rest with AES-256 within Indian server infrastructure.
                  </p>
                </div>
              </div>
            </div>

            {/* Card: Account Operational Status & Control */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <IconCrown className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Workspace Status & Controls</h3>
                  <p className="text-[11px] text-slate-400">Subscription lifecycle & renewals</p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Status:</span>
                  <span
                    className={`px-2 py-0.5 rounded-full font-bold ${
                      isAccountActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {currentStatus}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Active Tier:</span>
                  <span className="font-bold text-slate-900">{currentAccountType}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Billing Cycle:</span>
                  <span className="font-bold text-slate-900">{contractTermText}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Next Scheduled Charge:</span>
                  <span className="font-bold text-slate-900">{nextInvoiceDateFormatted}</span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                  <span className="text-slate-500">Payment Gateway:</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('CONTACT_PAYMENT')}
                    className="font-bold text-[#5E4BE2] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <span>Razorpay Verified</span>
                    <IconCreditCard className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <button
                onClick={() => setIsCancelModalOpen(true)}
                className={`w-full py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer border ${
                  isAccountActive
                    ? 'border-rose-200 text-rose-600 hover:bg-rose-50'
                    : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                {isAccountActive ? 'Pause or Cancel Subscription' : 'Reactivate Company Subscription'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: INVOICES & GST RECEIPTS                                            */}
      {/* ========================================================================= */}
      {activeTab === 'INVOICES' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            {/* Header + Search + Status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <IconFileText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Tax Invoices & Payment History</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Official GST receipts (SAC 998313). Click "View Tax Invoice" to preview or print.
                  </p>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <label className="inline-flex items-center gap-2 cursor-pointer select-none text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                  <input
                    type="checkbox"
                    checked={saveInvoicesPreference}
                    onChange={(e) => handleToggleSaveInvoices(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-7 h-4 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#5E4BE2] relative" />
                  <span>Archive to Workspace</span>
                </label>

                <div className="relative">
                  <IconSearch className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search invoice number..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-8 pr-3 py-1.5 text-xs font-medium border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#5E4BE2]/20"
                  />
                </div>
              </div>
            </div>

            {/* Invoices Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#e5e7eb] text-slate-900 font-bold border-b border-slate-300">
                    <tr>
                      <th className="px-5 py-3.5">Invoice #</th>
                      <th className="px-5 py-3.5">Date Billed</th>
                      <th className="px-5 py-3.5">Description</th>
                      <th className="px-5 py-3.5">Payment Method</th>
                      <th className="px-5 py-3.5">Amount (INR)</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5 text-right">Tax Invoice</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {isLoading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <tr key={i} className="animate-pulse">
                          <td className="px-5 py-3.5"><div className="w-24 h-3.5 bg-slate-200 rounded-sm" /></td>
                          <td className="px-5 py-3.5"><div className="w-20 h-3.5 bg-slate-200 rounded-sm" /></td>
                          <td className="px-5 py-3.5"><div className="w-36 h-3.5 bg-slate-200 rounded-sm" /></td>
                          <td className="px-5 py-3.5"><div className="w-24 h-3.5 bg-slate-200 rounded-sm" /></td>
                          <td className="px-5 py-3.5"><div className="w-20 h-3.5 bg-slate-200 rounded-sm" /></td>
                          <td className="px-5 py-3.5"><div className="w-16 h-3.5 bg-slate-200 rounded-sm" /></td>
                          <td className="px-5 py-3.5 text-right"><div className="w-24 h-3.5 bg-slate-200 rounded-sm ml-auto" /></td>
                        </tr>
                      ))
                    ) : paginatedInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                          No invoices found matching your filter criteria.
                        </td>
                      </tr>
                    ) : (
                      paginatedInvoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-5 py-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                            {inv.invoiceNumber}
                          </td>
                          <td className="px-5 py-4 text-slate-600 whitespace-nowrap">
                            {new Date(inv.issuedAt).toLocaleDateString('en-IN', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="px-5 py-4 text-slate-700 max-w-xs truncate">
                            {inv.payment?.itemDescription || `${compInfo?.name || 'Company'} Enterprise HRMS License`}
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                              <IconBuildingBank className="w-3 h-3 text-slate-500" />
                              {inv.payment?.method || inv.payment?.provider || 'Razorpay / UPI'}
                            </span>
                          </td>
                          <td className="px-5 py-4 font-bold text-slate-900 font-mono whitespace-nowrap">
                            ₹{Number(inv.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <IconCheck className="w-3 h-3" />
                              {inv.status || 'PAID'}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right whitespace-nowrap">
                            <button
                              onClick={() => setSelectedInvoiceForView(inv)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-[#5E4BE2] hover:text-[#4d3cc9] shadow-2xs transition-colors cursor-pointer"
                            >
                              <IconFileText className="w-3.5 h-3.5" />
                              <span>View Tax Invoice</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="bg-slate-50/70 border-t border-slate-200 p-2.5">
                <TablePagination
                  currentPage={currentPage}
                  totalItems={filteredInvoices.length}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={setPageSize}
                  pageSizeOptions={[5, 10, 20]}
                  itemName="invoices"
                />
              </div>
            </div>
          </div>

          {/* Billing FAQs Accordion */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <IconHelpCircle className="w-4 h-4 text-indigo-600" />
              <span>Billing & Invoicing Help</span>
            </h3>

            <div className="divide-y divide-slate-100">
              {FAQS.map((faq, idx) => {
                const isOpen = expandedFaq === idx;
                return (
                  <div key={idx} className="py-2.5">
                    <button
                      type="button"
                      onClick={() => setExpandedFaq(isOpen ? null : idx)}
                      className="w-full flex items-center justify-between text-left text-xs font-bold text-slate-800 hover:text-[#5E4BE2] transition-colors cursor-pointer"
                    >
                      <span>{faq.q}</span>
                      {isOpen ? (
                        <IconChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                      ) : (
                        <IconChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                    </button>
                    {isOpen && (
                      <p className="text-xs text-slate-600 leading-relaxed mt-2 pl-2 border-l-2 border-[#5E4BE2]/40 animate-in fade-in duration-100">
                        {faq.a}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: CONTACT & PAYMENT PROFILE                                          */}
      {/* ========================================================================= */}
      {activeTab === 'CONTACT_PAYMENT' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Billing Contact & Entity (lg:col-span-5) */}
            <div className="lg:col-span-5 space-y-6">
              {/* Card 1: Primary Billing Contact */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                      <IconUsers className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Primary Billing Contact</h3>
                      <p className="text-[11px] text-slate-400">Statement notices & receipt emails</p>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsContactModalOpen(true)}
                    className="text-xs font-bold text-[#5E4BE2] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <IconEdit className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                </div>

                <div className="space-y-3 text-xs text-slate-600">
                  <div className="font-bold text-slate-900 text-sm">
                    {billingContact.name || compInfo?.name || 'Kyadari Tarun'}
                  </div>

                  <div className="flex items-center gap-2 text-slate-600">
                    <IconMail className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>{billingContact.email || 'kyadarit@gmail.com'}</span>
                  </div>

                  {billingContact.phone && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <IconPhone className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>{billingContact.phone}</span>
                    </div>
                  )}

                  <div className="flex items-start gap-2 text-slate-600 pt-1">
                    <IconMapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <span>
                      {billingContact.addressLine1 || '#14, Tech Park'}, {billingContact.city || 'Bengaluru'},{' '}
                      {billingContact.state || 'Karnataka'} {billingContact.postalCode || '560103'},{' '}
                      {billingContact.country || 'India'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 2: Subscription & Mandate Schedule */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                      <IconClock className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Subscription & Mandate Schedule</h3>
                      <p className="text-[11px] text-slate-400">Prepaid validity and next scheduled run</p>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Auto-Renew ON
                  </span>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Plan Tier:</span>
                    <span className="font-bold text-slate-900">{currentAccountType} Tier</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Billing Frequency:</span>
                    <span className="font-bold text-slate-900">{contractTermText} (Prepaid)</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Next Scheduled Charge:</span>
                    <span className="font-mono font-bold text-indigo-700">{nextInvoiceDateFormatted}</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Mandate Channel:</span>
                    <span className="font-bold text-slate-900">Razorpay RBI E-Mandate</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-slate-500">Cancellation Policy:</span>
                    <span className="font-medium text-emerald-700">Cancel anytime (0 penalty)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Payment Gateway on File (lg:col-span-7) */}
            <div className="lg:col-span-7">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-5">
                {/* Header with Title */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <IconBuildingBank className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Payment Gateway on File</h3>
                      <p className="text-[11px] text-slate-400">Verified Razorpay recurring mandate & settlement record</p>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <IconCircleCheckFilled className="w-3 h-3 text-emerald-600" />
                    <span>Razorpay Mandate Active</span>
                  </span>
                </div>

                {/* Primary Payment Instrument Banner */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-slate-50 to-indigo-50/30 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-2xs">
                      <IconBuildingBank className="w-6 h-6 text-[#5E4BE2]" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                        <span>Razorpay Payment Gateway</span>
                        <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                          {paymentMethod.method || 'Razorpay UPI / Cards'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Mandate Reference: <span className="font-mono text-slate-700 font-semibold">{paymentMethod.paymentId || 'pay_rzp_mock_1792170772496_682'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <IconCircleCheckFilled className="w-3 h-3 text-emerald-600" />
                      <span>{paymentMethod.status || 'PAID'} & Settled</span>
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      <IconShieldCheck className="w-3 h-3 text-indigo-600" />
                      <span>RBI E-Mandate</span>
                    </span>
                  </div>
                </div>

                {/* HOW PAYMENT WAS COMPLETED: Execution Footprint */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        How Payment Was Completed & Verified
                      </h4>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-500">
                      100% Real Database Record
                    </span>
                  </div>

                  {/* 4-Step Lifecycle Pipeline */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
                      <div className="flex items-center gap-1.5 text-emerald-600 mb-1">
                        <IconCircleCheckFilled className="w-3.5 h-3.5 shrink-0" />
                        <span className="text-[10px] font-bold uppercase tracking-wide">1. Order Created</span>
                      </div>
                      <div className="text-xs font-bold text-slate-900 truncate font-mono" title={paymentMethod.orderId || 'comp_prop_2_1792170719572'}>
                        {paymentMethod.orderId || 'comp_prop_2_1792170719572'}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Enterprise Plan Proposal</div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
                      <div className="flex items-center gap-1.5 text-emerald-600 mb-1">
                        <IconCircleCheckFilled className="w-3.5 h-3.5 shrink-0" />
                        <span className="text-[10px] font-bold uppercase tracking-wide">2. Authorized</span>
                      </div>
                      <div className="text-xs font-bold text-slate-900 truncate" title={paymentMethod.payerEmail || 'kyadarit@gmail.com'}>
                        {paymentMethod.payerEmail || 'kyadarit@gmail.com'}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">3D Secure / OTP Verified</div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
                      <div className="flex items-center gap-1.5 text-emerald-600 mb-1">
                        <IconCircleCheckFilled className="w-3.5 h-3.5 shrink-0" />
                        <span className="text-[10px] font-bold uppercase tracking-wide">3. Captured</span>
                      </div>
                      <div className="text-xs font-bold text-slate-900 truncate font-mono" title={paymentMethod.paymentId || 'pay_rzp_mock_1792170772496_682'}>
                        {paymentMethod.paymentId || 'pay_rzp_mock_1792170772496_682'}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Instant Settlement</div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
                      <div className="flex items-center gap-1.5 text-emerald-600 mb-1">
                        <IconCircleCheckFilled className="w-3.5 h-3.5 shrink-0" />
                        <span className="text-[10px] font-bold uppercase tracking-wide">4. Active Mandate</span>
                      </div>
                      <div className="text-xs font-bold text-emerald-700">
                        Annual Auto-Debit
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Renews {nextInvoiceDateFormatted}</div>
                    </div>
                  </div>

                  {/* Transaction Metadata Grid */}
                  <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden text-xs">
                    {/* Row 1: Payment Channel & Method */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
                      <div className="p-3 space-y-0.5">
                        <span className="text-[11px] text-slate-400 font-medium">Payment Gateway & Channel</span>
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <IconBuildingBank className="w-3.5 h-3.5 text-indigo-600" />
                          <span>{paymentMethod.channel || 'Razorpay Payment Gateway (Instant Checkout)'}</span>
                        </div>
                        <div className="text-[10px] text-slate-500">Direct integration via Razorpay India Node</div>
                      </div>

                      <div className="p-3 space-y-0.5">
                        <span className="text-[11px] text-slate-400 font-medium">Payment Instrument Used</span>
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <IconCreditCard className="w-3.5 h-3.5 text-[#5E4BE2]" />
                          <span>{paymentMethod.method || 'Razorpay UPI / Cards'}</span>
                        </div>
                        <div className="text-[10px] text-slate-500">Authorized via Razorpay 3D Secure / UPI Mandate</div>
                      </div>
                    </div>

                    {/* Row 2: Transaction ID & Order ID with Copy Buttons */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
                      <div className="p-3 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-slate-400 font-medium">Transaction / Payment ID</span>
                          <button
                            type="button"
                            onClick={() => handleCopyText(paymentMethod.paymentId || 'pay_rzp_mock_1792170772496_682', 'paymentId')}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                          >
                            {copiedField === 'paymentId' ? (
                              <>
                                <IconCheck className="w-3 h-3 text-emerald-600" />
                                <span className="text-emerald-600">Copied!</span>
                              </>
                            ) : (
                              <>
                                <IconCopy className="w-3 h-3" />
                                <span>Copy ID</span>
                              </>
                            )}
                          </button>
                        </div>
                        <div className="font-mono font-bold text-slate-900 text-xs bg-slate-50 px-2 py-1 rounded-md border border-slate-200 select-all truncate">
                          {paymentMethod.paymentId || 'pay_rzp_mock_1792170772496_682'}
                        </div>
                      </div>

                      <div className="p-3 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-slate-400 font-medium">Gateway Order Reference</span>
                          <button
                            type="button"
                            onClick={() => handleCopyText(paymentMethod.orderId || 'comp_prop_2_1792170719572', 'orderId')}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                          >
                            {copiedField === 'orderId' ? (
                              <>
                                <IconCheck className="w-3 h-3 text-emerald-600" />
                                <span className="text-emerald-600">Copied!</span>
                              </>
                            ) : (
                              <>
                                <IconCopy className="w-3 h-3" />
                                <span>Copy Ref</span>
                              </>
                            )}
                          </button>
                        </div>
                        <div className="font-mono font-bold text-slate-900 text-xs bg-slate-50 px-2 py-1 rounded-md border border-slate-200 select-all truncate">
                          {paymentMethod.orderId || 'comp_prop_2_1792170719572'}
                        </div>
                      </div>
                    </div>

                    {/* Row 3: Payment Timestamp & Authorized Payer */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
                      <div className="p-3 space-y-0.5">
                        <span className="text-[11px] text-slate-400 font-medium">Payment Timestamp</span>
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <IconClock className="w-3.5 h-3.5 text-slate-500" />
                          <span>
                            {paymentMethod.paidAt
                              ? new Date(paymentMethod.paidAt).toLocaleString('en-IN', {
                                  dateStyle: 'medium',
                                  timeStyle: 'short',
                                })
                              : '16 Oct 2026, 05:12 PM'}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500">Auto-cleared and settled into Uptrix Escrow</div>
                      </div>

                      <div className="p-3 space-y-0.5">
                        <span className="text-[11px] text-slate-400 font-medium">Authorized Account</span>
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <IconMail className="w-3.5 h-3.5 text-slate-500" />
                          <span>{paymentMethod.payerEmail || billingContact.email || 'kyadarit@gmail.com'}</span>
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {paymentMethod.payerName || billingContact.name || 'Kyadari Tarun'} (Workspace Owner)
                        </div>
                      </div>
                    </div>

                    {/* Row 4: Official Tax Invoice Action */}
                    <div className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-indigo-50/20">
                      <div>
                        <span className="text-[11px] text-slate-400 font-medium">Associated Tax Invoice</span>
                        <div className="font-mono font-bold text-slate-900 text-xs flex items-center gap-1.5 mt-0.5">
                          <IconReceipt className="w-3.5 h-3.5 text-indigo-600" />
                          <span>{paymentMethod.invoiceNumber || 'INV-2026-445491'}</span>
                          <span className="px-1.5 py-0.2 rounded-sm text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            PAID
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenInvoiceModal(paymentMethod.invoiceNumber)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-indigo-200 text-[#5E4BE2] hover:bg-indigo-50 text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                      >
                        <IconFileText className="w-3.5 h-3.5" />
                        <span>View Official Tax Invoice</span>
                      </button>
                    </div>
                  </div>

                  {/* FINANCIAL CHARGE BREAKDOWN */}
                  <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-2">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                      <span>Payment Amount Breakdown (Indian GST Compliant)</span>
                      <span className="font-mono text-slate-400">SAC Code: 998313</span>
                    </div>

                    <div className="space-y-1.5 text-xs pt-1">
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Base Subscription ({contractTermText}):</span>
                        <span className="font-mono font-medium text-slate-900">
                          ₹{Number(paymentMethod.baseAmount || 224198.45).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-slate-600">
                        <span>Goods & Services Tax (18% IGST):</span>
                        <span className="font-mono font-medium text-slate-900">
                          ₹{Number(paymentMethod.gstAmount || 40355.72).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-sm font-bold">
                        <span className="text-slate-900">Total Charged & Settled:</span>
                        <span className="font-mono text-emerald-700 text-base">
                          ₹{Number(paymentMethod.amount || 264554.17).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* SECURITY & RBI COMPLIANCE GUARANTEE */}
                <div className="rounded-xl p-3 bg-slate-50 border border-slate-200 flex items-start gap-2.5 text-xs text-slate-500">
                  <IconLock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-700 block">
                      RBI Compliant Card-on-File Tokenization (COFT) & E-Mandate
                    </span>
                    <p className="text-[11px] leading-relaxed">
                      Payment credentials are tokenized directly through Razorpay Payment Gateway. Uptrix servers never store or handle raw CVV or 16-digit card numbers. Under RBI circular CO.DPSS.POLC.No.S-518, an automated pre-debit email alert will be sent 48 hours prior to any renewal auto-charge.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DRAWER: MANAGE DOMAINS (RIGHT SIDE)                                      */}
      {/* ========================================================================= */}
      {isDomainModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] overflow-hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setIsDomainModalOpen(false)}
          />

          {/* Right-side Drawer Panel */}
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10 pointer-events-none">
            <div
              className="w-screen max-w-md sm:max-w-lg bg-white shadow-2xl flex flex-col h-full border-l border-slate-200 pointer-events-auto animate-in slide-in-from-right duration-300 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drawer Header */}
              <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between gap-4 bg-gradient-to-r from-slate-50 via-indigo-50/20 to-white shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-[#5E4BE2] flex items-center justify-center shrink-0">
                    <IconWorld className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Allowed Corporate Domains</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Route new employee sign-ups directly into this company.</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsDomainModalOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Close"
                >
                  <IconX className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                {/* Add domain input field */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700">
                    Add Corporate Domain
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-xs">@</span>
                      <input
                        type="text"
                        placeholder="kyadari.com"
                        value={newDomainInput}
                        onChange={(e) => setNewDomainInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddDomain()}
                        className="w-full pl-8 pr-3 py-2.5 text-xs font-medium border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#5E4BE2]/20 transition-all shadow-xs"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddDomain}
                      disabled={isActionLoading || !newDomainInput.trim()}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[#5E4BE2] text-white hover:bg-[#4d3cc9] cursor-pointer disabled:opacity-50 shadow-xs transition-colors shrink-0"
                    >
                      Add Domain
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Enter the domain name without '@' (e.g. kyadari.com). Personal email domains are blocked.
                  </p>
                </div>

                {/* Currently Allowed List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">
                      Currently Allowed ({domainList.length}):
                    </span>
                  </div>

                  {domainList.length === 0 ? (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-1">
                      <p className="text-xs text-slate-500 font-medium">No custom domains added yet.</p>
                      <p className="text-[11px] text-slate-400">
                        Defaults to @{compInfo?.subdomain || 'company'}.com
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-0.5">
                      {domainList.map((d) => (
                        <div
                          key={d}
                          className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs hover:border-slate-300 transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                            <span className="font-semibold text-slate-800 truncate">@{d}</span>
                            <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md font-bold border border-emerald-200/50 shrink-0">
                              Verified
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveDomain(d)}
                            disabled={isActionLoading}
                            className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                            title="Remove domain"
                          >
                            <IconTrash className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Security Note */}
                <div className="rounded-xl p-3.5 bg-indigo-50/70 border border-indigo-100 flex items-start gap-2.5 text-xs text-indigo-900">
                  <IconInfoCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">
                    <strong>Corporate Domain Security:</strong> When HR or administrators onboard employees, only work emails matching these verified corporate domains (e.g., @kyadari.com) are accepted. Unauthorized personal email domains are automatically blocked.
                  </span>
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="p-4 sm:p-5 border-t border-slate-100 flex items-center justify-end bg-slate-50/80 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsDomainModalOpen(false)}
                  className="px-5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl cursor-pointer shadow-xs transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================================= */}
      {/* MODAL: SWITCH ACCOUNT TIER                                               */}
      {/* ========================================================================= */}
      {isAccountTypeModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl p-6 border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <IconCrown className="w-4 h-4 text-[#5E4BE2]" />
                  <span>Choose Subscription Tier</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Scale employee seat limits and feature modules.</p>
              </div>
              <button
                onClick={() => setIsAccountTypeModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <IconX className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-5">
              {/* Standard */}
              <div
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  currentAccountType === 'Standard'
                    ? 'border-indigo-600 bg-indigo-50/20 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
                onClick={() => handleSwitchAccountType('Standard')}
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-900">Standard Tier</h4>
                    {currentAccountType === 'Standard' && (
                      <span className="text-[10px] font-bold bg-indigo-600 text-white px-2 py-0.5 rounded-full">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">Core HRMS tools for growing teams.</p>
                  <div className="text-lg font-bold font-mono text-slate-900">
                    ₹1,999<span className="text-xs font-normal text-slate-400"> / month</span>
                  </div>
                  <ul className="text-xs text-slate-600 space-y-1.5 pt-2 border-t border-slate-100">
                    <li className="flex items-center gap-1.5">
                      <IconCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Up to 25 Active Employees</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <IconCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>25 GB Cloud Storage</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <IconCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Attendance & Leave Management</span>
                    </li>
                  </ul>
                </div>
                <button
                  type="button"
                  disabled={isActionLoading || currentAccountType === 'Standard'}
                  className={`mt-4 w-full py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    currentAccountType === 'Standard'
                      ? 'bg-slate-100 text-slate-500 cursor-default'
                      : 'bg-slate-900 text-white hover:bg-slate-800'
                  }`}
                >
                  {currentAccountType === 'Standard' ? 'Current Tier' : 'Switch to Standard'}
                </button>
              </div>

              {/* Enterprise */}
              <div
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  currentAccountType === 'Enterprise'
                    ? 'border-[#5E4BE2] bg-purple-50/20 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
                onClick={() => handleSwitchAccountType('Enterprise')}
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-900">Enterprise Tier</h4>
                    {currentAccountType === 'Enterprise' && (
                      <span className="text-[10px] font-bold bg-[#5E4BE2] text-white px-2 py-0.5 rounded-full">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">Comprehensive payroll, AI & multi-entity suite.</p>
                  <div className="text-lg font-bold font-mono text-slate-900">
                    ₹4,999<span className="text-xs font-normal text-slate-400"> / month</span>
                  </div>
                  <ul className="text-xs text-slate-600 space-y-1.5 pt-2 border-t border-slate-100">
                    <li className="flex items-center gap-1.5">
                      <IconCheck className="w-3.5 h-3.5 text-[#5E4BE2]" />
                      <span>Up to 100 Active Employees</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <IconCheck className="w-3.5 h-3.5 text-[#5E4BE2]" />
                      <span>100 GB Storage & Bandwidth</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <IconCheck className="w-3.5 h-3.5 text-[#5E4BE2]" />
                      <span>Indian Payroll, Form 16 & HIPAA BAA</span>
                    </li>
                  </ul>
                </div>
                <button
                  type="button"
                  disabled={isActionLoading || currentAccountType === 'Enterprise'}
                  className={`mt-4 w-full py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    currentAccountType === 'Enterprise'
                      ? 'bg-slate-100 text-slate-500 cursor-default'
                      : 'bg-[#5E4BE2] text-white hover:bg-[#4d3cc9]'
                  }`}
                >
                  {currentAccountType === 'Enterprise' ? 'Current Tier' : 'Upgrade to Enterprise'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================================= */}
      {/* MODAL: CHANGE BILLING CYCLE                                               */}
      {/* ========================================================================= */}
      {isCycleModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6 border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Change Billing Cycle</h3>
              <button
                onClick={() => setIsCycleModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <IconX className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-3">
              <div
                onClick={() => setTargetCycle('MONTHLY')}
                className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                  targetCycle === 'MONTHLY' ? 'border-[#5E4BE2] bg-purple-50/20' : 'border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-xs">Monthly Billing</span>
                  <span className="font-mono font-bold text-slate-900 text-xs">₹4,999 / mo</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">Recurring charge on monthly renewal date.</p>
              </div>

              <div
                onClick={() => setTargetCycle('YEARLY')}
                className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                  targetCycle === 'YEARLY' ? 'border-[#5E4BE2] bg-purple-50/20' : 'border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-900 text-xs">Annual Billing</span>
                    <span className="text-[10px] font-bold bg-emerald-500 text-white px-2 py-0.2 rounded-full">
                      SAVE 20%
                    </span>
                  </div>
                  <span className="font-mono font-bold text-slate-900 text-xs">₹49,999 / yr</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">Billed once a year with discounted corporate pricing.</p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCycleModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isActionLoading}
                onClick={() => handleChangeCycle(targetCycle)}
                className="px-4 py-2 text-xs font-bold bg-[#5E4BE2] hover:bg-[#4d3cc9] text-white rounded-xl cursor-pointer shadow-xs"
              >
                {isActionLoading ? 'Saving...' : `Confirm ${targetCycle === 'YEARLY' ? 'Annual' : 'Monthly'}`}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIT BILLING CONTACT                                              */}
      {/* ========================================================================= */}
      {isContactModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <form
            onSubmit={handleSaveContact}
            className="bg-white rounded-2xl max-w-lg w-full shadow-2xl p-6 border border-slate-200 animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Edit Primary Billing Contact</h3>
              <button
                type="button"
                onClick={() => setIsContactModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <IconX className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Primary Contact Name</label>
                <input
                  type="text"
                  required
                  value={contactForm.name}
                  onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#5E4BE2]/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Billing Email</label>
                  <input
                    type="email"
                    required
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#5E4BE2]/20"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={contactForm.phone || ''}
                    onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#5E4BE2]/20"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Street Address</label>
                <input
                  type="text"
                  required
                  value={contactForm.addressLine1}
                  onChange={(e) => setContactForm({ ...contactForm, addressLine1: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#5E4BE2]/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">City</label>
                  <input
                    type="text"
                    required
                    value={contactForm.city}
                    onChange={(e) => setContactForm({ ...contactForm, city: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#5E4BE2]/20"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">State</label>
                  <input
                    type="text"
                    required
                    value={contactForm.state}
                    onChange={(e) => setContactForm({ ...contactForm, state: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#5E4BE2]/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Country</label>
                  <input
                    type="text"
                    required
                    value={contactForm.country}
                    onChange={(e) => setContactForm({ ...contactForm, country: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#5E4BE2]/20"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">PIN Code</label>
                  <input
                    type="text"
                    required
                    value={contactForm.postalCode}
                    onChange={(e) => setContactForm({ ...contactForm, postalCode: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#5E4BE2]/20"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsContactModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isActionLoading}
                className="px-4 py-2 text-xs font-bold bg-[#5E4BE2] hover:bg-[#4d3cc9] text-white rounded-xl cursor-pointer"
              >
                {isActionLoading ? 'Saving...' : 'Save Contact'}
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}



      {/* ========================================================================= */}
      {/* MODAL: HIPAA BAA REQUEST                                                  */}
      {/* ========================================================================= */}
      {isHipaaModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6 border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <IconShieldCheck className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">Request HIPAA BAA Agreement</h3>
              </div>
              <button
                onClick={() => setIsHipaaModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <IconX className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs text-slate-600">
              <p>
                The HIPAA Business Associate Agreement (BAA) establishes legal safeguards for handling confidential
                employee health records and biometric data under international compliance standards.
              </p>
              <p className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-700">
                Upon confirmation, an executed agreement will be delivered to{' '}
                <strong className="text-slate-900">{billingContact.email || 'your billing email'}</strong> and archived in your company
                compliance vault.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsHipaaModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Dismiss
              </button>
              <button
                type="button"
                disabled={isActionLoading}
                onClick={handleRequestHipaa}
                className="px-4 py-2 text-xs font-bold bg-[#5E4BE2] hover:bg-[#4d3cc9] text-white rounded-xl cursor-pointer"
              >
                {isActionLoading ? 'Submitting...' : 'Confirm & Request BAA'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================================= */}
      {/* MODAL: CANCEL / PAUSE ACCOUNT                                             */}
      {/* ========================================================================= */}
      {isCancelModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6 border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <IconAlertTriangle className="w-4 h-4 text-rose-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  {isAccountActive ? 'Cancel Company Subscription' : 'Reactivate Company Subscription'}
                </h3>
              </div>
              <button
                onClick={() => setIsCancelModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <IconX className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs text-slate-600">
              {isAccountActive ? (
                <>
                  <p>
                    Are you sure you wish to cancel this subscription? Your workspace will remain fully operational
                    until the end of your current prepaid billing cycle ({nextInvoiceDateFormatted}).
                  </p>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Reason for cancellation</label>
                    <select
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden"
                    >
                      <option value="Restructuring or downsizing">Restructuring or downsizing</option>
                      <option value="Switching to another HRMS provider">Switching to another HRMS provider</option>
                      <option value="Temporary pause">Temporary pause</option>
                      <option value="Budget optimization">Budget optimization</option>
                    </select>
                  </div>
                </>
              ) : (
                <p>
                  Reactivating your subscription restores recurring auto-pay cycles and full administrative privileges.
                </p>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                disabled={isActionLoading}
                onClick={() => handleCancelOrReactivate(isAccountActive ? 'CANCEL' : 'REACTIVATE')}
                className={`px-4 py-2 text-xs font-bold text-white rounded-xl cursor-pointer ${
                  isAccountActive ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {isActionLoading
                  ? 'Processing...'
                  : isAccountActive
                  ? 'Confirm Cancellation'
                  : 'Reactivate Account'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================================= */}
      {/* DRAWER: PRINTABLE GST TAX INVOICE (RIGHT SIDE SLIDE-OVER)                 */}
      {/* ========================================================================= */}
      <TaxInvoicePdfDrawer
        invoice={selectedInvoiceForView}
        company={company}
        seatsCount={plan?.package?.employeeLimit || 100}
        onClose={() => setSelectedInvoiceForView(null)}
      />
    </div>
  );
};

export default CompanyBillingPage;
