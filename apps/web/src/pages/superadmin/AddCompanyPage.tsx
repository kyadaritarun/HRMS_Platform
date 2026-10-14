import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../api/client';
import {
  IconBuildingSkyscraper,
  IconArrowLeft,
  IconCrown,
  IconWorld,
  IconMail,
  IconMapPin,
  IconUpload,
  IconCheck,
  IconAlertCircle,
  IconInfoCircle,
  IconPackage,
  IconHome,
  IconX,
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
    planType: 'DEFAULT', // DEFAULT | MONTHLY | QUARTERLY | YEARLY
    allowedEmailDomains: '',
    street: '',
    addressLine2: '',
    city: '',
    state: '',
    pinCode: '',
    country: 'India',
    status: 'ACTIVE', // ACTIVE | INACTIVE | SUSPENDED
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
      // Auto-suggest if user hasn't explicitly customized
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

    // Upload immediately or on submit
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
      console.warn('Logo upload endpoint preview only:', err);
      // Fallback: keep local object URL or store base64 if needed
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
  const selectedPackage = packages.find((p) => p.id === Number(form.packageId));

  // Determine computed plan type & price
  const effectivePlanType =
    form.planType === 'DEFAULT'
      ? selectedPackage?.billingDefault || 'MONTHLY'
      : form.planType;

  let computedPrice = 0;
  if (selectedPackage) {
    if (effectivePlanType === 'YEARLY') {
      computedPrice = Number(selectedPackage.priceYearly) || Number(selectedPackage.priceMonthly) * 10;
    } else if (effectivePlanType === 'QUARTERLY') {
      computedPrice = Number(selectedPackage.priceQuarterly) || Number(selectedPackage.priceMonthly) * 3;
    } else {
      computedPrice = Number(selectedPackage.priceMonthly) || 0;
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.subdomain.trim()) {
      setError('Please provide company name and subdomain.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        name: form.name.trim(),
        subdomain: form.subdomain.trim().toLowerCase(),
        code: form.code.trim().toUpperCase() || form.name.replace(/[^a-zA-Z]/g, '').slice(0, 5).toUpperCase() || 'CMP',
        logo: form.logoUrl || null,
        website: form.website.trim() || null,
        packageId: form.packageId ? Number(form.packageId) : null,
        planType: effectivePlanType,
        subAmount: computedPrice,
        allowedEmailDomains: form.allowedEmailDomains.trim(),
        address: {
          street: form.street.trim(),
          addressLine2: form.addressLine2.trim(),
          city: form.city.trim(),
          state: form.state.trim(),
          pinCode: form.pinCode.trim(),
          country: form.country.trim(),
        },
        isActive: form.status === 'ACTIVE',
      };

      await api.post('/superadmin/companies', payload);
      setSuccess('Company created successfully!');
      setTimeout(() => {
        navigate('/super-admin/companies');
      }, 1000);
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

  return (
    <div className="max-w-10xl mx-auto space-y-5 pb-16">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <IconBuildingSkyscraper className="w-7 h-7 text-blue-600" />
            Add Company
          </h1>
        </div>

        <Link
          to="/super-admin/companies"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors self-start sm:self-center"
        >
          <IconArrowLeft className="w-4 h-4 text-slate-500" />
          Back to Companies
        </Link>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5 shadow-2xs animate-in fade-in">
          <IconAlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5 shadow-2xs animate-in fade-in">
          <IconCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Main Unified Form Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Section Header */}
        <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-blue-50/70 via-indigo-50/30 to-slate-50/50">
          <h2 className="text-base font-bold text-slate-900">Company Details</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Add company information and choose a plan.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
          {/* Row 1: Company Name & Subdomain */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Company name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={handleNameChange}
                placeholder="e.g. Uptrix"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-brand-600 focus:border-brand-600 transition-colors shadow-2xs"
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
                    setForm({ ...form, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })
                  }
                  placeholder="your-company"
                  className="w-full pl-3.5 pr-24 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-brand-600 focus:border-brand-600 transition-colors shadow-2xs font-mono"
                />
                <span className="absolute right-3 text-xs font-mono text-slate-400 select-none">
                  .uptrix.io
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Enter only the subdomain.</p>
            </div>
          </div>

          {/* Row 2: Logo Upload & Plan Name */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Logo
              </label>
              <div className="flex items-center gap-3">
                <label className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-medium transition-colors shadow-2xs">
                  <IconUpload className="w-3.5 h-3.5 text-slate-500" />
                  <span>Choose File</span>
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/webp, image/svg+xml"
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
                      className="text-slate-400 hover:text-rose-600 p-1"
                      title="Remove logo"
                    >
                      <IconX className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Upload a square image (PNG, JPG) for best results.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Plan Name <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={form.packageId}
                onChange={(e) => setForm({ ...form, packageId: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-brand-600 focus:border-brand-600 transition-colors shadow-2xs"
              >
                <option value="">Select</option>
                {packages.map((pkg) => (
                  <option key={pkg.id} value={pkg.id}>
                    {pkg.name} ({pkg.employeeLimit} seats) - ₹{Number(pkg.priceMonthly).toLocaleString()}/mo
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 3: Plan Type Dropdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Plan Type
              </label>
              <select
                value={form.planType}
                onChange={(e) => setForm({ ...form, planType: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-brand-600 focus:border-brand-600 transition-colors shadow-2xs"
              >
                <option value="DEFAULT">Default (use package billing)</option>
                <option value="MONTHLY">Monthly</option>
                <option value="QUARTERLY">Quarterly</option>
                <option value="YEARLY">Yearly</option>
              </select>
              <p className="text-[11px] text-slate-400 mt-1">
                Defaults to the package billing frequency.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Company Code
              </label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="e.g. UPTRX"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-brand-600 font-mono shadow-2xs"
              />
              <p className="text-[11px] text-slate-400 mt-1">Short uppercase identifier.</p>
            </div>
          </div>

          {/* Plan Price Banner (Dynamic) */}
          <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-100 flex items-start gap-3.5 text-blue-900 shadow-2xs">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <IconPackage className="w-4 h-4" />
            </div>
            <div className="space-y-0.5 text-xs">
              {selectedPackage ? (
                <>
                  <div className="font-bold text-blue-950 flex items-center gap-2">
                    <span>{selectedPackage.name}</span>
                    <span className="px-2 py-0.5 rounded-full bg-blue-200/60 text-blue-800 text-[10px] font-semibold">
                      {effectivePlanType}
                    </span>
                  </div>
                  <p className="text-blue-800 font-normal">
                    Amount: <strong className="font-bold">₹{computedPrice.toLocaleString()}</strong> ({effectivePlanType.toLowerCase()}) • Up to {selectedPackage.employeeLimit} employees included.
                  </p>
                </>
              ) : (
                <>
                  <div className="font-bold text-blue-950">Select a package to see the price.</div>
                  <p className="text-blue-700 font-normal">
                    We&apos;ll auto-fill the billing cycle and amount from the package.
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Row 4: Website & Allowed Email Domains */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Website
              </label>
              <input
                type="url"
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                placeholder="https://company.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-brand-600 shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Allowed Email Domains
              </label>
              <input
                type="text"
                value={form.allowedEmailDomains}
                onChange={(e) => setForm({ ...form, allowedEmailDomains: e.target.value })}
                placeholder="example.com, another.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-brand-600 shadow-2xs"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Comma or newline separated; admin and employee emails must use one of these domains.
              </p>
            </div>
          </div>

          {/* Row 5: Street Address */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Street address
            </label>
            <input
              type="text"
              value={form.street}
              onChange={(e) => setForm({ ...form, street: e.target.value })}
              placeholder="Street, building, area"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-brand-600 shadow-2xs"
            />
          </div>

          {/* Row 6: Address line 2 & City */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Address line 2 <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={form.addressLine2}
                onChange={(e) => setForm({ ...form, addressLine2: e.target.value })}
                placeholder="Apartment, suite, landmark"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-brand-600 shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                City / Locality
              </label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="City or town"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-brand-600 shadow-2xs"
              />
            </div>
          </div>

          {/* Row 7: State & Pin Code */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                State / Region
              </label>
              <input
                type="text"
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                placeholder="State or province"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-brand-600 shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Pin / Postal Code
              </label>
              <input
                type="text"
                value={form.pinCode}
                onChange={(e) => setForm({ ...form, pinCode: e.target.value })}
                placeholder="ZIP or PIN code"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-brand-600 shadow-2xs"
              />
            </div>
          </div>

          {/* Row 8: Country & Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Country
              </label>
              <input
                type="text"
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                placeholder="Country"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-brand-600 shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Status <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-brand-600 shadow-2xs"
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
            </div>
          </div>

          {/* Callout Notice at Bottom */}
          <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-100/90 text-blue-900 text-xs flex items-center gap-2.5">
            <IconInfoCircle className="w-4 h-4 text-blue-600 shrink-0" />
            <span>You can assign company admins after creating the company.</span>
          </div>

          {/* Form Actions Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => navigate('/super-admin/companies')}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold shadow-xs disabled:opacity-50 transition-all active:scale-95 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Creating Company...</span>
                </>
              ) : (
                'Create Company'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddCompanyPage;
