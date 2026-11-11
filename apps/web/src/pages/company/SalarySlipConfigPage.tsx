import React, { useState, useEffect, useRef } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import {
  IconReceipt2,
  IconBuildingSkyscraper,
  IconCheck,
  IconAlertCircle,
  IconUpload,
  IconTrash,
  IconPrinter,
  IconDownload,
  IconRefresh,
  IconDeviceFloppy,
  IconInfoCircle,
  IconEye,
  IconMail,
  IconPhone,
  IconWorld,
  IconMapPin,
  IconUser,
  IconBriefcase,
  IconCalendar,
  IconCoin,
  IconShieldLock,
  IconFileCertificate,
} from '@tabler/icons-react';

interface EmployeeSample {
  id: number;
  employeeNumber?: string;
  firstName: string;
  lastName: string;
  email?: string;
  jobTitle?: string;
  joiningDate?: string | null;
  monthlySalary?: number | string;
  currency?: string;
  bankDetails?: any;
  department?: { id: number; name: string } | null;
}

interface PayslipConfig {
  companyName: string;
  companyAddress: string;
  contact: string;
  websiteOrEmail: string;
  logoUrl: string;
  autoReleasePayslip: boolean;
  branchWisePayslip: boolean;
  showLoanDetails: boolean;
  showAttendanceSummary: boolean;
  customNote: string;
}

const DEFAULT_CONFIG: PayslipConfig = {
  companyName: '',
  companyAddress: '',
  contact: '',
  websiteOrEmail: '',
  logoUrl: '',
  autoReleasePayslip: true,
  branchWisePayslip: false,
  showLoanDetails: false,
  showAttendanceSummary: true,
  customNote: 'This is a computer generated document and does not require an authorized signature.',
};

export const SalarySlipConfigPage: React.FC = () => {
  const { user, company } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [config, setConfig] = useState<PayslipConfig>(DEFAULT_CONFIG);
  const [initialConfig, setInitialConfig] = useState<PayslipConfig>(DEFAULT_CONFIG);
  const [employees, setEmployees] = useState<EmployeeSample[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('sample');

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Show Toast
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch Payslip Settings and sample staff
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/company/payslip-settings');
      if (res.data?.payslipConfig) {
        const fetched = {
          ...DEFAULT_CONFIG,
          ...res.data.payslipConfig,
          companyName: res.data.payslipConfig.companyName || company?.name || '',
        };
        setConfig(fetched);
        setInitialConfig(fetched);
      }
      if (res.data?.employees) {
        setEmployees(res.data.employees);
      }
    } catch (err: any) {
      console.error('Failed to load payslip settings:', err);
      // Fallback to company context
      const fallbackConfig: PayslipConfig = {
        ...DEFAULT_CONFIG,
        companyName: company?.name || 'Company Name',
        companyAddress: typeof company?.address === 'string' ? company?.address : '',
        logoUrl: company?.logo || '',
        websiteOrEmail: company?.website || '',
      };
      setConfig(fallbackConfig);
      setInitialConfig(fallbackConfig);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Logo Upload
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast('Logo image must be under 5MB', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('logo', file);

    setIsUploadingLogo(true);
    try {
      const res = await api.post('/company/payslip-logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data?.url) {
        setConfig((prev) => ({ ...prev, logoUrl: res.data.url }));
        showToast('Logo uploaded successfully! Preview updated.');
      }
    } catch (err: any) {
      console.error('Failed to upload logo:', err);
      showToast('Failed to upload logo. Please check file format.', 'error');
    } finally {
      setIsUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handle Save
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!config.companyName.trim()) {
      showToast('Company Name is required', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const res = await api.put('/company/payslip-settings', config);
      if (res.data?.success) {
        setInitialConfig(config);
        showToast('Salary slip configuration saved successfully!');
      }
    } catch (err: any) {
      console.error('Failed to save settings:', err);
      showToast('Failed to save settings. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Reset
  const handleReset = () => {
    setConfig(initialConfig);
    showToast('Reset back to last saved configuration');
  };

  // Active employee for preview
  const currentPreviewEmployee = React.useMemo(() => {
    if (selectedEmployeeId === 'sample' || !employees.length) {
      return {
        name: 'Rahul Sharma',
        code: 'EMP-001',
        designation: 'Senior Software Engineer',
        department: 'Engineering',
        doj: '15-06-2023',
        uan: '101234567890',
        workLocation: config.branchWisePayslip ? 'Hyderabad H.Q. Branch' : 'Hyderabad',
        bankName: 'HDFC Bank',
        bankAccount: '•••• •••• 4589',
        ifscCode: 'HDFC0001234',
        branchName: 'Kukatpally',
        pfNumber: 'TS/HYD/0045612/000/00001',
        esicNumber: '31000987650000001',
        basicSalary: 25000,
        hra: 12500,
        specialAllowance: 7500,
        bonus: 5000,
        grossEarnings: 50000,
        pf: 1800,
        pt: 200,
        tds: 1500,
        lop: 0,
        totalDeductions: 3500,
        netSalary: 46500,
      };
    }

    const emp = employees.find((e) => String(e.id) === selectedEmployeeId);
    if (!emp) return null;

    const baseSalary = Number(emp.monthlySalary) || 45000;
    const basic = Math.round(baseSalary * 0.5);
    const hra = Math.round(baseSalary * 0.25);
    const special = Math.round(baseSalary * 0.15);
    const bonus = Math.round(baseSalary * 0.1);
    const gross = basic + hra + special + bonus;

    const pf = Math.round(basic * 0.12);
    const pt = 200;
    const tds = Math.round(gross * 0.05);
    const deductions = pf + pt + tds;
    const net = gross - deductions;

    const bank = (emp.bankDetails as any) || {};

    return {
      name: `${emp.firstName} ${emp.lastName}`.trim(),
      code: emp.employeeNumber || `EMP-${String(emp.id).padStart(3, '0')}`,
      designation: emp.jobTitle || 'Team Member',
      department: emp.department?.name || 'General',
      doj: emp.joiningDate ? new Date(emp.joiningDate).toLocaleDateString('en-GB') : '01-01-2024',
      uan: bank.uanNumber || '100987654321',
      workLocation: config.branchWisePayslip ? 'Main Regional Branch' : 'Corporate HQ',
      bankName: bank.bankName || 'State Bank of India',
      bankAccount: bank.accountNumber ? `•••• •••• ${bank.accountNumber.slice(-4)}` : '•••• •••• 9812',
      ifscCode: bank.ifscCode || 'SBIN0001234',
      branchName: bank.branchName || 'Central Branch',
      pfNumber: bank.pfNumber || 'PF-EST-88765432',
      esicNumber: bank.esicNumber || 'ESIC-9988776655',
      basicSalary: basic,
      hra,
      specialAllowance: special,
      bonus,
      grossEarnings: gross,
      pf,
      pt,
      tds,
      lop: 0,
      totalDeductions: deductions,
      netSalary: net,
    };
  }, [selectedEmployeeId, employees, config.branchWisePayslip]);

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (amt: number) => {
    return amt.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className="min-h-screen bg-slate-50/60 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Scoped Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #payslip-paper-preview, #payslip-paper-preview * {
            visibility: visible;
          }
          #payslip-paper-preview {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            margin: 0 !important;
            padding: 20px !important;
            box-shadow: none !important;
            border: 1px solid #cbd5e1 !important;
          }
        }
      `}</style>

      {/* Floating Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl border text-xs font-bold transition-all duration-300 animate-in slide-in-from-bottom-5 ${
            toast.type === 'success'
              ? 'bg-emerald-900/90 text-emerald-100 border-emerald-700/80 backdrop-blur-md'
              : 'bg-rose-900/90 text-rose-100 border-rose-700/80 backdrop-blur-md'
          }`}
        >
          {toast.type === 'success' ? (
            <IconCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <IconAlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
            <span>HR Operations</span>
            <span>/</span>
            <span className="text-[#5E4BE2]">Salary Slip</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 text-[#5E4BE2] border border-indigo-100">
              <IconReceipt2 className="w-5 h-5" />
            </div>
            Salary Slip Configuration &amp; Template
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Customize company header details, branding, automated releases, and review real-time employee payslips.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-xs hover:border-slate-300 transition-all cursor-pointer"
            title="Print or export current preview"
          >
            <IconPrinter className="w-4 h-4 text-slate-500" />
            <span>Print Preview</span>
          </button>

          <button
            type="button"
            onClick={() => handleSave()}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#5E4BE2] hover:bg-[#4d3cc9] text-white text-xs font-bold shadow-sm hover:shadow-md transition-all disabled:opacity-50 cursor-pointer"
          >
            <IconDeviceFloppy className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Settings & Customization Form (5 Cols) */}
        <div className="lg:col-span-5 space-y-5">
          <form onSubmit={handleSave} className="space-y-5">
            {/* 1. Company Branding Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <IconBuildingSkyscraper className="w-4 h-4 text-[#5E4BE2]" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Company Header &amp; Branding
                  </h3>
                </div>
                <span className="text-[10px] font-bold text-slate-400">Step 1</span>
              </div>

              {/* Logo Upload Field */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Company Logo
                </label>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                    {config.logoUrl ? (
                      <img
                        src={config.logoUrl}
                        alt="Company Logo"
                        className="w-full h-full object-contain p-1"
                      />
                    ) : (
                      <IconBuildingSkyscraper className="w-6 h-6 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleLogoUpload}
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      className="hidden"
                      id="payslip-logo-input"
                    />
                    <div className="flex items-center gap-2">
                      <label
                        htmlFor="payslip-logo-input"
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer transition-colors ${
                          isUploadingLogo ? 'opacity-50 pointer-events-none' : ''
                        }`}
                      >
                        <IconUpload className="w-3.5 h-3.5 text-slate-500" />
                        <span>{isUploadingLogo ? 'Uploading...' : 'Choose File'}</span>
                      </label>
                      {config.logoUrl && (
                        <button
                          type="button"
                          onClick={() => setConfig((prev) => ({ ...prev, logoUrl: '' }))}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold cursor-pointer transition-colors"
                        >
                          <IconTrash className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      PNG, JPG, or SVG up to 5MB. Rendered in the top left corner of the slip.
                    </p>
                  </div>
                </div>
              </div>

              {/* Company Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={config.companyName}
                  onChange={(e) => setConfig((prev) => ({ ...prev, companyName: e.target.value }))}
                  placeholder="e.g. WhiteScholars EduFutures Academy Private Limited"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#5E4BE2]/20 focus:border-[#5E4BE2] transition-all"
                  required
                />
              </div>

              {/* Company Address */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Address <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={config.companyAddress}
                  onChange={(e) => setConfig((prev) => ({ ...prev, companyAddress: e.target.value }))}
                  placeholder="e.g. 5th Floor, Aero Hamd Building, Above HDFC Bank, Pillar no. 675A, Kukatpally, Hyderabad 500 072"
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#5E4BE2]/20 focus:border-[#5E4BE2] transition-all resize-none"
                  required
                />
              </div>

              {/* Contact */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Contact <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <IconPhone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={config.contact}
                    onChange={(e) => setConfig((prev) => ({ ...prev, contact: e.target.value }))}
                    placeholder="e.g. +91 98765 43210 / 040-2345678"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#5E4BE2]/20 focus:border-[#5E4BE2] transition-all"
                    required
                  />
                </div>
              </div>

              {/* Website / Email */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Website / Email
                </label>
                <div className="relative">
                  <IconWorld className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={config.websiteOrEmail}
                    onChange={(e) => setConfig((prev) => ({ ...prev, websiteOrEmail: e.target.value }))}
                    placeholder="e.g. info@whitescholars.com / www.whitescholars.com"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#5E4BE2]/20 focus:border-[#5E4BE2] transition-all"
                  />
                </div>
              </div>
            </div>

            {/* 2. Display Toggles Card (Matching User's Screenshot Exactly) */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <IconReceipt2 className="w-4 h-4 text-[#5E4BE2]" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Payslip Toggles &amp; Rules
                  </h3>
                </div>
                <span className="text-[10px] font-bold text-slate-400">Step 2</span>
              </div>

              {/* Toggle 1: Auto Release Payslip */}
              <div className="flex items-center justify-between py-1">
                <div>
                  <span className="text-xs font-bold text-slate-800">Auto Release Payslip</span>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Automatically publish and make slips visible to employees once finalized.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setConfig((prev) => ({ ...prev, autoReleasePayslip: !prev.autoReleasePayslip }))}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    config.autoReleasePayslip ? 'bg-[#5E4BE2]' : 'bg-slate-200'
                  }`}
                  role="switch"
                  aria-checked={config.autoReleasePayslip}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      config.autoReleasePayslip ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="h-px bg-slate-100" />

              {/* Toggle 2: Branch Wise Payslip */}
              <div className="flex items-center justify-between py-1">
                <div>
                  <span className="text-xs font-bold text-slate-800">Branch Wise Payslip</span>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Print specific branch office location and branch code on the payslip header.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setConfig((prev) => ({ ...prev, branchWisePayslip: !prev.branchWisePayslip }))}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    config.branchWisePayslip ? 'bg-[#5E4BE2]' : 'bg-slate-200'
                  }`}
                  role="switch"
                  aria-checked={config.branchWisePayslip}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      config.branchWisePayslip ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="h-px bg-slate-100" />

              {/* Toggle 3: Show Loan Details */}
              <div className="flex items-center justify-between py-1">
                <div>
                  <span className="text-xs font-bold text-slate-800">Show Loan Details</span>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Display active staff loans, monthly installment recovery, and balance.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setConfig((prev) => ({ ...prev, showLoanDetails: !prev.showLoanDetails }))}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    config.showLoanDetails ? 'bg-[#5E4BE2]' : 'bg-slate-200'
                  }`}
                  role="switch"
                  aria-checked={config.showLoanDetails}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      config.showLoanDetails ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="h-px bg-slate-100" />

              {/* Toggle 4: Show Attendance Breakdown */}
              <div className="flex items-center justify-between py-1">
                <div>
                  <span className="text-xs font-bold text-slate-800">Show Attendance Summary</span>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Display worked days, weekly offs, holidays, paid leaves, and unpaid LOP days.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setConfig((prev) => ({ ...prev, showAttendanceSummary: !prev.showAttendanceSummary }))}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    config.showAttendanceSummary ? 'bg-[#5E4BE2]' : 'bg-slate-200'
                  }`}
                  role="switch"
                  aria-checked={config.showAttendanceSummary}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      config.showAttendanceSummary ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* 3. Custom Disclaimer Note Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <IconFileCertificate className="w-4 h-4 text-[#5E4BE2]" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Footer Note / Disclaimer
                  </h3>
                </div>
                <span className="text-[10px] font-bold text-slate-400">Step 3</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Custom Legal Disclaimer / Note
                </label>
                <textarea
                  value={config.customNote}
                  onChange={(e) => setConfig((prev) => ({ ...prev, customNote: e.target.value }))}
                  placeholder="e.g. This is a computer generated payslip and does not require an authorized signature."
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#5E4BE2]/20 focus:border-[#5E4BE2] transition-all resize-none"
                />
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold transition-colors cursor-pointer"
              >
                <IconRefresh className="w-4 h-4 text-slate-400" />
                <span>Reset Changes</span>
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#5E4BE2] hover:bg-[#4d3cc9] text-white text-xs font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer"
              >
                <IconDeviceFloppy className="w-4 h-4" />
                <span>{isSaving ? 'Saving Changes...' : 'Save Configuration'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Live Interactive Payslip Preview (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Preview Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-bold text-slate-800">Live Payslip Preview</span>
              <span className="text-[10px] font-semibold text-slate-400 hidden sm:inline">
                (Matches printed document)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-[11px] font-bold text-slate-500">Preview Staff:</label>
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#5E4BE2]/20 cursor-pointer"
              >
                <option value="sample">Sample: Rahul Sharma</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={String(emp.id)}>
                    {emp.firstName} {emp.lastName} ({emp.jobTitle || 'Staff'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Payslip Paper Sheet (Styled to match the uploaded screenshot with exact layout) */}
          <div
            id="payslip-paper-preview"
            className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6 text-slate-900 font-sans transition-all"
          >
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-2">
              <div className="space-y-1.5 max-w-md">
                {config.logoUrl && (
                  <div className="mb-2">
                    <img
                      src={config.logoUrl}
                      alt="Company Logo"
                      className="h-10 max-w-[180px] object-contain"
                    />
                  </div>
                )}
                <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                  {config.companyName || 'Your Company Name'}
                </h2>
                {config.companyAddress && (
                  <p className="text-[11px] text-slate-500 leading-relaxed font-normal">
                    {config.companyAddress}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 font-normal pt-0.5">
                  {config.contact && (
                    <span className="flex items-center gap-1">
                      <IconPhone className="w-3 h-3 text-slate-400" />
                      {config.contact}
                    </span>
                  )}
                  {config.websiteOrEmail && (
                    <span className="flex items-center gap-1">
                      <IconMail className="w-3 h-3 text-slate-400" />
                      {config.websiteOrEmail}
                    </span>
                  )}
                </div>
              </div>

              <div className="sm:text-right shrink-0">
                <span className="text-xs font-bold text-slate-800">
                  Payslip from — November 2026
                </span>
                {config.branchWisePayslip && (
                  <span className="block text-[11px] font-medium text-[#5E4BE2] mt-0.5">
                    Branch: {currentPreviewEmployee?.workLocation || 'Main Branch'}
                  </span>
                )}
              </div>
            </div>

            <div className="h-px bg-slate-200" />

            {/* Employee Details Section */}
            <div>
              <h3 className="text-xs font-bold text-slate-900 mb-3 tracking-wide">
                Employee Details
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-xs">
                {/* Left Column */}
                <div className="space-y-1.5">
                  <div className="grid grid-cols-12">
                    <span className="col-span-5 text-slate-600 font-medium">Employee Name</span>
                    <span className="col-span-1 text-slate-400">:</span>
                    <span className="col-span-6 font-bold text-slate-900 truncate">
                      {currentPreviewEmployee?.name}
                    </span>
                  </div>
                  <div className="grid grid-cols-12">
                    <span className="col-span-5 text-slate-600 font-medium">Code</span>
                    <span className="col-span-1 text-slate-400">:</span>
                    <span className="col-span-6 font-medium text-slate-800">
                      {currentPreviewEmployee?.code}
                    </span>
                  </div>
                  <div className="grid grid-cols-12">
                    <span className="col-span-5 text-slate-600 font-medium">Designation</span>
                    <span className="col-span-1 text-slate-400">:</span>
                    <span className="col-span-6 font-medium text-slate-800">
                      {currentPreviewEmployee?.designation}
                    </span>
                  </div>
                  <div className="grid grid-cols-12">
                    <span className="col-span-5 text-slate-600 font-medium">Department</span>
                    <span className="col-span-1 text-slate-400">:</span>
                    <span className="col-span-6 font-medium text-slate-800">
                      {currentPreviewEmployee?.department}
                    </span>
                  </div>
                  <div className="grid grid-cols-12">
                    <span className="col-span-5 text-slate-600 font-medium">Date of Joining</span>
                    <span className="col-span-1 text-slate-400">:</span>
                    <span className="col-span-6 font-medium text-slate-800">
                      {currentPreviewEmployee?.doj}
                    </span>
                  </div>
                  <div className="grid grid-cols-12">
                    <span className="col-span-5 text-slate-600 font-medium">UAN Number</span>
                    <span className="col-span-1 text-slate-400">:</span>
                    <span className="col-span-6 font-medium text-slate-800 font-mono text-[11px]">
                      {currentPreviewEmployee?.uan}
                    </span>
                  </div>
                  <div className="grid grid-cols-12">
                    <span className="col-span-5 text-slate-600 font-medium">Work Location</span>
                    <span className="col-span-1 text-slate-400">:</span>
                    <span className="col-span-6 font-medium text-slate-800">
                      {currentPreviewEmployee?.workLocation}
                    </span>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-1.5">
                  <div className="grid grid-cols-12">
                    <span className="col-span-5 text-slate-600 font-medium">Bank Name</span>
                    <span className="col-span-1 text-slate-400">:</span>
                    <span className="col-span-6 font-medium text-slate-800">
                      {currentPreviewEmployee?.bankName}
                    </span>
                  </div>
                  <div className="grid grid-cols-12">
                    <span className="col-span-5 text-slate-600 font-medium">Bank A/C No.</span>
                    <span className="col-span-1 text-slate-400">:</span>
                    <span className="col-span-6 font-medium text-slate-800 font-mono text-[11px]">
                      {currentPreviewEmployee?.bankAccount}
                    </span>
                  </div>
                  <div className="grid grid-cols-12">
                    <span className="col-span-5 text-slate-600 font-medium">IFSC Code</span>
                    <span className="col-span-1 text-slate-400">:</span>
                    <span className="col-span-6 font-medium text-slate-800 font-mono text-[11px]">
                      {currentPreviewEmployee?.ifscCode}
                    </span>
                  </div>
                  <div className="grid grid-cols-12">
                    <span className="col-span-5 text-slate-600 font-medium">Branch Name</span>
                    <span className="col-span-1 text-slate-400">:</span>
                    <span className="col-span-6 font-medium text-slate-800">
                      {currentPreviewEmployee?.branchName}
                    </span>
                  </div>
                  <div className="grid grid-cols-12">
                    <span className="col-span-5 text-slate-600 font-medium">PF Number</span>
                    <span className="col-span-1 text-slate-400">:</span>
                    <span className="col-span-6 font-medium text-slate-800 font-mono text-[11px]">
                      {currentPreviewEmployee?.pfNumber}
                    </span>
                  </div>
                  <div className="grid grid-cols-12">
                    <span className="col-span-5 text-slate-600 font-medium">ESIC Number</span>
                    <span className="col-span-1 text-slate-400">:</span>
                    <span className="col-span-6 font-medium text-slate-800 font-mono text-[11px]">
                      {currentPreviewEmployee?.esicNumber}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Earnings & Deductions Table (Matching the Screenshot) */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200">
                {/* Earnings Side */}
                <div>
                  <div className="bg-slate-50/80 px-4 py-2 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-800">
                    <span className="w-1/2">Earnings</span>
                    <span className="w-1/4 text-right">Monthly Value (Rs.)</span>
                    <span className="w-1/4 text-right">Amount (Rs.)</span>
                  </div>
                  <div className="p-4 space-y-2 text-xs divide-y divide-slate-50">
                    <div className="flex items-center justify-between pt-1">
                      <span className="w-1/2 text-slate-600 font-medium">Basic Salary</span>
                      <span className="w-1/4 text-right font-mono text-slate-700">
                        {formatCurrency(currentPreviewEmployee?.basicSalary || 0)}
                      </span>
                      <span className="w-1/4 text-right font-mono text-slate-900 font-semibold">
                        {formatCurrency(currentPreviewEmployee?.basicSalary || 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="w-1/2 text-slate-600 font-medium">House Rent Allowance (HRA)</span>
                      <span className="w-1/4 text-right font-mono text-slate-700">
                        {formatCurrency(currentPreviewEmployee?.hra || 0)}
                      </span>
                      <span className="w-1/4 text-right font-mono text-slate-900 font-semibold">
                        {formatCurrency(currentPreviewEmployee?.hra || 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="w-1/2 text-slate-600 font-medium">Special Allowance</span>
                      <span className="w-1/4 text-right font-mono text-slate-700">
                        {formatCurrency(currentPreviewEmployee?.specialAllowance || 0)}
                      </span>
                      <span className="w-1/4 text-right font-mono text-slate-900 font-semibold">
                        {formatCurrency(currentPreviewEmployee?.specialAllowance || 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="w-1/2 text-slate-600 font-medium">Performance Bonus</span>
                      <span className="w-1/4 text-right font-mono text-slate-700">
                        {formatCurrency(currentPreviewEmployee?.bonus || 0)}
                      </span>
                      <span className="w-1/4 text-right font-mono text-slate-900 font-semibold">
                        {formatCurrency(currentPreviewEmployee?.bonus || 0)}
                      </span>
                    </div>
                  </div>
                  <div className="bg-slate-50/90 px-4 py-2.5 border-t border-slate-200 flex items-center justify-between text-xs font-bold text-slate-900">
                    <span className="w-1/2">Total Gross Earnings</span>
                    <span className="w-1/4 text-right font-mono">
                      {formatCurrency(currentPreviewEmployee?.grossEarnings || 0)}
                    </span>
                    <span className="w-1/4 text-right font-mono text-[#5E4BE2]">
                      {formatCurrency(currentPreviewEmployee?.grossEarnings || 0)}
                    </span>
                  </div>
                </div>

                {/* Deductions Side */}
                <div>
                  <div className="bg-slate-50/80 px-4 py-2 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-800">
                    <span className="w-2/3">Deductions</span>
                    <span className="w-1/3 text-right">Amount (Rs.)</span>
                  </div>
                  <div className="p-4 space-y-2 text-xs divide-y divide-slate-50">
                    <div className="flex items-center justify-between pt-1">
                      <span className="w-2/3 text-slate-600 font-medium">Provident Fund (PF)</span>
                      <span className="w-1/3 text-right font-mono text-slate-900 font-semibold">
                        {formatCurrency(currentPreviewEmployee?.pf || 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="w-2/3 text-slate-600 font-medium">Professional Tax (PT)</span>
                      <span className="w-1/3 text-right font-mono text-slate-900 font-semibold">
                        {formatCurrency(currentPreviewEmployee?.pt || 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="w-2/3 text-slate-600 font-medium">Income Tax (TDS)</span>
                      <span className="w-1/3 text-right font-mono text-slate-900 font-semibold">
                        {formatCurrency(currentPreviewEmployee?.tds || 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="w-2/3 text-slate-600 font-medium">Loss of Pay (LOP)</span>
                      <span className="w-1/3 text-right font-mono text-slate-900 font-semibold">
                        {formatCurrency(currentPreviewEmployee?.lop || 0)}
                      </span>
                    </div>
                  </div>
                  <div className="bg-slate-50/90 px-4 py-2.5 border-t border-slate-200 flex items-center justify-between text-xs font-bold text-slate-900">
                    <span className="w-2/3">Total Deductions</span>
                    <span className="w-1/3 text-right font-mono text-rose-600">
                      {formatCurrency(currentPreviewEmployee?.totalDeductions || 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Net Pay Highlight Bar */}
              <div className="bg-indigo-50/40 border-t border-slate-200 px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-800">
                  Net Salary Payable (Take-Home):
                </span>
                <span className="text-base font-extrabold text-[#5E4BE2] font-mono">
                  ₹{formatCurrency(currentPreviewEmployee?.netSalary || 0)}
                </span>
              </div>
            </div>

            {/* Attendance Summary Box (Exact match to bottom box in user's image) */}
            {config.showAttendanceSummary && (
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center text-xs">
                  {/* Total Payable Days */}
                  <div className="md:col-span-4 flex items-center justify-center md:justify-start border-b md:border-b-0 md:border-r border-slate-200 pb-2 md:pb-0 md:pr-4">
                    <div className="text-center md:text-left">
                      <span className="text-xs font-bold text-slate-800 block">
                        Total Payable Days
                      </span>
                      <span className="text-lg font-extrabold text-slate-900 font-mono">
                        26 Days
                      </span>
                    </div>
                  </div>

                  {/* Middle Column */}
                  <div className="md:col-span-4 space-y-1 text-slate-700 font-medium border-b md:border-b-0 md:border-r border-slate-200 pb-2 md:pb-0 md:pr-4">
                    <div className="flex items-center justify-between">
                      <span>Worked Day</span>
                      <span className="font-mono font-bold text-slate-900">: 22</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Holiday</span>
                      <span className="font-mono font-bold text-slate-900">: 02</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Paid Leaves</span>
                      <span className="font-mono font-bold text-slate-900">: 02</span>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="md:col-span-4 space-y-1 text-slate-700 font-medium">
                    <div className="flex items-center justify-between">
                      <span>Weekly Off</span>
                      <span className="font-mono font-bold text-slate-900">: 04</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Unpaid Days</span>
                      <span className="font-mono font-bold text-slate-900">: 00</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Loan Details Box (Rendered conditionally when Show Loan Details is ON) */}
            {config.showLoanDetails && (
              <div className="border border-indigo-100 rounded-xl p-4 bg-indigo-50/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <IconCoin className="w-4 h-4 text-[#5E4BE2]" />
                    Company Loan &amp; Advance Recovery
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-[#5E4BE2]">
                    Active Balance
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Total Loan Amount</span>
                    <span className="font-mono font-bold text-slate-800">₹25,000.00</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Monthly Installment</span>
                    <span className="font-mono font-bold text-slate-800">₹2,500.00</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Remaining Balance</span>
                    <span className="font-mono font-bold text-[#5E4BE2]">₹15,000.00</span>
                  </div>
                </div>
              </div>
            )}

            {/* Footer Disclaimer */}
            {config.customNote && (
              <div className="text-center pt-2">
                <p className="text-[10px] text-slate-400 italic">
                  {config.customNote}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalarySlipConfigPage;
