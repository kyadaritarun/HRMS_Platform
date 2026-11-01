import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '../api/client';
import {
  IconHeadset,
  IconX,
  IconPhoneCall,
  IconMail,
  IconClock,
  IconMapPin,
  IconCopy,
  IconCheck,
  IconAlertTriangle,
  IconInfoCircle,
} from '@tabler/icons-react';
import { useAuth } from '../context/AuthContext';

interface HelplineDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface HelplineData {
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
}

export const HelplineDrawer: React.FC<HelplineDrawerProps> = ({ isOpen, onClose }) => {
  const { company } = useAuth();
  const [data, setData] = useState<HelplineData>({
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
  const [isLoading, setIsLoading] = useState(false);
  const [copiedItem, setCopiedItem] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      api.get('/helpline')
        .then((res) => {
          if (res.data?.config) {
            setData(res.data.config);
          }
        })
        .catch((err) => {
          console.error('Failed to load helpline info from database:', err);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isOpen]);

  if (!isOpen || typeof document === 'undefined') return null;

  const handleCopy = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setCopiedItem(label);
    setTimeout(() => setCopiedItem(null), 2000);
  };

  const companyName = company?.name || 'Company';

  const hasEmergency = Boolean(data.emergencyNumber || data.emergencyLabel);
  const hasHr = Boolean(data.hrPhone || data.hrEmail || data.hrTollFree);
  const hasIt = Boolean(data.itEmail || data.itExtension);
  const hasHoursOrAddress = Boolean(data.supportHours || data.supportDays || data.workplaceAddress);

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
                <IconHeadset className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 leading-tight">
                  Helpline &amp; Support Desk
                </h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  Direct contact details for {companyName} HR &amp; IT teams
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Close panel"
            >
              <IconX className="w-5 h-5" />
            </button>
          </div>

          {/* Copy Notification Toast */}
          {copiedItem && (
            <div className="mx-6 mt-4 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold flex items-center justify-between animate-in fade-in duration-200 shrink-0">
              <span className="flex items-center gap-1.5">
                <IconCheck className="w-4 h-4 text-emerald-600" />
                Copied {copiedItem} to clipboard!
              </span>
              <span className="text-[10px] text-emerald-600 uppercase font-bold">Ready to paste</span>
            </div>
          )}

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {isLoading ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-8 h-8 mx-auto border-3 border-indigo-500/20 border-t-[#5E4BE2] rounded-full animate-spin" />
                <p className="text-xs text-slate-400 font-medium">Loading helpline information...</p>
              </div>
            ) : (
              <>
                {/* Optional Global Advisory / Announcement Banner */}
                {data.announcement && (
                  <div className="p-3.5 rounded-2xl bg-amber-50/90 border border-amber-200/90 text-xs text-amber-900 font-medium flex items-start gap-2.5 shadow-2xs">
                    <IconInfoCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <span className="font-bold block text-amber-950 text-[11px] uppercase tracking-wider mb-0.5">
                        Helpline Notice
                      </span>
                      <p className="leading-relaxed">{data.announcement}</p>
                    </div>
                  </div>
                )}

                {/* 1. Emergency 24/7 Helpline */}
                {hasEmergency && (
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-50/80 to-amber-50/40 border border-rose-200/80 space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                          <IconAlertTriangle className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-rose-950">
                            {data.emergencyLabel || '24/7 Emergency & POSH Helpline'}
                          </h4>
                          {data.emergencySubtext && (
                            <p className="text-[11px] text-rose-700/90">{data.emergencySubtext}</p>
                          )}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white tracking-wide shrink-0">
                        24/7 Active
                      </span>
                    </div>

                    {data.emergencyNumber && (
                      <div className="flex items-center justify-between bg-white/90 p-3 rounded-xl border border-rose-200/60">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                            Emergency Hotline
                          </span>
                          <span className="text-sm font-bold text-slate-900 tracking-tight">
                            {data.emergencyNumber}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleCopy(data.emergencyNumber, 'Emergency Hotline')}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer"
                            title="Copy number"
                          >
                            <IconCopy className="w-3.5 h-3.5" />
                          </button>
                          <a
                            href={`tel:${data.emergencyNumber.replace(/[^0-9+]/g, '')}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors shadow-2xs"
                          >
                            <IconPhoneCall className="w-3.5 h-3.5" />
                            <span>Call Now</span>
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. HR & Employee Support */}
                {hasHr && (
                  <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3.5 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-indigo-50 text-[#5E4BE2] flex items-center justify-center shrink-0">
                          <IconHeadset className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">HR &amp; People Operations</h4>
                          <p className="text-[11px] text-slate-500">Leaves, payroll queries, attendance &amp; policies</p>
                        </div>
                      </div>
                      {data.supportDays && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-[#5E4BE2] border border-indigo-100 shrink-0">
                          {data.supportDays.split(' ')[0]}
                        </span>
                      )}
                    </div>

                    {/* HR Phone */}
                    {data.hrPhone && (
                      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="flex items-center gap-2.5">
                          <IconPhoneCall className="w-4 h-4 text-slate-400 shrink-0" />
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                              Toll-Free Phone
                            </span>
                            <span className="text-xs font-bold text-slate-900">
                              {data.hrPhone} {data.hrTollFree ? `/ ${data.hrTollFree}` : ''}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleCopy(data.hrPhone, 'HR Phone')}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
                            title="Copy phone"
                          >
                            <IconCopy className="w-3.5 h-3.5" />
                          </button>
                          <a
                            href={`tel:${data.hrPhone.replace(/[^0-9+]/g, '')}`}
                            className="px-2.5 py-1.5 rounded-lg bg-[#5E4BE2] hover:bg-[#4D3BC9] text-white text-xs font-bold transition-colors cursor-pointer"
                          >
                            Call
                          </a>
                        </div>
                      </div>
                    )}

                    {/* HR Email */}
                    {data.hrEmail && (
                      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="flex items-center gap-2.5">
                          <IconMail className="w-4 h-4 text-slate-400 shrink-0" />
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                              Support Email
                            </span>
                            <span className="text-xs font-bold text-slate-900">
                              {data.hrEmail}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleCopy(data.hrEmail, 'Support Email')}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
                            title="Copy email"
                          >
                            <IconCopy className="w-3.5 h-3.5" />
                          </button>
                          <a
                            href={`mailto:${data.hrEmail}`}
                            className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                          >
                            Email
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. IT & Infrastructure Helpdesk */}
                {hasIt && (
                  <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3.5 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-indigo-50 text-[#5E4BE2] flex items-center justify-center shrink-0">
                          <IconHeadset className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">IT &amp; Technical Support</h4>
                          <p className="text-[11px] text-slate-500">VPN, system credentials, hardware &amp; equipment</p>
                        </div>
                      </div>
                      {data.itExtension && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                          {data.itExtension}
                        </span>
                      )}
                    </div>

                    {data.itEmail && (
                      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="flex items-center gap-2.5">
                          <IconMail className="w-4 h-4 text-slate-400 shrink-0" />
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                              IT Desk Email
                            </span>
                            <span className="text-xs font-bold text-slate-900">
                              {data.itEmail}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(data.itEmail, 'IT Helpdesk Email')}
                          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
                          title="Copy IT email"
                        >
                          <IconCopy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* 4. Operating Hours & Workplace */}
                {hasHoursOrAddress && (
                  <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 space-y-2 text-xs text-slate-600">
                    {(data.supportHours || data.supportDays) && (
                      <div className="flex items-start gap-2.5">
                        <IconClock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold text-slate-800">Support Working Hours:</span>
                          <p className="text-slate-500 text-[11px] mt-0.5">
                            {data.supportHours} {data.supportDays ? `(${data.supportDays})` : ''}
                          </p>
                        </div>
                      </div>
                    )}

                    {data.workplaceAddress && (
                      <div className="flex items-start gap-2.5 pt-2 border-t border-slate-100">
                        <IconMapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold text-slate-800">Corporate Workplace:</span>
                          <p className="text-slate-500 text-[11px] mt-0.5 leading-relaxed">
                            {data.workplaceAddress}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {!hasEmergency && !hasHr && !hasIt && !hasHoursOrAddress && (
                  <div className="py-12 text-center p-6 rounded-2xl bg-slate-50 border border-slate-200 text-slate-500 text-xs">
                    No helpline information has been published yet. Please check back later.
                  </div>
                )}
              </>
            )}
          </div>

          {/* Drawer Footer */}
          <div className="p-4 px-6 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between shrink-0">
            <span className="text-[11px] text-slate-400 font-medium">
              Response time within 2 business hours
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/70 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default HelplineDrawer;
