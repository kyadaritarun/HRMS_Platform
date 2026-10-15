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

interface BillingData {
  plan: {
    package?: {
      id: number;
      name: string;
      employeeLimit: number;
      features?: string[];
      monthlyPrice?: number;
      annualPrice?: number;
    } | null;
    planType?: string;
    subAmount?: number | string;
    subStartDate?: string;
    subEndDate?: string;
    nextPaymentDate?: string;
    subIsActive?: boolean;
  };
  activeEmployeeCount: number;
  invoices: InvoiceItem[];
}

export const CompanyBillingPage: React.FC = () => {
  const { company } = useAuth();
  const [data, setData] = useState<BillingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedInvoiceForView, setSelectedInvoiceForView] = useState<InvoiceItem | null>(null);

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
    if (p.cardLast4 || method.includes('CARD') || method.includes('VISA') || method.includes('STRIPE')) {
      return {
        label: p.cardLast4 ? `Card •••• ${p.cardLast4}` : 'Credit / Debit Card',
        ref: p.reference || '',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
        icon: <IconCreditCard className="w-3.5 h-3.5 text-slate-500 shrink-0" />,
      };
    }
    return {
      label: method || 'Bank Transfer',
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
    } catch (err) {
      console.error('Failed to load company billing:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBilling();
  }, []);

  const plan = data?.plan;
  const pkg = plan?.package || {
    name: 'Enterprise Tier',
    employeeLimit: 100,
    features: ['time_attendance_management', 'leave_management', 'payroll', 'claims', 'ai_assistant', 'support_ticket_management'],
  };

  const limit = pkg.employeeLimit || 100;

  // Filter out any voided or cancelled invoices so they are completely hidden from the company
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
            Billing
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Official GST tax receipts and corporate subscription invoices.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-6 print:hidden">
          <div className="h-64 rounded-3xl bg-slate-200 animate-pulse" />
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden print:hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <IconReceipt2 className="w-5 h-5 text-[#5E4BE2]" />
                Tax Invoices & Billing Records
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
      )}

      {/* MODAL: AUTHENTIC PRINTABLE GST TAX INVOICE */}
      {selectedInvoiceForView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto print:static print:inset-auto print:bg-white print:p-0 print:overflow-visible">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl p-8 border border-slate-200 my-8 animate-in fade-in zoom-in-95 duration-150 print:border-none print:shadow-none print:p-6 print:m-0 print:max-w-none print:w-full print:rounded-none">
            {/* Modal Controls Bar - HIDDEN ON DOWNLOAD / PRINT */}
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
              {/* Header: Brand & Invoice Meta */}
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

              {/* Billed To & Payment Meta */}
              <div className="grid grid-cols-2 gap-6 p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">BILLED TO</span>
                  <strong className="text-slate-900 block mt-1 text-sm">
                    {company?.name || 'Acme Technologies Private Limited'}
                  </strong>
                  <span className="text-slate-600 block mt-0.5">
                    Unit 402, Cyber Tower B, Hitec City, Hyderabad - 500081
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

              {/* Line Items Table */}
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
                      <td className="px-4 py-2.5 text-slate-500">
                        Central GST (CGST @ 9%)
                      </td>
                      <td className="px-4 py-2.5 text-center font-mono">998313</td>
                      <td className="px-4 py-2.5 text-center">9%</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-slate-700">
                        ₹{(Number(selectedInvoiceForView.amount) * 0.07627).toFixed(2)}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 text-slate-500">
                        State GST (SGST @ 9%)
                      </td>
                      <td className="px-4 py-2.5 text-center font-mono">998313</td>
                      <td className="px-4 py-2.5 text-center">9%</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-slate-700">
                        ₹{(Number(selectedInvoiceForView.amount) * 0.07627).toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                  <tfoot className="bg-slate-50 border-t border-slate-200 font-bold text-sm">
                    <tr>
                      <td colSpan={3} className="px-4 py-3.5 text-right text-slate-900">
                        Total Paid Amount:
                      </td>
                      <td className="px-4 py-3.5 text-right text-brand-600 font-black">
                        ₹{Number(selectedInvoiceForView.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Footer notes */}
              <div className="pt-2 text-[11px] text-slate-400 leading-relaxed border-t border-slate-100 flex items-center justify-between">
                <span>
                  This is a digitally generated tax receipt and requires no physical signature.
                </span>
                <span className="font-semibold text-slate-500">
                  Uptrix HRMS Billing Platform
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyBillingPage;
