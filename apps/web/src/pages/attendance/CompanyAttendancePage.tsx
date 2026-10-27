import React, { useState, useEffect, useMemo, useRef } from 'react';
import api from '../../api/client';
import TablePagination from '../../components/common/TablePagination';
import {
  IconClock,
  IconDownload,
  IconCalendar,
  IconSearch,
  IconBuilding,
  IconUser,
  IconCheck,
  IconUserCheck,
  IconAlertCircle,
  IconX,
  IconFileSpreadsheet,
  IconSparkles,
  IconChevronDown,
} from '@tabler/icons-react';

interface CompanyAttendanceLog {
  id: number;
  checkIn: string;
  checkOut?: string | null;
  workMode: string;
  durationHours?: number | null;
  note?: string | null;
  user: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    jobTitle: string;
    department?: { id?: number; name: string } | null;
    profilePhoto?: string | null;
  };
}

interface Department {
  id: number;
  name: string;
}

export const CompanyAttendancePage: React.FC = () => {
  const [logs, setLogs] = useState<CompanyAttendanceLog[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [totalWorkforce, setTotalWorkforce] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('');
  const [selectedWorkMode, setSelectedWorkMode] = useState<'ALL' | 'OFFICE' | 'WFH'>('ALL');
  const [isExporting, setIsExporting] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Export dropdown & range state
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'xlsx' | 'csv'>('xlsx');
  const [exportFromDate, setExportFromDate] = useState(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}-01`;
  });
  const [exportToDate, setExportToDate] = useState(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
    return `${y}-${m}-${String(lastDay).padStart(2, '0')}`;
  });
  const exportDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(e.target as Node)) {
        setIsExportDropdownOpen(false);
      }
    };
    if (isExportDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExportDropdownOpen]);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/company/attendance', { params: { date } });
      setLogs(res.data?.records || res.data?.items || []);
    } catch (err) {
      console.error('Failed to load company attendance:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await api.get('/company/departments');
      setDepartments(res.data?.departments || []);
    } catch (err) {
      console.error('Failed to load departments:', err);
    }
  };

  const fetchWorkforceCount = async () => {
    try {
      const res = await api.get('/employees');
      setTotalWorkforce(res.data?.items?.length || res.data?.total || 0);
    } catch (err) {
      console.error('Failed to load workforce count:', err);
    }
  };

  useEffect(() => {
    fetchDepartments();
    fetchWorkforceCount();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [date]);

  const handleExport = async (formatOverride?: 'xlsx' | 'csv') => {
    const fmt = formatOverride || exportFormat;
    setIsExporting(true);
    try {
      const res = await api.get('/company/attendance/export', {
        params: {
          format: fmt,
          from: exportFromDate,
          to: exportToDate,
        },
        responseType: 'blob',
      });
      const ext = fmt === 'csv' ? 'csv' : 'xlsx';
      const filename = `Attendance_Report_${exportFromDate}_to_${exportToDate}.${ext}`;
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setIsExportDropdownOpen(false);
    } catch (err) {
      console.error('Failed to export attendance:', err);
      alert(`Failed to export attendance ${fmt.toUpperCase()} file.`);
    } finally {
      setIsExporting(false);
    }
  };

  // KPI Attendance Metrics calculated live from records
  const kpiStats = useMemo(() => {
    const presentCount = logs.length;
    const activeNow = logs.filter((l) => !l.checkOut).length;
    const completedShifts = logs.filter((l) => Boolean(l.checkOut));

    const totalDuration = completedShifts.reduce((acc, curr) => {
      return acc + (Number(curr.durationHours) || 0);
    }, 0);

    const avgHours = completedShifts.length > 0 ? (totalDuration / completedShifts.length).toFixed(1) : '—';
    const remoteCount = logs.filter((l) => l.workMode === 'WFH' || l.workMode === 'REMOTE').length;
    const onSiteCount = logs.filter((l) => l.workMode !== 'WFH' && l.workMode !== 'REMOTE').length;
    const attendanceRate = totalWorkforce > 0 ? Math.round((presentCount / totalWorkforce) * 100) : null;

    return {
      presentCount,
      activeNow,
      completedCount: completedShifts.length,
      avgHours,
      remoteCount,
      onSiteCount,
      attendanceRate,
    };
  }, [logs, totalWorkforce]);

  // Filter logs by search, department, and work mode
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (search) {
        const name = `${log.user?.firstName || ''} ${log.user?.lastName || ''}`.toLowerCase();
        const email = (log.user?.email || '').toLowerCase();
        const q = search.toLowerCase();
        if (!name.includes(q) && !email.includes(q)) return false;
      }

      if (selectedDept) {
        if (!log.user?.department?.name || log.user.department.name !== selectedDept) {
          return false;
        }
      }

      if (selectedWorkMode !== 'ALL') {
        if (selectedWorkMode === 'WFH') {
          if (log.workMode !== 'WFH' && log.workMode !== 'REMOTE') return false;
        }
        if (selectedWorkMode === 'OFFICE') {
          if (
            log.workMode !== 'WFO' &&
            log.workMode !== 'ON_SITE' &&
            log.workMode !== 'ONSITE' &&
            log.workMode !== 'OFFICE' &&
            log.workMode !== 'HYBRID' &&
            Boolean(log.workMode)
          ) {
            return false;
          }
        }
      }

      return true;
    });
  }, [logs, search, selectedDept, selectedWorkMode]);

  // Paginated logs for current page
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, currentPage, pageSize]);

  const getWorkModeBadge = (mode: string) => {
    if (mode === 'WFH' || mode === 'REMOTE') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/70 shadow-2xs">
          Work From Home
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/70 shadow-2xs">
        Office
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* ===================== TOP HEADER BAR ===================== */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <IconClock className="w-5 h-5 text-indigo-600 shrink-0" />
            <span>Employee Attendance</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time biometric & GPS tracking records across all company departments.
          </p>
        </div>

        {/* Export Dropdown Trigger & Panel */}
        <div className="relative self-stretch sm:self-auto" ref={exportDropdownRef}>
          <button
            onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
            className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-2.5 px-4 py-2.5 bg-gradient-to-r from-[#5E4BE2] to-[#4B39C3] hover:from-[#5340D4] hover:to-[#4130B4] text-white text-xs font-bold rounded-xl shadow-sm shadow-indigo-600/25 active:scale-[0.98] transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <IconDownload className="w-4 h-4" />
              <span>Export</span>
            </div>
            <IconChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                isExportDropdownOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {isExportDropdownOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200/90 p-5 z-50 animate-in fade-in zoom-in-95 duration-150">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 text-[#5E4BE2] flex items-center justify-center shrink-0">
                    <IconFileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Export Attendance</h4>
                    <p className="text-[11px] text-slate-400">Download formatted records</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsExportDropdownOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <IconX className="w-4 h-4" />
                </button>
              </div>

              {/* 1. Format Selection */}
              <div className="mt-3.5 space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Select Download Format
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setExportFormat('xlsx')}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      exportFormat === 'xlsx'
                        ? 'bg-emerald-50/70 border-emerald-500 text-emerald-800 shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-white hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0 ${
                        exportFormat === 'xlsx' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      XLS
                    </div>
                    <div className="text-left min-w-0">
                      <div className="leading-tight text-xs">Excel (.xlsx)</div>
                      <div className="text-[10px] font-normal text-slate-400 truncate">Spreadsheet</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExportFormat('csv')}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      exportFormat === 'csv'
                        ? 'bg-blue-50/70 border-blue-500 text-blue-800 shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-white hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0 ${
                        exportFormat === 'csv' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      CSV
                    </div>
                    <div className="text-left min-w-0">
                      <div className="leading-tight text-xs">CSV (.csv)</div>
                      <div className="text-[10px] font-normal text-slate-400 truncate">Plain text table</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* 2. Date Range (From Date - To Date) */}
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Date Range (From - To)
                  </label>
                  <span className="text-[10px] font-semibold text-indigo-600">
                    {exportFromDate === exportToDate
                      ? exportFromDate
                      : `${exportFromDate} → ${exportToDate}`}
                  </span>
                </div>

                {/* Preset shortcuts */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    {
                      label: 'Today',
                      getRange: () => {
                        const now = new Date();
                        const y = now.getFullYear();
                        const m = String(now.getMonth() + 1).padStart(2, '0');
                        const d = String(now.getDate()).padStart(2, '0');
                        return [`${y}-${m}-${d}`, `${y}-${m}-${d}`];
                      },
                    },
                    {
                      label: 'This Month',
                      getRange: () => {
                        const now = new Date();
                        const y = now.getFullYear();
                        const m = String(now.getMonth() + 1).padStart(2, '0');
                        const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
                        return [`${y}-${m}-01`, `${y}-${m}-${String(lastDay).padStart(2, '0')}`];
                      },
                    },
                    {
                      label: 'Last Month',
                      getRange: () => {
                        const now = new Date();
                        const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                        const y = d.getFullYear();
                        const m = String(d.getMonth() + 1).padStart(2, '0');
                        const lastDay = new Date(y, d.getMonth() + 1, 0).getDate();
                        return [`${y}-${m}-01`, `${y}-${m}-${String(lastDay).padStart(2, '0')}`];
                      },
                    },
                    {
                      label: 'Last 3 Months',
                      getRange: () => {
                        const now = new Date();
                        const start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
                        const sy = start.getFullYear();
                        const sm = String(start.getMonth() + 1).padStart(2, '0');
                        const ey = now.getFullYear();
                        const em = String(now.getMonth() + 1).padStart(2, '0');
                        const lastDay = new Date(ey, now.getMonth() + 1, 0).getDate();
                        return [`${sy}-${sm}-01`, `${ey}-${em}-${String(lastDay).padStart(2, '0')}`];
                      },
                    },
                    {
                      label: 'Full Year',
                      getRange: () => {
                        const y = new Date().getFullYear();
                        return [`${y}-01-01`, `${y}-12-31`];
                      },
                    },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        const [from, to] = preset.getRange();
                        setExportFromDate(from);
                        setExportToDate(to);
                      }}
                      className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-100 hover:bg-indigo-50 hover:text-[#5E4BE2] text-slate-600 transition-colors cursor-pointer"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* From Date & To Date Selectors */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 block mb-1">From Date</span>
                    <input
                      type="date"
                      value={exportFromDate}
                      onChange={(e) => {
                        setExportFromDate(e.target.value);
                        if (e.target.value > exportToDate) {
                          setExportToDate(e.target.value);
                        }
                      }}
                      className="w-full px-2.5 py-1.5 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#5E4BE2]/20 focus:border-[#5E4BE2] cursor-pointer"
                    />
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-500 block mb-1">To Date</span>
                    <input
                      type="date"
                      value={exportToDate}
                      min={exportFromDate}
                      onChange={(e) => setExportToDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#5E4BE2]/20 focus:border-[#5E4BE2] cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsExportDropdownOpen(false)}
                  disabled={isExporting}
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleExport()}
                  disabled={isExporting}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-[#5E4BE2] to-[#4B39C3] hover:from-[#5340D4] hover:to-[#4130B4] rounded-xl shadow-sm shadow-indigo-600/25 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
                >
                  <IconDownload className="w-3.5 h-3.5" />
                  <span>
                    {isExporting ? 'Generating...' : `Download .${exportFormat.toUpperCase()}`}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===================== ROW 2: SEARCH & FILTERS BAR ===================== */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <IconSearch className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search employee by name or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-10 py-2.5 text-xs font-medium bg-slate-50/70 border border-slate-200/80 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#5E4BE2]/20 focus:border-[#5E4BE2] transition-all placeholder:text-slate-400 text-slate-800"
          />
          {search && (
            <button
              onClick={() => {
                setSearch('');
                setCurrentPage(1);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
            >
              <IconX className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Date Selector, Department & Work Mode Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Date Picker */}
          <div className="flex items-center gap-2 bg-slate-50/70 border border-slate-200/80 px-3 py-1.5 rounded-xl">
            <IconCalendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Date:</span>
            <input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setCurrentPage(1);
              }}
              className="text-xs font-bold text-slate-800 bg-transparent focus:outline-hidden cursor-pointer"
            />
          </div>

          {/* Department Filter */}
          <div className="min-w-[170px]">
            <select
              value={selectedDept}
              onChange={(e) => {
                setSelectedDept(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2.5 text-xs font-semibold bg-slate-50/70 border border-slate-200/80 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#5E4BE2]/20 focus:border-[#5E4BE2] transition-all text-slate-700 cursor-pointer"
            >
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.name}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          {/* Work Mode Toggle Pills */}
          <div className="flex items-center bg-slate-50/80 border border-slate-200/70 p-1 rounded-xl">
            {(['ALL', 'OFFICE', 'WFH'] as const).map((mode) => {
              const label =
                mode === 'ALL'
                  ? 'All'
                  : mode === 'OFFICE'
                  ? 'Office'
                  : 'Work From Home';
              const isActive = selectedWorkMode === mode;
              return (
                <button
                  key={mode}
                  onClick={() => {
                    setSelectedWorkMode(mode);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white text-[#5E4BE2] shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Record Count Badge */}
          <span className="hidden sm:inline-flex px-3 py-2 rounded-xl bg-indigo-50/70 text-[#5E4BE2] text-xs font-bold border border-indigo-100/60 shrink-0">
            {filteredLogs.length} {filteredLogs.length === 1 ? 'record' : 'records'}
          </span>
        </div>
      </div>

      {/* ===================== ROW 3: ATTENDANCE DATA TABLE ===================== */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-[#e5e7eb] text-xs font-bold text-slate-900 border-b border-slate-300">
              <tr>
                <th className="px-6 py-3.5">Employee</th>
                <th className="px-6 py-3.5">Department</th>
                <th className="px-6 py-3.5">Check-In</th>
                <th className="px-6 py-3.5">Check-Out</th>
                <th className="px-6 py-3.5">Work Mode</th>
                <th className="px-6 py-3.5">Duration</th>
                <th className="px-6 py-3.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/80">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-200" />
                        <div className="space-y-1.5">
                          <div className="w-28 h-3.5 bg-slate-200 rounded-sm" />
                          <div className="w-36 h-3 bg-slate-100 rounded-sm" />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4"><div className="w-24 h-3 bg-slate-200 rounded-sm" /></td>
                    <td className="px-6 py-4"><div className="w-16 h-3 bg-slate-200 rounded-sm" /></td>
                    <td className="px-6 py-4"><div className="w-16 h-3 bg-slate-200 rounded-sm" /></td>
                    <td className="px-6 py-4"><div className="w-14 h-4 bg-slate-200 rounded-full" /></td>
                    <td className="px-6 py-4"><div className="w-14 h-3 bg-slate-200 rounded-sm" /></td>
                    <td className="px-6 py-4 text-right"><div className="w-16 h-4 bg-slate-200 rounded-full ml-auto" /></td>
                  </tr>
                ))
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-14 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-[#5E4BE2] flex items-center justify-center mx-auto mb-3 shadow-2xs">
                      <IconClock className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-slate-800">No attendance records logged</p>
                    <p className="text-xs text-slate-400 mt-1">
                      No check-ins found for {date}. Try choosing another date or clearing filters.
                    </p>
                    {(search || selectedDept || selectedWorkMode !== 'ALL') && (
                      <button
                        onClick={() => {
                          setSearch('');
                          setSelectedDept('');
                          setSelectedWorkMode('ALL');
                        }}
                        className="mt-3 text-xs font-bold text-[#5E4BE2] hover:underline cursor-pointer"
                      >
                        Reset filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log) => {
                  const checkInDate = new Date(log.checkIn);
                  const checkOutDate = log.checkOut ? new Date(log.checkOut) : null;
                  const initials = `${log.user?.firstName?.[0] || ''}${log.user?.lastName?.[0] || ''}`.toUpperCase() || 'U';

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-indigo-50/20 transition-colors group"
                    >
                      {/* Employee Info */}
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#5E4BE2] to-indigo-500 text-white flex items-center justify-center font-bold text-xs shadow-2xs shrink-0 overflow-hidden relative border border-slate-100">
                            {log.user?.profilePhoto ? (
                              <img
                                src={log.user.profilePhoto}
                                alt={`${log.user.firstName} ${log.user.lastName}`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            ) : (
                              initials
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-xs text-slate-900 group-hover:text-[#5E4BE2] transition-colors leading-tight truncate">
                              {log.user?.firstName} {log.user?.lastName}
                            </div>
                            <div className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
                              {log.user?.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Department */}
                      <td className="px-6 py-3.5">
                        {log.user?.department?.name ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] bg-indigo-50/70 text-[#5E4BE2] font-semibold border border-indigo-100/50">
                            <IconBuilding className="w-3 h-3 text-[#5E4BE2]/80" />
                            {log.user.department.name}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs italic">Unassigned</span>
                        )}
                      </td>

                      {/* Check-In */}
                      <td className="px-6 py-3.5 font-mono text-xs font-semibold text-slate-800">
                        {checkInDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>

                      {/* Check-Out */}
                      <td className="px-6 py-3.5 font-mono text-xs font-semibold text-slate-800">
                        {checkOutDate ? (
                          checkOutDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200/70">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            In Progress
                          </span>
                        )}
                      </td>

                      {/* Work Mode */}
                      <td className="px-6 py-3.5">{getWorkModeBadge(log.workMode)}</td>

                      {/* Duration */}
                      <td className="px-6 py-3.5 font-black text-xs text-slate-900">
                        {log.durationHours !== null && log.durationHours !== undefined
                          ? `${Number(log.durationHours).toFixed(2)} hrs`
                          : '—'}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-3.5 text-right">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/70 shadow-2xs">
                          <IconCheck className="w-3 h-3" />
                          Present
                        </span>
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
          totalItems={filteredLogs.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[10, 25, 50, 100]}
          itemName="attendance logs"
        />
      </div>
    </div>
  );
};

export default CompanyAttendancePage;
