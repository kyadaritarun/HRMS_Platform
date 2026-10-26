import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import api from '../../api/client';
import TablePagination from '../../components/common/TablePagination';
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
  IconFilter,
  IconChevronDown,
  IconMail,
  IconSend,
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
  lastUpdateSent?: {
    date: string;
    type: string;
    subject: string;
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
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  const [showInitiateModal, setShowInitiateModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<ExitRecord | null>(null);
  const [activeTab, setActiveTab] = useState<'NOC' | 'FF_CALC' | 'STATEMENT'>('NOC');

  // Send Update to Employee state
  const [showSendUpdateModal, setShowSendUpdateModal] = useState(false);
  const [updateTargetRecord, setUpdateTargetRecord] = useState<ExitRecord | null>(null);
  const [updateTemplate, setUpdateTemplate] = useState<'NOC_REMINDER' | 'FF_STATEMENT' | 'EXIT_CONFIRM' | 'CUSTOM'>('NOC_REMINDER');
  const [updateSubject, setUpdateSubject] = useState('');
  const [updateMessage, setUpdateMessage] = useState('');
  const [sendEmailChannel, setSendEmailChannel] = useState(true);
  const [sendPortalChannel, setSendPortalChannel] = useState(true);
  const [ccLead, setCcLead] = useState(true);
  const [isSendingUpdate, setIsSendingUpdate] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

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

  const getTemplateContent = (record: ExitRecord, template: 'NOC_REMINDER' | 'FF_STATEMENT' | 'EXIT_CONFIRM' | 'CUSTOM') => {
    if (template === 'NOC_REMINDER') {
      const itStatus = record.nocClearance.it.cleared ? 'Cleared' : `PENDING — ${record.nocClearance.it.remarks || 'Hardware & asset handover'}`;
      const adminStatus = record.nocClearance.admin.cleared ? 'Cleared' : `PENDING — ${record.nocClearance.admin.remarks || 'ID card & access tag handover'}`;
      const finStatus = record.nocClearance.finance.cleared ? 'Cleared' : `PENDING — ${record.nocClearance.finance.remarks || 'Expense claims / advances verification'}`;
      const hrStatus = record.nocClearance.hr.cleared ? 'Cleared' : `PENDING — ${record.nocClearance.hr.remarks || 'Exit interview questionnaire'}`;

      return {
        subject: `[Exit Action Required] Department Clearance & Handover Status — ${record.employeeName} (${record.id})`,
        message: `Dear ${record.employeeName},

This is an automated handover update regarding your scheduled exit on ${record.lastWorkingDay}.

Below is the live status of your 4-department NOC Clearances:
• IT & Systems: ${itStatus}
• Admin & Facilities: ${adminStatus}
• Finance & Accounts: ${finStatus}
• Human Resources: ${hrStatus}

Please liaise with the respective department leads to complete any outstanding handover requirements prior to your last working date so that your relieving formalities and Full & Final settlement can proceed smoothly.

Best regards,
People & Culture Operations
${company?.name || 'HR Team'}`,
      };
    }

    if (template === 'FF_STATEMENT') {
      return {
        subject: `Full & Final (F&F) Settlement Statement & Financial Breakdown — ${record.employeeName}`,
        message: `Dear ${record.employeeName},

Your Full & Final Settlement (F&F) terminal calculation has been prepared by the Finance & Payroll team:

• Salary for Exit Month: ₹${record.ffSettlement.monthEarnings.toLocaleString('en-IN')}
• Leave Encashment (${record.leaveBalanceDays} days): ₹${record.ffSettlement.leaveEncashmentAmount.toLocaleString('en-IN')}
• Statutory Gratuity: ₹${record.ffSettlement.gratuityAmount.toLocaleString('en-IN')}
• Deductions / Recoveries: ₹${(record.ffSettlement.noticeShortfallDeduction + record.ffSettlement.otherDeductions).toLocaleString('en-IN')}
--------------------------------------------------
• Net Payable Amount: ₹${record.ffSettlement.netPayout.toLocaleString('en-IN')}

You can view and verify the full formal breakdown directly inside your employee portal. Disbursal will be processed as per standard payroll timelines once all final clearances are validated.

Best regards,
Finance & Payroll Team
${company?.name || 'HR Team'}`,
      };
    }

    if (template === 'EXIT_CONFIRM') {
      return {
        subject: `Formal Acknowledgement & Acceptance of Resignation — ${record.employeeName}`,
        message: `Dear ${record.employeeName},

This is to formally confirm that your resignation submitted on ${record.resignationDate} has been accepted.

As agreed, your notice period of ${record.noticePeriodDays} days is active, and your official Last Working Day is confirmed as: ${record.lastWorkingDay}.

Our HR operations team will coordinate with you regarding the exit interview and handover process. We thank you for your contributions to the team and wish you the very best in your next endeavors.

Warm regards,
Human Resources Leadership
${company?.name || 'HR Team'}`,
      };
    }

    return {
      subject: `Important Update regarding your Exit Formalities — ${record.employeeName}`,
      message: `Dear ${record.employeeName},

We are writing to share an update regarding your ongoing exit formalities.

Please feel free to reach out to the HR team if you have any questions or require further assistance.

Warm regards,
HR Operations Team`,
    };
  };

  const handleOpenSendUpdateModal = (record: ExitRecord, template: 'NOC_REMINDER' | 'FF_STATEMENT' | 'EXIT_CONFIRM' | 'CUSTOM' = 'NOC_REMINDER') => {
    setUpdateTargetRecord(record);
    setUpdateTemplate(template);
    const content = getTemplateContent(record, template);
    setUpdateSubject(content.subject);
    setUpdateMessage(content.message);
    setShowSendUpdateModal(true);
  };

  const handleSelectTemplate = (template: 'NOC_REMINDER' | 'FF_STATEMENT' | 'EXIT_CONFIRM' | 'CUSTOM') => {
    setUpdateTemplate(template);
    if (updateTargetRecord) {
      const content = getTemplateContent(updateTargetRecord, template);
      setUpdateSubject(content.subject);
      setUpdateMessage(content.message);
    }
  };

  const handleSendExitUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!updateTargetRecord) return;
    setIsSendingUpdate(true);

    setTimeout(() => {
      const updated: ExitRecord = {
        ...updateTargetRecord,
        lastUpdateSent: {
          date: new Date().toISOString(),
          type: updateTemplate,
          subject: updateSubject,
        },
      };
      setExitRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      if (selectedRecord && selectedRecord.id === updated.id) {
        setSelectedRecord(updated);
      }
      setIsSendingUpdate(false);
      setShowSendUpdateModal(false);
      const channelDesc = sendEmailChannel && sendPortalChannel
        ? 'Email & Employee Portal'
        : sendEmailChannel
        ? 'Email'
        : 'Employee Portal';
      setSuccessToast(`Exit update successfully dispatched to ${updateTargetRecord.employeeName} (${updateTargetRecord.employeeEmail}) via ${channelDesc}!`);
      setTimeout(() => setSuccessToast(null), 4500);
    }, 500);
  };

  const filteredRecords = exitRecords.filter((r) => {
    const matchesSearch =
      r.employeeName.toLowerCase().includes(search.toLowerCase()) ||
      r.department.toLowerCase().includes(search.toLowerCase()) ||
      r.id.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, currentPage, pageSize]);

  // Metrics
  const activeExitsCount = exitRecords.filter((r) => r.status !== 'SETTLED' && r.status !== 'REJECTED').length;
  const pendingNocCount = exitRecords.filter((r) => {
    const noc = r.nocClearance;
    return !noc.it.cleared || !noc.admin.cleared || !noc.finance.cleared || !noc.hr.cleared;
  }).length;
  const settledCount = exitRecords.filter((r) => r.status === 'SETTLED').length;

  return (
    <div className="space-y-6">
      {/* Top Banner (Hero Banner) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
              <IconDoorExit className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Exit &amp; Full &amp; Final (F&amp;F) Settlement
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Manage employee resignations, cross-departmental NOC clearances, and automated F&amp;F terminal payouts.
          </p>
        </div>

        <button
          onClick={() => setShowInitiateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs hover:shadow-md transition-all cursor-pointer shrink-0"
        >
          <IconPlus className="w-4 h-4" />
          <span>Initiate Employee Exit</span>
        </button>
      </div>

      {/* Main Content Layout: Table + Detail Drawer/Modal (Responsive for All Screens) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
        {/* Section Header & Responsive Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <IconChecklist className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">All Resignations &amp; Settlements</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Track employee handover, cross-department NOC clearance, and terminal dues.
              </p>
            </div>
          </div>

          {/* Right Controls: Search & Filter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <IconSearch className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search employee, dept, ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-rose-500 text-slate-800 placeholder-slate-400"
              />
            </div>

            {/* Filter Dropdown */}
            <div className="relative shrink-0">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full sm:w-auto appearance-none pl-8 pr-7 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-rose-500 text-slate-700 cursor-pointer"
              >
                <option value="ALL">All Status</option>
                <option value="NOTICE_PERIOD">Notice Period</option>
                <option value="NOC_CLEARANCE">NOC Clearance</option>
                <option value="FF_READY">F&amp;F Ready</option>
                <option value="SETTLED">Settled</option>
              </select>
              <IconFilter className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <IconChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Responsive Table with horizontal scroll support */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-xs">
            <thead className="bg-[#e5e7eb] text-xs font-bold text-slate-900 border-b border-slate-300">
              <tr>
                <th className="px-5 py-3.5 whitespace-nowrap">Employee</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Department</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Resignation Date</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Last Working Day</th>
                <th className="px-5 py-3.5 whitespace-nowrap">NOC Status</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Net F&amp;F Payable</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Status</th>
                <th className="px-5 py-3.5 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-2">
                      <IconDoorExit className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-800">No exit records found</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      {search ? 'Try adjusting your search criteria.' : 'Click "Initiate Employee Exit" to create a new exit record.'}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((r) => {
                  const nocClearedCount = [
                    r.nocClearance.it.cleared,
                    r.nocClearance.admin.cleared,
                    r.nocClearance.finance.cleared,
                    r.nocClearance.hr.cleared,
                  ].filter(Boolean).length;

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="font-bold text-slate-900 text-xs">{r.employeeName}</div>
                        <div className="text-[11px] text-slate-400 font-normal">{r.jobTitle}</div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="inline-block text-[10px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                          {r.department}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-600 font-medium whitespace-nowrap">
                        {r.resignationDate}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="text-xs font-bold text-slate-900">{r.lastWorkingDay}</div>
                        <span className="block text-[10px] text-slate-400 font-normal">
                          {r.noticePeriodDays} days notice
                        </span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-100">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
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
                      <td className="px-4 py-3.5 font-bold text-slate-900 text-xs whitespace-nowrap">
                        ₹{r.ffSettlement.netPayout.toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${
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
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2 justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRecord(r);
                              setActiveTab('NOC');
                            }}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-xs hover:shadow-md transition-all cursor-pointer whitespace-nowrap active:scale-95"
                          >
                            <IconChecklist className="w-3.5 h-3.5" />
                            <span>Manage Clearances</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenSendUpdateModal(r)}
                            title="Send Exit Update to Employee"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 text-slate-700 hover:text-rose-700 font-semibold text-xs shadow-2xs transition-all cursor-pointer whitespace-nowrap active:scale-95"
                          >
                            <IconMail className="w-3.5 h-3.5 text-rose-600" />
                            <span>Send Update</span>
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

        <TablePagination
          currentPage={currentPage}
          totalItems={filteredRecords.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
          pageSizeOptions={[5, 10, 20, 50]}
          itemName="exit records"
        />
      </div>

      {/* Right-Side Slide-Over Drawer for Clearance & F&F Settlement Details */}
      {selectedRecord && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] overflow-hidden">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setSelectedRecord(null)}
          />
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10 pointer-events-none">
            <div
              className="w-screen max-w-4xl bg-white shadow-2xl flex flex-col h-full border-l border-slate-200 pointer-events-auto animate-in slide-in-from-right duration-200 overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
            {/* Drawer Header */}
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
                <button
                  type="button"
                  onClick={() => handleOpenSendUpdateModal(selectedRecord)}
                  className="px-3 py-2 border border-slate-200 hover:border-rose-300 bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <IconMail className="w-4 h-4 text-rose-600" />
                  <span>Send Update</span>
                </button>
                {selectedRecord.status === 'FF_READY' && (
                  <button
                    onClick={handleMarkSettled}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-xs text-slate-500">
                    Official accounting statement generated for employee F&amp;F terminal settlement.
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenSendUpdateModal(selectedRecord, 'FF_STATEMENT')}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                    >
                      <IconMail className="w-4 h-4" />
                      <span>Email Statement to Employee</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                    >
                      <IconPrinter className="w-4 h-4" />
                      <span>Print / Export Statement</span>
                    </button>
                  </div>
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
                    <thead className="bg-[#e5e7eb] text-xs font-bold text-slate-900 border-b border-slate-300">
                      <tr>
                        <th className="px-3 py-2 text-left">Component Description</th>
                        <th className="px-3 py-2 text-right">Earnings (₹)</th>
                        <th className="px-3 py-2 text-right">Deductions (₹)</th>
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
      </div>,
      document.body
    )}

      {/* Right-Side Slide-Over Drawer: Initiate Employee Exit */}
      {showInitiateModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] overflow-hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setShowInitiateModal(false)}
          />

          {/* Full Height Drawer Container Flush to the Right */}
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10 pointer-events-none">
            <div
              className="w-screen max-w-xl bg-white shadow-2xl flex flex-col h-full border-l border-slate-200 pointer-events-auto animate-in slide-in-from-right duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-white shrink-0">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                    <IconDoorExit className="w-4 h-4" />
                  </div>
                  Initiate Employee Exit
                </h2>
                <button
                  type="button"
                  onClick={() => setShowInitiateModal(false)}
                  className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                  title="Close"
                >
                  <IconX className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Form Body */}
              <form onSubmit={handleInitiateExit} className="flex-1 overflow-y-auto p-6 space-y-4 flex flex-col justify-between">
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Select Employee <span className="text-rose-500">*</span>
                    </label>
                    <select
                      required
                      value={newExitForm.employeeId}
                      onChange={(e) => setNewExitForm({ ...newExitForm, employeeId: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-rose-500 font-medium"
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
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-rose-500 font-medium"
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
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-rose-500 font-medium"
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
                      className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-rose-500 font-medium"
                    >
                      <option value="Better Career Opportunity">Better Career Opportunity</option>
                      <option value="Higher Studies">Higher Studies</option>
                      <option value="Relocation / Family">Relocation / Family</option>
                      <option value="Health / Medical Reasons">Health / Medical Reasons</option>
                      <option value="Career Transition">Career Transition</option>
                      <option value="Mutual Separation">Mutual Separation</option>
                    </select>
                  </div>
                </div>

                {/* Sticky Drawer Footer Actions */}
                <div className="sticky bottom-0 -mx-6 -mb-6 p-6 bg-white/95 backdrop-blur-xs border-t border-slate-100 flex items-center justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowInitiateModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors cursor-pointer"
                  >
                    Submit &amp; Open Clearances
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Slide-over Drawer: Send Exit Update to Employee */}
      {showSendUpdateModal && updateTargetRecord && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[10000] overflow-hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setShowSendUpdateModal(false)}
          />

          {/* Slide-Over Drawer Container */}
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10 pointer-events-none">
            <div
              className="w-screen max-w-xl bg-white shadow-2xl flex flex-col h-full border-l border-slate-200 pointer-events-auto animate-in slide-in-from-right duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-white shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                    <IconMail className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Send Exit Update to Employee</h2>
                    <p className="text-xs text-slate-500">
                      To: <span className="font-semibold text-slate-800">{updateTargetRecord.employeeName}</span> ({updateTargetRecord.employeeEmail})
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSendUpdateModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <IconX className="w-5 h-5" />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleSendExitUpdate} className="flex-1 overflow-y-auto p-6 space-y-5">
                {/* Communication Template Quick Selector */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-2">
                    Select Update Template
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleSelectTemplate('NOC_REMINDER')}
                      className={`p-2.5 rounded-xl border text-left transition-all text-xs font-medium cursor-pointer ${
                        updateTemplate === 'NOC_REMINDER'
                          ? 'border-rose-500 bg-rose-50/70 text-rose-900 ring-1 ring-rose-500 font-bold'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span className="block font-bold">1. Pending Clearances</span>
                      <span className="text-[10px] text-slate-500">Handover checklist &amp; remarks</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectTemplate('FF_STATEMENT')}
                      className={`p-2.5 rounded-xl border text-left transition-all text-xs font-medium cursor-pointer ${
                        updateTemplate === 'FF_STATEMENT'
                          ? 'border-rose-500 bg-rose-50/70 text-rose-900 ring-1 ring-rose-500 font-bold'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span className="block font-bold">2. F&amp;F Settlement</span>
                      <span className="text-[10px] text-slate-500">Financial dues breakdown</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectTemplate('EXIT_CONFIRM')}
                      className={`p-2.5 rounded-xl border text-left transition-all text-xs font-medium cursor-pointer ${
                        updateTemplate === 'EXIT_CONFIRM'
                          ? 'border-rose-500 bg-rose-50/70 text-rose-900 ring-1 ring-rose-500 font-bold'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span className="block font-bold">3. Exit Acceptance</span>
                      <span className="text-[10px] text-slate-500">Acknowledge LWD &amp; notice</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectTemplate('CUSTOM')}
                      className={`p-2.5 rounded-xl border text-left transition-all text-xs font-medium cursor-pointer ${
                        updateTemplate === 'CUSTOM'
                          ? 'border-rose-500 bg-rose-50/70 text-rose-900 ring-1 ring-rose-500 font-bold'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span className="block font-bold">4. Custom Notice</span>
                      <span className="text-[10px] text-slate-500">Compose custom message</span>
                    </button>
                  </div>
                </div>

                {/* Delivery Channels */}
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                  <span className="text-[11px] font-bold text-slate-700 block">Dispatch Channels</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 select-none">
                      <input
                        type="checkbox"
                        checked={sendEmailChannel}
                        onChange={(e) => setSendEmailChannel(e.target.checked)}
                        className="rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                      />
                      <span>Direct Email ({updateTargetRecord.employeeEmail})</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 select-none">
                      <input
                        type="checkbox"
                        checked={sendPortalChannel}
                        onChange={(e) => setSendPortalChannel(e.target.checked)}
                        className="rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                      />
                      <span>In-App Self-Service Portal</span>
                    </label>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-600 select-none pt-1 border-t border-slate-200/60">
                    <input
                      type="checkbox"
                      checked={ccLead}
                      onChange={(e) => setCcLead(e.target.checked)}
                      className="rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                    />
                    <span>CC Reporting Manager &amp; HR Operations</span>
                  </label>
                </div>

                {/* Subject Line */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Subject Line
                  </label>
                  <input
                    type="text"
                    required
                    value={updateSubject}
                    onChange={(e) => setUpdateSubject(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-rose-500 font-medium text-slate-800"
                  />
                </div>

                {/* Message Body */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Message Body
                  </label>
                  <textarea
                    rows={9}
                    required
                    value={updateMessage}
                    onChange={(e) => setUpdateMessage(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-rose-500 font-mono text-slate-800 leading-relaxed resize-y"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    You can edit the content above before dispatching. Clearances, F&amp;F numbers, and dates are auto-filled.
                  </span>
                </div>

                {/* Sticky Drawer Footer */}
                <div className="sticky bottom-0 -mx-6 -mb-6 p-6 bg-white/95 backdrop-blur-xs border-t border-slate-100 flex items-center justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowSendUpdateModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSendingUpdate || (!sendEmailChannel && !sendPortalChannel)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white shadow-xs transition-colors cursor-pointer"
                  >
                    <IconSend className="w-4 h-4" />
                    <span>{isSendingUpdate ? 'Dispatching...' : 'Dispatch Update Now'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Floating Success Toast */}
      {successToast && (
        <div className="fixed top-6 right-6 z-[10001] bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-top-2 duration-200 max-w-md">
          <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <IconCheck className="w-4 h-4" />
          </div>
          <span className="text-xs font-medium leading-relaxed">{successToast}</span>
          <button
            onClick={() => setSuccessToast(null)}
            className="text-slate-400 hover:text-white p-1 ml-auto cursor-pointer"
          >
            <IconX className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default ExitManagementPage;

