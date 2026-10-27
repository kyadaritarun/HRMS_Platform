import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '../../api/client';
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
}

const STORAGE_KEY = 'uptrix_shift_roster_data';

export const ShiftRosterPage: React.FC = () => {
  const { company } = useAuth();
  const [employees, setEmployees] = useState<any[]>([]);
  const [shifts, setShifts] = useState<ShiftTiming[]>([]);
  const [loadingShifts, setLoadingShifts] = useState(true);
  const [activeTab, setActiveTab] = useState<'ROSTER' | 'SHIFTS_MASTER'>('ROSTER');

  // Week navigation
  const [weekOffset, setWeekOffset] = useState(0);

  // Roster assignments map: `empId_dateStr` -> shiftCode
  const [rosterMap, setRosterMap] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return {};
  });

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
  });

  // Modal: Bulk Assign
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkShiftCode, setBulkShiftCode] = useState('');
  const [bulkDepartment, setBulkDepartment] = useState('ALL');

  // Fetch employees
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const res = await api.get('/employees?pageSize=100');
        setEmployees(res.data?.items || []);
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
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rosterMap));
    } catch (_) {}
  }, [rosterMap]);

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
  };

  const handleBulkAssign = () => {
    const updated = { ...rosterMap };
    const offShift = shifts.find((s) => s.startTime === '-' && s.endTime === '-');
    const offCode = offShift ? offShift.code : '';

    employees.forEach((emp) => {
      if (bulkDepartment !== 'ALL' && emp.department?.name !== bulkDepartment) return;
      currentWeekDates.forEach((d) => {
        const dateStr = d.toISOString().split('T')[0];
        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
        updated[`${emp.id}_${dateStr}`] = isWeekend && offCode ? offCode : bulkShiftCode;
      });
    });
    setRosterMap(updated);
    setShowBulkModal(false);
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

  // Distinct departments
  const departments = Array.from(new Set(employees.map((e) => e.department?.name).filter(Boolean)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {activeTab === 'ROSTER' ? (
          <>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <IconClock className="w-5 h-5 text-indigo-600 shrink-0" />
                <span>Shift & Roster Management</span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure rotational shifts, morning/night hours, grace periods, and weekly employee roster planning.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('SHIFTS_MASTER')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs transition-all cursor-pointer"
              >
                <IconSettings className="w-4 h-4 text-indigo-600" />
                <span>Shift Rules</span>
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveTab('ROSTER')}
                className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-all cursor-pointer shadow-2xs shrink-0"
                title="Back to Weekly Roster View"
              >
                <IconArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h1 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                  <IconSettings className="w-5 h-5 text-indigo-600 shrink-0" />
                  <span>Shift Master & Rules</span>
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure standardized work timings, automated grace periods for check-in delays, and overtime multipliers.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenCreateShift}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <IconPlus className="w-4 h-4" />
                <span>Create Custom Shift</span>
              </button>
            </div>
          </>
        )}
      </div>

      {saveSuccessMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-semibold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <IconCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveSuccessMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSaveSuccessMessage(null)}
            className="text-emerald-600 hover:text-emerald-900 cursor-pointer"
          >
            <IconX className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {activeTab === 'ROSTER' ? (
        <div className="space-y-4">
          {/* Controls: Week navigator + Bulk Assign button */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setWeekOffset(weekOffset - 1)}
                className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600"
              >
                <IconChevronLeft className="w-4 h-4" />
              </button>
              <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 flex items-center gap-2">
                <IconCalendar className="w-4 h-4 text-indigo-600" />
                <span>
                  {currentWeekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} –{' '}
                  {currentWeekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              <button
                onClick={() => setWeekOffset(weekOffset + 1)}
                className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600"
              >
                <IconChevronRight className="w-4 h-4" />
              </button>
              {weekOffset !== 0 && (
                <button
                  onClick={() => setWeekOffset(0)}
                  className="px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:underline"
                >
                  This Week
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              {/* Legend preview */}
              <div className="hidden lg:flex items-center gap-2 text-[11px] font-semibold text-slate-600">
                {shifts.map((s) => (
                  <span key={s.id} className={`px-2 py-0.5 rounded-md border text-[10px] ${s.color}`}>
                    {s.code}: {s.name}
                  </span>
                ))}
              </div>

              <button
                onClick={() => setShowBulkModal(true)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
              >
                Bulk Assign
              </button>
            </div>
          </div>

          {/* Weekly Interactive Roster Matrix Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-[#e5e7eb] text-xs font-bold text-slate-900 border-b border-slate-300">
                  <tr>
                    <th className="px-6 py-4 w-64">Employee</th>
                    {currentWeekDates.map((d) => {
                      const isToday = d.toDateString() === new Date().toDateString();
                      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                      return (
                        <th
                          key={d.toISOString()}
                          className={`px-3 py-4 text-center min-w-[110px] ${
                            isToday ? 'bg-indigo-50/70 text-indigo-900 font-black' : isWeekend ? 'bg-slate-100/50' : ''
                          }`}
                        >
                          <span className="block text-[10px] uppercase font-bold text-slate-400">
                            {d.toLocaleDateString('en-US', { weekday: 'short' })}
                          </span>
                          <span className="text-sm font-bold text-slate-900">{d.getDate()}</span>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {employees.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                        No employees found. Add employees first to plan shifts.
                      </td>
                    </tr>
                  ) : (
                    employees.map((emp) => (
                      <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900">{emp.firstName} {emp.lastName}</div>
                          <div className="text-[11px] text-slate-400">{emp.department?.name || 'General'} • {emp.jobTitle}</div>
                        </td>

                        {currentWeekDates.map((d) => {
                          const dateStr = d.toISOString().split('T')[0];
                          const key = `${emp.id}_${dateStr}`;
                          const currentCode = rosterMap[key] || '';
                          const activeShift = shifts.find((s) => s.code === currentCode);

                          return (
                            <td key={dateStr} className="px-2 py-3 text-center">
                              <select
                                value={currentCode}
                                title={activeShift ? `${activeShift.code}: ${activeShift.name} (${activeShift.startTime} - ${activeShift.endTime})` : 'Select shift'}
                                onChange={(e) => handleSetShift(emp.id, dateStr, e.target.value)}
                                className={`px-2 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer w-full text-center ${activeShift?.color || 'bg-slate-50 text-slate-700 border-slate-200'}`}
                              >
                                <option value="">-</option>
                                {shifts.map((s) => (
                                  <option key={s.id} value={s.code} title={`${s.name} (${s.startTime} - ${s.endTime})`}>
                                    {s.code}
                                  </option>
                                ))}
                              </select>
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Shifts Master View */
        <div className="space-y-4">
          {loadingShifts ? (
            <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2 bg-white rounded-3xl border border-slate-200">
              <IconLoader2 className="w-6 h-6 animate-spin text-indigo-600" />
              <span className="text-xs font-semibold text-slate-600">Loading shift rules from database...</span>
            </div>
          ) : shifts.length === 0 ? (
            <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3 bg-white rounded-3xl border border-slate-200">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <IconClock className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">No shifts configured in database</h4>
                <p className="text-xs text-slate-500 mt-0.5">Create your company's standard shifts to get started</p>
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
                        <h3 className="font-bold text-slate-900 text-sm">{s.name}</h3>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {s.isNightShift && (
                          <span className="p-1.5 bg-purple-50 text-purple-600 rounded-lg" title="Night Shift">
                            <IconMoon className="w-4 h-4" />
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleOpenEditShift(s)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          title={`Edit ${s.name}`}
                        >
                          <IconPencil className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="pt-3 space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Working Hours:</span>
                        <span className="font-bold text-slate-900">
                          {s.startTime === '-' && s.endTime === '-' ? '---' : `${s.startTime} - ${s.endTime}`}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Break Duration:</span>
                        <span className="font-semibold text-slate-700">{s.breakDurationMinutes} mins</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Late Check-in Grace:</span>
                        <span className="font-semibold text-emerald-600">{s.gracePeriodMinutes} mins</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-slate-400 text-[11px]">
                    <span>Applied automatically to geo-fenced attendance checks</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteShift(s.id, s.name)}
                      className="text-slate-400 hover:text-rose-600 p-1 hover:bg-rose-50 rounded transition-colors cursor-pointer"
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
                    <p className="text-xs text-slate-500">Apply a shift timing to all employees in the current week</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
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
                    Note: Weekends (Saturday &amp; Sunday) will automatically remain Weekly Off (WO).
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

      {/* ===================== SHIFT EDIT & CREATE RIGHT-SIDE DRAWER ===================== */}
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
                      {editingShift ? `Edit Shift: ${editingShift.name}` : 'Create Custom Shift'}
                    </h3>
                    <p className="text-xs text-slate-500">
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
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
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
                    <p className="text-[11px] text-slate-500">
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
                    <span>{isSavingShift ? 'Saving to Database...' : editingShift ? 'Save Changes' : 'Create Shift'}</span>
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
