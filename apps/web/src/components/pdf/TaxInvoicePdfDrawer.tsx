import React from 'react';
import { createPortal } from 'react-dom';
import { IconPrinter, IconX } from '@tabler/icons-react';

export interface InvoiceItem {
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

export interface TaxInvoicePdfDrawerProps {
  invoice: InvoiceItem | null;
  company?: {
    name?: string;
    subdomain?: string;
  } | null;
  seatsCount?: number;
  onClose: () => void;
}

const COMPANY_BRAND_NAME = import.meta.env.VITE_COMPANY_BRAND_NAME ;
const COMPANY_LEGAL_NAME = import.meta.env.VITE_COMPANY_LEGAL_NAME ;
const COMPANY_GSTIN = import.meta.env.VITE_COMPANY_GSTIN;
const COMPANY_ADDRESS = import.meta.env.VITE_COMPANY_ADDRESS;

export const TaxInvoicePdfDrawer: React.FC<TaxInvoicePdfDrawerProps> = ({
  invoice,
  company,
  seatsCount = 100,
  onClose,
}) => {
  if (!invoice || typeof document === 'undefined') return null;

  const paymentMethodLabel = (() => {
    const raw = (invoice.payment?.paymentMethod || invoice.payment?.method || 'UPI').toUpperCase();
    if (raw.includes('UPI') || raw.includes('QR')) return 'UPI / QR';
    if (raw.includes('CARD') || raw.includes('CREDIT') || raw.includes('DEBIT')) return 'Credit / Debit Card';
    if (raw.includes('NET') || raw.includes('BANK')) return 'Net Banking';
    return raw;
  })();

  const baseAmount = Number(invoice.amount) * 0.84745;
  const cgstAmount = Number(invoice.amount) * 0.07627;
  const sgstAmount = Number(invoice.amount) * 0.07627;

  return createPortal(
    <>
      {/* Scoped Print Styles: Hides #root and UI chrome to guarantee zero blank pages */}
      <style>{`
        @media print {
          #root {
            display: none !important;
          }
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
          }
          #printable-tax-invoice {
            position: static !important;
            inset: auto !important;
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            display: block !important;
            background: #ffffff !important;
          }
          #printable-tax-invoice-container {
            position: static !important;
            display: block !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          #printable-tax-invoice-drawer {
            position: static !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            display: block !important;
          }
          #printable-tax-invoice-body {
            overflow: visible !important;
            height: auto !important;
            padding: 0 !important;
            margin: 0 !important;
            display: block !important;
          }
          @page {
            size: A4 portrait;
            margin: 12mm 15mm;
          }
        }
      `}</style>

      <div
        id="printable-tax-invoice"
        className="fixed inset-0 z-[9999] overflow-hidden print:static print:inset-auto print:overflow-visible print:bg-white print:p-0"
      >
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity print:hidden no-print"
          onClick={onClose}
        />

        {/* Right-Side Drawer Container */}
        <div
          id="printable-tax-invoice-container"
          className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10 pointer-events-none print:static print:p-0 print:block print:w-full"
        >
          <div
            id="printable-tax-invoice-drawer"
            className="w-screen max-w-2xl bg-white shadow-2xl flex flex-col h-full border-l border-slate-200 pointer-events-auto print:border-none print:shadow-none print:p-0 print:m-0 print:max-w-none print:w-full print:rounded-none print:h-auto print:block"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Top Header (Sticky) */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-white shrink-0 print:hidden no-print">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Official GST Tax Invoice
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer shadow-2xs transition-colors"
                >
                  <IconPrinter className="w-3.5 h-3.5" />
                  Print / PDF
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Close"
                >
                  <IconX className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Drawer Scrollable Body (Full Invoice) */}
            <div
              id="printable-tax-invoice-body"
              className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 print:p-0 print:overflow-visible print:h-auto print:block"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">{COMPANY_BRAND_NAME}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">{COMPANY_LEGAL_NAME}</p>
                  <p className="text-[11px] text-slate-400">GSTIN: {COMPANY_GSTIN}</p>
                  <p className="text-[11px] text-slate-400">{COMPANY_ADDRESS}</p>
                </div>

                <div className="text-right">
                  <div className="font-mono font-bold text-slate-900 text-base">
                    {invoice.invoiceNumber}
                  </div>
                  <span className="text-xs text-slate-500 block">
                    Issued: {new Date(invoice.issuedAt).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 sm:gap-6 p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
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
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">BILLING PERIOD &amp; TRANSACTION</span>
                  <span className="text-slate-700 block mt-1">
                    Period: <strong>{new Date(invoice.periodStart).toLocaleDateString()} to {new Date(invoice.periodEnd).toLocaleDateString()}</strong>
                  </span>
                  <span className="text-slate-700 block mt-0.5">
                    Payment Method: <strong>{paymentMethodLabel}</strong>
                  </span>
                  {invoice.payment?.reference && (
                    <span className="text-slate-500 block mt-0.5 font-mono text-[11px]">
                      Reference / UTR: {invoice.payment.reference}
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
                          {invoice.payment?.itemDescription || 'Enterprise SaaS Platform Annual Subscription'}
                        </strong>
                        <span className="text-slate-500 text-[11px]">
                          Automated Payroll, GPS Geofenced Attendance, KYC Vault &amp; Priority SLA
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center font-mono">998313</td>
                      <td className="px-4 py-3.5 text-center font-bold">{seatsCount} Seats</td>
                      <td className="px-4 py-3.5 text-right font-bold text-slate-900">
                        ₹{baseAmount.toFixed(2)}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 text-slate-500">Central GST (CGST @ 9%)</td>
                      <td className="px-4 py-2.5 text-center font-mono">998313</td>
                      <td className="px-4 py-2.5 text-center">9%</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-slate-700">
                        ₹{cgstAmount.toFixed(2)}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 text-slate-500">State GST (SGST @ 9%)</td>
                      <td className="px-4 py-2.5 text-center font-mono">998313</td>
                      <td className="px-4 py-2.5 text-center">9%</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-slate-700">
                        ₹{sgstAmount.toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                  <tfoot className="bg-slate-50 border-t border-slate-200 font-bold text-sm">
                    <tr>
                      <td colSpan={3} className="px-4 py-3.5 text-right text-slate-900">Total Paid Amount:</td>
                      <td className="px-4 py-3.5 text-right text-brand-600 font-black">
                        ₹{Number(invoice.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="pt-2 text-[11px] text-slate-400 leading-relaxed border-t border-slate-100 flex items-center justify-between">
                <span>This is a digitally generated tax receipt and requires no physical signature.</span>
                <span className="font-semibold text-slate-500">{COMPANY_BRAND_NAME} Billing Platform</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};

export default TaxInvoicePdfDrawer;
