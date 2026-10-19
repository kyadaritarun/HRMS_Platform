import React, { useState, useEffect, useMemo } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import {
  IconDoorExit,
  IconPlus,
  IconSearch,
  IconCheck,
  IconX,
  IconAlertCircle,
  IconCalendar,
  IconUser,
  IconCash,
  IconDevices,
  IconBuilding,
  IconFileText,
  IconChecklist,
  IconClock,
  IconPrinter,
  IconDownload,
  IconTrash,
} from '@tabler/icons-react';

export interface ExitRecord {
  id: string;
  employeeId: number;
  employeeName: string;
  employeeEmail: string;
  department: string;
  jobTitle: string;
  joiningDate: string;
  resignationDate: string;
  noticePeriodDays: number;
  lastWorkingDay: string;
  reason: string;
  status: 'NOTICE_PERIOD' | 'NOC_CLEARANCE' | 'FF_READY' | 'SETTLED' | 'REJECTED';
  monthlySalary: number;
  leaveBalanceDays: number;
  // NOC Clearances
  nocClearance: {
    it: { cleared: boolean; remarks: string; clearedBy?: string };
    admin: { cleared: boolean; remarks: string; clearedBy?: string };
    finance: { cleared: boolean; remarks: string; clearedBy?: string };
    hr: { cleared: boolean; remarks: string; clearedBy?: string };
  };
  // F&F Financials
  ffSettlement: {
    daysWorkedInMonth: number;
    monthEarnings: number;
    leaveEncashmentAmount: number;
    gratuityAmount: number;
    noticeShortfallDeduction: number;
    otherDeductions: number;
    netPayout: number;
  };
}

const STORAGE_KEY = 'uptrix_exit_records';

export const ExitManagementPage: React.FC = () => {
  const { company, user } = useAuth();
  const [employees, setEmployees] = useState<any[]>([]);
  const [exitRecords, setExitRecords] = useState<ExitRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return [
      {
        id: 'EXIT-2026-001',
        employeeId: 101,
        employeeName: 'Rahul Verma',
        employeeEmail: 'rahul.verma@example.com',
        department: 'Engineering',
        jobTitle: 'Backend Engineer',
        joiningDate: '2023-04-15',
        resignationDate: '2026-10-01',
        noticePeriodDays: 30,
        lastWorkingDay: '2026-10-31',
        reason: 'Higher Studies & Relocation',
        status: 'NOC_CLEARANCE',
        monthlySalary: 85000,
        leaveBalanceDays: 8.5,
        nocClearance: {
          it: { cleared: true, remarks: 'MacBook Pro & Charger returned. Email disabled.', clearedBy: 'IT Lead' },
          admin: { cleared: true, remarks: 'ID badge & parking tag returned', clearedBy: 'Admin Desk' },
          finance: { cleared: false, remarks: 'Pending travel claim ₹4,200 verification' },
          hr: { cleared: true, remarks: 'Exit interview documented', clearedBy: 'HR Lead' },
        },
        ffSettlement: {
          daysWorkedInMonth: 31,
          monthEarnings: 85000,
          leaveEncashmentAmount: 24083,
          gratuityAmount: 0,
          noticeShortfallDeduction: 0,
          otherDeductions: 4200,
          netPayout: 104883,
        },
      },
    ];
  });

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showInitiateModal, setShowInitiateModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<ExitRecord | null>(null);
  const [activeTab, setActiveTab] = useState<'NOC' | 'FF_CALC' | 'STATEMENT'>('NOC');

  // Form State for New Exit
  const [newExitForm, setNewExitForm] = useState({
    employeeId: '',
    resignationDate: new Date().toISOString().split('T')[0],
    noticePeriodDays: 30,
    reason: 'Better Career Opportunity',
    remarks: '',
  });

  // Save to local storage whenever exitRecords changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(exitRecords));
    } catch (_) {}
  }, [exitRecords]);

  // Fetch company employees for dropdown
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const res = await api.get('/employees?pageSize=100');
        setEmployees(res.data?.items || []);
      } catch (err) {
        console.error('Failed to load employees for exit:', err);
      }
    };
    fetchStaff();
  }, []);

  // Compute LWD dynamically when resignationDate or noticePeriodDays changes
  const computedLwd = useMemo(() => {
    if (!newExitForm.resignationDate) return '';
    const d = new Date(newExitForm.resignationDate);
    d.setDate(d.getDate() + Number(newExitForm.noticePeriodDays || 30));
    return d.toISOString().split('T')[0];
  }, [newExitForm.resignationDate, newExitForm.noticePeriodDays]);

  const handleInitiateExit = (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find((emp) => String(emp.id) === String(newExitForm.employeeId));
    if (!emp) return;

    const monthlySalary = Number(emp.monthlySalary || 60000);
    const leaveBalanceDays = 6; // default estimated
    const daysInMonth = 30;
    const perDay = monthlySalary / daysInMonth;

    // Calculate tenure in years for gratuity (>= 5 years)
    let tenureYears = 0;
    if (emp.joiningDate) {
      const diffMs = new Date(computedLwd).getTime() - new Date(emp.joiningDate).getTime();
      tenureYears = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.25));
    }

    const gratuity = tenureYears >= 5 ? Math.round((15 * (monthlySalary * 0.5) * tenureYears) / 26) : 0;
    const leaveEncashment = Math.round(perDay * leaveBalanceDays);
    const netPayout = monthlySalary + leaveEncashment + gratuity;

    const newRecord: ExitRecord = {
      id: `EXIT-${new Date().getFullYear()}-${String(exitRecords.length + 1).padStart(3, '0')}`,
      employeeId: emp.id,
      employeeName: `${emp.firstName} ${emp.lastName}`.trim(),
      employeeEmail: emp.email,
      department: emp.department?.name || 'General',
      jobTitle: emp.jobTitle || 'Team Member',
      joiningDate: emp.joiningDate ? emp.joiningDate.split('T')[0] : '2024-01-01',
      resignationDate: newExitForm.resignationDate,
      noticePeriodDays: Number(newExitForm.noticePeriodDays),
      lastWorkingDay: computedLwd,
      reason: newExitForm.reason,
      status: 'NOTICE_PERIOD',
      monthlySalary,
      leaveBalanceDays,
      nocClearance: {
        it: { cleared: false, remarks: '' },
        admin: { cleared: false, remarks: '' },
        finance: { cleared: false, remarks: '' },
        hr: { cleared: false, remarks: '' },
      },
      ffSettlement: {
        daysWorkedInMonth: daysInMonth,
        monthEarnings: monthlySalary,
        leaveEncashmentAmount: leaveEncashment,
        gratuityAmount: gratuity,
        noticeShortfallDeduction: 0,
        otherDeductions: 0,
        netPayout,
      },
    };

    setExitRecords([newRecord, ...exitRecords]);
    setShowInitiateModal(false);
    setSelectedRecord(newRecord);
  };

  const handleUpdateNoc = (
    dept: 'it' | 'admin' | 'finance' | 'hr',
    cleared: boolean,
    remarks: string
  ) => {
    if (!selectedRecord) return;
    const updated: ExitRecord = {
      ...selectedRecord,
      nocClearance: {
        ...selectedRecord.nocClearance,
        [dept]: {
          cleared,
          remarks,
          clearedBy: cleared ? user?.firstName || 'HR Admin' : undefined,
        },
      },
    };

    // Auto-advance status if all 4 are cleared
    const allCleared =
      (dept === 'it' ? cleared : updated.nocClearance.it.cleared) &&
      (dept === 'admin' ? cleared : updated.nocClearance.admin.cleared) &&
      (dept === 'finance' ? cleared : updated.nocClearance.finance.cleared) &&
      (dept === 'hr' ? cleared : updated.nocClearance.hr.cleared);

    if (allCleared && updated.status !== 'SETTLED') {
      updated.status = 'FF_READY';
    } else if (!allCleared && updated.status === 'FF_READY') {
      updated.status = 'NOC_CLEARANCE';
    }

    setSelectedRecord(updated);
    setExitRecords(exitRecords.map((r) => (r.id === updated.id ? updated : r)));
  };

  const handleUpdateFf = (updates: Partial<ExitRecord['ffSettlement']>) => {
    if (!selectedRecord) return;
    const current = selectedRecord.ffSettlement;
    const merged = { ...current, ...updates };
    const net =
      merged.monthEarnings +
      merged.leaveEncashmentAmount +
      merged.gratuityAmount -
      merged.noticeShortfallDeduction -
      merged.otherDeductions;

    merged.netPayout = Math.max(0, Math.round(net));

    const updated: ExitRecord = {
      ...selectedRecord,
      ffSettlement: merged,
    };
    setSelectedRecord(updated);
    setExitRecords(exitRecords.map((r) => (r.id === updated.id ? updated : r)));
  };

  const handleMarkSettled = () => {
    if (!selectedRecord) return;
    const updated: ExitRecord = {
      ...selectedRecord,
      status: 'SETTLED',
    };
    setSelectedRecord(updated);
    setExitRecords(exitRecords.map((r) => (r.id === updated.id ? updated : r)));
  };

  const filteredRecords = exitRecords.filter((r) => {
    const matchesSearch =
      r.employeeName.toLowerCase().includes(search.toLowerCase()) ||
      r.department.toLowerCase().includes(search.toLowerCase()) ||
      r.id.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Metrics
  const activeExitsCount = exitRecords.filter((r) => r.status !== 'SETTLED' && r.status !== 'REJECTED').length;
  const pendingNocCount = exitRecords.filter((r) => {
    const noc = r.nocClearance;
    return !noc.it.cleared || !noc.admin.cleared || !noc.finance.cleared || !noc.hr.cleared;
  }).length;
  const settledCount = exitRecords.filter((r) => r.status === 'SETTLED').length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <IconDoorExit className="w-7 h-7 text-rose-600" />
            Exit & Full & Final (F&F) Settlement
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage employee resignations, cross-departmental NOC clearances, and automated F&F terminal payouts.
          </p>
        </div>

        <button
          onClick={() => setShowInitiateModal(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm shadow-sm transition-all shadow-rose-500/20 active:scale-95"
        >
          <IconPlus className="w-4 h-4" />
          Initiate Employee Exit
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Resignations</span>
            <span className="p-2 bg-amber-50 rounded-xl text-amber-600">
              <IconClock className="w-5 h-5" />
            </span>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{activeExitsCount}</p>
          <span className="text-xs text-slate-500 mt-1 block">In notice period / clearances</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending NOCs</span>
            <span className="p-2 bg-rose-50 rounded-xl text-rose-600">
              <IconChecklist className="w-5 h-5" />
            </span>
          </div>
          <p className="text-2xl font-black text-rose-600 mt-2">{pendingNocCount}</p>
          <span className="text-xs text-slate-500 mt-1 block">IT, Admin or Finance approval</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">F&F Ready for Payout</span>
            <span className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
              <IconCash className="w-5 h-5" />
            </span>
          </div>
          <p className="text-2xl font-black text-indigo-600 mt-2">
            {exitRecords.filter((r) => r.status === 'FF_READY').length}
          </p>
          <span className="text-xs text-slate-500 mt-1 block">All clearances complete</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Fully Settled</span>
            <span className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
              <IconCheck className="w-5 h-5" />
            </span>
          </div>
          <p className="text-2xl font-black text-emerald-600 mt-2">{settledCount}</p>
          <span className="text-xs text-slate-500 mt-1 block">Relieved & dues disbursed</span>
        </div>
      </div>

      {/* Main Content Layout: Table + Detail Drawer/Modal */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Filters */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <IconSearch className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by employee, department, ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-rose-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            {['ALL', 'NOTICE_PERIOD', 'NOC_CLEARANCE', 'FF_READY', 'SETTLED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  statusFilter === st
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {st.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/80 text-xs font-semibold text-slate-500 uppercase border-b border-slate-100">
              <tr>
                <th className="px-6 py-3.5">Employee</th>
                <th className="px-6 py-3.5">Department</th>
                <th className="px-6 py-3.5">Resignation Date</th>
                <th className="px-6 py-3.5">Last Working Day</th>
                <th className="px-6 py-3.5">NOC Status</th>
                <th className="px-6 py-3.5">Net F&F Payable</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                    <IconDoorExit className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    No employee exit records found.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => {
                  const nocClearedCount = [
                    r.nocClearance.it.cleared,
                    r.nocClearance.admin.cleared,
                    r.nocClearance.finance.cleared,
                    r.nocClearance.hr.cleared,
                  ].filter(Boolean).length;

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">{r.employeeName}</div>
                        <div className="text-xs text-slate-400">{r.jobTitle}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-medium text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md">
                          {r.department}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-slate-600">
                        {r.resignationDate}
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-900">
                        {r.lastWorkingDay}
                        <span className="block text-[11px] text-slate-400 font-normal">
                          {r.noticePeriodDays} days notice
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              nocClearedCount === 4
                                ? 'bg-emerald-500'
                                : nocClearedCount > 0
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                            }`}
                          />
                          <span className="text-xs font-semibold text-slate-700">
                            {nocClearedCount}/4 Cleared
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-black text-slate-900">
                        ₹{r.ffSettlement.netPayout.toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            r.status === 'SETTLED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : r.status === 'FF_READY'
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {r.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedRecord(r);
                            setActiveTab('NOC');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors"
                        >
                          Manage Clearances
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-over or Modal for Clearance & F&F Settlement Details */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 flex flex-col animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg">
                    {selectedRecord.id}
                  </span>
                  <h2 className="text-xl font-bold text-slate-900">{selectedRecord.employeeName}</h2>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {selectedRecord.jobTitle} • {selectedRecord.department} • Last Working Day:{' '}
                  <span className="font-semibold text-slate-800">{selectedRecord.lastWorkingDay}</span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                {selectedRecord.status === 'FF_READY' && (
                  <button
                    onClick={handleMarkSettled}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                  >
                    Mark as Settled
                  </button>
                )}
                <button
                  onClick={() => setSelectedRecord(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <IconX className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="px-6 border-b border-slate-100 flex items-center gap-6 text-sm font-semibold text-slate-500">
              <button
                onClick={() => setActiveTab('NOC')}
                className={`py-3.5 border-b-2 transition-colors ${
                  activeTab === 'NOC'
                    ? 'border-rose-600 text-rose-600'
                    : 'border-transparent hover:text-slate-900'
                }`}
              >
                1. Department NOC Clearances
              </button>
              <button
                onClick={() => setActiveTab('FF_CALC')}
                className={`py-3.5 border-b-2 transition-colors ${
                  activeTab === 'FF_CALC'
                    ? 'border-rose-600 text-rose-600'
                    : 'border-transparent hover:text-slate-900'
                }`}
              >
                2. F&F Financial Breakdown
              </button>
              <button
                onClick={() => setActiveTab('STATEMENT')}
                className={`py-3.5 border-b-2 transition-colors ${
                  activeTab === 'STATEMENT'
                    ? 'border-rose-600 text-rose-600'
                    : 'border-transparent hover:text-slate-900'
                }`}
              >
                3. Print F&F Statement
              </button>
            </div>

            {/* Tab 1: NOC Clearances */}
            {activeTab === 'NOC' && (
              <div className="p-6 space-y-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs text-slate-600">
                  <span className="font-bold text-slate-800">Clearance Rule:</span> All 4 departments (IT,
                  Admin, Finance, HR) must approve handover before the terminal F&F payout and relieving letter
                  can be issued.
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* IT Clearance */}
                  <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <IconDevices className="w-4 h-4 text-blue-600" />
                        IT & Systems Clearance
                      </span>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedRecord.nocClearance.it.cleared}
                          onChange={(e) =>
                            handleUpdateNoc('it', e.target.checked, selectedRecord.nocClearance.it.remarks)
                          }
                          className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
                        />
                        <span className="text-xs font-semibold text-slate-700">Cleared</span>
                      </label>
                    </div>
                    <p className="text-xs text-slate-500">
                      Laptop, charger, monitor, mouse, and peripheral returns. Google Workspace, Slack, and cloud
                      credentials revoked.
                    </p>
                    <input
                      type="text"
                      placeholder="Remarks / Serial Number..."
                      value={selectedRecord.nocClearance.it.remarks}
                      onChange={(e) =>
                        handleUpdateNoc('it', selectedRecord.nocClearance.it.cleared, e.target.value)
                      }
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>

                  {/* Admin / Facilities */}
                  <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <IconBuilding className="w-4 h-4 text-purple-600" />
                        Admin & Facilities
                      </span>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedRecord.nocClearance.admin.cleared}
                          onChange={(e) =>
                            handleUpdateNoc('admin', e.target.checked, selectedRecord.nocClearance.admin.remarks)
                          }
                          className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
                        />
                        <span className="text-xs font-semibold text-slate-700">Cleared</span>
                      </label>
                    </div>
                    <p className="text-xs text-slate-500">
                      Physical ID badge, office keys, parking pass, and locker keys surrender.
                    </p>
                    <input
                      type="text"
                      placeholder="Remarks..."
                      value={selectedRecord.nocClearance.admin.remarks}
                      onChange={(e) =>
                        handleUpdateNoc('admin', selectedRecord.nocClearance.admin.cleared, e.target.value)
                      }
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>

                  {/* Finance / Accounts */}
                  <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <IconCash className="w-4 h-4 text-emerald-600" />
                        Finance & Accounts
                      </span>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedRecord.nocClearance.finance.cleared}
                          onChange={(e) =>
                            handleUpdateNoc('finance', e.target.checked, selectedRecord.nocClearance.finance.remarks)
                          }
                          className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
                        />
                        <span className="text-xs font-semibold text-slate-700">Cleared</span>
                      </label>
                    </div>
                    <p className="text-xs text-slate-500">
                      Corporate credit card cancellation, outstanding travel advances, and expense reimbursement claims.
                    </p>
                    <input
                      type="text"
                      placeholder="Remarks / Advance details..."
                      value={selectedRecord.nocClearance.finance.remarks}
                      onChange={(e) =>
                        handleUpdateNoc('finance', selectedRecord.nocClearance.finance.cleared, e.target.value)
                      }
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>

                  {/* HR Desk */}
                  <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <IconFileText className="w-4 h-4 text-amber-600" />
                        HR Operations
                      </span>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedRecord.nocClearance.hr.cleared}
                          onChange={(e) =>
                            handleUpdateNoc('hr', e.target.checked, selectedRecord.nocClearance.hr.remarks)
                          }
                          className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
                        />
                        <span className="text-xs font-semibold text-slate-700">Cleared</span>
                      </label>
                    </div>
                    <p className="text-xs text-slate-500">
                      Exit interview feedback submitted, non-compete/NDA re-affirmed, forward postal address confirmed.
                    </p>
                    <input
                      type="text"
                      placeholder="Remarks / Exit rating..."
                      value={selectedRecord.nocClearance.hr.remarks}
                      onChange={(e) =>
                        handleUpdateNoc('hr', selectedRecord.nocClearance.hr.cleared, e.target.value)
                      }
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: F&F Financial Breakdown */}
            {activeTab === 'FF_CALC' && (
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Earnings Component */}
                  <div className="p-5 rounded-2xl border border-emerald-200 bg-emerald-50/40 space-y-4">
                    <h3 className="font-bold text-emerald-900 text-sm flex items-center gap-2">
                      <IconCheck className="w-4 h-4 text-emerald-600" />
                      Earnings & Additions
                    </h3>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Active Month Salary (Working Days Pay)
                      </label>
                      <input
                        type="number"
                        value={selectedRecord.ffSettlement.monthEarnings}
                        onChange={(e) => handleUpdateFf({ monthEarnings: Number(e.target.value) || 0 })}
                        className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl font-bold"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Leave Encashment ({selectedRecord.leaveBalanceDays} days paid leave)
                      </label>
                      <input
                        type="number"
                        value={selectedRecord.ffSettlement.leaveEncashmentAmount}
                        onChange={(e) =>
                          handleUpdateFf({ leaveEncashmentAmount: Number(e.target.value) || 0 })
                        }
                        className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl font-bold"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Gratuity (Tenure &gt; 5 yrs)
                      </label>
                      <input
                        type="number"
                        value={selectedRecord.ffSettlement.gratuityAmount}
                        onChange={(e) => handleUpdateFf({ gratuityAmount: Number(e.target.value) || 0 })}
                        className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl font-bold"
                      />
                    </div>
                  </div>

                  {/* Deductions Component */}
                  <div className="p-5 rounded-2xl border border-rose-200 bg-rose-50/40 space-y-4">
                    <h3 className="font-bold text-rose-900 text-sm flex items-center gap-2">
                      <IconX className="w-4 h-4 text-rose-600" />
                      Recoveries & Deductions
                    </h3>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Notice Period Shortfall Recovery
                      </label>
                      <input
                        type="number"
                        value={selectedRecord.ffSettlement.noticeShortfallDeduction}
                        onChange={(e) =>
                          handleUpdateFf({ noticeShortfallDeduction: Number(e.target.value) || 0 })
                        }
                        className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl font-bold text-rose-600"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Other Deductions (Advance recovery, IT damage)
                      </label>
                      <input
                        type="number"
                        value={selectedRecord.ffSettlement.otherDeductions}
                        onChange={(e) => handleUpdateFf({ otherDeductions: Number(e.target.value) || 0 })}
                        className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl font-bold text-rose-600"
                      />
                    </div>

                    {/* Net Total Card */}
                    <div className="pt-4 border-t border-rose-200/60">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                        Net Final Payout
                      </span>
                      <span className="text-3xl font-black text-slate-900 mt-1 block">
                        ₹{selectedRecord.ffSettlement.netPayout.toLocaleString()}
                      </span>
                      <span className="text-xs text-slate-500 mt-0.5 block">
                        Credited to employee bank account upon final clearance
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Formal F&F Statement Preview */}
            {activeTab === 'STATEMENT' && (
              <div className="p-6 space-y-4">
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-slate-800"
                  >
                    <IconPrinter className="w-4 h-4" />
                    Print / Export Statement
                  </button>
                </div>

                <div className="p-8 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-6 text-slate-800 font-sans">
                  {/* Header */}
                  <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">{company?.name || 'UPTRIX CORP'}</h2>
                      <p className="text-xs text-slate-500">Human Resources & Payroll Operations</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-md">
                        FULL & FINAL SETTLEMENT STATEMENT
                      </span>
                      <p className="text-xs text-slate-400 mt-1">Ref: {selectedRecord.id}</p>
                    </div>
                  </div>

                  {/* Employee Details Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs bg-slate-50 p-4 rounded-xl">
                    <div>
                      <span className="text-slate-400 block">Employee Name</span>
                      <span className="font-bold text-slate-900">{selectedRecord.employeeName}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Designation</span>
                      <span className="font-bold text-slate-900">{selectedRecord.jobTitle}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Date of Joining</span>
                      <span className="font-bold text-slate-900">{selectedRecord.joiningDate}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Last Working Date</span>
                      <span className="font-bold text-slate-900">{selectedRecord.lastWorkingDay}</span>
                    </div>
                  </div>

                  {/* Financial Breakdown Table */}
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 font-bold text-slate-700">
                        <th className="py-2 text-left">Component Description</th>
                        <th className="py-2 text-right">Earnings (₹)</th>
                        <th className="py-2 text-right">Deductions (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="py-2.5">Salary for Month of Exit</td>
                        <td className="py-2.5 text-right font-medium">
                          ₹{selectedRecord.ffSettlement.monthEarnings.toLocaleString()}
                        </td>
                        <td className="py-2.5 text-right">-</td>
                      </tr>
                      <tr>
                        <td className="py-2.5">
                          Leave Encashment ({selectedRecord.leaveBalanceDays} Days Balance)
                        </td>
                        <td className="py-2.5 text-right font-medium">
                          ₹{selectedRecord.ffSettlement.leaveEncashmentAmount.toLocaleString()}
                        </td>
                        <td className="py-2.5 text-right">-</td>
                      </tr>
                      {selectedRecord.ffSettlement.gratuityAmount > 0 && (
                        <tr>
                          <td className="py-2.5">Statutory Gratuity Settlement</td>
                          <td className="py-2.5 text-right font-medium">
                            ₹{selectedRecord.ffSettlement.gratuityAmount.toLocaleString()}
                          </td>
                          <td className="py-2.5 text-right">-</td>
                        </tr>
                      )}
                      {selectedRecord.ffSettlement.noticeShortfallDeduction > 0 && (
                        <tr>
                          <td className="py-2.5 text-rose-600">Notice Period Shortfall Recovery</td>
                          <td className="py-2.5 text-right">-</td>
                          <td className="py-2.5 text-right text-rose-600 font-medium">
                            ₹{selectedRecord.ffSettlement.noticeShortfallDeduction.toLocaleString()}
                          </td>
                        </tr>
                      )}
                      {selectedRecord.ffSettlement.otherDeductions > 0 && (
                        <tr>
                          <td className="py-2.5 text-rose-600">Other Deductions / Advances</td>
                          <td className="py-2.5 text-right">-</td>
                          <td className="py-2.5 text-right text-rose-600 font-medium">
                            ₹{selectedRecord.ffSettlement.otherDeductions.toLocaleString()}
                          </td>
                        </tr>
                      )}
                      <tr className="border-t-2 border-slate-900 font-black text-sm">
                        <td className="py-3">Net Payable Amount</td>
                        <td colSpan={2} className="py-3 text-right text-slate-900 text-base">
                          ₹{selectedRecord.ffSettlement.netPayout.toLocaleString()}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Signatures */}
                  <div className="pt-8 flex justify-between items-end border-t border-slate-100 text-xs">
                    <div>
                      <div className="h-10 border-b border-slate-300 w-40 mb-1" />
                      <span className="text-slate-500 block">Employee Signature</span>
                    </div>
                    <div className="text-right">
                      <div className="h-10 border-b border-slate-300 w-40 mb-1 ml-auto" />
                      <span className="text-slate-500 block">Authorized Signatory (HR)</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Initiate Employee Exit */}
      {showInitiateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <IconDoorExit className="w-5 h-5 text-rose-600" />
                Initiate Employee Exit
              </h2>
              <button
                onClick={() => setShowInitiateModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <IconX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleInitiateExit} className="space-y-4 pt-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Select Employee <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={newExitForm.employeeId}
                  onChange={(e) => setNewExitForm({ ...newExitForm, employeeId: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                >
                  <option value="">-- Choose Employee --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.department?.name || 'General'} - {emp.jobTitle})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Resignation Date
                  </label>
                  <input
                    type="date"
                    required
                    value={newExitForm.resignationDate}
                    onChange={(e) =>
                      setNewExitForm({ ...newExitForm, resignationDate: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Notice Period (Days)
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    max={180}
                    value={newExitForm.noticePeriodDays}
                    onChange={(e) =>
                      setNewExitForm({ ...newExitForm, noticePeriodDays: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 flex items-center justify-between">
                <span>Calculated Last Working Day (LWD):</span>
                <span className="font-bold text-amber-900">{computedLwd}</span>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Primary Reason for Leaving
                </label>
                <select
                  value={newExitForm.reason}
                  onChange={(e) => setNewExitForm({ ...newExitForm, reason: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="Better Career Opportunity">Better Career Opportunity</option>
                  <option value="Higher Studies">Higher Studies</option>
                  <option value="Relocation / Family">Relocation / Family</option>
                  <option value="Health / Medical Reasons">Health / Medical Reasons</option>
                  <option value="Career Transition">Career Transition</option>
                  <option value="Mutual Separation">Mutual Separation</option>
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowInitiateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs"
                >
                  Submit & Open Clearances
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExitManagementPage;
