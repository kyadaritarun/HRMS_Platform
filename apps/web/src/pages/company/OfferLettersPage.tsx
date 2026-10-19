import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import {
  IconFileCertificate,
  IconPlus,
  IconPrinter,
  IconDownload,
  IconSearch,
  IconCheck,
  IconX,
  IconUser,
  IconBuilding,
  IconCash,
  IconCalendar,
  IconMail,
  IconPhone,
  IconBriefcase,
  IconArrowLeft,
  IconEye,
  IconSparkles,
} from '@tabler/icons-react';

export interface OfferLetterItem {
  id: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone?: string;
  jobTitle: string;
  department: string;
  annualCtc: number;
  monthlySalary: number;
  joiningDate: string;
  status: 'DRAFT' | 'SENT' | 'ACCEPTED';
  createdAt: string;
  terms?: {
    probationMonths: number;
    noticeDays: number;
    workMode: string;
    workingHours: string;
  };
  breakdown: {
    basicMonthly: number;
    hraMonthly: number;
    specialAllowanceMonthly: number;
    pfMonthly: number;
    ptMonthly: number;
    netMonthly: number;
  };
}

export const OfferLettersPage: React.FC = () => {
  const { company, user } = useAuth();

  // Local state for generated offer letters repository
  const [offerLetters, setOfferLetters] = useState<OfferLetterItem[]>(() => {
    try {
      const saved = localStorage.getItem('uptrix_offer_letters');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return [
      {
        id: 'OL-2026-101',
        candidateName: 'Aarav Sharma',
        candidateEmail: 'aarav.sharma@example.com',
        candidatePhone: '+91 98765 43210',
        jobTitle: 'Senior Full Stack Engineer',
        department: 'Engineering',
        annualCtc: 1200000,
        monthlySalary: 100000,
        joiningDate: '2026-11-01',
        status: 'SENT',
        createdAt: '2026-10-15',
        terms: {
          probationMonths: 3,
          noticeDays: 30,
          workMode: 'Hybrid',
          workingHours: '09:30 AM - 06:30 PM (Mon-Fri)',
        },
        breakdown: {
          basicMonthly: 50000,
          hraMonthly: 20000,
          specialAllowanceMonthly: 26200,
          pfMonthly: 3600,
          ptMonthly: 200,
          netMonthly: 96200,
        },
      },
      {
        id: 'OL-2026-102',
        candidateName: 'Priya Patel',
        candidateEmail: 'priya.patel@example.com',
        candidatePhone: '+91 98111 22334',
        jobTitle: 'Product Marketing Manager',
        department: 'Marketing',
        annualCtc: 900000,
        monthlySalary: 75000,
        joiningDate: '2026-11-15',
        status: 'DRAFT',
        createdAt: '2026-10-17',
        terms: {
          probationMonths: 3,
          noticeDays: 30,
          workMode: 'On-site',
          workingHours: '09:00 AM - 06:00 PM (Mon-Fri)',
        },
        breakdown: {
          basicMonthly: 37500,
          hraMonthly: 15000,
          specialAllowanceMonthly: 19800,
          pfMonthly: 2500,
          ptMonthly: 200,
          netMonthly: 72300,
        },
      },
    ];
  });

  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [previewLetter, setPreviewLetter] = useState<OfferLetterItem | null>(null);

  // Form State
  const [form, setForm] = useState({
    candidateName: '',
    candidateEmail: '',
    candidatePhone: '',
    jobTitle: '',
    department: 'Engineering',
    workMode: 'Hybrid',
    annualCtc: '600000',
    joiningDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    probationMonths: '3',
    noticeDays: '30',
    workingHours: '09:30 AM - 06:30 PM (Mon to Fri)',
  });

  // Calculate salary components live
  const ctcAnnual = Number(form.annualCtc) || 0;
  const ctcMonthly = Math.round(ctcAnnual / 12);
  const basicMonthly = Math.round(ctcMonthly * 0.5);
  const hraMonthly = Math.round(ctcMonthly * 0.2);
  const pfMonthly = Math.round(Math.min(basicMonthly * 0.12, 1800));
  const ptMonthly = 200;
  const specialAllowance = Math.max(0, ctcMonthly - basicMonthly - hraMonthly);
  const netMonthly = ctcMonthly - pfMonthly - ptMonthly;

  const handleSaveOffer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.candidateName || !form.jobTitle || !form.annualCtc) {
      alert('Please fill in candidate name, job title, and CTC.');
      return;
    }

    const newOffer: OfferLetterItem = {
      id: `OL-2026-${Math.floor(100 + Math.random() * 900)}`,
      candidateName: form.candidateName,
      candidateEmail: form.candidateEmail,
      candidatePhone: form.candidatePhone,
      jobTitle: form.jobTitle,
      department: form.department,
      annualCtc: ctcAnnual,
      monthlySalary: ctcMonthly,
      joiningDate: form.joiningDate,
      status: 'SENT',
      createdAt: new Date().toISOString().split('T')[0],
      terms: {
        probationMonths: Number(form.probationMonths) || 3,
        noticeDays: Number(form.noticeDays) || 30,
        workMode: form.workMode,
        workingHours: form.workingHours,
      },
      breakdown: {
        basicMonthly,
        hraMonthly,
        specialAllowanceMonthly: specialAllowance,
        pfMonthly,
        ptMonthly,
        netMonthly,
      },
    };

    const updated = [newOffer, ...offerLetters];
    setOfferLetters(updated);
    try {
      localStorage.setItem('uptrix_offer_letters', JSON.stringify(updated));
    } catch (_) {}

    setIsModalOpen(false);
    setPreviewLetter(newOffer);
  };

  const handlePrint = () => {
    window.print();
  };

  const filtered = offerLetters.filter(
    (o) =>
      o.candidateName.toLowerCase().includes(search.toLowerCase()) ||
      o.jobTitle.toLowerCase().includes(search.toLowerCase()) ||
      o.department.toLowerCase().includes(search.toLowerCase()) ||
      o.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-offer-letter, #printable-offer-letter * {
            visibility: visible;
          }
          #printable-offer-letter {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 24px;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <IconFileCertificate className="w-7 h-7 text-indigo-600" />
            Offer Letters &amp; Employment Contracts
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Generate, customize, and issue formal employment offer letters with automated CTC salary breakdowns.
          </p>
        </div>

        <button
          onClick={() => {
            setForm({
              candidateName: '',
              candidateEmail: '',
              candidatePhone: '',
              jobTitle: '',
              department: 'Engineering',
              workMode: 'Hybrid',
              annualCtc: '600000',
              joiningDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
              probationMonths: '3',
              noticeDays: '30',
              workingHours: '09:30 AM - 06:30 PM (Mon to Fri)',
            });
            setIsModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs sm:text-sm font-semibold shadow-sm shadow-indigo-600/20 transition-all cursor-pointer"
        >
          <IconPlus className="w-4 h-4" />
          Generate New Offer Letter
        </button>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 no-print">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
            <IconFileCertificate className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Generated</span>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{offerLetters.length}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <IconCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Accepted / Joined</span>
            <p className="text-2xl font-black text-emerald-600 mt-0.5">
              {offerLetters.filter((o) => o.status === 'ACCEPTED').length}
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center shrink-0">
            <IconMail className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Awaiting Acceptance</span>
            <p className="text-2xl font-black text-amber-600 mt-0.5">
              {offerLetters.filter((o) => o.status === 'SENT' || o.status === 'DRAFT').length}
            </p>
          </div>
        </div>
      </div>

      {/* Search & Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden no-print">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4">
          <div className="relative w-full max-w-sm">
            <IconSearch className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by candidate, role, or ID..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/80 uppercase font-semibold text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-5 py-3.5">Ref ID</th>
                <th className="px-5 py-3.5">Candidate</th>
                <th className="px-5 py-3.5">Role &amp; Department</th>
                <th className="px-5 py-3.5">Annual CTC</th>
                <th className="px-5 py-3.5">Monthly Gross</th>
                <th className="px-5 py-3.5">Joining Date</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <IconFileCertificate className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    No offer letters found. Click &quot;Generate New Offer Letter&quot; to create one.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-bold text-indigo-600">{item.id}</td>
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-900">{item.candidateName}</div>
                      <div className="text-[11px] text-slate-400">{item.candidateEmail}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-800">{item.jobTitle}</div>
                      <span className="inline-block mt-0.5 text-[10px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                        {item.department}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-bold text-slate-900">
                      ₹{item.annualCtc.toLocaleString('en-IN')}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-emerald-600">
                      ₹{item.monthlySalary.toLocaleString('en-IN')}/mo
                    </td>
                    <td className="px-5 py-3.5 font-medium text-slate-700">
                      {new Date(item.joiningDate).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.status === 'ACCEPTED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : item.status === 'SENT'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => setPreviewLetter(item)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] transition-colors cursor-pointer"
                      >
                        <IconEye className="w-3.5 h-3.5" /> View &amp; Print
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* GENERATE OFFER LETTER MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto no-print">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <IconFileCertificate className="w-5 h-5 text-indigo-600" />
                  Generate Employment Offer Letter
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Enter candidate details and CTC salary. The compensation components will be calculated automatically.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <IconX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveOffer} className="space-y-4 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Candidate Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.candidateName}
                    onChange={(e) => setForm({ ...form, candidateName: e.target.value })}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Candidate Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={form.candidateEmail}
                    onChange={(e) => setForm({ ...form, candidateEmail: e.target.value })}
                    placeholder="e.g. rahul.sharma@gmail.com"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={form.candidatePhone}
                    onChange={(e) => setForm({ ...form, candidatePhone: e.target.value })}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Designation / Role Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.jobTitle}
                    onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}
                    placeholder="e.g. Senior Software Engineer"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Department
                  </label>
                  <select
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="Engineering">Engineering</option>
                    <option value="Product">Product</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Sales">Sales</option>
                    <option value="Human Resources">Human Resources</option>
                    <option value="Finance &amp; Operations">Finance &amp; Operations</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Work Mode
                  </label>
                  <select
                    value={form.workMode}
                    onChange={(e) => setForm({ ...form, workMode: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="On-site (WFO)">On-site (WFO)</option>
                    <option value="Hybrid">Hybrid</option>
                    <option value="Remote (WFH)">Remote (WFH)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Date of Joining *
                  </label>
                  <input
                    type="date"
                    required
                    value={form.joiningDate}
                    onChange={(e) => setForm({ ...form, joiningDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Annual CTC (₹ INR) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-400 font-bold text-xs">₹</span>
                    <input
                      type="number"
                      required
                      min="10000"
                      step="5000"
                      value={form.annualCtc}
                      onChange={(e) => setForm({ ...form, annualCtc: e.target.value })}
                      placeholder="e.g. 600000"
                      className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>
              </div>

              {/* Live Salary Structure Breakdown Card */}
              <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 mt-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                    <IconSparkles className="w-4 h-4 text-indigo-600" /> Automated Salary &amp; CTC Structure
                  </span>
                  <span className="text-xs font-bold text-indigo-600">
                    Gross: ₹{ctcMonthly.toLocaleString('en-IN')}/mo
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="bg-white p-2.5 rounded-xl border border-indigo-100/60">
                    <span className="text-[10px] text-slate-400 font-semibold block">Basic (50%)</span>
                    <span className="font-bold text-slate-900">₹{basicMonthly.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-indigo-100/60">
                    <span className="text-[10px] text-slate-400 font-semibold block">HRA (20%)</span>
                    <span className="font-bold text-slate-900">₹{hraMonthly.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-indigo-100/60">
                    <span className="text-[10px] text-slate-400 font-semibold block">Special Allowance</span>
                    <span className="font-bold text-slate-900">₹{specialAllowance.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-100">
                    <span className="text-[10px] text-emerald-700 font-semibold block">Net Take-Home</span>
                    <span className="font-bold text-emerald-800">₹{netMonthly.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                >
                  Generate &amp; Preview Offer Letter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FORMAL LETTER PREVIEW MODAL */}
      {previewLetter && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-100 rounded-3xl max-w-4xl w-full p-4 sm:p-6 shadow-2xl my-6 flex flex-col max-h-[92vh]">
            {/* Top Toolbar */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 no-print">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPreviewLetter(null)}
                  className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 cursor-pointer"
                >
                  <IconArrowLeft className="w-5 h-5" />
                </button>
                <span className="font-bold text-sm text-slate-900">
                  Offer Letter Preview — {previewLetter.candidateName} ({previewLetter.id})
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                >
                  <IconPrinter className="w-4 h-4" /> Print / Save as PDF
                </button>
                <button
                  onClick={() => setPreviewLetter(null)}
                  className="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
                >
                  <IconX className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document Sheet */}
            <div className="overflow-y-auto flex-1 mt-4 p-2 sm:p-6 bg-slate-200/60 rounded-2xl flex justify-center">
              <div
                id="printable-offer-letter"
                className="bg-white max-w-[800px] w-full p-8 sm:p-12 rounded-xl shadow-lg border border-slate-200 text-slate-800 text-sm leading-relaxed"
              >
                {/* Letterhead */}
                <div className="flex items-center justify-between border-b-2 border-slate-900 pb-6 mb-8">
                  <div>
                    <h2 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
                      {company?.name || 'Company Name'}
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Registered Corporate Office • Uptrix HRMS Cloud Workspace
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-indigo-600 block">
                      Ref: {previewLetter.id}
                    </span>
                    <span className="text-xs text-slate-500">
                      Date: {new Date(previewLetter.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>

                {/* Candidate Addressee */}
                <div className="mb-6">
                  <p className="font-bold text-slate-900">To,</p>
                  <p className="font-bold text-slate-900 text-base">{previewLetter.candidateName}</p>
                  <p className="text-slate-600 text-xs">{previewLetter.candidateEmail}</p>
                  {previewLetter.candidatePhone && (
                    <p className="text-slate-600 text-xs">{previewLetter.candidatePhone}</p>
                  )}
                </div>

                {/* Subject */}
                <div className="mb-6 p-3 bg-slate-50 border-l-4 border-indigo-600 font-bold text-slate-900 text-sm">
                  Subject: Formal Offer of Employment for the position of {previewLetter.jobTitle}
                </div>

                {/* Opening */}
                <p className="mb-4">
                  Dear <strong>{previewLetter.candidateName}</strong>,
                </p>
                <p className="mb-4">
                  On behalf of <strong>{company?.name || 'the Company'}</strong>, we are delighted to extend this formal offer of employment for the role of <strong>{previewLetter.jobTitle}</strong> in our <strong>{previewLetter.department}</strong> department. We were thoroughly impressed with your background, qualifications, and potential contributions to our team.
                </p>

                {/* Key Employment Terms */}
                <div className="mb-6 space-y-2">
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider border-b border-slate-200 pb-1">
                    1. Employment Terms
                  </h4>
                  <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-700">
                    <li><strong>Date of Joining:</strong> {new Date(previewLetter.joiningDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</li>
                    <li><strong>Work Mode &amp; Location:</strong> {previewLetter.terms?.workMode || 'Hybrid'}</li>
                    <li><strong>Working Schedule:</strong> {previewLetter.terms?.workingHours || 'Mon-Fri 09:30 AM - 06:30 PM'}</li>
                    <li><strong>Probationary Period:</strong> {previewLetter.terms?.probationMonths || 3} months from joining date, subject to performance evaluation.</li>
                    <li><strong>Notice Period:</strong> {previewLetter.terms?.noticeDays || 30} days during probation and 60 days post confirmation.</li>
                  </ul>
                </div>

                {/* Compensation Structure Table */}
                <div className="mb-8">
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider border-b border-slate-200 pb-1 mb-3">
                    2. Compensation &amp; Benefits (Annexure A)
                  </h4>
                  <table className="w-full text-xs border border-slate-200">
                    <thead className="bg-slate-100 font-bold text-slate-700">
                      <tr>
                        <th className="p-2.5 border-b border-r border-slate-200 text-left">Salary Component</th>
                        <th className="p-2.5 border-b border-r border-slate-200 text-right">Monthly (₹)</th>
                        <th className="p-2.5 border-b border-slate-200 text-right">Annualized (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      <tr>
                        <td className="p-2.5 border-r border-slate-200">Basic Salary (50%)</td>
                        <td className="p-2.5 border-r border-slate-200 text-right font-medium">₹{previewLetter.breakdown.basicMonthly.toLocaleString('en-IN')}</td>
                        <td className="p-2.5 text-right font-medium">₹{(previewLetter.breakdown.basicMonthly * 12).toLocaleString('en-IN')}</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 border-r border-slate-200">House Rent Allowance (HRA)</td>
                        <td className="p-2.5 border-r border-slate-200 text-right font-medium">₹{previewLetter.breakdown.hraMonthly.toLocaleString('en-IN')}</td>
                        <td className="p-2.5 text-right font-medium">₹{(previewLetter.breakdown.hraMonthly * 12).toLocaleString('en-IN')}</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 border-r border-slate-200">Special / Flexible Allowance</td>
                        <td className="p-2.5 border-r border-slate-200 text-right font-medium">₹{previewLetter.breakdown.specialAllowanceMonthly.toLocaleString('en-IN')}</td>
                        <td className="p-2.5 text-right font-medium">₹{(previewLetter.breakdown.specialAllowanceMonthly * 12).toLocaleString('en-IN')}</td>
                      </tr>
                      <tr className="bg-indigo-50/60 font-bold text-indigo-950">
                        <td className="p-2.5 border-r border-slate-200">Total Gross CTC</td>
                        <td className="p-2.5 border-r border-slate-200 text-right">₹{previewLetter.monthlySalary.toLocaleString('en-IN')}</td>
                        <td className="p-2.5 text-right">₹{previewLetter.annualCtc.toLocaleString('en-IN')}</td>
                      </tr>
                      <tr className="text-slate-500">
                        <td className="p-2.5 border-r border-slate-200">Less: Provident Fund (Employee PF)</td>
                        <td className="p-2.5 border-r border-slate-200 text-right">₹{previewLetter.breakdown.pfMonthly.toLocaleString('en-IN')}</td>
                        <td className="p-2.5 text-right">₹{(previewLetter.breakdown.pfMonthly * 12).toLocaleString('en-IN')}</td>
                      </tr>
                      <tr className="text-slate-500">
                        <td className="p-2.5 border-r border-slate-200">Less: Professional Tax (PT)</td>
                        <td className="p-2.5 border-r border-slate-200 text-right">₹{previewLetter.breakdown.ptMonthly.toLocaleString('en-IN')}</td>
                        <td className="p-2.5 text-right">₹{(previewLetter.breakdown.ptMonthly * 12).toLocaleString('en-IN')}</td>
                      </tr>
                      <tr className="bg-emerald-50 font-bold text-emerald-950">
                        <td className="p-2.5 border-r border-slate-200">Estimated Net Take-Home (Pre-Tax)</td>
                        <td className="p-2.5 border-r border-slate-200 text-right">₹{previewLetter.breakdown.netMonthly.toLocaleString('en-IN')}</td>
                        <td className="p-2.5 text-right">₹{(previewLetter.breakdown.netMonthly * 12).toLocaleString('en-IN')}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Signatures */}
                <div className="mt-12 pt-8 border-t border-slate-200 grid grid-cols-2 gap-8">
                  <div>
                    <p className="text-xs font-bold text-slate-900 mb-12">For {company?.name || 'the Company'}:</p>
                    <div className="border-t border-slate-400 pt-1 w-48 text-xs text-slate-600">
                      Authorized HR Signatory
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-bold text-slate-900 mb-12">Candidate Acceptance:</p>
                    <div className="border-t border-slate-400 pt-1 w-48 text-xs text-slate-600">
                      {previewLetter.candidateName} (Sign &amp; Date)
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
