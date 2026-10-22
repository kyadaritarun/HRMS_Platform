import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import {
  IconUsers,
  IconUserCheck,
  IconCalendarEvent,
  IconAlertCircle,
  IconUserPlus,
  IconGift,
  IconAward,
  IconReceipt2,
  IconCalendar,
  IconFileDescription,
  IconDownload,
  IconChevronDown,
  IconBriefcase,
  IconBuilding,
  IconBell,
  IconChecklist,
  IconCake,
  IconMail,
  IconSend,
  IconLoader2,
  IconCheck,
  IconSparkles,
} from '@tabler/icons-react';
import { getHolidayIcon } from '../../utils/holidayIcons';
import { EventEmailsModal } from '../../components/company/EventEmailsModal';

interface DashboardMetrics {
  totalEmployees: number;
  totalDepartments: number;
  totalPolicies: number;
  pendingApprovals: Record<string, number>;
}

interface EmployeeItem {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle?: string;
  monthlySalary?: number;
  department?: { id: number; name: string } | null;
  joiningDate?: string;
  dateOfBirth?: string;
  createdAt: string;
  workMode?: string;
}

interface RequestItem {
  id: number;
  type: string;
  status: string;
  reason?: string;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  userId?: number;
  user?: {
    id: number;
    firstName: string;
    lastName: string;
  };
}

interface DepartmentItem {
  id: number;
  name: string;
  _count?: { users: number };
  users?: any[];
}

interface HolidayItem {
  id: number;
  name: string;
  date: string;
  type?: string;
}

interface ActivityLogItem {
  id: number;
  action: string;
  message: string;
  createdAt: string;
}

const formatRelativeTime = (dateStr: string) => {
  try {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  } catch {
    return 'Recently';
  }
};

const formatDeptLabel = (name: string): string[] => {
  if (!name) return [''];
  const trimmed = name.trim();
  if (trimmed.length <= 11) return [trimmed];

  const words = trimmed.split(/\s+/);
  if (words.length === 1) {
    return [trimmed.length > 12 ? `${trimmed.slice(0, 11)}…` : trimmed];
  }

  // Handle patterns like "Finance & Operations", "Product & Design", "Sales & Marketing"
  if (words.length === 3 && (words[1] === '&' || words[1].toLowerCase() === 'and')) {
    return [`${words[0]} ${words[1]}`, words[2]];
  }

  // Handle 2 words like "Human Resources"
  if (words.length === 2) {
    return [words[0], words[1]];
  }

  // General multi-word split
  const mid = Math.ceil(words.length / 2);
  const line1 = words.slice(0, mid).join(' ');
  const line2 = words.slice(mid).join(' ');
  return [
    line1.length > 13 ? `${line1.slice(0, 12)}…` : line1,
    line2.length > 13 ? `${line2.slice(0, 12)}…` : line2,
  ];
};

export const CompanyDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { company } = useAuth();

  // Live Backend Data States
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalEmployees: 0,
    totalDepartments: 0,
    totalPolicies: 0,
    pendingApprovals: { LEAVE: 0, REGULARIZATION: 0, CLAIM: 0 },
  });
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [holidays, setHolidays] = useState<HolidayItem[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter States
  const [attendanceFilter, setAttendanceFilter] = useState<'Today' | 'This Month'>('Today');
  const [leaveFilter, setLeaveFilter] = useState<'This Month' | 'All Time'>('This Month');

  // Automated Email Modal State
  const [isEventEmailsModalOpen, setIsEventEmailsModalOpen] = useState(false);
  const [emailToast, setEmailToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Fetch 100% strictly real live data from backend APIs
  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const [dashRes, empsRes, attRes, reqsRes, deptsRes, holiRes, logsRes] = await Promise.all([
        api.get('/company/dashboard').catch(() => ({ data: {} })),
        api.get('/employees?pageSize=100').catch(() => ({ data: { items: [] } })),
        api.get('/attendance?pageSize=100').catch(() => ({ data: { items: [] } })),
        api.get('/requests?scope=company&pageSize=100').catch(() => ({ data: { items: [] } })),
        api.get('/company/departments').catch(() => ({ data: { departments: [] } })),
        api.get('/company/holidays').catch(() => ({ data: { holidays: [] } })),
        api.get('/company/activity-logs?pageSize=5').catch(() => ({ data: { items: [] } })),
      ]);

      if (dashRes.data?.metrics) setMetrics(dashRes.data.metrics);
      if (empsRes.data?.items) setEmployees(empsRes.data.items);
      if (attRes.data?.items || attRes.data?.records) {
        setAttendance(attRes.data.items || attRes.data.records);
      }
      if (reqsRes.data?.items) setRequests(reqsRes.data.items);
      if (deptsRes.data?.departments) setDepartments(deptsRes.data.departments);
      if (holiRes.data?.holidays) setHolidays(holiRes.data.holidays);
      if (logsRes.data?.items) setActivityLogs(logsRes.data.items);
    } catch (err) {
      console.error('Failed to fetch real company dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    const handleSync = () => {
      fetchDashboardData();
    };

    window.addEventListener('attendance-updated', handleSync);
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'attendance_sync_ts') {
        handleSync();
      }
    };
    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener('attendance-updated', handleSync);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  // Real today formatted date
  const todayFormatted = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, []);

  // Real Current Month & Year
  const currentMonthYear = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    });
  }, []);
  const totalEmployeesCount = useMemo(() => {
    return metrics.totalEmployees || employees.length;
  }, [metrics.totalEmployees, employees.length]);

  // 2. REAL ATTENDANCE & PUNCHES COMPUTED STRICTLY FROM DATABASE FOR TODAY OR THIS MONTH
  const attendanceMetrics = useMemo(() => {
    const total = totalEmployeesCount;
    const now = new Date();
    const isToday = attendanceFilter === 'Today';

    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    let livePresent = 0;
    let liveOnLeave = 0;
    let liveHalfDay = 0;

    if (isToday) {
      // Live Present Today: Distinct employees who checked in today
      const todayPresentUserIds = new Set<number>();
      const todayHalfDayUserIds = new Set<number>();

      attendance.forEach((a) => {
        if (!a.checkIn) return;
        const d = new Date(a.checkIn);
        if (d >= startOfToday) {
          if (a.userId) todayPresentUserIds.add(a.userId);
          if (a.checkOut) {
            const hours = (new Date(a.checkOut).getTime() - d.getTime()) / (1000 * 60 * 60);
            if (hours > 0 && hours < 4.5 && a.userId) {
              todayHalfDayUserIds.add(a.userId);
            }
          }
        }
      });

      // Live On Leave Today: Employees with approved leave requests covering today
      const todayOnLeaveUserIds = new Set<number>();
      requests.forEach((r) => {
        if (r.type !== 'LEAVE' || r.status !== 'APPROVED' || !r.startDate || !r.endDate) return;
        const s = new Date(r.startDate);
        const e = new Date(r.endDate);
        e.setHours(23, 59, 59, 999);
        const uId = r.userId || r.user?.id;
        if (now >= s && now <= e && uId) {
          todayOnLeaveUserIds.add(uId);
        }
      });

      livePresent = todayPresentUserIds.size;
      liveOnLeave = todayOnLeaveUserIds.size;
      liveHalfDay = todayHalfDayUserIds.size;
    } else {
      // Live Present This Month: Distinct employees who attended work during this month
      const monthPresentUserIds = new Set<number>();
      const monthHalfDayUserIds = new Set<number>();

      attendance.forEach((a) => {
        if (!a.checkIn) return;
        const d = new Date(a.checkIn);
        if (d >= startOfMonth && d <= endOfMonth) {
          if (a.userId) monthPresentUserIds.add(a.userId);
          if (a.checkOut) {
            const hours = (new Date(a.checkOut).getTime() - d.getTime()) / (1000 * 60 * 60);
            if (hours > 0 && hours < 4.5 && a.userId) {
              monthHalfDayUserIds.add(a.userId);
            }
          }
        }
      });

      // Live On Leave This Month: Distinct employees with approved leave during this month
      const monthOnLeaveUserIds = new Set<number>();
      requests.forEach((r) => {
        if (r.type !== 'LEAVE' || r.status !== 'APPROVED' || !r.startDate || !r.endDate) return;
        const s = new Date(r.startDate);
        const e = new Date(r.endDate);
        const uId = r.userId || r.user?.id;
        if (e >= startOfMonth && s <= endOfMonth && uId) {
          monthOnLeaveUserIds.add(uId);
        }
      });

      livePresent = monthPresentUserIds.size;
      liveOnLeave = monthOnLeaveUserIds.size;
      liveHalfDay = monthHalfDayUserIds.size;
    }

    // Absent: Remaining workforce
    const liveAbsent = Math.max(0, total - livePresent - liveOnLeave);

    const presentPercent = total > 0 ? ((livePresent / total) * 100).toFixed(1) : '0';
    const onLeavePercent = total > 0 ? ((liveOnLeave / total) * 100).toFixed(1) : '0';
    const absentPercent = total > 0 ? ((liveAbsent / total) * 100).toFixed(1) : '0';
    const halfDayPercent = total > 0 ? ((liveHalfDay / total) * 100).toFixed(1) : '0';

    // New Joiners: Employees joined in the current calendar month
    const newJoinersCount = employees.filter((e) => {
      const joined = e.joiningDate ? new Date(e.joiningDate) : new Date(e.createdAt);
      return joined >= startOfMonth;
    }).length;

    return {
      present: livePresent,
      presentPercent,
      onLeave: liveOnLeave,
      onLeavePercent,
      absent: liveAbsent,
      absentPercent,
      halfDay: liveHalfDay,
      halfDayPercent,
      newJoiners: newJoinersCount,
    };
  }, [totalEmployeesCount, attendance, requests, employees, attendanceFilter]);

  // 3. REAL TOTAL PAYROLL POOL
  const payrollTotalCost = useMemo(() => {
    const sum = employees.reduce((acc, curr) => acc + (Number(curr.monthlySalary) || 0), 0);
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(sum);
  }, [employees]);

  // Real Upcoming Birthdays
  const upcomingBirthdays = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return employees
      .filter((e) => Boolean(e.dateOfBirth))
      .map((e) => {
        let birthMonth = 0;
        let birthDay = 1;
        if (e.dateOfBirth) {
          const parts = e.dateOfBirth.split('T')[0].split('-');
          if (parts.length === 3) {
            birthMonth = parseInt(parts[1], 10) - 1;
            birthDay = parseInt(parts[2], 10);
          } else {
            const dob = new Date(e.dateOfBirth);
            birthMonth = dob.getMonth();
            birthDay = dob.getDate();
          }
        }
        let nextBday = new Date(today.getFullYear(), birthMonth, birthDay);
        if (nextBday < today) {
          nextBday = new Date(today.getFullYear() + 1, birthMonth, birthDay);
        }
        const diffDays = Math.ceil((nextBday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return {
          ...e,
          diffDays,
          formattedDate: nextBday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        };
      })
      .sort((a, b) => a.diffDays - b.diffDays);
  }, [employees]);

  // Real Upcoming Company Holidays strictly capped at 5 total (deduplicated by name and date)
  const upcomingHolidays = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const mapped = holidays.map((h) => ({
      id: `h-${h.id}`,
      title: h.name,
      date: new Date(h.date),
      dateLabel: new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }));

    const upcoming = mapped
      .filter((h) => h.date >= today)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    const list = upcoming.length > 0 ? upcoming : mapped.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Deduplicate identical holiday entries by name & date
    const seen = new Set<string>();
    const uniqueList: typeof mapped = [];
    for (const item of list) {
      const key = `${item.title.toLowerCase().trim()}_${item.date.toISOString().split('T')[0]}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueList.push(item);
      }
    }

    return uniqueList.slice(0, 5);
  }, [holidays]);

  // 4. REAL LEAVE REQUEST STATISTICS
  const leaveStats = useMemo(() => {
    const isThisMonth = leaveFilter === 'This Month';
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const leaveRequests = requests.filter((r) => {
      if (r.type !== 'LEAVE') return false;
      if (!isThisMonth) return true;
      const refDate = r.startDate ? new Date(r.startDate) : r.createdAt ? new Date(r.createdAt) : null;
      return refDate ? refDate >= startOfMonth && refDate <= endOfMonth : true;
    });
    const approved = leaveRequests.filter((r) => r.status === 'APPROVED').length;
    const pending = leaveRequests.filter((r) => r.status === 'PENDING').length;
    const rejected = leaveRequests.filter((r) => r.status === 'REJECTED').length;

    return {
      total: leaveRequests.length,
      approved,
      pending,
      rejected,
    };
  }, [requests, leaveFilter]);

  // 5. REAL DEPARTMENT HEADCOUNTS
  const departmentHeadcounts = useMemo(() => {
    return departments.map((d) => ({
      name: d.name,
      count: d._count?.users ?? (d.users?.length ?? 0),
    }));
  }, [departments]);

  // Max department count for chart scaling
  const maxDeptCount = useMemo(() => {
    const max = Math.max(...departmentHeadcounts.map((d) => d.count), 5);
    return Math.ceil(max / 5) * 5;
  }, [departmentHeadcounts]);

  // SVG Donut Chart Segments Calculation (Strictly Real)
  const donutSegments = useMemo(() => {
    const total = totalEmployeesCount;
    const r = 52;
    const c = 2 * Math.PI * r; // ~326.72

    if (total === 0) {
      return {
        c,
        present: { strokeDasharray: `0 ${c}`, strokeDashoffset: 0 },
        onLeave: { strokeDasharray: `0 ${c}`, strokeDashoffset: 0 },
        absent: { strokeDasharray: `0 ${c}`, strokeDashoffset: 0 },
        halfDay: { strokeDasharray: `0 ${c}`, strokeDashoffset: 0 },
      };
    }

    const pLen = (attendanceMetrics.present / total) * c;
    const lLen = (attendanceMetrics.onLeave / total) * c;
    const aLen = (attendanceMetrics.absent / total) * c;
    const hLen = Math.max(0, c - pLen - lLen - aLen);

    return {
      c,
      present: { strokeDasharray: `${pLen} ${c}`, strokeDashoffset: 0 },
      onLeave: { strokeDasharray: `${lLen} ${c}`, strokeDashoffset: -pLen },
      absent: { strokeDasharray: `${aLen} ${c}`, strokeDashoffset: -(pLen + lLen) },
      halfDay: { strokeDasharray: `${hLen} ${c}`, strokeDashoffset: -(pLen + lLen + aLen) },
    };
  }, [totalEmployeesCount, attendanceMetrics]);

  // Total pending approvals across all categories
  const pendingApprovalsTotal = useMemo(() => {
    return Object.values(metrics.pendingApprovals || {}).reduce((acc, curr) => acc + curr, 0);
  }, [metrics.pendingApprovals]);

  return (
    <div className="space-y-6">
      {/* ===================== TOP BAR ===================== */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Company Dashboard
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Real-time workforce intelligence and operations center
          </p>
        </div>

        <div className="flex items-center gap-3 self-stretch sm:self-auto">
          {/* Automated Event Emails Configuration Button */}
          <button
            onClick={() => setIsEventEmailsModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-[#5E4BE2] rounded-xl shadow-xs text-xs font-bold transition-colors cursor-pointer"
            title="Configure Automated Birthday & Holiday Emails"
          >
            <IconMail className="w-4 h-4" />
            <span>Automated Event Emails</span>
          </button>

          {/* Real Date Indicator */}
          <div className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl shadow-xs text-xs font-semibold text-slate-700">
            <IconCalendar className="w-4 h-4 text-indigo-600" />
            <span>{todayFormatted}</span>
          </div>
        </div>
      </div>

      {/* Floating Status Notification for Dispatched Emails */}
      {emailToast && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between gap-3 shadow-sm animate-in fade-in duration-200 ${
            emailToast.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {emailToast.type === 'success' ? (
              <IconCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <IconAlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{emailToast.message}</span>
          </div>
          <button
            onClick={() => setEmailToast(null)}
            className="text-slate-400 hover:text-slate-600 cursor-pointer text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* ===================== ROW 2: ATTENDANCE OVERVIEW + TREND + UPCOMING EVENTS ===================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Col 1: Attendance Overview Donut (col-span 4) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4">
              <div className="flex items-center gap-2">
                <IconCalendar className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-sm">Attendance Overview</h3>
              </div>
              <div className="relative">
                <select
                  value={attendanceFilter}
                  onChange={(e) => setAttendanceFilter(e.target.value as 'Today' | 'This Month')}
                  className="px-2.5 py-1 pr-6 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer appearance-none outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="Today">Today</option>
                  <option value="This Month">This Month</option>
                </select>
                <IconChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Donut Chart & Legend */}
            <div className="flex items-center justify-between gap-4 pt-2">
              {/* SVG Donut */}
              <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 140 140">
                  <circle cx="70" cy="70" r="52" fill="none" stroke="#F1F5F9" strokeWidth="16" />
                  {totalEmployeesCount > 0 && (
                    <>
                      <circle
                        cx="70"
                        cy="70"
                        r="52"
                        fill="none"
                        stroke="#10B981"
                        strokeWidth="16"
                        strokeDasharray={donutSegments.present.strokeDasharray}
                        strokeDashoffset={donutSegments.present.strokeDashoffset}
                        className="transition-all duration-1000"
                      />
                      <circle
                        cx="70"
                        cy="70"
                        r="52"
                        fill="none"
                        stroke="#F59E0B"
                        strokeWidth="16"
                        strokeDasharray={donutSegments.onLeave.strokeDasharray}
                        strokeDashoffset={donutSegments.onLeave.strokeDashoffset}
                        className="transition-all duration-1000"
                      />
                      <circle
                        cx="70"
                        cy="70"
                        r="52"
                        fill="none"
                        stroke="#EF4444"
                        strokeWidth="16"
                        strokeDasharray={donutSegments.absent.strokeDasharray}
                        strokeDashoffset={donutSegments.absent.strokeDashoffset}
                        className="transition-all duration-1000"
                      />
                      <circle
                        cx="70"
                        cy="70"
                        r="52"
                        fill="none"
                        stroke="#8B5CF6"
                        strokeWidth="16"
                        strokeDasharray={donutSegments.halfDay.strokeDasharray}
                        strokeDashoffset={donutSegments.halfDay.strokeDashoffset}
                        className="transition-all duration-1000"
                      />
                    </>
                  )}
                </svg>

                {/* Inner Donut Center Content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                  <span className="text-lg font-black text-slate-900 leading-none">
                    {totalEmployeesCount.toLocaleString()}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-wide">
                    Total
                  </span>
                </div>
              </div>

              {/* Legend List */}
              <div className="space-y-2 text-xs flex-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
                    <span className="text-slate-600 font-medium">Present</span>
                  </div>
                  <span className="font-bold text-slate-900">
                    {attendanceMetrics.present} ({attendanceMetrics.presentPercent}%)
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
                    <span className="text-slate-600 font-medium">On Leave</span>
                  </div>
                  <span className="font-bold text-slate-900">
                    {attendanceMetrics.onLeave} ({attendanceMetrics.onLeavePercent}%)
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
                    <span className="text-slate-600 font-medium">Absent</span>
                  </div>
                  <span className="font-bold text-slate-900">
                    {attendanceMetrics.absent} ({attendanceMetrics.absentPercent}%)
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#8B5CF6]" />
                    <span className="text-slate-600 font-medium">Half Day</span>
                  </div>
                  <span className="font-bold text-slate-900">
                    {attendanceMetrics.halfDay} ({attendanceMetrics.halfDayPercent}%)
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 mt-4 text-center">
            <button
              onClick={() => navigate('/company/attendance')}
              className="text-xs font-bold text-[#5E4BE2] hover:text-[#4B39C3] transition-colors inline-flex items-center gap-1 cursor-pointer"
            >
              <span>View Attendance Report</span>
              <span>&rarr;</span>
            </button>
          </div>
        </div>

        {/* Col 2: Employee Birthdays (col-span 4) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3">
              <div className="flex items-center gap-2">
                <IconCake className="w-4 h-4 text-pink-600" />
                <h3 className="font-bold text-slate-900 text-sm">Employee Birthdays</h3>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-pink-50 text-pink-700 border border-pink-200/60" title="Birthday greeting emails are automatically sent by server">
                  Auto Email
                </span>
              </div>
              <button
                onClick={() => navigate('/company/employees')}
                className="text-xs font-bold text-[#5E4BE2] hover:underline cursor-pointer"
              >
                Employees
              </button>
            </div>

            {/* Birthdays list - compact styling matching Upcoming Events */}
            <div className="space-y-2.5 pt-1">
              {upcomingBirthdays.length === 0 ? (
                <div className="p-3 text-center rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-xs font-semibold text-slate-600">No upcoming birthdays</p>
                  <button
                    onClick={() => navigate('/company/employees')}
                    className="text-[11px] font-bold text-[#5E4BE2] mt-1 hover:underline cursor-pointer"
                  >
                    View Employees
                  </button>
                </div>
              ) : (
                upcomingBirthdays.slice(0, 5).map((b) => (
                  <div
                    key={b.id}
                    className={`flex items-center justify-between p-2.5 rounded-xl transition-colors ${
                      b.diffDays === 0
                        ? 'bg-pink-50/70 border border-pink-200/80 hover:bg-pink-100/70'
                        : 'bg-slate-50/70 hover:bg-slate-100/70'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                          b.diffDays === 0
                            ? 'bg-pink-100 text-pink-700'
                            : 'bg-pink-50 text-pink-600 border border-pink-100'
                        }`}
                      >
                        <IconCake className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-900 truncate block">
                          {b.firstName} {b.lastName}
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-500 shrink-0 ml-2">
                      {b.formattedDate}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Col 3: Upcoming Events (col-span 4) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3">
              <div className="flex items-center gap-2">
                <IconGift className="w-4 h-4 text-purple-600" />
                <h3 className="font-bold text-slate-900 text-sm">Upcoming Events</h3>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-[#5E4BE2] border border-indigo-200/60" title="Holiday announcement emails are automatically sent by server once configured">
                  Auto Email
                </span>
              </div>
              <button
                onClick={() => navigate('/company/holidays')}
                className="text-xs font-bold text-[#5E4BE2] hover:underline cursor-pointer"
              >
                Holidays
              </button>
            </div>

            {/* Events List strictly from Real Holidays & Employee milestones (Max 5 events) */}
            <div className="space-y-2.5 pt-1">
              {upcomingHolidays.length === 0 ? (
                <div className="p-3 text-center rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-xs font-semibold text-slate-600">No holidays declared yet</p>
                  <button
                    onClick={() => navigate('/company/holidays')}
                    className="text-[11px] font-bold text-[#5E4BE2] mt-1 hover:underline cursor-pointer"
                  >
                    + Add Holiday
                  </button>
                </div>
              ) : (
                upcomingHolidays.map((evt) => {
                  const holidayStyle = getHolidayIcon(evt.title);
                  const HolidayIcon = holidayStyle.Icon;
                  return (
                    <div
                      key={evt.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/70 hover:bg-slate-100/70 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${holidayStyle.className}`}
                        >
                          <HolidayIcon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-slate-900 truncate block">
                            {evt.title}
                          </span>
                        </div>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-500 shrink-0 ml-2">
                        {evt.dateLabel}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ===================== ROW 3: LEAVE + PAYROLL + OPERATIONS + QUICK ACCESS ===================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Leave Summary */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3">
              <div className="flex items-center gap-2">
                <IconCalendarEvent className="w-4 h-4 text-purple-600" />
                <h3 className="font-bold text-slate-900 text-sm">Leave Summary</h3>
              </div>
              <div className="relative">
                <select
                  value={leaveFilter}
                  onChange={(e) => setLeaveFilter(e.target.value as 'This Month' | 'All Time')}
                  className="px-2 py-0.5 pr-5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer appearance-none outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="This Month">This Month</option>
                  <option value="All Time">All Time</option>
                </select>
                <IconChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-2.5 pt-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Total Leave Requests</span>
                <span className="font-black text-slate-900 text-sm">{leaveStats.total}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Approved</span>
                <span className="font-black text-emerald-600 text-sm">{leaveStats.approved}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Pending Approvals</span>
                <span className="font-black text-amber-600 text-sm">{leaveStats.pending}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Rejected</span>
                <span className="font-black text-rose-600 text-sm">{leaveStats.rejected}</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 mt-4 text-center">
            <button
              onClick={() => navigate('/company/leaves/manage')}
              className="text-xs font-bold text-[#5E4BE2] hover:text-[#4B39C3] inline-flex items-center gap-1 cursor-pointer"
            >
              <span>View Leave Requests</span>
              <span>&rarr;</span>
            </button>
          </div>
        </div>

        {/* Card 2: Payroll Summary */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3">
              <div className="flex items-center gap-2">
                <IconReceipt2 className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-sm">Payroll Summary</h3>
              </div>
              <span className="px-2 py-0.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600">
                {currentMonthYear}
              </span>
            </div>

            {/* Payroll Status Banner */}
            <div className="mt-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-100 text-center">
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700 flex items-center justify-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Monthly Payroll Pool</span>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3 text-xs">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 block">Active Employees</span>
                <span className="font-black text-slate-900 text-sm mt-0.5 block">
                  {totalEmployeesCount.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-400 block">Total Salary Pool</span>
                <span className="font-black text-slate-900 text-sm mt-0.5 block truncate">
                  {payrollTotalCost}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 mt-4 text-center">
            <button
              onClick={() => navigate('/payroll/attendance-salary')}
              className="text-xs font-bold text-[#5E4BE2] hover:text-[#4B39C3] inline-flex items-center gap-1 cursor-pointer"
            >
              <span>View Payroll Dashboard</span>
              <span>&rarr;</span>
            </button>
          </div>
        </div>

        {/* Card 3: Company Operations Summary (Real Metrics) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3">
              <div className="flex items-center gap-2">
                <IconBriefcase className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-sm">Operations Overview</h3>
              </div>
              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">
                Live Data
              </span>
            </div>

            <div className="space-y-2.5 pt-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Departments</span>
                <span className="font-black text-slate-900 text-sm">{metrics.totalDepartments || departments.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Company Policies</span>
                <span className="font-black text-slate-900 text-sm">{metrics.totalPolicies}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Pending Approvals</span>
                <span className="font-black text-amber-600 text-sm">{pendingApprovalsTotal}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Total Staff Enrolled</span>
                <span className="font-black text-slate-900 text-sm">{totalEmployeesCount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 4: Quick Access (6 Functional Apps) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#5E4BE2]" />
                <h3 className="font-bold text-slate-900 text-sm">Quick Access</h3>
              </div>
            </div>

            {/* 6-App Grid */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              {/* 1. Leaves */}
              <button
                onClick={() => navigate('/company/leaves/manage')}
                className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-slate-50 transition-colors group cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <IconCalendarEvent className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold text-slate-600 mt-1 leading-tight text-center">
                  Leaves
                </span>
              </button>

              {/* 2. Policies */}
              <button
                onClick={() => navigate('/company/policies/manage')}
                className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-slate-50 transition-colors group cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <IconFileDescription className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold text-slate-600 mt-1 leading-tight text-center">
                  Policies
                </span>
              </button>

              {/* 3. Add Staff */}
              <button
                onClick={() => navigate('/company/employees/new')}
                className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-slate-50 transition-colors group cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <IconUserPlus className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold text-slate-600 mt-1 leading-tight text-center">
                  Add Staff
                </span>
              </button>

              {/* 4. AI Assistant */}
              <button
                onClick={() => navigate('/assistant')}
                className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-slate-50 transition-colors group cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-[#5E4BE2] flex items-center justify-center group-hover:scale-105 transition-transform">
                  <IconSparkles className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold text-slate-600 mt-1 leading-tight text-center">
                  AI Assistant
                </span>
              </button>

              {/* 5. Attendance */}
              <button
                onClick={() => navigate('/company/attendance')}
                className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-slate-50 transition-colors group cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <IconUserCheck className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold text-slate-600 mt-1 leading-tight text-center">
                  Attendance
                </span>
              </button>

              {/* 6. Approvals */}
              <button
                onClick={() => navigate('/attendance/regularizations/manage')}
                className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-slate-50 transition-colors group cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <IconChecklist className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold text-slate-600 mt-1 leading-tight text-center">
                  Approvals
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ===================== ROW 4: DEPARTMENT HEADCOUNT + RECENT ACTIVITIES ===================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Col 1: Department-wise Headcount Bar Chart (col-span 7) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3">
              <div className="flex items-center gap-2">
                <IconBuilding className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-sm">Department-wise Headcount</h3>
              </div>
              <button
                onClick={() => navigate('/company/departments')}
                className="text-xs font-bold text-[#5E4BE2] hover:underline cursor-pointer"
              >
                Manage Depts
              </button>
            </div>

            {/* Strictly Real Department Bar Chart */}
            {departmentHeadcounts.length > 0 ? (
              <div className="relative pt-2">
                <svg className="w-full h-56 overflow-visible" viewBox="0 0 550 215">
                  <g className="text-[10px] font-medium fill-slate-400">
                    <line x1="30" y1="20" x2="540" y2="20" stroke="#F1F5F9" />
                    <text x="5" y="24">{maxDeptCount}</text>

                    <line x1="30" y1="55" x2="540" y2="55" stroke="#F1F5F9" />
                    <text x="5" y="59">{Math.round(maxDeptCount * 0.75)}</text>

                    <line x1="30" y1="90" x2="540" y2="90" stroke="#F1F5F9" />
                    <text x="5" y="94">{Math.round(maxDeptCount * 0.5)}</text>

                    <line x1="30" y1="125" x2="540" y2="125" stroke="#F1F5F9" />
                    <text x="5" y="129">{Math.round(maxDeptCount * 0.25)}</text>

                    <line x1="30" y1="160" x2="540" y2="160" stroke="#E2E8F0" />
                    <text x="18" y="164">0</text>
                  </g>

                  {/* Vertical Bars for Real Departments */}
                  {departmentHeadcounts.map((dept, idx) => {
                    const barWidth = 36;
                    const totalSlots = departmentHeadcounts.length;
                    const gap = (510 - barWidth * totalSlots) / (totalSlots + 1);
                    const x = 35 + gap + idx * (barWidth + gap);
                    const barHeight = maxDeptCount > 0 ? Math.max(8, (dept.count / maxDeptCount) * 135) : 8;
                    const y = 160 - barHeight;
                    const lines = formatDeptLabel(dept.name);

                    return (
                      <g key={idx} className="group cursor-pointer">
                        <title>{`${dept.name}: ${dept.count} ${dept.count === 1 ? 'employee' : 'employees'}`}</title>
                        <text
                          x={x + barWidth / 2}
                          y={y - 6}
                          textAnchor="middle"
                          className="text-[11px] font-black fill-slate-800"
                        >
                          {dept.count}
                        </text>

                        <rect
                          x={x}
                          y={y}
                          width={barWidth}
                          height={barHeight}
                          rx="6"
                          fill="#6366F1"
                          className="transition-all duration-300 group-hover:fill-[#4F46E5]"
                        />

                        {lines.length === 1 ? (
                          <text
                            x={x + barWidth / 2}
                            y="178"
                            textAnchor="middle"
                            className="text-[10px] font-bold fill-slate-500"
                          >
                            {lines[0]}
                          </text>
                        ) : (
                          <text
                            x={x + barWidth / 2}
                            textAnchor="middle"
                            className="text-[10px] font-bold fill-slate-500"
                          >
                            <tspan x={x + barWidth / 2} y="176">
                              {lines[0]}
                            </tspan>
                            <tspan x={x + barWidth / 2} y="189">
                              {lines[1]}
                            </tspan>
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>
            ) : (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-[#5E4BE2] flex items-center justify-center mb-2">
                  <IconBuilding className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-slate-800">No departments added yet</p>
                <p className="text-xs text-slate-400 mt-0.5">Create departments to visualize employee distribution.</p>
                <button
                  onClick={() => navigate('/company/departments')}
                  className="mt-3 px-3 py-1.5 bg-[#5E4BE2] text-white text-xs font-bold rounded-xl"
                >
                  + Add Department
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Col 2: Recent Activities Feed (Strictly Real Backend Audit Logs) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3">
              <div className="flex items-center gap-2">
                <IconBell className="w-4 h-4 text-purple-600" />
                <h3 className="font-bold text-slate-900 text-sm">Recent Activities</h3>
              </div>
              <button
                onClick={() => navigate('/company/activity-logs')}
                className="text-xs font-bold text-[#5E4BE2] hover:underline cursor-pointer"
              >
                View All
              </button>
            </div>

            {/* Strictly Real Activities Feed */}
            <div className="space-y-3 pt-1">
              {activityLogs.length > 0 ? (
                activityLogs.slice(0, 4).map((log) => (
                  <div key={log.id} className="flex items-start justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-indigo-50 text-[#5E4BE2] flex items-center justify-center shrink-0 mt-0.5">
                        <IconBell className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 leading-tight truncate">
                          {log.message}
                        </p>
                        <span className="text-[10px] font-semibold text-slate-400 mt-0.5 block">
                          {formatRelativeTime(log.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : employees.length > 0 ? (
                // If no audit log table items exist yet, show real recently added employees
                employees.slice(0, 5).map((emp) => (
                  <div key={emp.id} className="flex items-start justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                        <IconUserPlus className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 leading-tight truncate">
                          Employee {emp.firstName} {emp.lastName} registered
                        </p>
                        <span className="text-[10px] font-semibold text-slate-400 mt-0.5 block">
                          {formatRelativeTime(emp.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-slate-400">
                  No recent activities recorded yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Automated Birthday & Event Emails Modal */}
      <EventEmailsModal
        isOpen={isEventEmailsModalOpen}
        onClose={() => setIsEventEmailsModalOpen(false)}
      />
    </div>
  );
};

export default CompanyDashboard;
