import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
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
  IconChevronDown,
  IconMessageDots,
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

export interface LoansAdvancesPageProps {
  selfServiceOnly?: boolean;
}

export const LoansAdvancesPage: React.FC<LoansAdvancesPageProps> = ({ selfServiceOnly }) => {
  const { user } = useAuth();

  let currentPath = '';
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const location = useLocation();
    currentPath = location.pathname;
  } catch {
    currentPath = typeof window !== 'undefined' ? window.location?.pathname || '' : '';
  }

  const isFinanceOrAdmin = user?.role === 'FINANCE' || user?.role === 'COMPANY_ADMIN' || user?.role === 'PRODUCT_SUPER_ADMIN';

  // Determine if this is the self-service view (e.g. /loans-advances) vs payroll management view (/payroll/loans-advances)
  const isSelfService =
    selfServiceOnly !== undefined
      ? selfServiceOnly
      : currentPath === '/loans-advances';

  const isFinanceDesk = !isSelfService && isFinanceOrAdmin;

  const [loans, setLoans] = useState<LoanRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchLoans = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/payroll/loans', {
        params: isSelfService ? { scope: 'mine' } : undefined,
      });
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

  // Rejection Modal State
  const [rejectModalLoan, setRejectModalLoan] = useState<LoanRecord | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmittingReject, setIsSubmittingReject] = useState(false);

  // Detail & Feedback Drawer State
  const [selectedDetailLoan, setSelectedDetailLoan] = useState<LoanRecord | null>(null);

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
    if (isFinanceDesk) {
      api.get('/employees', { params: { pageSize: 100, status: 'ACTIVE' } })
        .then((res) => setEmployees(res.data?.employees || res.data?.items || []))
        .catch((e) => console.error('Failed to load employees:', e));
    }
  }, [isSelfService, isFinanceDesk]);

  // Filtered Loans
  const filteredLoans = useMemo(() => {
    return loans.filter((ln) => {
      // In self-service mode (or for regular employees), ONLY show their own loans
      if ((isSelfService || !isFinanceOrAdmin) && ln.employeeId !== user?.id) {
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
  }, [loans, activeTab, search, isFinanceOrAdmin, isSelfService, user?.id]);

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

  const handleOpenRejectModal = (loan: LoanRecord) => {
    setRejectModalLoan(loan);
    setRejectionReason('Policy eligibility criteria not met');
  };

  const handleCloseRejectModal = () => {
    setRejectModalLoan(null);
    setRejectionReason('');
    setIsSubmittingReject(false);
  };

  const handleConfirmReject = async () => {
    if (!rejectModalLoan || !rejectionReason.trim()) return;
    setIsSubmittingReject(true);
    try {
      await api.patch(`/payroll/loans/${rejectModalLoan.id}`, {
        status: 'REJECTED',
        rejectionReason: rejectionReason.trim(),
      });
      await fetchLoans();
      handleCloseRejectModal();
    } catch (err) {
      console.error('Failed to reject loan:', err);
    } finally {
      setIsSubmittingReject(false);
    }
  };

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(form.amount);
    const tenure = Math.max(1, Number(form.tenureMonths));

    try {
      const payload = {
        employeeId: isFinanceDesk ? (Number(form.employeeId) || user?.id) : user?.id,
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

  const getStatusBadge = (status: LoanRecord['status'], rejectionReason?: string) => {
    switch (status) {
      case 'DISBURSED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
            Active / Disbursed
          </span>
        );
      case 'APPROVED':
        return (
          <span
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 whitespace-nowrap"
            title="Approved • Ready for bank payout"
          >
            Approved
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
            Pending Review
          </span>
        );
      case 'CLOSED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 whitespace-nowrap">
            Fully Settled
          </span>
        );
      case 'REJECTED':
        return (
          <span
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 whitespace-nowrap"
            title={rejectionReason ? `Reason: ${rejectionReason}` : undefined}
          >
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
          <p className="text-xs text-slate-500 font-medium mt-0.5">
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

      {/* Toolbar: Search on Left & Status Dropdown Filter on Right */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search on the Left */}
        <div className="relative flex-1 max-w-md">
          <IconSearch className="w-4 h-4 text-slate-500 font-medium absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by employee name, loan ID, or department..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 text-xs font-medium bg-slate-50/70 border border-slate-200/80 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 transition-all text-slate-800"
          />
        </div>

        {/* Dropdown Filter on the Right */}
        <div className="relative min-w-[190px] shrink-0">
          <select
            aria-label="Filter by status"
            value={activeTab}
            onChange={(e) => {
              setActiveTab(e.target.value as 'ALL' | 'PENDING' | 'ACTIVE' | 'CLOSED');
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-8 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200/90 rounded-xl shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-emerald-600/20 appearance-none cursor-pointer hover:border-slate-300 transition-colors"
          >
            <option value="ALL">All Records</option>
            <option value="PENDING">Pending Review</option>
            <option value="ACTIVE">Active Payouts</option>
            <option value="CLOSED">Settled</option>
          </select>
          <IconFilter className="w-3.5 h-3.5 text-slate-500 font-medium absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <IconChevronDown className="w-3.5 h-3.5 text-slate-500 font-medium absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
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
                <th className="px-5 py-3.5 whitespace-nowrap">Status</th>
                <th className="px-5 py-3.5 text-right whitespace-nowrap">
                  {isFinanceDesk ? 'Actions / Feedback' : 'Finance Feedback'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {paginatedLoans.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center text-slate-500 font-medium">
                    <IconPigMoney className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-700">No loan records found</p>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">
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
                      <div className="text-[11px] text-slate-500 font-medium">{loan.department}</div>
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
                    <td className="px-5 py-3.5 whitespace-nowrap">{getStatusBadge(loan.status, loan.rejectionReason)}</td>
                    <td className="px-5 py-3.5 text-right">
                      {/* 1. REJECTED: Show Finance Feedback like a real message note */}
                      {loan.status === 'REJECTED' && (
                        <div className="flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => setSelectedDetailLoan(loan)}
                            className="group flex flex-col text-left p-2.5 max-w-[280px] w-full bg-rose-50/70 hover:bg-rose-100/70 border border-rose-200 rounded-xl shadow-2xs transition-all cursor-pointer"
                            title="Click to view full feedback note"
                          >
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-rose-700 uppercase tracking-wider mb-1">
                              <IconMessageDots className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                              <span>Finance Feedback</span>
                            </div>
                            <p className="text-xs text-slate-800 font-medium leading-snug line-clamp-2 italic">
                              "{loan.rejectionReason || 'Policy eligibility criteria not met'}"
                            </p>
                          </button>
                        </div>
                      )}

                      {/* 2. PENDING */}
                      {loan.status === 'PENDING' && (
                        isFinanceDesk ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleApprove(loan.id)}
                              title="Approve"
                              className="p-1.5 rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 shadow-2xs transition-colors cursor-pointer"
                            >
                              <IconCheck className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenRejectModal(loan)}
                              title="Reject"
                              className="p-1.5 rounded-lg text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 shadow-2xs transition-colors cursor-pointer"
                            >
                              <IconX className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end">
                            <div className="flex flex-col text-left p-2.5 max-w-[280px] w-full bg-slate-50 border border-slate-200 rounded-xl shadow-2xs">
                              <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-0.5">
                                <IconClock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <span>Status Note</span>
                              </div>
                              <p className="text-xs text-slate-600 font-medium leading-snug">
                                Pending review by Finance
                              </p>
                            </div>
                          </div>
                        )
                      )}

                      {/* 3. APPROVED */}
                      {loan.status === 'APPROVED' && (
                        isFinanceDesk ? (
                          <div className="flex items-center justify-end">
                            <button
                              onClick={() => handleOpenDisburseModal(loan)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-2xs transition-colors cursor-pointer"
                            >
                              <IconCash className="w-3.5 h-3.5" />
                              <span>Disburse</span>
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end">
                            <div className="flex flex-col text-left p-2.5 max-w-[280px] w-full bg-indigo-50/60 border border-indigo-200/80 rounded-xl shadow-2xs">
                              <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-700 uppercase tracking-wider mb-0.5">
                                <IconCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                <span>Finance Update</span>
                              </div>
                              <p className="text-xs text-slate-700 font-medium leading-snug">
                                Approved • Ready for payout
                              </p>
                            </div>
                          </div>
                        )
                      )}

                      {/* 4. DISBURSED */}
                      {loan.status === 'DISBURSED' && (
                        <div className="flex items-center justify-end">
                          <div className="flex flex-col text-left p-2.5 max-w-[280px] w-full bg-emerald-50/60 border border-emerald-200 rounded-xl shadow-2xs">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-0.5">
                              <IconReceipt2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>Disbursement Payout</span>
                            </div>
                            <p className="text-xs font-mono font-bold text-emerald-900 leading-snug">
                              UTR: {loan.utrNumber ? loan.utrNumber : 'Completed'}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* 5. CLOSED */}
                      {loan.status === 'CLOSED' && (
                        <div className="flex items-center justify-end">
                          <div className="flex flex-col text-left p-2.5 max-w-[280px] w-full bg-slate-100 border border-slate-200 rounded-xl shadow-2xs">
                            <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-0.5">
                              Settlement
                            </div>
                            <p className="text-xs text-slate-600 font-medium">
                              Advance settled in full
                            </p>
                          </div>
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

      {/* ===================== DISBURSE MODAL (RIGHT-SIDE DRAWER) ===================== */}
      {isDisburseModalOpen && selectedLoan && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] overflow-hidden bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
          onClick={() => setIsDisburseModalOpen(false)}
        >
          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div
              className="w-screen max-w-md bg-white shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-300 border-l border-slate-100"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                    <IconCash className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Record Bank Disbursement</h3>
                    <p className="text-xs text-slate-500 font-medium">Record banking payout reference & disburse loan</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDisburseModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Close Drawer"
                >
                  <IconX className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-3.5 space-y-1.5 text-emerald-950">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] font-bold text-emerald-800 bg-white border border-emerald-200 px-2 py-0.5 rounded-md">
                      {selectedLoan.id}
                    </span>
                    <span className="text-sm font-black text-emerald-700">
                      ₹{selectedLoan.principalAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="text-xs text-slate-700 font-medium">
                    Beneficiary: <strong>{selectedLoan.employeeName}</strong> ({selectedLoan.department})
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Bank UTR / Transaction Reference <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={disburseUtr}
                    onChange={(e) => setDisburseUtr(e.target.value)}
                    placeholder="e.g. HDFCN2610269412"
                    className="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 text-slate-800 transition-all"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Enter the bank settlement or IMPS / NEFT reference number.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsDisburseModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200/60 rounded-xl cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDisburse}
                  disabled={!disburseUtr.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-xs cursor-pointer transition-colors"
                >
                  <IconCash className="w-4 h-4" />
                  <span>Confirm Payout</span>
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ===================== REJECT LOAN / ADVANCE (RIGHT-SIDE DRAWER) ===================== */}
      {rejectModalLoan && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] overflow-hidden bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
          onClick={handleCloseRejectModal}
        >
          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div
              className="w-screen max-w-md bg-white shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-300 border-l border-slate-100"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                    <IconAlertCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Reject Advance Request</h3>
                    <p className="text-xs text-slate-500 font-medium">Provide a reason for turning down this request</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCloseRejectModal}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Close Drawer"
                >
                  <IconX className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Body (Scrollable) */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {/* Summary Card */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-bold text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                        {rejectModalLoan.id}
                      </span>
                      <span className="text-xs font-bold text-slate-900">
                        {rejectModalLoan.employeeName}
                      </span>
                    </div>
                    <span className="text-xs font-black text-slate-900">
                      ₹{rejectModalLoan.principalAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                    <span>{rejectModalLoan.department}</span>
                    <span>•</span>
                    <span>{rejectModalLoan.type.replace(/_/g, ' ')}</span>
                    <span>•</span>
                    <span>{rejectModalLoan.tenureMonths} mos tenure</span>
                  </div>
                  {rejectModalLoan.reason && (
                    <div className="text-[11px] text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200/60 mt-1">
                      <span className="font-semibold text-slate-700">Applied reason: </span>
                      <span className="italic">"{rejectModalLoan.reason}"</span>
                    </div>
                  )}
                </div>

                {/* Quick Reason Chips */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2">
                    Quick Reason Templates
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      'Policy eligibility criteria not met',
                      'Exceeds permissible advance limit',
                      'Active outstanding advance pending',
                      'Probation tenure requirements not met',
                      'Documentation or purpose unclear',
                    ].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setRejectionReason(preset)}
                        className={`text-[11px] px-2.5 py-1.5 rounded-lg border font-medium transition-colors cursor-pointer text-left ${
                          rejectionReason === preset
                            ? 'bg-rose-50 border-rose-300 text-rose-700 font-bold'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Textarea */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Rejection Reason <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Explain why this request is being rejected..."
                    className="w-full px-3 py-2.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-slate-800 resize-none transition-all"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    This reason will be visible to the employee on their advances dashboard.
                  </p>
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleCloseRejectModal}
                  disabled={isSubmittingReject}
                  className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200/60 rounded-xl cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReject}
                  disabled={!rejectionReason.trim() || isSubmittingReject}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-xs cursor-pointer transition-colors"
                >
                  <IconX className="w-4 h-4" />
                  <span>{isSubmittingReject ? 'Rejecting...' : 'Reject Request'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ===================== VIEW LOAN DETAILS & FEEDBACK DRAWER ===================== */}
      {selectedDetailLoan && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] overflow-hidden bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
          onClick={() => setSelectedDetailLoan(null)}
        >
          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div
              className="w-screen max-w-md bg-white shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-300 border-l border-slate-100"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    selectedDetailLoan.status === 'REJECTED'
                      ? 'bg-rose-50 border border-rose-100 text-rose-600'
                      : selectedDetailLoan.status === 'DISBURSED'
                      ? 'bg-emerald-50 border border-emerald-100 text-emerald-600'
                      : 'bg-indigo-50 border border-indigo-100 text-[#5E4BE2]'
                  }`}>
                    {selectedDetailLoan.status === 'REJECTED' ? (
                      <IconAlertCircle className="w-5 h-5" />
                    ) : selectedDetailLoan.status === 'DISBURSED' ? (
                      <IconCash className="w-5 h-5" />
                    ) : (
                      <IconPigMoney className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Loan & Advance Details</h3>
                    <p className="text-xs text-slate-500 font-medium">Reference: {selectedDetailLoan.id}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDetailLoan(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Close Drawer"
                >
                  <IconX className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
                {/* Status & Feedback Banner if Rejected */}
                {selectedDetailLoan.status === 'REJECTED' && (
                  <div className="p-4 rounded-xl bg-rose-50/80 border border-rose-200/90 text-rose-900 space-y-2">
                    <div className="font-bold flex items-center gap-1.5 text-rose-700 text-xs">
                      <IconAlertCircle className="w-4 h-4 text-rose-600" />
                      <span>Rejection Feedback from Finance Team</span>
                    </div>
                    <p className="text-xs font-semibold leading-relaxed bg-white p-3 rounded-lg border border-rose-200/70 text-slate-800">
                      {selectedDetailLoan.rejectionReason || 'Policy eligibility criteria not met'}
                    </p>
                  </div>
                )}

                {/* Disbursement Details if Disbursed */}
                {selectedDetailLoan.status === 'DISBURSED' && selectedDetailLoan.utrNumber && (
                  <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200/90 text-emerald-950 space-y-1">
                    <div className="font-bold flex items-center gap-1.5 text-emerald-700">
                      <IconCheck className="w-4 h-4 text-emerald-600" />
                      <span>Disbursement Payout Confirmed</span>
                    </div>
                    <div className="text-xs font-mono font-bold text-emerald-900">
                      UTR Reference: {selectedDetailLoan.utrNumber}
                    </div>
                  </div>
                )}

                {/* Key Overview Card */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                    <span className="text-slate-500 font-medium">Beneficiary</span>
                    <span className="font-bold text-slate-900">{selectedDetailLoan.employeeName} ({selectedDetailLoan.department})</span>
                  </div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                    <span className="text-slate-500 font-medium">Advance Type</span>
                    <span className="font-bold text-slate-800">{selectedDetailLoan.type.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                    <span className="text-slate-500 font-medium">Principal Amount</span>
                    <span className="font-black text-slate-900 text-sm">₹{selectedDetailLoan.principalAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                    <span className="text-slate-500 font-medium">Tenure</span>
                    <span className="font-bold text-slate-800">{selectedDetailLoan.tenureMonths} Months</span>
                  </div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                    <span className="text-slate-500 font-medium">Monthly EMI Recovery</span>
                    <span className="font-black text-[#5E4BE2]">₹{selectedDetailLoan.monthlyEmi.toLocaleString('en-IN')} / mo</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Outstanding Balance</span>
                    <span className="font-black text-rose-600">₹{selectedDetailLoan.balanceRemaining.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {/* Employee's Application Reason */}
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Employee Application Purpose</label>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 italic">
                    "{selectedDetailLoan.reason || 'General emergency advance'}"
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedDetailLoan(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200/60 rounded-xl cursor-pointer transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
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
                    <p className="text-xs text-slate-500 font-medium">Apply for emergency loans or salary advances</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsApplyModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-500 font-medium hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <IconX className="w-5 h-5" />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleApplySubmit} className="flex-1 flex flex-col justify-between overflow-y-auto">
                <div className="p-5 space-y-4 text-xs">
                  {isFinanceDesk && (
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Employee <span className="text-rose-500">*</span></label>
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
                    <label className="block font-bold text-slate-700 mb-1">Advance Type <span className="text-rose-500">*</span></label>
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
                      <label className="block font-bold text-slate-700 mb-1">Amount (₹) <span className="text-rose-500">*</span></label>
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
                      <label className="block font-bold text-slate-700 mb-1">Tenure (Months) <span className="text-rose-500">*</span></label>
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
                    <label className="block font-bold text-slate-700 mb-1">Reason / Purpose <span className="text-rose-500">*</span></label>
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
