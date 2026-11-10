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
  IconFilter,
  IconChevronDown,
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

export interface FeatureDefinition {
  key: string;
  name: string;
  description: string;
  tag?: string;
}

export interface FeatureGroup {
  id: string;
  title: string;
  badge: string;
  badgeColor: string;
  description: string;
  features: FeatureDefinition[];
}

export const FEATURE_GROUPS: FeatureGroup[] = [
  {
    id: 'pillars',
    title: '1. Operational Roles & Department Pillars',
    badge: '3 Pillars',
    badgeColor: 'bg-purple-100 text-purple-700 border-purple-200',
    description: 'Enables administrative company departments and unlocks assigning HR, Finance, and IT staff roles.',
    features: [
      {
        key: 'hr_operations',
        name: 'HR Department & Role',
        description: 'Permits creating HR accounts and grants access to company HR management workflows.',
        tag: 'Role: HR',
      },
      {
        key: 'finance_operations',
        name: 'Finance Department & Role',
        description: 'Permits creating Finance accounts and grants access to financial payroll operations.',
        tag: 'Role: Finance',
      },
      {
        key: 'it_operations',
        name: 'IT Department & Role',
        description: 'Permits creating IT accounts and grants access to hardware assets and onboarding.',
        tag: 'Role: IT',
      },
    ],
  },
  {
    id: 'ess',
    title: '2. Employee Self Service (ESS)',
    badge: '15 Tiles',
    badgeColor: 'bg-blue-100 text-blue-700 border-blue-200',
    description: 'Granular self-service tiles visible to all staff employees and managers.',
    features: [
      {
        key: 'time_attendance_management',
        name: 'Attendance',
        description: 'Daily web punch clock-in/out, attendance history, and regularization requests.',
      },
      {
        key: 'leave_management',
        name: 'Leaves',
        description: 'Apply for leaves, view balances (Annual, Sick, Casual), and request approvals.',
      },
      {
        key: 'comp_off',
        name: 'Comp Off',
        description: 'Apply for compensatory off days earned from overtime or weekend work.',
      },
      {
        key: 'payroll',
        name: 'Payslips',
        description: 'View and download monthly payslips with earnings and deduction breakdowns.',
      },
      {
        key: 'claims',
        name: 'Expense Claims',
        description: 'Submit expense reimbursement claims, attach receipts, and track approval status.',
      },
      {
        key: 'loan_advances',
        name: 'Loans & Advances',
        description: 'Apply for company salary advances or personal loans with EMI deduction schedules.',
      },
      {
        key: 'tax_declarations',
        name: 'Tax Declarations',
        description: 'Select tax regime (Old vs New), declare Section 80C/80D deductions, and upload proofs.',
      },
      {
        key: 'performance',
        name: 'Performance Goals',
        description: 'Set quarterly goals, track key results (OKRs), and submit self-appraisal ratings.',
      },
      {
        key: 'appreciations',
        name: 'Appreciations',
        description: 'Send peer kudos and recognition badges to colleagues across the company.',
      },
      {
        key: 'employees_directory',
        name: 'Org Structure',
        description: 'Interactive company organization chart, department structure, and reporting lines.',
      },
      {
        key: 'policies',
        name: 'Policies',
        description: 'Browse company policy manuals and digitally sign policy acknowledgements.',
      },
      {
        key: 'documents',
        name: 'My Documents',
        description: 'Personal document locker for contracts, appraisal letters, and identity proofs.',
      },
      {
        key: 'support_ticket_management',
        name: 'Support Tickets',
        description: 'Raise internal helpdesk support tickets for IT, HR, and facilities issues.',
      },
      {
        key: 'ai_assistant',
        name: 'AI HR Assistant',
        description: 'Conversational HR assistant for instant answers on leaves, policies, and holidays.',
      },
      {
        key: 'lead_referrals',
        name: 'Employee Referrals',
        description: 'Submit candidate resumes or sales leads and track referral cash rewards.',
      },
    ],
  },
  {
    id: 'hr_suite',
    title: '3. HR & Workforce Operations',
    badge: '4 Modules',
    badgeColor: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    description: 'Workforce management tools for HR and administrative managers.',
    features: [
      {
        key: 'shift_management',
        name: 'Shift Management & Rosters',
        description: 'Custom work shifts, rotational rosters, shift assignments, and coverage planning.',
      },
      {
        key: 'holiday_calendar',
        name: 'Holiday Calendar',
        description: 'Publish and manage company annual holidays and regional festival calendars.',
      },
      {
        key: 'leave_types',
        name: 'Leave Types Configuration',
        description: 'Configure custom leave categories, annual accrual rates, and carry-forward rules.',
      },
      {
        key: 'appraisal_cycles',
        name: 'Performance Review Cycles',
        description: 'Launch company appraisal cycles, manage review questionnaires, and rating scales.',
      },
    ],
  },
  {
    id: 'finance_suite',
    title: '4. Finance & Statutory Suite',
    badge: '4 Modules',
    badgeColor: 'bg-amber-100 text-amber-700 border-amber-200',
    description: 'Financial payroll processing and compliance governance tools.',
    features: [
      {
        key: 'salary_master',
        name: 'Salary Master & Components',
        description: 'Configure employee salary structures, allowances, basic pay, and deduction rules.',
      },
      {
        key: 'form16_tax',
        name: 'Tax Proofs & Form 16',
        description: 'HR and Finance verification of employee 80C tax proofs and Form 16 distribution.',
      },
      {
        key: 'compliance_management',
        name: 'Statutory Compliance & Payout',
        description: 'PF, ESI, TDS challan summaries, and automated bank payout CSV generation.',
      },
      {
        key: 'exit_management',
        name: 'Exit & Full & Final Settlement',
        description: 'Employee resignation clearance, notice period tracking, and F&F settlement.',
      },
    ],
  },
  {
    id: 'it_suite',
    title: '5. IT Operations & Hardware Suite',
    badge: '2 Modules',
    badgeColor: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    description: 'Device lifecycle, asset tracking, and IT provisioning checklists.',
    features: [
      {
        key: 'asset_management',
        name: 'Hardware & Asset Inventory',
        description: 'Track laptops, monitors, accessories, serial numbers, warranty, and return status.',
      },
      {
        key: 'onboarding_management',
        name: 'Employee Onboarding Checklists',
        description: 'Digital onboarding checklists, hardware provisioning tasks, and software access.',
      },
    ],
  },
  {
    id: 'governance',
    title: '6. Company Governance & Administration',
    badge: '4 Modules',
    badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
    description: 'High-level business settings and security audit controls.',
    features: [
      {
        key: 'company_goals',
        name: 'Company Goals & OKRs',
        description: 'Set company-level objectives, track milestones, and quarterly performance goals.',
      },
      {
        key: 'departments',
        name: 'Company Departments',
        description: 'Create business divisions, departments, codes, and designate department leads.',
      },
      {
        key: 'billing',
        name: 'Billing & Subscription Management',
        description: 'Manage current plan tier, view invoices, download payment receipts, and upgrade.',
      },
      {
        key: 'activity_logs',
        name: 'Activity & Audit Logs',
        description: 'Real-time audit log of user logins, employee creations, edits, and administrative actions.',
      },
    ],
  },
];

export const AVAILABLE_FEATURES = Array.from(
  new Map(FEATURE_GROUPS.flatMap((g) => g.features).map((f) => [f.key, f])).values()
);

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
          <h1 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <IconPackage className="w-5 h-5 text-indigo-600 shrink-0" />
            <span>Packages &amp; Pricing</span>
          </h1>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            onClick={() => handleOpenCreate('CUSTOM')}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 text-xs font-bold shadow-2xs transition-all cursor-pointer"
          >
            <IconBuilding className="w-4 h-4 text-indigo-600" />
            <span>+ Custom Plan</span>
          </button>

          <button
            onClick={() => handleOpenCreate('BASIC')}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[#5E4BE2] to-[#4B39C3] hover:from-[#5340D4] hover:to-[#4130B4] text-white text-xs font-bold rounded-xl shadow-sm shadow-indigo-600/25 active:scale-[0.98] transition-all cursor-pointer"
          >
            <IconPlus className="w-4 h-4" />
            <span>Add Package</span>
          </button>
        </div>
      </div>

      {/* Toolbar: Search on Left & Tier Filter Dropdown on Right */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search on the Left */}
        <div className="relative flex-1 max-w-md">
          <IconSearch className="w-4 h-4 text-slate-400 font-medium absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search plan or company name..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 text-xs font-medium bg-slate-50/70 border border-slate-200/80 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all text-slate-800"
          />
        </div>

        {/* Tier Filter Dropdown on the Right */}
        <div className="relative min-w-[210px] shrink-0">
          <select
            aria-label="Filter by tier"
            value={selectedTierFilter}
            onChange={(e) => {
              setSelectedTierFilter(e.target.value as any);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-8 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200/90 rounded-xl shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-indigo-600/20 appearance-none cursor-pointer hover:border-slate-300 transition-colors"
          >
            <option value="ALL">All Plans ({totalPackages})</option>
            <option value="BASIC">Basic Plans ({basicCount})</option>
            <option value="MEDIUM">Medium Plans ({mediumCount})</option>
            <option value="CUSTOM">Custom Plans ({customCount})</option>
          </select>
          <IconFilter className="w-3.5 h-3.5 text-slate-400 font-medium absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <IconChevronDown className="w-3.5 h-3.5 text-slate-400 font-medium absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Main Table Card: Available Packages */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#e5e7eb] text-xs font-bold text-slate-900 border-b border-slate-300">
              <tr>
                <th className="px-5 py-3.5 whitespace-nowrap min-w-[190px]">Plan Name</th>
                <th className="px-5 py-3.5 whitespace-nowrap min-w-[150px]">Tier &amp; Company</th>
                <th className="px-5 py-3.5 whitespace-nowrap min-w-[110px]">Monthly Price</th>
                <th className="px-5 py-3.5 whitespace-nowrap min-w-[110px]">Quarterly Price</th>
                <th className="px-5 py-3.5 whitespace-nowrap min-w-[110px]">Yearly Price</th>
                <th className="px-5 py-3.5 whitespace-nowrap min-w-[90px]">Limit</th>
                <th className="px-5 py-3.5 min-w-[260px]">Features</th>
                <th className="px-5 py-3.5 text-right whitespace-nowrap min-w-[90px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-slate-500 font-medium">
                    <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
                  </td>
                </tr>
              ) : displayedPackages.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-slate-500 font-medium">
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
                            <span className="text-[11px] text-slate-500 font-medium line-clamp-1 max-w-[200px]">
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
                        <span className="text-[10px] text-slate-500 font-medium block">/ month</span>
                      </td>

                      {/* Quarterly Price */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="font-bold text-slate-900">{quarterlyFormatted}</span>
                        <span className="text-[10px] text-slate-500 font-medium block">/ quarter</span>
                      </td>

                      {/* Yearly Price */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="font-bold text-emerald-700">{yearlyFormatted}</span>
                        <span className="text-[10px] text-slate-500 font-medium block">/ year</span>
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
                            className="w-8 h-8 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 text-slate-500 font-medium hover:text-rose-600 flex items-center justify-center shadow-2xs transition-colors cursor-pointer"
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
        <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-medium">
          <span>
            {filteredPackages.length === 0
              ? 'Showing 0 - 0 of 0 entries'
              : `Showing ${(currentPage - 1) * pageSize + 1} - ${Math.min(
                  currentPage * pageSize,
                  filteredPackages.length
                )} of ${filteredPackages.length} entries`}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1 || totalPages === 0}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              title="Previous page"
            >
              <IconChevronLeft className="w-3.5 h-3.5" />
              <span>Prev</span>
            </button>
            <span className="px-3 py-1 rounded-lg bg-[#5E4BE2] text-white font-bold text-xs shadow-2xs">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages || totalPages === 0}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              title="Next page"
            >
              <span>Next</span>
              <IconChevronRight className="w-3.5 h-3.5" />
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
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Configure Monthly, Quarterly, and Yearly prices and company assignments.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-lg text-slate-500 font-medium hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
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
                    <div className="text-[11px] text-slate-500 font-medium mt-1">Starter Tier</div>
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
                    <div className="text-[11px] text-slate-500 font-medium mt-1">Professional Tier</div>
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
                    <div className="text-[11px] text-slate-500 font-medium mt-1">For Specific Company</div>
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
                    className="w-full px-3.5 py-2 text-xs bg-white border border-amber-300 rounded-xl focus:border-amber-600 focus:outline-hidden text-slate-900 font-medium placeholder:text-slate-500"
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
                    className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:border-blue-600 focus:outline-hidden text-slate-800 placeholder:text-slate-500 shadow-2xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Currency</label>
                  <input
                    type="text"
                    placeholder="INR"
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:border-blue-600 focus:outline-hidden text-slate-800 placeholder:text-slate-500 font-medium shadow-2xs"
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
                  <span className="text-[10px] text-slate-500 font-medium mt-0.5 block">Billed every month</span>
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
                  <span className="text-[10px] text-slate-500 font-medium mt-0.5 block">Billed every 3 months</span>
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
                    className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:border-blue-600 focus:outline-hidden text-slate-800 placeholder:text-slate-500 font-medium shadow-2xs"
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
                  className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:border-blue-600 focus:outline-hidden text-slate-800 placeholder:text-slate-500 font-medium shadow-2xs"
                />
              </div>

              {/* Included Modules / Categorized Features Checklist */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <label className="block text-xs font-bold text-slate-900">Included Modules &amp; Role Permissions</label>
                    <span className="text-[11px] text-slate-500 font-medium">
                      Select operations, roles, and employee self-service capabilities for this package:
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (form.enabledFeatures.length === AVAILABLE_FEATURES.length) {
                        setForm((prev) => ({ ...prev, enabledFeatures: [] }));
                      } else {
                        setForm((prev) => ({
                          ...prev,
                          enabledFeatures: AVAILABLE_FEATURES.map((f) => f.key),
                        }));
                      }
                    }}
                    className="text-[11px] font-bold text-[#5E4BE2] hover:text-[#4a3ab8] hover:underline cursor-pointer transition-colors shrink-0 ml-2"
                  >
                    {form.enabledFeatures.length === AVAILABLE_FEATURES.length
                      ? 'Deselect All (Clear All)'
                      : `Select All (Unlock All ${AVAILABLE_FEATURES.length})`}
                  </button>
                </div>

                <div className="space-y-4 max-h-[380px] overflow-y-auto p-3.5 border border-slate-200 rounded-xl bg-slate-50/60 scrollbar-thin scrollbar-thumb-slate-300 mt-2">
                  {FEATURE_GROUPS.map((group) => {
                    const groupKeys = group.features.map((f) => f.key);
                    const selectedCount = groupKeys.filter((k) => form.enabledFeatures.includes(k)).length;
                    const isAllSelected = selectedCount === groupKeys.length;

                    const toggleGroup = () => {
                      if (isAllSelected) {
                        setForm((prev) => ({
                          ...prev,
                          enabledFeatures: prev.enabledFeatures.filter((k) => !groupKeys.includes(k)),
                        }));
                      } else {
                        setForm((prev) => ({
                          ...prev,
                          enabledFeatures: Array.from(new Set([...prev.enabledFeatures, ...groupKeys])),
                        }));
                      }
                    };

                    return (
                      <div key={group.id} className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs">
                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">{group.title}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${group.badgeColor}`}>
                              {selectedCount}/{group.features.length}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={toggleGroup}
                            className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                          >
                            {isAllSelected ? 'Deselect Section' : 'Select All in Section'}
                          </button>
                        </div>
                        <p className="text-[10.5px] text-slate-500 mb-2 leading-relaxed">
                          {group.description}
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                          {group.features.map((feat) => {
                            const isChecked = form.enabledFeatures.includes(feat.key);
                            return (
                              <label
                                key={feat.key}
                                className={`flex items-start gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                                  isChecked
                                    ? 'bg-indigo-50/80 border-indigo-200 text-indigo-950 font-semibold'
                                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleFeature(feat.key)}
                                  className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                />
                                <div className="leading-tight min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-semibold truncate">{feat.name}</span>
                                    {feat.tag && (
                                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-100 text-purple-700">
                                        {feat.tag}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-slate-500 font-normal mt-0.5 leading-snug line-clamp-2">
                                    {feat.description}
                                  </div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
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
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#5E4BE2] to-[#4B39C3] hover:from-[#5340D4] hover:to-[#4130B4] disabled:opacity-50 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer"
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
