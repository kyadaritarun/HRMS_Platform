import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  IconSettings,
  IconX,
  IconCheck,
  IconBell,
  IconShieldLock,
  IconLock,
  IconLayoutSidebar,
  IconBriefcase,
  IconDevices,
  IconCash,
} from '@tabler/icons-react';
import { useAuth } from '../context/AuthContext';
import {
  SidebarOpsVisibility,
  getSidebarOpsVisibility,
  saveSidebarOpsToDb,
  fetchSidebarOpsFromDb,
} from '../utils/sidebarPreferences';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { user, company } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'sidebar' | 'notifications' | 'security'>('sidebar');

  // Notifications State
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [browserAlerts, setBrowserAlerts] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);

  // Sidebar Operations Visibility
  const [sidebarOps, setSidebarOps] = useState<SidebarOpsVisibility>(() =>
    getSidebarOpsVisibility(user?.id, company?.settings)
  );

  const [savedToast, setSavedToast] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Sync state whenever modal opens or user/company changes, and fetch latest from DB
  useEffect(() => {
    if (isOpen) {
      try {
        const savedNotif = localStorage.getItem('user_notification_settings');
        if (savedNotif) {
          const parsed = JSON.parse(savedNotif);
          if (parsed.emailNotifications !== undefined) setEmailNotifications(parsed.emailNotifications);
          if (parsed.browserAlerts !== undefined) setBrowserAlerts(parsed.browserAlerts);
          if (parsed.weeklyDigest !== undefined) setWeeklyDigest(parsed.weeklyDigest);
        }
      } catch {
        // ignore parse errors
      }

      setSidebarOps(getSidebarOpsVisibility(user?.id, company?.settings));
      if (user?.role === 'COMPANY_ADMIN') {
        fetchSidebarOpsFromDb(user?.id).then((ops) => {
          if (ops) setSidebarOps(ops);
        });
      }
    }
  }, [isOpen, user?.id, company?.settings]);

  if (!isOpen || typeof document === 'undefined') return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    if (user?.role === 'COMPANY_ADMIN') {
      await saveSidebarOpsToDb(sidebarOps, user?.id);
    }
    try {
      localStorage.setItem(
        'user_notification_settings',
        JSON.stringify({ emailNotifications, browserAlerts, weeklyDigest })
      );
    } catch {
      // ignore
    }
    setIsSaving(false);
    setSavedToast(true);
    setTimeout(() => {
      setSavedToast(false);
      onClose();
    }, 900);
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in cursor-pointer"
        onClick={onClose}
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
                <IconSettings className="w-5 h-5 stroke-[1.8]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 leading-tight">Application Settings</h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Sidebar operations, notification alerts, and security options
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-500 font-medium hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Close panel"
            >
              <IconX className="w-5 h-5" />
            </button>
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center border-b border-slate-100 px-6 pt-2.5 gap-2 bg-slate-50/50 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('sidebar')}
              className={`pb-2.5 px-2 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'sidebar'
                  ? 'border-[#5E4BE2] text-[#5E4BE2]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <IconLayoutSidebar className="w-4 h-4" />
              <span>Sidebar Operations</span>
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
              <IconBell className="w-4 h-4" />
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
              <IconShieldLock className="w-4 h-4" />
              <span>Security</span>
            </button>
          </div>

          {/* Form Body - scrollable */}
          <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Sidebar Operations Tab */}
              {activeTab === 'sidebar' && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="flex items-center justify-between pb-1">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <IconLayoutSidebar className="w-4 h-4 text-[#5E4BE2]" />
                        <span>Sidebar Operations Visibility</span>
                      </h4>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                        {user?.role === 'COMPANY_ADMIN'
                          ? 'Configure which operation modules are displayed in the company sidebar.'
                          : 'Operational modules enabled for your organization.'}
                      </p>
                    </div>
                    {user?.role === 'COMPANY_ADMIN' ? (
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-indigo-50 text-[#5E4BE2] border border-indigo-100 shrink-0">
                        Company Admin
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                        Company Policy
                      </span>
                    )}
                  </div>

                  <div className="space-y-3">
                    {/* HR Operations */}
                    <label
                      className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all ${
                        user?.role === 'COMPANY_ADMIN' ? 'cursor-pointer' : 'cursor-default'
                      } ${
                        sidebarOps.hr_operations
                          ? 'border-indigo-200/90 bg-indigo-50/20 shadow-2xs'
                          : 'border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 opacity-70'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={sidebarOps.hr_operations}
                        disabled={user?.role !== 'COMPANY_ADMIN'}
                        onChange={(e) =>
                          setSidebarOps((prev) => ({ ...prev, hr_operations: e.target.checked }))
                        }
                        className="mt-0.5 rounded text-[#5E4BE2] focus:ring-[#5E4BE2] w-4 h-4 cursor-pointer accent-[#5E4BE2] disabled:cursor-not-allowed"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <IconBriefcase className="w-4 h-4 text-[#5E4BE2]" />
                            <span className="text-xs font-bold text-slate-800">HR Operations</span>
                          </div>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              sidebarOps.hr_operations
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                : 'bg-slate-100 text-slate-500 border border-slate-200/60'
                            }`}
                          >
                            {sidebarOps.hr_operations ? 'Active' : 'Disabled'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium mt-1 leading-relaxed">
                          Departments, Shift &amp; Roster, Holidays, Leaves, Policies, Employees &amp; Attendance
                        </p>
                      </div>
                    </label>

                    {/* IT Operations */}
                    <label
                      className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all ${
                        user?.role === 'COMPANY_ADMIN' ? 'cursor-pointer' : 'cursor-default'
                      } ${
                        sidebarOps.it_operations
                          ? 'border-indigo-200/90 bg-indigo-50/20 shadow-2xs'
                          : 'border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 opacity-70'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={sidebarOps.it_operations}
                        disabled={user?.role !== 'COMPANY_ADMIN'}
                        onChange={(e) =>
                          setSidebarOps((prev) => ({ ...prev, it_operations: e.target.checked }))
                        }
                        className="mt-0.5 rounded text-[#5E4BE2] focus:ring-[#5E4BE2] w-4 h-4 cursor-pointer accent-[#5E4BE2] disabled:cursor-not-allowed"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <IconDevices className="w-4 h-4 text-[#5E4BE2]" />
                            <span className="text-xs font-bold text-slate-800">IT Operations</span>
                          </div>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              sidebarOps.it_operations
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                : 'bg-slate-100 text-slate-500 border border-slate-200/60'
                            }`}
                          >
                            {sidebarOps.it_operations ? 'Active' : 'Disabled'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium mt-1 leading-relaxed">
                          Assets inventory, hardware &amp; equipment tracking, IT onboarding
                        </p>
                      </div>
                    </label>

                    {/* Finance Operations */}
                    <label
                      className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all ${
                        user?.role === 'COMPANY_ADMIN' ? 'cursor-pointer' : 'cursor-default'
                      } ${
                        sidebarOps.finance_operations
                          ? 'border-indigo-200/90 bg-indigo-50/20 shadow-2xs'
                          : 'border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 opacity-70'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={sidebarOps.finance_operations}
                        disabled={user?.role !== 'COMPANY_ADMIN'}
                        onChange={(e) =>
                          setSidebarOps((prev) => ({ ...prev, finance_operations: e.target.checked }))
                        }
                        className="mt-0.5 rounded text-[#5E4BE2] focus:ring-[#5E4BE2] w-4 h-4 cursor-pointer accent-[#5E4BE2] disabled:cursor-not-allowed"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <IconCash className="w-4 h-4 text-[#5E4BE2]" />
                            <span className="text-xs font-bold text-slate-800">Finance Operations</span>
                          </div>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              sidebarOps.finance_operations
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                : 'bg-slate-100 text-slate-500 border border-slate-200/60'
                            }`}
                          >
                            {sidebarOps.finance_operations ? 'Active' : 'Disabled'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium mt-1 leading-relaxed">
                          Payroll analytics, Salary master, Loans &amp; advances, Tax declarations, Compliance &amp; Exits
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* Notifications Tab */}
              {activeTab === 'notifications' && (
                <div className="space-y-3.5 animate-in fade-in">
                  <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/60 hover:bg-slate-50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={emailNotifications}
                      onChange={(e) => setEmailNotifications(e.target.checked)}
                      className="mt-0.5 rounded text-[#5E4BE2] focus:ring-[#5E4BE2] w-4 h-4 cursor-pointer accent-[#5E4BE2]"
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-800">Email Notifications</p>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5 leading-relaxed">
                        Receive email alerts for leave approvals, payroll generation, and security alerts.
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/60 hover:bg-slate-50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={browserAlerts}
                      onChange={(e) => setBrowserAlerts(e.target.checked)}
                      className="mt-0.5 rounded text-[#5E4BE2] focus:ring-[#5E4BE2] w-4 h-4 cursor-pointer accent-[#5E4BE2]"
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-800">In-App &amp; Push Alerts</p>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5 leading-relaxed">
                        Receive instant push alerts for shift reminders and support ticket updates.
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/60 hover:bg-slate-50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={weeklyDigest}
                      onChange={(e) => setWeeklyDigest(e.target.checked)}
                      className="mt-0.5 rounded text-[#5E4BE2] focus:ring-[#5E4BE2] w-4 h-4 cursor-pointer accent-[#5E4BE2]"
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-800">Weekly Executive Digest</p>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5 leading-relaxed">
                        Receive a consolidated summary email of organizational attendance and holidays every Monday.
                      </p>
                    </div>
                  </label>
                </div>
              )}

              {/* Security Tab */}
              {activeTab === 'security' && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-slate-800">Account Security</p>
                        <p className="text-[11px] text-slate-500 font-medium">Signed in as {user?.email}</p>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
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
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">
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
            </div>

            {/* Drawer Footer - pinned */}
            <div className="p-4 px-6 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between shrink-0">
              {savedToast ? (
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 animate-in fade-in">
                  <IconCheck className="w-4 h-4" />
                  <span>Preferences saved!</span>
                </span>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#5E4BE2] to-[#4B39C3] hover:from-[#5340D4] hover:to-[#4130B4] disabled:opacity-50 transition-all shadow-sm shadow-indigo-600/25 cursor-pointer"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default SettingsModal;
