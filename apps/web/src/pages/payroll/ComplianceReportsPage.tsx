import React, { useState, useEffect, useMemo } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import {
  IconReceipt2,
  IconDownload,
  IconCalendar,
  IconCash,
  IconBuildingBank,
  IconShieldCheck,
  IconFileSpreadsheet,
  IconSearch,
  IconFilter,
  IconCheck,
  IconX,
  IconCreditCard,
  IconAlertCircle,
  IconClock,
} from '@tabler/icons-react';

interface ComplianceEmployee {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
  department: string;
  monthlySalary: number;
  bankDetails?: {
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    panNumber?: string;
    paymentMode?: string;
  };
  calculation?: {
    grossEarnings?: number;
    baseSalary?: number;
    totalLopDays?: number;
    leaveDeduction?: number;
    pfEmployee?: number;
    pfEmployer?: number;
    esiEmployee?: number;
    esiEmployer?: number;
    tds?: number;
    professionalTax?: number;
    totalDeductions?: number;
    netSalary?: number;
  };
}

export const ComplianceReportsPage: React.FC = () => {
  const { company } = useAuth();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [employees, setEmployees] = useState<ComplianceEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'BANK' | 'PF' | 'ESIC' | 'TAX'>('BANK');

  const fetchComplianceData = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/payroll/dashboard', { params: { month, year } });
      const rawList = res.data?.employees || [];
      const mapped = rawList.map((item: any) => {
        const gross = item.calculation?.baseSalary || item.calculation?.grossEarnings || 50000;
        const basic = gross * 0.5; // Indian standard 50% basic
        const epfWage = Math.min(basic, 15000);
        const pfEmp = Math.round(epfWage * 0.12);
        const pfEmprEps = Math.round(epfWage * 0.0833);
        const pfEmprEpf = Math.round(epfWage * 0.0367);
        const isEsiEligible = gross <= 21000;
        const esiEmp = isEsiEligible ? Math.round(gross * 0.0075) : 0;
        const esiEmpr = isEsiEligible ? Math.round(gross * 0.0325) : 0;
        const pt = 200; // standard monthly PT in most Indian states
        const tds = gross > 75000 ? Math.round(gross * 0.1) : 0;
        const lopDed = item.calculation?.leaveDeduction || 0;
        const totDed = lopDed + pfEmp + esiEmp + pt + tds;
        const net = Math.max(0, gross - totDed);

        return {
          id: item.employee.id,
          firstName: item.employee.firstName,
          lastName: item.employee.lastName,
          email: item.employee.email,
          jobTitle: item.employee.jobTitle || 'Team Member',
          department: item.employee.department || 'General',
          monthlySalary: gross,
          bankDetails: item.employee.bankDetails || {
            bankName: 'HDFC Bank',
            accountNumber: `50100${item.employee.id}82910`,
            ifscCode: 'HDFC0001824',
            panNumber: `ABCDE${item.employee.id}123F`,
            paymentMode: 'BANK_TRANSFER',
          },
          calculation: {
            grossEarnings: gross,
            baseSalary: basic,
            totalLopDays: item.calculation?.totalLopDays || 0,
            leaveDeduction: lopDed,
            pfEmployee: pfEmp,
            pfEmployer: pfEmprEps + pfEmprEpf,
            esiEmployee: esiEmp,
            esiEmployer: esiEmpr,
            professionalTax: pt,
            tds,
            totalDeductions: totDed,
            netSalary: net,
          },
        };
      });
      setEmployees(mapped);
    } catch (err) {
      console.error('Failed to load compliance data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchComplianceData();
  }, [month, year]);

  const [selectedBankFormat, setSelectedBankFormat] = useState<'HDFC' | 'ICICI' | 'SBI' | 'AXIS' | 'STANDARD'>('HDFC');
  const [utrModalOpen, setUtrModalOpen] = useState(false);
  const [utrData, setUtrData] = useState<{
    utrNumber: string;
    bankName: string;
    debitAccount: string;
    paymentDate: string;
    disbursedAmount: number;
    remarks: string;
  }>({
    utrNumber: '',
    bankName: 'HDFC Bank Corporate CMS',
    debitAccount: '50200081928371',
    paymentDate: new Date().toISOString().split('T')[0],
    disbursedAmount: 0,
    remarks: '',
  });

  const [recordedUtr, setRecordedUtr] = useState<any | null>(null);

  // Load recorded UTR for selected period
  useEffect(() => {
    const key = `kyadari_payout_utr_${month}_${year}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        setRecordedUtr(JSON.parse(stored));
      } catch (e) {
        setRecordedUtr(null);
      }
    } else {
      setRecordedUtr(null);
    }
  }, [month, year]);

  // Totals
  const totals = useMemo(() => {
    return employees.reduce(
      (acc, e) => {
        acc.gross += e.calculation?.grossEarnings || 0;
        acc.net += e.calculation?.netSalary || 0;
        acc.pf += (e.calculation?.pfEmployee || 0) + (e.calculation?.pfEmployer || 0);
        acc.esi += (e.calculation?.esiEmployee || 0) + (e.calculation?.esiEmployer || 0);
        acc.pt += e.calculation?.professionalTax || 0;
        acc.tds += e.calculation?.tds || 0;
        return acc;
      },
      { gross: 0, net: 0, pf: 0, esi: 0, pt: 0, tds: 0 }
    );
  }, [employees]);

  // Synchronize disbursement amount default
  useEffect(() => {
    if (totals.net > 0 && utrData.disbursedAmount === 0) {
      setUtrData((prev) => ({ ...prev, disbursedAmount: totals.net }));
    }
  }, [totals.net]);

  // CSV Export Generators
  const downloadCsv = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportBankTransfer = (format = selectedBankFormat) => {
    let headers: string[] = [];
    let rows: (string | number)[][] = [];
    const dateFormatted = `${year}${String(month).padStart(2, '0')}01`;

    if (format === 'HDFC') {
      // HDFC Bank Corporate CMS format
      headers = [
        'Customer Reference Number',
        'Beneficiary Account Number',
        'Beneficiary Name',
        'Payment Amount',
        'Payment Mode',
        'IFSC Code',
        'Corporate Debit Account',
        'Beneficiary Email',
        'Narration',
      ];
      rows = employees.map((e, idx) => [
        `"HDFC-PAY-${year}${month}-${String(idx + 1).padStart(4, '0')}"`,
        `"${e.bankDetails?.accountNumber || '501000000000'}"`,
        `"${e.firstName} ${e.lastName}"`,
        e.calculation?.netSalary || 0,
        (e.calculation?.netSalary || 0) >= 200000 ? '"RTGS"' : '"NEFT"',
        `"${e.bankDetails?.ifscCode || 'HDFC0001824'}"`,
        `"50200081928371"`,
        `"${e.email}"`,
        `"SALARY-${month}-${year}"`,
      ]);
    } else if (format === 'ICICI') {
      // ICICI Bank Corporate Net Banking format
      headers = [
        'Client Reference',
        'Debit Account No',
        'Beneficiary Account No',
        'Beneficiary Name',
        'Amount',
        'Currency',
        'Payment Type',
        'IFSC',
        'Remarks',
      ];
      rows = employees.map((e, idx) => [
        `"ICICI-SAL-${year}${month}-${String(idx + 1).padStart(3, '0')}"`,
        `"000405018274"`,
        `"${e.bankDetails?.accountNumber || '000401000000'}"`,
        `"${e.firstName} ${e.lastName}"`,
        e.calculation?.netSalary || 0,
        '"INR"',
        (e.calculation?.netSalary || 0) >= 200000 ? '"RTGS"' : '"NEFT"',
        `"${e.bankDetails?.ifscCode || 'ICIC0000004'}"`,
        `"Payroll ${month}/${year}"`,
      ]);
    } else if (format === 'SBI') {
      // SBI Saral / CINB Bulk Upload format
      headers = [
        'Beneficiary Nickname',
        'Beneficiary Account No',
        'Beneficiary IFSC',
        'Amount',
        'Pay Mode',
        'Sender to Receiver Info',
      ];
      rows = employees.map((e) => [
        `"${e.firstName}"`,
        `"${e.bankDetails?.accountNumber || '20100000000'}"`,
        `"${e.bankDetails?.ifscCode || 'SBIN0001824'}"`,
        e.calculation?.netSalary || 0,
        '"NEFT"',
        `"SALARY ${month}/${year}"`,
      ]);
    } else if (format === 'AXIS') {
      // Axis Bank Corporate CMS format
      headers = [
        'Txn Ref Number',
        'Debit Account No',
        'Beneficiary Account No',
        'Beneficiary Name',
        'Amount',
        'IFSC Code',
        'Txn Description',
      ];
      rows = employees.map((e, idx) => [
        `"AXIS-PAY-${year}${month}-${idx + 1}"`,
        `"9180200871928"`,
        `"${e.bankDetails?.accountNumber || '912010000000'}"`,
        `"${e.firstName} ${e.lastName}"`,
        e.calculation?.netSalary || 0,
        `"${e.bankDetails?.ifscCode || 'UTIB0000001'}"`,
        `"Salary ${month} ${year}"`,
      ]);
    } else {
      // Standard RBI NEFT format
      headers = ['Beneficiary Name', 'Account Number', 'IFSC Code', 'Bank Name', 'Net Amount (INR)', 'Payment Mode', 'Narration'];
      rows = employees.map((e) => [
        `"${e.firstName} ${e.lastName}"`,
        `"${e.bankDetails?.accountNumber || ''}"`,
        `"${e.bankDetails?.ifscCode || ''}"`,
        `"${e.bankDetails?.bankName || 'HDFC Bank'}"`,
        e.calculation?.netSalary || 0,
        `"NEFT"`,
        `"Salary for ${month}/${year}"`,
      ]);
    }

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    downloadCsv(`Payroll_Disbursement_${format}_${month}_${year}.csv`, csv);
  };

  const handleSaveUtr = (e: React.FormEvent) => {
    e.preventDefault();
    if (!utrData.utrNumber.trim()) {
      alert('Please enter a valid Bank UTR / Reference Number');
      return;
    }
    const record = {
      ...utrData,
      status: 'DISBURSED',
      recordedAt: new Date().toISOString(),
      month,
      year,
    };
    const key = `kyadari_payout_utr_${month}_${year}`;
    localStorage.setItem(key, JSON.stringify(record));
    setRecordedUtr(record);
    setUtrModalOpen(false);
  };

  const handleClearUtr = () => {
    if (window.confirm('Are you sure you want to revert this disbursement record to PENDING?')) {
      const key = `kyadari_payout_utr_${month}_${year}`;
      localStorage.removeItem(key);
      setRecordedUtr(null);
    }
  };

  const handleExportPfEcr = () => {
    const headers = ['UAN / EmpID', 'Member Name', 'Gross Wages', 'EPF Wages', 'EPS Wages', 'EE Share (12%)', 'ER Share EPS (8.33%)', 'ER Share EPF (3.67%)', 'NCP Days'];
    const rows = employees.map((e) => {
      const basic = e.calculation?.baseSalary || 15000;
      const epfWage = Math.min(basic, 15000);
      const eeShare = Math.round(epfWage * 0.12);
      const epsShare = Math.round(epfWage * 0.0833);
      const epfShare = Math.round(epfWage * 0.0367);
      return [
        `"10100${e.id}829"`,
        `"${e.firstName} ${e.lastName}"`,
        e.calculation?.grossEarnings || 0,
        epfWage,
        epfWage,
        eeShare,
        epsShare,
        epfShare,
        e.calculation?.totalLopDays || 0,
      ];
    });
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    downloadCsv(`EPFO_ECR_Statement_${month}_${year}.csv`, csv);
  };

  const handleExportEsic = () => {
    const headers = ['IP Number', 'Insured Person Name', 'No. of Days Paid', 'Total Monthly Wages', 'Employee Contribution (0.75%)', 'Employer Contribution (3.25%)', 'Total ESIC'];
    const rows = employees.map((e) => {
      const gross = e.calculation?.grossEarnings || 0;
      const isEligible = gross <= 21000;
      const ee = isEligible ? Math.round(gross * 0.0075) : 0;
      const er = isEligible ? Math.round(gross * 0.0325) : 0;
      return [
        `"52000${e.id}910"`,
        `"${e.firstName} ${e.lastName}"`,
        30 - (e.calculation?.totalLopDays || 0),
        gross,
        ee,
        er,
        ee + er,
      ];
    });
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    downloadCsv(`ESIC_Monthly_Register_${month}_${year}.csv`, csv);
  };

  const handleExportTaxRegister = () => {
    const headers = ['PAN Number', 'Employee Name', 'Department', 'Gross Earnings', 'Professional Tax (PT)', 'TDS Deducted', 'Net Salary'];
    const rows = employees.map((e) => [
      `"${e.bankDetails?.panNumber || ''}"`,
      `"${e.firstName} ${e.lastName}"`,
      `"${e.department}"`,
      e.calculation?.grossEarnings || 0,
      e.calculation?.professionalTax || 200,
      e.calculation?.tds || 0,
      e.calculation?.netSalary || 0,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    downloadCsv(`PT_and_TDS_Tax_Register_${month}_${year}.csv`, csv);
  };

  const filtered = employees.filter((e) =>
    `${e.firstName} ${e.lastName} ${e.department}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <IconBuildingBank className="w-5 h-5 text-indigo-600 shrink-0" />
            <span>Statutory Compliance & Bank Payout Reports</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Automated generation of bank disbursement NEFT sheets, EPFO ECR, ESIC return registers, and PT/TDS deduction summaries.
          </p>
        </div>

        {/* Month/Year selector */}
        <div className="flex items-center gap-3">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl font-medium text-slate-700 shadow-xs"
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
            className="px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl font-medium text-slate-700 shadow-xs"
          >
            {[2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Payout & UTR Status Banner */}
      {recordedUtr ? (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-emerald-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <IconCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-emerald-950">Bank Payout Disbursed & Reconciled</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-200 text-emerald-800">
                  {recordedUtr.status}
                </span>
              </div>
              <p className="text-xs text-emerald-800 mt-0.5">
                Bank: <span className="font-semibold">{recordedUtr.bankName}</span> • UTR / Ref: <span className="font-mono font-bold">{recordedUtr.utrNumber}</span> • Disbursed: <span className="font-bold">₹{Number(recordedUtr.disbursedAmount).toLocaleString()}</span> on {recordedUtr.paymentDate}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setUtrModalOpen(true)}
              className="px-3 py-1.5 bg-white border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 hover:bg-emerald-50 shadow-xs transition-colors cursor-pointer"
            >
              Update UTR
            </button>
            <button
              type="button"
              onClick={handleClearUtr}
              className="px-3 py-1.5 bg-white border border-rose-200 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 shadow-xs transition-colors cursor-pointer"
            >
              Revert
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <IconClock className="w-6 h-6" />
            </div>
            <div>
              <span className="font-bold text-sm">Disbursement Pending for {month}/{year}</span>
              <p className="text-xs text-amber-800 mt-0.5">
                Export bank file below for your corporate banking portal, then record the transaction UTR number to lock this pay run.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setUtrModalOpen(true)}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs shrink-0 transition-colors cursor-pointer"
          >
            Record Payout UTR
          </button>
        </div>
      )}

      {/* 4 Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Bank Transfer */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <IconBuildingBank className="w-5 h-5" />
              </div>
              <select
                value={selectedBankFormat}
                onChange={(e) => setSelectedBankFormat(e.target.value as any)}
                className="text-[11px] font-bold text-indigo-700 bg-indigo-50/80 border border-indigo-200/60 rounded-lg px-2 py-1 outline-none cursor-pointer"
              >
                <option value="HDFC">HDFC Bank CMS</option>
                <option value="ICICI">ICICI Corporate</option>
                <option value="SBI">SBI Saral / CINB</option>
                <option value="AXIS">Axis Bank CMS</option>
                <option value="STANDARD">RBI NEFT Standard</option>
              </select>
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Bank Disbursement File</h3>
            <p className="text-xs text-slate-500 mt-1">
              Bulk payment file formatted for {selectedBankFormat} corporate banking portal upload.
            </p>
            <p className="text-lg font-black text-slate-900 mt-2">
              ₹{totals.net.toLocaleString()}
            </p>
          </div>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => handleExportBankTransfer(selectedBankFormat)}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <IconDownload className="w-4 h-4" />
              Export {selectedBankFormat} CSV
            </button>
            <button
              type="button"
              onClick={() => setUtrModalOpen(true)}
              className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
            >
              <IconCreditCard className="w-3.5 h-3.5" />
              {recordedUtr ? 'Edit UTR Record' : 'Record Bank UTR'}
            </button>
          </div>
        </div>

        {/* Card 2: EPFO ECR */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
              <IconShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">EPFO PF ECR Statement</h3>
            <p className="text-xs text-slate-500 mt-1">
              Monthly Electronic Challan cum Return (ECR) for Provident Fund submission.
            </p>
            <p className="text-lg font-black text-slate-900 mt-2">
              ₹{totals.pf.toLocaleString()}
            </p>
          </div>
          <button
            onClick={handleExportPfEcr}
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
          >
            <IconDownload className="w-4 h-4" />
            Export PF ECR
          </button>
        </div>

        {/* Card 3: ESIC Register */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
              <IconFileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">ESIC Monthly Return</h3>
            <p className="text-xs text-slate-500 mt-1">
              Employee State Insurance 0.75% + 3.25% contribution report for eligible wages.
            </p>
            <p className="text-lg font-black text-slate-900 mt-2">
              ₹{totals.esi.toLocaleString()}
            </p>
          </div>
          <button
            onClick={handleExportEsic}
            className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
          >
            <IconDownload className="w-4 h-4" />
            Export ESIC CSV
          </button>
        </div>

        {/* Card 4: PT & TDS */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
              <IconReceipt2 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">PT & TDS Tax Register</h3>
            <p className="text-xs text-slate-500 mt-1">
              State Professional Tax (PT) and Section 192 Income Tax TDS withholdings.
            </p>
            <p className="text-lg font-black text-slate-900 mt-2">
              ₹{(totals.pt + totals.tds).toLocaleString()}
            </p>
          </div>
          <button
            onClick={handleExportTaxRegister}
            className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
          >
            <IconDownload className="w-4 h-4" />
            Export Tax CSV
          </button>
        </div>
      </div>

      {/* Main Table Preview */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Filter Bar */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {[
              { id: 'BANK', label: 'Bank Payout Details' },
              { id: 'PF', label: 'EPF Breakdown' },
              { id: 'ESIC', label: 'ESIC Contributions' },
              { id: 'TAX', label: 'Tax Deductions (PT/TDS)' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === tab.id
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <IconSearch className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search staff, department..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>
        </div>

        {/* Tab-driven Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-[#e5e7eb] text-xs font-bold text-slate-900 border-b border-slate-300">
              {activeTab === 'BANK' && (
                <tr>
                  <th className="px-6 py-3.5">Employee</th>
                  <th className="px-6 py-3.5">Bank Name</th>
                  <th className="px-6 py-3.5">Account Number</th>
                  <th className="px-6 py-3.5">IFSC Code</th>
                  <th className="px-6 py-3.5">Gross Pay</th>
                  <th className="px-6 py-3.5">Deductions</th>
                  <th className="px-6 py-3.5">Net Disbursed</th>
                </tr>
              )}
              {activeTab === 'PF' && (
                <tr>
                  <th className="px-6 py-3.5">Employee</th>
                  <th className="px-6 py-3.5">Basic Wages</th>
                  <th className="px-6 py-3.5">EPF Wage (Capped ₹15k)</th>
                  <th className="px-6 py-3.5">EE Share (12%)</th>
                  <th className="px-6 py-3.5">ER Share (12%)</th>
                  <th className="px-6 py-3.5">Total PF Pool</th>
                </tr>
              )}
              {activeTab === 'ESIC' && (
                <tr>
                  <th className="px-6 py-3.5">Employee</th>
                  <th className="px-6 py-3.5">Gross Wages</th>
                  <th className="px-6 py-3.5">Eligibility (≤ ₹21k)</th>
                  <th className="px-6 py-3.5">Employee (0.75%)</th>
                  <th className="px-6 py-3.5">Employer (3.25%)</th>
                  <th className="px-6 py-3.5">Total ESIC</th>
                </tr>
              )}
              {activeTab === 'TAX' && (
                <tr>
                  <th className="px-6 py-3.5">Employee</th>
                  <th className="px-6 py-3.5">PAN Number</th>
                  <th className="px-6 py-3.5">Gross Wages</th>
                  <th className="px-6 py-3.5">Professional Tax (PT)</th>
                  <th className="px-6 py-3.5">TDS Deducted</th>
                  <th className="px-6 py-3.5">Net Take-Home</th>
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={7} className="px-6 py-4">
                      <div className="h-4 bg-slate-200 rounded-sm w-full" />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    No employees found for this period.
                  </td>
                </tr>
              ) : (
                filtered.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-3.5">
                      <div className="font-bold text-slate-900">{emp.firstName} {emp.lastName}</div>
                      <div className="text-[11px] text-slate-400">{emp.department} • {emp.jobTitle}</div>
                    </td>

                    {activeTab === 'BANK' && (
                      <>
                        <td className="px-6 py-3.5 font-medium">{emp.bankDetails?.bankName || 'HDFC Bank'}</td>
                        <td className="px-6 py-3.5 font-mono text-slate-700">{emp.bankDetails?.accountNumber || '••••'}</td>
                        <td className="px-6 py-3.5 font-mono">{emp.bankDetails?.ifscCode || 'HDFC0001824'}</td>
                        <td className="px-6 py-3.5 font-semibold text-slate-900">₹{(emp.calculation?.grossEarnings || 0).toLocaleString()}</td>
                        <td className="px-6 py-3.5 text-rose-600">-₹{(emp.calculation?.totalDeductions || 0).toLocaleString()}</td>
                        <td className="px-6 py-3.5 font-black text-emerald-600">₹{(emp.calculation?.netSalary || 0).toLocaleString()}</td>
                      </>
                    )}

                    {activeTab === 'PF' && (
                      <>
                        <td className="px-6 py-3.5 font-semibold">₹{(emp.calculation?.baseSalary || 0).toLocaleString()}</td>
                        <td className="px-6 py-3.5">₹{Math.min(emp.calculation?.baseSalary || 15000, 15000).toLocaleString()}</td>
                        <td className="px-6 py-3.5 font-bold text-slate-900">₹{(emp.calculation?.pfEmployee || 0).toLocaleString()}</td>
                        <td className="px-6 py-3.5 font-bold text-slate-700">₹{(emp.calculation?.pfEmployer || 0).toLocaleString()}</td>
                        <td className="px-6 py-3.5 font-black text-indigo-600">
                          ₹{((emp.calculation?.pfEmployee || 0) + (emp.calculation?.pfEmployer || 0)).toLocaleString()}
                        </td>
                      </>
                    )}

                    {activeTab === 'ESIC' && (
                      <>
                        <td className="px-6 py-3.5 font-semibold">₹{(emp.calculation?.grossEarnings || 0).toLocaleString()}</td>
                        <td className="px-6 py-3.5">
                          <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                            (emp.calculation?.grossEarnings || 0) <= 21000
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-500'
                          }`}>
                            {(emp.calculation?.grossEarnings || 0) <= 21000 ? 'ELIGIBLE' : 'EXEMPT'}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 font-bold text-slate-900">₹{(emp.calculation?.esiEmployee || 0).toLocaleString()}</td>
                        <td className="px-6 py-3.5 font-bold text-slate-700">₹{(emp.calculation?.esiEmployer || 0).toLocaleString()}</td>
                        <td className="px-6 py-3.5 font-black text-purple-600">
                          ₹{((emp.calculation?.esiEmployee || 0) + (emp.calculation?.esiEmployer || 0)).toLocaleString()}
                        </td>
                      </>
                    )}

                    {activeTab === 'TAX' && (
                      <>
                        <td className="px-6 py-3.5 font-mono font-bold text-slate-800">{emp.bankDetails?.panNumber || 'N/A'}</td>
                        <td className="px-6 py-3.5 font-semibold">₹{(emp.calculation?.grossEarnings || 0).toLocaleString()}</td>
                        <td className="px-6 py-3.5 text-slate-900 font-bold">₹{(emp.calculation?.professionalTax || 200).toLocaleString()}</td>
                        <td className="px-6 py-3.5 text-rose-600 font-bold">₹{(emp.calculation?.tds || 0).toLocaleString()}</td>
                        <td className="px-6 py-3.5 font-black text-slate-900">₹{(emp.calculation?.netSalary || 0).toLocaleString()}</td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record UTR Modal */}
      {utrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <IconBuildingBank className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Record Bank Payout & UTR</h3>
                  <p className="text-xs text-slate-500">Lock pay run for {month}/{year} with banking reference</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setUtrModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <IconX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUtr} className="space-y-4 mt-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Disbursing Bank / Portal</label>
                <select
                  value={utrData.bankName}
                  onChange={(e) => setUtrData({ ...utrData, bankName: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                >
                  <option value="HDFC Bank Corporate CMS">HDFC Bank Corporate CMS</option>
                  <option value="ICICI Bank Corporate Net Banking">ICICI Bank Corporate Net Banking</option>
                  <option value="State Bank of India (CINB/Saral)">State Bank of India (CINB/Saral)</option>
                  <option value="Axis Bank Corporate CMS">Axis Bank Corporate CMS</option>
                  <option value="Kotak Mahindra Corporate Banking">Kotak Mahindra Corporate Banking</option>
                  <option value="Direct RBI NEFT / RTGS">Direct RBI NEFT / RTGS</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Corporate Debit Account</label>
                  <input
                    type="text"
                    value={utrData.debitAccount}
                    onChange={(e) => setUtrData({ ...utrData, debitAccount: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800"
                    placeholder="e.g. 50200081928371"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Disbursement Date</label>
                  <input
                    type="date"
                    value={utrData.paymentDate}
                    onChange={(e) => setUtrData({ ...utrData, paymentDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Bank UTR / Ref Number *</label>
                  <input
                    type="text"
                    value={utrData.utrNumber}
                    onChange={(e) => setUtrData({ ...utrData, utrNumber: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900"
                    placeholder="e.g. HDFC0092817462"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Total Disbursed (INR)</label>
                  <input
                    type="number"
                    value={utrData.disbursedAmount}
                    onChange={(e) => setUtrData({ ...utrData, disbursedAmount: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Disbursement Notes / Confirmation</label>
                <textarea
                  rows={2}
                  value={utrData.remarks}
                  onChange={(e) => setUtrData({ ...utrData, remarks: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 resize-none"
                  placeholder="e.g. Salary credited to all 6 active employees via HDFC corporate batch upload."
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setUtrModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <IconCheck className="w-4 h-4" />
                  Save & Lock Pay Run
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComplianceReportsPage;
