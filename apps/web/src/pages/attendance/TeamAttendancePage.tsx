import React, { useState, useEffect, useMemo, useRef } from 'react';
import api from '../../api/client';
import TablePagination from '../../components/common/TablePagination';
import {
  IconClock,
  IconDownload,
  IconCalendar,
  IconSearch,
  IconUsers,
  IconBuilding,
  IconHome,
  IconCheck,
  IconFileSpreadsheet,
  IconChevronDown,
  IconAlertCircle,
  IconSparkles,
} from '@tabler/icons-react';

interface TeamAttendanceLog {
  id: number;
  checkIn: string;
  checkOut?: string | null;
  workMode: string;
  durationHours?: number | string | null;
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

export const TeamAttendancePage: React.FC = () => {
  const [logs, setLogs] = useState<TeamAttendanceLog[]>([]);
  const [teamSize, setTeamSize] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [search, setSearch] = useState('');
  const [selectedWorkMode, setSelectedWorkMode] = useState<'ALL' | 'OFFICE' | 'WFH' | 'FIELD'>('ALL');
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

  const fetchTeamAttendance = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/attendance/team', { params: { date } });
      setLogs(res.data?.records || res.data?.items || []);
      if (res.data?.teamSize !== undefined) {
        setTeamSize(res.data.teamSize);
      }
    } catch (err) {
      console.error('Failed to load team attendance:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamAttendance();
  }, [date]);

  const handleExport = async (formatOverride?: 'xlsx' | 'csv') => {
    const fmt = formatOverride || exportFormat;
    setIsExporting(true);
    try {
      const res = await api.get('/attendance/team/export', {
        params: {
          format: fmt,
          from: exportFromDate,
          to: exportToDate,
        },
        responseType: 'blob',
      });
      const ext = fmt === 'csv' ? 'csv' : 'xlsx';
      const filename = `Team_Attendance_Report_${exportFromDate}_to_${exportToDate}.${ext}`;
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setIsExportDropdownOpen(false);
    } catch (err) {
      console.error('Failed to export team attendance:', err);
      alert(`Failed to export attendance ${fmt.toUpperCase()} file.`);
    } finally {
      setIsExporting(false);
    }
  };

  // KPI Metrics calculated live from team records
  const kpis = useMemo(() => {
    const presentCount = logs.length;
    const officeCount = logs.filter((l) => (l.workMode || '').toUpperCase() === 'OFFICE').length;
    const wfhCount = logs.filter((l) => (l.workMode || '').toUpperCase() === 'WFH').length;
    const fieldCount = logs.filter((l) => (l.workMode || '').toUpperCase() === 'FIELD').length;
    const totalCount = Math.max(teamSize, presentCount);
    const attendanceRate = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

    return {
      presentCount,
      officeCount,
      wfhCount,
      fieldCount,
      attendanceRate,
    };
  }, [logs, teamSize]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      const user = l.user || {};
      const fullName = `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase();
      const email = (user.email || '').toLowerCase();
      const jobTitle = (user.jobTitle || '').toLowerCase();
      const searchMatch = !search || fullName.includes(search.toLowerCase()) || email.includes(search.toLowerCase()) || jobTitle.includes(search.toLowerCase());

      const wmMatch =
        selectedWorkMode === 'ALL' ||
        (selectedWorkMode === 'OFFICE' && (l.workMode || '').toUpperCase() === 'OFFICE') ||
        (selectedWorkMode === 'WFH' && (l.workMode || '').toUpperCase() === 'WFH') ||
        (selectedWorkMode === 'FIELD' && (l.workMode || '').toUpperCase() === 'FIELD');

      return searchMatch && wmMatch;
    });
  }, [logs, search, selectedWorkMode]);

  // Paginated records
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, currentPage, pageSize]);

  return (
    <div className="space-y-6">
      {/* ===================== HEADER ===================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <IconClock className="w-5 h-5 text-indigo-600 shrink-0" />
            <span>Team Attendance</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Monitor live check-in timestamps, working hours, and work modes for your direct reporting team.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Date Picker Filter */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-xl shadow-2xs">
            <IconCalendar className="w-4 h-4 text-slate-400" />
            <input
              type="date"
              aria-label="Attendance Date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setCurrentPage(1);
              }}
              className="text-xs font-bold text-slate-700 bg-transparent focus:outline-hidden cursor-pointer"
            />
          </div>

          {/* Export Dropdown */}
          <div className="relative" ref={exportDropdownRef}>
            <button
              type="button"
              onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold text-slate-700 shadow-2xs transition-all cursor-pointer disabled:opacity-60"
            >
              <IconDownload className="w-3.5 h-3.5 text-indigo-600" />
              <span>{isExporting ? 'Exporting...' : 'Export'}</span>
              <IconChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {isExportDropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 z-50 animate-in fade-in zoom-in-95">
                <div className="space-y-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Export Team Attendance</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">Download logs for your team.</p>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">From Date</label>
                      <input
                        type="date"
                        value={exportFromDate}
                        onChange={(e) => setExportFromDate(e.target.value)}
                        className="w-full text-xs font-medium px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-[#5E4BE2]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">To Date</label>
                      <input
                        type="date"
                        value={exportToDate}
                        onChange={(e) => setExportToDate(e.target.value)}
                        className="w-full text-xs font-medium px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-[#5E4BE2]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleExport('xlsx')}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold transition-all cursor-pointer"
                    >
                      <IconFileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Excel (.xlsx)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExport('csv')}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl text-[#5E4BE2] text-xs font-bold transition-all cursor-pointer"
                    >
                      <IconDownload className="w-3.5 h-3.5 text-[#5E4BE2]" />
                      <span>CSV (.csv)</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===================== KPI METRIC CARDS ===================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Present Today */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500">Present Today</span>
            <div className="text-2xl font-black text-slate-900 mt-1 leading-none tracking-tight">
              {kpis.presentCount} <span className="text-xs font-medium text-slate-400">/ {teamSize || kpis.presentCount}</span>
            </div>
            <div className="text-[11px] font-bold text-emerald-600 mt-2">
              Team members checked in
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <IconUsers className="w-5 h-5" />
          </div>
        </div>

        {/* Office */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500">Office Work</span>
            <div className="text-2xl font-black text-slate-900 mt-1 leading-none tracking-tight">
              {kpis.officeCount}
            </div>
            <div className="text-[11px] font-bold text-indigo-600 mt-2">
              Working on-site
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5E4BE2]">
            <IconBuilding className="w-5 h-5" />
          </div>
        </div>

        {/* Remote / WFH */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500">Remote / WFH</span>
            <div className="text-2xl font-black text-slate-900 mt-1 leading-none tracking-tight">
              {kpis.wfhCount}
            </div>
            <div className="text-[11px] font-bold text-purple-600 mt-2">
              Working remotely
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
            <IconHome className="w-5 h-5" />
          </div>
        </div>

        {/* Attendance Rate */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500">Attendance Rate</span>
            <div className="text-2xl font-black text-slate-900 mt-1 leading-none tracking-tight">
              {kpis.attendanceRate}%
            </div>
            <div className="text-[11px] font-bold text-blue-600 mt-2">
              Presence ratio today
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <IconCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ===================== TABLE CONTAINER ===================== */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden space-y-4 p-5">
        {/* Filter Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative w-full max-w-xs">
            <IconSearch className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search team member..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-[#5E4BE2] text-slate-800 placeholder-slate-400"
            />
          </div>

          {/* Work Mode Toggle Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 p-1 rounded-xl">
            {(['ALL', 'OFFICE', 'WFH', 'FIELD'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  setSelectedWorkMode(mode);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  selectedWorkMode === mode
                    ? 'bg-white text-indigo-600 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {mode === 'ALL' ? 'All' : mode === 'WFH' ? 'Remote' : mode === 'OFFICE' ? 'Office' : 'Field'}
              </button>
            ))}
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-slate-500">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-[#5E4BE2] border-t-transparent mb-2" />
              <p className="text-xs font-medium">Loading team attendance logs...</p>
            </div>
          ) : paginatedLogs.length === 0 ? (
            <div className="py-16 text-center text-slate-500">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-[#5E4BE2] flex items-center justify-center mx-auto mb-3">
                <IconClock className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-slate-700">No Attendance Records Found</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {search ? 'No team members match your search.' : 'No direct reports have punched in on this date.'}
              </p>
            </div>
          ) : (
            <table className="w-full min-w-[700px] text-left text-xs">
              <thead className="bg-[#e5e7eb] text-xs font-bold text-slate-900 border-b border-slate-300">
                <tr>
                  <th className="px-5 py-3.5 whitespace-nowrap">Team Member</th>
                  <th className="px-5 py-3.5 whitespace-nowrap">Check In</th>
                  <th className="px-5 py-3.5 whitespace-nowrap">Check Out</th>
                  <th className="px-5 py-3.5 whitespace-nowrap">Work Mode</th>
                  <th className="px-5 py-3.5 whitespace-nowrap">Duration</th>
                  <th className="px-5 py-3.5 text-right whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedLogs.map((log) => {
                  const checkInTime = new Date(log.checkIn).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  const checkOutTime = log.checkOut
                    ? new Date(log.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : null;
                  const isOffice = (log.workMode || '').toUpperCase() === 'OFFICE';
                  const isWfh = (log.workMode || '').toUpperCase() === 'WFH';

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Team Member */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 text-[#5E4BE2] font-bold text-xs flex items-center justify-center shrink-0">
                            {log.user?.profilePhoto ? (
                              <img
                                src={log.user.profilePhoto}
                                alt={log.user?.firstName || 'User'}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              `${log.user?.firstName?.[0] || 'U'}${log.user?.lastName?.[0] || ''}`
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">
                              {log.user?.firstName} {log.user?.lastName}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {log.user?.jobTitle || 'Team Member'} {log.user?.department?.name ? `• ${log.user.department.name}` : ''}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Check In */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                          <span className="font-bold text-slate-900">{checkInTime}</span>
                        </div>
                      </td>

                      {/* Check Out */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {checkOutTime ? (
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
                            <span className="font-bold text-slate-700">{checkOutTime}</span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                            Active / Logged In
                          </span>
                        )}
                      </td>

                      {/* Work Mode */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            isOffice
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : isWfh
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {log.workMode || 'Office'}
                        </span>
                      </td>

                      {/* Duration */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className="font-semibold text-slate-800">
                          {log.durationHours !== null && log.durationHours !== undefined && !isNaN(Number(log.durationHours))
                            ? `${Number(log.durationHours).toFixed(1)} hrs`
                            : checkOutTime
                            ? '—'
                            : 'In Progress'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <IconCheck className="w-3.5 h-3.5" /> Present
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {filteredLogs.length > 0 && (
          <TablePagination
            currentPage={currentPage}
            pageSize={pageSize}
            totalItems={filteredLogs.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
            itemName="team attendance records"
          />
        )}
      </div>
    </div>
  );
};

export default TeamAttendancePage;

