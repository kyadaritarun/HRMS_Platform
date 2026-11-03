import React, { useState } from 'react';
import { IconX, IconLoader2, IconCheck } from '@tabler/icons-react';
import api from '../../api/client';

interface ReferLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ReferLeadModal: React.FC<ReferLeadModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState({
    businessName: '',
    ownerName: '',
    mobileNumber: '',
    email: '',
    city: '',
    zipCode: '',
    address: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errorMessage) setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Basic validation
    if (!formData.businessName.trim()) {
      setErrorMessage('Business name is required.');
      return;
    }
    if (!formData.ownerName.trim()) {
      setErrorMessage('Owner name is required.');
      return;
    }
    if (!formData.mobileNumber.trim()) {
      setErrorMessage('Mobile number is required.');
      return;
    }
    if (!formData.email.trim()) {
      setErrorMessage('Email address is required.');
      return;
    }
    if (!formData.city.trim()) {
      setErrorMessage('City is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/referrals', {
        businessName: formData.businessName.trim(),
        ownerName: formData.ownerName.trim(),
        mobileNumber: formData.mobileNumber.trim(),
        email: formData.email.trim(),
        city: formData.city.trim(),
        zipCode: formData.zipCode.trim() || undefined,
        address: formData.address.trim() || undefined,
      });

      setSuccessMessage('Lead submitted successfully! Our sales team will reach out.');
      setTimeout(() => {
        setSuccessMessage(null);
        setFormData({
          businessName: '',
          ownerName: '',
          mobileNumber: '',
          email: '',
          city: '',
          zipCode: '',
          address: '',
        });
        onSuccess?.();
        onClose();
      }, 1400);
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Failed to submit lead. Please try again.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <h2 className="text-base font-bold text-slate-900 tracking-tight">Refer a Lead</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <IconX className="w-5 h-5" />
          </button>
        </div>

        {/* Explanatory description note */}
        <div className="px-6 pb-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Share the business details below. Our sales team reaches out to them, and you earn{' '}
            <span className="font-semibold text-slate-900">₹ 3,000</span> in your wallet once they become a paying customer.
          </p>
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
          {/* Row 1: Business Name & Owner Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Business Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="businessName"
                value={formData.businessName}
                onChange={handleChange}
                placeholder="Enter business name"
                required
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50/50 border border-slate-200/90 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-[#5E4BE2] focus:bg-white transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Owner Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="ownerName"
                value={formData.ownerName}
                onChange={handleChange}
                placeholder="Enter owner name"
                required
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50/50 border border-slate-200/90 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-[#5E4BE2] focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Row 2: Mobile Number & Email Address */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mobile Number <span className="text-rose-500">*</span>
              </label>
              <div className="flex rounded-xl overflow-hidden border border-slate-200/90 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-[#5E4BE2] transition-all bg-white">
                <span className="inline-flex items-center px-3 text-xs font-semibold text-slate-600 bg-slate-100 border-r border-slate-200">
                  +91
                </span>
                <input
                  type="tel"
                  name="mobileNumber"
                  value={formData.mobileNumber}
                  onChange={handleChange}
                  placeholder="Enter mobile number"
                  required
                  className="w-full px-3 py-2 text-xs bg-slate-50/50 text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter email address"
                required
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50/50 border border-slate-200/90 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-[#5E4BE2] focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Row 3: City & Zip Code */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                City <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="Enter city"
                required
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50/50 border border-slate-200/90 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-[#5E4BE2] focus:bg-white transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Zip Code <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                name="zipCode"
                value={formData.zipCode}
                onChange={handleChange}
                placeholder="Zip code"
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50/50 border border-slate-200/90 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-[#5E4BE2] focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Row 4: Full Address (optional) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Address <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              name="address"
              rows={3}
              value={formData.address}
              onChange={handleChange}
              placeholder="Enter the full address"
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50/50 border border-slate-200/90 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-[#5E4BE2] focus:bg-white transition-all resize-none"
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
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-[#0284c7] hover:bg-[#0369a1] active:scale-[0.99] rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting && <IconLoader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Submit Lead</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReferLeadModal;

