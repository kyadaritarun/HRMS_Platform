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
  IconLoader2,
  IconSparkles,
  IconReceiptTax,
  IconShieldCheck,
  IconBuildingBank,
  IconFileCertificate,
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
    // Statutory, Tax & Compliance Registrations
    pan: '',
    tan: '',
    gstin: '',
    cin: '',
    pfEstablishmentCode: '',
    esicRegistrationNumber: '',
    ptrcNumber: '',
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

  // Smooth scroll to section
  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

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
        if (!value?.trim()) return 'Phone number is required.';
        if (!/^\d{10}$/.test(value.trim().replace(/[\s-]/g, ''))) return 'Phone number must be exactly 10 digits.';
        return '';
      case 'street':
        if (!value?.trim()) return 'Street address is required.';
        if (value.trim().length < 3) return 'Street address must be at least 3 characters.';
        return '';
      case 'city':
        if (!value?.trim()) return 'City is required.';
        return '';
      case 'state':
        if (!value?.trim()) return 'State is required.';
        return '';
      case 'pinCode':
        if (!value?.trim()) return 'PIN code is required.';
        if (!/^\d{6}$/.test(value.trim())) return 'PIN code must be a 6-digit number.';
        return '';
      case 'packageId':
        if (!value) return 'Please select a subscription package plan.';
        return '';
      case 'pan':
        if (!value?.trim()) return 'Company PAN is required.';
        {
          const cleanPan = value.trim().toUpperCase();
          if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(cleanPan)) {
            return 'PAN must follow standard 10-char format (e.g. AABCK1234D).';
          }
        }
        return '';
      case 'tan':
        if (!value?.trim()) return 'Company TAN is required.';
        {
          const cleanTan = value.trim().toUpperCase();
          if (!/^[A-Z]{4}[0-9]{5}[A-Z]{1}$/.test(cleanTan)) {
            return 'TAN must follow standard 10-char format (e.g. HYDK12891A).';
          }
        }
        return '';
      case 'gstin':
        if (!value?.trim()) return 'Company GSTIN is required.';
        {
          const cleanGst = value.trim().toUpperCase();
          if (cleanGst.length !== 15) {
            return 'GSTIN must be exactly 15 characters (e.g. 36AABCK1234D1Z5).';
          }
        }
        return '';
      case 'cin':
        if (!value?.trim()) return 'CIN is required.';
        {
          const cleanCin = value.trim().toUpperCase();
          if (cleanCin.length !== 21) {
            return 'CIN must be exactly 21 characters (e.g. U72200TG2026PTC123456).';
          }
        }
        return '';
      case 'pfEstablishmentCode':
        if (!value?.trim()) return 'PF establishment code is required.';
        return '';
      case 'esicRegistrationNumber':
        if (!value?.trim()) return 'ESIC registration number is required.';
        {
          const cleanEsic = value.trim();
          if (!/^\d{17}$/.test(cleanEsic)) {
            return 'ESIC registration number must be exactly 17 digits.';
          }
        }
        return '';
      case 'ptrcNumber':
        if (!value?.trim()) return 'PTRC number is required.';
        return '';
      default:
        return '';
    }
  };

  const validateAll = () => {
    const newErrors: Record<string, string> = {};
    const fieldsToValidate = [
      'name',
      'adminName',
      'adminEmail',
      'adminPhone',
      'street',
      'city',
      'state',
      'pinCode',
      'packageId',
      'pan',
      'tan',
      'gstin',
      'cin',
      'pfEstablishmentCode',
      'esicRegistrationNumber',
      'ptrcNumber',
    ];
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
    setForm((prev) => ({ ...prev, [name]: value }));

    if (touched[name]) {
      setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
    }
  };

  // Logo file upload handler
  const handleLogoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setToast({
        title: 'Invalid File Type',
        message: 'Please upload an image file (PNG, JPG, or SVG).',
        type: 'error',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setToast({
        title: 'File Too Large',
        message: 'Logo file size must be less than 5MB.',
        type: 'error',
      });
      return;
    }

    setSelectedFile(file);
    const localPreview = URL.createObjectURL(file);
    setLogoPreview(localPreview);

    try {
      setIsUploadingLogo(true);
      const formData = new FormData();
      formData.append('file', file);

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

    setTouched({
      name: true,
      subdomain: true,
      adminName: true,
      adminEmail: true,
      adminPhone: true,
      street: true,
      city: true,
      state: true,
      pinCode: true,
      packageId: true,
      pan: true,
      tan: true,
      gstin: true,
      cin: true,
      pfEstablishmentCode: true,
      esicRegistrationNumber: true,
      ptrcNumber: true,
    });

    if (!validateAll()) {
      // Find first error and scroll to that section
      if (validateField('name', form.name)) {
        scrollToSection('section-profile');
      } else if (
        validateField('adminName', form.adminName) ||
        validateField('adminEmail', form.adminEmail) ||
        validateField('adminPhone', form.adminPhone)
      ) {
        scrollToSection('section-admin');
      } else if (
        validateField('street', form.street) ||
        validateField('city', form.city) ||
        validateField('state', form.state) ||
        validateField('pinCode', form.pinCode)
      ) {
        scrollToSection('section-address');
      } else if (
        validateField('pan', form.pan) ||
        validateField('tan', form.tan) ||
        validateField('gstin', form.gstin) ||
        validateField('cin', form.cin) ||
        validateField('pfEstablishmentCode', form.pfEstablishmentCode) ||
        validateField('esicRegistrationNumber', form.esicRegistrationNumber) ||
        validateField('ptrcNumber', form.ptrcNumber)
      ) {
        scrollToSection('section-statutory');
      } else if (validateField('packageId', form.packageId)) {
        scrollToSection('section-billing');
      }

      setToast({
        title: 'Validation Error',
        message: 'Please resolve the highlighted errors in the form before submitting.',
        type: 'error',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const autoSub = form.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const generatedSubdomain = form.subdomain?.trim().toLowerCase() || autoSub || `cmp${Date.now()}`;
      const payload = {
        name: form.name.trim(),
        subdomain: generatedSubdomain,
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
        pan: form.pan.trim().toUpperCase() || undefined,
        tan: form.tan.trim().toUpperCase() || undefined,
        gstin: form.gstin.trim().toUpperCase() || undefined,
        cin: form.cin.trim().toUpperCase() || undefined,
        pfEstablishmentCode: form.pfEstablishmentCode.trim().toUpperCase() || undefined,
        esicRegistrationNumber: form.esicRegistrationNumber.trim() || undefined,
        ptrcNumber: form.ptrcNumber.trim().toUpperCase() || undefined,
      };

      const res = await api.post('/superadmin/companies', payload);
      const paymentLinkUrl = res.data?.paymentLinkUrl || res.data?.company?.paymentLinkUrl;

      setCreatedResult({
        company: res.data?.company,
        paymentLinkUrl,
        adminEmail: form.adminEmail.trim(),
      });

      setToast({
        title: 'Company Workspace Created!',
        message: `Registered ${form.name}. Payment proposal dispatched to ${form.adminEmail}.`,
        type: 'success',
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error('Failed to create company:', err);
      const msg = err.response?.data?.error || err.response?.data?.message || 'Failed to create company workspace. Please try again.';
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
      pan: '',
      tan: '',
      gstin: '',
      cin: '',
      pfEstablishmentCode: '',
      esicRegistrationNumber: '',
      ptrcNumber: '',
    });
    setSelectedFile(null);
    setLogoPreview(null);
    setCreatedResult(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getInputClass = (fieldName: string, basePadding = 'pl-10 pr-3.5') => {
    const hasError = touched[fieldName] && errors[fieldName];
    return `w-full ${basePadding} py-2.5 text-xs font-semibold text-slate-900 rounded-xl transition-all shadow-2xs ${
      hasError
        ? 'bg-rose-50/40 border border-rose-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-rose-500/15 focus:border-rose-500'
        : 'bg-slate-50/80 border border-slate-200 hover:border-slate-300 focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#5E4BE2]/15 focus:border-[#5E4BE2]'
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
    <div className="space-y-6 relative max-w-5xl mx-auto pb-24">
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
        /* ===================== ALL 5 SECTIONS ON ONE SINGLE PAGE ===================== */
        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          {/* ===================== SECTION 1: COMPANY PROFILE ===================== */}
          <div
            id="section-profile"
            className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 sm:p-7 space-y-6 scroll-mt-24 transition-all"
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100/70 text-[#5E4BE2] flex items-center justify-center shrink-0">
                  <IconBuilding className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    1. Company Profile &amp; Workspace Identity
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Workspace branding, unique tenant subdomain, and corporate employee email rules
                  </p>
                </div>
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
                <span className="text-[10px] text-slate-400 mt-1 block">Used as prefix for employee IDs and system numbers.</span>
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
                    placeholder="e.g. acme.com, acmeglobal.com (comma-separated)"
                    className={getInputClass('allowedEmailDomains')}
                  />
                </div>
                <p className="text-[11px] text-slate-500 font-medium mt-1">
                  Restricts employee onboarding so users can only be invited or created using these corporate email domain(s).
                </p>
              </div>

              {/* Modern Logo Dropzone / Upload Box */}
              <div className="sm:col-span-2 pt-1">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Company Logo</label>
                <div className="p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/50 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    {logoPreview ? (
                      <div className="relative shrink-0">
                        <img
                          src={logoPreview}
                          alt="Logo preview"
                          className="w-14 h-14 rounded-xl object-contain border border-slate-200 bg-white p-1.5 shadow-2xs"
                        />
                        <button
                          type="button"
                          onClick={handleRemoveLogo}
                          className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full bg-rose-500 text-white hover:bg-rose-600 shadow-2xs transition-colors cursor-pointer"
                          title="Remove logo"
                        >
                          <IconX className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5E4BE2] shrink-0">
                        <IconUpload className="w-6 h-6" />
                      </div>
                    )}

                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        {selectedFile ? selectedFile.name : 'Upload Workspace Brand Logo'}
                      </p>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                        PNG, JPG, or SVG up to 5MB. Recommended square 256x256.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
                    <label className="cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold transition-all shadow-2xs">
                      <IconUpload className="w-4 h-4 text-[#5E4BE2]" />
                      <span>{isUploadingLogo ? 'Uploading...' : logoPreview ? 'Change Logo' : 'Browse File'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoSelect}
                        disabled={isUploadingLogo}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ===================== SECTION 2: PRIMARY ADMIN ===================== */}
          <div
            id="section-admin"
            className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 sm:p-7 space-y-6 scroll-mt-24 transition-all"
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-100/70 text-[#5E4BE2] flex items-center justify-center shrink-0">
                  <IconUser className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    2. Primary Administrator &amp; Billing Contact
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    The subscription proposal, admin credentials, and secure Razorpay payment link will be dispatched to this contact
                  </p>
                </div>
              </div>
            </div>

            {/* Admin Privileges Info Banner */}
            <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-100 flex items-start gap-2.5 text-indigo-900">
              <IconShieldCheck className="w-4 h-4 text-[#5E4BE2] shrink-0 mt-0.5" />
              <p className="text-xs leading-relaxed">
                Upon payment settlement, this admin contact will receive root <strong>COMPANY_ADMIN</strong> credentials to configure departments, shifts, employee records, and payroll for this tenant workspace.
              </p>
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
                    Payment link &amp; invite dispatched here immediately.
                  </p>
                )}
              </div>

              {/* Admin Phone */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Phone Number <span className="text-rose-500">*</span>
                  </label>
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
                    required
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

          {/* ===================== SECTION 3: ADDRESS ===================== */}
          <div
            id="section-address"
            className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 sm:p-7 space-y-6 scroll-mt-24 transition-all"
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-100/70 text-rose-600 flex items-center justify-center shrink-0">
                  <IconMapPin className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    3. Registered Headquarters Address <span className="text-rose-500">*</span>
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Corporate headquarters and billing location printed on invoices and payslips
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Street Address */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Street Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <IconMapPin className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    name="street"
                    required
                    value={form.street}
                    onChange={handleChange}
                    onBlur={() => handleBlur('street')}
                    placeholder="123 Tech Park, 4th Floor"
                    className={getInputClass('street')}
                  />
                </div>
                {renderFieldError('street')}
              </div>

              {/* Address Line 2 */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Suite / Landmark <span className="text-slate-400 font-normal">(Optional)</span>
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
                    onBlur={() => handleBlur('addressLine2')}
                    placeholder="Opposite Metro Station"
                    className={getInputClass('addressLine2')}
                  />
                </div>
              </div>

              {/* City & State & PIN */}
              <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    City <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="city"
                    required
                    value={form.city}
                    onChange={handleChange}
                    onBlur={() => handleBlur('city')}
                    placeholder="Bengaluru"
                    className={getInputClass('city', 'px-3.5')}
                  />
                  {renderFieldError('city')}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    State <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="state"
                    required
                    value={form.state}
                    onChange={handleChange}
                    onBlur={() => handleBlur('state')}
                    placeholder="Karnataka"
                    className={getInputClass('state', 'px-3.5')}
                  />
                  {renderFieldError('state')}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      PIN / Postal Code <span className="text-rose-500">*</span>
                    </label>
                    <span className={`text-[10px] font-mono font-bold ${form.pinCode.length === 6 ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {form.pinCode.length}/6 digits
                    </span>
                  </div>
                  <input
                    type="text"
                    name="pinCode"
                    maxLength={6}
                    required
                    value={form.pinCode}
                    onChange={handleChange}
                    onBlur={() => handleBlur('pinCode')}
                    placeholder="560100"
                    className={getInputClass('pinCode', 'px-3.5')}
                  />
                  {renderFieldError('pinCode')}
                </div>
              </div>
            </div>
          </div>

          {/* ===================== SECTION 4: STATUTORY & TAX ===================== */}
          <div
            id="section-statutory"
            className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 sm:p-7 space-y-6 scroll-mt-24 transition-all"
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100/70 text-emerald-600 flex items-center justify-center shrink-0">
                  <IconFileCertificate className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    4. Statutory, Tax &amp; Compliance Registrations <span className="text-rose-500">*</span>
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Official government tax registrations and statutory codes printed on Form 16, EPFO ECR, ESIC returns &amp; Payslips
                  </p>
                </div>
              </div>
            </div>

            {/* Statutory Authenticity Note */}
            <div className="p-3.5 rounded-xl bg-amber-50/90 border border-amber-200/90 flex items-start gap-2.5 text-xs text-amber-950">
              <IconAlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                <strong>Mandatory Real Information:</strong> Please enter authentic, government-registered details. This data is used directly on official employee payslips, Form 16, EPFO ECR, and tax filings—do not submit fake or placeholder codes.
              </p>
            </div>

            {/* Group A: Tax & Corporate Registrations */}
            <div className="p-4 sm:p-5 rounded-2xl border border-slate-200/80 bg-slate-50/40 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#5E4BE2]/10 text-[#5E4BE2] flex items-center justify-center shrink-0">
                    <IconReceiptTax className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">
                      A. Tax &amp; Corporate Registrations
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Used for Form 16 certificate generator, TDS returns, and GST invoicing
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Company PAN */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Company PAN <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] font-mono text-slate-400">10 chars</span>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <IconId className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      name="pan"
                      required
                      maxLength={10}
                      value={form.pan}
                      onChange={handleChange}
                      onBlur={() => handleBlur('pan')}
                      placeholder="AABCK1234D"
                      className={getInputClass('pan')}
                    />
                  </div>
                  {renderFieldError('pan')}
                </div>

                {/* Company TAN */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Company TAN <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] font-mono text-slate-400">Form 16 &amp; TDS</span>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <IconReceiptTax className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      name="tan"
                      required
                      maxLength={10}
                      value={form.tan}
                      onChange={handleChange}
                      onBlur={() => handleBlur('tan')}
                      placeholder="HYDK12891A"
                      className={getInputClass('tan')}
                    />
                  </div>
                  {renderFieldError('tan')}
                </div>

                {/* Company GSTIN */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Company GSTIN <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] font-mono text-slate-400">15 chars</span>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <IconBuildingBank className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      name="gstin"
                      required
                      maxLength={15}
                      value={form.gstin}
                      onChange={handleChange}
                      onBlur={() => handleBlur('gstin')}
                      placeholder="36AABCK1234D1Z5"
                      className={getInputClass('gstin')}
                    />
                  </div>
                  {renderFieldError('gstin')}
                </div>

                {/* CIN */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      CIN (Corp ID) <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] font-mono text-slate-400">21 chars</span>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <IconShieldCheck className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      name="cin"
                      required
                      maxLength={21}
                      value={form.cin}
                      onChange={handleChange}
                      onBlur={() => handleBlur('cin')}
                      placeholder="U72200TG2026PTC123456"
                      className={getInputClass('cin')}
                    />
                  </div>
                  {renderFieldError('cin')}
                </div>
              </div>
            </div>

            {/* Group B: PF & ESIC Statutory Codes */}
            <div className="p-4 sm:p-5 rounded-2xl border border-slate-200/80 bg-slate-50/40 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <IconShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">
                      B. PF &amp; ESIC Statutory Codes
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Used for automated EPFO ECR electronic filings, ESIC monthly returns &amp; Professional Tax certificates
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* PF Establishment Code */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      PF Establishment Code <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] font-mono text-slate-400">EPFO</span>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <IconBuilding className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      name="pfEstablishmentCode"
                      required
                      maxLength={22}
                      value={form.pfEstablishmentCode}
                      onChange={handleChange}
                      onBlur={() => handleBlur('pfEstablishmentCode')}
                      placeholder="APHYD0012345000"
                      className={getInputClass('pfEstablishmentCode')}
                    />
                  </div>
                  {renderFieldError('pfEstablishmentCode')}
                </div>

                {/* ESIC Registration Number */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      ESIC Registration Number <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] font-mono text-slate-400">17 digits</span>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <IconShieldCheck className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      name="esicRegistrationNumber"
                      required
                      maxLength={17}
                      value={form.esicRegistrationNumber}
                      onChange={handleChange}
                      onBlur={() => handleBlur('esicRegistrationNumber')}
                      placeholder="52000123450000001"
                      className={getInputClass('esicRegistrationNumber')}
                    />
                  </div>
                  {renderFieldError('esicRegistrationNumber')}
                </div>

                {/* PTRC Number */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      PTRC Number <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] font-mono text-slate-400">Prof. Tax</span>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <IconFileCertificate className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      name="ptrcNumber"
                      required
                      maxLength={25}
                      value={form.ptrcNumber}
                      onChange={handleChange}
                      onBlur={() => handleBlur('ptrcNumber')}
                      placeholder="PT-TG-1029384"
                      className={getInputClass('ptrcNumber')}
                    />
                  </div>
                  {renderFieldError('ptrcNumber')}
                </div>
              </div>
            </div>
          </div>

          {/* ===================== SECTION 5: PLAN & BILLING ===================== */}
          <div
            id="section-billing"
            className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 sm:p-7 space-y-6 scroll-mt-24 transition-all"
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100/70 text-amber-600 flex items-center justify-center shrink-0">
                  <IconCreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    5. Subscription Plan &amp; Billing Selection
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Select package tier, employee seat capacity, and billing interval
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Form Controls */}
              <div className="lg:col-span-7 space-y-5">
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
                      className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                        form.planType === 'MONTHLY'
                          ? 'border-[#5E4BE2] bg-indigo-50/80 text-indigo-950 font-bold ring-2 ring-indigo-500/20'
                          : 'border-slate-200 bg-slate-50/70 hover:bg-slate-100 text-slate-700 font-semibold'
                      }`}
                    >
                      <div className="text-xs">Monthly</div>
                      {selectedPackage && (
                        <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                          ₹{Number(selectedPackage.priceMonthly || 0).toLocaleString('en-IN')}
                        </div>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, planType: 'QUARTERLY' }))}
                      className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                        form.planType === 'QUARTERLY'
                          ? 'border-[#5E4BE2] bg-indigo-50/80 text-indigo-950 font-bold ring-2 ring-indigo-500/20'
                          : 'border-slate-200 bg-slate-50/70 hover:bg-slate-100 text-slate-700 font-semibold'
                      }`}
                    >
                      <div className="text-xs">Quarterly</div>
                      {selectedPackage && (
                        <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                          ₹{Number(selectedPackage.priceQuarterly || 0).toLocaleString('en-IN')}
                        </div>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, planType: 'YEARLY' }))}
                      className={`p-3 rounded-xl border text-center transition-all cursor-pointer relative ${
                        form.planType === 'YEARLY'
                          ? 'border-emerald-600 bg-emerald-50/80 text-emerald-950 font-bold ring-2 ring-emerald-500/20'
                          : 'border-slate-200 bg-slate-50/70 hover:bg-slate-100 text-slate-700 font-semibold'
                      }`}
                    >
                      <span className="absolute -top-2 right-2 px-1.5 py-0.2 rounded bg-emerald-600 text-white text-[9px] font-bold uppercase tracking-wider">
                        Save
                      </span>
                      <div className="text-xs">Yearly</div>
                      {selectedPackage && (
                        <div className="text-[11px] text-emerald-600 font-bold mt-0.5">
                          ₹{Number(selectedPackage.priceYearly || 0).toLocaleString('en-IN')}
                        </div>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Live Invoice Summary Card */}
              <div className="lg:col-span-5">
                {selectedPackage ? (
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/30 border border-indigo-100 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-indigo-100/80">
                      <div>
                        <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                          {selectedPackage.name}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
                          Capacity: Up to {selectedPackage.employeeLimit} seats
                        </span>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold">
                        {form.planType}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Plan Base Price</span>
                        <span className="font-semibold text-slate-800">₹{basePrice.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-600">
                        <span>GST (18%)</span>
                        <span className="font-semibold text-slate-800">₹{gst.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="pt-2 border-t border-indigo-100 flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-xs">Total Razorpay Invoice</span>
                        <span className="text-lg font-black text-[#5E4BE2]">
                          ₹{totalPrice.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-indigo-100/70">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 font-medium">Initial Status:</span>
                        <span className="inline-flex items-center gap-1.5 font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/70">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          In Process
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 text-center text-xs text-slate-500 font-medium">
                    Select a package plan from the dropdown to preview live billing calculation.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ===================== DATA ACCURACY & STATUTORY DISCLAIMER NOTE ===================== */}
          <div className="rounded-2xl border border-amber-200/90 bg-gradient-to-r from-amber-50/90 via-orange-50/60 to-amber-50/90 p-5 sm:p-6 shadow-xs space-y-3">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-800 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                <IconAlertCircle className="w-5 h-5 text-amber-700 stroke-[2.2]" />
              </div>
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-amber-200/80 text-amber-900 text-[10px] font-black uppercase tracking-wider">
                    Important Notice • Data Authenticity
                  </span>
                  <span className="text-[11px] text-amber-800 font-semibold">
                    Legal &amp; Statutory Compliance
                  </span>
                </div>
                <h4 className="text-xs sm:text-sm font-bold text-amber-950">
                  Please ensure all company &amp; statutory data entered is authentic and not fake
                </h4>
                <p className="text-xs text-amber-900/90 leading-relaxed font-medium">
                  You are manually providing all company, contact, address, and statutory registration details. <strong>Please make sure you do not enter fake or dummy data.</strong> This information is actively used across the system for generating <strong>official Employee Payslips</strong>, computing <strong>Tax Deductions, Form 16 &amp; TDS filings</strong>, executing <strong>EPFO ECR &amp; ESIC monthly compliance returns</strong>, and issuing <strong>GST Tax Invoices</strong>. Submitting inaccurate or fabricated data can compromise statutory validity and lead to regulatory discrepancies.
                </p>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 pt-1.5 text-[11px] font-bold text-amber-900">
                  <span className="inline-flex items-center gap-1.5">
                    <IconCheck className="w-3.5 h-3.5 text-amber-700 stroke-[2.5]" />
                    Directly embedded in Employee Payslips
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <IconCheck className="w-3.5 h-3.5 text-amber-700 stroke-[2.5]" />
                    Used for Form 16, TDS &amp; Tax filings
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <IconCheck className="w-3.5 h-3.5 text-amber-700 stroke-[2.5]" />
                    Printed on GST Billing Invoices &amp; Legal Records
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ===================== STICKY BOTTOM ACTION BAR ===================== */}
          <div className="sticky bottom-4 z-20 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-[#5E4BE2] flex items-center justify-center shrink-0">
                <IconSparkles className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">
                  Ready to onboard <span className="text-[#5E4BE2]">{form.name || 'new tenant'}</span>?
                </p>
                <p className="text-[11px] text-slate-500 font-medium">
                  {selectedPackage
                    ? `Total invoice: ₹${totalPrice.toLocaleString('en-IN')} (${form.planType.toLowerCase()}) • Payment link will be emailed`
                    : 'Select a package plan above to calculate billing'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={handleResetForm}
                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-600 transition-colors cursor-pointer"
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
                    <span>Send Payment Link</span>
                    {selectedPackage && (
                      <span className="px-2 py-0.5 rounded-md bg-white/20 text-white text-[11px] font-mono">
                        ₹{totalPrice.toLocaleString('en-IN')}
                      </span>
                    )}
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
