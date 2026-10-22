import React, { useState, useEffect, useMemo } from 'react';
import api from '../../api/client';
import TablePagination from '../../components/common/TablePagination';
import { useAuth } from '../../context/AuthContext';
import {
  IconCalendar,
  IconUser,
  IconClock,
  IconCash,
  IconCheck,
  IconAlertCircle,
  IconDownload,
  IconSearch,
  IconX,
  IconPrinter,
  IconBuilding,
  IconPlayerPlay,
  IconCalendarEvent,
  IconSparkles,
  IconFileText,
  IconRefresh,
  IconReceipt2,
  IconAdjustmentsHorizontal,
  IconDeviceFloppy,
  IconPlus,
  IconTrash,
} from '@tabler/icons-react';

interface CustomComponentItem {
  id: string;
  name: string;
  type: 'EARNING' | 'DEDUCTION';
  amount: string;
}

interface CalculationDetails {
  baseSalary?: number;
  basicSalary?: number;
  hra?: number;
  specialAllowance?: number;
  grossSalary?: number;
  grossEarnings?: number;
  pf?: number;
  pt?: number;
  tds?: number;
  workingDaysCount?: number;
  totalCalendarDays?: number;
  presentDays?: number;
  paidLeaveDays?: number;
  unpaidLeaveDays?: number;
  absentDays?: number;
  totalLopDays?: number;
  perDayRate?: number;
  leaveDeduction?: number;
  lopDeduction?: number;
  overtimeHours?: number;
  overtimePay?: number;
  bonus?: number;
  otherDeductions?: number;
  customComponents?: { id?: string; name: string; type: 'EARNING' | 'DEDUCTION'; amount: number }[];
  totalDeductions?: number;
  netSalary?: number;
  currency?: string;
  paymentMode?: string;
  bankName?: string;
  accountNumberMasked?: string;
  remarks?: string;
}

interface AttendanceSalaryEmployee {
  employee: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    jobTitle: string;
    department: string;
  };
  payslipId: number | null;
  status: 'DRAFT' | 'PUBLISHED';
  publishedAt: string | null;
  calculation: CalculationDetails;
}

export const AttendanceSalaryPage: React.FC = () => {
  const { company } = useAuth();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [employees, setEmployees] = useState<AttendanceSalaryEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, month, year]);

  const [selectedEmp, setSelectedEmp] = useState<AttendanceSalaryEmployee | null>(null);
  const [activeTab, setActiveTab] = useState<'statement' | 'adjust'>('statement');
  const [adjustForm, setAdjustForm] = useState<{
    basicSalary: string;
    hra: string;
    specialAllowance: string;
    bonus: string;
    pf: string;
    pt: string;
    tds: string;
    otherDeductions: string;
    customComponents: CustomComponentItem[];
    remarks: string;
  }>({
    basicSalary: '',
    hra: '',
    specialAllowance: '',
    bonus: '',
    pf: '',
    pt: '',
    tds: '',
    otherDeductions: '',
    customComponents: [],
    remarks: '',
  });
  const [isSavingAdjustments, setIsSavingAdjustments] = useState(false);
  const [adjustmentError, setAdjustmentError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [generatingEmpId, setGeneratingEmpId] = useState<number | null>(null);
  const [downloadingPayslipId, setDownloadingPayslipId] = useState<number | null>(null);

  const fetchAttendanceSalary = async (): Promise<AttendanceSalaryEmployee[]> => {
    setIsLoading(true);
    try {
      const res = await api.get('/payroll/dashboard', { params: { month, year } });
      const rawList: AttendanceSalaryEmployee[] = res.data?.employees || [];
      setEmployees(rawList);
      return rawList;
    } catch (err) {
      console.error('Failed to load attendance & salary calculation:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenEmpModal = (emp: AttendanceSalaryEmployee) => {
    setSelectedEmp(emp);
    setActiveTab('statement');
    setAdjustmentError(null);
    const c = emp.calculation || {};
    const base = c.baseSalary || 0;

    const savedCustom: any[] = c.customComponents || [];
    const customList: CustomComponentItem[] = savedCustom.map((item, idx) => ({
      id: item.id || `custom-${idx}-${Date.now()}`,
      name: item.name || '',
      type: item.type || 'EARNING',
      amount: String(item.amount || 0),
    }));

    const customEarn = customList
      .filter((item) => item.type === 'EARNING')
      .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

    setAdjustForm({
      basicSalary: String(c.basicSalary !== undefined ? c.basicSalary : Math.round(base * 0.5)),
      hra: String(c.hra !== undefined ? c.hra : Math.round(base * 0.2)),
      specialAllowance: String(
        c.specialAllowance !== undefined
          ? c.specialAllowance
          : Math.max(0, base - Math.round(base * 0.5) - Math.round(base * 0.2) - customEarn)
      ),
      bonus: String(c.bonus || 0),
      pf: String(c.pf || 0),
      pt: String(c.pt !== undefined ? c.pt : 200),
      tds: String(c.tds || 0),
      otherDeductions: String(c.otherDeductions || 0),
      customComponents: customList,
      remarks: c.remarks || '',
    });
  };

  const handleAddCustomComponent = () => {
    setAdjustForm((prev) => ({
      ...prev,
      customComponents: [
        ...prev.customComponents,
        {
          id: `custom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: '',
          type: 'EARNING',
          amount: '0',
        },
      ],
    }));
  };

  const handleUpdateCustomComponent = (id: string, field: 'name' | 'type' | 'amount', value: string) => {
    setAdjustForm((prev) => ({
      ...prev,
      customComponents: prev.customComponents.map((c) =>
        c.id === id ? { ...c, [field]: value } : c
      ),
    }));
  };

  const handleRemoveCustomComponent = (id: string) => {
    setAdjustForm((prev) => ({
      ...prev,
      customComponents: prev.customComponents.filter((c) => c.id !== id),
    }));
  };

  const handleAutoSplitMonthly = () => {
    if (!selectedEmp) return;
    const base = selectedEmp.calculation.baseSalary || 0;
    const basic = Math.round(base * 0.5);
    const hra = Math.round(base * 0.2);
    const customEarn = adjustForm.customComponents
      .filter((c) => c.type === 'EARNING')
      .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
    const special = Math.max(0, base - basic - hra - customEarn);
    const pt = 200;
    const pf = Math.min(1800, Math.round(basic * 0.12));
    setAdjustForm((prev) => ({
      ...prev,
      basicSalary: String(basic),
      hra: String(hra),
      specialAllowance: String(special),
      pf: String(pf),
      pt: String(pt),
    }));
  };

  const handleSaveAdjustments = async () => {
    if (!selectedEmp) return;
    setIsSavingAdjustments(true);
    setAdjustmentError(null);
    try {
      await api.put('/payroll/adjustments', {
        employeeId: selectedEmp.employee.id,
        month,
        year,
        basicSalary: Number(adjustForm.basicSalary) || 0,
        hra: Number(adjustForm.hra) || 0,
        specialAllowance: Number(adjustForm.specialAllowance) || 0,
        bonus: Number(adjustForm.bonus) || 0,
        pf: Number(adjustForm.pf) || 0,
        pt: Number(adjustForm.pt) || 0,
        tds: Number(adjustForm.tds) || 0,
        otherDeductions: Number(adjustForm.otherDeductions) || 0,
        customComponents: adjustForm.customComponents
          .filter((c) => c.name.trim())
          .map((c) => ({
            id: c.id,
            name: c.name.trim(),
            type: c.type,
            amount: Number(c.amount) || 0,
          })),
        remarks: adjustForm.remarks,
        force: true,
      });

      // If already published, automatically regenerate & publish with force=true so payslips & PDFs update immediately
      if (selectedEmp.status === 'PUBLISHED') {
        await api.post('/payroll/publish', {
          month,
          year,
          employeeIds: [selectedEmp.employee.id],
          force: true,
        });
        setMessage(
          `Updated adjustments & regenerated payslip for ${selectedEmp.employee.firstName} ${selectedEmp.employee.lastName}!`
        );
      } else {
        setMessage(
          `Saved salary components for ${selectedEmp.employee.firstName} ${selectedEmp.employee.lastName}!`
        );
      }
      setActiveTab('statement');

      // Refresh dashboard
      const rawList = await fetchAttendanceSalary();
      const updated = rawList.find((e) => e.employee.id === selectedEmp.employee.id);
      if (updated) {
        setSelectedEmp(updated);
      }
    } catch (err: any) {
      setAdjustmentError(err.response?.data?.error || 'Failed to save salary adjustments');
    } finally {
      setIsSavingAdjustments(false);
    }
  };

  useEffect(() => {
    fetchAttendanceSalary();
  }, [month, year]);

  // Generate & Publish / Regenerate Payslips for ALL Employees
  const handleGenerateAllPayslips = async () => {
    const hasPublished = employees.some((e) => e.status === 'PUBLISHED');
    const promptText = hasPublished
      ? `Recalculate & regenerate monthly payslips for all ${employees.length} employees for ${month}/${year}? Any recent attendance, leave or salary component updates will immediately update on their payslips.`
      : `Generate and publish monthly payslips for all ${employees.length} employees for ${month}/${year}? Employees will be notified.`;

    if (!window.confirm(promptText)) {
      return;
    }
    setIsPublishing(true);
    setMessage(null);
    try {
      const empIds = employees.map((e) => e.employee.id);
      const res = await api.post('/payroll/publish', {
        month,
        year,
        employeeIds: empIds,
        force: true,
      });
      setMessage(`Successfully generated/updated monthly payslips for ${res.data?.count || employees.length} employees!`);
      await fetchAttendanceSalary();
    } catch (err: any) {
      setMessage(`Error generating/regenerating payslips: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsPublishing(false);
    }
  };

  // Generate & Publish / Regenerate Payslip for a Single Employee
  const handleGenerateSinglePayslip = async (empId: number, empName: string) => {
    setGeneratingEmpId(empId);
    setMessage(null);
    try {
      const res = await api.post('/payroll/publish', {
        month,
        year,
        employeeIds: [empId],
        force: true,
      });
      setMessage(`Successfully regenerated payslip for ${empName}! All latest attendance and salary updates are now live.`);
      const rawList = await fetchAttendanceSalary();
      if (selectedEmp && selectedEmp.employee.id === empId) {
        const publishedSlip = res.data?.payslips?.[0];
        const refreshed = rawList.find((e) => e.employee.id === empId);
        if (refreshed) {
          setSelectedEmp(refreshed);
        } else {
          setSelectedEmp((prev) =>
            prev
              ? {
                  ...prev,
                  status: 'PUBLISHED',
                  payslipId: publishedSlip ? publishedSlip.id : prev.payslipId,
                }
              : null
          );
        }
      }
    } catch (err: any) {
      setMessage(`Error generating/regenerating payslip: ${err.response?.data?.error || err.message}`);
    } finally {
      setGeneratingEmpId(null);
    }
  };

  // Download PDF Payslip
  const handleDownloadPdf = async (payslipId: number, empName?: string) => {
    setDownloadingPayslipId(payslipId);
    try {
      const res = await api.get(`/payroll/payslips/${payslipId}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      const safeName = empName ? `${empName.replace(/\s+/g, '_')}_` : '';
      link.setAttribute('download', `Payslip_${safeName}${month}_${year}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Failed to download payslip:', err);
      setMessage('Unable to download payslip PDF.');
    } finally {
      setDownloadingPayslipId(null);
    }
  };

  // CSV Export Generator
  const handleExportCsv = () => {
    const headers = [
      'Employee Name',
      'Department',
      'Job Title',
      'Workable Days',
      'Present Days',
      'Paid Leaves Used',
      'Unpaid Leaves (LOP)',
      'Overtime Hours',
      'Overtime Pay (INR)',
      'Monthly Base Salary',
      'Per-Day Rate',
      'LOP Deduction',
      'Net Salary Payable',
      'Status',
    ];

    const rows = employees.map((item) => {
      const calc = item.calculation || {};
      return [
        `"${item.employee.firstName} ${item.employee.lastName}"`,
        `"${item.employee.department}"`,
        `"${item.employee.jobTitle}"`,
        calc.workingDaysCount || 22,
        calc.presentDays || 0,
        calc.paidLeaveDays || 0,
        calc.totalLopDays || 0,
        calc.overtimeHours || 0,
        calc.overtimePay || 0,
        calc.baseSalary || 0,
        calc.perDayRate || 0,
        calc.leaveDeduction || calc.lopDeduction || 0,
        calc.netSalary || 0,
        item.status,
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Monthly_Attendance_Salary_${month}_${year}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  const filteredEmployees = employees.filter((item) => {
    return `${item.employee.firstName} ${item.employee.lastName} ${item.employee.department} ${item.employee.jobTitle}`
      .toLowerCase()
      .includes(search.toLowerCase());
  });

  const paginatedEmployees = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredEmployees.slice(start, start + pageSize);
  }, [filteredEmployees, currentPage, pageSize]);

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <IconClock className="w-5 h-5 text-indigo-600 shrink-0" />
            <span>Attendance & Salary</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time payroll computed from attendance, approved leaves, LOP, and overtime.
          </p>
        </div>

        {/* Actions: Month, Year, Export, Publish in a single non-wrapping row */}
        <div className="flex items-center gap-1.5 flex-nowrap overflow-x-auto pb-1 sm:pb-0 shrink-0">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="px-2.5 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-xl text-slate-700 shadow-2xs hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shrink-0"
          >
            {[
              'January', 'February', 'March', 'April', 'May', 'June',
              'July', 'August', 'September', 'October', 'November', 'December'
            ].map((m, idx) => (
              <option key={idx + 1} value={idx + 1}>{m}</option>
            ))}
          </select>

          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="px-2 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-xl text-slate-700 shadow-2xs hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shrink-0"
          >
            {[2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          <button
            onClick={handleExportCsv}
            title="Export CSV"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold shadow-2xs transition-colors shrink-0"
          >
            <IconDownload className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="hidden sm:inline">Export </span>
            <span>CSV</span>
          </button>

          <button
            onClick={handleGenerateAllPayslips}
            disabled={isPublishing || employees.length === 0}
            title="Generate or recalculate & regenerate monthly payslips for all staff"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all active:scale-95 disabled:opacity-50 shrink-0"
          >
            {employees.some((e) => e.status === 'PUBLISHED') ? (
              <IconRefresh className={`w-3.5 h-3.5 shrink-0 ${isPublishing ? 'animate-spin' : ''}`} />
            ) : (
              <IconPlayerPlay className="w-3.5 h-3.5 shrink-0" />
            )}
            <span className="hidden sm:inline">
              {isPublishing
                ? 'Processing Payslips...'
                : employees.some((e) => e.status === 'PUBLISHED')
                ? 'Regenerate All Payslips'
                : 'Generate Payslips'}
            </span>
            <span className="sm:hidden">
              {isPublishing
                ? 'Processing...'
                : employees.some((e) => e.status === 'PUBLISHED')
                ? 'Regenerate All'
                : 'Generate'}
            </span>
          </button>
        </div>
      </div>

      {message && (
        <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <IconCheck className="w-4 h-4 text-indigo-600 shrink-0" />
          {message}
        </div>
      )}

      {/* Main Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Filter Bar */}
        <div className="p-3 sm:p-4 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="relative w-full sm:w-72">
            <IconSearch className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search staff, department, title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div className="text-[11px] font-medium text-slate-400 sm:text-right">
            {filteredEmployees.length} employee{filteredEmployees.length === 1 ? '' : 's'} on record
          </div>
        </div>

        {/* Detailed Attendance & Salary Matrix */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 whitespace-nowrap">
            <thead className="bg-[#e5e7eb] text-xs font-bold text-slate-900 border-b border-slate-300">
              <tr>
                <th className="px-5 py-3.5">Employee</th>
                <th className="px-4 py-3.5 text-center">Workable</th>
                <th className="px-4 py-3.5 text-center">Present</th>
                <th className="px-4 py-3.5 text-center">Paid Leaves</th>
                <th className="px-4 py-3.5 text-center">Unpaid (LOP)</th>
                <th className="px-4 py-3.5 text-center">Overtime</th>
                <th className="px-5 py-3.5">Base Monthly</th>
                <th className="px-5 py-3.5">LOP Deduction</th>
                <th className="px-5 py-3.5">Net Salary Payable</th>
                <th className="px-4 py-3.5 text-center">Status</th>
                <th className="px-5 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={11} className="px-5 py-4">
                      <div className="h-4 bg-slate-200 rounded-sm w-full" />
                    </td>
                  </tr>
                ))
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-5 py-12 text-center text-slate-400">
                    <IconClock className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    No employees found matching the filter for this month.
                  </td>
                </tr>
              ) : (
                paginatedEmployees.map((item) => {
                  const c = item.calculation || {};
                  const workable = c.workingDaysCount || 22;
                  const present = c.presentDays || 0;
                  const paid = c.paidLeaveDays || 0;
                  const lop = c.totalLopDays || 0;
                  const otHours = c.overtimeHours || 0;
                  const otPay = c.overtimePay || 0;
                  const base = c.baseSalary || 0;
                  const lopDeduction = c.leaveDeduction || c.lopDeduction || 0;
                  const netSalary = c.netSalary || 0;

                  return (
                    <tr key={item.employee.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3.5">
                        <div
                          onClick={() => handleOpenEmpModal(item)}
                          className="font-bold text-slate-900 hover:text-indigo-600 cursor-pointer transition-colors"
                          title="Click to view statement & adjust salary components"
                        >
                          {item.employee.firstName} {item.employee.lastName}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {item.employee.department} • {item.employee.jobTitle}
                        </div>
                      </td>

                      {/* Workable Days */}
                      <td className="px-4 py-3.5 text-center font-bold text-slate-700">
                        {workable} d
                      </td>

                      {/* Present Days */}
                      <td className="px-4 py-3.5 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200">
                          <IconCheck className="w-3.5 h-3.5" />
                          {present} d
                        </span>
                      </td>

                      {/* Paid Leaves */}
                      <td className="px-4 py-3.5 text-center">
                        <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs border border-blue-200">
                          {paid} d
                        </span>
                      </td>

                      {/* Unpaid LOP */}
                      <td className="px-4 py-3.5 text-center">
                        {lop > 0 ? (
                          <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 font-bold text-xs border border-rose-200">
                            {lop} d
                          </span>
                        ) : (
                          <span className="text-slate-400">0 d</span>
                        )}
                      </td>

                      {/* Overtime */}
                      <td className="px-4 py-3.5 text-center">
                        {otHours > 0 ? (
                          <span className="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-800 font-bold text-[11px] border border-amber-200 block">
                            +{otHours}h (+₹{otPay.toLocaleString()})
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Base Salary */}
                      <td className="px-5 py-3.5 font-semibold text-slate-900">
                        ₹{base.toLocaleString()}
                      </td>

                      {/* LOP Deduction */}
                      <td className="px-5 py-3.5 font-bold text-rose-600">
                        {lopDeduction > 0 ? `-₹${lopDeduction.toLocaleString()}` : '₹0'}
                      </td>

                      {/* Net Salary Payable */}
                      <td className="px-5 py-3.5 font-black text-slate-900 text-sm">
                        ₹{netSalary.toLocaleString()}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 text-center">
                        {item.status === 'PUBLISHED' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <IconCheck className="w-3 h-3" />
                            Generated
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <IconClock className="w-3 h-3" />
                            Draft
                          </span>
                        )}
                      </td>

                      {/* Actions: Generate / Regenerate / Download PDF */}
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {item.status === 'PUBLISHED' ? (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleGenerateSinglePayslip(item.employee.id, `${item.employee.firstName} ${item.employee.lastName}`);
                                }}
                                disabled={generatingEmpId === item.employee.id}
                                title="Regenerate payslip to reflect latest attendance, leave or salary updates"
                                className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg font-bold text-xs inline-flex items-center gap-1 transition-all active:scale-95 disabled:opacity-50"
                              >
                                <IconRefresh className={`w-3.5 h-3.5 text-amber-600 ${generatingEmpId === item.employee.id ? 'animate-spin' : ''}`} />
                                <span>{generatingEmpId === item.employee.id ? 'Syncing...' : 'Regenerate'}</span>
                              </button>

                              {item.payslipId && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDownloadPdf(item.payslipId!, `${item.employee.firstName} ${item.employee.lastName}`);
                                  }}
                                  disabled={downloadingPayslipId === item.payslipId}
                                  title="Download official PDF payslip"
                                  className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg font-bold text-xs inline-flex items-center gap-1 transition-all active:scale-95 disabled:opacity-50"
                                >
                                  <IconFileText className="w-3.5 h-3.5 text-indigo-600" />
                                  <span>{downloadingPayslipId === item.payslipId ? 'PDF...' : 'Payslip'}</span>
                                </button>
                              )}
                            </>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleGenerateSinglePayslip(item.employee.id, `${item.employee.firstName} ${item.employee.lastName}`);
                              }}
                              disabled={generatingEmpId === item.employee.id}
                              title="Generate monthly payslip for this employee"
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg font-bold text-xs inline-flex items-center gap-1 transition-all active:scale-95 disabled:opacity-50"
                            >
                              <IconSparkles className="w-3.5 h-3.5 text-emerald-600" />
                              <span>{generatingEmpId === item.employee.id ? 'Generating...' : 'Generate'}</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <TablePagination
          currentPage={currentPage}
          totalItems={filteredEmployees.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
          pageSizeOptions={[10, 20, 50, 100]}
          itemName="payroll records"
        />
      </div>

      {/* Modal: Full Employee Monthly Statement & Formula Breakdown */}
      {selectedEmp && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200">
                    {month}/{year} Attendance & Payroll
                  </span>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900">
                    {selectedEmp.employee.firstName} {selectedEmp.employee.lastName}
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedEmp.employee.jobTitle} • {selectedEmp.employee.department}
                </p>
              </div>

              <button
                onClick={() => setSelectedEmp(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <IconX className="w-5 h-5" />
              </button>
            </div>

            {/* Segmented Tab Navigation */}
            <div className="flex border-b border-slate-200 gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('statement')}
                className={`px-3 sm:px-4 py-2 text-xs font-bold border-b-2 transition-colors ${
                  activeTab === 'statement'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                Statement Overview
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('adjust')}
                className={`px-3 sm:px-4 py-2 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === 'adjust'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <IconAdjustmentsHorizontal className="w-4 h-4" />
                <span>Adjust Components & Taxes (PF, PT, TDS...)</span>
              </button>
            </div>

            {adjustmentError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <IconAlertCircle className="w-4 h-4 shrink-0" />
                {adjustmentError}
              </div>
            )}

            {/* TAB 1: Statement Overview */}
            {activeTab === 'statement' && (
              <div className="space-y-4">
                {/* Attendance Days Summary Cards */}
                <div className="grid grid-cols-3 gap-2.5 text-center">
                  <div className="p-2.5 sm:p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Workable Days</span>
                    <span className="text-base sm:text-lg font-black text-slate-900">
                      {selectedEmp.calculation.workingDaysCount || 22} d
                    </span>
                  </div>
                  <div className="p-2.5 sm:p-3 bg-emerald-50/70 rounded-xl border border-emerald-200">
                    <span className="text-[10px] font-bold text-emerald-700 uppercase block">Present Days</span>
                    <span className="text-base sm:text-lg font-black text-emerald-800">
                      {selectedEmp.calculation.presentDays || 0} d
                    </span>
                  </div>
                  <div className="p-2.5 sm:p-3 bg-rose-50/70 rounded-xl border border-rose-200">
                    <span className="text-[10px] font-bold text-rose-700 uppercase block">Unpaid LOP</span>
                    <span className="text-base sm:text-lg font-black text-rose-800">
                      {selectedEmp.calculation.totalLopDays || 0} d
                    </span>
                  </div>
                </div>

                {/* Dual Column Earnings & Deductions Table */}
                {(() => {
                  const c = selectedEmp.calculation || {};
                  const base = c.baseSalary || 0;
                  const basic = c.basicSalary !== undefined ? c.basicSalary : Math.round(base * 0.5);
                  const hra = c.hra !== undefined ? c.hra : Math.round(base * 0.2);
                  const customEarn = (c.customComponents || []).filter((x: any) => x.type === 'EARNING');
                  const customEarnSum = customEarn.reduce((sum: number, x: any) => sum + (Number(x.amount) || 0), 0);
                  const special = c.specialAllowance !== undefined ? c.specialAllowance : Math.max(0, base - basic - hra - customEarnSum);
                  const bonus = c.bonus || 0;
                  const otPay = c.overtimePay || 0;
                  const grossEarnings = c.grossEarnings !== undefined ? c.grossEarnings : (basic + hra + special + bonus + otPay + customEarnSum);

                  const pf = c.pf || 0;
                  const pt = c.pt !== undefined ? c.pt : 200;
                  const tds = c.tds || 0;
                  const lop = c.leaveDeduction || c.lopDeduction || 0;
                  const other = c.otherDeductions || 0;
                  const customDed = (c.customComponents || []).filter((x: any) => x.type === 'DEDUCTION');
                  const customDedSum = customDed.reduce((sum: number, x: any) => sum + (Number(x.amount) || 0), 0);
                  const totalDeductions = c.totalDeductions !== undefined ? c.totalDeductions : (pf + pt + tds + lop + other + customDedSum);

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {/* Earnings Column */}
                      <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
                        <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-700 flex justify-between items-center">
                          <span className="uppercase tracking-wider">Earnings Component</span>
                          <span className="uppercase tracking-wider">Amount</span>
                        </div>
                        <div className="divide-y divide-slate-100 text-xs">
                          <div className="px-3.5 py-2 flex justify-between text-slate-700">
                            <span>Basic Salary</span>
                            <span className="font-semibold text-slate-900">₹{basic.toLocaleString()}</span>
                          </div>
                          <div className="px-3.5 py-2 flex justify-between text-slate-700">
                            <span>House Rent Allowance (HRA)</span>
                            <span className="font-semibold text-slate-900">₹{hra.toLocaleString()}</span>
                          </div>
                          <div className="px-3.5 py-2 flex justify-between text-slate-700">
                            <span>Special Allowance</span>
                            <span className="font-semibold text-slate-900">₹{special.toLocaleString()}</span>
                          </div>
                          {bonus > 0 && (
                            <div className="px-3.5 py-2 flex justify-between text-emerald-800 bg-emerald-50/40">
                              <span>Bonus / Incentives</span>
                              <span className="font-semibold">+₹{bonus.toLocaleString()}</span>
                            </div>
                          )}
                          {otPay > 0 && (
                            <div className="px-3.5 py-2 flex justify-between text-amber-900 bg-amber-50/40">
                              <span>Overtime Pay ({c.overtimeHours || 0}h @ 1.5x)</span>
                              <span className="font-semibold">+₹{otPay.toLocaleString()}</span>
                            </div>
                          )}
                          {customEarn.map((item: any, idx: number) => (
                            <div key={idx} className="px-3.5 py-2 flex justify-between text-indigo-900 bg-indigo-50/30">
                              <span>{item.name || 'Custom Allowance'}</span>
                              <span className="font-semibold text-indigo-700">+₹{(Number(item.amount) || 0).toLocaleString()}</span>
                            </div>
                          ))}
                          <div className="px-3.5 py-2.5 bg-slate-50 font-bold text-slate-900 flex justify-between border-t border-slate-200">
                            <span>Total Gross Earnings</span>
                            <span>₹{grossEarnings.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Deductions Column */}
                      <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
                        <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-700 flex justify-between items-center">
                          <span className="uppercase tracking-wider">Deduction / Taxes</span>
                          <span className="uppercase tracking-wider">Amount</span>
                        </div>
                        <div className="divide-y divide-slate-100 text-xs">
                          <div className="px-3.5 py-2 flex justify-between text-slate-700">
                            <span>Provident Fund (PF)</span>
                            <span className="font-semibold text-slate-900">₹{pf.toLocaleString()}</span>
                          </div>
                          <div className="px-3.5 py-2 flex justify-between text-slate-700">
                            <span>Professional Tax (PT)</span>
                            <span className="font-semibold text-slate-900">₹{pt.toLocaleString()}</span>
                          </div>
                          <div className="px-3.5 py-2 flex justify-between text-slate-700">
                            <span>Income Tax (TDS)</span>
                            <span className="font-semibold text-slate-900">₹{tds.toLocaleString()}</span>
                          </div>
                          {lop > 0 && (
                            <div className="px-3.5 py-2 flex justify-between text-rose-800 bg-rose-50/40">
                              <span>Loss of Pay (LOP) ({c.totalLopDays || 0} d)</span>
                              <span className="font-semibold text-rose-700">-₹{lop.toLocaleString()}</span>
                            </div>
                          )}
                          {other > 0 && (
                            <div className="px-3.5 py-2 flex justify-between text-slate-700">
                              <span>Other Deductions</span>
                              <span className="font-semibold text-slate-900">-₹{other.toLocaleString()}</span>
                            </div>
                          )}
                          {customDed.map((item: any, idx: number) => (
                            <div key={idx} className="px-3.5 py-2 flex justify-between text-rose-900 bg-rose-50/30">
                              <span>{item.name || 'Custom Deduction'}</span>
                              <span className="font-semibold text-rose-700">-₹{(Number(item.amount) || 0).toLocaleString()}</span>
                            </div>
                          ))}
                          <div className="px-3.5 py-2.5 bg-slate-50 font-bold text-rose-700 flex justify-between border-t border-slate-200">
                            <span>Total Deductions</span>
                            <span>-₹{totalDeductions.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Net Salary Payable Highlight Banner */}
                <div className="p-3.5 sm:p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Net Salary Payable ({month}/{year})
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
                      ₹{(selectedEmp.calculation.netSalary || 0).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {selectedEmp.status === 'PUBLISHED' && (
                      <button
                        type="button"
                        onClick={() => handleGenerateSinglePayslip(selectedEmp.employee.id, `${selectedEmp.employee.firstName} ${selectedEmp.employee.lastName}`)}
                        disabled={generatingEmpId === selectedEmp.employee.id}
                        title="Regenerate this payslip to reflect latest attendance, leave or component updates"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl text-xs font-bold border border-amber-200 shadow-2xs transition-all active:scale-95 disabled:opacity-50"
                      >
                        <IconRefresh className={`w-3.5 h-3.5 text-amber-600 ${generatingEmpId === selectedEmp.employee.id ? 'animate-spin' : ''}`} />
                        <span>{generatingEmpId === selectedEmp.employee.id ? 'Syncing...' : 'Regenerate Payslip'}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setActiveTab('adjust')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 shadow-2xs transition-colors self-start sm:self-auto"
                    >
                      <IconAdjustmentsHorizontal className="w-3.5 h-3.5 text-slate-600" />
                      <span>Adjust PF, PT, TDS, HRA...</span>
                    </button>
                  </div>
                </div>

                {/* Bank Details */}
                <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs flex justify-between items-center">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Payment Mode</span>
                    <span className="font-bold text-slate-800">
                      {selectedEmp.calculation.paymentMode || 'BANK_TRANSFER'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 block text-[10px]">Bank & Account</span>
                    <span className="font-bold text-slate-800">
                      {selectedEmp.calculation.bankName || 'HDFC Bank'} ({selectedEmp.calculation.accountNumberMasked || '••••'})
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Configure & Adjust Components */}
            {/* TAB 2: Configure & Adjust Components in ONE Unified Container */}
            {/* TAB 2: Configure & Adjust Components in ONE Unified Container */}
            {activeTab === 'adjust' && (
              <div className="space-y-4">
                {/* ONE Single Unified Container */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                  {/* Top Header inside container */}
                  <div className="p-3.5 sm:p-4 bg-slate-50/70 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">Salary & Tax Components Configuration</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          Monthly Base: ₹{Number(selectedEmp.calculation.baseSalary || 0).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Configure statutory PF, PT, TDS, allowances, and custom components for this month's payroll.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleAutoSplitMonthly}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-indigo-50 text-indigo-700 font-bold border border-indigo-200 rounded-xl text-xs shadow-2xs hover:shadow-xs transition-all shrink-0 self-start sm:self-auto active:scale-95"
                      title="Auto-calculate 50% Basic, 20% HRA, remaining Special Allowance, and statutory deductions"
                    >
                      <IconSparkles className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Auto-Split Standard CTC</span>
                    </button>
                  </div>

                  {/* Unified Components Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-700">
                      <thead className="bg-[#e5e7eb] text-xs font-bold text-slate-900 border-b border-slate-300">
                        <tr>
                          <th className="px-4 py-2.5">Component</th>
                          <th className="px-3 py-2.5">Type</th>
                          <th className="px-4 py-2.5 text-right">Amount (₹)</th>
                          <th className="px-2 py-2.5 text-center w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {/* SECTION 1: EARNINGS & ALLOWANCES */}
                        <tr className="bg-slate-50/70">
                          <td colSpan={4} className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                            <span className="inline-flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              Earnings & Allowances
                            </span>
                          </td>
                        </tr>

                        {/* Basic Salary */}
                        <tr className="hover:bg-slate-50/40 transition-colors">
                          <td className="px-4 py-2.5">
                            <div className="font-semibold text-slate-900">Basic Salary</div>
                            <div className="text-[10px] text-slate-400">Core wage component (typically 50% of monthly CTC)</div>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              Earning
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <div className="relative w-32 ml-auto">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 select-none">₹</span>
                              <input
                                type="number"
                                min="0"
                                value={adjustForm.basicSalary}
                                onChange={(e) => setAdjustForm({ ...adjustForm, basicSalary: e.target.value })}
                                className="w-full pl-6 pr-2.5 py-1 text-xs text-right font-mono font-semibold bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 text-slate-900 transition-colors"
                              />
                            </div>
                          </td>
                          <td></td>
                        </tr>

                        {/* HRA */}
                        <tr className="hover:bg-slate-50/40 transition-colors">
                          <td className="px-4 py-2.5">
                            <div className="font-semibold text-slate-900">House Rent Allowance (HRA)</div>
                            <div className="text-[10px] text-slate-400">Tax-exempt housing benefit (typically 20% of monthly CTC)</div>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              Earning
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <div className="relative w-32 ml-auto">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 select-none">₹</span>
                              <input
                                type="number"
                                min="0"
                                value={adjustForm.hra}
                                onChange={(e) => setAdjustForm({ ...adjustForm, hra: e.target.value })}
                                className="w-full pl-6 pr-2.5 py-1 text-xs text-right font-mono font-semibold bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 text-slate-900 transition-colors"
                              />
                            </div>
                          </td>
                          <td></td>
                        </tr>

                        {/* Special Allowance */}
                        <tr className="hover:bg-slate-50/40 transition-colors">
                          <td className="px-4 py-2.5">
                            <div className="font-semibold text-slate-900">Special Allowance</div>
                            <div className="text-[10px] text-slate-400">Balancing allowance figure for gross salary</div>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              Earning
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <div className="relative w-32 ml-auto">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 select-none">₹</span>
                              <input
                                type="number"
                                min="0"
                                value={adjustForm.specialAllowance}
                                onChange={(e) => setAdjustForm({ ...adjustForm, specialAllowance: e.target.value })}
                                className="w-full pl-6 pr-2.5 py-1 text-xs text-right font-mono font-semibold bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 text-slate-900 transition-colors"
                              />
                            </div>
                          </td>
                          <td></td>
                        </tr>

                        {/* Bonus / Incentives */}
                        <tr className="hover:bg-slate-50/40 transition-colors">
                          <td className="px-4 py-2.5">
                            <div className="font-semibold text-slate-900">Bonus / Performance Incentives</div>
                            <div className="text-[10px] text-slate-400">Monthly or quarterly performance-based incentive</div>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              Earning
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <div className="relative w-32 ml-auto">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 select-none">₹</span>
                              <input
                                type="number"
                                min="0"
                                value={adjustForm.bonus}
                                onChange={(e) => setAdjustForm({ ...adjustForm, bonus: e.target.value })}
                                className="w-full pl-6 pr-2.5 py-1 text-xs text-right font-mono font-semibold bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 text-slate-900 transition-colors"
                              />
                            </div>
                          </td>
                          <td></td>
                        </tr>

                        {/* Dynamic Custom Earnings */}
                        {adjustForm.customComponents
                          .filter((c) => c.type === 'EARNING')
                          .map((item) => (
                            <tr key={item.id} className="bg-emerald-50/20 hover:bg-emerald-50/30 transition-colors">
                              <td className="px-4 py-2">
                                <input
                                  type="text"
                                  value={item.name}
                                  onChange={(e) => handleUpdateCustomComponent(item.id, 'name', e.target.value)}
                                  placeholder="Allowance name (e.g. Medical, Transport)"
                                  className="w-full px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg font-medium focus:border-indigo-500 focus:outline-hidden"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <select
                                  value={item.type}
                                  onChange={(e) => handleUpdateCustomComponent(item.id, 'type', e.target.value as any)}
                                  className="px-2 py-1 text-[11px] font-bold bg-white border border-slate-200 rounded-lg focus:outline-hidden"
                                >
                                  <option value="EARNING">Earning (+)</option>
                                  <option value="DEDUCTION">Deduction (-)</option>
                                </select>
                              </td>
                              <td className="px-4 py-2 text-right">
                                <div className="relative w-32 ml-auto">
                                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 select-none">₹</span>
                                  <input
                                    type="number"
                                    min="0"
                                    value={item.amount}
                                    onChange={(e) => handleUpdateCustomComponent(item.id, 'amount', e.target.value)}
                                    className="w-full pl-6 pr-2.5 py-1 text-xs text-right font-mono font-semibold bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500"
                                  />
                                </div>
                              </td>
                              <td className="px-2 py-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveCustomComponent(item.id)}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                                  title="Remove component"
                                >
                                  <IconTrash className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}

                        {/* SECTION 2: DEDUCTIONS & STATUTORY TAXES */}
                        <tr className="bg-slate-50/70">
                          <td colSpan={4} className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                            <span className="inline-flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                              Deductions & Statutory Taxes
                            </span>
                          </td>
                        </tr>

                        {/* Provident Fund */}
                        <tr className="hover:bg-slate-50/40 transition-colors">
                          <td className="px-4 py-2.5">
                            <div className="font-semibold text-slate-900">Provident Fund (PF)</div>
                            <div className="text-[10px] text-slate-400">Employee retirement contribution (12% of basic, capped at ₹1,800)</div>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                              Deduction
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <div className="relative w-32 ml-auto">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 select-none">₹</span>
                              <input
                                type="number"
                                min="0"
                                value={adjustForm.pf}
                                onChange={(e) => setAdjustForm({ ...adjustForm, pf: e.target.value })}
                                placeholder="0"
                                className="w-full pl-6 pr-2.5 py-1 text-xs text-right font-mono font-semibold bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 text-slate-900 transition-colors"
                              />
                            </div>
                          </td>
                          <td></td>
                        </tr>

                        {/* Professional Tax */}
                        <tr className="hover:bg-slate-50/40 transition-colors">
                          <td className="px-4 py-2.5">
                            <div className="font-semibold text-slate-900">Professional Tax (PT)</div>
                            <div className="text-[10px] text-slate-400">State statutory professional tax (standard ₹200)</div>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                              Deduction
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <div className="relative w-32 ml-auto">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 select-none">₹</span>
                              <input
                                type="number"
                                min="0"
                                value={adjustForm.pt}
                                onChange={(e) => setAdjustForm({ ...adjustForm, pt: e.target.value })}
                                placeholder="200"
                                className="w-full pl-6 pr-2.5 py-1 text-xs text-right font-mono font-semibold bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 text-slate-900 transition-colors"
                              />
                            </div>
                          </td>
                          <td></td>
                        </tr>

                        {/* Income Tax (TDS) */}
                        <tr className="hover:bg-slate-50/40 transition-colors">
                          <td className="px-4 py-2.5">
                            <div className="font-semibold text-slate-900">Income Tax (TDS)</div>
                            <div className="text-[10px] text-slate-400">Estimated monthly tax deducted at source under IT rules</div>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                              Deduction
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <div className="relative w-32 ml-auto">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 select-none">₹</span>
                              <input
                                type="number"
                                min="0"
                                value={adjustForm.tds}
                                onChange={(e) => setAdjustForm({ ...adjustForm, tds: e.target.value })}
                                placeholder="0"
                                className="w-full pl-6 pr-2.5 py-1 text-xs text-right font-mono font-semibold bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 text-slate-900 transition-colors"
                              />
                            </div>
                          </td>
                          <td></td>
                        </tr>

                        {/* Other Deductions */}
                        <tr className="hover:bg-slate-50/40 transition-colors">
                          <td className="px-4 py-2.5">
                            <div className="font-semibold text-slate-900">Other Deductions</div>
                            <div className="text-[10px] text-slate-400">Ad-hoc adjustments or payroll deductions</div>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                              Deduction
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <div className="relative w-32 ml-auto">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 select-none">₹</span>
                              <input
                                type="number"
                                min="0"
                                value={adjustForm.otherDeductions}
                                onChange={(e) => setAdjustForm({ ...adjustForm, otherDeductions: e.target.value })}
                                placeholder="0"
                                className="w-full pl-6 pr-2.5 py-1 text-xs text-right font-mono font-semibold bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 text-slate-900 transition-colors"
                              />
                            </div>
                          </td>
                          <td></td>
                        </tr>

                        {/* Dynamic Custom Deductions */}
                        {adjustForm.customComponents
                          .filter((c) => c.type === 'DEDUCTION')
                          .map((item) => (
                            <tr key={item.id} className="bg-rose-50/20 hover:bg-rose-50/30 transition-colors">
                              <td className="px-4 py-2">
                                <input
                                  type="text"
                                  value={item.name}
                                  onChange={(e) => handleUpdateCustomComponent(item.id, 'name', e.target.value)}
                                  placeholder="Deduction name (e.g. NPS, Canteen, Insurance)"
                                  className="w-full px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg font-medium focus:border-indigo-500 focus:outline-hidden"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <select
                                  value={item.type}
                                  onChange={(e) => handleUpdateCustomComponent(item.id, 'type', e.target.value as any)}
                                  className="px-2 py-1 text-[11px] font-bold bg-white border border-slate-200 rounded-lg focus:outline-hidden"
                                >
                                  <option value="EARNING">Earning (+)</option>
                                  <option value="DEDUCTION">Deduction (-)</option>
                                </select>
                              </td>
                              <td className="px-4 py-2 text-right">
                                <div className="relative w-32 ml-auto">
                                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 select-none">₹</span>
                                  <input
                                    type="number"
                                    min="0"
                                    value={item.amount}
                                    onChange={(e) => handleUpdateCustomComponent(item.id, 'amount', e.target.value)}
                                    className="w-full pl-6 pr-2.5 py-1 text-xs text-right font-mono font-semibold bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500"
                                  />
                                </div>
                              </td>
                              <td className="px-2 py-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveCustomComponent(item.id)}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                                  title="Remove deduction"
                                >
                                  <IconTrash className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Table Footer: Add Button + Live Clean Corporate Summary */}
                  <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={handleAddCustomComponent}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 shadow-2xs transition-colors self-start sm:self-auto"
                    >
                      <IconPlus className="w-3.5 h-3.5 text-slate-600" />
                      <span>Add Custom Component</span>
                    </button>

                    {/* Clean Single-Row Financial Summary */}
                    {(() => {
                      const basic = Number(adjustForm.basicSalary) || 0;
                      const hra = Number(adjustForm.hra) || 0;
                      const special = Number(adjustForm.specialAllowance) || 0;
                      const bonus = Number(adjustForm.bonus) || 0;
                      const ot = selectedEmp.calculation.overtimePay || 0;
                      const customEarn = adjustForm.customComponents
                        .filter((c) => c.type === 'EARNING')
                        .reduce((s, c) => s + (Number(c.amount) || 0), 0);
                      const grossEarnings = basic + hra + special + bonus + ot + customEarn;

                      const pf = Number(adjustForm.pf) || 0;
                      const pt = Number(adjustForm.pt) || 0;
                      const tds = Number(adjustForm.tds) || 0;
                      const lop = selectedEmp.calculation.leaveDeduction || selectedEmp.calculation.lopDeduction || 0;
                      const other = Number(adjustForm.otherDeductions) || 0;
                      const customDed = adjustForm.customComponents
                        .filter((c) => c.type === 'DEDUCTION')
                        .reduce((s, c) => s + (Number(c.amount) || 0), 0);
                      const totalDeductions = pf + pt + tds + lop + other + customDed;
                      const netPayable = Math.max(0, grossEarnings - totalDeductions);

                      return (
                        <div className="flex flex-wrap items-center gap-3 text-xs">
                          <span className="text-slate-600">
                            Gross: <strong className="text-slate-900 font-mono">₹{grossEarnings.toLocaleString()}</strong>
                          </span>
                          <span className="text-slate-600">
                            Deductions: <strong className="text-rose-600 font-mono">-₹{totalDeductions.toLocaleString()}</strong>
                          </span>
                          <span className="font-bold text-slate-900">
                            Net Take-Home: <strong className="text-emerald-700 font-mono text-sm">₹{netPayable.toLocaleString()}</strong>
                          </span>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Remarks Row inside container */}
                  <div className="p-3 bg-white border-t border-slate-200 flex flex-col sm:flex-row sm:items-center gap-2">
                    <label className="text-xs font-semibold text-slate-700 shrink-0">Adjustment Remarks:</label>
                    <input
                      type="text"
                      placeholder="e.g. Performance bonus for Q3 / Statutory PT updated"
                      value={adjustForm.remarks}
                      onChange={(e) => setAdjustForm({ ...adjustForm, remarks: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 text-slate-800 font-medium transition-colors"
                    />
                  </div>
                </div>

                {/* Save & Cancel Action Buttons */}
                <div className="flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setActiveTab('statement')}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveAdjustments}
                    disabled={isSavingAdjustments}
                    className="inline-flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 disabled:opacity-50"
                  >
                    {selectedEmp.status === 'PUBLISHED' ? (
                      <IconRefresh className={`w-4 h-4 ${isSavingAdjustments ? 'animate-spin' : ''}`} />
                    ) : (
                      <IconDeviceFloppy className="w-4 h-4" />
                    )}
                    <span>
                      {isSavingAdjustments
                        ? 'Saving & Regenerating...'
                        : selectedEmp.status === 'PUBLISHED'
                        ? 'Save & Regenerate Payslip'
                        : 'Save Components & Recalculate'}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-2">
                {selectedEmp.status === 'PUBLISHED' ? (
                  <>
                    {selectedEmp.payslipId && (
                      <button
                        onClick={() => handleDownloadPdf(selectedEmp.payslipId!, `${selectedEmp.employee.firstName} ${selectedEmp.employee.lastName}`)}
                        disabled={downloadingPayslipId === selectedEmp.payslipId}
                        className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
                      >
                        <IconFileText className="w-4 h-4" />
                        <span>{downloadingPayslipId === selectedEmp.payslipId ? 'Downloading...' : 'Download Payslip (PDF)'}</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleGenerateSinglePayslip(selectedEmp.employee.id, `${selectedEmp.employee.firstName} ${selectedEmp.employee.lastName}`)}
                      disabled={generatingEmpId === selectedEmp.employee.id}
                      className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      <IconRefresh className={`w-3.5 h-3.5 text-amber-600 ${generatingEmpId === selectedEmp.employee.id ? 'animate-spin' : ''}`} />
                      <span>{generatingEmpId === selectedEmp.employee.id ? 'Syncing...' : 'Regenerate Payslip'}</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleGenerateSinglePayslip(selectedEmp.employee.id, `${selectedEmp.employee.firstName} ${selectedEmp.employee.lastName}`)}
                    disabled={generatingEmpId === selectedEmp.employee.id}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
                  >
                    <IconSparkles className="w-4 h-4" />
                    <span>{generatingEmpId === selectedEmp.employee.id ? 'Generating...' : 'Generate Monthly Payslip'}</span>
                  </button>
                )}
              </div>

              <button
                onClick={() => setSelectedEmp(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceSalaryPage;
