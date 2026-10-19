import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import {
  IconX,
  IconCreditCard,
  IconCheck,
  IconCopy,
  IconMail,
  IconBuilding,
  IconSparkles,
  IconAlertCircle,
  IconSend,
  IconLock,
} from '@tabler/icons-react';

interface SendProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  packages: any[];
}

export const SendProposalModal: React.FC<SendProposalModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  packages,
}) => {
  const [form, setForm] = useState({
    packageId: '',
    planType: 'YEARLY' as 'MONTHLY' | 'QUARTERLY' | 'YEARLY',
    companyName: '',
    subdomain: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    customAmount: '',
    customEmployeeLimit: '',
    notes: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proposalResult, setProposalResult] = useState<{
    paymentOrder: {
      orderId: string;
      paymentLinkUrl: string;
      amount: number | string;
      subdomain: string;
      companyName: string;
      contactEmail: string;
    };
  } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (packages.length > 0 && !form.packageId) {
      setForm((prev) => ({ ...prev, packageId: String(packages[0].id) }));
    }
  }, [packages]);

  if (!isOpen) return null;

  const handleCompanyNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const autoSub = val.toLowerCase().replace(/[^a-z0-9]/g, '');
    setForm((prev) => ({
      ...prev,
      companyName: val,
      subdomain: prev.subdomain === '' || prev.subdomain === prev.companyName.toLowerCase().replace(/[^a-z0-9]/g, '') ? autoSub : prev.subdomain,
    }));
  };

  const selectedPkg = packages.find((p) => String(p.id) === String(form.packageId));

  // Calculate pricing preview
  let basePrice = 0;
  if (form.customAmount && Number(form.customAmount) > 0) {
    basePrice = Number(form.customAmount);
  } else if (selectedPkg) {
    if (form.planType === 'MONTHLY') basePrice = Number(selectedPkg.priceMonthly || 999);
    else if (form.planType === 'QUARTERLY') basePrice = Number(selectedPkg.priceQuarterly || 2799);
    else if (form.planType === 'YEARLY') basePrice = Number(selectedPkg.priceYearly || 9999);
  }

  const gstPrice = Math.round(basePrice * 0.18 * 100) / 100;
  const totalPrice = basePrice + gstPrice;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await api.post('/superadmin/proposals/send', {
        packageId: Number(form.packageId),
        planType: form.planType,
        companyName: form.companyName.trim(),
        subdomain: form.subdomain.trim(),
        contactName: form.contactName.trim() || form.companyName.trim(),
        contactEmail: form.contactEmail.trim().toLowerCase(),
        contactPhone: form.contactPhone.trim() || undefined,
        customAmount: form.customAmount ? Number(form.customAmount) : undefined,
        customEmployeeLimit: form.customEmployeeLimit ? Number(form.customEmployeeLimit) : undefined,
        notes: form.notes.trim() || undefined,
      });

      setProposalResult(res.data);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to dispatch proposal');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = () => {
    if (!proposalResult?.paymentOrder?.paymentLinkUrl) return;
    navigator.clipboard.writeText(proposalResult.paymentOrder.paymentLinkUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl p-6 sm:p-8 border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#5E4BE2]/10 text-[#5E4BE2] flex items-center justify-center font-bold">
              <IconCreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Send Plan Proposal &amp; Razorpay Payment Link
              </h3>
              <p className="text-xs text-slate-500">
                Generate proposal, send secure payment link, and auto-provision upon payment.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 cursor-pointer"
          >
            <IconX className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
            <IconAlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {proposalResult ? (
          /* SUCCESS STATE */
          <div className="py-6 space-y-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <IconCheck className="w-7 h-7 stroke-[2.5]" />
            </div>

            <div>
              <h4 className="text-xl font-bold text-slate-900">
                Proposal &amp; Razorpay Payment Link Dispatched!
              </h4>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                An invitation email with plan details and the payment link was sent to{' '}
                <strong className="text-slate-800">{proposalResult.paymentOrder.contactEmail}</strong>.
              </p>
            </div>

            {/* Link Box */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Direct Razorpay Payment Link:
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={proposalResult.paymentOrder.paymentLinkUrl}
                  className="w-full text-xs font-mono bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 select-all"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-4 py-2 rounded-xl bg-[#5E4BE2] hover:bg-[#4d3cc9] text-white text-xs font-bold shrink-0 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <IconCopy className="w-3.5 h-3.5" />
                  <span>{copied ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
              <span className="text-[11px] text-slate-400 block">
                Total Payable: <strong>₹{Number(proposalResult.paymentOrder.amount).toLocaleString('en-IN')}</strong> (incl. 18% GST)
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-100 text-xs text-indigo-900 text-left space-y-1">
              <strong>What Happens Next:</strong>
              <p className="text-[11px] text-indigo-700 leading-relaxed">
                As soon as the company pays through this link, the system will automatically create the company workspace ({proposalResult.paymentOrder.subdomain}.uptrix.io), create the company administrator account, and email login credentials + GST tax invoice directly to the contact.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        ) : (
          /* INPUT FORM */
          <form onSubmit={handleSubmit} className="pt-5 space-y-4">
            {/* Step 1: Package & Plan Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Select Plan Tier *
                </label>
                <select
                  required
                  value={form.packageId}
                  onChange={(e) => setForm({ ...form, packageId: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#5E4BE2]/15 focus:border-[#5E4BE2] cursor-pointer"
                >
                  {packages.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.name} ({pkg.employeeLimit} Seats)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Billing Cycle *
                </label>
                <select
                  value={form.planType}
                  onChange={(e) => setForm({ ...form, planType: e.target.value as any })}
                  className="w-full px-3.5 py-2.5 text-xs font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#5E4BE2]/15 focus:border-[#5E4BE2] cursor-pointer"
                >
                  <option value="MONTHLY">Monthly Billing</option>
                  <option value="QUARTERLY">Quarterly Billing</option>
                  <option value="YEARLY">Yearly Billing (Save 20%)</option>
                </select>
              </div>
            </div>

            {/* Step 2: Company Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Company / Organization Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Tech Global"
                  value={form.companyName}
                  onChange={handleCompanyNameChange}
                  className="w-full px-3.5 py-2.5 text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#5E4BE2]/15 focus:border-[#5E4BE2]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Tenant Subdomain *
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    required
                    placeholder="acmetech"
                    value={form.subdomain}
                    onChange={(e) => setForm({ ...form, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '') })}
                    className="w-full px-3.5 py-2.5 text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#5E4BE2]/15 focus:border-[#5E4BE2] pr-20"
                  />
                  <span className="absolute right-3 text-xs font-bold text-slate-400 pointer-events-none">
                    .uptrix.io
                  </span>
                </div>
              </div>
            </div>

            {/* Step 3: Contact Person */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Contact Person Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Priya Sharma"
                  value={form.contactName}
                  onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#5E4BE2]/15 focus:border-[#5E4BE2]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Contact Work Email *
                </label>
                <input
                  type="email"
                  required
                  placeholder="contact@company.com"
                  value={form.contactEmail}
                  onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#5E4BE2]/15 focus:border-[#5E4BE2]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={form.contactPhone}
                  onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#5E4BE2]/15 focus:border-[#5E4BE2]"
                />
              </div>
            </div>

            {/* Optional Custom Pricing / Seats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Custom Base Amount (₹) <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="number"
                  placeholder={`Default: ₹${basePrice}`}
                  value={form.customAmount}
                  onChange={(e) => setForm({ ...form, customAmount: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Custom Seat Limit <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="number"
                  placeholder={`Default: ${selectedPkg?.employeeLimit || 25}`}
                  value={form.customEmployeeLimit}
                  onChange={(e) => setForm({ ...form, customEmployeeLimit: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                />
              </div>
            </div>

            {/* Live Pricing Summary Box */}
            <div className="p-4 rounded-2xl bg-[#5E4BE2]/5 border border-[#5E4BE2]/20 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Total Razorpay Invoice Amount
                </span>
                <span className="text-xs text-slate-600">
                  Base ₹{basePrice.toLocaleString('en-IN')} + 18% GST (₹{gstPrice.toLocaleString('en-IN')})
                </span>
              </div>
              <div className="text-right">
                <span className="text-xl font-black text-[#5E4BE2] font-mono">
                  ₹{totalPrice.toLocaleString('en-IN')}
                </span>
                <span className="text-[10px] text-slate-400 block font-semibold">
                  SAC 998313 Compliant
                </span>
              </div>
            </div>

            {/* Submit Bar */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <IconLock className="w-3.5 h-3.5" />
                Automatic account provisioning upon payment
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#5E4BE2] to-[#7B69EE] hover:from-[#4d3cc9] hover:to-[#6855dd] text-white text-xs font-bold shadow-md shadow-[#5E4BE2]/25 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <IconSend className="w-4 h-4" />
                  <span>{isSubmitting ? 'Generating Link...' : 'Generate & Send Payment Link'}</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
