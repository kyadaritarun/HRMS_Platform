import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import ReportsNavigationHeader from './ReportsNavigationHeader';
import TablePagination from '../../components/common/TablePagination';
import DateRangePicker from '../../components/common/DateRangePicker';
import {
  IconSearch,
  IconCalendar,
  IconBuilding,
  IconFilter,
  IconDownload,
  IconPrinter,
  IconFileSpreadsheet,
  IconUser,
  IconCheck,
  IconX,
  IconClock,
  IconAlertCircle,
  IconFileCertificate,
  IconEye,
} from '@tabler/icons-react';

interface LeaveRecord {
  id: number;
  employee: {
    id: number;
    name: string;
    employeeNumber: string;
    email: string;
    jobTitle: string;
    department: string;
    profilePhoto?: string | null;
  };
  leaveType: {
    id: number;
    name: string;
    code: string;
    color: string;
    isPaid: boolean;
  };
  startDate?: string | null;
  endDate?: string | null;
  days: number;
  reason: string;
  status: string;
  appliedDate: string;
  approvedBy?: string | null;
  resolvedAt?: string | null;
  decisionNote?: string | null;
}

interface LeaveSummary {
  totalLeavesTaken: number;
  totalDaysTaken: number;
  activeLeavesToday: number;
  topLeaveType: string;
  distribution: Array<{ name: string; count: number; days: number }>;
}

export const LeaveTakenReportPage: React.FC = () => {
  // Date range defaults: 1st of month to today
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });

  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });

  const [leaveTypes, setLeaveTypes] = useState<Array<{ id: number; name: string; code: string }>>([]);
  const [departments, setDepartments] = useState<Array<{ id: number; name: string }>>([]);

  const [selectedLeaveType, setSelectedLeaveType] = useState<string>('');
  const [selectedDept, setSelectedDept] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('APPROVED');
  const [search, setSearch] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');

  const [leaves, setLeaves] = useState<LeaveRecord[]>([]);
  const [summary, setSummary] = useState<LeaveSummary | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Selected leave request for detail modal
  const [selectedLeave, setSelectedLeave] = useState<LeaveRecord | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch departments & leave types
  useEffect(() => {
    Promise.all([
      api.get('/company/departments').catch(() => ({ data: [] })),
      api.get('/company/leaves/types').catch(() => ({ data: [] })),
    ]).then(([deptRes, leaveRes]) => {
      setDepartments(deptRes.data?.departments || deptRes.data || []);
      setLeaveTypes(leaveRes.data?.leaveTypes || leaveRes.data || []);
    });
  }, []);

  // Fetch Leave Taken Report
  const fetchLeaves = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/reports/leave-taken', {
        params: {
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          departmentId: selectedDept || undefined,
          leaveTypeId: selectedLeaveType || undefined,
          status: statusFilter,
          search: debouncedSearch || undefined,
          page: currentPage,
          pageSize,
        },
      });

      setLeaves(res.data?.leaves || []);
      setTotalCount(res.data?.total || 0);
      setSummary(res.data?.summary || null);
    } catch (err) {
      console.error('Failed to load leave taken report:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, selectedDept, selectedLeaveType, statusFilter, debouncedSearch, currentPage, pageSize]);

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const res = await api.get('/reports/leave-taken/export', {
        params: {
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          departmentId: selectedDept || undefined,
          leaveTypeId: selectedLeaveType || undefined,
          status: statusFilter,
          search: debouncedSearch || undefined,
        },
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `leave_taken_report_${startDate || 'all'}_${endDate || 'all'}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export leave taken report:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const formatDisplayDate = (dStr?: string | null) => {
    if (!dStr) return '-';
    const d = new Date(dStr);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <ReportsNavigationHeader
        title="Leave Taken Report"
        description="Comprehensive audit of all leaves taken across the organization, date spans, leave types, and approvals."
        icon={IconCalendar}
        iconColor="from-purple-600 to-indigo-600"
        rightAction={
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={isExporting || isLoading}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#5E4BE2] to-[#4B39C3] hover:from-[#5340D4] hover:to-[#4130B4] text-white text-xs font-bold rounded-xl shadow-sm shadow-indigo-600/25 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
            title="Download Excel Spreadsheet"
          >
            <IconDownload className="w-4 h-4" />
            <span>{isExporting ? 'Exporting...' : 'Export'}</span>
          </button>
        }
      />

      {/* Summary KPI Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Total Leaves Taken
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-black text-slate-900">{summary.totalLeavesTaken}</span>
              <span className="text-[11px] text-slate-400 font-medium">approved requests</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Total Days Consumed
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-black text-purple-600">{summary.totalDaysTaken}</span>
              <span className="text-[11px] text-purple-500/80 font-medium">leave days</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              On Leave Today
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-black text-emerald-600">{summary.activeLeavesToday}</span>
              <span className="text-[11px] text-emerald-600/80 font-medium">employees</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Most Taken Type
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-black text-slate-900 truncate">
                {summary.topLeaveType || 'N/A'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Search & Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Live Search Input */}
          <div className="relative flex-1 min-w-[220px]">
            <IconSearch className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search employee by name, code, reason..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 text-xs font-medium bg-slate-50/70 border border-slate-200/80 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#5E4BE2]/20 focus:border-[#5E4BE2] transition-all placeholder:text-slate-400 text-slate-800"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                title="Clear search"
              >
                <IconX className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filters: Date Range, Leave Type, Department & Status */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Date Range Picker */}
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onChange={(start, end) => {
                setStartDate(start);
                setEndDate(end);
              }}
            />

            {/* Leave Type Dropdown */}
            <div className="min-w-[150px]">
              <select
                value={selectedLeaveType}
                onChange={(e) => {
                  setSelectedLeaveType(e.target.value);
                  setCurrentPage(1);
                }}
                aria-label="Filter by leave type"
                className="w-full px-3 py-2.5 text-xs font-semibold bg-slate-50/70 border border-slate-200/80 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#5E4BE2]/20 focus:border-[#5E4BE2] transition-all text-slate-700 cursor-pointer"
              >
                <option value="">All Leave Types</option>
                {leaveTypes.map((lt) => (
                  <option key={lt.id} value={lt.id}>
                    {lt.name} ({lt.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Department Dropdown */}
            <div className="min-w-[160px]">
              <select
                value={selectedDept}
                onChange={(e) => {
                  setSelectedDept(e.target.value);
                  setCurrentPage(1);
                }}
                aria-label="Filter by department"
                className="w-full px-3 py-2.5 text-xs font-semibold bg-slate-50/70 border border-slate-200/80 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#5E4BE2]/20 focus:border-[#5E4BE2] transition-all text-slate-700 cursor-pointer"
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter Dropdown */}
            <div className="min-w-[130px]">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                aria-label="Filter by status"
                className="w-full px-3 py-2.5 text-xs font-semibold bg-slate-50/70 border border-slate-200/80 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#5E4BE2]/20 focus:border-[#5E4BE2] transition-all text-slate-700 cursor-pointer"
              >
                <option value="APPROVED">Approved Only</option>
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending Only</option>
                <option value="REJECTED">Rejected Only</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Leave History Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#e5e7eb] text-xs font-bold text-slate-900 border-b border-slate-300">
              <tr>
                <th className="py-3.5 px-4">Employee</th>
                <th className="py-3.5 px-4">Leave Type</th>
                <th className="py-3.5 px-4">Leave Duration (From → To)</th>
                <th className="py-3.5 px-4 text-center">Days</th>
                <th className="py-3.5 px-4">Reason</th>
                <th className="py-3.5 px-4">Applied Date</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4">Approved By</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-500">
                    <div className="inline-block w-6 h-6 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin mb-2" />
                    <div className="text-xs font-semibold">Loading leave taken records...</div>
                  </td>
                </tr>
              ) : leaves.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500 font-medium">
                    No leave records found matching your filters.
                  </td>
                </tr>
              ) : (
                leaves.map((leave) => {
                  const fromStr = formatDisplayDate(leave.startDate);
                  const toStr = formatDisplayDate(leave.endDate);

                  return (
                    <tr key={leave.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* 1. Employee */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs overflow-hidden uppercase">
                            {leave.employee.profilePhoto ? (
                              <img src={leave.employee.profilePhoto} alt={leave.employee.name} className="w-full h-full object-cover" />
                            ) : (
                              leave.employee.name.charAt(0) || 'E'
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 truncate leading-snug">{leave.employee.name}</div>
                            {leave.employee.employeeNumber ? (
                              <div className="text-[11px] text-slate-500 font-mono font-medium">{leave.employee.employeeNumber}</div>
                            ) : null}
                          </div>
                        </div>
                      </td>

                      {/* 2. Leave Type */}
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                          {leave.leaveType.name}
                        </span>
                      </td>

                      {/* 3. Duration Span (From → To) */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-900 text-xs">
                          {fromStr} <span className="text-slate-400 font-bold mx-1">→</span> {toStr}
                        </div>
                      </td>

                      {/* 4. Days */}
                      <td className="py-3 px-4 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-800">
                          {leave.days} {leave.days === 1 ? 'Day' : 'Days'}
                        </span>
                      </td>

                      {/* 5. Reason */}
                      <td className="py-3 px-4 max-w-xs truncate" title={leave.reason}>
                        <span className="text-slate-600">{leave.reason}</span>
                      </td>

                      {/* 6. Applied Date */}
                      <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-medium">
                        {formatDisplayDate(leave.appliedDate)}
                      </td>

                      {/* 7. Status */}
                      <td className="py-3 px-4 text-center">
                        {leave.status === 'APPROVED' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <IconCheck className="w-3 h-3 text-emerald-600" />
                            Approved
                          </span>
                        ) : leave.status === 'PENDING' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <IconClock className="w-3 h-3 text-amber-600" />
                            Pending
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <IconX className="w-3 h-3 text-rose-600" />
                            {leave.status}
                          </span>
                        )}
                      </td>

                      {/* 8. Approved By */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {leave.approvedBy ? (
                          <div>
                            <span className="font-semibold text-slate-800 text-xs block">{leave.approvedBy}</span>
                            {leave.resolvedAt && (
                              <span className="text-[10px] text-slate-400 block">{formatDisplayDate(leave.resolvedAt)}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 font-mono text-xs">-</span>
                        )}
                      </td>

                      {/* 9. Action Button */}
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedLeave(leave)}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900 font-semibold text-xs inline-flex items-center gap-1 transition-colors cursor-pointer"
                          title="View Full Leave History & Audit Details"
                        >
                          <IconEye className="w-3.5 h-3.5" />
                          <span>Details</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <TablePagination
          currentPage={currentPage}
          totalItems={totalCount}
          pageSize={pageSize}
          onPageChange={(p: number) => setCurrentPage(p)}
          onPageSizeChange={(ps: number) => {
            setPageSize(ps);
            setCurrentPage(1);
          }}
          itemName="leave records"
        />
      </div>

      {/* Leave Detail History Modal */}
      {selectedLeave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                  <IconFileCertificate className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Leave History Record</h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {selectedLeave.employee.name} • {selectedLeave.leaveType.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLeave(null)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center cursor-pointer"
              >
                <IconX className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Leave Span</span>
                  <div className="font-bold text-slate-900 text-xs">
                    {formatDisplayDate(selectedLeave.startDate)} → {formatDisplayDate(selectedLeave.endDate)}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Total Days</span>
                  <div className="font-bold text-purple-700 text-sm">
                    {selectedLeave.days} {selectedLeave.days === 1 ? 'Day' : 'Days'}
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Stated Reason</span>
                <p className="text-slate-800 leading-relaxed">{selectedLeave.reason || 'No reason provided'}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Applied Date</span>
                  <span className="font-semibold text-slate-800">{formatDisplayDate(selectedLeave.appliedDate)}</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Status</span>
                  <span className="font-bold text-emerald-700">{selectedLeave.status}</span>
                </div>
              </div>

              {selectedLeave.approvedBy && (
                <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80">
                  <span className="text-[10px] uppercase font-bold text-emerald-800 block mb-0.5">Approver Information</span>
                  <div className="font-bold text-slate-900">{selectedLeave.approvedBy}</div>
                  {selectedLeave.decisionNote && (
                    <p className="text-[11px] text-slate-600 mt-1 italic">
                      "{selectedLeave.decisionNote}"
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedLeave(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
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

export default LeaveTakenReportPage;
