import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../api/client';
import {
  IconBuildingSkyscraper,
  IconArrowLeft,
  IconCrown,
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
  IconSparkles,
  IconBuilding,
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

  // Package options
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

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdResult, setCreatedResult] = useState<{
    company: any;
    paymentLinkUrl?: string;
    adminEmail: string;
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    const fetchPackages = async () => {
      try {
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

  // Selected package details
  const selectedPackage = packages.find((p) => String(p.id) === String(form.packageId));

  // Compute price based on Plan Type (Monthly, Quarterly, Yearly)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.subdomain.trim()) {
      setError('Please provide company name and subdomain.');
      return;
    }
    if (!form.adminEmail.trim()) {
      setError('Please provide the Company Admin email to receive the payment link and proposal.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

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
      setCreatedResult({
        company: res.data?.company,
        paymentLinkUrl: res.data?.paymentLinkUrl || res.data?.company?.paymentLinkUrl,
        adminEmail: form.adminEmail.trim(),
      });
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Failed to create company. Please check your inputs.'
      );
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

  return (
    <div className="max-w-6xl mx-auto space-y-5 pb-16">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <IconBuildingSkyscraper className="w-5 h-5 text-indigo-600 shrink-0" />
            <span>Add Company</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Create tenant, select package &amp; billing cycle, and dispatch Razorpay payment link.
          </p>
        </div>

        <Link
          to="/super-admin/companies"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors self-start sm:self-center"
        >
          <IconArrowLeft className="w-4 h-4 text-slate-500" />
          Back to Tenants &amp; Companies
        </Link>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5 shadow-2xs animate-in fade-in">
          <IconAlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Success Modal / Banner upon Creation */}
      {createdResult && (
        <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 shadow-md space-y-4 animate-in fade-in zoom-in-95">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md">
                <IconCheck className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-emerald-950">
                  Company Created &amp; Payment Link Sent!
                </h3>
                <p className="text-xs text-emerald-800 mt-0.5">
                  An official plan proposal and secure Razorpay payment link has been emailed to{' '}
                  <strong className="underline">{createdResult.adminEmail}</strong>.
                </p>
              </div>
            </div>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold border border-amber-200">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              STATUS: In Process
            </span>
          </div>

          <div className="p-4 rounded-xl bg-white border border-emerald-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="truncate max-w-full">
              <span className="text-slate-400 font-semibold block text-[10px] uppercase">
                Payment Link:
              </span>
              <span className="font-mono text-slate-800 truncate block">
                {createdResult.paymentLinkUrl || 'Direct payment link generated'}
              </span>
            </div>

            {createdResult.paymentLinkUrl && (
              <button
                type="button"
                onClick={handleCopyPaymentLink}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shrink-0 shadow-xs cursor-pointer"
              >
                {copiedLink ? <IconCheck className="w-4 h-4" /> : <IconCopy className="w-4 h-4" />}
                <span>{copiedLink ? 'Copied!' : 'Copy Payment Link'}</span>
              </button>
            )}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-emerald-200/60">
            <p className="text-[11px] text-emerald-800">
              Once payment is done, you can create the Company Administrator on the Tenants &amp; Companies page.
            </p>
            <button
              onClick={() => navigate('/super-admin/companies')}
              className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs"
            >
              Go to Tenants &amp; Companies &rarr;
            </button>
          </div>
        </div>
      )}

      {/* Main Unified Form Container */}
      {!createdResult && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Card 1: Company Profile Information */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/60 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Company Information</h2>
                <p className="text-[11px] text-slate-500">Workspace identity and tenant details</p>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* Row 1: Company Name & Subdomain */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Company Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={handleNameChange}
                    placeholder="e.g. Acme Corporation"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-blue-600 transition-colors shadow-2xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Subdomain <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      required
                      value={form.subdomain}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                        })
                      }
                      placeholder="acme"
                      className="w-full pl-3.5 pr-24 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-blue-600 transition-colors shadow-2xs font-mono font-medium"
                    />
                    <span className="absolute right-3 text-xs font-mono text-slate-400 select-none">
                      .uptrix.io
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Tenant unique URL.</p>
                </div>
              </div>

              {/* Row 2: Company Code & Website */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Company Code</label>
                  <input
                    type="text"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. ACME"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-blue-600 font-mono shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Website</label>
                  <input
                    type="url"
                    value={form.website}
                    onChange={(e) => setForm({ ...form, website: e.target.value })}
                    placeholder="https://acme.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-blue-600 shadow-2xs"
                  />
                </div>
              </div>

              {/* Logo Upload */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Company Logo</label>
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-medium transition-colors shadow-2xs">
                    <IconUpload className="w-3.5 h-3.5 text-slate-500" />
                    <span>Choose File</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoSelect}
                      className="hidden"
                    />
                  </label>
                  <span className="text-xs text-slate-500 truncate max-w-[200px]">
                    {selectedFile ? selectedFile.name : 'No file chosen'}
                  </span>
                  {logoPreview && (
                    <div className="flex items-center gap-1.5 ml-auto">
                      <img
                        src={logoPreview}
                        alt="Logo preview"
                        className="w-8 h-8 rounded-lg object-contain border border-slate-200 bg-white p-0.5"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                        title="Remove logo"
                      >
                        <IconX className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Company Admin / Billing Recipient Contact */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  2
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Company Admin Contact &amp; Payment Recipient
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    The payment link and plan proposal will be dispatched to this email
                  </p>
                </div>
              </div>

              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
                <IconMail className="w-3.5 h-3.5" />
                Receives Payment Link
              </span>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Admin Contact Name
                  </label>
                  <div className="relative">
                    <IconUser className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={form.adminName}
                      onChange={(e) => setForm({ ...form, adminName: e.target.value })}
                      placeholder="e.g. John Doe"
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-blue-600 shadow-2xs font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Admin Work Email <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <IconMail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="email"
                      required
                      value={form.adminEmail}
                      onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
                      placeholder="admin@acme.com"
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-blue-300 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-blue-600 shadow-2xs font-semibold"
                    />
                  </div>
                  <p className="text-[11px] text-blue-600 mt-1 font-medium">
                    Payment link &amp; proposal email will be sent here immediately.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Phone Number</label>
                  <div className="relative">
                    <IconPhone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="tel"
                      value={form.adminPhone}
                      onChange={(e) => setForm({ ...form, adminPhone: e.target.value })}
                      placeholder="+91 98765 43210"
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-blue-600 shadow-2xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Subscription Plan & Billing (Plan Name, Plan Type) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  3
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Subscription &amp; Pricing Selection</h2>
                  <p className="text-[11px] text-slate-500">
                    Select Plan Name and Plan Type (Monthly, Quarterly, Yearly)
                  </p>
                </div>
              </div>

              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                <IconCreditCard className="w-4 h-4" />
                Auto Razorpay Link
              </span>
            </div>

            <div className="p-6 space-y-6">
              {/* Row: Plan Name & Plan Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                {/* Plan Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Plan Name <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={form.packageId}
                    onChange={(e) => setForm({ ...form, packageId: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-900 focus:outline-blue-600 shadow-2xs cursor-pointer"
                  >
                    <option value="">Select Plan</option>
                    {packages.map((pkg) => {
                      const isCustom =
                        pkg.tier === 'CUSTOM' ||
                        pkg.name.toLowerCase().includes('custom') ||
                        pkg.name.toLowerCase().includes('enterprise');
                      const tag = isCustom ? ' [🏢 Custom Plan]' : ` [${pkg.tier || 'Standard'}]`;

                      return (
                        <option key={pkg.id} value={pkg.id}>
                          {pkg.name} {tag} • ({pkg.employeeLimit} seats)
                        </option>
                      );
                    })}
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Includes Basic, Medium, and custom company plans created in Packages &amp; Pricing.
                  </p>
                </div>

                {/* Plan Type Selector (Monthly, Quarterly, Yearly) */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Plan Type (Billing Cycle) <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, planType: 'MONTHLY' })}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        form.planType === 'MONTHLY'
                          ? 'border-blue-600 bg-blue-50/80 text-blue-950 font-bold ring-2 ring-blue-500/20'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700 font-medium'
                      }`}
                    >
                      <div className="text-xs">Monthly</div>
                      {selectedPackage && (
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          ₹{Number(selectedPackage.priceMonthly || 0).toLocaleString()}
                        </div>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setForm({ ...form, planType: 'QUARTERLY' })}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        form.planType === 'QUARTERLY'
                          ? 'border-blue-600 bg-blue-50/80 text-blue-950 font-bold ring-2 ring-blue-500/20'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700 font-medium'
                      }`}
                    >
                      <div className="text-xs">Quarterly</div>
                      {selectedPackage && (
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          ₹{Number(selectedPackage.priceQuarterly || 0).toLocaleString()}
                        </div>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setForm({ ...form, planType: 'YEARLY' })}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        form.planType === 'YEARLY'
                          ? 'border-emerald-600 bg-emerald-50/80 text-emerald-950 font-bold ring-2 ring-emerald-500/20'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700 font-medium'
                      }`}
                    >
                      <div className="text-xs">Yearly</div>
                      {selectedPackage && (
                        <div className="text-[11px] text-emerald-600 mt-0.5 font-bold">
                          ₹{Number(selectedPackage.priceYearly || 0).toLocaleString()}
                        </div>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Dynamic Price Breakdown Box */}
              {selectedPackage && (
                <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-50 via-blue-50/30 to-indigo-50/40 border border-blue-100 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200/80 gap-2">
                    <div>
                      <span className="font-bold text-slate-900 text-sm flex items-center gap-2">
                        {selectedPackage.name}
                        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
                          {form.planType}
                        </span>
                      </span>
                      <span className="text-[11px] text-slate-500 block mt-0.5">
                        Capacity: Up to {selectedPackage.employeeLimit} employee accounts
                      </span>
                    </div>

                    <div className="text-right">
                      <div className="text-xs text-slate-400">Total Billed in Payment Link:</div>
                      <div className="text-xl font-extrabold text-blue-700">
                        ₹{totalPrice.toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600 pt-1">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                        Plan Base Amount
                      </span>
                      <span className="font-bold text-slate-800">
                        ₹{basePrice.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                        GST (18%)
                      </span>
                      <span className="font-bold text-slate-800">
                        ₹{gst.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">
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
          </div>

          {/* Form Actions Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <p className="text-xs text-slate-500">
              Submitting registers the company, issues the payment link, and notifies the company admin.
            </p>

            <div className="flex items-center gap-3 self-end sm:self-center">
              <button
                type="button"
                onClick={() => navigate('/super-admin/companies')}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 disabled:opacity-50 transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Creating &amp; Sending Payment Link...</span>
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
        </form>
      )}
    </div>
  );
};

export default AddCompanyPage;
