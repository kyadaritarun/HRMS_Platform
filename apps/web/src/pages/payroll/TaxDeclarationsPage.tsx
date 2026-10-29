import React, { useState, useEffect, useMemo } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import TablePagination from '../../components/common/TablePagination';
import {
  IconFileCertificate,
  IconShieldCheck,
  IconCheck,
  IconX,
  IconSearch,
  IconFilter,
  IconDownload,
  IconEye,
  IconLock,
  IconFileText,
  IconPrinter,
  IconCalendar,
  IconReceipt2,
  IconBuildingBank,
} from '@tabler/icons-react';

export interface TaxEmployee {
  id: number;
  name: string;
  email: string;
  pan: string;
  department: string;
  regime: 'OLD_REGIME' | 'NEW_REGIME';
  grossSalary: number;
  section80CDeclared: number;
  section80CVerified: number;
  section80DDeclared: number;
  section80DVerified: number;
  hraDeclared: number;
  hraVerified: number;
  homeLoanInterestDeclared: number;
  homeLoanInterestVerified: number;
  status: 'PENDING_REVIEW' | 'VERIFIED' | 'LOCKED';
  proofFilesCount: number;
}

export const TaxDeclarationsPage: React.FC = () => {
  const { user } = useAuth();
  const isFinanceOrAdmin = user?.role === 'FINANCE' || user?.role === 'COMPANY_ADMIN' || user?.role === 'PRODUCT_SUPER_ADMIN';

  const [records, setRecords] = useState<TaxEmployee[]>([]);
  const [financialYear, setFinancialYear] = useState('2026-2027');
  const [isLoading, setIsLoading] = useState(false);

  const fetchTaxDeclarations = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/payroll/tax-declarations', { params: { financialYear } });
      setRecords(res.data?.records || []);
    } catch (err) {
      console.error('Failed to load tax declarations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTaxDeclarations();
  }, [financialYear]);

  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'VERIFIED' | 'LOCKED'>('ALL');
  const [search, setSearch] = useState('');
  const [selectedEmp, setSelectedEmp] = useState<TaxEmployee | null>(null);
  const [isForm16ModalOpen, setIsForm16ModalOpen] = useState(false);
  const [form16Target, setForm16Target] = useState<TaxEmployee | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (!isFinanceOrAdmin && r.id !== user?.id) {
        return false;
      }

      if (activeTab === 'PENDING' && r.status !== 'PENDING_REVIEW') return false;
      if (activeTab === 'VERIFIED' && r.status !== 'VERIFIED') return false;
      if (activeTab === 'LOCKED' && r.status !== 'LOCKED') return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          r.name.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q) ||
          r.pan.toLowerCase().includes(q) ||
          r.department.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [records, activeTab, search, isFinanceOrAdmin, user?.id]);

  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, currentPage, pageSize]);

  // Metrics
  const metrics = useMemo(() => {
    const total = records.length;
    const pending = records.filter((r) => r.status === 'PENDING_REVIEW').length;
    const verified = records.filter((r) => r.status === 'VERIFIED').length;
    const locked = records.filter((r) => r.status === 'LOCKED').length;
    const totalTaxSaved = records.reduce((acc, r) => {
      const ded = r.section80CVerified + r.section80DVerified + r.hraVerified + r.homeLoanInterestVerified;
      return acc + Math.round(ded * 0.2); // avg 20% tax slab saved
    }, 0);

    return { total, pending, verified, locked, totalTaxSaved };
  }, [records]);

  const handleVerify = async (empId: number) => {
    const target = records.find((r) => r.id === empId);
    if (!target) return;

    try {
      await api.post('/payroll/tax-declarations/verify', {
        employeeId: empId,
        financialYear,
        section80CVerified: target.section80CDeclared,
        section80DVerified: target.section80DDeclared,
        hraVerified: target.hraDeclared,
        homeLoanInterestVerified: target.homeLoanInterestDeclared,
      });

      setRecords((prev) =>
        prev.map((r) =>
          r.id === empId
            ? {
              ...r,
              status: 'VERIFIED',
              section80CVerified: r.section80CDeclared,
              section80DVerified: r.section80DDeclared,
              hraVerified: r.hraDeclared,
              homeLoanInterestVerified: r.homeLoanInterestDeclared,
            }
            : r
        )
      );
      if (selectedEmp?.id === empId) {
        setSelectedEmp((prev) => prev ? { ...prev, status: 'VERIFIED' } : null);
      }
    } catch (err) {
      console.error('Failed to verify tax declaration:', err);
    }
  };

  const handleLockAll = async () => {
    if (!window.confirm('Lock all verified tax proof declarations for the upcoming payroll run?')) return;
    try {
      await api.post('/payroll/tax-declarations/lock-all', { financialYear });
      setRecords((prev) =>
        prev.map((r) => (r.status === 'VERIFIED' ? { ...r, status: 'LOCKED' } : r))
      );
    } catch (err) {
      console.error('Failed to lock tax declarations:', err);
    }
  };

  const handleOpenForm16 = (emp: TaxEmployee) => {
    setForm16Target(emp);
    setIsForm16ModalOpen(true);
  };

  const calculateTaxableIncome = (emp: TaxEmployee) => {
    if (emp.regime === 'NEW_REGIME') {
      const standardDed = 75000;
      return Math.max(0, emp.grossSalary - standardDed);
    }
    const standardDed = 50000;
    const deductions =
      emp.section80CVerified +
      emp.section80DVerified +
      emp.hraVerified +
      emp.homeLoanInterestVerified;
    return Math.max(0, emp.grossSalary - standardDed - deductions);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <IconFileCertificate className="w-5 h-5 text-indigo-600 shrink-0" />
            <span>Tax Proofs & Form 16 Desk</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Review employee investment declarations (80C, 80D, HRA), audit proof attachments, and generate Form 16.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <select
            value={financialYear}
            onChange={(e) => setFinancialYear(e.target.value)}
            className="px-3.5 py-2 text-xs font-bold bg-white border border-slate-200 rounded-xl text-slate-700 shadow-2xs"
          >
            <option value="2026-2027">FY 2026-2027 (AY 2027-2028)</option>
            <option value="2025-2026">FY 2025-2026 (AY 2026-2027)</option>
          </select>

          {isFinanceOrAdmin && (
            <button
              onClick={handleLockAll}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[#5E4BE2] to-[#4B39C3] hover:from-[#5340D4] hover:to-[#4130B4] text-white text-xs font-bold rounded-xl shadow-sm shadow-indigo-600/25 active:scale-[0.98] transition-all cursor-pointer"
            >
              <IconLock className="w-4 h-4" />
              <span>Lock Verified for Payroll</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">Total Declarations</span>
            <span className="w-7 h-7 rounded-lg bg-indigo-50 text-[#5E4BE2] flex items-center justify-center">
              <IconFileText className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-black text-slate-900">{metrics.total}</div>
          <p className="text-[11px] text-slate-400 mt-1">Across Old & New Tax Regimes</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">Pending Proof Review</span>
            <span className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <IconShieldCheck className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-black text-amber-600">{metrics.pending}</div>
          <p className="text-[11px] text-slate-400 mt-1">Require Finance proof audit</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">Verified & Locked</span>
            <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <IconCheck className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-black text-emerald-700">
            {metrics.verified + metrics.locked}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">TDS adjusted in monthly payroll</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">Est. Tax Savings</span>
            <span className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <IconReceipt2 className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-black text-teal-700">
            ₹{metrics.totalTaxSaved.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Total tax rebate passed to employees</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center bg-slate-50/80 border border-slate-200/70 p-1 rounded-xl shrink-0">
          {(['ALL', 'PENDING', 'VERIFIED', 'LOCKED'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === tab
                  ? 'bg-white text-[#5E4BE2] shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
                }`}
            >
              {tab === 'ALL'
                ? 'All Declarations'
                : tab === 'PENDING'
                  ? 'Pending Audit'
                  : tab === 'VERIFIED'
                    ? 'Verified'
                    : 'Locked'}
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-md">
          <IconSearch className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by employee name, PAN, or department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs font-medium bg-slate-50/70 border border-slate-200/80 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#5E4BE2]/20 focus:border-[#5E4BE2] transition-all text-slate-800"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Employee</th>
                <th className="px-5 py-3.5">PAN & Regime</th>
                <th className="px-5 py-3.5 text-right">Gross Salary</th>
                <th className="px-5 py-3.5 text-right">80C Verified</th>
                <th className="px-5 py-3.5 text-right">80D (Health)</th>
                <th className="px-5 py-3.5 text-right">HRA Verified</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {paginatedRecords.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="font-bold text-slate-900">{emp.name}</div>
                    <div className="text-[11px] text-slate-400">{emp.email}</div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="font-mono font-bold text-slate-800">{emp.pan}</div>
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${emp.regime === 'NEW_REGIME'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-purple-50 text-purple-700 border border-purple-200'
                        }`}
                    >
                      {emp.regime === 'NEW_REGIME' ? 'New Regime (115BAC)' : 'Old Regime'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right font-black text-slate-900">
                    ₹{emp.grossSalary.toLocaleString('en-IN')}
                  </td>
                  <td className="px-5 py-3.5 text-right font-bold text-emerald-700">
                    ₹{emp.section80CVerified.toLocaleString('en-IN')}
                  </td>
                  <td className="px-5 py-3.5 text-right font-bold text-emerald-700">
                    ₹{emp.section80DVerified.toLocaleString('en-IN')}
                  </td>
                  <td className="px-5 py-3.5 text-right font-bold text-emerald-700">
                    ₹{emp.hraVerified.toLocaleString('en-IN')}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${emp.status === 'VERIFIED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : emp.status === 'LOCKED'
                            ? 'bg-slate-100 text-slate-700 border border-slate-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                    >
                      {emp.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {isFinanceOrAdmin && emp.status === 'PENDING_REVIEW' && (
                        <button
                          onClick={() => handleVerify(emp.id)}
                          className="px-2.5 py-1 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-2xs transition-colors cursor-pointer"
                        >
                          Verify Proofs
                        </button>
                      )}
                      <button
                        onClick={() => handleOpenForm16(emp)}
                        className="px-2.5 py-1 text-[11px] font-bold bg-indigo-50 hover:bg-indigo-100 text-[#5E4BE2] rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                        title="Generate Form 16 PDF"
                      >
                        <IconFileCertificate className="w-3.5 h-3.5" />
                        <span>Form 16</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredRecords.length > 0 && (
          <TablePagination
            currentPage={currentPage}
            totalItems={filteredRecords.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            pageSizeOptions={[5, 8, 15, 25]}
            itemName="tax declarations"
          />
        )}
      </div>

      {/* Form 16 Preview & Download Modal */}
      {isForm16ModalOpen && form16Target && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-[#5E4BE2] flex items-center justify-center">
                  <IconFileCertificate className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">FORM NO. 16 (Part A & B)</h3>
                  <p className="text-xs text-slate-400">
                    Certificate under section 203 of the Income-tax Act, 1961 for tax deducted at source
                  </p>
                </div>
              </div>
              <button onClick={() => setIsForm16ModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <IconX className="w-5 h-5" />
              </button>
            </div>

            {/* Certificate Body */}
            <div className="border border-slate-200 rounded-2xl p-5 space-y-4 text-xs font-mono bg-slate-50/40">
              <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-200">
                <div>
                  <span className="text-slate-400 block font-sans">Name and Address of the Employer:</span>
                  <span className="font-bold text-slate-900 font-sans">KYADARI TECHNOLOGIES PVT LTD</span>
                  <span className="block text-slate-500 font-sans">Tech Park, Hyderabad, India</span>
                  <span className="block font-bold mt-1">TAN: HYDK12891A</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-sans">Name and Designation of the Employee:</span>
                  <span className="font-bold text-slate-900 font-sans">{form16Target.name}</span>
                  <span className="block text-slate-500 font-sans">{form16Target.department}</span>
                  <span className="block font-bold mt-1">PAN: {form16Target.pan}</span>
                </div>
              </div>

              {/* Summary Table */}
              <div className="space-y-2 pt-2">
                <div className="flex justify-between py-1 border-b border-slate-200 font-bold font-sans text-slate-700">
                  <span>Gross Salary under section 17(1)</span>
                  <span>₹{form16Target.grossSalary.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200 text-slate-600 font-sans">
                  <span>Standard Deduction under section 16(ia)</span>
                  <span>- ₹{form16Target.regime === 'NEW_REGIME' ? '75,000' : '50,000'}</span>
                </div>
                {form16Target.regime === 'OLD_REGIME' && (
                  <>
                    <div className="flex justify-between py-1 border-b border-slate-200 text-slate-600 font-sans">
                      <span>Deduction under Section 80C</span>
                      <span>- ₹{form16Target.section80CVerified.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200 text-slate-600 font-sans">
                      <span>Deduction under Section 80D (Health Insurance)</span>
                      <span>- ₹{form16Target.section80DVerified.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200 text-slate-600 font-sans">
                      <span>Exemption under Section 10(13A) for HRA</span>
                      <span>- ₹{form16Target.hraVerified.toLocaleString('en-IN')}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between py-2 border-b-2 border-slate-900 font-black font-sans text-sm text-slate-900">
                  <span>Total Taxable Income</span>
                  <span>₹{calculateTaxableIncome(form16Target).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between py-2 font-black font-sans text-sm text-emerald-700">
                  <span>Total Tax Deducted and Deposited to Govt (TDS)</span>
                  <span>₹{Math.round(calculateTaxableIncome(form16Target) * 0.12).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-5">
              <button
                type="button"
                onClick={() => setIsForm16ModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  window.print();
                }}
                className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-[#5E4BE2] to-[#4B39C3] hover:from-[#5340D4] hover:to-[#4130B4] rounded-xl shadow-sm shadow-indigo-600/25 flex items-center gap-1.5 cursor-pointer"
              >
                <IconPrinter className="w-4 h-4" />
                <span>Print / Save Form 16 PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaxDeclarationsPage;
