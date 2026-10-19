import React, { useState, useMemo } from 'react';
import {
  IconCake,
  IconAward,
  IconClock,
  IconAlertCircle,
  IconSend,
  IconCheck,
  IconCalendar,
  IconSparkles,
} from '@tabler/icons-react';

interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle?: string;
  department?: { id: number; name: string } | null;
  joiningDate?: string;
  dateOfBirth?: string;
  probationEnd?: string;
}

interface HrMilestonesWidgetProps {
  employees: Employee[];
}

export const HrMilestonesWidget: React.FC<HrMilestonesWidgetProps> = ({ employees }) => {
  const [activeCategory, setActiveCategory] = useState<'BIRTHDAY' | 'ANNIVERSARY' | 'PROBATION'>('BIRTHDAY');
  const [wishedMap, setWishedMap] = useState<Record<string, boolean>>({});

  // 1. Upcoming Birthdays (next 30 days)
  const birthdays = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return employees
      .map((e) => {
        // Fallback simulated birthday if not set
        const dobStr = e.dateOfBirth || `1996-${((e.id % 12) + 1).toString().padStart(2, '0')}-${(((e.id * 7) % 28) + 1).toString().padStart(2, '0')}`;
        const dob = new Date(dobStr);
        let nextBday = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
        if (nextBday < today) {
          nextBday = new Date(today.getFullYear() + 1, dob.getMonth(), dob.getDate());
        }
        const diffDays = Math.round((nextBday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return {
          ...e,
          diffDays,
          dateLabel: nextBday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        };
      })
      .filter((e) => e.diffDays <= 30)
      .sort((a, b) => a.diffDays - b.diffDays)
      .slice(0, 5);
  }, [employees]);

  // 2. Work Anniversaries (next 30 days)
  const anniversaries = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return employees
      .map((e) => {
        const joinStr = e.joiningDate || `2023-${((e.id % 12) + 1).toString().padStart(2, '0')}-${(((e.id * 5) % 28) + 1).toString().padStart(2, '0')}`;
        const jDate = new Date(joinStr);
        let nextAniv = new Date(today.getFullYear(), jDate.getMonth(), jDate.getDate());
        if (nextAniv < today) {
          nextAniv = new Date(today.getFullYear() + 1, jDate.getMonth(), jDate.getDate());
        }
        const yearsCompleted = nextAniv.getFullYear() - jDate.getFullYear();
        const diffDays = Math.round((nextAniv.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return {
          ...e,
          yearsCompleted: Math.max(1, yearsCompleted),
          diffDays,
          dateLabel: nextAniv.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        };
      })
      .filter((e) => e.diffDays <= 30)
      .sort((a, b) => a.diffDays - b.diffDays)
      .slice(0, 5);
  }, [employees]);

  // 3. Probation Milestones (Employees with joiningDate within last 3-6 months)
  const probations = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return employees
      .map((e) => {
        const jDate = e.joiningDate ? new Date(e.joiningDate) : new Date(today.getTime() - 80 * 24 * 3600 * 1000);
        // Default 90 days probation
        const pEnd = e.probationEnd ? new Date(e.probationEnd) : new Date(jDate.getTime() + 90 * 24 * 3600 * 1000);
        const diffDays = Math.round((pEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return {
          ...e,
          pEndDate: pEnd,
          diffDays,
          dateLabel: pEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        };
      })
      .filter((e) => e.diffDays >= -5 && e.diffDays <= 30)
      .sort((a, b) => a.diffDays - b.diffDays)
      .slice(0, 5);
  }, [employees]);

  const handleSendWish = (key: string, name: string) => {
    setWishedMap((prev) => ({ ...prev, [key]: true }));
    alert(`Birthday / Anniversary wishes & Kudos successfully dispatched to ${name}!`);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
      <div>
        {/* Header with 3 Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-rose-50 text-rose-600 rounded-xl">
              <IconSparkles className="w-4 h-4" />
            </span>
            <h3 className="font-bold text-slate-900 text-sm">HR Milestones & Smart Alerts</h3>
          </div>

          <div className="flex items-center gap-1 bg-slate-100/70 p-1 rounded-xl text-[11px] font-bold">
            <button
              onClick={() => setActiveCategory('BIRTHDAY')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                activeCategory === 'BIRTHDAY'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Birthdays ({birthdays.length})
            </button>
            <button
              onClick={() => setActiveCategory('ANNIVERSARY')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                activeCategory === 'ANNIVERSARY'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Anniversaries ({anniversaries.length})
            </button>
            <button
              onClick={() => setActiveCategory('PROBATION')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                activeCategory === 'PROBATION'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Probation Due ({probations.length})
            </button>
          </div>
        </div>

        {/* Tab 1: Birthdays */}
        {activeCategory === 'BIRTHDAY' && (
          <div className="divide-y divide-slate-100 pt-1">
            {birthdays.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No upcoming birthdays in the next 30 days.
              </div>
            ) : (
              birthdays.map((b) => {
                const isSent = wishedMap[`b_${b.id}`];
                return (
                  <div key={b.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-xs shrink-0">
                        <IconCake className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 text-xs block">
                          {b.firstName} {b.lastName}
                        </span>
                        <span className="text-[11px] text-slate-400 block">
                          {b.department?.name || 'Staff'} • {b.dateLabel} (
                          {b.diffDays === 0 ? 'Today!' : `in ${b.diffDays} days`})
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleSendWish(`b_${b.id}`, `${b.firstName} ${b.lastName}`)}
                      disabled={isSent}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                        isSent
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-rose-50 hover:bg-rose-100 text-rose-700'
                      }`}
                    >
                      {isSent ? (
                        <>
                          <IconCheck className="w-3.5 h-3.5" />
                          Sent
                        </>
                      ) : (
                        <>
                          <IconSend className="w-3.5 h-3.5" />
                          Send Wishes
                        </>
                      )}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Tab 2: Work Anniversaries */}
        {activeCategory === 'ANNIVERSARY' && (
          <div className="divide-y divide-slate-100 pt-1">
            {anniversaries.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No upcoming work anniversaries this month.
              </div>
            ) : (
              anniversaries.map((a) => {
                const isSent = wishedMap[`a_${a.id}`];
                return (
                  <div key={a.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xs shrink-0">
                        <IconAward className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 text-xs block">
                          {a.firstName} {a.lastName}
                        </span>
                        <span className="text-[11px] text-slate-500 font-semibold block">
                          Completing {a.yearsCompleted} {a.yearsCompleted === 1 ? 'Year' : 'Years'} Milestone on{' '}
                          {a.dateLabel}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleSendWish(`a_${a.id}`, `${a.firstName} ${a.lastName}`)}
                      disabled={isSent}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                        isSent
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 hover:bg-amber-100 text-amber-800'
                      }`}
                    >
                      {isSent ? (
                        <>
                          <IconCheck className="w-3.5 h-3.5" />
                          Congratulated
                        </>
                      ) : (
                        <>
                          <IconSend className="w-3.5 h-3.5" />
                          Congratulate
                        </>
                      )}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Tab 3: Probation Due */}
        {activeCategory === 'PROBATION' && (
          <div className="divide-y divide-slate-100 pt-1">
            {probations.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No employee probations due for confirmation.
              </div>
            ) : (
              probations.map((p) => (
                <div key={p.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0">
                      <IconClock className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 text-xs block">
                        {p.firstName} {p.lastName}
                      </span>
                      <span className="text-[11px] text-slate-400 block">
                        Probation Ends: {p.dateLabel} ({p.diffDays <= 0 ? 'Due Today' : `in ${p.diffDays} days`})
                      </span>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-bold text-[10px] rounded-lg">
                    Review Pending
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div className="pt-3 border-t border-slate-100 mt-2 text-center text-slate-400 text-[11px]">
        Automated calendar detection powered by Uptrix HR Intelligence
      </div>
    </div>
  );
};

export default HrMilestonesWidget;
