import React, { useState, useEffect, useMemo } from 'react';
import api from '../../api/client';
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
  const [selectedWorkMode, setSelectedWorkMode] = useState<string>('ALL');
  const [isExporting, setIsExporting] = useState(false);

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

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const year = new Date(date).getFullYear();
      const month = new Date(date).getMonth() + 1;
      const res = await api.get('/company/attendance/export', {
        params: { month, year },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Attendance_Report_${month}_${year}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Failed to export excel:', err);
      alert('Failed to export attendance Excel spreadsheet.');
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
    const remoteCount = logs.filter((l) => l.workMode === 'WFH').length;
    const onSiteCount = logs.filter((l) => l.workMode === 'WFO' || l.workMode === 'ON_SITE' || !l.workMode).length;
    const hybridCount = logs.filter((l) => l.workMode === 'HYBRID').length;
    const attendanceRate = totalWorkforce > 0 ? Math.round((presentCount / totalWorkforce) * 100) : null;

    return {
      presentCount,
      activeNow,
      completedCount: completedShifts.length,
      avgHours,
      remoteCount,
      onSiteCount,
      hybridCount,
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
        if (selectedWorkMode === 'WFH' && log.workMode !== 'WFH') return false;
        if (selectedWorkMode === 'HYBRID' && log.workMode !== 'HYBRID') return false;
        if (selectedWorkMode === 'ON_SITE') {
          if (log.workMode !== 'WFO' && log.workMode !== 'ON_SITE' && log.workMode) return false;
        }
      }

      return true;
    });
  }, [logs, search, selectedDept, selectedWorkMode]);

  const getWorkModeBadge = (mode: string) => {
    switch (mode) {
      case 'WFH':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/70 shadow-2xs">
            Remote
          </span>
        );
      case 'HYBRID':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200/70 shadow-2xs">
            Hybrid
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/70 shadow-2xs">
            On-site
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* ===================== TOP HEADER BAR ===================== */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5E4BE2] shrink-0">
              <IconClock className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Employee Attendance
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Real-time biometric & GPS tracking records across all company departments.
          </p>
        </div>

        {/* Right CTA Button */}
        <button
          onClick={handleExportExcel}
          disabled={isExporting}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#5E4BE2] to-[#4B39C3] hover:from-[#5340D4] hover:to-[#4130B4] text-white text-xs font-bold rounded-xl shadow-sm shadow-indigo-600/25 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer self-stretch sm:self-auto justify-center"
        >
          <IconFileSpreadsheet className="w-4 h-4" />
          <span>{isExporting ? 'Generating Report...' : 'Export to Excel (.xlsx)'}</span>
        </button>
      </div>

      {/* ===================== ROW 1: 4 KPI STAT CARDS ===================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Attendance Rate & Present Count */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <span className="text-xs font-bold text-slate-500">Attendance Rate</span>
            <div className="text-2xl font-black text-slate-900 mt-1 leading-none tracking-tight">
              {kpiStats.attendanceRate !== null ? `${kpiStats.attendanceRate}%` : `${kpiStats.presentCount}`}
            </div>
            <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 mt-2">
              <span>●</span>
              <span>
                {totalWorkforce > 0
                  ? `${kpiStats.presentCount} of ${totalWorkforce} employees present`
                  : `${kpiStats.presentCount} present on selected date`}
              </span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5E4BE2]">
            <IconUserCheck className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Active Shifts Now */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <span className="text-xs font-bold text-slate-500">Currently On Duty</span>
            <div className="text-2xl font-black text-slate-900 mt-1 leading-none tracking-tight">
              {kpiStats.activeNow.toLocaleString()}
            </div>
            <div className="text-[11px] font-bold text-amber-600 mt-2 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span>Shift currently in progress</span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
            <IconClock className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Avg Duration */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <span className="text-xs font-bold text-slate-500">Avg Shift Duration</span>
            <div className="text-2xl font-black text-slate-900 mt-1 leading-none tracking-tight">
              {kpiStats.avgHours !== '—' ? `${kpiStats.avgHours} hrs` : '—'}
            </div>
            <div className="text-[11px] font-bold text-purple-600 mt-2">
              Completed daily shifts
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
            <IconCalendar className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Location Mix */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <span className="text-xs font-bold text-slate-500">Work Location</span>
            <div className="text-2xl font-black text-slate-900 mt-1 leading-none tracking-tight">
              {kpiStats.onSiteCount} / {kpiStats.remoteCount + kpiStats.hybridCount}
            </div>
            <div className="text-[11px] font-bold text-blue-600 mt-2">
              {kpiStats.onSiteCount} On-site · {kpiStats.remoteCount} Remote
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <IconBuilding className="w-5 h-5" />
          </div>
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
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 text-xs font-medium bg-slate-50/70 border border-slate-200/80 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#5E4BE2]/20 focus:border-[#5E4BE2] transition-all placeholder:text-slate-400 text-slate-800"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
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
              onChange={(e) => setDate(e.target.value)}
              className="text-xs font-bold text-slate-800 bg-transparent focus:outline-hidden cursor-pointer"
            />
          </div>

          {/* Department Filter */}
          <div className="min-w-[170px]">
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
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
            {(['ALL', 'ON_SITE', 'HYBRID', 'WFH'] as const).map((mode) => {
              const label =
                mode === 'ALL'
                  ? 'All'
                  : mode === 'ON_SITE'
                  ? 'On-site'
                  : mode === 'HYBRID'
                  ? 'Hybrid'
                  : 'Remote';
              const isActive = selectedWorkMode === mode;
              return (
                <button
                  key={mode}
                  onClick={() => setSelectedWorkMode(mode)}
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
            <thead className="bg-slate-50/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
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
                filteredLogs.map((log) => {
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
      </div>
    </div>
  );
};

export default CompanyAttendancePage;
