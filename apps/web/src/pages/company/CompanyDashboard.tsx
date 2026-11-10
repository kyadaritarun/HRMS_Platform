import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { getFileUrl } from '../../api/client';
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
  IconBuilding,
  IconBell,
  IconChecklist,
  IconCake,
  IconMail,
  IconSend,
  IconLoader2,
  IconCheck,
  IconX,
  IconSparkles,
  IconSmartHome,
  IconClock,
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
  employeeNumber?: string;
  isActive?: boolean;
  role?: string;
  profilePhoto?: string | null;
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
    profilePhoto?: string | null;
  };
  leaveType?: {
    id?: number;
    name: string;
    code?: string;
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
  const [attendanceFilter, setAttendanceFilter] = useState<'Today' | 'This Month'>('Today');
  const [payrollBatchData, setPayrollBatchData] = useState<any[]>([]);
  const [leaveActionLoadingId, setLeaveActionLoadingId] = useState<number | null>(null);

  // Automated Email Modal State
  const [isEventEmailsModalOpen, setIsEventEmailsModalOpen] = useState(false);
  const [emailToast, setEmailToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Fetch 100% strictly real live data from backend APIs
  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const [dashRes, empsRes, attRes, reqsRes, deptsRes, holiRes, logsRes, payRes] = await Promise.all([
        api.get('/company/dashboard').catch(() => ({ data: {} })),
        api.get('/employees?status=ALL&pageSize=100').catch(() => ({ data: { items: [] } })),
        api.get('/attendance?pageSize=100').catch(() => ({ data: { items: [] } })),
        api.get('/requests?scope=company&pageSize=100').catch(() => ({ data: { items: [] } })),
        api.get('/company/departments').catch(() => ({ data: { departments: [] } })),
        api.get('/company/holidays').catch(() => ({ data: { holidays: [] } })),
        api.get('/company/activity-logs?pageSize=5').catch(() => ({ data: { items: [] } })),
        api.get('/payroll/dashboard').catch(() => ({ data: { employees: [] } })),
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
      if (payRes.data?.employees) setPayrollBatchData(payRes.data.employees);
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
    return metrics.totalEmployees || employees.filter((e) => e.isActive !== false).length;
  }, [metrics.totalEmployees, employees]);

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

  // Real Payroll Batch Metrics strictly derived from live backend data
  const payrollBatchMetrics = useMemo(() => {
    const activeStaff = employees.filter((e) => e.isActive !== false);
    const total = activeStaff.length;

    if (total === 0) {
      return {
        total: 0,
        processed: 0,
        inProgress: 0,
        validated: 0,
        failed: 0,
        notStarted: 0,
        statusLabel: 'Not Started',
      };
    }

    const payMap = new Map<number, any>();
    payrollBatchData.forEach((p) => {
      if (p.employee?.id) {
        payMap.set(p.employee.id, p);
      }
    });

    // Check attendance for current month
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();
    const attendedUserIds = new Set<number>();
    attendance.forEach((a) => {
      const d = a.checkIn ? new Date(a.checkIn) : a.date ? new Date(a.date) : null;
      if (d && d.getFullYear() === curYear && d.getMonth() === curMonth) {
        attendedUserIds.add(a.userId);
      }
    });

    let processed = 0;
    let inProgress = 0;
    let validated = 0;
    let failed = 0;
    let notStarted = 0;

    activeStaff.forEach((emp) => {
      const p = payMap.get(emp.id);
      const isPublished = p?.status === 'PUBLISHED';
      const hasSalary = Number(emp.monthlySalary) > 0 || (p?.calculation?.grossSalary && p.calculation.grossSalary > 0);
      const bank = (emp as any).bankDetails || {};
      const hasBank = Boolean(bank.accountNumber || (p?.calculation?.accountNumber && p.calculation.accountNumber !== ''));
      const hasAttended = attendedUserIds.has(emp.id);

      if (isPublished) {
        processed++;
      } else if (!hasSalary || !hasBank) {
        failed++;
      } else if (hasAttended && hasSalary && hasBank) {
        validated++;
      } else if (hasAttended) {
        inProgress++;
      } else {
        notStarted++;
      }
    });

    let statusLabel = 'Processing';
    if (processed === total && total > 0) {
      statusLabel = 'Completed';
    } else if (processed > 0) {
      statusLabel = 'Processing';
    } else if (validated > 0 || inProgress > 0) {
      statusLabel = 'In Progress';
    } else {
      statusLabel = 'Draft';
    }

    return {
      total,
      processed,
      inProgress,
      validated,
      failed,
      notStarted,
      statusLabel,
    };
  }, [employees, payrollBatchData, attendance]);

  // Multi-segment SVG Donut for Payroll Batch Status
  const payrollDonutSegments = useMemo(() => {
    const { total, processed, inProgress, validated, failed, notStarted } = payrollBatchMetrics;
    const r = 52;
    const c = 2 * Math.PI * r;

    if (total === 0) {
      return {
        c,
        processed: { strokeDasharray: `0 ${c}`, strokeDashoffset: 0 },
        inProgress: { strokeDasharray: `0 ${c}`, strokeDashoffset: 0 },
        validated: { strokeDasharray: `0 ${c}`, strokeDashoffset: 0 },
        failed: { strokeDasharray: `0 ${c}`, strokeDashoffset: 0 },
        notStarted: { strokeDasharray: `0 ${c}`, strokeDashoffset: 0 },
      };
    }

    const pLen = (processed / total) * c;
    const ipLen = (inProgress / total) * c;
    const vLen = (validated / total) * c;
    const fLen = (failed / total) * c;
    const nsLen = Math.max(0, c - pLen - ipLen - vLen - fLen);

    return {
      c,
      processed: { strokeDasharray: `${pLen} ${c}`, strokeDashoffset: 0 },
      inProgress: { strokeDasharray: `${ipLen} ${c}`, strokeDashoffset: -pLen },
      validated: { strokeDasharray: `${vLen} ${c}`, strokeDashoffset: -(pLen + ipLen) },
      failed: { strokeDasharray: `${fLen} ${c}`, strokeDashoffset: -(pLen + ipLen + vLen) },
      notStarted: { strokeDasharray: `${nsLen} ${c}`, strokeDashoffset: -(pLen + ipLen + vLen + fLen) },
    };
  }, [payrollBatchMetrics]);

  // Next Pay Date (Last day of current month)
  const nextPayDate = useMemo(() => {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return lastDay.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }, []);

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

  // 4. REAL LEAVE APPROVAL QUEUE & HELPERS
  const parseDateParts = (dStr?: string) => {
    if (!dStr) return null;
    const clean = dStr.split('T')[0];
    const parts = clean.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      return new Date(y, m, d);
    }
    return new Date(dStr);
  };

  const calculateLeaveDays = (start?: string, end?: string) => {
    if (!start) return 1;
    const s = parseDateParts(start);
    const e = parseDateParts(end) || s;
    if (!s || !e) return 1;
    const diffTime = Math.abs(e.getTime() - s.getTime());
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return isNaN(diffDays) || diffDays < 1 ? 1 : diffDays;
  };

  const formatLeaveRange = (start?: string, end?: string) => {
    if (!start) return 'Dates pending';
    const s = parseDateParts(start);
    const e = parseDateParts(end) || s;
    if (!s || !e) return 'Dates pending';
    const sMonth = s.toLocaleDateString('en-US', { month: 'short' });
    const eMonth = e.toLocaleDateString('en-US', { month: 'short' });
    const year = e.toLocaleDateString('en-US', { year: 'numeric' });

    if (s.toDateString() === e.toDateString()) {
      return `${s.getDate()} ${sMonth} ${year}`;
    }
    if (sMonth === eMonth && s.getFullYear() === e.getFullYear()) {
      return `${s.getDate()}–${e.getDate()} ${sMonth} ${year}`;
    }
    return `${s.getDate()} ${sMonth} – ${e.getDate()} ${eMonth} ${year}`;
  };

  const formatRelativeTime = (dateStr?: string) => {
    if (!dateStr) return '';
    const now = new Date();
    const past = new Date(dateStr);
    const diffMs = Math.max(0, now.getTime() - past.getTime());
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMin > 0) return `${diffMin}m ago`;
    return 'just now';
  };

  const pendingLeaveQueue = useMemo(() => {
    return requests
      .filter((r) => r.type === 'LEAVE' && r.status === 'PENDING')
      .slice(0, 4);
  }, [requests]);

  const handleLeaveDecision = async (id: number, decision: 'APPROVED' | 'REJECTED') => {
    setLeaveActionLoadingId(id);
    try {
      await api.patch(`/requests/${id}/decision`, { status: decision, note: '' });
      setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: decision } : r)));
      await fetchDashboardData();
    } catch (err: any) {
      console.error('Failed to update leave request:', err);
      alert(err.response?.data?.message || 'Failed to update leave request');
      await fetchDashboardData();
    } finally {
      setLeaveActionLoadingId(null);
    }
  };

  // 5. WORK ANNIVERSARIES & MILESTONES (1 Year, 3 Years, 5 Years, 10+ Years)
  // Strictly only employees who have completed at least 1 full year of tenure
  const workAnniversaries = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return employees
      .map((emp) => {
        const joinStr = emp.joiningDate || emp.createdAt;
        const parsed = parseDateParts(joinStr);
        const joinDate = parsed || today;

        const joinYear = joinDate.getFullYear();
        const joinMonth = joinDate.getMonth();
        const joinDay = joinDate.getDate();

        // Calculate completed tenure in full years
        let tenureYears = today.getFullYear() - joinYear;
        const mDiff = today.getMonth() - joinMonth;
        if (mDiff < 0 || (mDiff === 0 && today.getDate() < joinDay)) {
          tenureYears--;
        }
        tenureYears = Math.max(0, tenureYears);

        // Next anniversary calculation
        let nextAnniv = new Date(today.getFullYear(), joinMonth, joinDay);
        if (nextAnniv < today) {
          nextAnniv = new Date(today.getFullYear() + 1, joinMonth, joinDay);
        }
        const diffDays = Math.ceil((nextAnniv.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        let milestoneKey: '1_YEAR' | '3_YEARS' | '5_YEARS' | '10_PLUS' = '1_YEAR';
        let milestoneLabel = '1 Year Completed';

        if (tenureYears >= 10) {
          milestoneKey = '10_PLUS';
          milestoneLabel = `${tenureYears}+ Years`;
        } else if (tenureYears >= 5) {
          milestoneKey = '5_YEARS';
          milestoneLabel = `${tenureYears} Years`;
        } else if (tenureYears >= 3) {
          milestoneKey = '3_YEARS';
          milestoneLabel = `${tenureYears} Years`;
        } else {
          milestoneKey = '1_YEAR';
          milestoneLabel = `${tenureYears} Year${tenureYears > 1 ? 's' : ''}`;
        }

        const anniversaryDateLabel = nextAnniv.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        });

        return {
          ...emp,
          joinYear,
          joinedYearLabel: String(joinYear),
          tenureYears,
          milestoneKey,
          milestoneLabel,
          diffDays,
          anniversaryDateLabel,
        };
      })
      .filter((emp) => emp.tenureYears >= 1) // Strictly show completed anniversaries only
      .sort((a, b) => a.diffDays - b.diffDays);
  }, [employees]);


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

  // Photo resolver for employee profile images
  const resolvePhotoUrl = (photo?: string | null): string | null => {
    if (!photo) return null;
    if (photo.includes('.amazonaws.com/image/')) {
      const filename = photo.split('.amazonaws.com/image/')[1];
      return getFileUrl(`/image/${filename}`);
    }
    if (photo.includes('.amazonaws.com/uploads/')) {
      const filename = photo.split('.amazonaws.com/uploads/')[1];
      return getFileUrl(`/uploads/${filename}`);
    }
    if (photo.startsWith('/image/') || photo.startsWith('/uploads/')) {
      return getFileUrl(photo);
    }
    if (photo.startsWith('http://') || photo.startsWith('https://')) {
      return photo;
    }
    return getFileUrl(photo);
  };

  // Check which employees have an approved leave covering today
  const onLeaveUserIds = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const set = new Set<number>();
    requests.forEach((req) => {
      if (req.status === 'APPROVED' && req.userId && req.startDate && req.endDate) {
        const start = req.startDate.split('T')[0];
        const end = req.endDate.split('T')[0];
        if (today >= start && today <= end) {
          set.add(req.userId);
        }
      }
    });
    return set;
  }, [requests]);

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
            <span>Automated Emails</span>
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
          className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between gap-3 shadow-sm animate-in fade-in duration-200 ${emailToast.type === 'success'
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
            className="text-slate-500 font-medium hover:text-slate-600 cursor-pointer text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* ===================== TOP KPI METRIC CARDS ===================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Departments */}
        <div
          onClick={() => navigate('/company/departments')}
          className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center justify-between group"
        >
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Departments</span>
            <div className="text-2xl font-black text-slate-900 mt-1.5 leading-none tracking-tight">
              {metrics.totalDepartments || departments.length}
            </div>
            <div className="text-[11px] font-semibold text-slate-400 mt-2.5 flex items-center gap-1 group-hover:text-[#5E4BE2] transition-colors">
              <span>View departments</span>
              <span>&rarr;</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5E4BE2] group-hover:scale-105 transition-transform">
            <IconBuilding className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Company Policies */}
        <div
          onClick={() => navigate('/company/policies/manage')}
          className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center justify-between group"
        >
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Company Policies</span>
            <div className="text-2xl font-black text-slate-900 mt-1.5 leading-none tracking-tight">
              {metrics.totalPolicies}
            </div>
            <div className="text-[11px] font-semibold text-slate-400 mt-2.5 flex items-center gap-1 group-hover:text-blue-600 transition-colors">
              <span>View policies</span>
              <span>&rarr;</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 group-hover:scale-105 transition-transform">
            <IconFileDescription className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Pending Approvals */}
        <div
          onClick={() => navigate('/attendance/regularizations/manage')}
          className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center justify-between group"
        >
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Approvals</span>
            <div className="text-2xl font-black text-amber-600 mt-1.5 leading-none tracking-tight">
              {pendingApprovalsTotal}
            </div>
            <div className="text-[11px] font-semibold text-slate-400 mt-2.5 flex items-center gap-1 group-hover:text-amber-600 transition-colors">
              <span>Review pending</span>
              <span>&rarr;</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 group-hover:scale-105 transition-transform">
            <IconClock className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Total Staff Enrolled */}
        <div
          onClick={() => {
            const el = document.getElementById('employee-directory');
            if (el) {
              el.scrollIntoView({ behavior: 'smooth' });
            } else {
              navigate('/company/employees');
            }
          }}
          className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center justify-between group"
        >
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Staff Enrolled</span>
            <div className="text-2xl font-black text-slate-900 mt-1.5 leading-none tracking-tight">
              {totalEmployeesCount}
            </div>
            <div className="text-[11px] font-semibold text-slate-400 mt-2.5 flex items-center gap-1 group-hover:text-emerald-600 transition-colors">
              <span>View directory</span>
              <span>&darr;</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 group-hover:scale-105 transition-transform">
            <IconUsers className="w-6 h-6" />
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
              <div className="relative">
                <select
                  value={attendanceFilter}
                  onChange={(e) => setAttendanceFilter(e.target.value as 'Today' | 'This Month')}
                  className="px-3 py-1.5 pr-7 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer appearance-none outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="Today">Today</option>
                  <option value="This Month">This Month</option>
                </select>
                <IconChevronDown className="w-3 h-3 text-slate-500 font-medium absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
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
                  <span className="text-[10px] font-bold text-slate-500 mt-0.5 uppercase tracking-wide">
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
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-pink-50 text-pink-700 border border-pink-200/60" title="Birthday greeting emails are automatically sent by server">
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
                    className={`flex items-center justify-between p-2.5 rounded-xl transition-colors ${b.diffDays === 0
                      ? 'bg-pink-50/70 border border-pink-200/80 hover:bg-pink-100/70'
                      : 'bg-slate-50/70 hover:bg-slate-100/70'
                      }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${b.diffDays === 0
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
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-[#5E4BE2] border border-indigo-200/60" title="Holiday announcement emails are automatically sent by server once configured">
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

      {/* ===================== ROW 3: LEAVE + PAYROLL + QUICK ACCESS ===================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Card 1: Leave Approval Queue (Strictly Real Data) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-3">
              <h3 className="font-extrabold text-slate-900 text-sm">Leave Approval Queue</h3>
              <button
                onClick={() => navigate('/company/leaves/manage')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
              >
                View all
              </button>
            </div>

            {/* List */}
            {pendingLeaveQueue.length === 0 ? (
              <div className="py-12 text-center flex flex-col items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
                  <IconCheck className="w-5 h-5 stroke-[2.5]" />
                </div>
                <p className="text-xs font-bold text-slate-700">No Pending Requests</p>
                <p className="text-[11px] text-slate-400 mt-0.5">All leave applications have been reviewed</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {pendingLeaveQueue.map((req) => {
                  const days = calculateLeaveDays(req.startDate, req.endDate);
                  const dateRange = formatLeaveRange(req.startDate, req.endDate);
                  const timeAgo = formatRelativeTime(req.createdAt);
                  const leaveName = req.leaveType?.name || 'Leave';
                  const empName = req.user ? `${req.user.firstName} ${req.user.lastName}`.trim() : 'Employee';
                  const initials = req.user
                    ? `${req.user.firstName?.[0] || ''}${req.user.lastName?.[0] || ''}`.toUpperCase()
                    : 'LE';
                  const photoUrl = resolvePhotoUrl(req.user?.profilePhoto);

                  return (
                    <div key={req.id} className="py-3 first:pt-1 last:pb-1 flex items-center justify-between gap-3">
                      {/* Left: Avatar + Details */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {photoUrl ? (
                          <img
                            src={photoUrl}
                            alt={empName}
                            className="w-10 h-10 rounded-full object-cover shrink-0 border border-slate-200"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                            {initials}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-bold text-slate-900 truncate" title={`${empName} - ${leaveName}`}>
                            {leaveName}
                          </h4>
                          <p className="text-[11px] text-slate-600 font-medium truncate">
                            {days} {days === 1 ? 'Day' : 'Days'}{empName !== 'Employee' ? ` • ${empName}` : ''}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {dateRange}
                          </p>
                        </div>
                      </div>

                      {/* Middle: Pending status + relative time */}
                      <div className="text-right shrink-0 px-1">
                        <span className="text-xs font-bold text-amber-500 block leading-tight">Pending</span>
                        <span className="text-[10px] text-slate-400 font-medium block mt-0.5">{timeAgo}</span>
                      </div>

                      {/* Right: Actions (Approve / Reject) */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleLeaveDecision(req.id, 'APPROVED')}
                          disabled={leaveActionLoadingId === req.id}
                          title="Approve Leave"
                          className="w-8 h-8 rounded-full border border-emerald-300 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-400 flex items-center justify-center transition-all hover:scale-105 disabled:opacity-50 cursor-pointer"
                        >
                          {leaveActionLoadingId === req.id ? (
                            <IconLoader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <IconCheck className="w-4 h-4 stroke-[2.5]" />
                          )}
                        </button>
                        <button
                          onClick={() => handleLeaveDecision(req.id, 'REJECTED')}
                          disabled={leaveActionLoadingId === req.id}
                          title="Reject Leave"
                          className="w-8 h-8 rounded-full border border-rose-300 text-rose-500 hover:bg-rose-50 hover:border-rose-400 flex items-center justify-center transition-all hover:scale-105 disabled:opacity-50 cursor-pointer"
                        >
                          <IconX className="w-4 h-4 stroke-[2.5]" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Payroll Batch Status (Strictly Real Data) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Payroll Batch Status</h3>
              <button
                onClick={() => navigate('/payroll/attendance-salary')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
              >
                View all
              </button>
            </div>

            {/* Donut Chart & Legend */}
            <div className="flex items-center justify-between gap-4 pt-1">
              {/* SVG Donut */}
              <div className="relative w-32 h-32 sm:w-36 sm:h-36 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 140 140">
                  <circle cx="70" cy="70" r="52" fill="none" stroke="#F1F5F9" strokeWidth="15" />
                  {/* 1. Processed (Green) */}
                  <circle
                    cx="70"
                    cy="70"
                    r="52"
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="15"
                    strokeDasharray={payrollDonutSegments.processed.strokeDasharray}
                    strokeDashoffset={payrollDonutSegments.processed.strokeDashoffset}
                    className="transition-all duration-500"
                  />
                  {/* 2. In Progress (Blue) */}
                  <circle
                    cx="70"
                    cy="70"
                    r="52"
                    fill="none"
                    stroke="#3B82F6"
                    strokeWidth="15"
                    strokeDasharray={payrollDonutSegments.inProgress.strokeDasharray}
                    strokeDashoffset={payrollDonutSegments.inProgress.strokeDashoffset}
                    className="transition-all duration-500"
                  />
                  {/* 3. Validated (Purple) */}
                  <circle
                    cx="70"
                    cy="70"
                    r="52"
                    fill="none"
                    stroke="#8B5CF6"
                    strokeWidth="15"
                    strokeDasharray={payrollDonutSegments.validated.strokeDasharray}
                    strokeDashoffset={payrollDonutSegments.validated.strokeDashoffset}
                    className="transition-all duration-500"
                  />
                  {/* 4. Failed (Red) */}
                  <circle
                    cx="70"
                    cy="70"
                    r="52"
                    fill="none"
                    stroke="#EF4444"
                    strokeWidth="15"
                    strokeDasharray={payrollDonutSegments.failed.strokeDasharray}
                    strokeDashoffset={payrollDonutSegments.failed.strokeDashoffset}
                    className="transition-all duration-500"
                  />
                  {/* 5. Not Started (Slate) */}
                  <circle
                    cx="70"
                    cy="70"
                    r="52"
                    fill="none"
                    stroke="#94A3B8"
                    strokeWidth="15"
                    strokeDasharray={payrollDonutSegments.notStarted.strokeDasharray}
                    strokeDashoffset={payrollDonutSegments.notStarted.strokeDashoffset}
                    className="transition-all duration-500"
                  />
                </svg>

                {/* Donut Center Info */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                  <span className="text-xs sm:text-sm font-black text-slate-900 leading-tight">
                    {currentMonthYear}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-500 mt-0.5">
                    {payrollBatchMetrics.statusLabel}
                  </span>
                </div>
              </div>

              {/* Status Legend on the Right */}
              <div className="space-y-1.5 text-xs flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] shrink-0" />
                    <span className="text-[11px] font-medium text-slate-600 truncate">Processed</span>
                  </div>
                  <span className="font-bold text-slate-900 text-xs ml-2">
                    {payrollBatchMetrics.processed}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6] shrink-0" />
                    <span className="text-[11px] font-medium text-slate-600 truncate">In Progress</span>
                  </div>
                  <span className="font-bold text-slate-900 text-xs ml-2">
                    {payrollBatchMetrics.inProgress}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#8B5CF6] shrink-0" />
                    <span className="text-[11px] font-medium text-slate-600 truncate">Validated</span>
                  </div>
                  <span className="font-bold text-slate-900 text-xs ml-2">
                    {payrollBatchMetrics.validated}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444] shrink-0" />
                    <span className="text-[11px] font-medium text-slate-600 truncate">Failed</span>
                  </div>
                  <span className="font-bold text-slate-900 text-xs ml-2">
                    {payrollBatchMetrics.failed}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#94A3B8] shrink-0" />
                    <span className="text-[11px] font-medium text-slate-600 truncate">Not Started</span>
                  </div>
                  <span className="font-bold text-slate-900 text-xs ml-2">
                    {payrollBatchMetrics.notStarted}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Box: Next Pay Date & Employees in Batch */}
          <div className="mt-4 p-3 bg-slate-50/80 rounded-xl border border-slate-100 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-[#5E4BE2] flex items-center justify-center shrink-0">
                <IconCalendar className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Next Pay Date
                </span>
                <span className="font-bold text-slate-800 text-xs truncate block">
                  {nextPayDate}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 min-w-0 pl-3 border-l border-slate-200">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-[#5E4BE2] flex items-center justify-center shrink-0">
                <IconUsers className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Employees in Batch
                </span>
                <span className="font-bold text-slate-800 text-xs block">
                  {payrollBatchMetrics.total.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Quick Access (6 Functional Apps) */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
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

              {/* 7. Payroll */}
              <button
                onClick={() => navigate('/payroll/attendance-salary')}
                className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-slate-50 transition-colors group cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <IconReceipt2 className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold text-slate-600 mt-1 leading-tight text-center">
                  Payroll
                </span>
              </button>

              {/* 8. Holidays */}
              <button
                onClick={() => navigate('/company/holidays')}
                className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-slate-50 transition-colors group cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <IconCalendar className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold text-slate-600 mt-1 leading-tight text-center">
                  Holidays
                </span>
              </button>

              {/* 9. Departments */}
              <button
                onClick={() => navigate('/company/departments')}
                className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-slate-50 transition-colors group cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <IconBuilding className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold text-slate-600 mt-1 leading-tight text-center">
                  Departments
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ===================== ROW 4: EMPLOYEE DIRECTORY + RECENT ACTIVITIES ===================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Col 1: Employee Directory (Top) (col-span 7) */}
        <div id="employee-directory" className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3">
              <div className="flex items-center gap-2">
                <IconUsers className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-sm">Employee Directory (Top)</h3>
              </div>
              <button
                onClick={() => navigate('/company/employees')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
              >
                View all
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#e5e7eb] text-xs font-bold text-slate-900 border-b border-slate-300">
                  <tr>
                    <th className="py-3 px-3.5 whitespace-nowrap">Employee ID</th>
                    <th className="py-3 px-3.5 whitespace-nowrap">Department</th>
                    <th className="py-3 px-3.5 whitespace-nowrap">Designation</th>
                    <th className="py-3 px-3.5 text-right whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-xs">
                  {employees.slice(0, 5).map((emp) => {
                    const empId = emp.employeeNumber || `EMP-${String(emp.id).padStart(4, '0')}`;
                    const deptName = emp.department?.name || 'General';
                    const designation = emp.jobTitle || 'Staff';
                    const photoUrl = resolvePhotoUrl(emp.profilePhoto);
                    const initials = `${emp.firstName?.[0] || ''}${emp.lastName?.[0] || ''}`.toUpperCase() || 'U';

                    const isOnLeave = onLeaveUserIds.has(emp.id);
                    const isInactive = emp.isActive === false;

                    return (
                      <tr
                        key={emp.id}
                        onClick={() => navigate('/company/employees')}
                        className="hover:bg-slate-50 transition-colors cursor-pointer group"
                      >
                        {/* Avatar + Employee ID */}
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            {photoUrl ? (
                              <img
                                src={photoUrl}
                                alt={emp.firstName}
                                className="w-6 h-6 rounded-full object-cover border border-slate-200 shrink-0"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-indigo-50 border border-indigo-100 text-[#5E4BE2] font-black text-[9px] flex items-center justify-center shrink-0">
                                {initials}
                              </div>
                            )}
                            <span className="font-bold text-slate-800 text-xs group-hover:text-[#5E4BE2] transition-colors">
                              {empId}
                            </span>
                          </div>
                        </td>

                        {/* Department */}
                        <td className="py-3 px-3.5 text-slate-600 font-medium text-xs whitespace-nowrap">
                          {deptName}
                        </td>

                        {/* Designation */}
                        <td className="py-3 px-3.5 text-slate-600 font-medium text-xs truncate max-w-[180px]">
                          {designation}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3.5 text-right whitespace-nowrap">
                          {isInactive ? (
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                              Inactive
                            </span>
                          ) : isOnLeave ? (
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-200/60">
                              On Leave
                            </span>
                          ) : (
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200/60">
                              Active
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {employees.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-xs text-slate-400">
                        No employees registered yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Col 2: Work Anniversaries (1 Year, 3 Years, 5 Years, 10+ Years) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-3">
              <div className="flex items-center gap-2">
                <IconAward className="w-4 h-4 text-amber-500" />
                <h3 className="font-bold text-slate-900 text-sm">Work Anniversaries</h3>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200/60">
                  Milestones
                </span>
              </div>
              <button
                onClick={() => navigate('/company/employees')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
              >
                View all
              </button>
            </div>

            {/* Anniversary Employees List (Completed Anniversaries Only) */}
            <div className="space-y-2 pt-1">
              {workAnniversaries.length === 0 ? (
                <div className="py-8 text-center rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-xs font-semibold text-slate-600">
                    No completed work anniversaries yet
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Staff who have completed 1+ years of service will appear here
                  </p>
                </div>
              ) : (
                workAnniversaries.slice(0, 5).map((item) => {
                  const photoUrl = resolvePhotoUrl(item.profilePhoto);
                  const initials = `${item.firstName?.[0] || ''}${item.lastName?.[0] || ''}`.toUpperCase() || 'U';
                  const isToday = item.diffDays === 0;

                  return (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between p-2.5 rounded-xl transition-colors ${
                        isToday
                          ? 'bg-amber-50/80 border border-amber-200/80 hover:bg-amber-100/70'
                          : 'bg-slate-50/70 hover:bg-slate-100/70'
                      }`}
                    >
                      {/* Avatar + Name + Department */}
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {photoUrl ? (
                          <img
                            src={photoUrl}
                            alt={item.firstName}
                            className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-200"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-700 border border-amber-100 flex items-center justify-center shrink-0 text-xs font-bold">
                            {initials}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-900 truncate block">
                              {item.firstName} {item.lastName}
                            </span>
                            {isToday && (
                              <span className="text-[10px] font-extrabold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded shrink-0">
                                🎉 Today!
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] font-medium text-slate-500 truncate block">
                            {item.jobTitle || item.department?.name || 'Staff'} · Joined {item.joinedYearLabel}
                          </span>
                        </div>
                      </div>

                      {/* Milestone Badge + Date */}
                      <div className="text-right shrink-0 ml-2">
                        <span
                          className={`inline-block text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${
                            item.milestoneKey === '10_PLUS'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : item.milestoneKey === '5_YEARS'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : item.milestoneKey === '3_YEARS'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : item.milestoneKey === '1_YEAR'
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {item.milestoneLabel}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-400 block mt-0.5">
                          {item.anniversaryDateLabel}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 mt-3 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium text-[11px]">
              Completed Anniversaries: <span className="font-bold text-slate-800">{workAnniversaries.length}</span>
            </span>
            <button
              onClick={() => navigate('/company/employees')}
              className="text-xs font-bold text-[#5E4BE2] hover:text-[#4B39C3] inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Employee Directory</span>
              <span>&rarr;</span>
            </button>
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
