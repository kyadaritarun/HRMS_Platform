import React, { useState, useEffect, useMemo } from 'react';
import api from '../../api/client';
import ReportsNavigationHeader from './ReportsNavigationHeader';
import DateRangePicker from '../../components/common/DateRangePicker';
import {
  IconSearch,
  IconDownload,
  IconPrinter,
  IconCalendar,
  IconBuilding,
  IconAlertTriangle,
  IconClock,
  IconCheck,
  IconX,
  IconFileSpreadsheet,
  IconUsers,
  IconBriefcase,
  IconChevronRight,
  IconWorld,
  IconMapPin,
} from '@tabler/icons-react';

interface DateColumn {
  dateKey: string;
  formattedDate: string;
  dayName: string;
  dayOfWeek: number;
  isWeekend: boolean;
  rawDate: string;
}

interface PunchDetail {
  hasPunch: boolean;
  checkIn?: string | null;
  checkOut?: string | null;
  checkInRaw?: string | null;
  checkOutRaw?: string | null;
  durationHours?: number;
  workMode?: string;
  note?: string;
  isLate?: boolean;
  isMissingPunch?: boolean;
  isOngoing?: boolean;
  isOnLeave?: boolean;
  isWeekend?: boolean;
  leave?: {
    id: number;
    name: string;
    code: string;
    color: string;
    days: number;
  };
}

interface EmployeePunchRow {
  id: number;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  employeeNumber: string;
  jobTitle: string;
  department: string;
  departmentId: number | null;
  profilePhoto?: string | null;
  shiftName: string;
  punchesByDate: Record<string, PunchDetail>;
}

interface ReportSummary {
  totalEmployees: number;
  totalPunchesCount: number;
  totalLatePunches: number;
  totalMissingCheckouts: number;
  totalWorkedHours: number;
  averageHoursPerPunch: number;
}

export const DailyPunchReportPage: React.FC = () => {
  // Date range defaults: 1st of current month to today (or last 10 days)
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 10);
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

  const [departments, setDepartments] = useState<Array<{ id: number; name: string }>>([]);
  const [selectedDept, setSelectedDept] = useState<string>('');
  const [search, setSearch] = useState<string>('');

  const [dates, setDates] = useState<DateColumn[]>([]);
  const [employees, setEmployees] = useState<EmployeePunchRow[]>([]);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [companyWorkingDays, setCompanyWorkingDays] = useState<string>('mon,tue,wed,thu,fri');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Selected Punch detail for popup inspection
  const [inspectedPunch, setInspectedPunch] = useState<{
    employee: EmployeePunchRow;
    date: DateColumn;
    punch: PunchDetail;
  } | null>(null);

  // Fetch departments list
  useEffect(() => {
    api
      .get('/company/departments')
      .then((res) => {
        setDepartments(res.data?.departments || res.data || []);
      })
      .catch(() => {});
  }, []);

  // Helper: Format policy summary for header
  const getWeeklyOffBadgeLabel = (scheduleStr: string) => {
    const norm = (scheduleStr || 'mon,tue,wed,thu,fri').toLowerCase();
    if (norm === 'mon,tue,wed,thu,fri,sat') return '6-Day Work Week (Sunday Off)';
    if (norm === 'mon,tue,wed,thu,fri,alt_sat') return 'Alternate Saturdays (Sun + 2nd/4th Sat Off)';
    if (norm === 'mon,tue,wed,thu,fri') return '5-Day Work Week (Sat & Sun Off)';
    return 'Custom Working Days Policy';
  };

  // Fetch Daily Punch report
  const fetchReport = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/reports/daily-punch', {
        params: {
          startDate,
          endDate,
          departmentId: selectedDept || undefined,
        },
      });

      setDates(res.data?.dates || []);
      setEmployees(res.data?.employees || []);
      setSummary(res.data?.summary || null);
      if (res.data?.companyWorkingDays) {
        setCompanyWorkingDays(res.data.companyWorkingDays);
      }
    } catch (err) {
      console.error('Failed to fetch daily punch report:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, selectedDept]);

  // Listen for real-time updates when Working Days / Roster changes
  useEffect(() => {
    const handleUpdate = () => {
      fetchReport();
    };
    window.addEventListener('company-settings-updated', handleUpdate);
    window.addEventListener('attendance-updated', handleUpdate);
    return () => {
      window.removeEventListener('company-settings-updated', handleUpdate);
      window.removeEventListener('attendance-updated', handleUpdate);
    };
  }, [startDate, endDate, selectedDept]);

  // Export to Excel
  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const res = await api.get('/reports/daily-punch/export', {
        params: {
          startDate,
          endDate,
          departmentId: selectedDept || undefined,
          search: search || undefined,
        },
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `daily_punch_report_${startDate}_${endDate}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export daily punch report:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <ReportsNavigationHeader
        title="Daily Punch Report"
        description="Comprehensive audit of daily biometric & web punches, check-in/check-out anomalies, and shift durations."
        icon={IconClock}
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Total Employees
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-black text-slate-900">{summary.totalEmployees}</span>
              <span className="text-[11px] text-slate-400 font-medium">on roster</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Total Recorded Punches
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-black text-indigo-600">{summary.totalPunchesCount}</span>
              <span className="text-[11px] text-indigo-500/80 font-medium">in range</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Late Check-ins
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-black text-amber-600">{summary.totalLatePunches}</span>
              <span className="text-[11px] text-amber-600/80 font-medium">anomalies ⚠️</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Missing Check-outs
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-black text-rose-600">{summary.totalMissingCheckouts}</span>
              <span className="text-[11px] text-rose-500/80 font-medium">pending</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs col-span-2 sm:col-span-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Total Hours Worked
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-black text-slate-900">{summary.totalWorkedHours}h</span>
              <span className="text-[11px] text-slate-400 font-medium">avg {summary.averageHoursPerPunch}h/day</span>
            </div>
          </div>
        </div>
      )}

      {/* Search & Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Live Search Input */}
          <div className="relative flex-1 min-w-[220px]">
            <IconSearch className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search employee by name, code, or role..."
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

          {/* Date Range Selector & Department Dropdown */}
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

            {/* Department Dropdown */}
            <div className="min-w-[180px]">
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
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
          </div>
        </div>

        {/* Color & Status Legend & Active Policy */}
        <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-500 font-medium">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200/80 text-indigo-700 text-[10px] font-bold">
              Active Policy
            </span>
            <span className="text-slate-700 font-bold">{getWeeklyOffBadgeLabel(companyWorkingDays)}</span>
          </div>

          <div className="flex items-center gap-3 flex-wrap text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Normal Punch</span>
            </div>
            <div className="flex items-center gap-1.5">
              <IconAlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              <span>Late In / Early Out</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
              <span>Approved Leave</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">WO</span>
              <span>Weekly Off</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400">
              <span className="font-mono font-bold">-</span>
              <span>Absent / Unrecorded</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Punch Matrix Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#e5e7eb] text-xs font-bold text-slate-900 border-b border-slate-300">
              <tr>
                {/* Fixed Left Header Columns */}
                <th className="py-3.5 px-4 sticky left-0 bg-[#e5e7eb] z-20 shadow-xs min-w-[200px] border-r border-slate-300">
                  <div className="flex items-center gap-1.5">
                    <IconUsers className="w-4 h-4 text-indigo-600" />
                    <span>Employee</span>
                  </div>
                </th>
                <th className="py-3.5 px-4 sticky left-[200px] bg-[#e5e7eb] z-20 shadow-xs min-w-[190px] border-r border-slate-300">
                  <div className="flex items-center gap-1.5">
                    <IconBriefcase className="w-4 h-4 text-slate-600" />
                    <span>Roles &amp; Dept</span>
                  </div>
                </th>

                {/* Dynamic Date Headers */}
                {dates.map((col) => (
                  <th
                    key={col.dateKey}
                    className={`py-3 px-3 text-center min-w-[130px] border-r border-slate-300/80 transition-colors ${
                      col.isWeekend ? 'bg-[#d8dbe0] text-slate-800' : 'bg-[#e5e7eb] text-slate-900'
                    }`}
                  >
                    <div className="font-black text-xs text-slate-900">{col.formattedDate}</div>
                    <div className="text-[10px] font-semibold text-slate-600 flex items-center justify-center gap-1 mt-0.5">
                      <span>{col.dayName}</span>
                      {col.isWeekend && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-slate-300 text-slate-700 uppercase tracking-tight">
                          Off
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={dates.length + 2} className="py-16 text-center text-slate-500">
                    <div className="inline-block w-6 h-6 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin mb-2" />
                    <div className="text-xs font-semibold">Generating daily punch report...</div>
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={dates.length + 2} className="py-12 text-center text-slate-500 font-medium">
                    No employee records found matching your filters.
                  </td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/70 transition-colors group">
                    {/* 1. Sticky Employee Name & ID Column */}
                    <td className="py-3 px-4 sticky left-0 bg-white group-hover:bg-slate-50/90 z-10 shadow-xs border-r border-slate-200/70">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs overflow-hidden uppercase">
                          {emp.profilePhoto ? (
                            <img src={emp.profilePhoto} alt={emp.fullName} className="w-full h-full object-cover" />
                          ) : (
                            emp.fullName.charAt(0) || 'E'
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 truncate leading-snug">{emp.fullName}</div>
                          {emp.employeeNumber ? (
                            <div className="text-[11px] text-slate-500 font-mono font-medium">{emp.employeeNumber}</div>
                          ) : null}
                        </div>
                      </div>
                    </td>

                    {/* 2. Sticky Role & Department Column */}
                    <td className="py-3 px-4 sticky left-[200px] bg-white group-hover:bg-slate-50/90 z-10 shadow-xs border-r border-slate-200">
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-800 truncate leading-snug">{emp.jobTitle}</div>
                        <div className="text-[11px] text-slate-500 font-medium truncate uppercase tracking-wider">
                          {emp.department}
                        </div>
                      </div>
                    </td>

                    {/* 3. Daily Punch Cells */}
                    {dates.map((col) => {
                      const punch = emp.punchesByDate[col.dateKey] || { hasPunch: false };

                      if (punch.hasPunch) {
                        const hasAnomaly = punch.isLate || punch.isMissingPunch;
                        return (
                          <td
                            key={col.dateKey}
                            onClick={() => setInspectedPunch({ employee: emp, date: col, punch })}
                            className={`py-2.5 px-3 text-center border-r border-slate-100 cursor-pointer transition-colors ${
                              hasAnomaly ? 'bg-amber-50/80 hover:bg-amber-100/70' : 'hover:bg-indigo-50/50'
                            }`}
                            title="Click to view full punch session details"
                          >
                            <div className="space-y-0.5">
                              {/* Check In */}
                              <div className="inline-flex items-center gap-1 font-mono font-bold text-slate-900 text-xs">
                                <span>{punch.checkIn}</span>
                                {punch.isLate && (
                                  <span title="Late Check-in (after shift grace period)">
                                    <IconAlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                  </span>
                                )}
                              </div>

                              {/* Check Out */}
                              <div className="font-mono text-[11px]">
                                {punch.checkOut ? (
                                  <span className="text-slate-600 font-medium">{punch.checkOut}</span>
                                ) : punch.isMissingPunch ? (
                                  <span className="text-rose-600 font-bold inline-flex items-center gap-0.5" title="Missing Checkout (Shift ended without punch-out)">
                                    <span>No Out</span>
                                    <IconAlertTriangle className="w-3 h-3 text-rose-500" />
                                  </span>
                                ) : punch.isOngoing ? (
                                  <span className="text-emerald-600 font-semibold text-[10px]" title="Currently on shift">
                                    In Progress
                                  </span>
                                ) : (
                                  <span className="text-slate-400 font-mono">-</span>
                                )}
                              </div>

                              {/* Duration Pill */}
                              {punch.durationHours && punch.durationHours > 0 ? (
                                <span className="inline-block px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                                  {punch.durationHours}h
                                </span>
                              ) : null}
                            </div>
                          </td>
                        );
                      }

                      if (punch.isOnLeave && punch.leave) {
                        return (
                          <td
                            key={col.dateKey}
                            className="py-2.5 px-2 text-center border-r border-slate-100 bg-purple-50/40"
                          >
                            <span
                              className="inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200/80"
                              title={`${punch.leave.name} (${punch.leave.days} Day)`}
                            >
                              Leave ({punch.leave.code})
                            </span>
                          </td>
                        );
                      }

                      const isWeeklyOff = Boolean(punch?.isWeekend ?? col.isWeekend);

                      return (
                        <td
                          key={col.dateKey}
                          className={`py-2.5 px-3 text-center border-r border-slate-100 font-mono text-slate-400 ${
                            isWeeklyOff ? 'bg-slate-50/70' : ''
                          }`}
                        >
                          {isWeeklyOff ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200/80">
                              Weekly Off
                            </span>
                          ) : (
                            <span className="text-xs font-bold text-slate-300">-</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Punch Detail Modal / Popover */}
      {inspectedPunch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <IconClock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Punch Session Details</h3>
                  <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5 flex-wrap">
                    <span>{inspectedPunch.employee.fullName} • {inspectedPunch.date.formattedDate} ({inspectedPunch.date.dayName})</span>
                    {(inspectedPunch.punch.isWeekend || inspectedPunch.date.isWeekend) && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-200 text-slate-700">
                        Weekly Off Day
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectedPunch(null)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center cursor-pointer"
              >
                <IconX className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Punch-In Time</span>
                  <div className="font-mono font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    <span>{inspectedPunch.punch.checkIn || '-'}</span>
                    {inspectedPunch.punch.isLate && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                        Late
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Punch-Out Time</span>
                  <div className="font-mono font-bold text-slate-900 text-sm">
                    {inspectedPunch.punch.checkOut ? (
                      inspectedPunch.punch.checkOut
                    ) : inspectedPunch.punch.isMissingPunch ? (
                      <span className="text-rose-600 font-semibold text-xs flex items-center gap-1">
                        <IconAlertTriangle className="w-3.5 h-3.5" /> Missing Checkout
                      </span>
                    ) : (
                      <span className="text-emerald-600 font-semibold text-xs">
                        Shift in Progress (Active)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Duration</span>
                  <span className="font-bold text-indigo-700 text-sm">
                    {inspectedPunch.punch.durationHours || 0} Hours
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Work Mode</span>
                  <span className="font-bold text-slate-800 capitalize">
                    {inspectedPunch.punch.workMode || 'WFO'}
                  </span>
                </div>
              </div>

              {inspectedPunch.punch.note && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Punch Note</span>
                  <p className="text-slate-700">{inspectedPunch.punch.note}</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setInspectedPunch(null)}
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

export default DailyPunchReportPage;

