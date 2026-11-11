import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import api from '../../api/client';
import TablePagination from '../../components/common/TablePagination';
import { useAuth } from '../../context/AuthContext';
import {
  IconClock,
  IconPlus,
  IconCalendar,
  IconUsers,
  IconCheck,
  IconSettings,
  IconChevronLeft,
  IconChevronRight,
  IconFilter,
  IconMoon,
  IconSun,
  IconSunrise,
  IconBuilding,
  IconArrowLeft,
  IconX,
  IconPencil,
  IconTrash,
  IconLoader2,
  IconSearch,
  IconChevronDown,
} from '@tabler/icons-react';

export interface ShiftTiming {
  id: string;
  name: string;
  code: string;
  startTime: string;
  endTime: string;
  breakDurationMinutes: number;
  gracePeriodMinutes: number;
  color?: string;
  isNightShift?: boolean;
  isWeeklyOff?: boolean;
  workingDays?: string;
}

const STORAGE_KEY = 'uptrix_shift_roster_data';

const toLocalDateKey = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const avatarColorList = [
  'bg-indigo-100 text-indigo-700',
  'bg-purple-100 text-purple-700',
  'bg-blue-100 text-blue-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-teal-100 text-teal-700',
  'bg-cyan-100 text-cyan-700',
];

export const ShiftRosterPage: React.FC = () => {
  const { company } = useAuth();
  const [employees, setEmployees] = useState<any[]>([]);
  const [shifts, setShifts] = useState<ShiftTiming[]>([]);
  const [loadingShifts, setLoadingShifts] = useState(true);
  const [activeTab, setActiveTab] = useState<'ROSTER' | 'SHIFTS_MASTER' | 'WORK_SCHEDULE'>('ROSTER');

  // Company Work Schedule state
  const [companyWorkingDays, setCompanyWorkingDays] = useState<string>('mon,tue,wed,thu,fri');
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [scheduleSuccessMessage, setScheduleSuccessMessage] = useState<string | null>(null);

  // Week navigation
  const [weekOffset, setWeekOffset] = useState(0);

  // Roster assignments map from PostgreSQL: `empId_dateStr` -> shiftCode
  const [rosterMap, setRosterMap] = useState<Record<string, string>>({});

  const fetchRoster = async () => {
    try {
      const res = await api.get('/company/roster');
      setRosterMap(res.data?.rosterMap || {});
    } catch (err) {
      console.error('Failed to load roster:', err);
    }
  };

  const fetchCompanySchedule = async () => {
    try {
      const res = await api.get('/company/settings');
      if (res.data?.company?.workingDays) {
        setCompanyWorkingDays(res.data.company.workingDays);
      }
    } catch (err) {
      console.error('Failed to load company working days:', err);
    }
  };

  // Modal / Drawer: Shift Edit & Create
  const [showShiftDrawer, setShowShiftDrawer] = useState(false);
  const [editingShift, setEditingShift] = useState<ShiftTiming | null>(null);
  const [isSavingShift, setIsSavingShift] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  const [shiftFormData, setShiftFormData] = useState({
    name: '',
    code: '',
    startTime: '09:00',
    endTime: '18:00',
    breakDurationMinutes: 45,
    gracePeriodMinutes: 15,
    color: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    isNightShift: false,
    isWeeklyOff: false,
    workingDays: 'COMPANY_DEFAULT',
  });

  // Modal: Bulk Assign
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkShiftCode, setBulkShiftCode] = useState('');
  const [bulkDepartment, setBulkDepartment] = useState('ALL');

  // Working Days & Weekly Off Visualizer & Modal State
  const [visualizerDate, setVisualizerDate] = useState<Date>(new Date());
  const [showWeeklyOffModal, setShowWeeklyOffModal] = useState(false);
  const [tempSchedule, setTempSchedule] = useState<string>(companyWorkingDays);

  useEffect(() => {
    setTempSchedule(companyWorkingDays);
  }, [companyWorkingDays, showWeeklyOffModal]);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [shiftFilter, setShiftFilter] = useState('ALL');

  // Shift Legend Dropdown state
  const [showLegendDropdown, setShowLegendDropdown] = useState(false);
  const legendDropdownRef = React.useRef<HTMLDivElement>(null);

  // Close shift legend popover on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (legendDropdownRef.current && !legendDropdownRef.current.contains(event.target as Node)) {
        setShowLegendDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Active Roster Cell Dropdown Popover
  const [activeCellMenu, setActiveCellMenu] = useState<{
    empId: number;
    empName: string;
    dateStr: string;
    dateLabel: string;
    anchorRect: { top: number; left: number; width: number; height: number; bottom: number };
  } | null>(null);

  // Close cell menu on Escape, outside scroll, or resize
  useEffect(() => {
    if (!activeCellMenu) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveCellMenu(null);
    };

    const handleScroll = (e: Event) => {
      if ((e.target as HTMLElement)?.closest?.('.shift-popover-card')) return;
      setActiveCellMenu(null);
    };

    const handleResize = () => setActiveCellMenu(null);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [activeCellMenu]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Fetch employees (supports multi-page fetching if staff > 100)
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const res = await api.get('/employees?pageSize=100');
        let allStaff = res.data?.items || [];
        const total = res.data?.total || allStaff.length;
        if (total > 100) {
          const totalPages = Math.ceil(total / 100);
          const promises = [];
          for (let p = 2; p <= totalPages; p++) {
            promises.push(api.get(`/employees?pageSize=100&page=${p}`));
          }
          const extraResponses = await Promise.all(promises);
          extraResponses.forEach((r) => {
            if (r.data?.items) {
              allStaff = [...allStaff, ...r.data.items];
            }
          });
        }
        setEmployees(allStaff);
      } catch (err) {
        console.error('Failed to load employees for roster:', err);
      }
    };
    fetchStaff();
  }, []);

  // Fetch shifts strictly from database without any dummy fallbacks
  useEffect(() => {
    const fetchShifts = async () => {
      try {
        setLoadingShifts(true);
        const res = await api.get('/company/shifts');
        if (res.data?.shifts && Array.isArray(res.data.shifts)) {
          setShifts(res.data.shifts);
          if (res.data.shifts.length > 0) {
            setBulkShiftCode(res.data.shifts[0].code);
          }
        } else {
          setShifts([]);
        }
      } catch (err) {
        console.error('Failed to load shifts from database:', err);
        setShifts([]);
      } finally {
        setLoadingShifts(false);
      }
    };
    fetchShifts();
    fetchRoster();
    fetchCompanySchedule();
  }, []);

  // Compute current week's 7 dates (Mon to Sun)
  const currentWeekDates = React.useMemo(() => {
    const today = new Date();
    const day = today.getDay(); // 0 is Sun, 1 is Mon
    const diffToMon = day === 0 ? -6 : 1 - day;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diffToMon + weekOffset * 7);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push(d);
    }
    return days;
  }, [weekOffset]);

  const handleSetShift = (empId: number, dateStr: string, code: string) => {
    setRosterMap((prev) => ({
      ...prev,
      [`${empId}_${dateStr}`]: code,
    }));
    const matched = shifts.find((s) => s.code === code);
    api.post('/company/roster/bulk-assign', {
      assignments: [
        {
          employeeId: empId,
          date: dateStr,
          shiftTiming: code,
          shiftId: matched?.id || null,
        },
      ],
    })
      .then(() => {
        window.dispatchEvent(new Event('attendance-updated'));
        localStorage.setItem('attendance_sync_ts', Date.now().toString());
      })
      .catch((err) => console.error('Failed to save roster assignment:', err));
  };

  const handleBulkAssign = async () => {
    const updated = { ...rosterMap };
    const offShift = shifts.find((s) => s.startTime === '-' && s.endTime === '-');
    const offCode = offShift ? offShift.code : '';
    const assignmentPayload: any[] = [];

    employees.forEach((emp) => {
      if (bulkDepartment !== 'ALL' && emp.department?.name !== bulkDepartment) return;
      currentWeekDates.forEach((d) => {
        const dateStr = toLocalDateKey(d);
        const isOff = !isDateWorkableInSchedule(d, companyWorkingDays);
        const assignedCode = isOff && offCode ? offCode : bulkShiftCode;
        updated[`${emp.id}_${dateStr}`] = assignedCode;
        const matched = shifts.find((s) => s.code === assignedCode);
        assignmentPayload.push({
          employeeId: emp.id,
          date: dateStr,
          shiftTiming: assignedCode,
          shiftId: matched?.id || null,
        });
      });
    });

    setRosterMap(updated);
    setShowBulkModal(false);

    try {
      await api.post('/company/roster/bulk-assign', { assignments: assignmentPayload });
      window.dispatchEvent(new Event('attendance-updated'));
      localStorage.setItem('attendance_sync_ts', Date.now().toString());
    } catch (err) {
      console.error('Failed to bulk assign roster:', err);
    }
  };

  const handleOpenCreateShift = () => {
    setEditingShift(null);
    setShiftFormData({
      name: '',
      code: '',
      startTime: '09:00',
      endTime: '18:00',
      breakDurationMinutes: 45,
      gracePeriodMinutes: 15,
      color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      isNightShift: false,
      isWeeklyOff: false,
      workingDays: 'COMPANY_DEFAULT',
    });
    setShowShiftDrawer(true);
  };

  const handleOpenEditShift = (shift: ShiftTiming) => {
    const isOff = shift.code === 'WO' || (shift.startTime === '-' && shift.endTime === '-');
    setEditingShift(shift);
    setShiftFormData({
      name: shift.name,
      code: shift.code,
      startTime: isOff ? '00:00' : shift.startTime,
      endTime: isOff ? '00:00' : shift.endTime,
      breakDurationMinutes: shift.breakDurationMinutes,
      gracePeriodMinutes: shift.gracePeriodMinutes,
      color: shift.color || 'bg-indigo-100 text-indigo-800 border-indigo-200',
      isNightShift: Boolean(shift.isNightShift),
      isWeeklyOff: isOff,
      workingDays: shift.workingDays || 'COMPANY_DEFAULT',
    });
    setShowShiftDrawer(true);
  };

  const handleSaveShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingShift(true);

    try {
      const codeClean = shiftFormData.code.trim().toUpperCase().slice(0, 4);
      const isOff = shiftFormData.isWeeklyOff;

      let updatedShifts: ShiftTiming[] = [];

      if (editingShift) {
        updatedShifts = shifts.map((s) => {
          if (s.id === editingShift.id) {
            return {
              ...s,
              name: shiftFormData.name.trim(),
              code: codeClean,
              startTime: isOff ? '-' : shiftFormData.startTime,
              endTime: isOff ? '-' : shiftFormData.endTime,
              breakDurationMinutes: isOff ? 0 : Number(shiftFormData.breakDurationMinutes),
              gracePeriodMinutes: isOff ? 0 : Number(shiftFormData.gracePeriodMinutes),
              color: isOff ? 'bg-slate-100 text-slate-500 border-slate-200' : shiftFormData.color,
              isNightShift: isOff ? false : Boolean(shiftFormData.isNightShift),
              workingDays: shiftFormData.workingDays === 'COMPANY_DEFAULT' ? undefined : shiftFormData.workingDays,
            };
          }
          return s;
        });

        // If shift code changed, update table roster mapping as well
        if (editingShift.code !== codeClean) {
          const oldCode = editingShift.code;
          setRosterMap((prev) => {
            const next = { ...prev };
            Object.keys(next).forEach((key) => {
              if (next[key] === oldCode) next[key] = codeClean;
            });
            return next;
          });
        }
      } else {
        const created: ShiftTiming = {
          id: `s-${Date.now()}`,
          name: shiftFormData.name.trim(),
          code: codeClean,
          startTime: isOff ? '-' : shiftFormData.startTime,
          endTime: isOff ? '-' : shiftFormData.endTime,
          breakDurationMinutes: isOff ? 0 : Number(shiftFormData.breakDurationMinutes),
          gracePeriodMinutes: isOff ? 0 : Number(shiftFormData.gracePeriodMinutes),
          color: isOff ? 'bg-slate-100 text-slate-500 border-slate-200' : shiftFormData.color,
          isNightShift: isOff ? false : Boolean(shiftFormData.isNightShift),
          workingDays: shiftFormData.workingDays === 'COMPANY_DEFAULT' ? undefined : shiftFormData.workingDays,
        };
        updatedShifts = [...shifts, created];
      }

      // Persist directly to database via API
      await api.put('/company/shifts', { shifts: updatedShifts });
      setShifts(updatedShifts);
      setShowShiftDrawer(false);
      setSaveSuccessMessage(
        editingShift
          ? `Shift "${shiftFormData.name}" updated in database!`
          : `New shift "${shiftFormData.name}" created and saved to database!`
      );
      setTimeout(() => setSaveSuccessMessage(null), 3500);
    } catch (err: any) {
      console.error('Failed to save shift to database:', err);
      alert(err.response?.data?.message || 'Failed to save shift to database.');
    } finally {
      setIsSavingShift(false);
    }
  };

  const handleDeleteShift = async (shiftId: string, shiftName: string) => {
    if (!window.confirm(`Are you sure you want to delete shift "${shiftName}"?`)) return;
    try {
      const updatedShifts = shifts.filter((s) => s.id !== shiftId);
      await api.put('/company/shifts', { shifts: updatedShifts });
      setShifts(updatedShifts);
      setSaveSuccessMessage(`Shift "${shiftName}" deleted from database.`);
      setTimeout(() => setSaveSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Failed to delete shift:', err);
      alert(err.response?.data?.message || 'Failed to delete shift.');
    }
  };

  const handleSaveCompanySchedule = async (newSchedule?: string) => {
    const toSave = newSchedule || companyWorkingDays;
    try {
      setIsSavingSchedule(true);
      await api.put('/company/settings', { workingDays: toSave });
      setCompanyWorkingDays(toSave);
      setShowWeeklyOffModal(false);
      setScheduleSuccessMessage('Company Weekly Off schedule updated and saved successfully!');
      setTimeout(() => setScheduleSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('Failed to save company schedule:', err);
      alert(err.response?.data?.message || 'Failed to update schedule.');
    } finally {
      setIsSavingSchedule(false);
    }
  };

  const isDateWorkableInSchedule = (d: Date, scheduleStr: string) => {
    const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const dayName = dayNames[d.getDay()];
    const allowed = (scheduleStr || 'mon,tue,wed,thu,fri').toLowerCase().split(',').map((s) => s.trim());
    if (dayName === 'sat' && allowed.includes('alt_sat')) {
      const nthSat = Math.ceil(d.getDate() / 7);
      return !(nthSat === 2 || nthSat === 4);
    }
    return allowed.includes(dayName);
  };

  const getWeeklyOffSummary = (scheduleStr: string) => {
    const s = (scheduleStr || 'mon,tue,wed,thu,fri').toLowerCase();
    if (s === 'mon,tue,wed,thu,fri,sat') return 'Sunday';
    if (s === 'mon,tue,wed,thu,fri') return 'Saturday & Sunday';
    if (s.includes('alt_sat')) return 'Alternate Saturdays (2nd & 4th) & Sunday';
    const all = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    const names: Record<string, string> = {
      mon: 'Monday',
      tue: 'Tuesday',
      wed: 'Wednesday',
      thu: 'Thursday',
      fri: 'Friday',
      sat: 'Saturday',
      sun: 'Sunday',
    };
    const offs = all.filter((d) => !s.includes(d)).map((d) => names[d]);
    return offs.join(', ') || 'No Weekly Offs';
  };

  const toggleTempWorkingDay = (dayKey: string) => {
    const currentList = tempSchedule.toLowerCase().split(',').map((s) => s.trim()).filter(Boolean);
    let nextList: string[];
    if (dayKey === 'alt_sat') {
      if (currentList.includes('alt_sat')) {
        nextList = currentList.filter((d) => d !== 'alt_sat');
      } else {
        nextList = [...currentList.filter((d) => d !== 'sat'), 'alt_sat'];
      }
    } else {
      if (currentList.includes(dayKey)) {
        nextList = currentList.filter((d) => d !== dayKey && (dayKey !== 'sat' || d !== 'alt_sat'));
      } else {
        nextList = [...currentList.filter((d) => dayKey !== 'sat' || d !== 'alt_sat'), dayKey];
      }
    }
    setTempSchedule(nextList.join(','));
  };

  const monthPreviewDays = useMemo(() => {
    const year = visualizerDate.getFullYear();
    const month = visualizerDate.getMonth();
    const daysCount = new Date(year, month + 1, 0).getDate();
    const list: Array<{ date: Date; dayNum: number; dayName: string; isWorkDay: boolean }> = [];
    for (let day = 1; day <= daysCount; day++) {
      const d = new Date(year, month, day);
      list.push({
        date: d,
        dayNum: day,
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        isWorkDay: isDateWorkableInSchedule(d, companyWorkingDays),
      });
    }
    return list;
  }, [companyWorkingDays, visualizerDate]);

  // Distinct departments
  const departments = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => {
      const dName = e.department?.name || 'General';
      set.add(dName);
    });
    return Array.from(set).sort();
  }, [employees]);

  // Filtered employees based on search & department
  const filteredEmployees = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return employees.filter((emp) => {
      if (q) {
        const fullName = `${emp.firstName || ''} ${emp.lastName || ''}`.toLowerCase();
        const title = (emp.jobTitle || '').toLowerCase();
        const dept = (emp.department?.name || 'General').toLowerCase();
        const empNum = (emp.employeeNumber || '').toLowerCase();
        const email = (emp.email || emp.user?.email || emp.personalEmail || '').toLowerCase();
        const matches =
          fullName.includes(q) ||
          title.includes(q) ||
          dept.includes(q) ||
          empNum.includes(q) ||
          email.includes(q);
        if (!matches) return false;
      }

      if (departmentFilter !== 'ALL') {
        const deptName = emp.department?.name || 'General';
        if (deptName !== departmentFilter) return false;
      }

      if (shiftFilter !== 'ALL') {
        const hasShiftThisWeek = currentWeekDates.some((d) => {
          const dateStr = toLocalDateKey(d);
          const key = `${emp.id}_${dateStr}`;
          return rosterMap[key] === shiftFilter;
        });
        if (!hasShiftThisWeek) return false;
      }

      return true;
    });
  }, [employees, searchQuery, departmentFilter, shiftFilter, currentWeekDates, rosterMap]);

  // Paginated employees for current page
  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedEmployees = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredEmployees.slice(start, start + pageSize);
  }, [filteredEmployees, safeCurrentPage, pageSize]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <IconClock className="w-5 h-5 text-indigo-600 shrink-0" />
            <span>Shift &amp; Schedule Management</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Configure company working days, weekly employee roster planning, and standardized shifts.
          </p>
        </div>

        {activeTab === 'SHIFTS_MASTER' && (
          <button
            onClick={handleOpenCreateShift}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
          >
            <IconPlus className="w-4 h-4" />
            <span>Create Shift</span>
          </button>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('ROSTER')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
            activeTab === 'ROSTER'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <IconClock className="w-4 h-4" />
          <span>Weekly Roster</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('SHIFTS_MASTER')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
            activeTab === 'SHIFTS_MASTER'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <IconSettings className="w-4 h-4" />
          <span>Shifts Master</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('WORK_SCHEDULE')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
            activeTab === 'WORK_SCHEDULE'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <IconCalendar className="w-4 h-4" />
          <span>Working Days &amp; Weekly Offs</span>
        </button>
      </div>

      {(saveSuccessMessage || scheduleSuccessMessage) && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-semibold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <IconCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveSuccessMessage || scheduleSuccessMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setSaveSuccessMessage(null);
              setScheduleSuccessMessage(null);
            }}
            className="text-emerald-600 hover:text-emerald-900 cursor-pointer"
          >
            <IconX className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {activeTab === 'ROSTER' && (
        /* Weekly Interactive Roster View - Matching AssetsOnboardingPage & DepartmentsPage */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
          {/* Controls Bar: Week Navigator on left, Search & Actions on right */}
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
            {/* Left: Week Navigator */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setWeekOffset(weekOffset - 1)}
                className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
                title="Previous week"
              >
                <IconChevronLeft className="w-4 h-4" />
              </button>
              <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 flex items-center gap-2 whitespace-nowrap">
                <IconCalendar className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>
                  {currentWeekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} –{' '}
                  {currentWeekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setWeekOffset(weekOffset + 1)}
                className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
                title="Next week"
              >
                <IconChevronRight className="w-4 h-4" />
              </button>
              {weekOffset !== 0 && (
                <button
                  type="button"
                  onClick={() => setWeekOffset(0)}
                  className="px-2 py-1 text-xs font-semibold text-indigo-600 hover:underline cursor-pointer whitespace-nowrap"
                >
                  This Week
                </button>
              )}
            </div>

            {/* Right Controls: Search, Dept Filter, Legend, Bulk Assign */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Search input */}
              <div className="relative min-w-[180px] sm:w-56">
                <IconSearch className="w-4 h-4 text-slate-500 font-medium absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search employee, dept..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500 text-slate-800 placeholder-slate-400"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setCurrentPage(1);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 font-medium hover:text-slate-600 p-0.5 cursor-pointer"
                    title="Clear search"
                  >
                    <IconX className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Department Filter */}
              <div className="relative">
                <select
                  value={departmentFilter}
                  onChange={(e) => {
                    setDepartmentFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="appearance-none pl-8 pr-7 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500 text-slate-700 cursor-pointer"
                >
                  <option value="ALL">All Departments</option>
                  {departments.map((deptName) => (
                    <option key={deptName} value={deptName}>
                      {deptName}
                    </option>
                  ))}
                </select>
                <IconFilter className="w-3.5 h-3.5 text-slate-500 font-medium absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <IconChevronDown className="w-3.5 h-3.5 text-slate-500 font-medium absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Shift Legend & Filter Dropdown */}
              <div className="relative" ref={legendDropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowLegendDropdown(!showLegendDropdown)}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 border rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                    shiftFilter !== 'ALL'
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-xs'
                      : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                  title="View Shift Legend & Timings"
                >
                  <IconClock className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>
                    {shiftFilter === 'ALL'
                      ? 'Shift Legend'
                      : `Shift: ${shiftFilter}`}
                  </span>
                  <IconChevronDown
                    className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${
                      showLegendDropdown ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {showLegendDropdown && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl border border-slate-200 shadow-xl p-3 z-50 animate-in fade-in zoom-in-95">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <IconClock className="w-4 h-4 text-indigo-600" />
                        <span className="text-xs font-bold text-slate-800">Shift Legend & Timings</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {shifts.length} {shifts.length === 1 ? 'shift' : 'shifts'}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 font-medium mb-2 px-1">
                      Click any shift to filter the roster, or view timing rules:
                    </p>

                    {/* "All Shifts" Option */}
                    <button
                      type="button"
                      onClick={() => {
                        setShiftFilter('ALL');
                        setCurrentPage(1);
                        setShowLegendDropdown(false);
                      }}
                      className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-colors cursor-pointer mb-1 ${
                        shiftFilter === 'ALL' ? 'bg-indigo-50/70 text-indigo-900 font-bold' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-6 rounded-lg bg-slate-100 border border-slate-200 text-[11px] font-bold text-slate-600 flex items-center justify-center">
                          ALL
                        </span>
                        <span className="text-xs font-semibold">Show All Shifts</span>
                      </div>
                      {shiftFilter === 'ALL' && <IconCheck className="w-4 h-4 text-indigo-600" />}
                    </button>

                    {/* Shifts List */}
                    <div className="space-y-1 max-h-60 overflow-y-auto pr-0.5">
                      {shifts.map((s) => {
                        const isSelected = shiftFilter === s.code;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              setShiftFilter(isSelected ? 'ALL' : s.code);
                              setCurrentPage(1);
                              setShowLegendDropdown(false);
                            }}
                            className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-colors cursor-pointer ${
                              isSelected ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className={`px-2.5 py-0.5 rounded-full border text-xs font-bold shrink-0 ${s.color}`}>
                                {s.code}
                              </span>
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-slate-800 truncate">{s.name}</div>
                                <div className="text-[10px] text-slate-500 font-medium">
                                  {s.startTime === '-' && s.endTime === '-' ? 'Weekly Off / Non-working' : `${s.startTime} – ${s.endTime}`}
                                  {s.startTime !== '-' && s.breakDurationMinutes > 0 && ` • ${s.breakDurationMinutes}m break`}
                                </div>
                              </div>
                            </div>
                            {isSelected && <IconCheck className="w-4 h-4 text-indigo-600 shrink-0 ml-2" />}
                          </button>
                        );
                      })}
                    </div>

                    {/* Footer Link to Shift Rules */}
                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] px-1">
                      <span className="text-slate-500 font-medium">Configure hours or rules:</span>
                      <button
                        type="button"
                        onClick={() => {
                          setShowLegendDropdown(false);
                          setActiveTab('SHIFTS_MASTER');
                        }}
                        className="font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                      >
                        Shift Rules →
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {(searchQuery || departmentFilter !== 'ALL' || shiftFilter !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setDepartmentFilter('ALL');
                    setShiftFilter('ALL');
                    setCurrentPage(1);
                  }}
                  className="px-2.5 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer shrink-0"
                >
                  Reset
                </button>
              )}

              {/* Bulk Assign Button */}
              <button
                type="button"
                onClick={() => setShowBulkModal(true)}
                className="px-3.5 py-2 bg-[#5E4BE2] hover:bg-[#4D3BC9] text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer shrink-0"
              >
                Bulk Assign
              </button>
            </div>
          </div>

          {/* Table Structure matching AssetsOnboardingPage & DepartmentsPage */}
          <div className="overflow-x-auto border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-[#e5e7eb] text-xs font-bold text-slate-900 border-b border-slate-300">
                <tr>
                  <th className="px-5 py-3.5 min-w-[220px]">Employee</th>
                  {currentWeekDates.map((d) => {
                    const isToday = d.toDateString() === new Date().toDateString();
                    const isWeeklyOff = !isDateWorkableInSchedule(d, companyWorkingDays);
                    return (
                      <th
                        key={d.toISOString()}
                        className={`px-3 py-3 text-center min-w-[110px] ${
                          isToday ? 'bg-indigo-100/60 text-indigo-950 font-black' : isWeeklyOff ? 'bg-slate-200/50' : ''
                        }`}
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="block text-[10px] uppercase font-bold text-slate-500">
                            {d.toLocaleDateString('en-US', { weekday: 'short' })}
                          </span>
                          {isWeeklyOff && (
                            <span className="px-1 py-0.2 rounded text-[8px] font-bold bg-slate-300 text-slate-700">
                              Off
                            </span>
                          )}
                        </div>
                        <span className="text-sm font-bold text-slate-900">{d.getDate()}</span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-slate-500 font-medium">
                      <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-2">
                        <IconClock className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-800">No employees found</h4>
                      <p className="text-xs text-slate-500 font-medium mt-1">
                        {employees.length === 0
                          ? 'No employees registered yet. Add employees first to plan shifts.'
                          : `No employees match "${searchQuery || departmentFilter}".`}
                      </p>
                    </td>
                  </tr>
                ) : (
                  paginatedEmployees.map((emp, empIdx) => {
                    const initials = `${emp.firstName?.[0] || 'U'}${emp.lastName?.[0] || ''}`.toUpperCase();
                    const avatarBg = avatarColorList[empIdx % avatarColorList.length];

                    return (
                      <tr key={emp.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            {emp.profilePhoto ? (
                              <img
                                src={emp.profilePhoto}
                                alt={`${emp.firstName} ${emp.lastName}`}
                                className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-slate-200"
                              />
                            ) : (
                              <div
                                className={`w-8 h-8 rounded-full ${avatarBg} flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs`}
                              >
                                {initials}
                              </div>
                            )}
                            <div className="min-w-0">
                              <span className="font-bold text-slate-900 block truncate">
                                {emp.firstName} {emp.lastName}
                              </span>
                              <span className="text-[11px] text-slate-500 font-medium block truncate">
                                {emp.department?.name || 'General'} • {emp.jobTitle || 'Team Member'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {currentWeekDates.map((d) => {
                          const dateStr = toLocalDateKey(d);
                          const key = `${emp.id}_${dateStr}`;
                          const currentCode = rosterMap[key] || '';
                          const activeShift = shifts.find((s) => s.code === currentCode);
                          const isOpen = activeCellMenu?.empId === emp.id && activeCellMenu?.dateStr === dateStr;

                          const openMenuForCell = (e: React.MouseEvent<HTMLButtonElement>) => {
                            e.stopPropagation();
                            const rect = e.currentTarget.getBoundingClientRect();
                            if (isOpen) {
                              setActiveCellMenu(null);
                            } else {
                              setActiveCellMenu({
                                empId: emp.id,
                                empName: `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Employee',
                                dateStr,
                                dateLabel: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
                                anchorRect: {
                                  top: rect.top,
                                  left: rect.left,
                                  width: rect.width,
                                  height: rect.height,
                                  bottom: rect.bottom,
                                },
                              });
                            }
                          };

                          const isDayWeeklyOff = !isDateWorkableInSchedule(d, companyWorkingDays);
                          const displayCode = currentCode || (isDayWeeklyOff ? 'WO' : '-');

                          return (
                            <td key={dateStr} className="px-2 py-2.5 text-center">
                              <button
                                type="button"
                                onClick={openMenuForCell}
                                title={
                                  activeShift
                                    ? `${activeShift.code}: ${activeShift.name} (${activeShift.startTime} - ${activeShift.endTime})`
                                    : isDayWeeklyOff
                                    ? 'Scheduled Weekly Off (WO)'
                                    : 'Select shift'
                                }
                                className={`w-full py-1.5 px-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-between gap-1 shadow-2xs cursor-pointer ${
                                  activeShift?.color ||
                                  (currentCode
                                    ? 'bg-slate-100 text-slate-700 border-slate-200'
                                    : isDayWeeklyOff
                                    ? 'bg-slate-100/90 text-slate-500 border-slate-200/90'
                                    : 'bg-slate-50 text-slate-600 border-slate-200/80 hover:bg-slate-100')
                                } ${isOpen ? 'ring-2 ring-indigo-500/40' : ''}`}
                              >
                                <span className="truncate">{displayCode}</span>
                                <IconChevronDown className={`w-3.5 h-3.5 shrink-0 opacity-60 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Component */}
          {filteredEmployees.length > 0 && (
            <TablePagination
              currentPage={safeCurrentPage}
              totalItems={filteredEmployees.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              pageSizeOptions={[10, 25, 50, 100]}
              itemName="employees"
            />
          )}
        </div>
      )}

      {/* Shifts Master View */}
      {activeTab === 'SHIFTS_MASTER' && (
        <div className="space-y-4">
          {loadingShifts ? (
            <div className="p-16 text-center text-slate-500 font-medium flex flex-col items-center justify-center gap-2 bg-white rounded-3xl border border-slate-200">
              <IconLoader2 className="w-6 h-6 animate-spin text-indigo-600" />
              <span className="text-xs font-semibold text-slate-600">Loading shift rules from database...</span>
            </div>
          ) : shifts.length === 0 ? (
            <div className="p-16 text-center text-slate-500 font-medium flex flex-col items-center justify-center gap-3 bg-white rounded-3xl border border-slate-200">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <IconClock className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">No shifts configured in database</h4>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Create your company's standard shifts to get started</p>
              </div>
              <button
                type="button"
                onClick={handleOpenCreateShift}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              >
                <IconPlus className="w-4 h-4" />
                <span>Create Shift</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {shifts.map((s) => (
                <div
                  key={s.id}
                  className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-lg border text-xs font-black ${s.color || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                          {s.code}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900">{s.name}</h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOpenEditShift(s)}
                        className="p-1 rounded-lg text-slate-500 font-medium hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                        title="Edit Shift"
                      >
                        <IconPencil className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="pt-3 space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Timing Window:</span>
                        <span className="font-bold text-slate-900 font-mono">
                          {s.startTime === '-' && s.endTime === '-' ? 'Weekly Off (No punch required)' : `${s.startTime} – ${s.endTime}`}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Work Schedule:</span>
                        <span className="font-semibold text-slate-800">
                          {!s.workingDays || s.workingDays === 'COMPANY_DEFAULT'
                            ? 'Company Default'
                            : s.workingDays === 'mon,tue,wed,thu,fri'
                            ? '5 Days (Mon–Fri)'
                            : s.workingDays === 'mon,tue,wed,thu,fri,sat'
                            ? '6 Days (Mon–Sat)'
                            : s.workingDays === 'mon,tue,wed,thu,fri,alt_sat'
                            ? 'Alt Saturdays'
                            : s.workingDays}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Break Duration:</span>
                        <span className="font-semibold text-slate-700">{s.breakDurationMinutes} mins</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Late Check-in Grace:</span>
                        <span className="font-semibold text-emerald-600">{s.gracePeriodMinutes} mins</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-slate-500 font-medium text-[11px]">
                    <span>Applied automatically to attendance checks</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteShift(s.id, s.name)}
                      className="text-slate-500 font-medium hover:text-rose-600 p-1 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                      title={`Delete ${s.name}`}
                    >
                      <IconTrash className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Company Work Schedule View */}
      {activeTab === 'WORK_SCHEDULE' && (
        <div className="space-y-6">
          {/* Monthly Live Calendar Preview */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <IconCalendar className="w-5 h-5 text-indigo-600" />
                  <span>Current Month Schedule Visualizer</span>
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Active policy: <span className="font-bold text-slate-700">{getWeeklyOffSummary(companyWorkingDays)} Weekly Off</span>. All dates marked as "Weekly Off" will not count as absences or deduct loss of pay.
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* Month Navigator */}
                <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      const prev = new Date(visualizerDate);
                      prev.setMonth(prev.getMonth() - 1);
                      setVisualizerDate(prev);
                    }}
                    className="p-1.5 hover:bg-white rounded-lg text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                    title="Previous Month"
                  >
                    <IconChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setVisualizerDate(new Date())}
                    className="px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-white rounded-lg transition-colors cursor-pointer"
                  >
                    {visualizerDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const next = new Date(visualizerDate);
                      next.setMonth(next.getMonth() + 1);
                      setVisualizerDate(next);
                    }}
                    className="p-1.5 hover:bg-white rounded-lg text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                    title="Next Month"
                  >
                    <IconChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Configure Weekly Offs Button */}
                <button
                  type="button"
                  onClick={() => setShowWeeklyOffModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-98"
                >
                  <IconSettings className="w-4 h-4" />
                  <span>Configure Weekly Offs</span>
                </button>
              </div>
            </div>

            {/* Legend & Stats */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 font-semibold">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-slate-700">Working Day ({monthPreviewDays.filter((d) => d.isWorkDay).length} days)</span>
                </div>
                <div className="flex items-center gap-1.5 font-semibold">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                  <span className="text-slate-700">Weekly Off ({monthPreviewDays.filter((d) => !d.isWorkDay).length} days)</span>
                </div>
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                Showing full month schedule for {visualizerDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
              {monthPreviewDays.map((d) => (
                <div
                  key={d.dayNum}
                  className={`p-3 rounded-2xl border text-center transition-all ${
                    d.isWorkDay
                      ? 'border-emerald-200 bg-emerald-50/50 text-emerald-950 shadow-2xs'
                      : 'border-slate-200 bg-slate-100/70 text-slate-600'
                  }`}
                >
                  <div className="text-xs font-black">{d.dayNum}</div>
                  <div className="text-[10px] font-semibold text-slate-500">{d.dayName}</div>
                  <div className="mt-1.5">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        d.isWorkDay ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {d.isWorkDay ? 'Work' : 'Weekly Off'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===================== ROSTER CELL SHIFT SELECTOR POPOVER ===================== */}
      {activeCellMenu && typeof document !== 'undefined' && createPortal(
        (() => {
          const menuWidth = 180;
          const rect = activeCellMenu.anchorRect;
          const spaceBelow = window.innerHeight - rect.bottom;
          const openUpward = spaceBelow < 180 && rect.top > 180;

          let left = rect.left;
          if (left + menuWidth > window.innerWidth - 12) {
            left = window.innerWidth - menuWidth - 12;
          }
          if (left < 12) left = 12;

          const cardStyle: React.CSSProperties = {
            position: 'fixed',
            left: `${left}px`,
            width: `${menuWidth}px`,
            zIndex: 9999,
            ...(openUpward
              ? { bottom: `${window.innerHeight - rect.top + 4}px` }
              : { top: `${rect.bottom + 4}px` }),
          };

          const currentActiveCode = rosterMap[`${activeCellMenu.empId}_${activeCellMenu.dateStr}`] || '';

          return (
            <div className="fixed inset-0 z-[9999]">
              {/* Invisible Backdrop to close on click outside */}
              <div
                className="fixed inset-0 bg-transparent"
                onClick={() => setActiveCellMenu(null)}
              />

              {/* Simple, compact dropdown menu */}
              <div
                style={cardStyle}
                className="shift-popover-card bg-white rounded-xl border border-slate-200 shadow-xl p-1 z-10 animate-in fade-in zoom-in-95 duration-100"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Clear / Unassigned Option */}
                <button
                  type="button"
                  onClick={() => {
                    handleSetShift(activeCellMenu.empId, activeCellMenu.dateStr, '');
                    setActiveCellMenu(null);
                  }}
                  className={`w-full px-2.5 py-1.5 text-xs font-semibold rounded-lg text-left flex items-center justify-between transition-colors cursor-pointer ${
                    !currentActiveCode ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span>- (Unassign)</span>
                  {!currentActiveCode && <IconCheck className="w-3.5 h-3.5 text-indigo-600" />}
                </button>

                {/* Defined Shifts */}
                {shifts.map((s) => {
                  const isSelected = currentActiveCode === s.code;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        handleSetShift(activeCellMenu.empId, activeCellMenu.dateStr, s.code);
                        setActiveCellMenu(null);
                      }}
                      className={`w-full px-2 py-1.5 text-xs font-semibold rounded-lg text-left flex items-center justify-between transition-colors cursor-pointer ${
                        isSelected ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate min-w-0">
                        <span className={`px-1.5 py-0.5 rounded text-[11px] font-bold shrink-0 ${s.color || 'bg-slate-100 text-slate-700'}`}>
                          {s.code}
                        </span>
                        <span className="text-xs text-slate-700 truncate">{s.name}</span>
                      </div>
                      {isSelected && <IconCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0 ml-1.5" />}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })(),
        document.body
      )}

      {/* ===================== BULK ASSIGN RIGHT-SIDE DRAWER ===================== */}
      {showBulkModal && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] overflow-hidden bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
          onClick={() => setShowBulkModal(false)}
        >
          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div
              className="w-screen max-w-md bg-white shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-300 border-l border-slate-100"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <IconUsers className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Bulk Assign Shift</h3>
                    <p className="text-xs text-slate-500 font-medium">Apply a shift timing to all employees in the current week</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className="p-1.5 rounded-lg text-slate-500 font-medium hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <IconX className="w-5 h-5" />
                </button>
              </div>

              {/* Form Body */}
              <div className="flex-1 flex flex-col justify-between overflow-y-auto">
                <div className="p-5 space-y-4 text-xs">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Target Department</label>
                    <select
                      value={bulkDepartment}
                      onChange={(e) => setBulkDepartment(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden font-medium text-slate-800"
                    >
                      <option value="ALL">All Departments ({employees.length} employees)</option>
                      {departments.map((dept: any) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Select Shift</label>
                    <select
                      value={bulkShiftCode}
                      onChange={(e) => setBulkShiftCode(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden font-bold text-slate-800"
                    >
                      {shifts
                        .filter((s) => s.code !== 'WO')
                        .map((s) => (
                          <option key={s.id} value={s.code}>
                            {s.code} - {s.name} ({s.startTime} to {s.endTime})
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="p-3 bg-amber-50 border border-amber-200/60 rounded-xl text-[11px] text-amber-800 font-medium">
                    Note: Scheduled Weekly Offs ({getWeeklyOffSummary(companyWorkingDays)}) will automatically remain Weekly Off (WO).
                  </div>
                </div>

                {/* Sticky Footer */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowBulkModal(false)}
                    className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-200/60 rounded-xl cursor-pointer transition-colors text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleBulkAssign}
                    className="px-5 py-2 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs cursor-pointer transition-all active:scale-95 text-xs"
                  >
                    Apply to This Week
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ===================== CONFIGURE WEEKLY OFFS MODAL ===================== */}
      {showWeeklyOffModal && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] overflow-y-auto bg-slate-900/50 backdrop-blur-xs transition-opacity animate-in fade-in flex items-center justify-center p-4"
          onClick={() => !isSavingSchedule && setShowWeeklyOffModal(false)}
        >
          <div
            className="relative bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <IconCalendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Set Company Weekly Offs</h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Select your weekly off schedule to apply across rosters, attendance, and payroll.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowWeeklyOffModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <IconX className="w-5 h-5" />
              </button>
            </div>

            {/* Presets List */}
            <div className="space-y-2.5">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                Standard Schedules
              </span>

              {/* Preset 1: Sunday Only (6-Day Work Week) */}
              <div
                onClick={() => setTempSchedule('mon,tue,wed,thu,fri,sat')}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                  tempSchedule === 'mon,tue,wed,thu,fri,sat'
                    ? 'border-indigo-500 bg-indigo-50/60 ring-2 ring-indigo-500/20 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">Sunday Only (6-Day Work Week)</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      6 Days Working
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    Monday to Saturday are working days. Only Sunday is a Weekly Off.
                  </p>
                </div>
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    tempSchedule === 'mon,tue,wed,thu,fri,sat' ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'
                  }`}
                >
                  {tempSchedule === 'mon,tue,wed,thu,fri,sat' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
              </div>

              {/* Preset 2: Saturday & Sunday (5-Day Work Week) */}
              <div
                onClick={() => setTempSchedule('mon,tue,wed,thu,fri')}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                  tempSchedule === 'mon,tue,wed,thu,fri'
                    ? 'border-indigo-500 bg-indigo-50/60 ring-2 ring-indigo-500/20 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">Saturday &amp; Sunday (5-Day Work Week)</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                      5 Days Working
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    Monday to Friday are working days. Both Saturday and Sunday are Weekly Offs.
                  </p>
                </div>
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    tempSchedule === 'mon,tue,wed,thu,fri' ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'
                  }`}
                >
                  {tempSchedule === 'mon,tue,wed,thu,fri' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
              </div>

              {/* Preset 3: Alternate Saturdays + Sunday */}
              <div
                onClick={() => setTempSchedule('mon,tue,wed,thu,fri,alt_sat')}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                  tempSchedule === 'mon,tue,wed,thu,fri,alt_sat'
                    ? 'border-indigo-500 bg-indigo-50/60 ring-2 ring-indigo-500/20 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">Alternate Saturdays + Sunday</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                      Alt Saturday
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    Mon–Fri working. 1st, 3rd, 5th Saturday working. 2nd &amp; 4th Saturday and Sunday Off.
                  </p>
                </div>
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    tempSchedule === 'mon,tue,wed,thu,fri,alt_sat' ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'
                  }`}
                >
                  {tempSchedule === 'mon,tue,wed,thu,fri,alt_sat' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
              </div>
            </div>

            {/* Custom Working Days Selector */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                Or Customize Working Days Directly
              </span>
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                {[
                  { key: 'mon', label: 'Mon' },
                  { key: 'tue', label: 'Tue' },
                  { key: 'wed', label: 'Wed' },
                  { key: 'thu', label: 'Thu' },
                  { key: 'fri', label: 'Fri' },
                  { key: 'sat', label: 'Sat' },
                  { key: 'sun', label: 'Sun' },
                ].map((d) => {
                  const isChecked = tempSchedule.includes(d.key) || (d.key === 'sat' && tempSchedule.includes('alt_sat'));
                  return (
                    <button
                      key={d.key}
                      type="button"
                      onClick={() => toggleTempWorkingDay(d.key)}
                      className={`py-2 px-1 rounded-xl text-center border font-bold text-xs transition-all cursor-pointer ${
                        isChecked
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-slate-200 bg-slate-100/70 text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      <div>{d.label}</div>
                      <div className="text-[9px] font-semibold mt-0.5">
                        {isChecked ? 'Work' : 'Off'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <div className="text-xs text-slate-500 font-medium">
                Active Weekly Offs: <span className="font-bold text-slate-800">{getWeeklyOffSummary(tempSchedule)}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowWeeklyOffModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSavingSchedule}
                  onClick={() => handleSaveCompanySchedule(tempSchedule)}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                >
                  {isSavingSchedule ? (
                    <>
                      <IconLoader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <IconCheck className="w-3.5 h-3.5" />
                      <span>Save Weekly Offs</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
      {showShiftDrawer && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] overflow-hidden bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
          onClick={() => !isSavingShift && setShowShiftDrawer(false)}
        >
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div
              className="w-screen max-w-md bg-white shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-300 border-l border-slate-100"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <IconClock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      {editingShift ? `Edit Shift: ${editingShift.name}` : 'Create Shift'}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      {editingShift
                        ? 'Update timing rules and check-in grace. Saved directly to database.'
                        : 'Configure new work timings and check-in grace rules in database.'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isSavingShift}
                  onClick={() => setShowShiftDrawer(false)}
                  className="p-1.5 rounded-lg text-slate-500 font-medium hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <IconX className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveShift} className="flex-1 flex flex-col justify-between overflow-y-auto">
                <div className="p-5 space-y-4 text-xs">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Shift Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Morning Shift"
                      value={shiftFormData.name}
                      onChange={(e) => setShiftFormData({ ...shiftFormData, name: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Shift Code (2-4 chars)</label>
                    <input
                      type="text"
                      required
                      maxLength={4}
                      placeholder="e.g. MS"
                      value={shiftFormData.code}
                      onChange={(e) => setShiftFormData({ ...shiftFormData, code: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl uppercase font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-900"
                    />
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={shiftFormData.isWeeklyOff}
                        onChange={(e) =>
                          setShiftFormData({ ...shiftFormData, isWeeklyOff: e.target.checked })
                        }
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="font-semibold text-slate-800 text-xs">Weekly Off / Non-working Day</span>
                    </label>
                    <p className="text-[11px] text-slate-500 font-medium">
                      When enabled, this shift marks the day as an off-day with no mandatory working hours.
                    </p>
                  </div>

                  {!shiftFormData.isWeeklyOff && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-slate-700 block mb-1">Start Time</label>
                          <input
                            type="time"
                            required
                            value={shiftFormData.startTime}
                            onChange={(e) => setShiftFormData({ ...shiftFormData, startTime: e.target.value })}
                            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-slate-700 block mb-1">End Time</label>
                          <input
                            type="time"
                            required
                            value={shiftFormData.endTime}
                            onChange={(e) => setShiftFormData({ ...shiftFormData, endTime: e.target.value })}
                            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-slate-700 block mb-1">Break Duration (Mins)</label>
                          <input
                            type="number"
                            min={0}
                            max={240}
                            value={shiftFormData.breakDurationMinutes}
                            onChange={(e) =>
                              setShiftFormData({ ...shiftFormData, breakDurationMinutes: Number(e.target.value) })
                            }
                            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-slate-700 block mb-1">Late Grace Period (Mins)</label>
                          <input
                            type="number"
                            min={0}
                            max={120}
                            value={shiftFormData.gracePeriodMinutes}
                            onChange={(e) =>
                              setShiftFormData({ ...shiftFormData, gracePeriodMinutes: Number(e.target.value) })
                            }
                            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <input
                          id="isNightShift"
                          type="checkbox"
                          checked={shiftFormData.isNightShift}
                          onChange={(e) =>
                            setShiftFormData({ ...shiftFormData, isNightShift: e.target.checked })
                          }
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <label htmlFor="isNightShift" className="text-xs font-semibold text-slate-700 cursor-pointer">
                          Night Shift (crosses midnight)
                        </label>
                      </div>

                      <div className="pt-2 border-t border-slate-100">
                        <label className="text-xs font-semibold text-slate-700 block mb-1">
                          Working Days Schedule for this Shift
                        </label>
                        <select
                          value={shiftFormData.workingDays}
                          onChange={(e) => setShiftFormData({ ...shiftFormData, workingDays: e.target.value })}
                          className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium text-slate-900"
                        >
                          <option value="COMPANY_DEFAULT">Follow Company Default Schedule</option>
                          <option value="mon,tue,wed,thu,fri">5-Day Work Week (Monday – Friday)</option>
                          <option value="mon,tue,wed,thu,fri,sat">6-Day Work Week (Monday – Saturday)</option>
                          <option value="mon,tue,wed,thu,fri,alt_sat">Alternate Saturdays (1st/3rd/5th Working)</option>
                        </select>
                        <p className="text-[11px] text-slate-500 font-medium mt-1">
                          Employees assigned to this shift will follow this specific schedule for attendance, off-days, and leave deductions.
                        </p>
                      </div>
                    </>
                  )}
                </div>

                {/* Sticky Footer */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={isSavingShift}
                    onClick={() => setShowShiftDrawer(false)}
                    className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-200/60 rounded-xl cursor-pointer transition-colors text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingShift}
                    className="px-5 py-2 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs cursor-pointer transition-all active:scale-95 text-xs flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isSavingShift && <IconLoader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>{isSavingShift ? 'Saving to Database...' : editingShift ? 'Save Changes' : 'Create'}</span>
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

export default ShiftRosterPage;
