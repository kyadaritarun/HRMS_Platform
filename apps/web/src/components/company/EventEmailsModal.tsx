import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import {
  IconX,
  IconMail,
  IconCake,
  IconSparkles,
  IconCalendarEvent,
  IconCheck,
  IconAlertCircle,
  IconLoader2,
  IconPlayerPlay,
} from '@tabler/icons-react';

interface EventEmailsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EventEmailsModal: React.FC<EventEmailsModalProps> = ({ isOpen, onClose }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [settings, setSettings] = useState({
    autoBirthdayEmails: true,
    autoHolidayEmails: true,
    holidayNoticeDays: 1,
    customBirthdayMessage: '',
    customHolidayMessage: '',
  });

  const [activeTab, setActiveTab] = useState<'settings' | 'preview'>('settings');

  useEffect(() => {
    if (!isOpen) return;
    const fetchSettings = async () => {
      setIsLoading(true);
      setFeedback(null);
      try {
        const res = await api.get('/company/event-emails/settings');
        if (res.data?.settings) {
          setSettings(res.data.settings);
        }
      } catch (err: any) {
        console.error('Failed to load email settings:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, [isOpen]);

  const handleSave = async () => {
    setIsSaving(true);
    setFeedback(null);
    try {
      const res = await api.put('/company/event-emails/settings', settings);
      setFeedback({
        type: 'success',
        message: res.data?.message || 'Automated email configuration saved successfully!',
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to save settings. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTriggerTest = async () => {
    setIsTesting(true);
    setFeedback(null);
    try {
      const res = await api.post('/company/event-emails/trigger-test');
      const bCount = res.data?.result?.birthdayEmailsSent ?? 0;
      const hCount = res.data?.result?.holidayEmailsSent ?? 0;
      setFeedback({
        type: 'success',
        message: `Check completed: ${bCount} birthday email(s) and ${hCount} holiday announcement(s) sent!`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to trigger automated check.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div
          className="w-screen max-w-xl bg-white shadow-2xl border-l border-slate-200 flex flex-col h-full animate-in slide-in-from-right duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between gap-4 bg-gradient-to-r from-slate-50 via-indigo-50/20 to-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#5E4BE2]/10 text-[#5E4BE2] flex items-center justify-center shrink-0 border border-[#5E4BE2]/20 shadow-xs">
              <IconMail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Automated Birthday & Event Emails
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Automatically send celebratory emails from the server once dates and events are configured.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <IconX className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center border-b border-slate-100 px-6 bg-slate-50/50">
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'settings'
                ? 'border-[#5E4BE2] text-[#5E4BE2]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Automation Configuration
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'preview'
                ? 'border-[#5E4BE2] text-[#5E4BE2]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Email Templates Preview
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`mx-6 mt-4 p-3 rounded-xl text-xs flex items-center gap-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border border-rose-200 text-rose-800'
            }`}
          >
            {feedback.type === 'success' ? (
              <IconCheck className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <IconAlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            )}
            <span className="font-medium">{feedback.message}</span>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400">
              <IconLoader2 className="w-8 h-8 animate-spin text-[#5E4BE2] mb-2" />
              <p className="text-xs">Loading email configuration...</p>
            </div>
          ) : activeTab === 'settings' ? (
            <>
              {/* Section 1: Employee Birthdays */}
              <div className="p-4 rounded-2xl bg-pink-50/40 border border-pink-100/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-pink-100 text-pink-700 flex items-center justify-center">
                      <IconCake className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Automated Birthday Greetings</h4>
                      <p className="text-[11px] text-slate-500">
                        Automatically emails employees on their birthday with personalized wishes.
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.autoBirthdayEmails}
                      onChange={(e) =>
                        setSettings({ ...settings, autoBirthdayEmails: e.target.checked })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-600"></div>
                  </label>
                </div>

                {settings.autoBirthdayEmails && (
                  <div className="pt-2 border-t border-pink-100/60">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Custom Birthday Message (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={settings.customBirthdayMessage || ''}
                      onChange={(e) =>
                        setSettings({ ...settings, customBirthdayMessage: e.target.value })
                      }
                      placeholder="e.g. We truly appreciate your hard work and the positive energy you bring to the office every day!"
                      className="w-full text-xs p-2.5 rounded-xl border border-pink-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-pink-400 text-slate-800 placeholder-slate-400"
                    />
                  </div>
                )}
              </div>

              {/* Section 2: Upcoming Events & Holidays */}
              <div className="p-4 rounded-2xl bg-indigo-50/40 border border-indigo-100/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-indigo-100 text-[#5E4BE2] flex items-center justify-center">
                      <IconCalendarEvent className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Automated Holiday Announcements</h4>
                      <p className="text-[11px] text-slate-500">
                        Dispatches festival & holiday announcement emails to all active team members.
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.autoHolidayEmails}
                      onChange={(e) =>
                        setSettings({ ...settings, autoHolidayEmails: e.target.checked })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#5E4BE2]"></div>
                  </label>
                </div>

                {settings.autoHolidayEmails && (
                  <div className="pt-2 border-t border-indigo-100/60 space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Send Announcement Notice
                      </label>
                      <select
                        value={settings.holidayNoticeDays}
                        onChange={(e) =>
                          setSettings({ ...settings, holidayNoticeDays: parseInt(e.target.value, 10) })
                        }
                        className="text-xs p-2.5 rounded-xl border border-indigo-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-[#5E4BE2] text-slate-800 font-medium cursor-pointer"
                      >
                        <option value={0}>On the morning of the holiday (Same Day)</option>
                        <option value={1}>1 Day before the holiday (Recommended)</option>
                        <option value={2}>2 Days before the holiday</option>
                        <option value={3}>3 Days before the holiday</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Custom Holiday Greeting (Optional)
                      </label>
                      <textarea
                        rows={2}
                        value={settings.customHolidayMessage || ''}
                        onChange={(e) =>
                          setSettings({ ...settings, customHolidayMessage: e.target.value })
                        }
                        placeholder="e.g. Wishing you and your families a joyous, prosperous celebration filled with happiness!"
                        className="w-full text-xs p-2.5 rounded-xl border border-indigo-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-[#5E4BE2] text-slate-800 placeholder-slate-400"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Server Automation Status Indicator */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Server Scheduler: Active</span>
                    <span className="text-[11px] text-slate-500">
                      The server automatically runs daily at morning 9:00 AM to dispatch configured emails.
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleTriggerTest}
                  disabled={isTesting}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 shadow-2xs transition-colors cursor-pointer disabled:opacity-60"
                  title="Run automated check now"
                >
                  {isTesting ? (
                    <IconLoader2 className="w-3.5 h-3.5 animate-spin text-[#5E4BE2]" />
                  ) : (
                    <IconPlayerPlay className="w-3.5 h-3.5 text-[#5E4BE2]" />
                  )}
                  <span>Test Run Now</span>
                </button>
              </div>
            </>
          ) : (
            /* Email Preview Tab */
            <div className="space-y-6">
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Sample Birthday Email (Sent to Celebrating Employee)
                </h4>
                <div className="border border-pink-200 rounded-2xl p-4 bg-pink-50/20 text-xs text-slate-700 space-y-2">
                  <div className="font-bold text-pink-700">Subject: 🎉 Happy Birthday, [Employee Name]! Warmest Wishes from [Company Name]</div>
                  <div className="p-3 bg-white rounded-xl border border-slate-100 shadow-2xs space-y-1.5">
                    <div className="font-bold text-slate-900">Dear [Employee Name],</div>
                    <p className="text-slate-600">
                      On this very special day, everyone at [Company Name] wants to wish you a tremendous Happy Birthday! 🥳
                    </p>
                    <p className="text-slate-500 italic">
                      "Count your life by smiles, not tears. Count your age by friends, not years."
                    </p>
                    <div className="pt-2 text-slate-400 font-medium">With Warmest Wishes, The Entire Team</div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Sample Holiday Announcement Email (Sent to All Employees)
                </h4>
                <div className="border border-indigo-200 rounded-2xl p-4 bg-indigo-50/20 text-xs text-slate-700 space-y-2">
                  <div className="font-bold text-indigo-700">Subject: 🎉 Upcoming Holiday: Diwali (Deepavali) — [Company Name]</div>
                  <div className="p-3 bg-white rounded-xl border border-slate-100 shadow-2xs space-y-1.5">
                    <div className="font-bold text-slate-900">Hello Team,</div>
                    <p className="text-slate-600">
                      Please note that our company will be observing an official holiday for <strong>Diwali (Deepavali)</strong> on <strong>Friday, November 8, 2026</strong>.
                    </p>
                    <div className="p-2 bg-slate-50 rounded-lg border border-slate-100 text-[11px] text-slate-600">
                      <strong>Office Status:</strong> Closed (Full Day Holiday)
                    </div>
                    <div className="pt-2 text-slate-400 font-medium">Warm Regards, People Operations & Management</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50/80 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            Close
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || isLoading}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#5E4BE2] hover:bg-[#4d3cc9] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-60"
          >
            {isSaving && <IconLoader2 className="w-4 h-4 animate-spin" />}
            <span>Save Configuration</span>
          </button>
        </div>
      </div>
    </div>
  </div>
);
};
