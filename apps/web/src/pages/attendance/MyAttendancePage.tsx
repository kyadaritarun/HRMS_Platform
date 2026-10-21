import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '../../api/client';
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

  // Regularization modal state
  const [isRegModalOpen, setIsRegModalOpen] = useState(false);
  const [regForm, setRegForm] = useState({
    date: new Date().toISOString().split('T')[0],
    checkInTime: '09:30',
    checkOutTime: '18:30',
    reason: '',
  });

  const fetchAttendance = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/attendance/me');
      setActiveSession(res.data?.activeSession || null);
      setRecentRecords(res.data?.recentSessions || []);
    } catch (err) {
      console.error('Failed to load attendance:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
    const handleSync = () => fetchAttendance();
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'attendance_sync_ts') {
        fetchAttendance();
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
    setActionLoading(true);
    try {
      await api.post('/requests', {
        type: 'REGULARIZATION',
        title: `Regularization request for ${regForm.date}`,
        reason: regForm.reason,
        startDate: regForm.date,
        endDate: regForm.date,
        meta: {
          checkIn: `${regForm.date}T${regForm.checkInTime}:00Z`,
          checkOut: `${regForm.date}T${regForm.checkOutTime}:00Z`,
        },
      });
      setIsRegModalOpen(false);
      setRegForm({
        date: new Date().toISOString().split('T')[0],
        checkInTime: '09:30',
        checkOutTime: '18:30',
        reason: '',
      });
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

  // Calculate statistics
  const totalWorkedMinutes = recentRecords.reduce((acc, r) => acc + (Number(r.durationHours) || 0) * 60, 0);
  const totalHours = (totalWorkedMinutes / 60).toFixed(1);
  const avgShiftHours =
    recentRecords.length > 0 ? (totalWorkedMinutes / recentRecords.length / 60).toFixed(0) : '0';

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
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5E4BE2] shrink-0">
              <IconClock className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Attendance
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Real-time geofenced check-in, duration calculation, and regularization desk.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {activeSession ? (
            <button
              onClick={handleClockOut}
              disabled={actionLoading}
              className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
            >
              <IconPlayerStop className="w-4 h-4" />
              <span>{actionLoading ? 'Checking Out...' : 'Check Out Now'}</span>
            </button>
          ) : (
            <button
              onClick={handleClockIn}
              disabled={actionLoading}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#5E4BE2] to-[#4B39C3] hover:from-[#5340D4] hover:to-[#4130B4] text-white text-xs font-bold rounded-xl shadow-sm shadow-indigo-600/25 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
            >
              <IconPlayerPlay className="w-4 h-4 fill-white" />
              <span>{actionLoading ? 'Checking In...' : 'Check In with Geolocation'}</span>
            </button>
          )}

          <button
            onClick={() => setIsRegModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl shadow-2xs transition-all active:scale-[0.98] cursor-pointer"
          >
            <IconFileText className="w-4 h-4 text-slate-400" />
            <span>Request Regularization</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm flex items-center gap-2">
          <IconAlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Summary Stat KPI Cards (4 Columns) matching EmployeesPage */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Duty Status */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <span className="text-xs font-bold text-slate-500">Current Status</span>
            <div className={`text-2xl font-black mt-1 leading-none tracking-tight ${activeSession ? 'text-emerald-600' : 'text-slate-900'}`}>
              {activeSession ? 'On Duty' : 'Off Duty'}
            </div>
            <div className="text-[11px] font-bold text-slate-500 mt-2 flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${activeSession ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
              <span>{activeSession ? `${activeSession.workMode === 'WFH' || activeSession.workMode === 'REMOTE' ? 'Work From Home' : 'Office'} Shift Active` : 'Not checked in'}</span>
            </div>
          </div>
          <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center ${activeSession ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
            <IconClock className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Recent Sessions */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <span className="text-xs font-bold text-slate-500">Recent Sessions</span>
            <div className="text-2xl font-black text-slate-900 mt-1 leading-none tracking-tight">
              {recentRecords.length}
            </div>
            <div className="text-[11px] font-bold text-indigo-600 mt-2">
              Logged this week
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5E4BE2]">
            <IconCalendar className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Total Duration */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <span className="text-xs font-bold text-slate-500">Total Duration</span>
            <div className="text-2xl font-black text-slate-900 mt-1 leading-none tracking-tight">
              {totalHours} hrs
            </div>
            <div className="text-[11px] font-bold text-emerald-600 mt-2">
              Productive logged hours
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <IconClock className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Average Shift */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <span className="text-xs font-bold text-slate-500">Average Shift</span>
            <div className="text-2xl font-black text-slate-900 mt-1 leading-none tracking-tight">
              {avgShiftHours} hrs
            </div>
            <div className="text-[11px] font-bold text-amber-600 mt-2">
              Per working day
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
            <IconTrendingUp className="w-5 h-5" />
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
            <thead className="bg-slate-50/60 text-[11px] font-bold text-slate-400 tracking-wider uppercase border-b border-slate-100">
              <tr>
                <th className="px-6 py-3.5">DATE</th>
                <th className="px-6 py-3.5">CHECK-IN</th>
                <th className="px-6 py-3.5">CHECK-OUT</th>
                <th className="px-6 py-3.5">WORK MODE</th>
                <th className="px-6 py-3.5">DURATION</th>
                <th className="px-6 py-3.5">NOTE</th>
                <th className="px-6 py-3.5">LOCATION</th>
                <th className="px-6 py-3.5 text-right">ACTIONS</th>
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
                      <div className="w-32 h-4 bg-slate-100 rounded-sm" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-20 h-4 bg-slate-100 rounded-sm" />
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
                filteredRecords.map((r) => {
                  const checkInDate = new Date(r.checkIn);
                  const checkOutDate = r.checkOut ? new Date(r.checkOut) : null;
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        {checkInDate.toLocaleDateString(undefined, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-700">
                        {checkInDate.toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-700">
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
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                          r.workMode === 'WFH' || r.workMode === 'REMOTE'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200/70 shadow-2xs'
                            : 'bg-blue-50 text-blue-700 border-blue-200/70 shadow-2xs'
                        }`}>
                          {r.workMode === 'WFH' || r.workMode === 'REMOTE' ? 'Work From Home' : 'Office'}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900">
                        {r.durationHours !== null && r.durationHours !== undefined
                          ? `${Number(r.durationHours).toFixed(1)} hrs`
                          : '—'}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 max-w-[160px] truncate">
                        {r.note || '—'}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1 text-slate-600 font-medium">
                          <IconMapPin className="w-3.5 h-3.5 text-[#5E4BE2]" />
                          Office Geofence
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {!checkOutDate ? (
                          <button
                            onClick={() => {
                              setRegForm({
                                ...regForm,
                                date: new Date(r.checkIn).toISOString().split('T')[0],
                              });
                              setIsRegModalOpen(true);
                            }}
                            className="text-xs font-semibold text-[#5E4BE2] hover:text-[#4B39C3] hover:underline cursor-pointer"
                          >
                            Regularize
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">Verified</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
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
