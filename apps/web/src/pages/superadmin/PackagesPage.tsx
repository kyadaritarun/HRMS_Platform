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
  IconSearch,
  IconChevronLeft,
  IconChevronRight,
  IconBuilding,
  IconClock,
  IconUsers,
  IconFileText,
  IconShield,
  IconCheck,
  IconSparkles,
  IconCrown,
} from '@tabler/icons-react';

export interface PackageItem {
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
  tier?: 'BASIC' | 'MEDIUM' | 'CUSTOM';
  companyName?: string;
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
  tier: 'BASIC' as 'BASIC' | 'MEDIUM' | 'CUSTOM',
  companyName: '',
  currency: 'INR',
  priceMonthly: '999.00',
  priceQuarterly: '2799.00',
  priceYearly: '9999.00',
  employeeLimit: '25',
  billingDefault: 'MONTHLY' as 'MONTHLY' | 'QUARTERLY' | 'YEARLY',
  description: '',
  enabledFeatures: [] as string[],
};

export const PackagesPage: React.FC = () => {
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTierFilter, setSelectedTierFilter] = useState<'ALL' | 'BASIC' | 'MEDIUM' | 'CUSTOM'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

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

  const handleOpenCreate = (preselectedTier: 'BASIC' | 'MEDIUM' | 'CUSTOM' = 'BASIC') => {
    let defaultPriceMonthly = '999.00';
    let defaultPriceQuarterly = '2799.00';
    let defaultPriceYearly = '9999.00';
    let defaultName = 'Basic Plan';
    let defaultFeatures = ['time_attendance_management', 'leave_management'];

    if (preselectedTier === 'MEDIUM') {
      defaultPriceMonthly = '2499.00';
      defaultPriceQuarterly = '6999.00';
      defaultPriceYearly = '24999.00';
      defaultName = 'Medium Plan';
      defaultFeatures = [
        'time_attendance_management',
        'leave_management',
        'claims',
        'support_ticket_management',
        'appreciations',
      ];
    } else if (preselectedTier === 'CUSTOM') {
      defaultPriceMonthly = '4999.00';
      defaultPriceQuarterly = '13999.00';
      defaultPriceYearly = '49999.00';
      defaultName = 'Custom Plan';
      defaultFeatures = AVAILABLE_FEATURES.map((f) => f.key);
    }

    setForm({
      ...INITIAL_FORM,
      tier: preselectedTier,
      name: defaultName,
      priceMonthly: defaultPriceMonthly,
      priceQuarterly: defaultPriceQuarterly,
      priceYearly: defaultPriceYearly,
      enabledFeatures: defaultFeatures,
    });
    setError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (pkg: PackageItem) => {
    const tier = pkg.tier || (
      pkg.name.toLowerCase().includes('basic') || pkg.name.toLowerCase().includes('starter')
        ? 'BASIC'
        : pkg.name.toLowerCase().includes('custom') || pkg.name.toLowerCase().includes('enterprise')
        ? 'CUSTOM'
        : 'MEDIUM'
    );

    setForm({
      id: pkg.id,
      name: pkg.name || '',
      tier,
      companyName: pkg.companyName || '',
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

  const handleTierChange = (newTier: 'BASIC' | 'MEDIUM' | 'CUSTOM') => {
    setForm((prev) => {
      let updatedName = prev.name;
      if (newTier === 'BASIC' && (prev.name === 'Medium Plan' || prev.name.includes('Custom'))) {
        updatedName = 'Basic Plan';
      } else if (newTier === 'MEDIUM' && (prev.name === 'Basic Plan' || prev.name.includes('Custom'))) {
        updatedName = 'Medium Plan';
      } else if (newTier === 'CUSTOM') {
        updatedName = prev.companyName ? `${prev.companyName} - Custom Plan` : 'Custom Plan';
      }

      return {
        ...prev,
        tier: newTier,
        name: updatedName,
      };
    });
  };

  const handleCompanyNameChange = (companyName: string) => {
    setForm((prev) => ({
      ...prev,
      companyName,
      name: companyName ? `${companyName} - Custom Plan` : prev.name,
      description: companyName ? `Tailored plan configured specifically for ${companyName}` : prev.description,
    }));
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
        tier: form.tier,
        companyName: form.companyName.trim() || undefined,
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
  const basicCount = packages.filter(
    (p) => p.tier === 'BASIC' || p.name.toLowerCase().includes('basic') || p.name.toLowerCase().includes('starter')
  ).length;
  const mediumCount = packages.filter(
    (p) => p.tier === 'MEDIUM' || p.name.toLowerCase().includes('medium') || p.name.toLowerCase().includes('pro')
  ).length;
  const customCount = packages.filter(
    (p) => p.tier === 'CUSTOM' || p.name.toLowerCase().includes('custom') || p.name.toLowerCase().includes('enterprise')
  ).length;

  // Filtered packages
  const filteredPackages = packages.filter((p) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      p.name.toLowerCase().includes(q) ||
      (p.description && p.description.toLowerCase().includes(q)) ||
      (p.companyName && p.companyName.toLowerCase().includes(q));

    if (!matchesSearch) return false;

    const tier = p.tier || (
      p.name.toLowerCase().includes('basic') || p.name.toLowerCase().includes('starter')
        ? 'BASIC'
        : p.name.toLowerCase().includes('custom') || p.name.toLowerCase().includes('enterprise')
        ? 'CUSTOM'
        : 'MEDIUM'
    );

    if (selectedTierFilter !== 'ALL' && tier !== selectedTierFilter) {
      return false;
    }

    return true;
  });

  const totalPages = Math.ceil(filteredPackages.length / pageSize) || 1;
  const displayedPackages = filteredPackages.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const getPackageIconInfo = (pkg: PackageItem) => {
    const n = pkg.name.toLowerCase();
    if (pkg.tier === 'BASIC' || n.includes('basic') || n.includes('starter')) {
      return {
        icon: IconPackage,
        bgColor: 'bg-emerald-50 text-emerald-600 border-emerald-200',
        badge: 'Basic Plan',
        badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      };
    }
    if (pkg.tier === 'MEDIUM' || n.includes('medium') || n.includes('pro')) {
      return {
        icon: IconUsers,
        bgColor: 'bg-blue-50 text-blue-600 border-blue-200',
        badge: 'Medium Plan',
        badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
      };
    }
    return {
      icon: IconCrown,
      bgColor: 'bg-amber-50 text-amber-600 border-amber-200',
      badge: 'Custom Plan',
      badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
    };
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Packages &amp; Pricing</h1>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5 font-medium">
            <Link to="/super-admin/dashboard" className="hover:text-blue-600 flex items-center gap-1">
              <IconHome className="w-3.5 h-3.5 text-slate-400" />
            </Link>
            <span className="text-slate-500 font-medium">Super Admin</span>
            <span className="text-slate-300">&gt;</span>
            <span className="text-slate-600 font-medium">Packages &amp; Pricing</span>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            onClick={() => handleOpenCreate('CUSTOM')}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-semibold text-xs shadow-2xs transition-all cursor-pointer"
          >
            <IconBuilding className="w-4 h-4 text-amber-600" />
            + Custom Plan for Company
          </button>

          <button
            onClick={() => handleOpenCreate('BASIC')}
            className="inline-flex items-center justify-center gap-1.5 px-4.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <IconPlus className="w-4 h-4" />
            Add Package
          </button>
        </div>
      </div>

      {/* 3 Main Tier Cards (Basic, Medium, Custom) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Tier 1: Basic Plan */}
        <div className="bg-white p-5 rounded-2xl border border-emerald-100/90 shadow-sm relative overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Basic Tier
              </span>
              <span className="text-xs text-slate-400 font-medium">{basicCount} Plans</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900">Basic Plan</h3>
            <p className="text-xs text-slate-500 mt-1 line-clamp-2">
              Essential HR foundation: Attendance, Leave Management, and Employee Directory.
            </p>

            <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-50 p-2 rounded-xl">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Monthly</div>
                <div className="text-xs font-bold text-slate-800 mt-0.5">₹999</div>
              </div>
              <div className="bg-slate-50 p-2 rounded-xl">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Quarterly</div>
                <div className="text-xs font-bold text-slate-800 mt-0.5">₹2,799</div>
              </div>
              <div className="bg-slate-50 p-2 rounded-xl">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Yearly</div>
                <div className="text-xs font-bold text-emerald-600 mt-0.5">₹9,999</div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">Up to 25 Employees</span>
            <button
              onClick={() => handleOpenCreate('BASIC')}
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline"
            >
              + Create Basic &rarr;
            </button>
          </div>
        </div>

        {/* Tier 2: Medium Plan */}
        <div className="bg-white p-5 rounded-2xl border border-blue-100/90 shadow-sm relative overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                Medium Tier
              </span>
              <span className="text-xs text-slate-400 font-medium">{mediumCount} Plans</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900">Medium Plan</h3>
            <p className="text-xs text-slate-500 mt-1 line-clamp-2">
              Workforce suite: Attendance, Leaves, Expense Claims, Tickets, and Appreciations.
            </p>

            <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-50 p-2 rounded-xl">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Monthly</div>
                <div className="text-xs font-bold text-slate-800 mt-0.5">₹2,499</div>
              </div>
              <div className="bg-slate-50 p-2 rounded-xl">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Quarterly</div>
                <div className="text-xs font-bold text-slate-800 mt-0.5">₹6,999</div>
              </div>
              <div className="bg-slate-50 p-2 rounded-xl">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Yearly</div>
                <div className="text-xs font-bold text-blue-600 mt-0.5">₹24,999</div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">Up to 50 Employees</span>
            <button
              onClick={() => handleOpenCreate('MEDIUM')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline"
            >
              + Create Medium &rarr;
            </button>
          </div>
        </div>

        {/* Tier 3: Custom Plan for Company */}
        <div className="bg-white p-5 rounded-2xl border border-amber-200/90 shadow-sm relative overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                <IconSparkles className="w-3 h-3 text-amber-500" />
                Custom Company Tier
              </span>
              <span className="text-xs text-slate-400 font-medium">{customCount} Custom Plans</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900">Custom Plan</h3>
            <p className="text-xs text-slate-500 mt-1 line-clamp-2">
              Enterprise suite tailored for a specific company with custom pricing, seats, and AI.
            </p>

            <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
              <div className="bg-amber-50/50 p-2 rounded-xl border border-amber-100/60">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Monthly</div>
                <div className="text-xs font-bold text-slate-800 mt-0.5">₹4,999</div>
              </div>
              <div className="bg-amber-50/50 p-2 rounded-xl border border-amber-100/60">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Quarterly</div>
                <div className="text-xs font-bold text-slate-800 mt-0.5">₹13,999</div>
              </div>
              <div className="bg-amber-50/50 p-2 rounded-xl border border-amber-100/60">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Yearly</div>
                <div className="text-xs font-bold text-amber-600 mt-0.5">₹49,999</div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">Custom Seats &amp; Title</span>
            <button
              onClick={() => handleOpenCreate('CUSTOM')}
              className="text-xs font-bold text-amber-600 hover:text-amber-700 hover:underline"
            >
              + Create for Company &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* Main Table Card: Available Packages */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Card Header with Filter Pills and Search */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setSelectedTierFilter('ALL');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                selectedTierFilter === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Plans ({totalPackages})
            </button>
            <button
              onClick={() => {
                setSelectedTierFilter('BASIC');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                selectedTierFilter === 'BASIC'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              Basic ({basicCount})
            </button>
            <button
              onClick={() => {
                setSelectedTierFilter('MEDIUM');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                selectedTierFilter === 'MEDIUM'
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
              }`}
            >
              Medium ({mediumCount})
            </button>
            <button
              onClick={() => {
                setSelectedTierFilter('CUSTOM');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                selectedTierFilter === 'CUSTOM'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              Custom Plans ({customCount})
            </button>
          </div>

          <div className="relative w-full md:w-80">
            <IconSearch className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search plan or company name..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10 pr-4 py-2 text-xs bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-blue-600 w-full placeholder:text-slate-400 text-slate-800 shadow-2xs"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-5 py-4 whitespace-nowrap min-w-[190px]">PLAN NAME</th>
                <th className="px-5 py-4 whitespace-nowrap min-w-[150px]">TIER &amp; COMPANY</th>
                <th className="px-5 py-4 whitespace-nowrap min-w-[110px]">MONTHLY PRICE</th>
                <th className="px-5 py-4 whitespace-nowrap min-w-[110px]">QUARTERLY PRICE</th>
                <th className="px-5 py-4 whitespace-nowrap min-w-[110px]">YEARLY PRICE</th>
                <th className="px-5 py-4 whitespace-nowrap min-w-[90px]">LIMIT</th>
                <th className="px-5 py-4 min-w-[260px]">FEATURES</th>
                <th className="px-5 py-4 text-right whitespace-nowrap min-w-[90px]">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-slate-400">
                    <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
                  </td>
                </tr>
              ) : displayedPackages.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-slate-400 font-medium">
                    No packages match the current filters.
                  </td>
                </tr>
              ) : (
                displayedPackages.map((pkg) => {
                  const curr = pkg.currency || 'INR';
                  const monthlyFormatted = `₹${Number(pkg.priceMonthly || 0).toLocaleString('en-IN')}`;
                  const quarterlyFormatted = `₹${Number(pkg.priceQuarterly || 0).toLocaleString('en-IN')}`;
                  const yearlyFormatted = `₹${Number(pkg.priceYearly || 0).toLocaleString('en-IN')}`;

                  const featuresList = Array.isArray(pkg.enabledFeatures) ? pkg.enabledFeatures : [];
                  const iconInfo = getPackageIconInfo(pkg);
                  const IconComp = iconInfo.icon;

                  const isCustom =
                    pkg.tier === 'CUSTOM' ||
                    pkg.name.toLowerCase().includes('custom') ||
                    pkg.name.toLowerCase().includes('enterprise');

                  return (
                    <tr key={pkg.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Name */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 shadow-2xs ${iconInfo.bgColor}`}
                          >
                            <IconComp className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 leading-snug block">
                              {pkg.name}
                            </span>
                            <span className="text-[11px] text-slate-400 line-clamp-1 max-w-[200px]">
                              {pkg.description || 'Full HR workspace plan'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Tier & Target Company */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <span
                            className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${iconInfo.badgeBg}`}
                          >
                            {iconInfo.badge}
                          </span>
                          {isCustom && (
                            <div className="text-[11px] font-medium text-amber-800 flex items-center gap-1">
                              <IconBuilding className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span className="font-semibold">{pkg.companyName || 'Company Custom'}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Monthly Price */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="font-bold text-slate-900">{monthlyFormatted}</span>
                        <span className="text-[10px] text-slate-400 block">/ month</span>
                      </td>

                      {/* Quarterly Price */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="font-bold text-slate-900">{quarterlyFormatted}</span>
                        <span className="text-[10px] text-slate-400 block">/ quarter</span>
                      </td>

                      {/* Yearly Price */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="font-bold text-emerald-700">{yearlyFormatted}</span>
                        <span className="text-[10px] text-slate-400 block">/ year</span>
                      </td>

                      {/* Limit */}
                      <td className="px-5 py-4 font-semibold text-slate-800 whitespace-nowrap">
                        {pkg.employeeLimit || 10} Employees
                      </td>

                      {/* Features */}
                      <td className="px-5 py-4 min-w-[260px]">
                        <div className="flex flex-wrap items-center gap-1 max-w-[320px]">
                          {featuresList.slice(0, 3).map((featKey, fIdx) => {
                            const featObj = AVAILABLE_FEATURES.find((af) => af.key === featKey);
                            const label = featObj?.name || featKey.replace(/_/g, ' ');
                            return (
                              <span
                                key={fIdx}
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200"
                              >
                                {label}
                              </span>
                            );
                          })}
                          {featuresList.length > 3 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                              +{featuresList.length - 3} more
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(pkg)}
                            className="w-8 h-8 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-blue-600 flex items-center justify-center shadow-2xs transition-colors cursor-pointer"
                            title="Edit Package"
                          >
                            <IconEdit className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(pkg)}
                            className="w-8 h-8 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center shadow-2xs transition-colors cursor-pointer"
                            title="Delete Package"
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
              ? 'Showing 0 to 0 entries'
              : `Showing ${(currentPage - 1) * pageSize + 1} to ${Math.min(
                  currentPage * pageSize,
                  filteredPackages.length
                )} of ${filteredPackages.length} packages`}
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
                    ? 'bg-blue-600 text-white shadow-xs'
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
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {form.id ? 'Edit Package Plan' : 'Create Package Plan'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure Monthly, Quarterly, and Yearly prices and company assignments.
                </p>
              </div>
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

              {/* Tier Selection (3 options: Basic, Medium, Custom) */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  Plan Tier / Category
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => handleTierChange('BASIC')}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      form.tier === 'BASIC'
                        ? 'border-emerald-500 bg-emerald-50/70 text-emerald-950 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center justify-between">
                      <span>Basic Plan</span>
                      {form.tier === 'BASIC' && <IconCheck className="w-4 h-4 text-emerald-600" />}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">Starter Tier</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTierChange('MEDIUM')}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      form.tier === 'MEDIUM'
                        ? 'border-blue-500 bg-blue-50/70 text-blue-950 ring-2 ring-blue-500/20'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center justify-between">
                      <span>Medium Plan</span>
                      {form.tier === 'MEDIUM' && <IconCheck className="w-4 h-4 text-blue-600" />}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">Professional Tier</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTierChange('CUSTOM')}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      form.tier === 'CUSTOM'
                        ? 'border-amber-500 bg-amber-50/70 text-amber-950 ring-2 ring-amber-500/20'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center justify-between">
                      <span>Custom Plan</span>
                      {form.tier === 'CUSTOM' && <IconCheck className="w-4 h-4 text-amber-600" />}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">For Specific Company</div>
                  </button>
                </div>
              </div>

              {/* Company Name field if Custom Plan */}
              {form.tier === 'CUSTOM' && (
                <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 space-y-2 animate-in fade-in">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                    <IconBuilding className="w-4 h-4 text-amber-700" />
                    Target Company Name for this Custom Plan
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. Acme Corporation, TechNova Inc"
                    value={form.companyName}
                    onChange={(e) => handleCompanyNameChange(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-white border border-amber-300 rounded-xl focus:border-amber-600 focus:outline-hidden text-slate-900 font-medium placeholder:text-slate-400"
                  />
                  <p className="text-[11px] text-amber-800">
                    Entering a company name automatically formats the title as{' '}
                    <strong>{form.companyName ? `${form.companyName} - Custom Plan` : '[Company Name] - Custom Plan'}</strong>{' '}
                    and displays it under Plan Name when adding companies.
                  </p>
                </div>
              )}

              {/* Row: Plan Name & Currency */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Plan Title / Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Basic Plan or Acme Corp - Custom Plan"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:border-blue-600 focus:outline-hidden text-slate-800 placeholder:text-slate-400 shadow-2xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Currency</label>
                  <input
                    type="text"
                    placeholder="INR"
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:border-blue-600 focus:outline-hidden text-slate-800 placeholder:text-slate-400 shadow-2xs"
                  />
                </div>
              </div>

              {/* Row: Pricing (Monthly, Quarterly, Yearly) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50/80 border border-slate-200/80">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Monthly Price (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="999.00"
                    value={form.priceMonthly}
                    onChange={(e) => setForm({ ...form, priceMonthly: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:border-blue-600 focus:outline-hidden text-slate-900 font-bold"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Billed every month</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Quarterly Price (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="2799.00"
                    value={form.priceQuarterly}
                    onChange={(e) => setForm({ ...form, priceQuarterly: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:border-blue-600 focus:outline-hidden text-slate-900 font-bold"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Billed every 3 months</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Yearly Price (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="9999.00"
                    value={form.priceYearly}
                    onChange={(e) => setForm({ ...form, priceYearly: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:border-blue-600 focus:outline-hidden text-slate-900 font-bold text-emerald-700"
                  />
                  <span className="text-[10px] text-emerald-600 mt-0.5 block font-medium">Billed annually</span>
                </div>
              </div>

              {/* Row: Employee Limit & Default Billing Cycle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Employee Seat Limit
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="25"
                    value={form.employeeLimit}
                    onChange={(e) => setForm({ ...form, employeeLimit: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:border-blue-600 focus:outline-hidden text-slate-800 placeholder:text-slate-400 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Default Billing Cycle
                  </label>
                  <select
                    value={form.billingDefault}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        billingDefault: e.target.value as 'MONTHLY' | 'QUARTERLY' | 'YEARLY',
                      })
                    }
                    className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:border-blue-600 focus:outline-hidden text-slate-800 shadow-2xs"
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="YEARLY">Yearly</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Description</label>
                <textarea
                  rows={2}
                  placeholder="Plan summary and purpose..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:border-blue-600 focus:outline-hidden text-slate-800 placeholder:text-slate-400 shadow-2xs"
                />
              </div>

              {/* Included Modules / Features Checklist */}
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
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer"
                >
                  {isSubmitting ? 'Saving...' : form.id ? 'Save Changes' : 'Create Package Plan'}
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
