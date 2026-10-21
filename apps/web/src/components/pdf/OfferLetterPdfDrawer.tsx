import React from 'react';
import { createPortal } from 'react-dom';
import { IconArrowLeft, IconPrinter, IconX } from '@tabler/icons-react';

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
    pfMonthly?: number;
    ptMonthly?: number;
    netMonthly: number;
  };
}

export interface OfferLetterPdfDrawerProps {
  letter: OfferLetterItem | null;
  company?: {
    name?: string;
    subdomain?: string;
  } | null;
  onClose: () => void;
}

export const OfferLetterPdfDrawer: React.FC<OfferLetterPdfDrawerProps> = ({
  letter,
  company,
  onClose,
}) => {
  if (!letter || typeof document === 'undefined') return null;

  const handlePrint = () => {
    window.print();
  };

  return createPortal(
    <>
      {/* Scoped Print Styles: Prevents blank pages and isolates the offer letter sheet */}
      <style>{`
        @media print {
          #root {
            display: none !important;
          }
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
          }
          #printable-offer-letter-wrapper {
            position: static !important;
            inset: auto !important;
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            display: block !important;
            background: #ffffff !important;
          }
          #printable-offer-letter-container {
            position: static !important;
            display: block !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          #printable-offer-letter-drawer {
            position: static !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            display: block !important;
            background: #ffffff !important;
          }
          #printable-offer-letter-sheet-area {
            overflow: visible !important;
            height: auto !important;
            padding: 0 !important;
            margin: 0 !important;
            display: block !important;
          }
          #printable-offer-letter {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
          }
          @page {
            size: A4 portrait;
            margin: 12mm 15mm;
          }
        }
      `}</style>

      <div
        id="printable-offer-letter-wrapper"
        className="fixed inset-0 z-[9999] overflow-hidden"
      >
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity print:hidden no-print"
          onClick={onClose}
        />

        {/* Right-Side Drawer Container */}
        <div
          id="printable-offer-letter-container"
          className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10 pointer-events-none print:static print:p-0"
        >
          <div
            id="printable-offer-letter-drawer"
            className="w-screen max-w-3xl bg-slate-100 shadow-2xl flex flex-col h-full border-l border-slate-200 pointer-events-auto print:border-none print:shadow-none print:p-0 print:m-0 print:max-w-none print:w-full print:rounded-none print:h-auto print:block print:bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Toolbar (Sticky) */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 bg-white shrink-0 print:hidden no-print">
              <div className="flex items-center gap-2 min-w-0">
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 cursor-pointer transition-colors"
                  title="Back"
                >
                  <IconArrowLeft className="w-5 h-5" />
                </button>
                <span className="font-bold text-sm text-slate-900 truncate">
                  Offer Letter Preview — {letter.candidateName} ({letter.id})
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                >
                  <IconPrinter className="w-4 h-4" /> Print / Save as PDF
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 cursor-pointer transition-colors"
                  title="Close"
                >
                  <IconX className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document Sheet Area */}
            <div
              id="printable-offer-letter-sheet-area"
              className="overflow-y-auto flex-1 p-4 sm:p-8 flex justify-center print:p-0 print:overflow-visible print:h-auto print:block"
            >
              <div
                id="printable-offer-letter"
                className="bg-white max-w-[800px] w-full p-8 sm:p-12 rounded-2xl shadow-sm border border-slate-200 text-slate-800 text-sm leading-relaxed print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-none"
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
                      Ref: {letter.id}
                    </span>
                    <span className="text-xs text-slate-500">
                      Date: {new Date(letter.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>

                {/* Candidate Address Block */}
                <div className="mb-6 space-y-1">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">To,</p>
                  <h3 className="font-bold text-base text-slate-900">{letter.candidateName}</h3>
                  <p className="text-xs text-slate-600">{letter.candidateEmail}</p>
                  {letter.candidatePhone && (
                    <p className="text-xs text-slate-600">{letter.candidatePhone}</p>
                  )}
                </div>

                {/* Subject Header */}
                <div className="p-3 bg-slate-50 border-l-4 border-indigo-600 rounded-r-lg mb-6">
                  <p className="font-bold text-slate-900 text-xs sm:text-sm">
                    Subject: Formal Offer of Employment for the position of {letter.jobTitle}
                  </p>
                </div>

                {/* Body Content */}
                <div className="space-y-4 text-xs sm:text-sm text-slate-700">
                  <p>Dear <strong>{letter.candidateName}</strong>,</p>

                  <p>
                    On behalf of <strong>{company?.name || 'the Company'}</strong>, we are delighted to extend this formal offer of employment for the role of <strong>{letter.jobTitle}</strong> in our <strong>{letter.department}</strong> department. We were thoroughly impressed with your background, qualifications, and potential contributions to our team.
                  </p>

                  <div className="pt-2">
                    <h4 className="font-bold text-slate-900 uppercase text-xs tracking-wider mb-2">
                      1. Employment Terms
                    </h4>
                    <ul className="list-disc list-inside space-y-1.5 pl-2 text-slate-600">
                      <li>
                        <strong>Date of Joining:</strong> {new Date(letter.joiningDate).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </li>
                      <li><strong>Designation:</strong> {letter.jobTitle}</li>
                      <li><strong>Department:</strong> {letter.department}</li>
                      <li><strong>Work Mode:</strong> {letter.terms?.workMode || 'Hybrid'}</li>
                      <li><strong>Probation Period:</strong> {letter.terms?.probationMonths || 3} months</li>
                      <li><strong>Notice Period:</strong> {letter.terms?.noticeDays || 30} days upon confirmation</li>
                    </ul>
                  </div>

                  <div className="pt-2">
                    <h4 className="font-bold text-slate-900 uppercase text-xs tracking-wider mb-2">
                      2. Annual Compensation &amp; Salary Structure (Annexure A)
                    </h4>
                    <p className="mb-3 text-slate-600">
                      Your Total Cost to Company (CTC) will be <strong>₹{Number(letter.annualCtc).toLocaleString('en-IN')}</strong> per annum, structured as follows:
                    </p>

                    <table className="w-full border border-slate-200 text-xs text-left mb-4">
                      <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
                        <tr>
                          <th className="p-2.5 border-r border-slate-200">Component</th>
                          <th className="p-2.5 border-r border-slate-200 text-right">Monthly (₹)</th>
                          <th className="p-2.5 text-right">Annual (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-slate-700">
                        <tr>
                          <td className="p-2.5 border-r border-slate-200 font-medium">Basic Salary (50%)</td>
                          <td className="p-2.5 border-r border-slate-200 text-right">₹{letter.breakdown.basicMonthly.toLocaleString('en-IN')}</td>
                          <td className="p-2.5 text-right">₹{(letter.breakdown.basicMonthly * 12).toLocaleString('en-IN')}</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 border-r border-slate-200 font-medium">House Rent Allowance (HRA 20%)</td>
                          <td className="p-2.5 border-r border-slate-200 text-right">₹{letter.breakdown.hraMonthly.toLocaleString('en-IN')}</td>
                          <td className="p-2.5 text-right">₹{(letter.breakdown.hraMonthly * 12).toLocaleString('en-IN')}</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 border-r border-slate-200 font-medium">Special Allowance</td>
                          <td className="p-2.5 border-r border-slate-200 text-right">₹{letter.breakdown.specialAllowanceMonthly.toLocaleString('en-IN')}</td>
                          <td className="p-2.5 text-right">₹{(letter.breakdown.specialAllowanceMonthly * 12).toLocaleString('en-IN')}</td>
                        </tr>
                        <tr className="bg-slate-50 font-bold text-slate-900 border-t-2 border-slate-300">
                          <td className="p-2.5 border-r border-slate-200">Total Gross Salary (Monthly CTC)</td>
                          <td className="p-2.5 border-r border-slate-200 text-right">₹{Math.round(letter.annualCtc / 12).toLocaleString('en-IN')}</td>
                          <td className="p-2.5 text-right text-indigo-600">₹{letter.annualCtc.toLocaleString('en-IN')}</td>
                        </tr>
                        <tr className="bg-emerald-50/60 font-bold text-emerald-900">
                          <td className="p-2.5 border-r border-slate-200">Estimated Net Take-Home (Pre-Tax)</td>
                          <td className="p-2.5 border-r border-slate-200 text-right">₹{letter.breakdown.netMonthly.toLocaleString('en-IN')}</td>
                          <td className="p-2.5 text-right">₹{(letter.breakdown.netMonthly * 12).toLocaleString('en-IN')}</td>
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
                        {letter.candidateName} (Sign &amp; Date)
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};

export default OfferLetterPdfDrawer;
