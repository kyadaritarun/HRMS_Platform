import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  IconSettings,
  IconX,
  IconCheck,
  IconBell,
  IconShieldLock,
  IconWorld,
  IconClock,
  IconCalendar,
  IconLock,
} from '@tabler/icons-react';
import { useAuth } from '../context/AuthContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'general' | 'notifications' | 'security'>('general');

  // Form State
  const [language, setLanguage] = useState('English (US)');
  const [timeZone, setTimeZone] = useState('Asia/Kolkata (IST - GMT +05:30)');
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY');
  const [weekStart, setWeekStart] = useState('Monday');

  const [emailNotifications, setEmailNotifications] = useState(true);
  const [browserAlerts, setBrowserAlerts] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);

  const [savedToast, setSavedToast] = useState(false);

  if (!isOpen || typeof document === 'undefined') return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedToast(true);
    setTimeout(() => {
      setSavedToast(false);
      onClose();
    }, 900);
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5E4BE2] shrink-0">
              <IconSettings className="w-5 h-5 stroke-[1.8]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Application Settings</h3>
              <p className="text-xs text-slate-500">Preferences, notification alerts, and security options</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center shadow-2xs transition-colors cursor-pointer"
          >
            <IconX className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center border-b border-slate-100 px-5 pt-2 gap-2 bg-slate-50/30">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`pb-2.5 px-2 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'general'
                ? 'border-[#5E4BE2] text-[#5E4BE2]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <IconWorld className="w-3.5 h-3.5" />
            <span>General</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('notifications')}
            className={`pb-2.5 px-2 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'notifications'
                ? 'border-[#5E4BE2] text-[#5E4BE2]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <IconBell className="w-3.5 h-3.5" />
            <span>Notifications</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`pb-2.5 px-2 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'security'
                ? 'border-[#5E4BE2] text-[#5E4BE2]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <IconShieldLock className="w-3.5 h-3.5" />
            <span>Security</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 space-y-4">
          {activeTab === 'general' && (
            <div className="space-y-4 animate-in fade-in">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <IconWorld className="w-3.5 h-3.5 text-slate-400" />
                  <span>Display Language</span>
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-hidden focus:border-[#5E4BE2] cursor-pointer"
                >
                  <option value="English (US)">English (US)</option>
                  <option value="English (UK)">English (UK)</option>
                  <option value="Hindi">Hindi (हिंदी)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <IconClock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Time Zone</span>
                </label>
                <select
                  value={timeZone}
                  onChange={(e) => setTimeZone(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-hidden focus:border-[#5E4BE2] cursor-pointer"
                >
                  <option value="Asia/Kolkata (IST - GMT +05:30)">Asia/Kolkata (IST - GMT +05:30)</option>
                  <option value="UTC (GMT +00:00)">UTC (GMT +00:00)</option>
                  <option value="America/New_York (EST)">America/New_York (EST)</option>
                  <option value="Europe/London (GMT)">Europe/London (GMT)</option>
                  <option value="Asia/Singapore (SGT)">Asia/Singapore (SGT)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <IconCalendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Date Format</span>
                  </label>
                  <select
                    value={dateFormat}
                    onChange={(e) => setDateFormat(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-hidden focus:border-[#5E4BE2] cursor-pointer"
                  >
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Week Starts On
                  </label>
                  <select
                    value={weekStart}
                    onChange={(e) => setWeekStart(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-hidden focus:border-[#5E4BE2] cursor-pointer"
                  >
                    <option value="Monday">Monday</option>
                    <option value="Sunday">Sunday</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-3.5 animate-in fade-in">
              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200/80 bg-slate-50/60 hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={emailNotifications}
                  onChange={(e) => setEmailNotifications(e.target.checked)}
                  className="mt-0.5 rounded text-[#5E4BE2] focus:ring-[#5E4BE2] w-4 h-4 cursor-pointer"
                />
                <div>
                  <p className="text-xs font-bold text-slate-800">Email Notifications</p>
                  <p className="text-[11px] text-slate-500">
                    Receive email alerts for leave approvals, payroll generation, and security alerts.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200/80 bg-slate-50/60 hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={browserAlerts}
                  onChange={(e) => setBrowserAlerts(e.target.checked)}
                  className="mt-0.5 rounded text-[#5E4BE2] focus:ring-[#5E4BE2] w-4 h-4 cursor-pointer"
                />
                <div>
                  <p className="text-xs font-bold text-slate-800">In-App &amp; Push Alerts</p>
                  <p className="text-[11px] text-slate-500">
                    Receive instant push alerts for shift reminders and support ticket updates.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200/80 bg-slate-50/60 hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={weeklyDigest}
                  onChange={(e) => setWeeklyDigest(e.target.checked)}
                  className="mt-0.5 rounded text-[#5E4BE2] focus:ring-[#5E4BE2] w-4 h-4 cursor-pointer"
                />
                <div>
                  <p className="text-xs font-bold text-slate-800">Weekly Executive Digest</p>
                  <p className="text-[11px] text-slate-500">
                    Receive a consolidated summary email of organizational attendance and holidays every Monday.
                  </p>
                </div>
              </label>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-800">Account Security</p>
                    <p className="text-[11px] text-slate-500">Signed in as {user?.email}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Active Session
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-indigo-100 bg-indigo-50/40 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <IconLock className="w-3.5 h-3.5 text-[#5E4BE2]" />
                    <span>Password &amp; Credentials</span>
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Update your password and emergency recovery options.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate('/profile');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs transition-colors cursor-pointer shrink-0"
                >
                  Manage in Profile
                </button>
              </div>
            </div>
          )}

          {/* Modal Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between shrink-0">
            {savedToast ? (
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 animate-in fade-in">
                <IconCheck className="w-4 h-4" />
                <span>Preferences saved!</span>
              </span>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#5E4BE2] hover:bg-[#4D3BC9] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
