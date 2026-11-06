import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../api/client';
import {
  IconBuildingSkyscraper,
  IconBuilding,
  IconArrowLeft,
  IconMail,
  IconUpload,
  IconCheck,
  IconAlertCircle,
  IconPackage,
  IconX,
  IconCreditCard,
  IconUser,
  IconPhone,
  IconCopy,
  IconWorld,
  IconId,
  IconMapPin,
  IconArrowRight,
  IconLoader2,
  IconSparkles,
} from '@tabler/icons-react';

interface PackageOption {
  id: number;
  name: string;
  description: string;
  currency: string;
  priceMonthly: number;
  priceQuarterly: number;
  priceYearly: number;
  employeeLimit: number;
  billingDefault: string;
  enabledFeatures?: string[];
  tier?: 'BASIC' | 'MEDIUM' | 'CUSTOM';
  companyName?: string;
}

export const AddCompanyPage: React.FC = () => {
  const navigate = useNavigate();

  // Packages state
  const [packages, setPackages] = useState<PackageOption[]>([]);
  const [isLoadingPackages, setIsLoadingPackages] = useState(true);

  // Form state
  const [form, setForm] = useState({
    name: '',
    subdomain: '',
    code: '',
    logoUrl: '',
    website: '',
    packageId: '',
    planType: 'MONTHLY' as 'MONTHLY' | 'QUARTERLY' | 'YEARLY',
    allowedEmailDomains: '',
    // Admin / Contact Person
    adminName: '',
    adminEmail: '',
    adminPhone: '',
    // Address
    street: '',
    addressLine2: '',
    city: '',
    state: '',
    pinCode: '',
    country: 'India',
  });

  // Validation states
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{
    title: string;
    message: string;
    type: 'error' | 'success' | 'warning';
  } | null>(null);

  const [createdResult, setCreatedResult] = useState<{
    company: any;
    paymentLinkUrl?: string;
    adminEmail: string;
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Auto dismiss toast after 7 seconds
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 7000);
    return () => clearTimeout(timer);
  }, [toast]);

  // Load packages
  useEffect(() => {
    const fetchPackages = async () => {
      try {
        setIsLoadingPackages(true);
        const res = await api.get('/superadmin/packages');
        const fetchedPackages = res.data?.packages || [];
        setPackages(fetchedPackages);
        if (fetchedPackages.length > 0) {
          setForm((prev) => (prev.packageId ? prev : { ...prev, packageId: String(fetchedPackages[0].id) }));
        }
      } catch (err) {
        console.error('Failed to load packages:', err);
      } finally {
        setIsLoadingPackages(false);
      }
    };
    fetchPackages();
  }, []);

  // Validation logic
  const validateField = (name: string, value: any): string => {
    switch (name) {
      case 'name':
        if (!value?.trim()) return 'Company name is required.';
        if (value.trim().length < 2) return 'Company name must be at least 2 characters.';
        return '';
      case 'subdomain':
        if (!value?.trim()) return 'Subdomain is required.';
        if (!/^[a-z0-9-]+$/.test(value.trim())) return 'Subdomain can only contain lowercase letters, numbers, and hyphens.';
        if (value.trim().length < 2) return 'Subdomain must be at least 2 characters.';
        return '';
      case 'adminName':
        if (!value?.trim()) return 'Admin contact name is required.';
        if (value.trim().length < 2) return 'Contact name must be at least 2 characters.';
        return '';
      case 'adminEmail':
        if (!value?.trim()) return 'Admin work email is required.';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim())) return 'Please enter a valid work email address.';
        return '';
      case 'adminPhone':
        if (value?.trim() && !/^\d{10}$/.test(value.trim())) return 'Phone number must be exactly 10 digits.';
        return '';
      case 'packageId':
        if (!value) return 'Please select a subscription package plan.';
        return '';
      default:
        return '';
    }
  };

  const validateAll = () => {
    const newErrors: Record<string, string> = {};
    const fieldsToValidate = ['name', 'subdomain', 'adminName', 'adminEmail', 'adminPhone', 'packageId'];
    fieldsToValidate.forEach((f) => {
      const err = validateField(f, (form as any)[f]);
      if (err) newErrors[f] = err;
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const err = validateField(field, (form as any)[field]);
    setErrors((prev) => ({ ...prev, [field]: err }));
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    const autoSub = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const autoCode = name.replace(/[^a-zA-Z]/g, '').slice(0, 5).toUpperCase();

    setForm((prev) => ({
      ...prev,
      name,
      adminName: prev.adminName === '' || prev.adminName === `${prev.name} Admin` ? `${name} Admin` : prev.adminName,
      subdomain: prev.subdomain === '' || prev.subdomain === prev.name.toLowerCase().replace(/[^a-z0-9]/g, '') ? autoSub : prev.subdomain,
      code: prev.code === '' || prev.code === prev.name.replace(/[^a-zA-Z]/g, '').slice(0, 5).toUpperCase() ? autoCode : prev.code,
    }));

    if (touched.name) {
      setErrors((prev) => ({ ...prev, name: validateField('name', name) }));
    }
    if (touched.subdomain) {
      setErrors((prev) => ({ ...prev, subdomain: validateField('subdomain', autoSub) }));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    if (name === 'adminPhone') {
      const numericVal = value.replace(/\D/g, '').slice(0, 10);
      setForm((prev) => ({ ...prev, [name]: numericVal }));
      if (touched[name]) {
        setErrors((prev) => ({ ...prev, [name]: validateField(name, numericVal) }));
      }
      return;
    }

    if (name === 'subdomain') {
      const cleanSub = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
      setForm((prev) => ({ ...prev, [name]: cleanSub }));
      if (touched[name]) {
        setErrors((prev) => ({ ...prev, [name]: validateField(name, cleanSub) }));
      }
      return;
    }

    if (name === 'code') {
      const cleanCode = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
      setForm((prev) => ({ ...prev, [name]: cleanCode }));
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
    if (touched[name]) {
      setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
    }
  };

  const handleLogoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    const localUrl = URL.createObjectURL(file);
    setLogoPreview(localUrl);

    try {
      setIsUploadingLogo(true);
      const formData = new FormData();
      formData.append('logo', file);
      const res = await api.post('/superadmin/upload-logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data?.url) {
        setForm((prev) => ({ ...prev, logoUrl: res.data.url }));
      }
    } catch (err) {
      console.warn('Logo upload fallback to base64 preview:', err);
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm((prev) => ({ ...prev, logoUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleRemoveLogo = () => {
    setSelectedFile(null);
    setLogoPreview(null);
    setForm((prev) => ({ ...prev, logoUrl: '' }));
  };

  // Selected package details & Pricing calculations
  const selectedPackage = packages.find((p) => String(p.id) === String(form.packageId));

  let basePrice = 0;
  if (selectedPackage) {
    if (form.planType === 'YEARLY') {
      basePrice = Number(selectedPackage.priceYearly) || Number(selectedPackage.priceMonthly) * 10;
    } else if (form.planType === 'QUARTERLY') {
      basePrice = Number(selectedPackage.priceQuarterly) || Number(selectedPackage.priceMonthly) * 3;
    } else {
      basePrice = Number(selectedPackage.priceMonthly) || 0;
    }
  }

  const gst = Math.round(basePrice * 0.18 * 100) / 100;
  const totalPrice = basePrice + gst;

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all as touched
    setTouched({
      name: true,
      subdomain: true,
      adminName: true,
      adminEmail: true,
      adminPhone: true,
      packageId: true,
    });

    if (!validateAll()) {
      setToast({
        title: 'Validation Error',
        message: 'Please resolve the highlighted errors in the form before submitting.',
        type: 'error',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        name: form.name.trim(),
        subdomain: form.subdomain.trim().toLowerCase(),
        code: form.code.trim().toUpperCase() || form.name.replace(/[^a-zA-Z]/g, '').slice(0, 5).toUpperCase() || 'CMP',
        logo: form.logoUrl || null,
        website: form.website.trim() || null,
        packageId: form.packageId ? Number(form.packageId) : null,
        planType: form.planType,
        subAmount: totalPrice,
        allowedEmailDomains: form.allowedEmailDomains.trim(),
        adminName: form.adminName.trim() || `${form.name.trim()} Admin`,
        adminEmail: form.adminEmail.trim().toLowerCase(),
        adminPhone: form.adminPhone.trim(),
        paymentStatus: 'IN_PROCESS',
        sendPaymentLink: true,
        address: {
          street: form.street.trim(),
          addressLine2: form.addressLine2.trim(),
          city: form.city.trim(),
          state: form.state.trim(),
          pinCode: form.pinCode.trim(),
          country: form.country.trim(),
        },
      };

      const res = await api.post('/superadmin/companies', payload);
      const paymentLinkUrl = res.data?.paymentLinkUrl || res.data?.company?.paymentLinkUrl;

      setCreatedResult({
        company: res.data?.company,
        paymentLinkUrl,
        adminEmail: form.adminEmail.trim(),
      });

      setToast({
        title: 'Company Created Successfully',
        message: `Tenant registered and payment link dispatched to ${form.adminEmail.trim()}.`,
        type: 'success',
      });
    } catch (err: any) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Failed to register company. Please verify inputs.';
      setToast({
        title: 'Registration Failed',
        message: msg,
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyPaymentLink = () => {
    if (!createdResult?.paymentLinkUrl) return;
    navigator.clipboard.writeText(createdResult.paymentLinkUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleResetForm = () => {
    setErrors({});
    setTouched({});
    setForm({
      name: '',
      subdomain: '',
      code: '',
      logoUrl: '',
      website: '',
      packageId: packages.length > 0 ? String(packages[0].id) : '',
      planType: 'MONTHLY',
      allowedEmailDomains: '',
      adminName: '',
      adminEmail: '',
      adminPhone: '',
      street: '',
      addressLine2: '',
      city: '',
      state: '',
      pinCode: '',
      country: 'India',
    });
    setSelectedFile(null);
    setLogoPreview(null);
  };

  const getInputClass = (fieldName: string, basePadding = 'pl-10 pr-3.5') => {
    const hasError = touched[fieldName] && errors[fieldName];
    return `w-full ${basePadding} py-2.5 text-xs font-semibold text-slate-900 rounded-xl transition-all shadow-2xs ${
      hasError
        ? 'bg-rose-50/40 border border-rose-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-rose-500/15 focus:border-rose-500'
        : 'bg-[#f1f5f9] border border-slate-200 focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#5E4BE2]/15 focus:border-[#5E4BE2] hover:bg-slate-100 hover:border-slate-300'
    } placeholder:text-slate-400`;
  };

  const renderFieldError = (fieldName: string) => {
    if (touched[fieldName] && errors[fieldName]) {
      return (
        <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1 animate-in fade-in duration-150">
          <IconAlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
          <span>{errors[fieldName]}</span>
        </p>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 relative max-w-5xl mx-auto pb-16">
      {/* ===================== FLOATING TOASTER NOTIFICATION ===================== */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 max-w-sm sm:max-w-md w-[calc(100%-3rem)] pointer-events-auto animate-in slide-in-from-top-4 fade-in duration-200">
          <div
            className={`p-4 rounded-2xl border shadow-xl flex items-start gap-3 backdrop-blur-md transition-all ${
              toast.type === 'error'
                ? 'bg-rose-50/95 border-rose-200 text-rose-950 shadow-rose-900/10'
                : toast.type === 'success'
                ? 'bg-emerald-50/95 border-emerald-200 text-emerald-950 shadow-emerald-900/10'
                : 'bg-amber-50/95 border-amber-200 text-amber-950 shadow-amber-900/10'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                toast.type === 'error'
                  ? 'bg-rose-100 text-rose-600'
                  : toast.type === 'success'
                  ? 'bg-emerald-100 text-emerald-600'
                  : 'bg-amber-100 text-amber-600'
              }`}
            >
              {toast.type === 'error' ? (
                <IconAlertCircle className="w-5 h-5 stroke-[2.2]" />
              ) : toast.type === 'success' ? (
                <IconCheck className="w-5 h-5 stroke-[2.2]" />
              ) : (
                <IconAlertCircle className="w-5 h-5 stroke-[2.2]" />
              )}
            </div>

            <div className="flex-1 min-w-0 pt-0.5">
              <p className="font-bold text-xs leading-snug">{toast.title}</p>
              <p className="mt-0.5 text-[11px] font-medium leading-relaxed opacity-90">{toast.message}</p>
            </div>

            <button
              type="button"
              onClick={() => setToast(null)}
              className="p-1 -mr-1 text-slate-500 font-medium hover:text-slate-600 rounded-lg hover:bg-black/5 transition-colors cursor-pointer shrink-0"
              title="Dismiss"
            >
              <IconX className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ===================== TOP HEADER BAR ===================== */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5E4BE2] shrink-0">
              <IconBuildingSkyscraper className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Add Company
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Register new tenant workspace, configure plan pricing, and dispatch Razorpay payment link.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            to="/super-admin/companies"
            className="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-200/90 shadow-2xs transition-all cursor-pointer active:scale-[0.98]"
          >
            <IconArrowLeft className="w-4 h-4 text-slate-500 font-medium" />
            <span>Back to Companies</span>
          </Link>
        </div>
      </div>

      {/* ===================== POST-CREATION SUCCESS VIEW ===================== */}
      {createdResult ? (
        <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in-95">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md">
                <IconCheck className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Company Registered &amp; Payment Link Sent!
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  An official plan proposal and secure Razorpay payment link was dispatched to{' '}
                  <strong className="text-indigo-600">{createdResult.adminEmail}</strong>.
                </p>
              </div>
            </div>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-bold border border-amber-200/80 shrink-0 self-start sm:self-center">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              STATUS: In Process
            </span>
          </div>

          {/* Payment Link Card */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
            <div className="truncate flex-1 min-w-0">
              <span className="text-slate-500 font-bold block text-[10px] uppercase">
                Payment Link URL:
              </span>
              <span className="font-mono text-slate-800 font-medium truncate block mt-0.5">
                {createdResult.paymentLinkUrl || 'Direct payment link generated'}
              </span>
            </div>

            {createdResult.paymentLinkUrl && (
              <button
                type="button"
                onClick={handleCopyPaymentLink}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shrink-0 shadow-xs cursor-pointer transition-colors"
              >
                {copiedLink ? <IconCheck className="w-4 h-4" /> : <IconCopy className="w-4 h-4" />}
                <span>{copiedLink ? 'Copied Link!' : 'Copy Payment Link'}</span>
              </button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
            <p className="text-xs text-slate-500 font-medium">
              Once the company completes payment, you can set up the primary Company Administrator on the Tenants &amp; Companies page.
            </p>
            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                type="button"
                onClick={handleResetForm}
                className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 shadow-2xs transition-colors cursor-pointer"
              >
                + Register Another
              </button>
              <button
                type="button"
                onClick={() => navigate('/super-admin/companies')}
                className="px-5 py-2 bg-gradient-to-r from-[#5E4BE2] to-[#4B39C3] hover:from-[#5340D4] hover:to-[#4130B4] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Go to Tenants List &rarr;
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ===================== MAIN FORM ===================== */
        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-8">
            {/* Section 1: Company Profile & Workspace Identity */}
            <div className="space-y-4">
              <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-[#5E4BE2] flex items-center justify-center shrink-0">
                  <IconBuilding className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-slate-900">
                    1. Company Profile &amp; Workspace Identity
                  </h2>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Workspace name, unique tenant subdomain, and branding details
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Company Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Company Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#5E4BE2]">
                      <IconBuilding className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      name="name"
                      required
                      value={form.name}
                      onChange={handleNameChange}
                      onBlur={() => handleBlur('name')}
                      placeholder="e.g. Acme Technologies Pvt Ltd"
                      className={getInputClass('name')}
                    />
                  </div>
                  {renderFieldError('name')}
                </div>

                {/* Subdomain */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700">Subdomain <span className="text-rose-500">*</span></label>
                    <span className="text-[10px] text-slate-400 font-mono">.uptrix.io</span>
                  </div>
                  <div className="relative flex items-center">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-indigo-600">
                      <IconWorld className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      name="subdomain"
                      required
                      value={form.subdomain}
                      onChange={handleChange}
                      onBlur={() => handleBlur('subdomain')}
                      placeholder="acme"
                      className={getInputClass('subdomain', 'pl-10 pr-24')}
                    />
                    <span className="absolute right-3 text-xs font-mono font-semibold text-slate-400 select-none">
                      .uptrix.io
                    </span>
                  </div>
                  {renderFieldError('subdomain')}
                  {!errors.subdomain && form.subdomain && (
                    <p className="text-[11px] text-indigo-600 font-mono mt-1">
                      URL: https://{form.subdomain}.uptrix.io
                    </p>
                  )}
                </div>

                {/* Company Code */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Company Code</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <IconId className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      name="code"
                      value={form.code}
                      onChange={handleChange}
                      placeholder="e.g. ACME"
                      className={getInputClass('code')}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">Used for employee prefixes and records.</span>
                </div>

                {/* Official Website */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Official Website</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <IconWorld className="w-4 h-4" />
                    </div>
                    <input
                      type="url"
                      name="website"
                      value={form.website}
                      onChange={handleChange}
                      placeholder="https://acme.com"
                      className={getInputClass('website')}
                    />
                  </div>
                </div>

                {/* Allowed Corporate Email Domains */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Authorized Employee Email Domains
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <IconMail className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      name="allowedEmailDomains"
                      value={form.allowedEmailDomains}
                      onChange={handleChange}
                      placeholder="e.g. acme.com, acmeglobal.com (comma separated)"
                      className={getInputClass('allowedEmailDomains')}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium mt-1">
                    Enforces corporate email restrictions so company employees can only be onboarded with these authorized domain(s).
                  </p>
                </div>

                {/* Company Logo Upload */}
                <div className="sm:col-span-2 pt-1">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Company Logo</label>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-[#f1f5f9] hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all shadow-2xs hover:border-slate-300">
                      <IconUpload className="w-4 h-4 text-[#5E4BE2]" />
                      <span>{isUploadingLogo ? 'Uploading...' : 'Choose Logo Image'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoSelect}
                        disabled={isUploadingLogo}
                        className="hidden"
                      />
                    </label>
                    <span className="text-xs text-slate-500 font-medium truncate max-w-xs">
                      {selectedFile ? selectedFile.name : 'PNG, JPG or SVG (Max 5MB)'}
                    </span>

                    {logoPreview && (
                      <div className="flex items-center gap-2 ml-auto">
                        <img
                          src={logoPreview}
                          alt="Logo preview"
                          className="w-9 h-9 rounded-xl object-contain border border-slate-200 bg-white p-1 shadow-2xs"
                        />
                        <button
                          type="button"
                          onClick={handleRemoveLogo}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Remove logo"
                        >
                          <IconX className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Company Admin & Billing Contact */}
            <div className="space-y-4">
              <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-[#5E4BE2] flex items-center justify-center shrink-0">
                  <IconUser className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-slate-900">
                    2. Company Admin Contact &amp; Payment Recipient
                  </h2>
                  <p className="text-[11px] text-slate-500 font-medium">
                    The plan proposal and secure Razorpay payment link will be dispatched to this contact
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Admin Contact Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Admin Contact Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#5E4BE2]">
                      <IconUser className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      name="adminName"
                      required
                      value={form.adminName}
                      onChange={handleChange}
                      onBlur={() => handleBlur('adminName')}
                      placeholder="e.g. John Doe"
                      className={getInputClass('adminName')}
                    />
                  </div>
                  {renderFieldError('adminName')}
                </div>

                {/* Admin Work Email */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Admin Work Email <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-indigo-600">
                      <IconMail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      name="adminEmail"
                      required
                      value={form.adminEmail}
                      onChange={handleChange}
                      onBlur={() => handleBlur('adminEmail')}
                      placeholder="admin@acme.com"
                      className={getInputClass('adminEmail')}
                    />
                  </div>
                  {renderFieldError('adminEmail')}
                  {!errors.adminEmail && form.adminEmail && (
                    <p className="text-[10px] text-indigo-600 font-medium mt-1">
                      Payment link dispatched here immediately.
                    </p>
                  )}
                </div>

                {/* Admin Phone */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700">Phone Number</label>
                    <span className={`text-[10px] font-mono font-bold ${form.adminPhone.length === 10 ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {form.adminPhone.length}/10 digits
                    </span>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-600">
                      <IconPhone className="w-4 h-4" />
                    </div>
                    <input
                      type="tel"
                      name="adminPhone"
                      maxLength={10}
                      value={form.adminPhone}
                      onChange={handleChange}
                      onBlur={() => handleBlur('adminPhone')}
                      placeholder="9876543210"
                      className={getInputClass('adminPhone')}
                    />
                  </div>
                  {renderFieldError('adminPhone')}
                </div>
              </div>
            </div>

            {/* Section 3: Registered Headquarters Address */}
            <div className="space-y-4">
              <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-[#5E4BE2] flex items-center justify-center shrink-0">
                  <IconMapPin className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-slate-900">
                    3. Registered Headquarters Address
                  </h2>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Corporate headquarters or billing address details
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Street Address */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Street Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <IconMapPin className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      name="street"
                      value={form.street}
                      onChange={handleChange}
                      placeholder="123 Tech Park, 4th Floor"
                      className={getInputClass('street')}
                    />
                  </div>
                </div>

                {/* Address Line 2 */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Suite / Landmark
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <IconMapPin className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      name="addressLine2"
                      value={form.addressLine2}
                      onChange={handleChange}
                      placeholder="Opposite Metro Station"
                      className={getInputClass('addressLine2')}
                    />
                  </div>
                </div>

                {/* City & State & PIN */}
                <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">City</label>
                    <input
                      type="text"
                      name="city"
                      value={form.city}
                      onChange={handleChange}
                      placeholder="Bengaluru"
                      className={getInputClass('city', 'px-3.5')}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">State</label>
                    <input
                      type="text"
                      name="state"
                      value={form.state}
                      onChange={handleChange}
                      placeholder="Karnataka"
                      className={getInputClass('state', 'px-3.5')}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">PIN / Postal Code</label>
                    <input
                      type="text"
                      name="pinCode"
                      value={form.pinCode}
                      onChange={handleChange}
                      placeholder="560100"
                      className={getInputClass('pinCode', 'px-3.5')}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 4: Subscription Plan & Billing Tier */}
            <div className="space-y-4">
              <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-[#5E4BE2] flex items-center justify-center shrink-0">
                  <IconCreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-slate-900">
                    4. Subscription Plan &amp; Billing Selection
                  </h2>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Select package tier, employee limits, and payment cadence
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                {/* Plan Dropdown */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Subscription Package Plan <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-indigo-600">
                      <IconPackage className="w-4 h-4" />
                    </div>
                    <select
                      name="packageId"
                      required
                      value={form.packageId}
                      onChange={handleChange}
                      onBlur={() => handleBlur('packageId')}
                      className={getInputClass('packageId', 'pl-10 pr-4 appearance-none cursor-pointer')}
                    >
                      <option value="">Select a package plan</option>
                      {packages.map((pkg) => {
                        const isCustom =
                          pkg.tier === 'CUSTOM' ||
                          pkg.name.toLowerCase().includes('custom') ||
                          pkg.name.toLowerCase().includes('enterprise');
                        const tag = isCustom ? ' [🏢 Custom Company Plan]' : ` [${pkg.tier || 'Standard'}]`;

                        return (
                          <option key={pkg.id} value={pkg.id}>
                            {pkg.name} {tag} • ({pkg.employeeLimit} seats)
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  {renderFieldError('packageId')}
                  <p className="text-[11px] text-slate-500 font-medium mt-1">
                    Select standard tiers or custom enterprise packages configured in Packages &amp; Pricing.
                  </p>
                </div>

                {/* Billing Cycle Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Billing Cycle (Plan Type) <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, planType: 'MONTHLY' }))}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        form.planType === 'MONTHLY'
                          ? 'border-[#5E4BE2] bg-indigo-50/80 text-indigo-950 font-bold ring-2 ring-indigo-500/20'
                          : 'border-slate-200 bg-[#f1f5f9] hover:bg-slate-100 text-slate-700 font-semibold'
                      }`}
                    >
                      <div className="text-xs">Monthly</div>
                      {selectedPackage && (
                        <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                          ₹{Number(selectedPackage.priceMonthly || 0).toLocaleString()}
                        </div>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, planType: 'QUARTERLY' }))}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        form.planType === 'QUARTERLY'
                          ? 'border-[#5E4BE2] bg-indigo-50/80 text-indigo-950 font-bold ring-2 ring-indigo-500/20'
                          : 'border-slate-200 bg-[#f1f5f9] hover:bg-slate-100 text-slate-700 font-semibold'
                      }`}
                    >
                      <div className="text-xs">Quarterly</div>
                      {selectedPackage && (
                        <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                          ₹{Number(selectedPackage.priceQuarterly || 0).toLocaleString()}
                        </div>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, planType: 'YEARLY' }))}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        form.planType === 'YEARLY'
                          ? 'border-emerald-600 bg-emerald-50/80 text-emerald-950 font-bold ring-2 ring-emerald-500/20'
                          : 'border-slate-200 bg-[#f1f5f9] hover:bg-slate-100 text-slate-700 font-semibold'
                      }`}
                    >
                      <div className="text-xs">Yearly</div>
                      {selectedPackage && (
                        <div className="text-[11px] text-emerald-600 font-bold mt-0.5">
                          ₹{Number(selectedPackage.priceYearly || 0).toLocaleString()}
                        </div>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Dynamic Price Breakdown Box */}
              {selectedPackage && (
                <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-50 via-indigo-50/20 to-purple-50/30 border border-indigo-100 space-y-3 mt-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200/80 gap-2">
                    <div>
                      <span className="font-bold text-slate-900 text-sm flex items-center gap-2">
                        {selectedPackage.name}
                        <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold">
                          {form.planType}
                        </span>
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
                        Capacity: Up to {selectedPackage.employeeLimit} employee workspace seats
                      </span>
                    </div>

                    <div className="text-left sm:text-right">
                      <div className="text-xs text-slate-500 font-medium">Total Billed in Razorpay Link:</div>
                      <div className="text-xl font-black text-indigo-700">
                        ₹{totalPrice.toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600 pt-1">
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">
                        Plan Base Amount
                      </span>
                      <span className="font-bold text-slate-800">
                        ₹{basePrice.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">
                        GST (18%)
                      </span>
                      <span className="font-bold text-slate-800">
                        ₹{gst.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">
                        Initial Tenant Status
                      </span>
                      <span className="inline-flex items-center gap-1 font-bold text-amber-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        In Process (Awaiting Payment)
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Form Actions Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-500 font-medium">
                Registering the workspace generates the tenant database entry and emails the payment invoice.
              </p>

              <div className="flex items-center gap-3 self-end sm:self-center">
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Reset Form
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#5E4BE2] to-[#4B39C3] hover:from-[#5340D4] hover:to-[#4130B4] text-white text-xs font-bold shadow-md shadow-indigo-600/25 active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <IconLoader2 className="w-4 h-4 animate-spin" />
                      <span>Registering Tenant...</span>
                    </>
                  ) : (
                    <>
                      <IconCreditCard className="w-4 h-4" />
                      <span>Create Company &amp; Send Payment Link</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};

export default AddCompanyPage;