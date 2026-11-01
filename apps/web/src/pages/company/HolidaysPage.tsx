import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import api from '../../api/client';
import TablePagination from '../../components/common/TablePagination';
import {
  IconCalendarEvent,
  IconPlus,
  IconTrash,
  IconX,
  IconCalendar,
  IconAlertCircle,
  IconSearch,
  IconFilter,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconPencil,
  IconClock,
  IconCheck,
  IconSparkles,
  IconInfoCircle,
  IconShieldLock,
  IconMail,
  IconSend,
  IconRepeat,
  IconCalendarRepeat,
} from '@tabler/icons-react';
import { getHolidayIcon } from '../../utils/holidayIcons';
import { EventEmailsModal } from '../../components/company/EventEmailsModal';

interface Holiday {
  id: number;
  name: string;
  date: string;
  type: string;
  description?: string;
}

export interface AnnualHolidayTemplate {
  name: string;
  month: number; // 1-12
  day: number; // 1-31
  type: string;
  description?: string;
  isCustom?: boolean;
}

// Standard statutory & recognized annual recurring holidays
export const STANDARD_ANNUAL_HOLIDAYS: AnnualHolidayTemplate[] = [
  { name: "New Year's Day", month: 1, day: 1, type: 'PUBLIC', description: 'Celebration of the New Year [Repeats Annually]' },
  { name: 'Republic Day', month: 1, day: 26, type: 'PUBLIC', description: 'National Statutory Holiday [Repeats Annually]' },
  { name: "International Workers' Day", month: 5, day: 1, type: 'PUBLIC', description: 'Labour Day observance [Repeats Annually]' },
  { name: 'Independence Day', month: 8, day: 15, type: 'PUBLIC', description: 'National Independence Day [Repeats Annually]' },
  { name: 'Gandhi Jayanti', month: 10, day: 2, type: 'PUBLIC', description: 'National statutory observance [Repeats Annually]' },
  { name: 'Christmas Day', month: 12, day: 25, type: 'PUBLIC', description: 'Christian Festival [Repeats Annually]' },
];

export const HolidaysPage: React.FC = () => {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL');

  // Year Selection & Annual Recurring Holidays State
  const currentActualYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentActualYear);
  const [showAllYears, setShowAllYears] = useState(false);
  const [isAnnualDrawerOpen, setIsAnnualDrawerOpen] = useState(false);
  const [isBulkAdding, setIsBulkAdding] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEmailSettingsOpen, setIsEmailSettingsOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);

  // Deleting Holiday confirmation toaster
  const [deletingHoliday, setDeletingHoliday] = useState<Holiday | null>(null);
  const [isDeletingHoliday, setIsDeletingHoliday] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Auto dismiss toast after 4.5 seconds
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [toast]);

  const [form, setForm] = useState({
    name: '',
    date: new Date().toISOString().split('T')[0],
    type: 'PUBLIC',
    description: '',
    isRecurring: false,
    sendEmailToEmployees: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Left calendar view navigation state (current visible month/year)
  const [calViewDate, setCalViewDate] = useState<Date>(() => new Date());

  const fetchHolidays = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/company/holidays');
      setHolidays(res.data?.holidays || []);
    } catch (err) {
      console.error('Failed to load holidays:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, []);

  const parseDateString = (dateStr: string) => {
    if (!dateStr) return new Date();
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length === 3) {
      return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    }
    return new Date(dateStr);
  };

  const syncCalViewWithDate = (dateStr: string) => {
    if (!dateStr) return;
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const yr = parseInt(parts[0], 10);
      const mo = parseInt(parts[1], 10) - 1;
      const da = parseInt(parts[2], 10);
      const d = new Date(yr, mo, da);
      if (!isNaN(d.getTime())) {
        setCalViewDate(new Date(yr, mo, 1));
      }
    }
  };

  // Compile all annual recurring holidays: combining standard templates + any custom marked [Repeats Annually]
  const allAnnualHolidays = useMemo(() => {
    const map = new Map<string, AnnualHolidayTemplate>();

    // 1. Standard annual defaults
    STANDARD_ANNUAL_HOLIDAYS.forEach((std) => {
      map.set(std.name.toLowerCase().trim(), std);
    });

    // 2. Discover custom holidays marked [Repeats Annually] in company database
    holidays.forEach((h) => {
      if (h.description && h.description.includes('[Repeats Annually]')) {
        if (h.date) {
          const d = parseDateString(h.date);
          const nameKey = h.name.toLowerCase().trim();
          map.set(nameKey, {
            name: h.name,
            month: d.getMonth() + 1,
            day: d.getDate(),
            type: h.type || 'PUBLIC',
            description: h.description.replace(/\s*\[Repeats Annually\]/g, '').trim(),
            isCustom: true,
          });
        }
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      if (a.month !== b.month) return a.month - b.month;
      return a.day - b.day;
    });
  }, [holidays]);

  // Check which annual recurring holidays are already present in the currently selected calendar year
  const annualHolidayStatus = useMemo(() => {
    const existingForYear = holidays.filter((h) => {
      if (!h.date) return false;
      const yr = parseDateString(h.date).getFullYear();
      return yr === selectedYear;
    });

    return allAnnualHolidays.map((ann) => {
      const isAdded = existingForYear.some((h) => {
        const d = parseDateString(h.date);
        const isSameDate = d.getMonth() + 1 === ann.month && d.getDate() === ann.day;
        const isSameName = h.name.toLowerCase().trim() === ann.name.toLowerCase().trim();
        return isSameDate || isSameName;
      });

      return {
        ...ann,
        isAdded,
      };
    });
  }, [allAnnualHolidays, holidays, selectedYear]);

  const missingAnnualHolidays = annualHolidayStatus.filter((a) => !a.isAdded);
  const missingAnnualCount = missingAnnualHolidays.length;

  // Auto-Add ALL missing annual recurring holidays for the selected calendar year
  const handleAutoAddAllAnnual = async () => {
    if (missingAnnualCount === 0) {
      setToast({
        type: 'success',
        message: `All annual recurring holidays are already in the ${selectedYear} calendar!`,
      });
      return;
    }

    setIsBulkAdding(true);
    try {
      let added = 0;
      for (const item of missingAnnualHolidays) {
        const mStr = String(item.month).padStart(2, '0');
        const dStr = String(item.day).padStart(2, '0');
        const dateStr = `${selectedYear}-${mStr}-${dStr}`;
        const finalDesc = item.description
          ? `${item.description} [Repeats Annually]`
          : '[Repeats Annually]';

        await api.post('/company/holidays', {
          name: item.name,
          date: dateStr,
          type: item.type,
          description: finalDesc,
          sendEmailToEmployees: false,
        });
        added++;
      }

      await fetchHolidays();
      setToast({
        type: 'success',
        message: `Successfully auto-added ${added} annual holiday${added > 1 ? 's' : ''} to ${selectedYear} calendar!`,
      });
    } catch (err: any) {
      setToast({
        type: 'error',
        message: err.response?.data?.error || err.response?.data?.message || 'Failed to auto-add annual holidays.',
      });
    } finally {
      setIsBulkAdding(false);
    }
  };

  // Add a single annual recurring holiday manually for the selected calendar year
  const handleAddSingleAnnualHoliday = async (item: AnnualHolidayTemplate) => {
    const mStr = String(item.month).padStart(2, '0');
    const dStr = String(item.day).padStart(2, '0');
    const dateStr = `${selectedYear}-${mStr}-${dStr}`;
    const finalDesc = item.description
      ? `${item.description} [Repeats Annually]`
      : '[Repeats Annually]';

    try {
      await api.post('/company/holidays', {
        name: item.name,
        date: dateStr,
        type: item.type,
        description: finalDesc,
        sendEmailToEmployees: false,
      });

      await fetchHolidays();
      setToast({
        type: 'success',
        message: `Holiday "${item.name}" added to ${selectedYear} calendar!`,
      });
    } catch (err: any) {
      setToast({
        type: 'error',
        message: err.response?.data?.error || err.response?.data?.message || `Failed to add "${item.name}".`,
      });
    }
  };

  const handleOpenAdd = (prefill?: { name?: string; date?: string; type?: string; isRecurring?: boolean }) => {
    setEditingHoliday(null);
    const today = new Date();
    const defaultDateStr =
      prefill?.date ||
      `${selectedYear}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    setForm({
      name: prefill?.name || '',
      date: defaultDateStr,
      type: prefill?.type || 'PUBLIC',
      description: '',
      isRecurring: prefill?.isRecurring ?? false,
      sendEmailToEmployees: true,
    });
    setCalViewDate(new Date(selectedYear, today.getMonth(), 1));
    setError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (h: Holiday) => {
    setEditingHoliday(h);
    let dateStr = '';
    if (h.date) {
      const d = parseDateString(h.date);
      dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      setCalViewDate(new Date(d.getFullYear(), d.getMonth(), 1));
    } else {
      setCalViewDate(new Date());
    }

    const isRec = Boolean(h.description && h.description.includes('[Repeats Annually]'));
    const cleanDesc = (h.description || '').replace(/\s*\[Repeats Annually\]/g, '').trim();

    setForm({
      name: h.name,
      date: dateStr,
      type: h.type || 'PUBLIC',
      description: cleanDesc,
      isRecurring: isRec,
      sendEmailToEmployees: true,
    });
    setError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const cleanDesc = (form.description || '').replace(/\s*\[Repeats Annually\]/g, '').trim();
      const finalDesc = form.isRecurring
        ? cleanDesc
          ? `${cleanDesc} [Repeats Annually]`
          : '[Repeats Annually]'
        : cleanDesc;

      const payload = {
        name: form.name,
        date: form.date,
        type: form.type,
        description: finalDesc,
        sendEmailToEmployees: form.sendEmailToEmployees,
      };

      if (editingHoliday) {
        await api.patch(`/company/holidays/${editingHoliday.id}`, payload);
      } else {
        await api.post('/company/holidays', payload);
      }
      setIsModalOpen(false);
      fetchHolidays();
      setToast({
        type: 'success',
        message: editingHoliday
          ? `Holiday "${form.name}" was updated.`
          : `Holiday "${form.name}" was added to the calendar.`,
      });
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to save holiday');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (holiday: Holiday) => {
    setDeletingHoliday(holiday);
    setDeleteError('');
  };

  const handleConfirmDelete = async () => {
    if (!deletingHoliday) return;
    const holidayName = deletingHoliday.name;
    setIsDeletingHoliday(true);
    setDeleteError('');
    try {
      await api.delete(`/company/holidays/${deletingHoliday.id}`);
      setDeletingHoliday(null);
      fetchHolidays();
      setToast({
        type: 'success',
        message: `Holiday "${holidayName}" was deleted from the calendar.`,
      });
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.response?.data?.message || 'Failed to delete holiday';
      setDeleteError(errMsg);
      setToast({
        type: 'error',
        message: errMsg,
      });
    } finally {
      setIsDeletingHoliday(false);
    }
  };

  // Helper for relative date & upcoming check
  const getRelativeDateInfo = (dateStr: string) => {
    if (!dateStr) return { label: '—', isUpcoming: false };
    const target = parseDateString(dateStr);
    target.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return { label: 'Today', isUpcoming: true, isToday: true };
    if (diffDays === 1) return { label: 'Tomorrow', isUpcoming: true, isTomorrow: true };
    if (diffDays > 1) return { label: `In ${diffDays} days`, isUpcoming: true, isFuture: true };
    return { label: 'Past', isUpcoming: false, isPast: true };
  };

  // Badge for holiday category
  const getTypeBadge = (type: string) => {
    const t = (type || '').toUpperCase();
    if (t === 'MANDATORY' || t === 'PUBLIC') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200/80 whitespace-nowrap shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
          <span>Public Mandatory</span>
        </span>
      );
    }
    if (t === 'FLOATER' || t === 'OPTIONAL') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-50 text-sky-700 border border-sky-200/80 whitespace-nowrap shrink-0">
          <IconSparkles className="w-3 h-3 text-sky-500 shrink-0" />
          <span>Floating / Optional</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200/80 whitespace-nowrap shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
        <span>Restricted Holiday</span>
      </span>
    );
  };

  // Deduplicate holidays by name and date
  const uniqueHolidays = useMemo(() => {
    const seen = new Set<string>();
    return holidays.filter((h) => {
      const key = `${h.name.toLowerCase().trim()}_${(h.date || '').split('T')[0]}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [holidays]);

  // Filtered holidays for the main table
  const filteredHolidays = uniqueHolidays.filter((h) => {
    const q = search.toLowerCase().trim();
    const matchesSearch = !q || h.name.toLowerCase().includes(q) || (h.description || '').toLowerCase().includes(q);

    // Year Filter
    if (!showAllYears && h.date) {
      const yr = parseDateString(h.date).getFullYear();
      if (yr !== selectedYear) return false;
    }

    const rel = getRelativeDateInfo(h.date);
    const t = (h.type || '').toUpperCase();

    if (filterType === 'UPCOMING') {
      return matchesSearch && rel.isUpcoming;
    }
    if (filterType === 'PAST') {
      return matchesSearch && !rel.isUpcoming;
    }
    if (filterType === 'PUBLIC') {
      return matchesSearch && (t === 'PUBLIC' || t === 'MANDATORY');
    }
    if (filterType === 'FLOATER') {
      return matchesSearch && (t === 'FLOATER' || t === 'OPTIONAL');
    }
    if (filterType === 'ANNUAL') {
      return matchesSearch && Boolean(h.description && h.description.includes('[Repeats Annually]'));
    }
    return matchesSearch;
  });

  // Paginated holidays for current page
  const paginatedHolidays = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredHolidays.slice(start, start + pageSize);
  }, [filteredHolidays, currentPage, pageSize]);

  // Year scoped holidays for KPIs
  const yearScopedHolidays = useMemo(() => {
    if (showAllYears) return uniqueHolidays;
    return uniqueHolidays.filter((h) => {
      if (!h.date) return false;
      return parseDateString(h.date).getFullYear() === selectedYear;
    });
  }, [uniqueHolidays, showAllYears, selectedYear]);

  // KPI calculations
  const totalHolidays = yearScopedHolidays.length;
  const upcomingList = yearScopedHolidays
    .filter((h) => getRelativeDateInfo(h.date).isUpcoming)
    .sort((a, b) => parseDateString(a.date).getTime() - parseDateString(b.date).getTime());
  const upcomingHolidays = upcomingList.length;
  const nextHoliday = upcomingList[0];

  const mandatoryHolidays = yearScopedHolidays.filter((h) => {
    const t = (h.type || '').toUpperCase();
    return t === 'PUBLIC' || t === 'MANDATORY';
  }).length;
  const floaterHolidays = yearScopedHolidays.filter((h) => {
    const t = (h.type || '').toUpperCase();
    return t === 'FLOATER' || t === 'OPTIONAL';
  }).length;

  // Calendar generation for the left picker in modal
  const currentYear = calViewDate.getFullYear();
  const currentMonth = calViewDate.getMonth();
  const monthName = calViewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sun
  const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

  const prevMonthCells = [];
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const prevDate = new Date(currentYear, currentMonth - 1, day);
    const dStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    prevMonthCells.push({ dayNum: day, isCurrentMonth: false, dateStr: dStr });
  }

  const currentMonthCells = [];
  for (let day = 1; day <= daysInCurrentMonth; day++) {
    const dStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    currentMonthCells.push({ dayNum: day, isCurrentMonth: true, dateStr: dStr });
  }

  const totalCells = prevMonthCells.length + currentMonthCells.length;
  const remainder = (7 - (totalCells % 7)) % 7;
  const nextMonthCells = [];
  for (let day = 1; day <= remainder; day++) {
    const nextDate = new Date(currentYear, currentMonth + 1, day);
    const dStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    nextMonthCells.push({ dayNum: day, isCurrentMonth: false, dateStr: dStr });
  }

  const allCalendarCells = [...prevMonthCells, ...currentMonthCells, ...nextMonthCells];
  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <IconCalendarEvent className="w-5 h-5 text-indigo-600 shrink-0" />
              <span>Holiday Calendar</span>
            </h1>

            {/* Dynamic Year Selector */}
            <div className="inline-flex items-center bg-slate-100 rounded-xl p-0.5 border border-slate-200 shadow-2xs">
              <button
                type="button"
                onClick={() => {
                  setSelectedYear((y) => y - 1);
                  setShowAllYears(false);
                }}
                className="p-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition-colors cursor-pointer"
                title="Previous Year"
              >
                <IconChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="px-2 text-xs font-bold text-slate-900">
                {showAllYears ? 'All Years' : `Calendar ${selectedYear}`}
              </span>
              <button
                type="button"
                onClick={() => {
                  setSelectedYear((y) => y + 1);
                  setShowAllYears(false);
                }}
                className="p-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition-colors cursor-pointer"
                title="Next Year"
              >
                <IconChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowAllYears((prev) => !prev)}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-colors cursor-pointer ${
                showAllYears
                  ? 'bg-[#5E4BE2] text-white border-[#5E4BE2]'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {showAllYears ? 'Filtered View' : 'Show All Years'}
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Configure public, statutory, and optional floating holidays used across attendance tracking and payroll engines.
          </p>
        </div>

        {/* Primary Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => setIsEmailSettingsOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-[#5E4BE2] text-xs font-bold shadow-2xs transition-all cursor-pointer"
            title="Configure Automated Holiday & Birthday Emails"
          >
            <IconMail className="w-4 h-4 text-[#5E4BE2]" />
            <span>Automated Emails</span>
          </button>
          <button
            onClick={() => handleOpenAdd()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#5E4BE2] hover:bg-[#4D3BC9] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <IconPlus className="w-4 h-4" />
            <span>Add Holiday</span>
          </button>
        </div>
      </div>

      {/* Floating Status Notification */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 max-w-sm sm:max-w-md w-[calc(100%-3rem)] pointer-events-auto animate-in slide-in-from-top-4 fade-in duration-200">
          <div
            className={`p-4 rounded-2xl border shadow-xl flex items-start gap-3 backdrop-blur-md transition-all ${
              toast.type === 'error'
                ? 'bg-rose-50/95 border-rose-200 text-rose-950 shadow-rose-900/10'
                : 'bg-emerald-50/95 border-emerald-200 text-emerald-950 shadow-emerald-900/10'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                toast.type === 'error' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'
              }`}
            >
              {toast.type === 'error' ? (
                <IconAlertCircle className="w-5 h-5 stroke-[2.2]" />
              ) : (
                <IconCheck className="w-5 h-5 stroke-[2.2]" />
              )}
            </div>

            <div className="flex-1 min-w-0 pt-0.5">
              <p className="font-bold text-xs leading-snug">
                {toast.type === 'error' ? 'Action Failed' : 'Success'}
              </p>
              <p className="mt-0.5 text-[11px] font-medium leading-relaxed opacity-90">{toast.message}</p>
            </div>

            <button
              type="button"
              onClick={() => setToast(null)}
              className="p-1 -mr-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-black/5 transition-colors cursor-pointer shrink-0"
              title="Dismiss"
            >
              <IconX className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* KPI Overview Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Card 1: Total Holidays */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <span className="text-xs font-bold text-slate-500">Total Holidays</span>
            <div className="text-2xl font-black text-slate-900 mt-1 leading-none tracking-tight">
              {totalHolidays}
            </div>
            <div className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 mt-2">
              <IconCalendar className="w-3.5 h-3.5" />
              <span>Full annual schedule</span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5E4BE2]">
            <IconCalendar className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Upcoming */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <span className="text-xs font-bold text-slate-500">Upcoming Off-Days</span>
            <div className="text-2xl font-black text-slate-900 mt-1 leading-none tracking-tight">
              {upcomingHolidays}
            </div>
            <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 mt-2 truncate max-w-[150px]">
              <IconClock className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{nextHoliday ? `Next: ${nextHoliday.name}` : 'All past for year'}</span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <IconClock className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Public / Mandatory */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <span className="text-xs font-bold text-slate-500">Public & Statutory</span>
            <div className="text-2xl font-black text-slate-900 mt-1 leading-none tracking-tight">
              {mandatoryHolidays}
            </div>
            <div className="flex items-center gap-1 text-[11px] font-bold text-rose-600 mt-2">
              <IconShieldLock className="w-3.5 h-3.5" />
              <span>Mandatory paid leave</span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
            <IconCalendarEvent className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Floating / Optional */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <span className="text-xs font-bold text-slate-500">Floating & Optional</span>
            <div className="text-2xl font-black text-slate-900 mt-1 leading-none tracking-tight">
              {floaterHolidays}
            </div>
            <div className="flex items-center gap-1 text-[11px] font-bold text-sky-600 mt-2">
              <IconSparkles className="w-3.5 h-3.5" />
              <span>Flexible staff choice</span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600">
            <IconSparkles className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Section Header & Search/Filter Controls */}
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-50/40">
          {/* Search Input */}
          <div className="relative flex-1">
            <IconSearch className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search holidays by title, description..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500 text-slate-800 placeholder-slate-400 font-medium"
            />
          </div>

          {/* Right Controls: Filters & Counter */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5">
            {/* Filter Dropdown */}
            <div className="relative flex-1 sm:flex-none">
              <select
                value={filterType}
                onChange={(e) => {
                  setFilterType(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full sm:w-auto appearance-none pl-8 pr-7 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500 text-slate-700 cursor-pointer"
              >
                <option value="ALL">All Holidays</option>
                <option value="UPCOMING">Upcoming Only</option>
                <option value="PUBLIC">Public Mandatory</option>
                <option value="FLOATER">Floating / Optional</option>
                <option value="ANNUAL">Repeats Every Year</option>
                <option value="PAST">Past Holidays</option>
              </select>
              <IconFilter className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <IconChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Annual Recurring Holidays Drawer Trigger Button */}
            <button
              type="button"
              onClick={() => setIsAnnualDrawerOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-50 via-purple-50/60 to-indigo-50 hover:from-indigo-100 hover:to-purple-100 border border-indigo-200 text-[#5E4BE2] text-xs font-bold shadow-2xs transition-all cursor-pointer shrink-0"
              title="Open Annual Recurring Holidays right sidebar"
            >
              <IconCalendarRepeat className="w-4 h-4 text-[#5E4BE2]" />
              <span>Annual Recurring Holidays</span>
              {missingAnnualCount > 0 ? (
                <span className="px-1.5 py-0.2 rounded-full bg-[#5E4BE2] text-white text-[10px] font-bold">
                  {missingAnnualCount}
                </span>
              ) : (
                <IconCheck className="w-3.5 h-3.5 text-emerald-600" />
              )}
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-xs">
            <thead className="bg-[#e5e7eb] text-xs font-bold text-slate-900 border-b border-slate-300">
              <tr>
                <th className="px-5 py-3.5 whitespace-nowrap min-w-[240px]">Holiday Name</th>
                <th className="px-5 py-3.5 whitespace-nowrap min-w-[190px]">Calendar Date</th>
                <th className="px-5 py-3.5 whitespace-nowrap min-w-[150px]">Day of Week</th>
                <th className="px-5 py-3.5 whitespace-nowrap min-w-[160px]">Category</th>
                <th className="px-5 py-3.5 whitespace-nowrap min-w-[130px]">Status</th>
                <th className="px-5 py-3.5 whitespace-nowrap text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-200" />
                        <div className="w-32 h-3.5 bg-slate-200 rounded-sm" />
                      </div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap"><div className="w-28 h-8 bg-slate-200 rounded-xl" /></td>
                    <td className="px-5 py-4 whitespace-nowrap"><div className="w-20 h-4 bg-slate-200 rounded-sm" /></td>
                    <td className="px-5 py-4 whitespace-nowrap"><div className="w-28 h-6 bg-slate-200 rounded-full" /></td>
                    <td className="px-5 py-4 whitespace-nowrap"><div className="w-20 h-6 bg-slate-200 rounded-full" /></td>
                    <td className="px-5 py-4 whitespace-nowrap text-right"><div className="w-14 h-4 bg-slate-200 rounded-full ml-auto" /></td>
                  </tr>
                ))
              ) : filteredHolidays.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-14 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-[#5E4BE2] flex items-center justify-center mx-auto mb-3 shadow-2xs">
                      <IconCalendarEvent className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-slate-800">No holidays found</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      {search || filterType !== 'ALL'
                        ? 'Try modifying your search query or filter options.'
                        : 'Configure company off-days, national holidays, and floating observances.'}
                    </p>
                    {search || filterType !== 'ALL' ? (
                      <button
                        onClick={() => {
                          setSearch('');
                          setFilterType('ALL');
                        }}
                        className="mt-3 text-xs font-bold text-[#5E4BE2] hover:underline cursor-pointer"
                      >
                        Reset filters
                      </button>
                    ) : (
                      <button
                        onClick={() => handleOpenAdd()}
                        className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#5E4BE2] hover:bg-[#4d3cc9] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                      >
                        <IconPlus className="w-4 h-4" />
                        <span>Add First Holiday</span>
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedHolidays.map((holiday) => {
                  const dateObj = parseDateString(holiday.date);
                  const relInfo = getRelativeDateInfo(holiday.date);
                  const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
                  const formattedDate = dateObj.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  });

                  const holidayStyle = getHolidayIcon(holiday.name);
                  const HolidayIcon = holidayStyle.Icon;
                  const isRecurring = Boolean(holiday.description && holiday.description.includes('[Repeats Annually]'));
                  const cleanDesc = (holiday.description || '').replace(/\s*\[Repeats Annually\]/g, '').trim();

                  return (
                    <tr key={holiday.id} className="hover:bg-indigo-50/20 transition-colors group">
                      {/* Name */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3 min-w-[220px]">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${holidayStyle.className}`}>
                            <HolidayIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-slate-900 leading-tight">
                                {holiday.name}
                              </span>
                              {isRecurring && (
                                <span
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-indigo-50 text-[#5E4BE2] border border-indigo-100 shrink-0"
                                  title="Defined to repeat every year"
                                >
                                  <IconRepeat className="w-2.5 h-2.5 text-[#5E4BE2]" />
                                  <span>Annual</span>
                                </span>
                              )}
                            </div>
                            {cleanDesc && (
                              <span className="text-[10px] text-slate-400 block truncate max-w-[240px] mt-0.5">
                                {cleanDesc}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Calendar Date Block */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="font-bold text-xs text-slate-900 block">
                          {formattedDate}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                          Year {dateObj.getFullYear()}
                        </span>
                      </td>

                      {/* Day of Week */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="text-xs font-bold text-slate-700">
                          {dayOfWeek}
                        </span>
                      </td>

                      {/* Category */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        {getTypeBadge(holiday.type)}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        {relInfo.isUpcoming ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                            <span>{relInfo.label}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500 border border-slate-200/60 whitespace-nowrap shrink-0">
                            <IconCheck className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>Past Observance</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(holiday)}
                            className="w-8 h-8 rounded-xl border border-slate-200 bg-white hover:bg-blue-50 hover:border-blue-300 text-slate-900 hover:text-blue-600 flex items-center justify-center shadow-2xs transition-all cursor-pointer"
                            title="Edit Holiday"
                          >
                            <IconPencil className="w-4 h-4 stroke-[1.8]" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(holiday)}
                            className="w-8 h-8 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-300 text-rose-600 hover:text-rose-700 flex items-center justify-center shadow-2xs transition-all cursor-pointer"
                            title="Delete Holiday"
                          >
                            <IconTrash className="w-4 h-4 stroke-[1.8]" />
                          </button>
                        </div>
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
          totalItems={filteredHolidays.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[10, 25, 50, 100]}
          itemName="holidays"
        />
      </div>

      {/* Add / Edit Holiday Modal with Left Interactive Calendar & Right Form Fields */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div
            className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between gap-4 bg-gradient-to-r from-slate-50 via-indigo-50/20 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-[#5E4BE2] flex items-center justify-center shrink-0 shadow-2xs border border-indigo-100/60">
                  <IconCalendarEvent className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {editingHoliday ? 'Edit Holiday' : 'Add Holiday'}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Click a date on the interactive calendar or enter details manually.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
              >
                <IconX className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mx-4 sm:mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <IconAlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Modal Body: Left Calendar + Right Form Fields */}
            <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-start overflow-y-auto max-h-[calc(90vh-140px)]">
              {/* LEFT SIDE: Interactive Calendar Picker */}
              <div className="md:col-span-6 bg-slate-50/70 p-4 sm:p-5 rounded-2xl border border-slate-200/80 flex flex-col justify-between">
                <div>
                  {/* Calendar Navigation Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 tracking-tight">
                        {monthName}
                      </h4>
                      <span className="text-[10px] text-slate-400">Click a day to pick date</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          const today = new Date();
                          setCalViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
                          const tStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                          setForm((prev) => ({ ...prev, date: tStr }));
                        }}
                        className="px-2 py-1 text-[11px] font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer mr-1"
                      >
                        Today
                      </button>
                      <button
                        type="button"
                        onClick={() => setCalViewDate(new Date(currentYear, currentMonth - 1, 1))}
                        className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Previous Month"
                      >
                        <IconChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setCalViewDate(new Date(currentYear, currentMonth + 1, 1))}
                        className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Next Month"
                      >
                        <IconChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Day Names Row */}
                  <div className="grid grid-cols-7 gap-1 text-center mb-2">
                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d, dIdx) => (
                      <span
                        key={d}
                        className={`text-[10px] font-bold uppercase py-1 ${
                          dIdx === 0 || dIdx === 6 ? 'text-rose-400' : 'text-slate-400'
                        }`}
                      >
                        {d}
                      </span>
                    ))}
                  </div>

                  {/* Days Grid */}
                  <div className="grid grid-cols-7 gap-1">
                    {allCalendarCells.map((cell, idx) => {
                      const isSelected = form.date === cell.dateStr;
                      const isTodayDate = cell.dateStr === todayStr;

                      // Find existing registered holidays on this cell date
                      const existingHolidaysOnDate = holidays.filter((h) => {
                        if (!h.date) return false;
                        const d = parseDateString(h.date);
                        const hStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                        return hStr === cell.dateStr;
                      });

                      const hasHoliday = existingHolidaysOnDate.length > 0;
                      const firstHoliday = existingHolidaysOnDate[0];
                      const holidayType = (firstHoliday?.type || 'PUBLIC').toUpperCase();

                      // Determine color border and background for holidays
                      let holidayBorderClasses = 'border-2 border-rose-400 bg-rose-50/70 text-rose-800 font-bold shadow-xs hover:border-rose-500 hover:bg-rose-100/80';

                      if (holidayType === 'FLOATER' || holidayType === 'OPTIONAL') {
                        holidayBorderClasses = 'border-2 border-sky-400 bg-sky-50/70 text-sky-800 font-bold shadow-xs hover:border-sky-500 hover:bg-sky-100/80';
                      } else if (holidayType === 'RESTRICTED') {
                        holidayBorderClasses = 'border-2 border-amber-400 bg-amber-50/70 text-amber-800 font-bold shadow-xs hover:border-amber-500 hover:bg-amber-100/80';
                      }

                      return (
                        <button
                          key={`${cell.dateStr}-${idx}`}
                          type="button"
                          onClick={() => {
                            if (cell.dateStr) {
                              setForm({ ...form, date: cell.dateStr });
                            }
                          }}
                          className={`relative h-9 rounded-xl flex flex-col items-center justify-center text-xs font-semibold transition-all cursor-pointer ${
                            isSelected
                              ? `bg-[#5E4BE2] text-white font-bold shadow-md shadow-indigo-500/25 scale-105 z-10 ${
                                  hasHoliday ? 'ring-2 ring-rose-400 ring-offset-1 border-2 border-indigo-300' : ''
                                }`
                              : hasHoliday
                              ? holidayBorderClasses
                              : cell.isCurrentMonth
                              ? 'text-slate-800 hover:bg-indigo-50 hover:text-[#5E4BE2] bg-white border border-slate-100/80 shadow-2xs'
                              : 'text-slate-300 hover:bg-slate-100/80 bg-slate-50/50 border border-transparent'
                          } ${isTodayDate && !isSelected && !hasHoliday ? 'ring-1.5 ring-indigo-400 text-[#5E4BE2]' : ''}`}
                          title={
                            hasHoliday
                              ? `Existing Holiday: ${existingHolidaysOnDate.map((h) => h.name).join(', ')}`
                              : cell.dateStr
                          }
                        >
                          <span>{cell.dayNum}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Legend & Guide note */}
                <div className="mt-4 pt-3 border-t border-slate-200/70 flex items-center justify-between text-[11px] text-slate-500">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <IconInfoCircle className="w-3.5 h-3.5" />
                    <span>Click day to set date</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-600">
                      <span className="w-3 h-3 rounded-full border-2 border-rose-400 bg-rose-50" />
                      Holiday
                    </span>
                    <span className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-600">
                      <span className="w-3 h-3 rounded-full bg-[#5E4BE2]" />
                      Selected
                    </span>
                  </div>
                </div>
              </div>

              {/* RIGHT SIDE: Holiday Form Fields */}
              <div className="md:col-span-6 flex flex-col justify-between">
                <form onSubmit={handleSave} className="space-y-4">
                  {/* Selected Date Summary Banner */}
                  {form.date && (
                    <div className="p-3 rounded-2xl bg-gradient-to-r from-indigo-50/90 via-blue-50/50 to-white border border-indigo-100/90 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-[#5E4BE2] text-white flex items-center justify-center shrink-0 shadow-2xs">
                          <IconCalendar className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-indigo-500 tracking-wider block">
                            Selected Calendar Date
                          </span>
                          <span className="text-xs font-bold text-slate-900">
                            {(() => {
                              const d = parseDateString(form.date);
                              return d.toLocaleDateString('en-US', {
                                weekday: 'long',
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              });
                            })()}
                          </span>
                        </div>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-[#5E4BE2] shrink-0">
                        {getRelativeDateInfo(form.date).label}
                      </span>
                    </div>
                  )}

                  {/* Holiday Title */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Holiday Title *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Independence Day, New Year's Day, Diwali"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-indigo-500 font-medium text-slate-800"
                    />
                  </div>

                  {/* Calendar Date Input (Synced with Left Calendar) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Calendar Date *
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        required
                        value={form.date}
                        onChange={(e) => {
                          const val = e.target.value;
                          setForm({ ...form, date: val });
                          syncCalViewWithDate(val);
                        }}
                        className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-indigo-500 font-medium text-slate-800"
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Synced with the left calendar picker.
                    </span>
                  </div>

                  {/* Holiday Category */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Holiday Category
                    </label>
                    <select
                      value={form.type}
                      onChange={(e) => setForm({ ...form, type: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-indigo-500 font-medium text-slate-800 cursor-pointer"
                    >
                      <option value="PUBLIC">Public Mandatory Holiday (Statutory)</option>
                      <option value="FLOATER">Floating / Optional Holiday (Flexible)</option>
                      <option value="RESTRICTED">Restricted Holiday</option>
                    </select>
                  </div>

                  {/* Notes / Description */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Notes / Description (Optional)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. National statutory holiday, company offices closed"
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-indigo-500 font-medium text-slate-800 resize-none"
                    />
                  </div>

                  {/* Repeats Every Year (Annual Holiday) Checkbox */}
                  <div
                    className={`p-3.5 rounded-2xl border transition-all ${
                      form.isRecurring
                        ? 'bg-indigo-50/90 border-indigo-200 shadow-2xs'
                        : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/60'
                    }`}
                  >
                    <label className="flex items-start gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={form.isRecurring}
                        onChange={(e) => setForm({ ...form, isRecurring: e.target.checked })}
                        className="mt-0.5 w-4 h-4 rounded text-[#5E4BE2] focus:ring-[#5E4BE2] border-slate-300 cursor-pointer shrink-0"
                      />
                      <div>
                        <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <IconRepeat className={`w-3.5 h-3.5 ${form.isRecurring ? 'text-[#5E4BE2]' : 'text-slate-500'}`} />
                          Repeats Every Year (Annual Holiday)
                        </span>
                        <span className="text-[11px] text-slate-500 block mt-0.5 leading-relaxed">
                          Save this holiday as an annual recurring event (e.g. Independence Day, Republic Day, Christmas). It will be saved in your Annual Holidays list so you can auto-populate it for upcoming years in 1 click or add it manually.
                        </span>
                      </div>
                    </label>
                  </div>

                  {/* Automated Email Announcement Notice */}
                  <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-100/80 flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-indigo-100 text-[#5E4BE2] flex items-center justify-center shrink-0">
                      <IconMail className="w-4 h-4" />
                    </div>
                    <div className="text-xs text-slate-700">
                      <span className="font-bold block text-slate-900">Automatic Email Announcement</span>
                      <span className="text-[11px] text-slate-500">
                        Holiday announcement emails are automatically sent to all active employees by the server once configured.
                      </span>
                    </div>
                  </div>

                  {/* Submit & Cancel Actions */}
                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-5 py-2 text-xs font-bold rounded-xl bg-[#5E4BE2] hover:bg-[#4d3cc9] text-white shadow-xs disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmitting ? 'Saving...' : editingHoliday ? 'Update' : 'Add to Calendar'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Automated Event & Birthday Emails Configuration Modal */}
      <EventEmailsModal
        isOpen={isEmailSettingsOpen}
        onClose={() => setIsEmailSettingsOpen(false)}
      />

      {/* ===================== FLOATING CONFIRMATION TOASTER ===================== */}
      {deletingHoliday && (
        <div className="fixed top-6 right-6 z-50 max-w-sm sm:max-w-md w-[calc(100%-3rem)] pointer-events-auto animate-in slide-in-from-top-4 fade-in duration-200">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 shadow-2xl p-4 sm:p-5 ring-1 ring-slate-900/10 transition-all">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <IconTrash className="w-5 h-5 stroke-[1.8]" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-bold text-slate-900">
                    Delete Holiday?
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      if (!isDeletingHoliday) setDeletingHoliday(null);
                    }}
                    className="p-1 -mr-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Dismiss"
                  >
                    <IconX className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                  Are you sure you want to delete <strong className="text-slate-900">"{deletingHoliday.name}"</strong> ({deletingHoliday.date}) from the company calendar?
                </p>

                {deleteError && (
                  <div className="mt-2.5 p-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex items-center gap-1.5">
                    <IconAlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                    <span>{deleteError}</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 mt-3.5 pt-2.5 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setDeletingHoliday(null)}
                    disabled={isDeletingHoliday}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDelete}
                    disabled={isDeletingHoliday}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-sm shadow-rose-600/25 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isDeletingHoliday ? 'Deleting...' : 'Confirm Delete'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== ANNUAL RECURRING HOLIDAYS RIGHT SIDEBAR DRAWER ===================== */}
      {isAnnualDrawerOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] overflow-hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in cursor-pointer"
            onClick={() => setIsAnnualDrawerOpen(false)}
          />

          {/* Slide-over Right Sidebar Panel */}
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10 pointer-events-none">
            <div
              className="w-screen max-w-md sm:max-w-lg bg-white shadow-2xl flex flex-col h-full border-l border-slate-200 pointer-events-auto animate-in slide-in-from-right duration-300 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5E4BE2] shrink-0 shadow-2xs">
                    <IconCalendarRepeat className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 leading-tight">
                      Annual Recurring Holidays
                    </h3>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">
                      Holidays defined to repeat every year
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAnnualDrawerOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Close sidebar"
                >
                  <IconX className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {/* Context & Auto-Add Banner */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/90 via-purple-50/50 to-white border border-indigo-100 space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">
                      Target Calendar Year: {selectedYear}
                    </span>
                    {missingAnnualCount === 0 ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <IconCheck className="w-3 h-3" /> All {allAnnualHolidays.length} Added
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        {missingAnnualCount} Missing in {selectedYear}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Auto-add all missing annual holidays to your <strong>{selectedYear}</strong> calendar with one click, or add individual holidays manually below.
                  </p>
                  <button
                    type="button"
                    onClick={handleAutoAddAllAnnual}
                    disabled={isBulkAdding || missingAnnualCount === 0}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer ${
                      missingAnnualCount === 0
                        ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
                        : 'bg-gradient-to-r from-[#5E4BE2] to-[#4938CA] hover:from-[#523ED4] hover:to-[#3E2EB8] text-white shadow-indigo-600/25'
                    }`}
                  >
                    <IconSparkles className={`w-4 h-4 ${isBulkAdding ? 'animate-spin' : ''}`} />
                    <span>
                      {isBulkAdding
                        ? 'Auto-Adding to Calendar...'
                        : missingAnnualCount === 0
                        ? `All Annual Holidays Already in ${selectedYear}`
                        : `Auto-Add All Missing to ${selectedYear} (${missingAnnualCount})`}
                    </span>
                  </button>
                </div>

                {/* List of Annual Recurring Holidays */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Defined Recurring Holidays ({allAnnualHolidays.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAnnualDrawerOpen(false);
                        handleOpenAdd({ isRecurring: true });
                      }}
                      className="text-xs font-bold text-[#5E4BE2] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <IconPlus className="w-3.5 h-3.5" />
                      <span>Define New</span>
                    </button>
                  </div>

                  {annualHolidayStatus.map((item, idx) => {
                    const monthNames = [
                      'January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December',
                    ];
                    const monthLabel = monthNames[item.month - 1];
                    const holidayStyle = getHolidayIcon(item.name);
                    const HolidayIcon = holidayStyle.Icon;

                    return (
                      <div
                        key={`${item.name}-${idx}`}
                        className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-between gap-3 hover:border-indigo-200 transition-all"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${holidayStyle.className}`}>
                            <HolidayIcon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-slate-900 block truncate">
                              {item.name}
                            </span>
                            <span className="text-[11px] text-slate-500 font-medium block">
                              Every {monthLabel} {item.day} • {item.type}
                            </span>
                            {item.description && (
                              <span className="text-[10px] text-slate-400 block truncate max-w-[200px]">
                                {item.description}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="shrink-0">
                          {item.isAdded ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <IconCheck className="w-3 h-3" />
                              <span>Added</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleAddSingleAnnualHoliday(item)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#5E4BE2] hover:bg-[#4D3BC9] text-white shadow-2xs transition-colors cursor-pointer"
                              title={`Add ${item.name} to ${selectedYear} calendar`}
                            >
                              <IconPlus className="w-3.5 h-3.5" />
                              <span>Add</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="p-4 px-6 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between shrink-0">
                <span className="text-[11px] text-slate-400 font-medium">
                  {allAnnualHolidays.length} recurring holiday templates
                </span>
                <button
                  type="button"
                  onClick={() => setIsAnnualDrawerOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/70 transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default HolidaysPage;
