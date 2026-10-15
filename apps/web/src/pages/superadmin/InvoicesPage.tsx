import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import {
  IconCreditCard,
  IconPlus,
  IconX,
  IconAlertCircle,
  IconCalendar,
  IconChevronDown,
  IconSearch,
  IconFileText,
  IconClock,
  IconCircleCheck,
  IconCircleX,
  IconDots,
  IconChevronLeft,
  IconChevronRight,
  IconReceipt2,
  IconBuildingBank,
  IconCash,
  IconReceipt,
  IconQrcode,
  IconBan,
  IconSend,
} from '@tabler/icons-react';

interface InvoiceItem {
  id: number;
  invoiceNumber: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED' | 'VOID';
  billingCycle: string;
  dueDate: string;
  createdAt: string;
  issuedAt?: string;
  payment?: {
    method?: string;
    paymentMethod?: string;
    reference?: string;
    notes?: string;
    cardBrand?: string;
    cardLast4?: string;
    [key: string]: any;
  };
  company?: { id: number; name: string; code: string; subdomain: string };
}

export const InvoicesPage: React.FC = () => {
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedMethod, setSelectedMethod] = useState<string>('all');
  const [dateRangeStr, setDateRangeStr] = useState<string>('');

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 5;

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    companyId: '',
    amount: '4999',
    currency: 'INR',
    billingCycle: 'YEARLY',
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    paymentMethod: 'UPI',
    paymentReference: '',
    status: 'PAID',
    sendEmail: true,
  });

  const getPaymentMethodInfo = (inv: InvoiceItem) => {
    const p = inv.payment || {};
    const method = String(p.method || p.paymentMethod || p.provider || '').toUpperCase();

    if (method.includes('UPI')) {
      return {
        key: 'UPI',
        label: 'UPI / QR',
        ref: p.reference || '',
        badgeClass: 'bg-purple-50 text-purple-700 border-purple-200/80',
        icon: <IconQrcode className="w-3.5 h-3.5 text-purple-600 shrink-0" />,
      };
    }
    if (method.includes('BANK') || method.includes('NEFT') || method.includes('RTGS') || method.includes('IMPS')) {
      return {
        key: 'BANK',
        label: 'Bank Transfer',
        ref: p.reference || '',
        badgeClass: 'bg-blue-50 text-blue-700 border-blue-200/80',
        icon: <IconBuildingBank className="w-3.5 h-3.5 text-blue-600 shrink-0" />,
      };
    }
    if (method.includes('CHECK') || method.includes('CHEQUE')) {
      return {
        key: 'CHECK',
        label: 'Cheque',
        ref: p.reference || '',
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-200/80',
        icon: <IconReceipt className="w-3.5 h-3.5 text-amber-600 shrink-0" />,
      };
    }
    if (method.includes('CASH')) {
      return {
        key: 'CASH',
        label: 'Cash',
        ref: p.reference || '',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
        icon: <IconCash className="w-3.5 h-3.5 text-emerald-600 shrink-0" />,
      };
    }
    if (p.cardLast4 || method.includes('CARD') || method.includes('VISA') || method.includes('STRIPE')) {
      return {
        key: 'CARD',
        label: p.cardLast4 ? `Card •••• ${p.cardLast4}` : 'Card',
        ref: p.reference || '',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
        icon: <IconCreditCard className="w-3.5 h-3.5 text-slate-500 shrink-0" />,
      };
    }
    return {
      key: 'BANK',
      label: method || 'Bank Transfer',
      ref: p.reference || '',
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200/80',
      icon: <IconBuildingBank className="w-3.5 h-3.5 text-blue-600 shrink-0" />,
    };
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [invRes, compRes] = await Promise.all([
        api.get('/superadmin/invoices'),
        api.get('/superadmin/companies'),
      ]);
      setInvoices(invRes.data?.invoices || []);
      setCompanies(compRes.data?.companies || []);
    } catch (err) {
      console.error('Failed to load invoices:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const now = new Date();
    const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const startStr = `${past.getMonth() + 1}/${past.getDate()}/${past.getFullYear()}`;
    const endStr = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`;
    setDateRangeStr(`${startStr} - ${endStr}`);

    fetchData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.companyId || !form.amount) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const now = new Date();
      await api.post('/superadmin/invoices', {
        companyId: Number(form.companyId),
        amount: Number(form.amount),
        currency: form.currency,
        billingCycle: form.billingCycle,
        periodStart: now.toISOString(),
        periodEnd: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        dueDate: new Date(form.dueDate).toISOString(),
        status: form.status,
        paymentMethod: form.paymentMethod,
        paymentReference: form.paymentReference.trim(),
        sendEmail: form.sendEmail,
      });
      setIsModalOpen(false);
      setForm({
        companyId: '',
        amount: '4999',
        currency: 'INR',
        billingCycle: 'YEARLY',
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        paymentMethod: 'UPI',
        paymentReference: '',
        status: 'PAID',
        sendEmail: true,
      });
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to generate invoice');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: number, newStatus: string) => {
    try {
      await api.patch(`/superadmin/invoices/${id}`, { status: newStatus });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update invoice status');
    }
  };

  const handleVoidInvoice = async (id: number) => {
    const confirmed = window.confirm(
      'Are you sure you want to VOID this invoice?\n\nVoided invoices will be immediately removed and hidden from the company\'s Invoices & Billing portal.'
    );
    if (!confirmed) return;

    try {
      await api.patch(`/superadmin/invoices/${id}`, { status: 'VOID' });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to void invoice');
    }
  };

  // Filtered invoices
  const filteredInvoices = invoices.filter((inv) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      inv.invoiceNumber.toLowerCase().includes(q) ||
      (inv.company?.name && inv.company.name.toLowerCase().includes(q)) ||
      (inv.company?.subdomain && inv.company.subdomain.toLowerCase().includes(q));

    const matchesCompany =
      selectedCompanyId === 'all' || String(inv.company?.id) === selectedCompanyId;

    const matchesStatus =
      selectedStatus === 'all' || inv.status.toUpperCase() === selectedStatus.toUpperCase();

    const methodInfo = getPaymentMethodInfo(inv);
    const matchesMethod =
      selectedMethod === 'all' || methodInfo.key === selectedMethod;

    return matchesSearch && matchesCompany && matchesStatus && matchesMethod;
  });

  const totalPages = Math.ceil(filteredInvoices.length / pageSize) || 1;
  const displayedInvoices = filteredInvoices.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50/80 text-indigo-600 border border-indigo-100/60 flex items-center justify-center shrink-0">
            <IconCreditCard className="w-6 h-6 stroke-[1.75]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Invoices
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Issue and audit tenant subscription invoices with payment tracking (Cash, Cheque, UPI, Bank Transfer).
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white font-semibold text-xs shadow-xs transition-all active:scale-95 self-start sm:self-center cursor-pointer"
        >
          <IconPlus className="w-4 h-4" />
          Add &amp; Send Invoice
        </button>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Controls Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
          {/* Left Filters Group */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Date Range Pill */}
            <div className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 shadow-2xs font-medium">
              <IconCalendar className="w-4 h-4 text-slate-400 shrink-0" />
              <span>{dateRangeStr || 'Last 30 Days'}</span>
            </div>

            {/* Companies Dropdown */}
            <div className="relative inline-flex items-center">
              <select
                value={selectedCompanyId}
                onChange={(e) => {
                  setSelectedCompanyId(e.target.value);
                  setCurrentPage(1);
                }}
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

            {/* Status Dropdown */}
            <div className="relative inline-flex items-center">
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="appearance-none pl-3.5 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 shadow-2xs focus:outline-hidden font-medium cursor-pointer"
              >
                <option value="all">All status</option>
                <option value="PENDING">Pending Payment</option>
                <option value="PAID">Paid &amp; Settled</option>
                <option value="VOID">Voided (Hidden)</option>
              </select>
              <IconChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
            </div>

            {/* Payment Method Dropdown */}
            <div className="relative inline-flex items-center">
              <select
                value={selectedMethod}
                onChange={(e) => {
                  setSelectedMethod(e.target.value);
                  setCurrentPage(1);
                }}
                className="appearance-none pl-3.5 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 shadow-2xs focus:outline-hidden font-medium cursor-pointer"
              >
                <option value="all">All payment methods</option>
                <option value="UPI">UPI / QR</option>
                <option value="BANK">Bank Transfer</option>
                <option value="CHECK">Cheque</option>
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
              </select>
              <IconChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
            </div>
          </div>

          {/* Right Search Input */}
          <div className="relative w-full lg:w-80">
            <IconSearch className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by invoice # or company..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10 pr-4 py-2 text-xs bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-brand-600 w-full placeholder:text-slate-400 text-slate-800 shadow-2xs"
            />
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-4 whitespace-nowrap min-w-[170px]">INVOICE #</th>
                <th className="px-6 py-4 min-w-[190px]">TENANT COMPANY</th>
                <th className="px-6 py-4 whitespace-nowrap min-w-[110px]">AMOUNT</th>
                <th className="px-6 py-4 whitespace-nowrap min-w-[120px]">BILLING CYCLE</th>
                <th className="px-6 py-4 whitespace-nowrap min-w-[170px]">PAYMENT METHOD</th>
                <th className="px-6 py-4 whitespace-nowrap min-w-[140px]">STATUS</th>
                <th className="px-6 py-4 whitespace-nowrap min-w-[110px]">ISSUE DATE</th>
                <th className="px-6 py-4 text-right whitespace-nowrap min-w-[170px]">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-slate-400">
                    <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-brand-600" />
                  </td>
                </tr>
              ) : displayedInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center text-slate-400 font-medium">
                    <IconReceipt2 className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
                    No SaaS invoices found.
                  </td>
                </tr>
              ) : (
                displayedInvoices.map((inv) => {
                  const isPaid = inv.status === 'PAID';
                  const isVoided = inv.status === 'VOID' || inv.status === 'CANCELLED';
                  const isPending = !isPaid && !isVoided;
                  const methodInfo = getPaymentMethodInfo(inv);

                  const createdStr = inv.createdAt || inv.issuedAt
                    ? new Date(inv.createdAt || inv.issuedAt!).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })
                    : '07 Oct 2026';

                  const iconBg = isPaid
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100/60'
                    : isVoided
                    ? 'bg-slate-100 text-slate-500 border-slate-200'
                    : 'bg-indigo-50 text-indigo-600 border-indigo-100/60';

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Invoice # */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl ${iconBg} border flex items-center justify-center shrink-0 shadow-2xs`}
                          >
                            <IconFileText className="w-4 h-4 stroke-[1.75]" />
                          </div>
                          <span className="font-bold text-slate-900 font-mono text-xs">
                            {inv.invoiceNumber}
                          </span>
                        </div>
                      </td>

                      {/* Tenant Company */}
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 leading-snug">
                          {inv.company?.name || 'Company'}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {inv.company?.subdomain
                            ? `${inv.company.subdomain}.uptrix.io`
                            : 'tenant.uptrix.io'}
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="px-6 py-4 font-bold text-slate-900 whitespace-nowrap text-sm">
                        ₹{Number(inv.amount || 0).toLocaleString()}
                      </td>

                      {/* Billing Cycle */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-block px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-50 text-indigo-600 tracking-wide uppercase">
                          {inv.billingCycle || 'YEARLY'}
                        </span>
                      </td>

                      {/* Payment Method */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-0.5">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${methodInfo.badgeClass} w-fit`}>
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

                      {/* Status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                            <IconCircleCheck className="w-3.5 h-3.5 text-emerald-600" />
                            Paid &amp; Settled
                          </span>
                        ) : isVoided ? (
                          <span
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200"
                            title="Hidden from company billing portal"
                          >
                            <IconBan className="w-3.5 h-3.5 text-slate-500" />
                            Voided (Hidden)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/80">
                            <IconClock className="w-3.5 h-3.5 text-amber-500" />
                            Pending Payment
                          </span>
                        )}
                      </td>

                      {/* Issue Date */}
                      <td className="px-6 py-4 text-slate-600 font-medium whitespace-nowrap text-xs">
                        {createdStr}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          {isPending && (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(inv.id, 'PAID')}
                              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-2xs transition-colors cursor-pointer"
                            >
                              Mark Paid
                            </button>
                          )}
                          {!isVoided && (
                            <button
                              type="button"
                              onClick={() => handleVoidInvoice(inv.id)}
                              className="px-3.5 py-1.5 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-100/60 text-rose-700 font-semibold text-xs shadow-2xs transition-colors cursor-pointer"
                              title="Void invoice and hide from company portal"
                            >
                              Void
                            </button>
                          )}
                          {isVoided && (
                            <span className="text-[11px] text-slate-400 font-medium italic">
                              Hidden
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <span>
            {filteredInvoices.length === 0
              ? 'Showing 0 to 0 of 0 entries'
              : `Showing ${(currentPage - 1) * pageSize + 1} to ${Math.min(
                  currentPage * pageSize,
                  filteredInvoices.length
                )} of ${filteredInvoices.length} entries`}
          </span>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="w-8 h-8 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-30 disabled:hover:bg-white flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
            >
              <IconChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pageNum) => (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`w-8 h-8 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  currentPage === pageNum
                    ? 'bg-[#4f46e5] text-white shadow-xs'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 shadow-2xs'
                }`}
              >
                {pageNum}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="w-8 h-8 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-30 disabled:hover:bg-white flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
            >
              <IconChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Generate & Send Invoice Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6 border border-slate-100 animate-in fade-in zoom-in-95 duration-150 my-6">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <IconReceipt2 className="w-5 h-5 text-indigo-600" />
                Issue &amp; Send Platform Invoice
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
              >
                <IconX className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <IconAlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Tenant Company *
                </label>
                <select
                  required
                  value={form.companyId}
                  onChange={(e) => setForm({ ...form, companyId: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:border-blue-600 focus:outline-brand-600 font-medium text-slate-800 shadow-2xs"
                >
                  <option value="">Choose tenant...</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.subdomain}.uptrix.io)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Amount (₹) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:border-blue-600 focus:outline-brand-600 font-bold text-slate-800 shadow-2xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Billing Cycle
                  </label>
                  <select
                    value={form.billingCycle}
                    onChange={(e) => setForm({ ...form, billingCycle: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:border-blue-600 focus:outline-brand-600 text-slate-800 shadow-2xs"
                  >
                    <option value="YEARLY">Yearly</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="MONTHLY">Monthly</option>
                    <option value="OVERUSE_SEATS">Seat Overuse Surcharge</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Payment Method *
                  </label>
                  <select
                    value={form.paymentMethod}
                    onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:border-blue-600 focus:outline-brand-600 font-semibold text-slate-800 shadow-2xs"
                  >
                    <option value="UPI">UPI / QR Code</option>
                    <option value="BANK">Bank Transfer (NEFT/RTGS)</option>
                    <option value="CHECK">Cheque</option>
                    <option value="CASH">Cash</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Invoice Status *
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:border-blue-600 focus:outline-brand-600 font-semibold text-slate-800 shadow-2xs"
                  >
                    <option value="PAID">Paid (Payment Received)</option>
                    <option value="PENDING">Pending (Payment Awaited)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Reference / UTR / Cheque #
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. UTR-829104 or Cheque 00412"
                    value={form.paymentReference}
                    onChange={(e) => setForm({ ...form, paymentReference: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:border-blue-600 focus:outline-brand-600 text-slate-800 shadow-2xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Payment Due Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={form.dueDate}
                    onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:border-blue-600 focus:outline-brand-600 text-slate-800 shadow-2xs"
                  />
                </div>
              </div>

              {/* Send invoice to company email */}
              <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <IconSend className="w-4 h-4 text-indigo-600 shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Send Invoice to Company</span>
                    <span className="text-[11px] text-slate-500 block">Deliver official invoice notification to tenant admin</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={form.sendEmail}
                  onChange={(e) => setForm({ ...form, sendEmail: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  <IconSend className="w-3.5 h-3.5" />
                  {isSubmitting ? 'Issuing & Sending...' : 'Add & Send Invoice to Company'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoicesPage;
