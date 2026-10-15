import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  IconClock,
  IconMapPin,
  IconBuilding,
  IconHome,
  IconRefresh,
  IconCalendarEvent,
  IconSparkles,
  IconReceipt2,
  IconHelpCircle,
  IconHeart,
  IconCheck,
  IconChevronRight,
  IconHeadset,
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
} from '@tabler/icons-react';
import api from '../../api/client';

export const EmployeeDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Time Tracker state
  const [seconds, setSeconds] = useState(0);
  const [workMode, setWorkMode] = useState<'WFO' | 'WFH' | 'HYBRID'>('WFO');
  const [activeSession, setActiveSession] = useState<{ id?: number; checkIn?: string; checkInGeo?: any } | null>(null);
  const [loadingCheck, setLoadingCheck] = useState(false);
  const [attendanceMessage, setAttendanceMessage] = useState<string | null>(null);

  // Leave balances matching design
  const [leaveBalances] = useState([
    {
      code: 'CL',
      name: 'Casual Leave',
      balance: 12,
      max: 20,
      icon: IconCalendarEvent,
      iconBg: 'bg-blue-50 text-blue-600',
      barColor: 'bg-blue-500',
      barBg: 'bg-blue-100',
    },
    {
      code: 'SL',
      name: 'Sick Leave',
      balance: 10,
      max: 20,
      icon: IconMoodSmile,
      iconBg: 'bg-emerald-50 text-emerald-600',
      barColor: 'bg-emerald-500',
      barBg: 'bg-emerald-100',
    },
    {
      code: 'EL',
      name: 'Earned Leave',
      balance: 15,
      max: 20,
      icon: IconPlane,
      iconBg: 'bg-purple-50 text-purple-600',
      barColor: 'bg-purple-500',
      barBg: 'bg-purple-100',
    },
    {
      code: 'FH',
      name: 'Floater Holiday',
      balance: 2,
      max: 5,
      icon: IconSun,
      iconBg: 'bg-amber-50 text-amber-500',
      barColor: 'bg-amber-400',
      barBg: 'bg-amber-100',
    },
    {
      code: 'CO',
      name: 'Comp Off',
      balance: 0,
      max: 5,
      icon: IconBriefcase,
      iconBg: 'bg-rose-50 text-rose-500',
      barColor: 'bg-rose-400',
      barBg: 'bg-rose-100',
    },
  ]);

  // Fetch current attendance punch status
  const fetchActiveSession = async () => {
    try {
      const res = await api.get('/attendance/me');
      if (res.data?.activeSession) {
        setActiveSession(res.data.activeSession);
      } else {
        setActiveSession(null);
      }
    } catch {
      // Graceful fallback for mock/offline display
    }
  };

  useEffect(() => {
    fetchActiveSession();
  }, []);

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
        } else {
          await api.post('/attendance/check-out', { latitude, longitude });
          setActiveSession(null);
          setAttendanceMessage('Successfully checked out! Have a good day.');
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

      {/* 2. Grid: Time & Attendance Check-In + Quick Actions & Shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Time & Attendance Check-In (Left Box) */}
        <div className="lg:col-span-6 xl:col-span-7 bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
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
                    : 'bg-slate-100 text-slate-600'
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
            <div className="p-5 bg-[#f8fafc] rounded-2xl border border-slate-100 flex flex-col items-center justify-center my-4">
              <div className="text-4xl sm:text-[44px] font-black text-[#0f172a] tracking-tight font-mono leading-none">
                {formatTimer(seconds)}
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-400 mt-2 font-medium">
                <IconMapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>
                  {activeSession?.checkInGeo?.address || 'Current Location Verified via GPS'}
                </span>
              </div>
            </div>

            {/* Work Mode Toggle: On-site, Remote, Hybrid */}
            <div className="grid grid-cols-3 gap-3 my-4">
              {[
                { mode: 'WFO', label: 'On-site', icon: IconBuilding },
                { mode: 'WFH', label: 'Remote', icon: IconHome },
                { mode: 'HYBRID', label: 'Hybrid', icon: IconRefresh },
              ].map((m) => {
                const isSelected = workMode === m.mode;
                const ModeIcon = m.icon;
                return (
                  <button
                    key={m.mode}
                    type="button"
                    onClick={() => setWorkMode(m.mode as any)}
                    className={`py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50/70 border-2 border-indigo-600 text-indigo-700 shadow-2xs'
                        : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <ModeIcon className={`w-4 h-4 ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>

            {attendanceMessage && (
              <div className="text-xs p-3 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 font-medium mb-4 flex items-center gap-2">
                <IconCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>{attendanceMessage}</span>
              </div>
            )}
          </div>

          {/* Action Button */}
          {activeSession ? (
            <button
              onClick={() => handleCheckAction('check-out')}
              disabled={loadingCheck}
              className="w-full py-3.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-[0.99] transition-all shadow-md shadow-rose-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <IconPlayerStop className="w-4 h-4 fill-white" />
              <span>{loadingCheck ? 'Recording Check-Out...' : 'Check Out (End Shift)'}</span>
            </button>
          ) : (
            <button
              onClick={() => handleCheckAction('check-in')}
              disabled={loadingCheck}
              className="w-full py-3.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#4338ca] hover:bg-[#3730a3] active:scale-[0.99] transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <IconPlayerPlay className="w-4 h-4 fill-white" />
              <span>{loadingCheck ? 'Recording Check-In...' : 'Check In (Start Shift)'}</span>
            </button>
          )}
        </div>

        {/* Quick Actions & Shortcuts (Right Box) */}
        <div className="lg:col-span-6 xl:col-span-5 bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 mb-4">
              Quick Actions & Shortcuts
            </h3>

            {/* 2x2 Grid of cards */}
            <div className="grid grid-cols-2 gap-3.5">
              {/* AI Assistant */}
              <button
                onClick={() => navigate('/assistant')}
                className="p-4 rounded-2xl border border-purple-100 bg-[#fbf9ff] hover:bg-purple-50/60 hover:border-purple-200 text-left transition-all group cursor-pointer flex flex-col justify-between"
              >
                <div className="flex items-center justify-between w-full mb-3">
                  <IconSparkles className="w-5 h-5 text-indigo-600" />
                  <IconChevronRight className="w-4 h-4 text-indigo-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">AI Assistant</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Ask policy queries</div>
                </div>
              </button>

              {/* Submit Claim */}
              <button
                onClick={() => navigate('/claims')}
                className="p-4 rounded-2xl border border-blue-100 bg-[#f8faff] hover:bg-blue-50/60 hover:border-blue-200 text-left transition-all group cursor-pointer flex flex-col justify-between"
              >
                <div className="flex items-center justify-between w-full mb-3">
                  <IconReceipt2 className="w-5 h-5 text-blue-600" />
                  <IconChevronRight className="w-4 h-4 text-blue-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Submit Claim</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Expense reimbursement</div>
                </div>
              </button>

              {/* Helpdesk */}
              <button
                onClick={() => navigate('/tickets')}
                className="p-4 rounded-2xl border border-amber-100 bg-[#fffdf8] hover:bg-amber-50/60 hover:border-amber-200 text-left transition-all group cursor-pointer flex flex-col justify-between"
              >
                <div className="flex items-center justify-between w-full mb-3">
                  <IconHelpCircle className="w-5 h-5 text-amber-500" />
                  <IconChevronRight className="w-4 h-4 text-amber-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Helpdesk</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Raise IT/HR tickets</div>
                </div>
              </button>

              {/* Send Kudos */}
              <button
                onClick={() => navigate('/appreciations')}
                className="p-4 rounded-2xl border border-rose-100 bg-[#fffafb] hover:bg-rose-50/60 hover:border-rose-200 text-left transition-all group cursor-pointer flex flex-col justify-between"
              >
                <div className="flex items-center justify-between w-full mb-3">
                  <IconHeart className="w-5 h-5 text-rose-500" />
                  <IconChevronRight className="w-4 h-4 text-rose-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Send Kudos</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Appreciate a peer</div>
                </div>
              </button>
            </div>
          </div>

          {/* Urgent Assistance Banner */}
          <button
            onClick={() => navigate('/tickets')}
            className="mt-4 p-3.5 bg-blue-50/40 hover:bg-blue-50/80 border border-blue-100/80 rounded-2xl flex items-center justify-between gap-3 text-left transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-blue-100/60 text-blue-600 flex items-center justify-center shrink-0">
                <IconHeadset className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-800">Need urgent assistance?</div>
                <div className="text-[11px] text-slate-500 truncate">
                  Raise a support ticket or ping your HR representative directly.
                </div>
              </div>
            </div>
            <IconChevronRight className="w-4 h-4 text-blue-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
          </button>
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

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {leaveBalances.map((lb) => {
            const IconComp = lb.icon;
            const pct = Math.min(100, Math.round((lb.balance / lb.max) * 100));

            return (
              <div
                key={lb.code}
                onClick={() => navigate('/leaves')}
                className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all cursor-pointer flex flex-col justify-between"
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
                    <div className="text-[11px] font-semibold text-slate-500 mt-0.5">
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
          })}
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
              All team members are present today 🎉
            </p>

            <div className="mt-4 p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <IconCheck className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">No one is on leave today</div>
                <div className="text-[11px] text-slate-500">Great teamwork!</div>
              </div>
            </div>
          </div>
        </div>

        {/* Upcoming Birthdays */}
        <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <IconCake className="w-4 h-4 text-rose-500" />
              <h4 className="text-sm font-bold text-slate-900">Upcoming Birthdays</h4>
            </div>

            <div className="divide-y divide-slate-100">
              <div className="py-2.5 flex items-center justify-between group cursor-pointer hover:bg-slate-50/50 px-1 rounded-xl transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-bold text-xs flex items-center justify-center shrink-0">
                    SC
                  </div>
                  <span className="text-xs font-bold text-slate-800">Sarah Connor</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <span className="text-[11px] font-medium">18 Nov</span>
                  <IconChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>

              <div className="py-2.5 flex items-center justify-between group cursor-pointer hover:bg-slate-50/50 px-1 rounded-xl transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
                    AV
                  </div>
                  <span className="text-xs font-bold text-slate-800">Alex Vance</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <span className="text-[11px] font-medium">04 Dec</span>
                  <IconChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>
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

            <div className="divide-y divide-slate-100">
              <div className="py-2.5 flex items-center justify-between group cursor-pointer hover:bg-slate-50/50 px-1 rounded-xl transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
                    <IconSparkles className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">Diwali Festival</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <span className="text-[11px] font-medium">08 Nov</span>
                  <IconChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>

              <div className="py-2.5 flex items-center justify-between group cursor-pointer hover:bg-slate-50/50 px-1 rounded-xl transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-500 flex items-center justify-center shrink-0">
                    <IconCalendarEvent className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">Christmas Day</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <span className="text-[11px] font-medium">25 Dec</span>
                  <IconChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
