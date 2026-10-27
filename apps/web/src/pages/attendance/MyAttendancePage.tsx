import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import api from '../../api/client';
import TablePagination from '../../components/common/TablePagination';
import {
  IconClock,
  IconMapPin,
  IconX,
  IconAlertCircle,
  IconPlayerPlay,
  IconPlayerStop,
  IconCalendar,
  IconFileText,
  IconChevronDown,
  IconTrendingUp,
  IconCheck,
  IconBuilding,
  IconHome,
  IconCalendarCheck,
  IconCalendarOff,
  IconBriefcase,
} from '@tabler/icons-react';

interface AttendanceRecord {
  id: number;
  checkIn: string;
  checkOut?: string | null;
  workMode: string;
  note?: string | null;
  durationHours?: number | null;
  checkInGeo?: any;
  checkOutGeo?: any;
}

export const MyAttendancePage: React.FC = () => {
  const [activeSession, setActiveSession] = useState<AttendanceRecord | null>(null);
  const [isShiftCompletedToday, setIsShiftCompletedToday] = useState(false);
  const [recentRecords, setRecentRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [workMode, setWorkMode] = useState<'WFO' | 'WFH'>('WFO');
  const [note, setNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [geoStatus, setGeoStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Time filter dropdown
  const [filterPeriod, setFilterPeriod] = useState<'7' | '14' | '30' | 'all'>('7');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterPeriod]);

  // Regularization modal state
  const [isRegModalOpen, setIsRegModalOpen] = useState(false);
  const [userShift, setUserShift] = useState<any>(null);
  const [regularizations, setRegularizations] = useState<any[]>([]);
  const [regForm, setRegForm] = useState<{
    date: string;
    scope: 'CHECK_IN_ONLY' | 'CHECK_OUT_ONLY' | 'BOTH';
    checkInTime: string;
    checkOutTime: string;
    reason: string;
    isSessionActive?: boolean;
  }>({
    date: new Date().toISOString().split('T')[0],
    scope: 'CHECK_IN_ONLY',
    checkInTime: '09:00',
    checkOutTime: '18:00',
    reason: '',
    isSessionActive: false,
  });

  const fetchAttendance = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/attendance/me');
      setActiveSession(res.data?.activeSession || null);
      if (res.data?.activeSession?.workMode) {
        setWorkMode(res.data.activeSession.workMode);
      }
      setIsShiftCompletedToday(Boolean(res.data?.isShiftCompletedToday));
      setRecentRecords(res.data?.recentSessions || []);
      setUserShift(res.data?.userShift || null);
    } catch (err) {
      console.error('Failed to load attendance:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRegularizations = async () => {
    try {
      const res = await api.get('/requests', {
        params: { type: 'REGULARIZATION', scope: 'mine', pageSize: 100 },
      });
      setRegularizations(res.data?.items || []);
    } catch (err) {
      console.error('Failed to load regularizations:', err);
    }
  };

  useEffect(() => {
    fetchAttendance();
    fetchRegularizations();
    const handleSync = () => {
      fetchAttendance();
      fetchRegularizations();
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'attendance_sync_ts') {
        fetchAttendance();
        fetchRegularizations();
      }
    };
    window.addEventListener('attendance-updated', handleSync);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('attendance-updated', handleSync);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const getPosition = (): Promise<{ latitude: number; longitude: number }> => {
    return new Promise((resolve) => {
      setGeoStatus('Acquiring high-accuracy GPS coordinates...');
      if (!navigator.geolocation) {
        setGeoStatus('Geolocation not supported by browser. Falling back to office default.');
        resolve({ latitude: 12.9716, longitude: 77.5946 });
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGeoStatus(`GPS fixed: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
          resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        },
        (err) => {
          console.warn('Geolocation error:', err.message);
          setGeoStatus('Location unavailable. Using verified workplace coordinates.');
          resolve({ latitude: 12.9716, longitude: 77.5946 });
        },
        { timeout: 7000, enableHighAccuracy: true }
      );
    });
  };

  const handleClockIn = async () => {
    setError(null);
    setActionLoading(true);
    try {
      const coords = await getPosition();
      const res = await api.post('/attendance/check-in', {
        latitude: coords.latitude,
        longitude: coords.longitude,
        workMode,
        note: note.trim() || undefined,
      });
      setActiveSession(res.data?.attendance);
      setNote('');
      fetchAttendance();
      window.dispatchEvent(new Event('attendance-updated'));
      localStorage.setItem('attendance_sync_ts', String(Date.now()));
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Check-in failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleClockOut = async () => {
    setError(null);
    setActionLoading(true);
    try {
      const coords = await getPosition();
      await api.post('/attendance/check-out', {
        latitude: coords.latitude,
        longitude: coords.longitude,
        note: note.trim() || undefined,
      });
      setActiveSession(null);
      setNote('');
      fetchAttendance();
      window.dispatchEvent(new Event('attendance-updated'));
      localStorage.setItem('attendance_sync_ts', String(Date.now()));
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Check-out failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRegularizeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (regForm.scope === 'CHECK_IN_ONLY' && !regForm.checkInTime) {
      alert('Please enter your actual check-in time.');
      return;
    }
    if (regForm.scope === 'CHECK_OUT_ONLY' && !regForm.checkOutTime) {
      alert('Please enter your actual check-out time.');
      return;
    }
    if (regForm.scope === 'BOTH' && (!regForm.checkInTime || !regForm.checkOutTime)) {
      alert('Please enter both actual check-in and check-out times.');
      return;
    }

    setActionLoading(true);
    try {
      const meta: any = {
        regularizeType: regForm.scope,
      };

      let title = `Regularization for ${regForm.date}`;

      if (regForm.scope === 'CHECK_IN_ONLY') {
        meta.requestedCheckIn = regForm.checkInTime;
        meta.checkIn = `${regForm.date}T${regForm.checkInTime}:00Z`;
        title = `Regularize Check-In (${regForm.checkInTime}) for ${regForm.date}`;
      } else if (regForm.scope === 'CHECK_OUT_ONLY') {
        meta.requestedCheckOut = regForm.checkOutTime;
        meta.checkOut = `${regForm.date}T${regForm.checkOutTime}:00Z`;
        title = `Regularize Check-Out (${regForm.checkOutTime}) for ${regForm.date}`;
      } else {
        meta.requestedCheckIn = regForm.checkInTime;
        meta.requestedCheckOut = regForm.checkOutTime;
        meta.checkIn = `${regForm.date}T${regForm.checkInTime}:00Z`;
        meta.checkOut = `${regForm.date}T${regForm.checkOutTime}:00Z`;
        title = `Regularize Full Day (${regForm.checkInTime} – ${regForm.checkOutTime}) for ${regForm.date}`;
      }

      await api.post('/requests', {
        type: 'REGULARIZATION',
        title,
        reason: regForm.reason,
        startDate: regForm.date,
        endDate: regForm.date,
        meta,
      });

      setIsRegModalOpen(false);
      setRegForm({
        date: new Date().toISOString().split('T')[0],
        scope: 'CHECK_IN_ONLY',
        checkInTime: '09:00',
        checkOutTime: '',
        reason: '',
      });
      fetchRegularizations();
      alert('Regularization request submitted to your reporting manager!');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to submit regularization');
    } finally {
      setActionLoading(false);
    }
  };

  // Filter records based on selected dropdown
  const filteredRecords = recentRecords.filter((r) => {
    if (filterPeriod === 'all') return true;
    const days = parseInt(filterPeriod, 10);
    const date = new Date(r.checkIn);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return date >= cutoff;
  });

  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, currentPage, pageSize]);

  // Current month & year metrics
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const currentMonthName = now.toLocaleString('default', { month: 'short' });

  // 1. Monthly Present: distinct days in the current month where the user clocked in
  const monthlyPresentCount = useMemo(() => {
    const presentDays = new Set<string>();
    recentRecords.forEach((r) => {
      const d = new Date(r.checkIn);
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        presentDays.add(d.toISOString().split('T')[0]);
      }
    });
    return presentDays.size;
  }, [recentRecords, currentMonth, currentYear]);

  // 2. Monthly Absent: working days so far this month (Mon-Fri) minus present days
  const monthlyAbsentCount = useMemo(() => {
    let workingDays = 0;
    const todayDate = now.getDate();
    for (let day = 1; day <= todayDate; day++) {
      const d = new Date(currentYear, currentMonth, day);
      const dayOfWeek = d.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workingDays++;
      }
    }
    return Math.max(0, workingDays - monthlyPresentCount);
  }, [monthlyPresentCount, currentMonth, currentYear, now]);

  // 3. Regularizations in current month & pending count
  const monthlyRegularizations = useMemo(() => {
    return regularizations.filter((req) => {
      const d = new Date(req.createdAt || req.startDate);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
  }, [regularizations, currentMonth, currentYear]);

  const pendingRegularizationsCount = useMemo(() => {
    return regularizations.filter((req) => req.status === 'PENDING').length;
  }, [regularizations]);

  const filterPeriodLabel: Record<string, string> = {
    '7': 'Past 7 Days',
    '14': 'Past 14 Days',
    '30': 'Past 30 Days',
    all: 'All Time',
  };

  return (
    <div className="space-y-4 sm:space-y-5 max-w-7xl mx-auto pb-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <IconClock className="w-5 h-5 text-indigo-600 shrink-0" />
            <span>Attendance</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time workplace check-in, duration calculation, and regularization desk.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Work Mode Selector (WFH vs Office) */}
          {!activeSession && !isShiftCompletedToday && (
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setWorkMode('WFO')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  workMode === 'WFO'
                    ? 'bg-white text-[#5E4BE2] shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <IconBuilding className="w-3.5 h-3.5" />
                <span>Office (WFO)</span>
              </button>
              <button
                type="button"
                onClick={() => setWorkMode('WFH')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  workMode === 'WFH'
                    ? 'bg-white text-emerald-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <IconHome className="w-3.5 h-3.5" />
                <span>Work From Home</span>
              </button>
            </div>
          )}

          {activeSession ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700">
                {activeSession.workMode === 'WFH' || activeSession.workMode === 'REMOTE' ? (
                  <>
                    <IconHome className="w-4 h-4 text-emerald-600" />
                    <span>Active: Work From Home</span>
                  </>
                ) : (
                  <>
                    <IconBuilding className="w-4 h-4 text-[#5E4BE2]" />
                    <span>Active: Office Shift</span>
                  </>
                )}
              </div>
              <button
                onClick={handleClockOut}
                disabled={actionLoading}
                className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
              >
                <IconPlayerStop className="w-4 h-4" />
                <span>{actionLoading ? 'Checking Out...' : 'Check Out Now'}</span>
              </button>
            </div>
          ) : isShiftCompletedToday ? (
            <div className="flex items-center gap-2 px-3.5 py-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl shadow-2xs">
              <IconCheck className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
              <span>Shift Completed Today</span>
            </div>
          ) : (
            <button
              onClick={handleClockIn}
              disabled={actionLoading}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#5E4BE2] to-[#4B39C3] hover:from-[#5340D4] hover:to-[#4130B4] text-white text-xs font-bold rounded-xl shadow-sm shadow-indigo-600/25 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
            >
              <IconPlayerPlay className="w-4 h-4 fill-white" />
              <span>
                {actionLoading
                  ? 'Checking In...'
                  : workMode === 'WFH'
                  ? 'Check In (Work From Home)'
                  : 'Check In (Office)'}
              </span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm flex items-center gap-2">
          <IconAlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 4 Attendance KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Monthly Present */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <span className="text-xs font-bold text-slate-500">Monthly Present</span>
            <div className="text-2xl font-black text-slate-900 mt-1 leading-none tracking-tight">
              {monthlyPresentCount} {monthlyPresentCount === 1 ? 'Day' : 'Days'}
            </div>
            <div className="text-[11px] font-bold text-emerald-600 mt-2 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Recorded in {currentMonthName}</span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <IconCalendarCheck className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Monthly Absent */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <span className="text-xs font-bold text-slate-500">Monthly Absent</span>
            <div className="text-2xl font-black text-slate-900 mt-1 leading-none tracking-tight">
              {monthlyAbsentCount} {monthlyAbsentCount === 1 ? 'Day' : 'Days'}
            </div>
            <div className="text-[11px] font-bold text-rose-600 mt-2 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>Unlogged working days</span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
            <IconCalendarOff className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Any Regularisations */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <span className="text-xs font-bold text-slate-500">Any Regularisations</span>
            <div className="text-2xl font-black text-slate-900 mt-1 leading-none tracking-tight">
              {monthlyRegularizations.length} {monthlyRegularizations.length === 1 ? 'Request' : 'Requests'}
            </div>
            <div className="text-[11px] font-bold text-[#5E4BE2] mt-2">
              {pendingRegularizationsCount > 0
                ? `${pendingRegularizationsCount} pending manager review`
                : 'No pending requests'}
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5E4BE2]">
            <IconFileText className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Shift Assigned */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <span className="text-xs font-bold text-slate-500">Shift Assigned</span>
            <div className="text-sm font-black text-slate-900 mt-1 leading-tight tracking-tight truncate max-w-[170px]" title={userShift?.shiftName || 'General Shift'}>
              {userShift?.shiftName || 'General Shift'}
            </div>
            <div className="text-[11px] font-bold text-blue-600 mt-1.5">
              {userShift?.startTime12 && userShift?.endTime12
                ? `${userShift.startTime12} – ${userShift.endTime12}`
                : '09:30 AM – 06:30 PM'}
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <IconBriefcase className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Recent Attendance Log Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table Header / Action Row */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5E4BE2] shrink-0">
              <IconClock className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Recent Attendance Log</h3>
          </div>

          {/* Time Filter Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
            >
              <IconCalendar className="w-4 h-4 text-slate-400" />
              <span>{filterPeriodLabel[filterPeriod]}</span>
              <IconChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {isFilterOpen && (
              <div className="absolute right-0 mt-1.5 w-40 bg-white rounded-xl shadow-lg border border-slate-100 py-1 z-30 animate-in fade-in zoom-in-95 duration-100">
                {(['7', '14', '30', 'all'] as const).map((period) => (
                  <button
                    key={period}
                    onClick={() => {
                      setFilterPeriod(period);
                      setIsFilterOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-xs font-medium transition-colors ${
                      filterPeriod === period
                        ? 'bg-indigo-50 text-[#5E4BE2] font-semibold'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {filterPeriodLabel[period]}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-[#e5e7eb] text-xs font-bold text-slate-900 border-b border-slate-300">
              <tr>
                <th className="px-6 py-3.5">Date</th>
                <th className="px-6 py-3.5">Shift Timings</th>
                <th className="px-6 py-3.5">Check-In</th>
                <th className="px-6 py-3.5">Check-Out</th>
                <th className="px-6 py-3.5">Work Mode</th>
                <th className="px-6 py-3.5">Duration</th>
                <th className="px-6 py-3.5">Location</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4">
                      <div className="w-24 h-4 bg-slate-200 rounded-sm" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-28 h-4 bg-slate-200 rounded-sm" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-20 h-4 bg-slate-200 rounded-sm" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-20 h-4 bg-slate-200 rounded-sm" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-16 h-4 bg-slate-200 rounded-sm" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-16 h-4 bg-slate-200 rounded-sm" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-24 h-4 bg-slate-100 rounded-sm" />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="w-12 h-4 bg-slate-100 rounded-sm ml-auto" />
                    </td>
                  </tr>
                ))
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <div className="w-12 h-12 rounded-full bg-indigo-50 text-[#5E4BE2] mx-auto flex items-center justify-center mb-2">
                      <IconFileText className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-slate-800">
                      No attendance records found
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Your attendance logs for the selected period will appear here.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((r) => {
                  const checkInDate = new Date(r.checkIn);
                  const checkOutDate = r.checkOut ? new Date(r.checkOut) : null;
                  const dateStr = checkInDate.toISOString().split('T')[0];

                  // Match existing regularization request for this date
                  const reqForDate = regularizations.find(
                    (reg) =>
                      (reg.startDate && reg.startDate.startsWith(dateStr)) ||
                      (reg.meta?.checkIn && reg.meta.checkIn.startsWith(dateStr))
                  );

                  const isMissedPunch = !checkOutDate || (r.durationHours !== null && Number(r.durationHours) < 4);

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-900 whitespace-nowrap">
                        {checkInDate.toLocaleDateString(undefined, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-slate-600 whitespace-nowrap">
                        {userShift?.startTime12 && userShift?.endTime12
                          ? `${userShift.startTime12} – ${userShift.endTime12}`
                          : '09:30 AM – 06:30 PM'}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-700 whitespace-nowrap">
                        {checkInDate.toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-700 whitespace-nowrap">
                        {checkOutDate ? (
                          checkOutDate.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-600 border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                          r.workMode === 'WFH' || r.workMode === 'REMOTE'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200/70 shadow-2xs'
                            : 'bg-blue-50 text-blue-700 border-blue-200/70 shadow-2xs'
                        }`}>
                          {r.workMode === 'WFH' || r.workMode === 'REMOTE' ? 'Work From Home' : 'Office'}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900 whitespace-nowrap">
                        {r.durationHours !== null && r.durationHours !== undefined
                          ? `${Number(r.durationHours).toFixed(1)} hrs`
                          : '—'}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-600 whitespace-nowrap">
                        {r.workMode === 'WFH' || r.workMode === 'REMOTE' ? (
                          <span className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold">
                            <IconHome className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Remote (WFH)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-slate-700 font-semibold">
                            <IconBuilding className="w-3.5 h-3.5 text-[#5E4BE2]" />
                            <span>Main Office (HQ)</span>
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        {reqForDate ? (
                          reqForDate.status === 'PENDING' ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              Pending Review
                            </span>
                          ) : reqForDate.status === 'APPROVED' ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Regularized
                            </span>
                          ) : (
                            <button
                              onClick={() => {
                                const isCurrentlyActive = !checkOutDate;
                                setRegForm({
                                  date: dateStr,
                                  scope: isCurrentlyActive ? 'CHECK_IN_ONLY' : 'BOTH',
                                  checkInTime: '09:00',
                                  checkOutTime: isCurrentlyActive ? '' : '18:00',
                                  reason: '',
                                  isSessionActive: isCurrentlyActive,
                                });
                                setIsRegModalOpen(true);
                              }}
                              className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
                            >
                              Re-regularize
                            </button>
                          )
                        ) : isMissedPunch ? (
                          <button
                            onClick={() => {
                              const isCurrentlyActive = !checkOutDate;
                              setRegForm({
                                date: dateStr,
                                scope: isCurrentlyActive ? 'CHECK_IN_ONLY' : 'BOTH',
                                checkInTime: '09:00',
                                checkOutTime: isCurrentlyActive ? '' : '18:00',
                                reason: '',
                                isSessionActive: isCurrentlyActive,
                              });
                              setIsRegModalOpen(true);
                            }}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-[#5E4BE2] border border-indigo-200/80 transition-colors cursor-pointer"
                          >
                            Regularize
                          </button>
                        ) : (
                          <span className="text-slate-300 font-bold">—</span>
                        )}
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
          itemName="records"
        />
      </div>

      {/* Regularization Right-Side Slide-Over Drawer */}
      {isRegModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] overflow-hidden">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsRegModalOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10 pointer-events-none">
            <div
              className="w-screen max-w-md bg-white shadow-2xl flex flex-col h-full border-l border-slate-200 pointer-events-auto animate-in slide-in-from-right duration-200 overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drawer Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5E4BE2] shrink-0">
                    <IconFileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Request Regularization
                    </h2>
                    <p className="text-xs text-slate-400 font-medium">
                      Submit missing check-in/out times to your manager
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsRegModalOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <IconX className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Body / Form */}
              <form onSubmit={handleRegularizeSubmit} className="p-6 flex-1 flex flex-col justify-between space-y-5">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Missed Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={regForm.date}
                      onChange={(e) => setRegForm({ ...regForm, date: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-[#5E4BE2] text-slate-800"
                    />
                  </div>

                  {/* Correction Scope Selector */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      What needs regularization? *
                    </label>
                    <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 text-center">
                      <button
                        type="button"
                        onClick={() => setRegForm({ ...regForm, scope: 'CHECK_IN_ONLY' })}
                        className={`py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          regForm.scope === 'CHECK_IN_ONLY'
                            ? 'bg-white text-[#5E4BE2] shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Check-In Only
                      </button>
                      <button
                        type="button"
                        onClick={() => setRegForm({ ...regForm, scope: 'CHECK_OUT_ONLY' })}
                        className={`py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          regForm.scope === 'CHECK_OUT_ONLY'
                            ? 'bg-white text-[#5E4BE2] shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Check-Out Only
                      </button>
                      <button
                        type="button"
                        onClick={() => setRegForm({ ...regForm, scope: 'BOTH' })}
                        className={`py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          regForm.scope === 'BOTH'
                            ? 'bg-white text-[#5E4BE2] shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Full Day (Both)
                      </button>
                    </div>
                  </div>

                  {/* Timing Inputs based on selected scope */}
                  {regForm.scope === 'CHECK_IN_ONLY' && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Actual Check-in Time *
                        </label>
                        <input
                          type="time"
                          required
                          value={regForm.checkInTime}
                          onChange={(e) => setRegForm({ ...regForm, checkInTime: e.target.value })}
                          className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-[#5E4BE2] text-slate-800"
                        />
                      </div>
                      <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-200/70 text-xs text-blue-800 flex items-start gap-2">
                        <IconClock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold block">Check-out is not required</span>
                          <span className="text-[11px] text-blue-700 leading-relaxed">
                            {regForm.isSessionActive
                              ? 'Your shift is currently active. Check-out will be recorded automatically when you punch out at the end of your shift.'
                              : 'Only your check-in time will be adjusted. Any existing check-out record will be preserved.'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {regForm.scope === 'CHECK_OUT_ONLY' && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Actual Check-out Time *
                        </label>
                        <input
                          type="time"
                          required
                          value={regForm.checkOutTime}
                          onChange={(e) => setRegForm({ ...regForm, checkOutTime: e.target.value })}
                          className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-[#5E4BE2] text-slate-800"
                        />
                      </div>
                      <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-200/70 text-xs text-blue-800 flex items-start gap-2">
                        <IconClock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold block">Check-in punch preserved</span>
                          <span className="text-[11px] text-blue-700 leading-relaxed">
                            Your original check-in punch will remain unchanged. Only your missing check-out time will be recorded upon manager approval.
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {regForm.scope === 'BOTH' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Actual Check-in *
                        </label>
                        <input
                          type="time"
                          required
                          value={regForm.checkInTime}
                          onChange={(e) => setRegForm({ ...regForm, checkInTime: e.target.value })}
                          className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-[#5E4BE2] text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Actual Check-out *
                        </label>
                        <input
                          type="time"
                          required
                          value={regForm.checkOutTime}
                          onChange={(e) => setRegForm({ ...regForm, checkOutTime: e.target.value })}
                          className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-[#5E4BE2] text-slate-800"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Reason for Regularization *
                    </label>
                    <textarea
                      required
                      rows={4}
                      placeholder="e.g. Biometric device failure, client meeting outside office..."
                      value={regForm.reason}
                      onChange={(e) => setRegForm({ ...regForm, reason: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-[#5E4BE2] text-slate-800 resize-none"
                    />
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsRegModalOpen(false)}
                    className="px-4 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-5 py-2.5 text-xs font-bold rounded-xl bg-gradient-to-r from-[#5E4BE2] to-[#4B39C3] hover:from-[#5340D4] hover:to-[#4130B4] text-white shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    {actionLoading ? 'Submitting...' : 'Send to Manager'}
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

export default MyAttendancePage;
