import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  IconRefresh,
  IconDeviceFloppy,
  IconPhone,
  IconWorld,
  IconFileCertificate,
} from '@tabler/icons-react';
import { PayslipSheet, PayslipCustomConfig } from '../../components/pdf/PayslipSheet';
import { PayslipData } from '../../components/pdf/PayslipPdfDrawer';

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

const DEFAULT_CONFIG: PayslipCustomConfig = {
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
  const { company } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [config, setConfig] = useState<PayslipCustomConfig>(DEFAULT_CONFIG);
  const [initialConfig, setInitialConfig] = useState<PayslipCustomConfig>(DEFAULT_CONFIG);
  const [employees, setEmployees] = useState<EmployeeSample[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('sample');

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

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
      const fallbackConfig: PayslipCustomConfig = {
        ...DEFAULT_CONFIG,
        companyName: company?.name || 'Company Name',
        companyAddress: typeof company?.address === 'string' ? company?.address : '',
        logoUrl: company?.logo || '',
        websiteOrEmail: (company as any)?.website || '',
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
    if (!config.companyName?.trim()) {
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

  const handleReset = () => {
    setConfig(initialConfig);
    showToast('Reset back to last saved configuration');
  };

  // Construct active preview data conforming strictly to project PayslipData
  const previewPayslipData: PayslipData = useMemo(() => {
    if (selectedEmployeeId === 'sample' || !employees.length) {
      return {
        month: 11,
        year: 2026,
        status: 'PUBLISHED',
        employee: {
          id: 1,
          employeeNumber: 'EMP-001',
          firstName: 'Rahul',
          lastName: 'Sharma',
          jobTitle: 'Senior Software Engineer',
          department: 'Engineering',
          bankName: 'HDFC Bank',
          bankAccountMasked: '•••• •••• 4589',
          uanNumber: '101234567890',
          pfNumber: 'TS/HYD/0045612/000/00001',
          dateOfJoining: '2023-06-15',
        },
        calculation: {
          baseSalary: 50000,
          basicSalary: 25000,
          hra: 12500,
          specialAllowance: 7500,
          bonus: 5000,
          grossSalary: 50000,
          grossEarnings: 50000,
          pf: 1800,
          pt: 200,
          tds: 1500,
          lopDeduction: 0,
          totalDeductions: 3500,
          netSalary: 46500,
          workingDaysCount: 26,
          presentDays: 22,
          paidLeaveDays: 2,
          totalLopDays: 0,
          paymentMode: 'Bank Transfer',
          currency: 'INR',
          remarks: config.customNote || 'Monthly verified computerized payroll statement.',
        },
      };
    }

    const emp = employees.find((e) => String(e.id) === selectedEmployeeId);
    const baseSalary = Number(emp?.monthlySalary) || 45000;
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
    const bank = (emp?.bankDetails as any) || {};

    return {
      month: 11,
      year: 2026,
      status: 'PUBLISHED',
      employee: {
        id: emp?.id,
        employeeNumber: emp?.employeeNumber || `EMP-${String(emp?.id).padStart(3, '0')}`,
        firstName: emp?.firstName || 'Employee',
        lastName: emp?.lastName || '',
        jobTitle: emp?.jobTitle || 'Staff',
        department: emp?.department?.name || 'General',
        bankName: bank.bankName || 'State Bank of India',
        bankAccountMasked: bank.accountNumber ? `•••• •••• ${bank.accountNumber.slice(-4)}` : '•••• •••• 9812',
        uanNumber: bank.uanNumber || '100987654321',
        pfNumber: bank.pfNumber || 'PF-EST-88765432',
        dateOfJoining: emp?.joiningDate ? String(emp.joiningDate) : '2024-01-01',
      },
      calculation: {
        baseSalary,
        basicSalary: basic,
        hra,
        specialAllowance: special,
        bonus,
        grossSalary: gross,
        grossEarnings: gross,
        pf,
        pt,
        tds,
        lopDeduction: 0,
        totalDeductions: deductions,
        netSalary: net,
        workingDaysCount: 26,
        presentDays: 22,
        paidLeaveDays: 2,
        totalLopDays: 0,
        paymentMode: 'Bank Transfer',
        currency: emp?.currency || 'INR',
        remarks: config.customNote || 'Monthly verified computerized payroll statement.',
      },
    };
  }, [selectedEmployeeId, employees, config.customNote]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50/60 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Scoped Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-payslip-sheet, #printable-payslip-sheet * {
            visibility: visible;
          }
          #printable-payslip-sheet {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            margin: 0 !important;
            padding: 20px !important;
            box-shadow: none !important;
            border: 1px solid #1e293b !important;
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
            Customize company header details, branding, automated releases, and review real-time employee payslips in the project's official format.
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
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Column: Settings & Customization Form (4 Cols on xl) */}
        <div className="xl:col-span-4 space-y-5">
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
                      PNG, JPG, or SVG up to 5MB. Rendered directly on the company header.
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
                  value={config.companyName || ''}
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
                  value={config.companyAddress || ''}
                  onChange={(e) => setConfig((prev) => ({ ...prev, companyAddress: e.target.value }))}
                  placeholder="e.g. 5th Floor, Aero Hamd Building, Above HDFC Bank, Kukatpally, Hyderabad 500 072"
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
                    value={config.contact || ''}
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
                    value={config.websiteOrEmail || ''}
                    onChange={(e) => setConfig((prev) => ({ ...prev, websiteOrEmail: e.target.value }))}
                    placeholder="e.g. info@whitescholars.com / www.whitescholars.com"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#5E4BE2]/20 focus:border-[#5E4BE2] transition-all"
                  />
                </div>
              </div>
            </div>

            {/* 2. Display Toggles Card */}
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
                    Print employee branch location and branch office details on the employee grid.
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
                  value={config.customNote || ''}
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

        {/* Right Column: Live Interactive Payslip Preview (8 Cols on xl) */}
        <div className="xl:col-span-8 space-y-4">
          {/* Preview Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-bold text-slate-800">Official Project Payslip Preview</span>
              <span className="text-[10px] font-semibold text-slate-400 hidden sm:inline">
                (100% matched with in-app view &amp; PDF)
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

          {/* Official Project Payslip Document Sheet */}
          <div className="flex justify-center bg-slate-200/60 p-4 sm:p-6 rounded-2xl border border-slate-300/80 overflow-x-auto shadow-inner">
            <PayslipSheet
              payslip={previewPayslipData}
              company={company}
              customConfig={config}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalarySlipConfigPage;
