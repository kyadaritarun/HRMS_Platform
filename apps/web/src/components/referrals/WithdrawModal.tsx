import React, { useState } from 'react';
import { IconX, IconLoader2, IconBuildingBank, IconCheck } from '@tabler/icons-react';
import api from '../../api/client';

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableBalance: number;
  onSuccess?: () => void;
}

export const WithdrawModal: React.FC<WithdrawModalProps> = ({
  isOpen,
  onClose,
  availableBalance,
  onSuccess,
}) => {
  const [formData, setFormData] = useState({
    amount: availableBalance > 0 ? String(availableBalance) : '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    accountHolder: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errorMessage) setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const numAmount = Number(formData.amount);
    if (!numAmount || numAmount <= 0) {
      setErrorMessage('Please enter a valid amount.');
      return;
    }
    if (numAmount > availableBalance) {
      setErrorMessage(`Amount exceeds available balance of ₹ ${availableBalance.toLocaleString('en-IN')}`);
      return;
    }
    if (!formData.bankName.trim()) {
      setErrorMessage('Bank name is required.');
      return;
    }
    if (!formData.accountNumber.trim()) {
      setErrorMessage('Bank account number is required.');
      return;
    }
    if (!formData.ifscCode.trim()) {
      setErrorMessage('IFSC code is required.');
      return;
    }
    if (!formData.accountHolder.trim()) {
      setErrorMessage('Account holder name is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/referrals/withdraw', {
        amount: numAmount,
        bankName: formData.bankName.trim(),
        accountNumber: formData.accountNumber.trim(),
        ifscCode: formData.ifscCode.trim().toUpperCase(),
        accountHolder: formData.accountHolder.trim(),
      });

      setSuccessMessage('Withdrawal request submitted! Funds will be processed shortly.');
      setTimeout(() => {
        setSuccessMessage(null);
        onSuccess?.();
        onClose();
      }, 1400);
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Failed to submit withdrawal request.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <IconBuildingBank className="w-4.5 h-4.5" />
            </div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Withdraw to Bank</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <IconX className="w-5 h-5" />
          </button>
        </div>

        {/* Balance callout */}
        <div className="mx-6 mb-4 p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">Available Balance</span>
          <span className="text-sm font-bold text-emerald-700">₹ {availableBalance.toLocaleString('en-IN')}</span>
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div className="mx-6 mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <IconCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="mx-6 mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
            {errorMessage}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Withdrawal Amount (₹) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              name="amount"
              min="1"
              max={availableBalance}
              value={formData.amount}
              onChange={handleChange}
              placeholder="Enter amount to withdraw"
              required
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50/50 border border-slate-200/90 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white transition-all font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Account Holder Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              name="accountHolder"
              value={formData.accountHolder}
              onChange={handleChange}
              placeholder="As per bank records"
              required
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50/50 border border-slate-200/90 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Bank Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="bankName"
                value={formData.bankName}
                onChange={handleChange}
                placeholder="e.g. HDFC Bank"
                required
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50/50 border border-slate-200/90 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                IFSC Code <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="ifscCode"
                value={formData.ifscCode}
                onChange={handleChange}
                placeholder="e.g. HDFC0001234"
                required
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50/50 border border-slate-200/90 text-slate-800 placeholder-slate-400 uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Bank Account Number <span className="text-rose-500">*</span>
            </label>
            <input
              type="password"
              name="accountNumber"
              value={formData.accountNumber}
              onChange={handleChange}
              placeholder="Enter full bank account number"
              required
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50/50 border border-slate-200/90 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white transition-all font-mono"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200/90 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || availableBalance <= 0}
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting && <IconLoader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Submit Request</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WithdrawModal;

