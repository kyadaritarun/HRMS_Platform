import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  IconSparkles,
  IconShieldCheck,
  IconSchool,
  IconGift,
  IconHelpCircle,
  IconBuilding,
  IconId,
  IconBriefcase,
  IconReceiptTax,
  IconCar,
  IconShieldLock,
  IconScale,
  IconFileSpreadsheet,
  IconAward,
  IconPlayerPlay,
  IconTruck,
  IconCalendarEvent,
  IconCreditCard,
  IconMail,
  IconPhone,
  IconX,
  IconCheck,
  IconSend,
} from '@tabler/icons-react';

export interface AddonServiceItem {
  id: string;
  name: string;
  category: 'COMPLIANCE' | 'TRAINING' | 'CULTURE';
  tagline: string;
  iconBg: string;
  iconColor: string;
  accentColor: string;
  features: Array<{ label: string; icon: React.ComponentType<{ className?: string }> }>;
  policyNote: string;
  badge: string;
}

const AVAILABLE_SERVICES: AddonServiceItem[] = [
  {
    id: 'bgv',
    name: 'Background Verification',
    category: 'COMPLIANCE',
    tagline: "Know who you're hiring before they join.",
    iconBg: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
    iconColor: 'text-emerald-600',
    accentColor: 'border-emerald-200/80',
    badge: 'Statutory & Hiring',
    policyNote:
      "Note : The verification link is valid for 7 days. If the employee doesn't complete verification in that time the link will expire along with the credits and won't be credited to your balance.",
    features: [
      { label: 'Aadhaar Check', icon: IconId },
      { label: 'Employment Check (UAN)', icon: IconBriefcase },
      { label: 'Driving Licence Check', icon: IconCar },
      { label: 'Credit Check', icon: IconReceiptTax },
      { label: 'FIR / Police Records', icon: IconShieldLock },
      { label: 'Court Case Check', icon: IconScale },
    ],
  },
  {
    id: 'training',
    name: 'Employee Training',
    category: 'TRAINING',
    tagline: 'Upskill your workforce with compliance courses, quizzes & certificates.',
    iconBg: 'bg-indigo-50 text-[#5E4BE2] border border-indigo-100',
    iconColor: 'text-[#5E4BE2]',
    accentColor: 'border-indigo-200/80',
    badge: 'LMS & Upskilling',
    policyNote:
      'Note : Enrolled employees receive 1-year unlimited access to interactive compliance, POSH & leadership course tracks with auto-generated certificates.',
    features: [
      { label: 'POSH & Compliance Modules', icon: IconShieldCheck },
      { label: 'Interactive Video Lessons', icon: IconPlayerPlay },
      { label: 'Assessments & Quizzes', icon: IconAward },
      { label: 'Completion Certificates', icon: IconAward },
      { label: 'Department Progress Reports', icon: IconFileSpreadsheet },
      { label: 'Automated Onboarding Tracks', icon: IconBriefcase },
    ],
  },
  {
    id: 'employee-gifts',
    name: 'Employee Gifts',
    category: 'CULTURE',
    tagline: 'Celebrate milestones, send festival hampers, and surprise new joiners with custom swag.',
    iconBg: 'bg-purple-50 text-purple-600 border border-purple-100',
    iconColor: 'text-purple-600',
    accentColor: 'border-purple-200/80',
    badge: 'Rewards & Culture',
    policyNote:
      'Note : Custom corporate logo printing available for orders of 5+ kits. Dispatched across 19,000+ Indian PIN codes with doorstep courier tracking.',
    features: [
      { label: 'Welcome Onboarding Swag Kits', icon: IconSparkles },
      { label: 'Work Anniversary Awards', icon: IconCalendarEvent },
      { label: 'Digital Brand E-Vouchers', icon: IconCreditCard },
      { label: 'Custom Corporate Logo Printing', icon: IconBuilding },
      { label: 'Doorstep Courier Delivery', icon: IconTruck },
      { label: 'Tax-Exempt Per-Employee Perks', icon: IconReceiptTax },
    ],
  },
];

export const AddonServicesPage: React.FC = () => {
  const { company } = useAuth();

  // Contact / Help Modal State
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [inquirySent, setInquirySent] = useState(false);
  const [selectedServiceInquiry, setSelectedServiceInquiry] = useState('ALL');
  const [inquiryNote, setInquiryNote] = useState('');

  const handleSendInquiry = (e: React.FormEvent) => {
    e.preventDefault();
    setInquirySent(true);
    setTimeout(() => {
      setInquirySent(false);
      setIsHelpOpen(false);
      setInquiryNote('');
    }, 2500);
  };

  return (
    <div className="space-y-6">
      {/* ===================== TOP HEADER ===================== */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5E4BE2] shrink-0">
              <IconSparkles className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Add-on Services
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Pick a service, set the quantity and check out.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsHelpOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-200/90 shadow-2xs transition-all cursor-pointer active:scale-[0.98]"
          >
            <IconHelpCircle className="w-4 h-4 text-[#5E4BE2]" />
            <span>Need Help?</span>
          </button>
        </div>
      </div>

      {/* ===================== MAIN 2-COLUMN GRID ===================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ===================== LEFT COLUMN: SERVICE CARDS ===================== */}
        <div className="lg:col-span-8 space-y-5">
          {AVAILABLE_SERVICES.map((service) => (
            <div
              key={service.id}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all overflow-hidden"
            >
              {/* Top Section: Title & Details */}
              <div className="p-5 sm:p-6 pb-4">
                <div className="flex items-start gap-3.5">
                  <div className={`w-11 h-11 rounded-2xl ${service.iconBg} flex items-center justify-center shrink-0 shadow-2xs`}>
                    {service.id === 'bgv' ? (
                      <IconShieldCheck className="w-5 h-5" />
                    ) : service.id === 'training' ? (
                      <IconSchool className="w-5 h-5" />
                    ) : (
                      <IconGift className="w-5 h-5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-sm font-bold text-slate-900 leading-snug">
                        {service.name}
                      </h2>
                      {service.badge && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold">
                          {service.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                      {service.tagline}
                    </p>
                  </div>
                </div>
              </div>

              {/* Middle Features Grid (3-column responsive layout) */}
              <div className="px-5 sm:px-6 py-3.5 bg-slate-50/60 border-t border-slate-100">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {service.features.map((feat, idx) => {
                    const FeatIcon = feat.icon;
                    return (
                      <div key={idx} className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                        <FeatIcon className="w-3.5 h-3.5 text-[#5E4BE2] shrink-0" />
                        <span className="truncate">{feat.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Policy Note */}
              <div className="px-5 sm:px-6 py-3 bg-white border-t border-slate-100 text-[11px]">
                <p className="text-slate-500 font-medium leading-relaxed">
                  {service.policyNote}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* ===================== RIGHT COLUMN: ORDER SUMMARY ===================== */}
        <div className="lg:col-span-4 sticky top-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
              Order summary
            </h3>

            {/* Buying for Workspace */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Buying for
              </label>
              <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-800">
                <span className="truncate">
                  {company?.name || 'WhiteScholars EduFutures Academy Private Limited'}
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-1">
                GST invoice will be generated for this branch.
              </p>
            </div>

            {/* Contact Uptrix Organization Callout */}
            <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-100 text-indigo-950 space-y-2.5">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white text-[#5E4BE2] border border-indigo-200/80 flex items-center justify-center shrink-0 shadow-2xs">
                  <IconBuilding className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 leading-snug">
                    Service Activation Notice
                  </h4>
                  <p className="text-xs text-slate-700 font-semibold mt-1 leading-relaxed">
                    If you want to add this service, please contact the <span className="text-[#5E4BE2]">Uptrix Organization</span>.
                  </p>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 font-medium leading-relaxed pt-1 border-t border-indigo-100/70">
                Our central enterprise team will configure the package credits, tenant license, and dedicated onboarding for your company.
              </p>
            </div>

            {/* Contact Channels */}
            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <IconMail className="w-4 h-4 text-[#5E4BE2]" />
                  <span className="text-slate-600 font-medium">Email:</span>
                </div>
                <a
                  href="mailto:sales@uptrix.io"
                  className="font-bold text-[#5E4BE2] hover:underline font-mono"
                >
                  sales@uptrix.io
                </a>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <IconPhone className="w-4 h-4 text-emerald-600" />
                  <span className="text-slate-600 font-medium">Helpline:</span>
                </div>
                <a
                  href="tel:+9118004198900"
                  className="font-bold text-slate-800 hover:text-[#5E4BE2]"
                >
                  +91 1800-419-8900
                </a>
              </div>
            </div>

            {/* Contact Button */}
            <button
              type="button"
              onClick={() => setIsHelpOpen(true)}
              className="w-full py-2.5 bg-gradient-to-r from-[#5E4BE2] to-[#4B39C3] hover:from-[#5340D4] hover:to-[#4130B4] text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-[0.99]"
            >
              <IconSend className="w-4 h-4" />
              <span>Contact Uptrix Organization</span>
            </button>
          </div>
        </div>
      </div>

      {/* ===================== CONTACT / INQUIRY MODAL ===================== */}
      {isHelpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-[#5E4BE2] flex items-center justify-center">
                  <IconBuilding className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Contact Uptrix Organization</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Add-on service inquiry &amp; activation</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsHelpOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <IconX className="w-4 h-4" />
              </button>
            </div>

            {inquirySent ? (
              <div className="text-center py-6 space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-sm">
                  <IconCheck className="w-6 h-6 stroke-[2.5]" />
                </div>
                <h4 className="text-sm font-bold text-slate-900">Request Sent to Uptrix!</h4>
                <p className="text-xs text-slate-500 font-medium max-w-xs mx-auto">
                  Thank you. An Uptrix enterprise account manager will contact you within 2 business hours.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSendInquiry} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Which service would you like to add?</label>
                  <select
                    value={selectedServiceInquiry}
                    onChange={(e) => setSelectedServiceInquiry(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5E4BE2]/20"
                  >
                    <option value="ALL">All 3 Add-on Services</option>
                    <option value="BGV">Background Verification (BGV)</option>
                    <option value="TRAINING">Employee Training &amp; LMS</option>
                    <option value="GIFTS">Employee Gifts &amp; Rewards</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Estimated Employee Count / Seats</label>
                  <input
                    type="text"
                    placeholder="e.g. 50 employees"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5E4BE2]/20"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Message or Special Requirements</label>
                  <textarea
                    rows={3}
                    value={inquiryNote}
                    onChange={(e) => setInquiryNote(e.target.value)}
                    placeholder="Tell us about your team size, timeline, or any specific compliance questions..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5E4BE2]/20"
                  />
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsHelpOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-gradient-to-r from-[#5E4BE2] to-[#4B39C3] hover:from-[#5340D4] hover:to-[#4130B4] text-white font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <IconSend className="w-3.5 h-3.5" />
                    <span>Send to Uptrix</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AddonServicesPage;
