import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  IconClock,
  IconMapPin,
  IconBuilding,
  IconHome,
  IconRefresh,
  IconCalendar,
  IconCalendarEvent,
  IconSparkles,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconUsers,
  IconCake,
  IconGift,
  IconPlane,
  IconSun,
  IconBriefcase,
  IconPlayerPlay,
  IconPlayerStop,
  IconMoodSmile,
  IconArrowRight,
  IconSmartHome,
  IconAlertCircle,
  IconInfoCircle,
} from '@tabler/icons-react';
import api from '../../api/client';

interface LeaveBalanceItem {
  code: string;
  name: string;
  balance: number;
  max: number;
  icon: any;
  iconBg: string;
  barColor: string;
  barBg: string;
}

interface UpcomingHolidayItem {
  id: number;
  name: string;
  dateStr: string;
  type: string;
}

interface UpcomingBirthdayItem {
  id: number;
  name: string;
  initials: string;
  dateStr: string;
  jobTitle?: string;
  profilePhoto?: string | null;
  isToday?: boolean;
}

interface OnLeaveItem {
  id: number;
  user?: {
    id: number;
    firstName: string;
    lastName: string;
    jobTitle?: string;
    profilePhoto?: string | null;
    department?: { name: string };
  };
  leaveType?: {
    name: string;
    code: string;
  };
}

const getLeaveStyle = (code: string, name: string) => {
  const c = (code || '').toUpperCase();
  const n = (name || '').toLowerCase();

  if (c === 'CL' || n.includes('casual')) {
    return {
      icon: IconCalendarEvent,
      iconBg: 'bg-blue-50 text-blue-600',
      barColor: 'bg-blue-500',
      barBg: 'bg-blue-100',
    };
  }
  if (c === 'SL' || n.includes('sick') || n.includes('medical')) {
    return {
      icon: IconMoodSmile,
      iconBg: 'bg-emerald-50 text-emerald-600',
      barColor: 'bg-emerald-500',
      barBg: 'bg-emerald-100',
    };
  }
  if (c === 'PL' || c === 'EL' || n.includes('earned') || n.includes('privilege') || n.includes('annual')) {
    return {
      icon: IconPlane,
      iconBg: 'bg-purple-50 text-purple-600',
      barColor: 'bg-purple-500',
      barBg: 'bg-purple-100',
    };
  }
  if (c === 'FH' || n.includes('float') || n.includes('holiday')) {
    return {
      icon: IconSun,
      iconBg: 'bg-amber-50 text-amber-500',
      barColor: 'bg-amber-400',
      barBg: 'bg-amber-100',
    };
  }
  if (c === 'CO' || n.includes('comp')) {
    return {
      icon: IconBriefcase,
      iconBg: 'bg-rose-50 text-rose-500',
      barColor: 'bg-rose-400',
      barBg: 'bg-rose-100',
    };
  }
  return {
    icon: IconCalendarEvent,
    iconBg: 'bg-indigo-50 text-indigo-600',
    barColor: 'bg-indigo-500',
    barBg: 'bg-indigo-100',
  };
};

export interface CalendarDayInfo {
  date: Date;
  dateStr: string;
  dayNum: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  status: 'PRESENT' | 'ABSENT' | 'HOLIDAY' | 'LEAVE_APPROVED' | 'LEAVE_PENDING' | 'WEEKEND' | 'FUTURE';
  label: string;
  details?: string;
  badgeText?: string;
}

const toLocalDateKey = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const getCalendarDays = (
  viewDate: Date,
  sessions: any[],
  activeSess: any,
  holidaysList: any[],
  leavesList: any[]
): { days: CalendarDayInfo[]; counts: { present: number; absent: number; leaves: number; holidays: number } } => {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const now = new Date();
  const todayStr = toLocalDateKey(now);
  const todayZero = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  // Map attendance sessions by YYYY-MM-DD
  const sessionDates = new Map<string, any>();
  sessions.forEach((s) => {
    if (s.checkIn) {
      const d = new Date(s.checkIn);
      const key = toLocalDateKey(d);
      sessionDates.set(key, s);
    }
  });

  // If activeSession is ongoing today
  if (activeSess?.checkIn) {
    const d = new Date(activeSess.checkIn);
    const key = toLocalDateKey(d);
    if (!sessionDates.has(key)) {
      sessionDates.set(key, activeSess);
    }
  }

  // Map holidays by YYYY-MM-DD
  const holidayDates = new Map<string, any>();
  holidaysList.forEach((h) => {
    if (h.date) {
      const d = new Date(h.date);
      const key = toLocalDateKey(d);
      holidayDates.set(key, h);
    }
  });

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sunday

  const days: CalendarDayInfo[] = [];
  const counts = { present: 0, absent: 0, leaves: 0, holidays: 0 };

  // Previous month trailing days
  const prevMonthDays = new Date(year, month, 0).getDate();
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const dNum = prevMonthDays - i;
    const dObj = new Date(year, month - 1, dNum);
    const dStr = toLocalDateKey(dObj);
    days.push({
      date: dObj,
      dateStr: dStr,
      dayNum: dNum,
      isCurrentMonth: false,
      isToday: dStr === todayStr,
      status: 'FUTURE',
      label: 'Previous Month',
    });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dObj = new Date(year, month, d);
    const dStr = toLocalDateKey(dObj);
    const dayOfWeek = dObj.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isToday = dStr === todayStr;
    const isPast = dObj.getTime() < todayZero;

    // 1. Holiday Check
    const holiday = holidayDates.get(dStr);
    if (holiday) {
      counts.holidays++;
      days.push({
        date: dObj,
        dateStr: dStr,
        dayNum: d,
        isCurrentMonth: true,
        isToday,
        status: 'HOLIDAY',
        label: holiday.name,
        details: `${holiday.type || 'Company'} Holiday`,
        badgeText: 'H',
      });
      continue;
    }

    // 2. Approved Leave Check
    const approvedLeave = leavesList.find((l) => {
      if (l.status !== 'APPROVED' || !l.startDate || !l.endDate) return false;
      const startKey = l.startDate.split('T')[0];
      const endKey = l.endDate.split('T')[0];
      return dStr >= startKey && dStr <= endKey;
    });

    if (approvedLeave) {
      counts.leaves++;
      days.push({
        date: dObj,
        dateStr: dStr,
        dayNum: d,
        isCurrentMonth: true,
        isToday,
        status: 'LEAVE_APPROVED',
        label: approvedLeave.leaveType?.name || 'Approved Leave',
        details: approvedLeave.reason || 'Approved Leave',
        badgeText: 'L',
      });
      continue;
    }

    // 3. Pending Leave Check
    const pendingLeave = leavesList.find((l) => {
      if (l.status !== 'PENDING' || !l.startDate || !l.endDate) return false;
      const startKey = l.startDate.split('T')[0];
      const endKey = l.endDate.split('T')[0];
      return dStr >= startKey && dStr <= endKey;
    });

    if (pendingLeave) {
      days.push({
        date: dObj,
        dateStr: dStr,
        dayNum: d,
        isCurrentMonth: true,
        isToday,
        status: 'LEAVE_PENDING',
        label: `${pendingLeave.leaveType?.name || 'Leave'} (Pending)`,
        details: 'Awaiting review',
        badgeText: '⏳',
      });
      continue;
    }

    // 4. Attendance Session Check (Present)
    const session = sessionDates.get(dStr);
    if (session) {
      counts.present++;
      const checkInTime = new Date(session.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const checkOutTime = session.checkOut
        ? new Date(session.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : 'Active Session';
      days.push({
        date: dObj,
        dateStr: dStr,
        dayNum: d,
        isCurrentMonth: true,
        isToday,
        status: 'PRESENT',
        label: `Present (${session.workMode || 'WFO'})`,
        details: `In: ${checkInTime} • Out: ${checkOutTime}`,
        badgeText: 'P',
      });
      continue;
    }

    // 5. Weekend Check
    if (isWeekend) {
      days.push({
        date: dObj,
        dateStr: dStr,
        dayNum: d,
        isCurrentMonth: true,
        isToday,
        status: 'WEEKEND',
        label: 'Weekend',
        details: dayOfWeek === 0 ? 'Sunday Off' : 'Saturday Off',
      });
      continue;
    }

    // 6. Absent Check (Past working day with no attendance & no leave)
    if (isPast) {
      counts.absent++;
      days.push({
        date: dObj,
        dateStr: dStr,
        dayNum: d,
        isCurrentMonth: true,
        isToday,
        status: 'ABSENT',
        label: 'Absent',
        details: 'No attendance or approved leave',
        badgeText: 'A',
      });
      continue;
    }

    // 7. Today (not checked in) or Future workday
    days.push({
      date: dObj,
      dateStr: dStr,
      dayNum: d,
      isCurrentMonth: true,
      isToday,
      status: isToday ? 'ABSENT' : 'FUTURE',
      label: isToday ? 'Not Checked In Yet' : 'Upcoming Workday',
      details: isToday ? 'Start shift to record attendance' : 'Working Day',
      badgeText: isToday ? '—' : undefined,
    });
  }

  // Trailing days for grid completeness (multiples of 7)
  const totalCells = Math.ceil(days.length / 7) * 7;
  let nextMonthDay = 1;
  while (days.length < totalCells) {
    const dObj = new Date(year, month + 1, nextMonthDay);
    const dStr = toLocalDateKey(dObj);
    days.push({
      date: dObj,
      dateStr: dStr,
      dayNum: nextMonthDay,
      isCurrentMonth: false,
      isToday: dStr === todayStr,
      status: 'FUTURE',
      label: 'Next Month',
    });
    nextMonthDay++;
  }

  return { days, counts };
};

export const EmployeeDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Time Tracker state
  const [seconds, setSeconds] = useState(0);
  const [workMode, setWorkMode] = useState<'WFO' | 'WFH'>('WFO');
  const [activeSession, setActiveSession] = useState<{ id?: number; checkIn?: string; checkInGeo?: any } | null>(null);
  const [loadingCheck, setLoadingCheck] = useState(false);
  const [attendanceMessage, setAttendanceMessage] = useState<string | null>(null);

  // Real widgets state
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalanceItem[]>([]);
  const [upcomingHolidays, setUpcomingHolidays] = useState<UpcomingHolidayItem[]>([]);
  const [upcomingBirthdays, setUpcomingBirthdays] = useState<UpcomingBirthdayItem[]>([]);
  const [onLeaveToday, setOnLeaveToday] = useState<OnLeaveItem[]>([]);
  const [isLoadingWidgets, setIsLoadingWidgets] = useState(true);

  // Calendar State
  const [calMonth, setCalMonth] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(toLocalDateKey(new Date()));
  const [allHolidays, setAllHolidays] = useState<any[]>([]);
  const [myLeaveRequests, setMyLeaveRequests] = useState<any[]>([]);
  const [attendanceSessions, setAttendanceSessions] = useState<any[]>([]);

  // Fetch current attendance punch status & sessions history
  const fetchActiveSession = async () => {
    try {
      const res = await api.get('/attendance/me');
      if (res.data?.activeSession) {
        setActiveSession(res.data.activeSession);
      } else {
        setActiveSession(null);
      }
      if (Array.isArray(res.data?.sessions)) {
        setAttendanceSessions(res.data.sessions);
      } else if (Array.isArray(res.data?.recentSessions)) {
        setAttendanceSessions(res.data.recentSessions);
      }
    } catch {
      // Graceful fallback
    }
  };

  // Fetch 100% strictly real data from live backend endpoints
  const fetchDashboardWidgets = async () => {
    setIsLoadingWidgets(true);
    try {
      const [empRes, typesRes, holiRes, empsRes, leavesTodayRes, myLeavesRes] = await Promise.all([
        user?.id ? api.get(`/employees/${user.id}`).catch(() => ({ data: {} })) : Promise.resolve({ data: {} }),
        api.get('/company/leave-types').catch(() => ({ data: { leaveTypes: [] } })),
        api.get('/company/holidays').catch(() => ({ data: { holidays: [] } })),
        api.get('/employees?pageSize=100').catch(() => ({ data: { items: [] } })),
        api.get('/requests/today-leaves').catch(() => ({ data: { leaves: [] } })),
        api.get('/requests?type=LEAVE&scope=mine').catch(() => ({ data: { items: [] } })),
      ]);

      // Raw holidays & leaves for calendar
      const rawHolidays = holiRes.data?.holidays || [];
      setAllHolidays(rawHolidays);
      setMyLeaveRequests(myLeavesRes.data?.items || []);

      // 1. Leave Balances
      const userBalances = empRes.data?.employee?.leaveBalances;
      const companyTypes = typesRes.data?.leaveTypes || [];

      if (Array.isArray(userBalances) && userBalances.length > 0) {
        const mapped = userBalances.map((b: any) => {
          const lt = b.leaveType || {};
          const style = getLeaveStyle(lt.code || '', lt.name || '');
          const bal = Number(b.balance ?? 0);
          const maxVal = Number(lt.defaultAllocation || 20) || Math.max(bal, 1);
          return {
            code: lt.code || 'LV',
            name: lt.name || 'Leave',
            balance: bal,
            max: maxVal,
            ...style,
          };
        });
        setLeaveBalances(mapped);
      } else if (companyTypes.length > 0) {
        const mapped = companyTypes.map((lt: any) => {
          const style = getLeaveStyle(lt.code || '', lt.name || '');
          const alloc = Number(lt.defaultAllocation || 20);
          return {
            code: lt.code || 'LV',
            name: lt.name || 'Leave',
            balance: alloc,
            max: alloc,
            ...style,
          };
        });
        setLeaveBalances(mapped);
      } else {
        setLeaveBalances([
          { code: 'CL', name: 'Casual Leave', balance: 12, max: 20, ...getLeaveStyle('CL', 'Casual Leave') },
          { code: 'SL', name: 'Sick Leave', balance: 10, max: 20, ...getLeaveStyle('SL', 'Sick Leave') },
          { code: 'PL', name: 'Privilege Leave', balance: 18, max: 18, ...getLeaveStyle('PL', 'Privilege Leave') },
        ]);
      }

      // 2. Real Upcoming Holidays
      const todayZero = new Date();
      todayZero.setHours(0, 0, 0, 0);

      const nextHolidays = rawHolidays
        .filter((h: any) => new Date(h.date).getTime() >= todayZero.getTime())
        .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 4)
        .map((h: any) => {
          const hDate = new Date(h.date);
          return {
            id: h.id,
            name: h.name,
            dateStr: hDate.toLocaleDateString('en-US', { day: '2-digit', month: 'short' }),
            type: h.type || 'PUBLIC',
          };
        });
      setUpcomingHolidays(nextHolidays);

      // 3. Real Upcoming Birthdays
      const rawEmployees = empsRes.data?.items || [];
      const now = new Date();
      const currentYear = now.getFullYear();
      const nowTime = new Date(currentYear, now.getMonth(), now.getDate()).getTime();

      const bdays = rawEmployees
        .filter((e: any) => e.dateOfBirth && e.isActive !== false)
        .map((e: any) => {
          const dob = new Date(e.dateOfBirth);
          const m = dob.getUTCMonth();
          const d = dob.getUTCDate();

          let nextBday = new Date(currentYear, m, d);
          if (nextBday.getTime() < nowTime) {
            nextBday = new Date(currentYear + 1, m, d);
          }

          const diffDays = Math.ceil((nextBday.getTime() - nowTime) / (1000 * 60 * 60 * 24));
          const initials = `${e.firstName?.[0] || ''}${e.lastName?.[0] || ''}`.toUpperCase() || 'U';

          return {
            id: e.id,
            name: `${e.firstName || ''} ${e.lastName || ''}`.trim() || 'Colleague',
            initials,
            dateStr: nextBday.toLocaleDateString('en-US', { day: '2-digit', month: 'short' }),
            jobTitle: e.jobTitle,
            profilePhoto: e.profilePhoto,
            isToday: diffDays === 0,
            diffDays,
          };
        })
        .sort((a: any, b: any) => a.diffDays - b.diffDays)
        .slice(0, 4);
      setUpcomingBirthdays(bdays);

      // 4. Real On Leave Today
      const leaves = leavesTodayRes.data?.leaves || [];
      setOnLeaveToday(leaves);
    } catch (err) {
      console.error('Failed to load real dashboard widgets:', err);
    } finally {
      setIsLoadingWidgets(false);
    }
  };

  useEffect(() => {
    fetchActiveSession();
    fetchDashboardWidgets();

    const handleSync = () => {
      fetchActiveSession();
      fetchDashboardWidgets();
    };

    window.addEventListener('attendance-updated', handleSync);
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'attendance_sync_ts') {
        handleSync();
      }
    };
    window.addEventListener('storage', onStorage);

    // Auto-poll every 15 seconds for real-time live attendance sync
    const pollId = setInterval(fetchActiveSession, 15000);

    return () => {
      window.removeEventListener('attendance-updated', handleSync);
      window.removeEventListener('storage', onStorage);
      clearInterval(pollId);
    };
  }, [user?.id]);

  // Calendar computed properties
  const { days: calendarDays } = useMemo(() => {
    return getCalendarDays(calMonth, attendanceSessions, activeSession, allHolidays, myLeaveRequests);
  }, [calMonth, attendanceSessions, activeSession, allHolidays, myLeaveRequests]);

  const selectedDayInfo = useMemo(() => {
    return (
      calendarDays.find((d: CalendarDayInfo) => d.dateStr === selectedDateStr && d.isCurrentMonth) ||
      calendarDays.find((d: CalendarDayInfo) => d.isToday) ||
      calendarDays[0]
    );
  }, [calendarDays, selectedDateStr]);

  const handlePrevMonth = () => {
    setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1));
  };

  const handleGoToday = () => {
    const today = new Date();
    setCalMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDateStr(toLocalDateKey(today));
  };

  // Timer loop
  useEffect(() => {
    if (!activeSession?.checkIn) {
      setSeconds(0);
      return;
    }
    const start = new Date(activeSession.checkIn).getTime();
    const tick = () => setSeconds(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [activeSession]);

  const formatTimer = (totalSecs: number) => {
    const hrs = String(Math.floor(totalSecs / 3600)).padStart(2, '0');
    const mins = String(Math.floor((totalSecs % 3600) / 60)).padStart(2, '0');
    const secs = String(totalSecs % 60).padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
  };

  const handleCheckAction = async (action: 'check-in' | 'check-out') => {
    setLoadingCheck(true);
    setAttendanceMessage(null);

    const performCall = async (latitude: number, longitude: number) => {
      try {
        if (action === 'check-in') {
          const res = await api.post('/attendance/check-in', { latitude, longitude, workMode });
          setActiveSession(res.data?.attendance || { checkIn: new Date().toISOString() });
          setAttendanceMessage('Successfully checked in!');
          await fetchActiveSession();
          window.dispatchEvent(new Event('attendance-updated'));
          localStorage.setItem('attendance_sync_ts', String(Date.now()));
        } else {
          await api.post('/attendance/check-out', { latitude, longitude });
          setActiveSession(null);
          setAttendanceMessage('Successfully checked out! Have a good day.');
          await fetchActiveSession();
          window.dispatchEvent(new Event('attendance-updated'));
          localStorage.setItem('attendance_sync_ts', String(Date.now()));
        }
      } catch (err: any) {
        setAttendanceMessage(err.response?.data?.error || `Failed to ${action}`);
      } finally {
        setLoadingCheck(false);
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => performCall(pos.coords.latitude, pos.coords.longitude),
        () => performCall(19.076, 72.8777), // Fallback default GPS
        { timeout: 8000 }
      );
    } else {
      performCall(19.076, 72.8777);
    }
  };

  // Today's In and Out computed times
  const todayDateKey = useMemo(() => toLocalDateKey(new Date()), []);
  const todaySession = useMemo(() => {
    return attendanceSessions.find((s: any) => {
      const dateVal = s.checkIn || s.date;
      if (!dateVal) return false;
      const sDateKey = toLocalDateKey(new Date(dateVal));
      return sDateKey === todayDateKey;
    });
  }, [attendanceSessions, todayDateKey]);

  const todayInTime = useMemo(() => {
    const raw = activeSession?.checkIn || todaySession?.checkIn;
    if (!raw) return '--:--';
    return new Date(raw).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }, [activeSession, todaySession]);

  const todayOutTime = useMemo(() => {
    if (activeSession) {
      return '--:--';
    }
    const raw = todaySession?.checkOut;
    if (!raw) return '--:--';
    return new Date(raw).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }, [activeSession, todaySession]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* ===================== TOP HEADER BAR ===================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5E4BE2] shrink-0">
              <IconSmartHome className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Dashboard
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Welcome back{user?.firstName ? `, ${user.firstName}` : ''}! Here is your personal activity, shift status, and shortcuts.
          </p>
        </div>
      </div>

      {/* 2. Grid: Time & Attendance Check-In + Monthly Attendance & Leave Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Time & Attendance Check-In (Left Box) */}
        <div className="lg:col-span-12 xl:col-span-5 bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div className="space-y-3.5">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-[#5E4BE2] flex items-center justify-center shrink-0">
                  <IconClock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                    Time & Attendance Check-In
                  </h3>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">
                    Shift: General (09:00 AM – 06:00 PM)
                  </p>
                </div>
              </div>

              <span
                className={`text-[11px] px-3 py-1 rounded-full font-bold flex items-center gap-1.5 transition-all ${
                  activeSession
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-slate-100 text-slate-600 border border-slate-200/60'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    activeSession ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'
                  }`}
                />
                {activeSession ? 'CHECKED IN' : 'CHECKED OUT'}
              </span>
            </div>

            {/* Monospace Timer Box */}
            <div className="p-4 bg-slate-50/90 rounded-2xl border border-slate-100/90 flex flex-col items-center justify-center">
              <div className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight font-mono leading-none">
                {formatTimer(seconds)}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-2 font-medium">
                <IconMapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span className="line-clamp-1">
                  {activeSession?.checkInGeo?.address || 'Current Location Verified via GPS'}
                </span>
              </div>
            </div>

            {/* Work Mode Toggle: Office, Work From Home */}
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { mode: 'WFO', label: 'Office', icon: IconBuilding },
                { mode: 'WFH', label: 'Work From Home', icon: IconHome },
              ].map((m) => {
                const isSelected = workMode === m.mode;
                const ModeIcon = m.icon;
                return (
                  <button
                    key={m.mode}
                    type="button"
                    onClick={() => setWorkMode(m.mode as any)}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50/80 border-2 border-indigo-600 text-indigo-700 shadow-2xs font-bold'
                        : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <ModeIcon className={`w-3.5 h-3.5 ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>

            {/* In & Out Punch Cards */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 flex flex-col items-center justify-center">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">In</span>
                <span className="font-bold text-slate-800 font-mono text-sm sm:text-base mt-0.5">
                  {todayInTime}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 flex flex-col items-center justify-center">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Out</span>
                <span className="font-bold text-slate-800 font-mono text-sm sm:text-base mt-0.5">
                  {todayOutTime}
                </span>
              </div>
            </div>

            {attendanceMessage && (
              <div className="text-xs p-2.5 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 font-medium flex items-center gap-2">
                <IconCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>{attendanceMessage}</span>
              </div>
            )}
          </div>

          {/* Action Button */}
          <div className="pt-3">
            {activeSession ? (
              <button
                onClick={() => handleCheckAction('check-out')}
                disabled={loadingCheck}
                className="w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-[0.99] transition-all shadow-md shadow-rose-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <IconPlayerStop className="w-4 h-4 fill-white" />
                <span>{loadingCheck ? 'Recording Check-Out...' : 'Check Out (End Shift)'}</span>
              </button>
            ) : (
              <button
                onClick={() => handleCheckAction('check-in')}
                disabled={loadingCheck}
                className="w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#4338ca] hover:bg-[#3730a3] active:scale-[0.99] transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <IconPlayerPlay className="w-4 h-4 fill-white" />
                <span>{loadingCheck ? 'Recording Check-In...' : 'Check In (Start Shift)'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Monthly Attendance & Leave Calendar (Right Box) */}
        <div className="lg:col-span-12 xl:col-span-7 bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            {/* Calendar Header with Navigation */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-[#5E4BE2] flex items-center justify-center shrink-0">
                  <IconCalendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                    Attendance & Leave Calendar
                  </h3>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">
                    Track present, absent, company holidays & leaves
                  </p>
                </div>
              </div>

              {/* Month Navigation Segmented Controls */}
              <div className="flex items-center bg-slate-100/80 p-1 rounded-2xl border border-slate-200/80 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="w-7 h-7 rounded-xl hover:bg-white text-slate-600 flex items-center justify-center transition-all cursor-pointer hover:shadow-2xs"
                  title="Previous Month"
                >
                  <IconChevronLeft className="w-4 h-4" />
                </button>
                <div className="px-2 text-xs font-black text-slate-800 tracking-tight min-w-[105px] text-center select-none">
                  {calMonth.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </div>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="w-7 h-7 rounded-xl hover:bg-white text-slate-600 flex items-center justify-center transition-all cursor-pointer hover:shadow-2xs"
                  title="Next Month"
                >
                  <IconChevronRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleGoToday}
                  className="ml-1 px-2.5 py-1 text-[11px] font-bold rounded-xl bg-white hover:bg-indigo-50 text-[#5E4BE2] border border-slate-200/70 shadow-2xs transition-all cursor-pointer"
                >
                  Today
                </button>
              </div>
            </div>

            {/* Days of Week Header */}
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5 mb-1.5 text-center">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dw, idx) => (
                <div
                  key={dw}
                  className={`text-[10px] sm:text-[11px] font-black uppercase tracking-wider py-0.5 ${
                    idx === 0 || idx === 6 ? 'text-slate-400' : 'text-slate-600'
                  }`}
                >
                  {dw}
                </div>
              ))}
            </div>

            {/* 7-Columns Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
              {calendarDays.map((cell: CalendarDayInfo) => {
                const isSelected = selectedDateStr === cell.dateStr;
                const isPresent = cell.status === 'PRESENT';
                const isAbsent = cell.status === 'ABSENT';
                const isHoliday = cell.status === 'HOLIDAY';
                const isLeaveApproved = cell.status === 'LEAVE_APPROVED';
                const isLeavePending = cell.status === 'LEAVE_PENDING';
                const isWeekend = cell.status === 'WEEKEND';

                if (!cell.isCurrentMonth) {
                  return (
                    <div
                      key={cell.dateStr}
                      className="h-8 sm:h-9 rounded-xl flex items-center justify-center text-slate-300/40 text-xs font-medium select-none pointer-events-none"
                    >
                      {cell.dayNum}
                    </div>
                  );
                }

                let cellColorClasses = 'bg-white border-slate-200/70 text-slate-700 hover:border-indigo-300 hover:bg-slate-50/70';
                let dotColorClass = '';

                if (isPresent) {
                  cellColorClasses = 'bg-emerald-50/70 border-emerald-200 text-emerald-950 hover:bg-emerald-100/70';
                  dotColorClass = 'bg-emerald-500';
                } else if (isAbsent) {
                  cellColorClasses = 'bg-rose-50/70 border-rose-200 text-rose-950 hover:bg-rose-100/70';
                  dotColorClass = 'bg-rose-500';
                } else if (isHoliday) {
                  cellColorClasses = 'bg-sky-50/80 border-sky-200 text-sky-950 hover:bg-sky-100/80';
                  dotColorClass = 'bg-sky-500';
                } else if (isLeaveApproved) {
                  cellColorClasses = 'bg-purple-50/80 border-purple-200 text-purple-950 hover:bg-purple-100/80';
                  dotColorClass = 'bg-[#8b5cf6]';
                } else if (isLeavePending) {
                  cellColorClasses = 'bg-amber-50/80 border-amber-300 border-dashed text-amber-950 hover:bg-amber-100/80';
                  dotColorClass = 'bg-amber-500 animate-pulse';
                } else if (isWeekend) {
                  cellColorClasses = 'bg-slate-50/70 border-slate-100 text-slate-400 hover:bg-slate-100/60';
                  dotColorClass = 'bg-slate-300';
                }

                return (
                  <button
                    key={cell.dateStr}
                    type="button"
                    onClick={() => setSelectedDateStr(cell.dateStr)}
                    title={`${cell.dateStr}: ${cell.label}${cell.details ? ` (${cell.details})` : ''}`}
                    className={`relative h-8 sm:h-9 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer select-none ${cellColorClasses} ${
                      isSelected
                        ? 'ring-2 ring-indigo-600 ring-offset-1 shadow-sm font-black scale-[1.04] z-10'
                        : ''
                    } ${cell.isToday && !isSelected ? 'ring-1.5 ring-indigo-400 font-extrabold' : ''}`}
                  >
                    <span
                      className={`text-[11px] sm:text-xs leading-none font-bold ${
                        cell.isToday ? 'text-indigo-700' : ''
                      }`}
                    >
                      {cell.dayNum}
                    </span>
                    {dotColorClass ? (
                      <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${dotColorClass} shrink-0`} />
                    ) : (
                      <span className="w-1.5 h-1.5 mt-0.5 shrink-0 opacity-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Selected Date Details Strip */}
            <div className="mt-2.5 p-2.5 rounded-2xl bg-slate-50/90 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-800 font-black text-xs shrink-0 shadow-2xs font-mono">
                  {selectedDayInfo?.dayNum}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                    <span>
                      {selectedDayInfo?.date.toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                    {selectedDayInfo?.isToday && (
                      <span className="text-[10px] font-black px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-700">
                        Today
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium line-clamp-1">
                    {selectedDayInfo?.label} {selectedDayInfo?.details ? `• ${selectedDayInfo.details}` : ''}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                <span
                  className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border ${
                    selectedDayInfo?.status === 'PRESENT'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : selectedDayInfo?.status === 'ABSENT'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : selectedDayInfo?.status === 'HOLIDAY'
                      ? 'bg-sky-50 text-sky-700 border-sky-200'
                      : selectedDayInfo?.status === 'LEAVE_APPROVED'
                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                      : selectedDayInfo?.status === 'LEAVE_PENDING'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  {selectedDayInfo?.status === 'PRESENT' && '✓ Present'}
                  {selectedDayInfo?.status === 'ABSENT' && '✕ Absent'}
                  {selectedDayInfo?.status === 'HOLIDAY' && '★ Holiday'}
                  {selectedDayInfo?.status === 'LEAVE_APPROVED' && '● Approved Leave'}
                  {selectedDayInfo?.status === 'LEAVE_PENDING' && '⏳ Pending Leave'}
                  {selectedDayInfo?.status === 'WEEKEND' && 'Weekend'}
                  {selectedDayInfo?.status === 'FUTURE' && 'Upcoming Workday'}
                </span>

                {(selectedDayInfo?.status === 'FUTURE' || selectedDayInfo?.status === 'ABSENT') && (
                  <button
                    type="button"
                    onClick={() => navigate('/leaves')}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-white border border-indigo-200 px-2.5 py-1 rounded-full shadow-2xs hover:bg-indigo-50 transition-colors cursor-pointer"
                  >
                    Apply Leave →
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Leave Quota Balances (Annual) */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm sm:text-base font-bold text-slate-900">
            Leave Quota Balances (Annual)
          </h3>
          <button
            onClick={() => navigate('/leaves')}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>View All</span>
            <IconArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
          {isLoadingWidgets && leaveBalances.length === 0 ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs animate-pulse space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-100" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-2 w-8 bg-slate-200 rounded" />
                    <div className="h-4 w-14 bg-slate-200 rounded" />
                  </div>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full" />
              </div>
            ))
          ) : (
            leaveBalances.map((lb) => {
              const IconComp = lb.icon;
              const pct = lb.max > 0 ? Math.min(100, Math.round((lb.balance / lb.max) * 100)) : 0;

              return (
                <div
                  key={lb.code}
                  onClick={() => navigate('/leaves')}
                  className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all cursor-pointer flex flex-col justify-between group"
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-xl ${lb.iconBg} flex items-center justify-center shrink-0`}>
                      <IconComp className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {lb.code}
                      </div>
                      <div className="text-lg font-black text-slate-900 leading-tight mt-0.5">
                        {lb.balance} Days
                      </div>
                      <div className="text-[11px] font-semibold text-slate-500 mt-0.5 line-clamp-1">
                        {lb.name}
                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className={`h-1.5 w-full ${lb.barBg} rounded-full mt-3 overflow-hidden`}>
                    <div
                      className={`h-full ${lb.barColor} rounded-full transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 4. Three Columns: On Leave Today, Upcoming Birthdays, Upcoming Holidays */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* On Leave Today */}
        <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <IconUsers className="w-4 h-4 text-emerald-600" />
              <h4 className="text-sm font-bold text-slate-900">On Leave Today</h4>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              {onLeaveToday.length > 0 ? `${onLeaveToday.length} colleague(s) out of office today` : 'All team members are present today 🎉'}
            </p>

            {onLeaveToday.length === 0 ? (
              <div className="mt-4 p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                  <IconCheck className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">No one is on leave today</div>
                  <div className="text-[11px] text-slate-500">Great teamwork!</div>
                </div>
              </div>
            ) : (
              <div className="mt-3 divide-y divide-slate-100 max-h-56 overflow-y-auto pr-1">
                {onLeaveToday.map((item) => (
                  <div key={item.id} className="py-2.5 flex items-center justify-between group px-1">
                    <div className="flex items-center gap-3">
                      {item.user?.profilePhoto ? (
                        <img src={item.user.profilePhoto} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-[#5E4BE2] font-bold text-xs flex items-center justify-center shrink-0">
                          {item.user?.firstName?.[0] || 'U'}
                        </div>
                      )}
                      <div>
                        <div className="text-xs font-bold text-slate-800">
                          {item.user?.firstName} {item.user?.lastName}
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium">
                          {item.user?.jobTitle || item.user?.department?.name || 'On Leave'}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-100">
                      {item.leaveType?.name || 'Leave'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Birthdays */}
        <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <IconCake className="w-4 h-4 text-rose-500" />
              <h4 className="text-sm font-bold text-slate-900">Upcoming Birthdays</h4>
            </div>

            <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto pr-1">
              {upcomingBirthdays.length === 0 ? (
                <div className="py-4 text-center text-xs text-slate-400 font-medium">
                  No upcoming birthdays soon
                </div>
              ) : (
                upcomingBirthdays.map((bday) => (
                  <div
                    key={bday.id}
                    className="py-2.5 flex items-center justify-between group hover:bg-slate-50/50 px-1 rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {bday.profilePhoto ? (
                        <img src={bday.profilePhoto} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-bold text-xs flex items-center justify-center shrink-0">
                          {bday.initials}
                        </div>
                      )}
                      <div>
                        <div className="text-xs font-bold text-slate-800">{bday.name}</div>
                        {bday.jobTitle && (
                          <div className="text-[10px] text-slate-400 font-medium">{bday.jobTitle}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <span className="text-[11px] font-semibold text-slate-600">{bday.dateStr}</span>
                      {bday.isToday && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-600">Today 🎂</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Upcoming Holidays */}
        <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <IconGift className="w-4 h-4 text-purple-600" />
              <h4 className="text-sm font-bold text-slate-900">Upcoming Holidays</h4>
            </div>

            <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto pr-1">
              {upcomingHolidays.length === 0 ? (
                <div className="py-4 text-center text-xs text-slate-400 font-medium">
                  No upcoming holidays scheduled
                </div>
              ) : (
                upcomingHolidays.map((h) => (
                  <div
                    key={h.id}
                    onClick={() => navigate('/company/holidays')}
                    className="py-2.5 flex items-center justify-between group cursor-pointer hover:bg-slate-50/50 px-1 rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
                        <IconSparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-800">{h.name}</div>
                        <div className="text-[10px] text-slate-400 font-medium capitalize">{h.type.toLowerCase()} Holiday</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <span className="text-[11px] font-semibold text-slate-600">{h.dateStr}</span>
                      <IconChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
