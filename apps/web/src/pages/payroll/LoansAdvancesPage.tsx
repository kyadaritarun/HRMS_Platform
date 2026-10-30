import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import TablePagination from '../../components/common/TablePagination';
import {
  IconPigMoney,
  IconPlus,
  IconCheck,
  IconX,
  IconClock,
  IconAlertCircle,
  IconReceipt2,
  IconCash,
  IconBuildingBank,
  IconSearch,
  IconFilter,
  IconCalculator,
  IconUser,
  IconCalendar,
} from '@tabler/icons-react';

export interface LoanRecord {
  id: string;
  employeeId: number;
  employeeName: string;
  employeeEmail: string;
  department: string;
  type: 'EMERGENCY_ADVANCE' | 'PERSONAL_LOAN' | 'FESTIVAL_ADVANCE' | 'MEDICAL_ASSISTANCE';
  principalAmount: number;
  tenureMonths: number;
  monthlyEmi: number;
  totalRepaid: number;
  balanceRemaining: number;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'DISBURSED' | 'REJECTED' | 'CLOSED';
  appliedDate: string;
  approvedDate?: string;
  disbursedDate?: string;
  utrNumber?: string;
  rejectionReason?: string;
}

export const LoansAdvancesPage: React.FC = () => {
  const { user } = useAuth();
  const isFinanceOrAdmin = user?.role === 'FINANCE' || user?.role === 'COMPANY_ADMIN' || user?.role === 'PRODUCT_SUPER_ADMIN';

  const [loans, setLoans] = useState<LoanRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchLoans = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/payroll/loans');
      setLoans(res.data?.loans || []);
    } catch (err) {
      console.error('Failed to load loans:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const [employees, setEmployees] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'ACTIVE' | 'CLOSED'>('ALL');
  const [search, setSearch] = useState('');
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [isDisburseModalOpen, setIsDisburseModalOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<LoanRecord | null>(null);
  const [disburseUtr, setDisburseUtr] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  // Form State
  const [form, setForm] = useState({
    employeeId: user?.id || 0,
    type: 'EMERGENCY_ADVANCE' as LoanRecord['type'],
    amount: '30000',
    tenureMonths: '3',
    reason: '',
  });

  useEffect(() => {
    fetchLoans();
    api.get('/employees', { params: { pageSize: 100, status: 'ACTIVE' } })
      .then((res) => setEmployees(res.data?.employees || res.data?.items || []))
      .catch((e) => console.error('Failed to load employees:', e));
  }, []);

  // Filtered Loans
  const filteredLoans = useMemo(() => {
    return loans.filter((ln) => {
      // If regular employee, only show their own loans
      if (!isFinanceOrAdmin && ln.employeeId !== user?.id) {
        return false;
      }

      if (activeTab === 'PENDING' && ln.status !== 'PENDING') return false;
      if (activeTab === 'ACTIVE' && ln.status !== 'DISBURSED') return false;
      if (activeTab === 'CLOSED' && ln.status !== 'CLOSED') return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesName = ln.employeeName.toLowerCase().includes(q);
        const matchesId = ln.id.toLowerCase().includes(q);
        const matchesDept = ln.department.toLowerCase().includes(q);
        const matchesReason = ln.reason.toLowerCase().includes(q);
        return matchesName || matchesId || matchesDept || matchesReason;
      }

      return true;
    });
  }, [loans, activeTab, search, isFinanceOrAdmin, user?.id]);

  const paginatedLoans = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLoans.slice(start, start + pageSize);
  }, [filteredLoans, currentPage, pageSize]);

  // Metrics
  const metrics = useMemo(() => {
    const active = loans.filter((l) => l.status === 'DISBURSED');
    const totalOutstanding = active.reduce((acc, l) => acc + l.balanceRemaining, 0);
    const totalDisbursed = loans.filter((l) => ['DISBURSED', 'CLOSED'].includes(l.status)).reduce((acc, l) => acc + l.principalAmount, 0);
    const monthlyRecovery = active.reduce((acc, l) => acc + l.monthlyEmi, 0);
    const pendingCount = loans.filter((l) => l.status === 'PENDING').length;

    return {
      activeCount: active.length,
      totalOutstanding,
      totalDisbursed,
      monthlyRecovery,
      pendingCount,
    };
  }, [loans]);

  // Actions
  const handleApprove = async (loanId: string) => {
    try {
      await api.patch(`/payroll/loans/${loanId}`, { status: 'APPROVED' });
      await fetchLoans();
    } catch (err) {
      console.error('Failed to approve loan:', err);
    }
  };

  const handleOpenDisburseModal = (loan: LoanRecord) => {
    setSelectedLoan(loan);
    setDisburseUtr(`HDFCN${Date.now().toString().slice(-8)}`);
    setIsDisburseModalOpen(true);
  };

  const handleConfirmDisburse = async () => {
    if (!selectedLoan || !disburseUtr.trim()) return;
    try {
      await api.patch(`/payroll/loans/${selectedLoan.id}`, {
        status: 'DISBURSED',
        utrNumber: disburseUtr.trim(),
      });
      await fetchLoans();
      setIsDisburseModalOpen(false);
      setSelectedLoan(null);
    } catch (err) {
      console.error('Failed to disburse loan:', err);
    }
  };

  const handleReject = async (loanId: string) => {
    const reason = window.prompt('Enter rejection reason:') || 'Policy eligibility not met';
    try {
      await api.patch(`/payroll/loans/${loanId}`, {
        status: 'REJECTED',
        rejectionReason: reason,
      });
      await fetchLoans();
    } catch (err) {
      console.error('Failed to reject loan:', err);
    }
  };

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(form.amount);
    const tenure = Math.max(1, Number(form.tenureMonths));

    try {
      const payload = {
        employeeId: Number(form.employeeId) || user?.id,
        type: form.type,
        amount,
        tenureMonths: tenure,
        reason: form.reason || 'General emergency advance',
      };

      const res = await api.post('/payroll/loans', payload);
      if (res.data?.loan) {
        setLoans((prev) => [res.data.loan, ...prev]);
      } else {
        await fetchLoans();
      }
      setIsApplyModalOpen(false);
      setForm({
        employeeId: user?.id || 0,
        type: 'EMERGENCY_ADVANCE',
        amount: '30000',
        tenureMonths: '3',
        reason: '',
      });
    } catch (err: any) {
      console.error('Failed to apply for loan:', err);
      alert(err.response?.data?.error?.message || 'Failed to submit loan request');
    }
  };

  const getStatusBadge = (status: LoanRecord['status']) => {
    switch (status) {
      case 'DISBURSED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Active / Disbursed
          </span>
        );
      case 'APPROVED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            Approved (Ready for Payout)
          </span>
        );
      case 'PENDING':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            Pending Review
          </span>
        );
      case 'CLOSED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
            Fully Settled
          </span>
        );
      case 'REJECTED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            Rejected
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <IconPigMoney className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>Loans & Salary Advances</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage employee emergency advances, interest-free loans, and monthly EMI payroll deductions.
          </p>
        </div>

        <button
          onClick={() => setIsApplyModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
        >
          <IconPlus className="w-4 h-4" />
          <span>Request Advance / Loan</span>
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">Active Advances</span>
            <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <IconCash className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-black text-slate-900">
            ₹{metrics.totalOutstanding.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {metrics.activeCount} employee loans currently active
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">Monthly EMI Recovery</span>
            <span className="w-7 h-7 rounded-lg bg-indigo-50 text-[#5E4BE2] flex items-center justify-center">
              <IconReceipt2 className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-black text-slate-900">
            ₹{metrics.monthlyRecovery.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Auto-deducted from upcoming monthly payslips
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">Total Disbursed (FY)</span>
            <span className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <IconBuildingBank className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-black text-slate-900">
            ₹{metrics.totalDisbursed.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Cumulative financial assistance this year
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">Pending Requests</span>
            <span className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <IconClock className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-black text-slate-900">
            {metrics.pendingCount}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Awaiting Finance approval & UTR disbursement
          </p>
        </div>
      </div>

      {/* Toolbar & Filter Tabs */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center bg-slate-50/80 border border-slate-200/70 p-1 rounded-xl shrink-0">
          {(['ALL', 'PENDING', 'ACTIVE', 'CLOSED'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === tab
                  ? 'bg-white text-emerald-600 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
                }`}
            >
              {tab === 'ALL'
                ? 'All Records'
                : tab === 'PENDING'
                  ? 'Pending Review'
                  : tab === 'ACTIVE'
                    ? 'Active Payouts'
                    : 'Settled'}
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-md">
          <IconSearch className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by employee name, loan ID, or department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs font-medium bg-slate-50/70 border border-slate-200/80 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 transition-all text-slate-800"
          />
        </div>
      </div>

      {/* Loans Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#e5e7eb] text-xs font-bold text-slate-900 border-b border-slate-300">
              <tr>
                <th className="px-5 py-3.5">Loan ID</th>
                <th className="px-5 py-3.5">Employee</th>
                <th className="px-5 py-3.5">Category</th>
                <th className="px-5 py-3.5 text-right">Principal</th>
                <th className="px-5 py-3.5 text-center">Tenure</th>
                <th className="px-5 py-3.5 text-right">Monthly EMI</th>
                <th className="px-5 py-3.5 text-right">Balance</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {paginatedLoans.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center text-slate-400">
                    <IconPigMoney className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-700">No loan records found</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Submit a new salary advance request using the button above.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedLoans.map((loan) => (
                  <tr key={loan.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-bold text-slate-900">
                      {loan.id}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-900">{loan.employeeName}</div>
                      <div className="text-[11px] text-slate-400">{loan.department}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-semibold text-slate-700">
                        {loan.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-black text-slate-900">
                      ₹{loan.principalAmount.toLocaleString('en-IN')}
                    </td>
                    <td className="px-5 py-3.5 text-center font-bold text-slate-600">
                      {loan.tenureMonths} mos
                    </td>
                    <td className="px-5 py-3.5 text-right font-black text-[#5E4BE2]">
                      ₹{loan.monthlyEmi.toLocaleString('en-IN')}
                    </td>
                    <td className="px-5 py-3.5 text-right font-black text-rose-600">
                      ₹{loan.balanceRemaining.toLocaleString('en-IN')}
                    </td>
                    <td className="px-5 py-3.5">{getStatusBadge(loan.status)}</td>
                    <td className="px-5 py-3.5 text-right">
                      {isFinanceOrAdmin && (
                        <div className="flex items-center justify-end gap-1.5">
                          {loan.status === 'PENDING' && (
                            <>
                              <button
                                onClick={() => handleApprove(loan.id)}
                                className="px-3 py-1.5 text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-[#5E4BE2] rounded-xl shadow-2xs transition-colors cursor-pointer"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleReject(loan.id)}
                                className="px-3 py-1.5 text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl shadow-2xs transition-colors cursor-pointer"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {loan.status === 'APPROVED' && (
                            <button
                              onClick={() => handleOpenDisburseModal(loan)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-2xs transition-colors cursor-pointer"
                            >
                              <IconCash className="w-3.5 h-3.5" />
                              <span>Disburse</span>
                            </button>
                          )}
                          {loan.status === 'DISBURSED' && loan.utrNumber && (
                            <span
                              className="text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md"
                              title={`UTR: ${loan.utrNumber}`}
                            >
                              UTR: {loan.utrNumber.slice(-6)}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {filteredLoans.length > 0 && (
          <TablePagination
            currentPage={currentPage}
            totalItems={filteredLoans.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            pageSizeOptions={[5, 8, 15, 25]}
            itemName="loans"
          />
        )}
      </div>

      {/* Disburse Modal */}
      {isDisburseModalOpen && selectedLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-900 text-sm">Record Bank Disbursement</h3>
              <button onClick={() => setIsDisburseModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <IconX className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Disbursing <strong>₹{selectedLoan.principalAmount.toLocaleString('en-IN')}</strong> to{' '}
              <strong>{selectedLoan.employeeName}</strong>.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Bank UTR / Transaction Reference *</label>
                <input
                  type="text"
                  required
                  value={disburseUtr}
                  onChange={(e) => setDisburseUtr(e.target.value)}
                  placeholder="e.g. HDFCN2610269412"
                  className="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 text-slate-800"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDisburseModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDisburse}
                  className="px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Confirm Payout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== REQUEST SALARY ADVANCE RIGHT-SIDE DRAWER ===================== */}
      {isApplyModalOpen && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] overflow-hidden bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
          onClick={() => setIsApplyModalOpen(false)}
        >
          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div
              className="w-screen max-w-md bg-white shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-300 border-l border-slate-100"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <IconPigMoney className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Request Salary Advance</h3>
                    <p className="text-xs text-slate-500">Apply for emergency loans or salary advances</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsApplyModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <IconX className="w-5 h-5" />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleApplySubmit} className="flex-1 flex flex-col justify-between overflow-y-auto">
                <div className="p-5 space-y-4 text-xs">
                  {isFinanceOrAdmin && (
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Employee *</label>
                      <select
                        value={form.employeeId}
                        onChange={(e) => setForm({ ...form, employeeId: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white font-medium text-slate-800"
                      >
                        {employees.map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.firstName} {emp.lastName} ({emp.department?.name || 'Staff'})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Advance Type *</label>
                    <select
                      value={form.type}
                      onChange={(e) => setForm({ ...form, type: e.target.value as any })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white font-medium text-slate-800"
                    >
                      <option value="EMERGENCY_ADVANCE">Emergency Salary Advance</option>
                      <option value="FESTIVAL_ADVANCE">Festival Advance (Interest-Free)</option>
                      <option value="MEDICAL_ASSISTANCE">Medical Expense Advance</option>
                      <option value="PERSONAL_LOAN">Personal Company Loan</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Amount (₹) *</label>
                      <input
                        type="number"
                        min="5000"
                        step="5000"
                        required
                        value={form.amount}
                        onChange={(e) => setForm({ ...form, amount: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white font-bold text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Tenure (Months) *</label>
                      <select
                        value={form.tenureMonths}
                        onChange={(e) => setForm({ ...form, tenureMonths: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white font-medium text-slate-800"
                      >
                        <option value="1">1 Month (Next Payslip)</option>
                        <option value="2">2 Months</option>
                        <option value="3">3 Months</option>
                        <option value="6">6 Months</option>
                        <option value="12">12 Months</option>
                      </select>
                    </div>
                  </div>

                  {/* EMI Calculator Preview */}
                  <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-3 flex items-center justify-between text-emerald-950">
                    <div className="flex items-center gap-2">
                      <IconCalculator className="w-4 h-4 text-emerald-600" />
                      <span className="font-bold text-[11px]">Monthly EMI Deduction:</span>
                    </div>
                    <span className="font-black text-sm text-emerald-700">
                      ₹{Math.round(Number(form.amount || 0) / Math.max(1, Number(form.tenureMonths || 1))).toLocaleString('en-IN')} / mo
                    </span>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Reason / Purpose *</label>
                    <textarea
                      required
                      rows={4}
                      value={form.reason}
                      onChange={(e) => setForm({ ...form, reason: e.target.value })}
                      placeholder="Describe the reason for the advance request..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white font-medium text-slate-800 resize-none"
                    />
                  </div>
                </div>

                {/* Footer Action Buttons */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsApplyModalOpen(false)}
                    className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200/60 rounded-xl cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs cursor-pointer transition-colors"
                  >
                    Submit Application
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default LoansAdvancesPage;
