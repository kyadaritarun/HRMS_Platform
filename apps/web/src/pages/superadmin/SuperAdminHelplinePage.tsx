import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import {
  IconHeadset,
  IconCheck,
  IconAlertCircle,
  IconPhoneCall,
  IconClock,
  IconMapPin,
  IconAlertTriangle,
  IconRefresh,
  IconDeviceFloppy,
  IconTicket,
  IconEye,
  IconInfoCircle,
} from '@tabler/icons-react';

export interface HelplineConfig {
  emergencyNumber: string;
  emergencyLabel: string;
  emergencySubtext: string;
  hrPhone: string;
  hrTollFree: string;
  hrEmail: string;
  itEmail: string;
  itExtension: string;
  supportHours: string;
  supportDays: string;
  workplaceAddress: string;
  announcement?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export const SuperAdminHelplinePage: React.FC = () => {
  const [config, setConfig] = useState<HelplineConfig>({
    emergencyNumber: '',
    emergencyLabel: '',
    emergencySubtext: '',
    hrPhone: '',
    hrTollFree: '',
    hrEmail: '',
    itEmail: '',
    itExtension: '',
    supportHours: '',
    supportDays: '',
    workplaceAddress: '',
    announcement: '',
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchConfig = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/superadmin/helpline');
      if (res.data?.config) {
        setConfig(res.data.config);
      }
    } catch (err: any) {
      console.error('Failed to load helpline config:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedback(null);
    try {
      const res = await api.put('/superadmin/helpline', config);
      if (res.data?.config) {
        setConfig(res.data.config);
      }
      setFeedback({ type: 'success', message: 'Global helpline information saved successfully! All tenant companies will now see this updated contact data.' });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.error || 'Failed to update global helpline information.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold mb-1">
            <Link to="/super-admin/dashboard" className="hover:text-[#5E4BE2] transition-colors">
              Platform Admin
            </Link>
            <span>/</span>
            <span className="text-slate-800">Global Helpline Desk</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5E4BE2] shadow-2xs">
              <IconHeadset className="w-5 h-5" />
            </span>
            <span>Helpline &amp; Support Management</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Configure central emergency hotlines, HR desks, IT contacts, and workplace info visible to all companies and employees.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={fetchConfig}
            disabled={isLoading || isSaving}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-2xs transition-colors cursor-pointer"
          >
            <IconRefresh className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-2xl border text-xs sm:text-sm font-semibold flex items-center gap-3 animate-in fade-in duration-200 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <IconCheck className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <IconAlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Main 2-Column Grid: Left is Form, Right is Real-Time Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Configuration Form (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/40">
            <div>
              <h2 className="text-base font-bold text-slate-900">Contact Details &amp; Escalation Channels</h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Saved changes take effect immediately across all company sidebars.
              </p>
            </div>
            {config.updatedAt && (
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200/80">
                Updated {new Date(config.updatedAt).toLocaleDateString()}
              </span>
            )}
          </div>

          <form onSubmit={handleSave} className="p-6 space-y-6">
            {/* Section 1: Emergency & POSH Hotline */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <div className="w-6 h-6 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                  <IconAlertTriangle className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  24/7 Emergency &amp; POSH Hotline
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Emergency Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={config.emergencyNumber}
                    onChange={(e) => setConfig({ ...config, emergencyNumber: e.target.value })}
                    placeholder="e.g. +91 98765-43210"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:border-[#5E4BE2] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Hotline Title Label
                  </label>
                  <input
                    type="text"
                    required
                    value={config.emergencyLabel}
                    onChange={(e) => setConfig({ ...config, emergencyLabel: e.target.value })}
                    placeholder="e.g. 24/7 Emergency & POSH Helpline"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:border-[#5E4BE2] transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Hotline Description / Guidance
                </label>
                <input
                  type="text"
                  value={config.emergencySubtext}
                  onChange={(e) => setConfig({ ...config, emergencySubtext: e.target.value })}
                  placeholder="e.g. Immediate workplace emergency, medical, or safety assistance"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-900 focus:bg-white focus:outline-hidden focus:border-[#5E4BE2] transition-colors"
                />
              </div>
            </div>

            {/* Section 2: HR & People Support */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <div className="w-6 h-6 rounded-lg bg-indigo-50 text-[#5E4BE2] flex items-center justify-center">
                  <IconHeadset className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  HR &amp; People Operations Desk
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    HR Support Phone <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={config.hrPhone}
                    onChange={(e) => setConfig({ ...config, hrPhone: e.target.value })}
                    placeholder="e.g. +91 (080) 4567-8900"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:border-[#5E4BE2] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Toll-Free Alternative
                  </label>
                  <input
                    type="text"
                    value={config.hrTollFree}
                    onChange={(e) => setConfig({ ...config, hrTollFree: e.target.value })}
                    placeholder="e.g. 1800-123-HRMS"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:border-[#5E4BE2] transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  HR Support Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={config.hrEmail}
                  onChange={(e) => setConfig({ ...config, hrEmail: e.target.value })}
                  placeholder="e.g. support@uptrix.io"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:border-[#5E4BE2] transition-colors"
                />
              </div>
            </div>

            {/* Section 3: IT & Technical Desk */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <div className="w-6 h-6 rounded-lg bg-indigo-50 text-[#5E4BE2] flex items-center justify-center">
                  <IconTicket className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  IT &amp; Technical Helpdesk
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    IT Support Email <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={config.itEmail}
                    onChange={(e) => setConfig({ ...config, itEmail: e.target.value })}
                    placeholder="e.g. it-helpdesk@uptrix.io"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:border-[#5E4BE2] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Internal Phone Extension
                  </label>
                  <input
                    type="text"
                    value={config.itExtension}
                    onChange={(e) => setConfig({ ...config, itExtension: e.target.value })}
                    placeholder="e.g. #4040 or Ext 205"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:border-[#5E4BE2] transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Operating Hours & Workplace */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <div className="w-6 h-6 rounded-lg bg-indigo-50 text-[#5E4BE2] flex items-center justify-center">
                  <IconClock className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Working Hours &amp; Corporate Address
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Support Working Hours
                  </label>
                  <input
                    type="text"
                    value={config.supportHours}
                    onChange={(e) => setConfig({ ...config, supportHours: e.target.value })}
                    placeholder="e.g. 9:00 AM – 7:00 PM IST"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:border-[#5E4BE2] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Operating Days
                  </label>
                  <input
                    type="text"
                    value={config.supportDays}
                    onChange={(e) => setConfig({ ...config, supportDays: e.target.value })}
                    placeholder="e.g. Monday to Friday"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:border-[#5E4BE2] transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Corporate Workplace Address
                </label>
                <textarea
                  rows={2}
                  value={config.workplaceAddress}
                  onChange={(e) => setConfig({ ...config, workplaceAddress: e.target.value })}
                  placeholder="e.g. Tech Park Avenue, Koramangala 4th Block, Bengaluru, Karnataka 560034"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-900 focus:bg-white focus:outline-hidden focus:border-[#5E4BE2] transition-colors resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Announcement / Special Advisory (Optional)
                </label>
                <input
                  type="text"
                  value={config.announcement || ''}
                  onChange={(e) => setConfig({ ...config, announcement: e.target.value })}
                  placeholder="e.g. For urgent payroll escalations, contact the HR desk directly."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-900 focus:bg-white focus:outline-hidden focus:border-[#5E4BE2] transition-colors"
                />
              </div>
            </div>

            {/* Form Submit Footer */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">
                Changes apply instantly across all tenant portals
              </span>
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#5E4BE2] to-[#4938CA] hover:from-[#523ED4] hover:to-[#3E2EB8] text-white text-xs sm:text-sm font-bold shadow-sm shadow-indigo-600/25 transition-all cursor-pointer disabled:opacity-60"
              >
                <IconDeviceFloppy className="w-4 h-4" />
                <span>{isSaving ? 'Saving Changes...' : 'Save & Broadcast Helpline'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right: Live Preview Panel (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
              <IconEye className="w-4 h-4 text-[#5E4BE2]" />
              <span>Live Tenant Preview</span>
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-[#5E4BE2] border border-indigo-100">
              Employee View
            </span>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-lg p-5 space-y-4">
            {/* Header Preview */}
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5E4BE2] shrink-0">
                <IconHeadset className="w-4.5 h-4.5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Helpline &amp; Support Desk</h4>
                <p className="text-[11px] text-slate-500 font-medium">Company HR &amp; IT contacts</p>
              </div>
            </div>

            {/* Announcement Banner */}
            {config.announcement && (
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200/80 text-[11px] text-amber-900 font-medium flex items-center gap-2">
                <IconInfoCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{config.announcement}</span>
              </div>
            )}

            {/* Emergency Preview Card */}
            {(config.emergencyNumber || config.emergencyLabel) ? (
              <div className="p-3.5 rounded-xl bg-gradient-to-br from-rose-50/90 to-amber-50/40 border border-rose-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <IconAlertTriangle className="w-4 h-4 text-rose-600" />
                    <span className="text-xs font-bold text-rose-900">{config.emergencyLabel || 'Emergency Hotline'}</span>
                  </div>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-rose-600 text-white">
                    24/7 Active
                  </span>
                </div>
                {config.emergencySubtext && <p className="text-[10px] text-rose-700">{config.emergencySubtext}</p>}
                {config.emergencyNumber && (
                  <div className="p-2.5 bg-white rounded-lg border border-rose-200 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">{config.emergencyNumber}</span>
                    <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
                      Call Now
                    </span>
                  </div>
                )}
              </div>
            ) : null}

            {/* HR Desk Preview */}
            {(config.hrPhone || config.hrEmail) ? (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <IconPhoneCall className="w-3.5 h-3.5 text-[#5E4BE2]" />
                    <span>HR &amp; People Support</span>
                  </span>
                  {config.supportDays && (
                    <span className="text-[10px] font-bold text-[#5E4BE2]">{config.supportDays.split(' ')[0]}</span>
                  )}
                </div>
                {config.hrPhone && <p className="text-[11px] font-semibold text-slate-900">{config.hrPhone}</p>}
                {config.hrEmail && <p className="text-[11px] font-medium text-slate-600">{config.hrEmail}</p>}
              </div>
            ) : null}

            {/* IT Desk Preview */}
            {(config.itEmail || config.itExtension) ? (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <IconTicket className="w-3.5 h-3.5 text-[#5E4BE2]" />
                    <span>IT Helpdesk</span>
                  </span>
                  {config.itExtension && (
                    <span className="text-[10px] font-bold text-slate-500">{config.itExtension}</span>
                  )}
                </div>
                {config.itEmail && <p className="text-[11px] font-semibold text-slate-900">{config.itEmail}</p>}
              </div>
            ) : null}

            {/* Working Hours & Office Preview */}
            {(config.supportHours || config.supportDays || config.workplaceAddress) ? (
              <div className="p-3 rounded-xl bg-slate-50/60 border border-slate-200 text-[11px] space-y-1.5 text-slate-600">
                {(config.supportHours || config.supportDays) && (
                  <div className="flex items-start gap-1.5">
                    <IconClock className="w-3.5 h-3.5 text-slate-500 font-medium shrink-0 mt-0.5" />
                    <span>{config.supportHours} {config.supportDays ? `(${config.supportDays})` : ''}</span>
                  </div>
                )}
                {config.workplaceAddress && (
                  <div className="flex items-start gap-1.5">
                    <IconMapPin className="w-3.5 h-3.5 text-slate-500 font-medium shrink-0 mt-0.5" />
                    <span className="truncate">{config.workplaceAddress}</span>
                  </div>
                )}
              </div>
            ) : null}

            {!config.emergencyNumber && !config.hrPhone && !config.hrEmail && !config.itEmail && !config.workplaceAddress && (
              <div className="py-8 text-center text-xs text-slate-500 font-medium">
                Enter contact details on the left to see the live preview.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminHelplinePage;
