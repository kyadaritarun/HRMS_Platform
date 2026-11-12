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
  IconEye,
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

      {/* Top Banner (Hero Banner matching other company pages) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <IconReceipt2 className="w-5 h-5 text-indigo-600 shrink-0" />
            <span>Salary Slip</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Configure company branding, automated releases, and live payslip template preview.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs hover:border-slate-300 transition-colors cursor-pointer"
            title="Print or export current preview"
          >
            <IconPrinter className="w-4 h-4 text-slate-500" />
            <span>Print Preview</span>
          </button>

          <button
            type="button"
            onClick={() => handleSave()}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#5E4BE2] hover:bg-[#4D3BC9] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <IconDeviceFloppy className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Column: Settings Form */}
        <div className="xl:col-span-4 space-y-4">
          <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <IconBuildingSkyscraper className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Payslip Settings</h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Company branding &amp; release configuration
                </p>
              </div>
            </div>

            {/* Logo */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Logo</label>
              <div className="flex items-center gap-2">
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium cursor-pointer shadow-2xs transition-colors">
                  <IconUpload className="w-3.5 h-3.5 text-slate-500" />
                  <span>{isUploadingLogo ? 'Uploading...' : 'Choose File'}</span>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleLogoUpload}
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    className="hidden"
                  />
                </label>
                <span className="text-xs text-slate-500 truncate max-w-[150px]">
                  {config.logoUrl ? 'Logo uploaded' : 'No file chosen'}
                </span>
                {config.logoUrl && (
                  <button
                    type="button"
                    onClick={() => setConfig((prev) => ({ ...prev, logoUrl: '' }))}
                    className="text-xs text-rose-600 hover:text-rose-700 font-semibold cursor-pointer ml-auto"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={config.companyName || ''}
                onChange={(e) => setConfig((prev) => ({ ...prev, companyName: e.target.value }))}
                placeholder="Company Name"
                className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500 text-slate-800 placeholder-slate-400 font-medium shadow-2xs"
                required
              />
            </div>

            {/* Address */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Address <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={config.companyAddress || ''}
                onChange={(e) => setConfig((prev) => ({ ...prev, companyAddress: e.target.value }))}
                placeholder="Company Address"
                rows={3}
                className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500 text-slate-800 placeholder-slate-400 font-medium shadow-2xs resize-none"
                required
              />
            </div>

            {/* Contact */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Contact <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={config.contact || ''}
                onChange={(e) => setConfig((prev) => ({ ...prev, contact: e.target.value }))}
                placeholder="Contact Number / Desk"
                className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500 text-slate-800 placeholder-slate-400 font-medium shadow-2xs"
                required
              />
            </div>

            {/* Website / Email */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Website / Email
              </label>
              <input
                type="text"
                value={config.websiteOrEmail || ''}
                onChange={(e) => setConfig((prev) => ({ ...prev, websiteOrEmail: e.target.value }))}
                placeholder="e.g. info@company.com / www.company.com"
                className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500 text-slate-800 placeholder-slate-400 font-medium shadow-2xs"
              />
            </div>

            <div className="h-px bg-slate-100" />

            {/* Auto Release Payslip */}
            <div className="flex items-center justify-between py-1">
              <div>
                <span className="text-xs font-semibold text-slate-800 block">Auto Release Payslip</span>
                <p className="text-[11px] text-slate-500 font-normal">
                  Automatically publish slips to staff once finalized.
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

            {/* Show Attendance Summary */}
            <div className="flex items-center justify-between py-1">
              <div>
                <span className="text-xs font-semibold text-slate-800 block">Show Attendance Summary</span>
                <p className="text-[11px] text-slate-500 font-normal">
                  Display worked days, weekly offs, and leave breakdown.
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

            <div className="h-px bg-slate-100" />

            {/* Custom Disclaimer Note */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Footer Disclaimer Note
              </label>
              <textarea
                value={config.customNote || ''}
                onChange={(e) => setConfig((prev) => ({ ...prev, customNote: e.target.value }))}
                placeholder="e.g. This is a computer generated document and does not require an authorized signature."
                rows={2}
                className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500 text-slate-800 placeholder-slate-400 font-medium shadow-2xs resize-none"
              />
            </div>

            {/* Form Footer Action Buttons */}
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              >
                <IconRefresh className="w-3.5 h-3.5 text-slate-400" />
                <span>Reset</span>
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#5E4BE2] hover:bg-[#4D3BC9] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <IconDeviceFloppy className="w-4 h-4" />
                <span>{isSaving ? 'Saving...' : 'Save Configuration'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Live Interactive Payslip Preview */}
        <div className="xl:col-span-8 space-y-3">
          {/* Header Toolbar */}
          <div className="flex items-center justify-between px-1 print:hidden flex-wrap gap-2">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <IconEye className="w-4 h-4 text-indigo-600" />
              <span>Live Payslip Template</span>
            </span>

            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-500">Preview with:</label>
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-hidden focus:border-indigo-500 cursor-pointer shadow-2xs"
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

          {/* Paper Container */}
          <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 sm:p-6 overflow-x-auto shadow-2xs flex justify-center">
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
