import React, { useState, useEffect } from 'react';
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
} from '@tabler/icons-react';

export interface ShiftTiming {
  id: string;
  name: string;
  code: string;
  startTime: string;
  endTime: string;
  breakDurationMinutes: number;
  gracePeriodMinutes: number;
  color: string;
  isNightShift?: boolean;
}

const DEFAULT_SHIFTS: ShiftTiming[] = [
  {
    id: 's-general',
    name: 'General Shift',
    code: 'GS',
    startTime: '09:30',
    endTime: '18:30',
    breakDurationMinutes: 60,
    gracePeriodMinutes: 15,
    color: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  },
  {
    id: 's-morning',
    name: 'Morning Shift',
    code: 'MS',
    startTime: '06:00',
    endTime: '14:30',
    breakDurationMinutes: 30,
    gracePeriodMinutes: 10,
    color: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  {
    id: 's-evening',
    name: 'Evening Shift',
    code: 'ES',
    startTime: '14:00',
    endTime: '22:30',
    breakDurationMinutes: 30,
    gracePeriodMinutes: 10,
    color: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  {
    id: 's-night',
    name: 'Night Shift',
    code: 'NS',
    startTime: '22:00',
    endTime: '06:30',
    breakDurationMinutes: 45,
    gracePeriodMinutes: 15,
    isNightShift: true,
    color: 'bg-purple-100 text-purple-800 border-purple-200',
  },
  {
    id: 's-off',
    name: 'Weekly Off',
    code: 'WO',
    startTime: '-',
    endTime: '-',
    breakDurationMinutes: 0,
    gracePeriodMinutes: 0,
    color: 'bg-slate-100 text-slate-500 border-slate-200',
  },
];

const STORAGE_KEY = 'uptrix_shift_roster_data';

export const ShiftRosterPage: React.FC = () => {
  const { company } = useAuth();
  const [employees, setEmployees] = useState<any[]>([]);
  const [shifts, setShifts] = useState<ShiftTiming[]>(DEFAULT_SHIFTS);
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

  // Modal: Add Custom Shift
  const [showAddShiftModal, setShowAddShiftModal] = useState(false);
  const [newShift, setNewShift] = useState({
    name: '',
    code: '',
    startTime: '08:00',
    endTime: '17:00',
    breakDurationMinutes: 45,
    gracePeriodMinutes: 15,
  });

  // Modal: Bulk Assign
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkShiftCode, setBulkShiftCode] = useState('GS');
  const [bulkDepartment, setBulkDepartment] = useState('ALL');

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
    employees.forEach((emp) => {
      if (bulkDepartment !== 'ALL' && emp.department?.name !== bulkDepartment) return;
      currentWeekDates.forEach((d) => {
        const dateStr = d.toISOString().split('T')[0];
        // Don't override weekend unless intended
        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
        updated[`${emp.id}_${dateStr}`] = isWeekend ? 'WO' : bulkShiftCode;
      });
    });
    setRosterMap(updated);
    setShowBulkModal(false);
  };

  const handleCreateShift = (e: React.FormEvent) => {
    e.preventDefault();
    const created: ShiftTiming = {
      id: `s-${Date.now()}`,
      name: newShift.name,
      code: newShift.code.toUpperCase().slice(0, 3),
      startTime: newShift.startTime,
      endTime: newShift.endTime,
      breakDurationMinutes: Number(newShift.breakDurationMinutes),
      gracePeriodMinutes: Number(newShift.gracePeriodMinutes),
      color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    };
    setShifts([...shifts, created]);
    setShowAddShiftModal(false);
    setNewShift({
      name: '',
      code: '',
      startTime: '08:00',
      endTime: '17:00',
      breakDurationMinutes: 45,
      gracePeriodMinutes: 15,
    });
  };

  // Distinct departments
  const departments = Array.from(new Set(employees.map((e) => e.department?.name).filter(Boolean)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <IconClock className="w-7 h-7 text-indigo-600" />
            Shift & Roster Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure rotational shifts, morning/night hours, grace periods, and weekly employee roster planning.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('ROSTER')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'ROSTER'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            Weekly Roster View
          </button>
          <button
            onClick={() => setActiveTab('SHIFTS_MASTER')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'SHIFTS_MASTER'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            Shift Master & Rules
          </button>
        </div>
      </div>

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
                Bulk Assign Roster
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
                          const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                          const currentCode = rosterMap[key] || (isWeekend ? 'WO' : 'GS');
                          const activeShift = shifts.find((s) => s.code === currentCode) || shifts[0];

                          return (
                            <td key={dateStr} className="px-2 py-3 text-center">
                              <select
                                value={currentCode}
                                onChange={(e) => handleSetShift(emp.id, dateStr, e.target.value)}
                                className={`px-2 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer w-full text-center ${activeShift.color}`}
                              >
                                {shifts.map((s) => (
                                  <option key={s.id} value={s.code}>
                                    {s.code} ({s.name})
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
          <div className="flex justify-between items-center">
            <p className="text-xs text-slate-500 font-medium">
              Configure standardized work timings, automated grace periods for check-in delays, and overtime multipliers.
            </p>
            <button
              onClick={() => setShowAddShiftModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              <IconPlus className="w-4 h-4" />
              Create Custom Shift
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {shifts.map((s) => (
              <div
                key={s.id}
                className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-lg border text-xs font-black ${s.color}`}>
                        {s.code}
                      </span>
                      <h3 className="font-bold text-slate-900 text-sm">{s.name}</h3>
                    </div>
                    {s.isNightShift && (
                      <span className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
                        <IconMoon className="w-4 h-4" />
                      </span>
                    )}
                  </div>

                  <div className="pt-3 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Working Hours:</span>
                      <span className="font-bold text-slate-900">
                        {s.startTime} - {s.endTime}
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

                <div className="pt-3 border-t border-slate-100 text-slate-400 text-[11px]">
                  Applied automatically to geo-fenced attendance checks
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Bulk Assign */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <IconUsers className="w-5 h-5 text-indigo-600" />
              Bulk Assign Shift to Roster
            </h2>
            <p className="text-xs text-slate-500">
              Apply a specific shift timing to all employees in the current week (weekends remain Weekly Off).
            </p>

            <div className="space-y-3 pt-2">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Target Department</label>
                <select
                  value={bulkDepartment}
                  onChange={(e) => setBulkDepartment(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
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
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold"
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
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
              <button
                onClick={() => setShowBulkModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkAssign}
                className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs"
              >
                Apply to This Week
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Shift */}
      {showAddShiftModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <IconClock className="w-5 h-5 text-indigo-600" />
              Create Custom Shift
            </h2>

            <form onSubmit={handleCreateShift} className="space-y-3 pt-2">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Shift Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Afternoon Support Shift"
                  value={newShift.name}
                  onChange={(e) => setNewShift({ ...newShift, name: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Shift Code (2-3 chars)</label>
                <input
                  type="text"
                  required
                  maxLength={3}
                  placeholder="e.g. AS"
                  value={newShift.code}
                  onChange={(e) => setNewShift({ ...newShift, code: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl uppercase font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Start Time</label>
                  <input
                    type="time"
                    required
                    value={newShift.startTime}
                    onChange={(e) => setNewShift({ ...newShift, startTime: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">End Time</label>
                  <input
                    type="time"
                    required
                    value={newShift.endTime}
                    onChange={(e) => setNewShift({ ...newShift, endTime: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Break (Mins)</label>
                  <input
                    type="number"
                    value={newShift.breakDurationMinutes}
                    onChange={(e) =>
                      setNewShift({ ...newShift, breakDurationMinutes: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Grace Period (Mins)</label>
                  <input
                    type="number"
                    value={newShift.gracePeriodMinutes}
                    onChange={(e) =>
                      setNewShift({ ...newShift, gracePeriodMinutes: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddShiftModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs"
                >
                  Save Shift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShiftRosterPage;
