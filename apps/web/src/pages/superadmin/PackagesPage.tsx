import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import {
  IconPlus,
  IconX,
  IconAlertCircle,
  IconEdit,
  IconTrash,
  IconHome,
  IconPackage,
  IconCalendar,
  IconCalendarEvent,
  IconSearch,
  IconChevronLeft,
  IconChevronRight,
  IconBuilding,
  IconClock,
  IconUsers,
  IconFileText,
  IconShield,
  IconArrowUpRight,
} from '@tabler/icons-react';

interface PackageItem {
  id: number;
  name: string;
  description: string;
  currency: string;
  priceMonthly: number;
  priceQuarterly: number;
  priceYearly: number;
  employeeLimit: number;
  billingDefault: 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  enabledFeatures: string[];
  createdAt?: string;
}

export const AVAILABLE_FEATURES = [
  {
    key: 'time_attendance_management',
    name: 'Time and Attendance Management',
    description: 'Attendance, attendance reports, settings, and regularization workflows.',
  },
  {
    key: 'leave_management',
    name: 'Leave Management',
    description: 'Leave requests, leave approvals, leave types, and exports.',
  },
  {
    key: 'claims',
    name: 'Claim Process Management',
    description: 'Expense claims, claim approvals, and claim categories.',
  },
  {
    key: 'support_ticket_management',
    name: 'Support Ticket Management',
    description: 'Employee tickets, ticket assignments, and ticket management.',
  },
  {
    key: 'performance',
    name: 'Performance Management',
    description: 'Performance cycles, goals, and manager review flows.',
  },
  {
    key: 'policies',
    name: 'Policy Documents Management',
    description: 'Policy publishing, acknowledgements, and policy management.',
  },
  {
    key: 'documents',
    name: 'Employee Document Management',
    description: 'My documents, employee document records, and HR review.',
  },
  {
    key: 'appreciations',
    name: 'Employee Appreciation',
    description: 'Peer appreciation and recognition activity.',
  },
  {
    key: 'payroll',
    name: 'Payroll',
    description: 'Payroll processing and payslip generation.',
  },
  {
    key: 'compliance_management',
    name: 'Compliance Management',
    description: 'Statutory compliance and reporting.',
  },
  {
    key: 'reports_analytics',
    name: 'Reports & Analytics',
    description: 'Comprehensive organizational reporting.',
  },
  {
    key: 'ai_assistant',
    name: 'AI Assistance',
    description: 'Employee HR assistant for policies, leave, attendance, and holidays.',
  },
  {
    key: 'holiday_calendar',
    name: 'Holiday Calendar',
    description: 'Company holiday management and holiday calendar visibility.',
  },
  {
    key: 'employees_directory',
    name: 'Employees Directory',
    description: 'Organization structure and employee directory visibility.',
  },
  {
    key: 'comp_off',
    name: 'Compensation Off Management',
    description: 'Comp off requests and approval workflows.',
  },
];

const INITIAL_FORM = {
  id: undefined as number | undefined,
  name: '',
  currency: 'INR',
  priceMonthly: '0.00',
  priceQuarterly: '0.00',
  priceYearly: '0.00',
  employeeLimit: '10',
  billingDefault: 'MONTHLY' as 'MONTHLY' | 'QUARTERLY' | 'YEARLY',
  description: '',
  enabledFeatures: [] as string[],
};

export const PackagesPage: React.FC = () => {
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPackages = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/superadmin/packages');
      setPackages(res.data?.packages || []);
    } catch (err) {
      console.error('Failed to load packages:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  const handleOpenCreate = () => {
    setForm(INITIAL_FORM);
    setError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (pkg: PackageItem) => {
    setForm({
      id: pkg.id,
      name: pkg.name || '',
      currency: pkg.currency || 'INR',
      priceMonthly: String(pkg.priceMonthly ?? '0.00'),
      priceQuarterly: String(pkg.priceQuarterly ?? '0.00'),
      priceYearly: String(pkg.priceYearly ?? '0.00'),
      employeeLimit: String(pkg.employeeLimit ?? '10'),
      billingDefault: (pkg.billingDefault as any) || 'MONTHLY',
      description: pkg.description || '',
      enabledFeatures: Array.isArray(pkg.enabledFeatures) ? pkg.enabledFeatures : [],
    });
    setError(null);
    setIsModalOpen(true);
  };

  const toggleFeature = (key: string) => {
    setForm((prev) => ({
      ...prev,
      enabledFeatures: prev.enabledFeatures.includes(key)
        ? prev.enabledFeatures.filter((f) => f !== key)
        : [...prev.enabledFeatures, key],
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Package name is required.');
      return;
    }
    setError(null);
    setIsSubmitting(true);

    try {
      const payload = {
        name: form.name.trim(),
        currency: form.currency.trim() || 'INR',
        priceMonthly: parseFloat(form.priceMonthly) || 0,
        priceQuarterly: parseFloat(form.priceQuarterly) || 0,
        priceYearly: parseFloat(form.priceYearly) || 0,
        employeeLimit: parseInt(form.employeeLimit, 10) || 10,
        billingDefault: form.billingDefault,
        description: form.description.trim(),
        enabledFeatures: form.enabledFeatures,
      };

      if (form.id) {
        await api.patch(`/superadmin/packages/${form.id}`, payload);
      } else {
        await api.post('/superadmin/packages', payload);
      }

      setIsModalOpen(false);
      fetchPackages();
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to save package');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (pkg: PackageItem) => {
    if (!window.confirm(`Are you sure you want to delete package "${pkg.name}"?`)) return;
    try {
      await api.delete(`/superadmin/packages/${pkg.id}`);
      fetchPackages();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete package');
    }
  };

  // Metrics
  const totalPackages = packages.length;
  const monthlyDefaultCount = packages.filter((p) => p.billingDefault === 'MONTHLY').length;
  const yearlyDefaultCount = packages.filter((p) => p.billingDefault === 'YEARLY').length;

  // Filtered packages
  const filteredPackages = packages.filter((p) => {
    const q = searchTerm.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.description && p.description.toLowerCase().includes(q))
    );
  });

  const totalPages = Math.ceil(filteredPackages.length / pageSize) || 1;
  const displayedPackages = filteredPackages.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const getPackageIconInfo = (name: string, index: number) => {
    const n = name.toLowerCase();
    if (n.includes('starter') || n.includes('basic')) {
      return {
        icon: IconPackage,
        bgColor: 'bg-emerald-50/80',
        textColor: 'text-emerald-600',
        borderColor: 'border-emerald-100/60',
      };
    }
    if (n.includes('pro') || n.includes('professional') || n.includes('growth')) {
      return {
        icon: IconUsers,
        bgColor: 'bg-blue-50/80',
        textColor: 'text-blue-600',
        borderColor: 'border-blue-100/60',
      };
    }
    if (n.includes('enterprise')) {
      return {
        icon: IconBuilding,
        bgColor: 'bg-indigo-50/80',
        textColor: 'text-indigo-600',
        borderColor: 'border-indigo-100/60',
      };
    }
    if (n.includes('attendance')) {
      if (index % 2 === 1) {
        return {
          icon: IconUsers,
          bgColor: 'bg-emerald-50/80',
          textColor: 'text-emerald-600',
          borderColor: 'border-emerald-100/60',
        };
      }
      return {
        icon: IconClock,
        bgColor: 'bg-blue-50/80',
        textColor: 'text-blue-600',
        borderColor: 'border-blue-100/60',
      };
    }
    if (n.includes('essential') || n.includes('hr')) {
      return {
        icon: IconFileText,
        bgColor: 'bg-amber-50/80',
        textColor: 'text-amber-600',
        borderColor: 'border-amber-100/60',
      };
    }
    if (n.includes('payroll')) {
      return {
        icon: IconShield,
        bgColor: 'bg-rose-50/80',
        textColor: 'text-rose-600',
        borderColor: 'border-rose-100/60',
      };
    }
    return {
      icon: IconPackage,
      bgColor: 'bg-indigo-50/80',
      textColor: 'text-indigo-600',
      borderColor: 'border-indigo-100/60',
    };
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Packages</h1>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5 font-medium">
            <Link to="/super-admin/dashboard" className="hover:text-brand-600 flex items-center gap-1">
              <IconHome className="w-3.5 h-3.5 text-slate-400" />
            </Link>
            <span className="text-slate-500 font-medium">Super Admin</span>
            <span className="text-slate-300">&gt;</span>
            <span className="text-slate-600 font-medium">Packages</span>
          </div>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white font-semibold text-xs shadow-xs transition-all active:scale-95 self-start sm:self-center cursor-pointer"
        >
          <IconPlus className="w-4 h-4" />
          Add Package
        </button>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Total Packages */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start gap-4 relative z-10">
            <div className="w-12 h-12 rounded-xl bg-indigo-50/80 text-indigo-600 border border-indigo-100/60 flex items-center justify-center shrink-0">
              <IconPackage className="w-6 h-6 stroke-[1.75]" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Total Packages</p>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">{totalPackages}</p>
              <p className="text-xs font-semibold text-emerald-500 mt-1 flex items-center gap-0.5">
                <IconArrowUpRight className="w-3.5 h-3.5" />
                <span>+3 from last month</span>
              </p>
            </div>
          </div>
          {/* Decorative Wave */}
          <div className="absolute bottom-0 left-0 right-0 h-10 pointer-events-none overflow-hidden opacity-90">
            <svg viewBox="0 0 400 60" preserveAspectRatio="none" className="w-full h-full">
              <path
                d="M0 45 C 70 20, 140 55, 210 35 C 280 15, 340 45, 400 25 L 400 60 L 0 60 Z"
                fill="#6366f1"
                fillOpacity="0.06"
              />
              <path
                d="M0 45 C 70 20, 140 55, 210 35 C 280 15, 340 45, 400 25"
                fill="none"
                stroke="#818cf8"
                strokeWidth="2"
                strokeOpacity="0.5"
              />
            </svg>
          </div>
        </div>

        {/* Card 2: Monthly Default */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start gap-4 relative z-10">
            <div className="w-12 h-12 rounded-xl bg-emerald-50/80 text-emerald-500 border border-emerald-100/60 flex items-center justify-center shrink-0">
              <IconCalendar className="w-6 h-6 stroke-[1.75]" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Monthly Default</p>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
                {monthlyDefaultCount}
              </p>
              <p className="text-xs font-normal text-slate-500 mt-1 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                <span>Currently active</span>
              </p>
            </div>
          </div>
          {/* Decorative Wave */}
          <div className="absolute bottom-0 left-0 right-0 h-10 pointer-events-none overflow-hidden opacity-90">
            <svg viewBox="0 0 400 60" preserveAspectRatio="none" className="w-full h-full">
              <path
                d="M0 46 C 80 18, 150 54, 220 28 C 290 12, 350 40, 400 22 L 400 60 L 0 60 Z"
                fill="#10b981"
                fillOpacity="0.06"
              />
              <path
                d="M0 46 C 80 18, 150 54, 220 28 C 290 12, 350 40, 400 22"
                fill="none"
                stroke="#34d399"
                strokeWidth="2"
                strokeOpacity="0.5"
              />
            </svg>
          </div>
        </div>

        {/* Card 3: Yearly Default */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start gap-4 relative z-10">
            <div className="w-12 h-12 rounded-xl bg-amber-50/80 text-amber-500 border border-amber-100/60 flex items-center justify-center shrink-0">
              <IconCalendarEvent className="w-6 h-6 stroke-[1.75]" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Yearly Default</p>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
                {yearlyDefaultCount}
              </p>
              <p className="text-xs font-normal text-slate-400 mt-1 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
                <span>No yearly default set</span>
              </p>
            </div>
          </div>
          {/* Decorative Wave */}
          <div className="absolute bottom-0 left-0 right-0 h-10 pointer-events-none overflow-hidden opacity-90">
            <svg viewBox="0 0 400 60" preserveAspectRatio="none" className="w-full h-full">
              <path
                d="M0 44 C 85 18, 150 52, 230 25 C 310 10, 360 42, 400 22 L 400 60 L 0 60 Z"
                fill="#f59e0b"
                fillOpacity="0.06"
              />
              <path
                d="M0 44 C 85 18, 150 52, 230 25 C 310 10, 360 42, 400 22"
                fill="none"
                stroke="#fbbf24"
                strokeWidth="2"
                strokeOpacity="0.5"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Main Table Card: Available Packages */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Card Header with Search Input */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100/60 flex items-center justify-center">
              <IconPackage className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-slate-900">Available Packages</h2>
          </div>

          <div className="relative w-full sm:w-80">
            <IconSearch className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name, description..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10 pr-4 py-2 text-xs bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-brand-600 w-full placeholder:text-slate-400 text-slate-800 shadow-2xs"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-5 py-4 whitespace-nowrap min-w-[170px]">NAME</th>
                <th className="px-5 py-4 min-w-[180px] max-w-[220px]">DESCRIPTION</th>
                <th className="px-5 py-4 whitespace-nowrap min-w-[120px]">BILLING DEFAULT</th>
                <th className="px-5 py-4 whitespace-nowrap min-w-[110px]">MONTHLY</th>
                <th className="px-5 py-4 whitespace-nowrap min-w-[110px]">YEARLY</th>
                <th className="px-5 py-4 whitespace-nowrap min-w-[80px]">LIMIT</th>
                <th className="px-5 py-4 min-w-[300px]">FEATURES</th>
                <th className="px-5 py-4 whitespace-nowrap min-w-[110px]">CREATED</th>
                <th className="px-5 py-4 text-right whitespace-nowrap min-w-[90px]">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-5 py-10 text-center text-slate-400">
                    <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-brand-600" />
                  </td>
                </tr>
              ) : displayedPackages.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center text-slate-400 font-medium">
                    No packages found.
                  </td>
                </tr>
              ) : (
                displayedPackages.map((pkg, idx) => {
                  const curr = pkg.currency || 'INR';
                  const monthlyFormatted = `${curr} ${Number(pkg.priceMonthly || 0).toFixed(2)}`;
                  const yearlyFormatted = `${curr} ${Number(pkg.priceYearly || 0).toFixed(2)}`;
                  const createdStr = pkg.createdAt
                    ? new Date(pkg.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: '2-digit',
                        year: 'numeric',
                      })
                    : 'Oct 06, 2026';

                  const featuresList = Array.isArray(pkg.enabledFeatures)
                    ? pkg.enabledFeatures
                    : [];

                  const iconInfo = getPackageIconInfo(pkg.name, idx);
                  const IconComp = iconInfo.icon;

                  const isMonthly = (pkg.billingDefault || 'MONTHLY').toUpperCase() === 'MONTHLY';
                  const isYearly = (pkg.billingDefault || '').toUpperCase() === 'YEARLY';

                  return (
                    <tr key={pkg.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Name with custom colored Icon tile */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl ${iconInfo.bgColor} ${iconInfo.textColor} border ${iconInfo.borderColor} flex items-center justify-center shrink-0 shadow-2xs`}
                          >
                            <IconComp className="w-4 h-4" />
                          </div>
                          <span className="font-bold text-slate-900 leading-snug">{pkg.name}</span>
                        </div>
                      </td>

                      {/* Description with instant hover tooltip if long */}
                      <td className="px-5 py-4 min-w-[180px] max-w-[220px]">
                        <div className="relative group/desc inline-block max-w-full">
                          <p className="truncate text-xs font-normal text-slate-500 cursor-help" title={pkg.description || '-'}>
                            {pkg.description || '-'}
                          </p>

                          {/* Elegant floating tooltip on hover */}
                          {pkg.description && pkg.description.length > 25 && (
                            <div className="absolute left-0 bottom-full mb-2 hidden group-hover/desc:flex flex-col z-50 w-72 p-2.5 bg-slate-900/95 text-white text-xs font-normal rounded-xl shadow-xl backdrop-blur-xs pointer-events-none animate-in fade-in zoom-in-95">
                              <span className="leading-relaxed">{pkg.description}</span>
                              <div className="absolute left-4 top-full -mt-1 border-4 border-transparent border-t-slate-900/95" />
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Billing Default Badge */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        {isMonthly ? (
                          <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100/80">
                            Monthly
                          </span>
                        ) : isYearly ? (
                          <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-600 border border-amber-100/80">
                            Yearly
                          </span>
                        ) : (
                          <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-600 border border-blue-100/80 capitalize">
                            {pkg.billingDefault?.toLowerCase() || 'Monthly'}
                          </span>
                        )}
                      </td>

                      {/* Monthly Price */}
                      <td className="px-5 py-4 text-slate-700 font-normal whitespace-nowrap">{monthlyFormatted}</td>

                      {/* Yearly Price */}
                      <td className="px-5 py-4 text-slate-700 font-normal whitespace-nowrap">{yearlyFormatted}</td>

                      {/* Limit */}
                      <td className="px-5 py-4 font-semibold text-slate-800 whitespace-nowrap">
                        {pkg.employeeLimit || 10}
                      </td>

                      {/* Features */}
                      <td className="px-5 py-4 min-w-[300px]">
                        <div className="flex flex-wrap items-center gap-1.5 max-w-[340px]">
                          {featuresList.slice(0, 3).map((featKey, fIdx) => {
                            const featObj = AVAILABLE_FEATURES.find((af) => af.key === featKey);
                            const label = featObj?.name || featKey.replace(/_/g, ' ');
                            return (
                              <span
                                key={fIdx}
                                className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-indigo-50/80 text-indigo-700 border border-indigo-100/70 whitespace-nowrap leading-none"
                              >
                                {label}
                              </span>
                            );
                          })}
                          {featuresList.length > 3 && (
                            <div className="relative group/more inline-block">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 cursor-pointer whitespace-nowrap transition-colors">
                                +{featuresList.length - 3} more
                              </span>
                              {/* Hover preview of remaining modules */}
                              <div className="absolute left-0 bottom-full mb-2 hidden group-hover/more:flex flex-col gap-1 z-50 w-56 p-2 bg-slate-900/95 text-white text-xs rounded-xl shadow-xl pointer-events-none animate-in fade-in zoom-in-95">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                                  More Modules
                                </span>
                                {featuresList.slice(3).map((fk, mIdx) => {
                                  const fo = AVAILABLE_FEATURES.find((af) => af.key === fk);
                                  return (
                                    <span key={mIdx} className="text-[11px]">
                                      • {fo?.name || fk.replace(/_/g, ' ')}
                                    </span>
                                  );
                                })}
                                <div className="absolute left-4 top-full -mt-1 border-4 border-transparent border-t-slate-900/95" />
                              </div>
                            </div>
                          )}
                          {featuresList.length === 0 && (
                            <span className="text-xs text-slate-400 italic">None</span>
                          )}
                        </div>
                      </td>

                      {/* Created */}
                      <td className="px-5 py-4 text-slate-600 font-medium whitespace-nowrap">
                        {createdStr}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(pkg)}
                            className="w-8 h-8 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 flex items-center justify-center shadow-2xs transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <IconEdit className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(pkg)}
                            className="w-8 h-8 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-500 hover:text-rose-700 flex items-center justify-center shadow-2xs transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <IconTrash className="w-4 h-4" />
                          </button>
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
            {filteredPackages.length === 0
              ? 'Showing 0 to 0 of 0 entries'
              : `Showing ${(currentPage - 1) * pageSize + 1} to ${Math.min(
                  currentPage * pageSize,
                  filteredPackages.length
                )} of ${filteredPackages.length} entries`}
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

      {/* Add / Edit Package Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150 my-6 flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">
                {form.id ? 'Edit Package' : 'Add Package'}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
              >
                <IconX className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-5">
              {error && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <IconAlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Row 1: Name & Currency */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Starter"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:border-blue-600 focus:outline-brand-600 text-slate-800 placeholder:text-slate-400 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Currency</label>
                  <input
                    type="text"
                    placeholder="INR"
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:border-blue-600 focus:outline-brand-600 text-slate-800 placeholder:text-slate-400 shadow-2xs"
                  />
                </div>
              </div>

              {/* Row 2: Pricing (Monthly, Quarterly, Yearly) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Monthly Price
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="999.00"
                    value={form.priceMonthly}
                    onChange={(e) => setForm({ ...form, priceMonthly: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:border-blue-600 focus:outline-brand-600 text-slate-800 placeholder:text-slate-400 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Quarterly Price
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="2699.00"
                    value={form.priceQuarterly}
                    onChange={(e) => setForm({ ...form, priceQuarterly: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:border-blue-600 focus:outline-brand-600 text-slate-800 placeholder:text-slate-400 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Yearly Price
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="9999.00"
                    value={form.priceYearly}
                    onChange={(e) => setForm({ ...form, priceYearly: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:border-blue-600 focus:outline-brand-600 text-slate-800 placeholder:text-slate-400 shadow-2xs"
                  />
                </div>
              </div>

              {/* Row 3: Employee Limit & Default Billing Cycle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Employee Limit
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="25"
                    value={form.employeeLimit}
                    onChange={(e) => setForm({ ...form, employeeLimit: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:border-blue-600 focus:outline-brand-600 text-slate-800 placeholder:text-slate-400 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Billing Cycle Default
                  </label>
                  <select
                    value={form.billingDefault}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        billingDefault: e.target.value as 'MONTHLY' | 'QUARTERLY' | 'YEARLY',
                      })
                    }
                    className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:border-blue-600 focus:outline-brand-600 text-slate-800 shadow-2xs"
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="YEARLY">Yearly</option>
                  </select>
                </div>
              </div>

              {/* Row 4: Description */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Description</label>
                <textarea
                  rows={2}
                  placeholder="Plan summary..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:border-blue-600 focus:outline-brand-600 text-slate-800 placeholder:text-slate-400 shadow-2xs"
                />
              </div>

              {/* Row 5: Modules / Enabled Features Checklist */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">Included Modules</label>
                <p className="text-[11px] text-slate-500 mb-3">
                  Check modules available to companies on this package plan:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto p-3 border border-slate-200 rounded-xl bg-slate-50/50">
                  {AVAILABLE_FEATURES.map((feat) => {
                    const isChecked = form.enabledFeatures.includes(feat.key);
                    return (
                      <label
                        key={feat.key}
                        className={`flex items-start gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-blue-50 border-blue-200 text-blue-900'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleFeature(feat.key)}
                          className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                        />
                        <div className="leading-tight">
                          <div className="font-semibold">{feat.name}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                            {feat.description}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-xs font-semibold text-white shadow-xs transition-colors"
                >
                  {isSubmitting ? 'Saving...' : form.id ? 'Save Changes' : 'Create Package'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PackagesPage;
