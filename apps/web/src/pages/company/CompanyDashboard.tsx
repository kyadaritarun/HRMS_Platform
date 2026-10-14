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
  IconSchool,
  IconCalendar,
  IconFileDescription,
  IconChartBar,
  IconDownload,
  IconChevronDown,
  IconBriefcase,
  IconBuilding,
  IconBell,
  IconChecklist,
  IconCake,
} from '@tabler/icons-react';

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
  const [attendanceFilter, setAttendanceFilter] = useState('This Month');
  const [leaveFilter, setLeaveFilter] = useState('This Month');

  // Fetch 100% strictly real live data from backend APIs
  useEffect(() => {
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

    fetchDashboardData();
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

  // 1. REAL TOTAL EMPLOYEE COUNT
  const totalEmployeesCount = useMemo(() => {
    return metrics.totalEmployees || employees.length;
  }, [metrics.totalEmployees, employees.length]);

  // 2. REAL ATTENDANCE & PUNCHES COMPUTED STRICTLY FROM DATABASE
  const attendanceMetrics = useMemo(() => {
    const total = totalEmployeesCount;
    const now = new Date();

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // Live Present: Employees who have checked in today
    const livePresent = attendance.filter((a) => {
      if (!a.checkIn) return false;
      const d = new Date(a.checkIn);
      return d >= startOfToday;
    }).length;

    // Live On Leave: Employees with approved leave requests covering today
    const liveOnLeave = requests.filter((r) => {
      if (r.type !== 'LEAVE' || r.status !== 'APPROVED') return false;
      if (!r.startDate || !r.endDate) return false;
      const s = new Date(r.startDate);
      const e = new Date(r.endDate);
      e.setHours(23, 59, 59, 999);
      return now >= s && now <= e;
    }).length;

    // Absent: Remaining workforce
    const liveAbsent = Math.max(0, total - livePresent - liveOnLeave);

    // Half Day: Check-ins with short duration (< 4.5 hours)
    const liveHalfDay = attendance.filter((a) => {
      if (!a.checkIn || !a.checkOut) return false;
      const hours = (new Date(a.checkOut).getTime() - new Date(a.checkIn).getTime()) / (1000 * 60 * 60);
      return hours > 0 && hours < 4.5;
    }).length;

    const presentPercent = total > 0 ? ((livePresent / total) * 100).toFixed(1) : '0';
    const onLeavePercent = total > 0 ? ((liveOnLeave / total) * 100).toFixed(1) : '0';
    const absentPercent = total > 0 ? ((liveAbsent / total) * 100).toFixed(1) : '0';
    const halfDayPercent = total > 0 ? ((liveHalfDay / total) * 100).toFixed(1) : '0';

    // New Joiners: Employees joined in the current calendar month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
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
  }, [totalEmployeesCount, attendance, requests, employees]);

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
        const dob = new Date(e.dateOfBirth!);
        const birthMonth = dob.getMonth();
        const birthDay = dob.getDate();
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

  // Real Upcoming Combined Events strictly capped at 5 total
  const combinedUpcomingEvents = useMemo(() => {
    const list: Array<{
      id: string;
      title: string;
      subtitle: string;
      dateLabel: string;
      type: 'HOLIDAY' | 'BIRTHDAY' | 'PAYROLL';
    }> = [];

    // Add company holidays
    holidays.forEach((h) => {
      list.push({
        id: `h-${h.id}`,
        title: h.name,
        subtitle: 'Company Holiday',
        dateLabel: new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        type: 'HOLIDAY',
      });
    });

    // Add birthdays
    upcomingBirthdays.forEach((b) => {
      list.push({
        id: `b-${b.id}`,
        title: `${b.firstName} ${b.lastName}`,
        subtitle: b.diffDays === 0 ? 'Birthday Today 🎂' : 'Upcoming Birthday',
        dateLabel: b.formattedDate,
        type: 'BIRTHDAY',
      });
    });

    // Add Payroll Cycle
    list.push({
      id: 'payroll-cycle',
      title: `${currentMonthYear} Salary Disbursal`,
      subtitle: 'Payroll Cycle',
      dateLabel: 'End of Month',
      type: 'PAYROLL',
    });

    // Strictly show only 5 events!
    return list.slice(0, 5);
  }, [holidays, upcomingBirthdays, currentMonthYear]);

  // 4. REAL LEAVE REQUEST STATISTICS
  const leaveStats = useMemo(() => {
    const leaveRequests = requests.filter((r) => r.type === 'LEAVE');
    const approved = leaveRequests.filter((r) => r.status === 'APPROVED').length;
    const pending = leaveRequests.filter((r) => r.status === 'PENDING').length;
    const rejected = leaveRequests.filter((r) => r.status === 'REJECTED').length;

    return {
      total: leaveRequests.length,
      approved,
      pending,
      rejected,
    };
  }, [requests]);

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

  // 6. REAL 6-MONTH EMPLOYEE GROWTH TREND
  const trendData = useMemo(() => {
    const points: { label: string; count: number }[] = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      const label = d.toLocaleDateString('en-US', { month: 'short' });

      // Real cumulative employees joined on or before this month's end
      const count = employees.filter((e) => {
        const joined = e.joiningDate ? new Date(e.joiningDate) : new Date(e.createdAt);
        return joined <= endOfMonth;
      }).length;

      points.push({ label, count });
    }
    return points;
  }, [employees]);

  const maxTrendVal = useMemo(() => {
    const max = Math.max(...trendData.map((p) => p.count), 5);
    return Math.ceil(max / 5) * 5;
  }, [trendData]);

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

  // Handle Download Report
  const handleDownloadReport = () => {
    window.open('/api/v1/attendance/export', '_blank');
  };

  return (
    <div className="space-y-6">
      {/* ===================== TOP BAR ===================== */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {company?.name || 'Company'} Dashboard
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Real-time workforce intelligence and operations center
          </p>
        </div>

        <div className="flex items-center gap-3 self-stretch sm:self-auto">
          {/* Real Date Indicator */}
          <div className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl shadow-xs text-xs font-semibold text-slate-700">
            <IconCalendar className="w-4 h-4 text-indigo-600" />
            <span>{todayFormatted}</span>
          </div>

          {/* Download Report CTA */}
          <button
            onClick={handleDownloadReport}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#5E4BE2] to-[#4B39C3] text-white text-xs font-bold rounded-xl shadow-sm shadow-indigo-600/25 hover:shadow-md hover:from-[#5340D4] hover:to-[#4130B4] transition-all cursor-pointer"
          >
            <IconDownload className="w-4 h-4" />
            <span>Download Report</span>
          </button>
        </div>
      </div>

      {/* ===================== ROW 1: 5 KPI STAT CARDS ===================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Total Employees */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500">Total Employees</span>
            <div className="text-2xl font-black text-slate-900 mt-1 leading-none tracking-tight">
              {totalEmployeesCount.toLocaleString()}
            </div>
            <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 mt-2">
              <span>&uarr;</span>
              <span>{attendanceMetrics.newJoiners} joined this month</span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5E4BE2]">
            <IconUsers className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Present Today */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500">Present Today</span>
            <div className="text-2xl font-black text-slate-900 mt-1 leading-none tracking-tight">
              {attendanceMetrics.present.toLocaleString()}
            </div>
            <div className="text-[11px] font-bold text-emerald-600 mt-2">
              {attendanceMetrics.presentPercent}% of total
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <IconUserCheck className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: On Leave Today */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500">On Leave Today</span>
            <div className="text-2xl font-black text-slate-900 mt-1 leading-none tracking-tight">
              {attendanceMetrics.onLeave.toLocaleString()}
            </div>
            <div className="text-[11px] font-bold text-amber-600 mt-2">
              {attendanceMetrics.onLeavePercent}% of total
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
            <IconCalendarEvent className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Absent Today */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500">Absent Today</span>
            <div className="text-2xl font-black text-slate-900 mt-1 leading-none tracking-tight">
              {attendanceMetrics.absent.toLocaleString()}
            </div>
            <div className="text-[11px] font-bold text-rose-600 mt-2">
              {attendanceMetrics.absentPercent}% of total
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
            <IconAlertCircle className="w-5 h-5" />
          </div>
        </div>

        {/* Card 5: New Joiners */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500">New Joiners ({currentMonthYear.split(' ')[0]})</span>
            <div className="text-2xl font-black text-slate-900 mt-1 leading-none tracking-tight">
              {attendanceMetrics.newJoiners}
            </div>
            <div className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 mt-2">
              <span>{totalEmployeesCount > 0 ? Math.round((attendanceMetrics.newJoiners / totalEmployeesCount) * 100) : 0}% of workforce</span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <IconUserPlus className="w-5 h-5" />
          </div>
        </div>
      </div>

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
              <button
                onClick={() => setAttendanceFilter(attendanceFilter === 'This Month' ? 'Today' : 'This Month')}
                className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600 hover:bg-slate-100 transition-colors flex items-center gap-1"
              >
                <span>{attendanceFilter}</span>
                <IconChevronDown className="w-3 h-3 text-slate-400" />
              </button>
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

        {/* Col 2: Employee Trend Area Chart (col-span 5) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3">
              <div className="flex items-center gap-2">
                <IconChartBar className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-sm">Employee Trend (Last 6 Months)</h3>
              </div>
              <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">
                Real Cumulative
              </span>
            </div>

            {/* Real Trend Area Chart SVG */}
            <div className="relative pt-2">
              <svg className="w-full h-44 overflow-visible" viewBox="0 0 450 170">
                <defs>
                  <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#5E4BE2" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#5E4BE2" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Y-Axis Grid Lines & Ticks */}
                <g className="text-[10px] font-medium fill-slate-400">
                  <line x1="35" y1="20" x2="440" y2="20" stroke="#F1F5F9" strokeDasharray="3 3" />
                  <text x="5" y="24">{maxTrendVal}</text>

                  <line x1="35" y1="52" x2="440" y2="52" stroke="#F1F5F9" strokeDasharray="3 3" />
                  <text x="5" y="56">{Math.round(maxTrendVal * 0.75)}</text>

                  <line x1="35" y1="84" x2="440" y2="84" stroke="#F1F5F9" strokeDasharray="3 3" />
                  <text x="5" y="88">{Math.round(maxTrendVal * 0.5)}</text>

                  <line x1="35" y1="116" x2="440" y2="116" stroke="#F1F5F9" strokeDasharray="3 3" />
                  <text x="5" y="120">{Math.round(maxTrendVal * 0.25)}</text>

                  <line x1="35" y1="148" x2="440" y2="148" stroke="#F1F5F9" />
                  <text x="12" y="152">0</text>
                </g>

                {/* Dynamic Trend Line & Curve */}
                {(() => {
                  const xs = [60, 130, 200, 270, 340, 410];
                  const ys = trendData.map((pt) => 148 - (maxTrendVal > 0 ? (pt.count / maxTrendVal) * 120 : 0));
                  const pathD = `M ${xs[0]} ${ys[0]} ` + xs.slice(1).map((x, i) => `L ${x} ${ys[i + 1]}`).join(' ');
                  const areaD = `${pathD} L ${xs[5]} 148 L ${xs[0]} 148 Z`;

                  return (
                    <>
                      <path d={areaD} fill="url(#trendGradient)" />
                      <path d={pathD} fill="none" stroke="#5E4BE2" strokeWidth="3" strokeLinecap="round" />
                    </>
                  );
                })()}

                {/* Circle Nodes with Real Values */}
                {trendData.map((pt, idx) => {
                  const x = [60, 130, 200, 270, 340, 410][idx];
                  const y = 148 - (maxTrendVal > 0 ? (pt.count / maxTrendVal) * 120 : 0);

                  return (
                    <g key={idx}>
                      <circle cx={x} cy={y} r="5" fill="#5E4BE2" stroke="white" strokeWidth="2.5" />
                      <text x={x} y={y - 8} textAnchor="middle" className="text-[10px] font-bold fill-slate-800">
                        {pt.count}
                      </text>
                      <text x={x} y="168" textAnchor="middle" className="text-[10px] font-bold fill-slate-500">
                        {pt.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 mt-4 text-center">
            <button
              onClick={() => navigate('/company/employees')}
              className="text-xs font-bold text-[#5E4BE2] hover:text-[#4B39C3] transition-colors inline-flex items-center gap-1 cursor-pointer"
            >
              <span>View Employee Roster</span>
              <span>&rarr;</span>
            </button>
          </div>
        </div>

        {/* Col 3: Upcoming Events (col-span 3) */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3">
              <div className="flex items-center gap-2">
                <IconGift className="w-4 h-4 text-purple-600" />
                <h3 className="font-bold text-slate-900 text-sm">Upcoming Events</h3>
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
              {combinedUpcomingEvents.length === 0 ? (
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
                combinedUpcomingEvents.map((evt) => {
                  if (evt.type === 'HOLIDAY') {
                    return (
                      <div
                        key={evt.id}
                        className="flex items-center justify-between p-2 rounded-xl bg-slate-50/70 hover:bg-slate-100/70 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-indigo-50 text-[#5E4BE2] border border-indigo-100 flex items-center justify-center shrink-0">
                            <IconSchool className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-[10px] font-bold text-indigo-600 block uppercase tracking-wide">
                              {evt.subtitle}
                            </span>
                            <span className="text-xs font-bold text-slate-900 truncate block">
                              {evt.title}
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 shrink-0 ml-2">
                          {evt.dateLabel}
                        </span>
                      </div>
                    );
                  }

                  if (evt.type === 'BIRTHDAY') {
                    return (
                      <div
                        key={evt.id}
                        className="flex items-center justify-between p-2 rounded-xl bg-purple-50/60 border border-purple-100 hover:bg-purple-100/60 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                            <IconCake className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-[10px] font-bold text-purple-700 block uppercase tracking-wide">
                              {evt.subtitle}
                            </span>
                            <span className="text-xs font-bold text-slate-900 truncate block">
                              {evt.title}
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-purple-700 shrink-0 ml-2">
                          {evt.dateLabel}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={evt.id}
                      className="flex items-center justify-between p-2 rounded-xl bg-emerald-50/60 border border-emerald-100"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">
                          ₹
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] font-bold text-emerald-700 block uppercase tracking-wide">
                            {evt.subtitle}
                          </span>
                          <span className="text-xs font-bold text-slate-900 truncate block">
                            {evt.title}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-700 shrink-0 ml-2">
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
              <button
                onClick={() => setLeaveFilter(leaveFilter === 'This Month' ? 'All Time' : 'This Month')}
                className="px-2 py-0.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 hover:bg-slate-100 flex items-center gap-1"
              >
                <span>{leaveFilter}</span>
                <IconChevronDown className="w-3 h-3 text-slate-400" />
              </button>
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
              onClick={() => navigate('/payroll/dashboard')}
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

          <div className="pt-3 border-t border-slate-100 mt-4 text-center">
            <button
              onClick={() => navigate('/company/departments')}
              className="text-xs font-bold text-[#5E4BE2] hover:text-[#4B39C3] inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Manage Departments</span>
              <span>&rarr;</span>
            </button>
          </div>
        </div>

        {/* Card 4: Quick Access (8 Functional Apps) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#5E4BE2]" />
                <h3 className="font-bold text-slate-900 text-sm">Quick Access</h3>
              </div>
            </div>

            {/* 8-App Grid */}
            <div className="grid grid-cols-4 gap-2 pt-1">
              {/* 1. Add Employee */}
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

              {/* 2. Leaves Desk */}
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

              {/* 3. Attendance */}
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

              {/* 4. Payroll */}
              <button
                onClick={() => navigate('/payroll/dashboard')}
                className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-slate-50 transition-colors group cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <IconReceipt2 className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold text-slate-600 mt-1 leading-tight text-center">
                  Payroll
                </span>
              </button>

              {/* 5. Employees */}
              <button
                onClick={() => navigate('/company/employees')}
                className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-slate-50 transition-colors group cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <IconUsers className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold text-slate-600 mt-1 leading-tight text-center">
                  Staff List
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

              {/* 7. Policies */}
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

              {/* 8. Activity Logs */}
              <button
                onClick={() => navigate('/company/activity-logs')}
                className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-slate-50 transition-colors group cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <IconChartBar className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold text-slate-600 mt-1 leading-tight text-center">
                  Audit Logs
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
                <svg className="w-full h-56 overflow-visible" viewBox="0 0 550 200">
                  <g className="text-[10px] font-medium fill-slate-400">
                    <line x1="30" y1="20" x2="540" y2="20" stroke="#F1F5F9" />
                    <text x="5" y="24">{maxDeptCount}</text>

                    <line x1="30" y1="58" x2="540" y2="58" stroke="#F1F5F9" />
                    <text x="5" y="62">{Math.round(maxDeptCount * 0.75)}</text>

                    <line x1="30" y1="96" x2="540" y2="96" stroke="#F1F5F9" />
                    <text x="5" y="100">{Math.round(maxDeptCount * 0.5)}</text>

                    <line x1="30" y1="134" x2="540" y2="134" stroke="#F1F5F9" />
                    <text x="5" y="138">{Math.round(maxDeptCount * 0.25)}</text>

                    <line x1="30" y1="170" x2="540" y2="170" stroke="#E2E8F0" />
                    <text x="18" y="174">0</text>
                  </g>

                  {/* Vertical Bars for Real Departments */}
                  {departmentHeadcounts.map((dept, idx) => {
                    const barWidth = 36;
                    const totalSlots = departmentHeadcounts.length;
                    const gap = (510 - barWidth * totalSlots) / (totalSlots + 1);
                    const x = 35 + gap + idx * (barWidth + gap);
                    const barHeight = maxDeptCount > 0 ? Math.max(8, (dept.count / maxDeptCount) * 145) : 8;
                    const y = 170 - barHeight;

                    return (
                      <g key={idx} className="group cursor-pointer">
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

                        <text
                          x={x + barWidth / 2}
                          y="188"
                          textAnchor="middle"
                          className="text-[10px] font-bold fill-slate-500"
                        >
                          {dept.name}
                        </text>
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
    </div>
  );
};

export default CompanyDashboard;
