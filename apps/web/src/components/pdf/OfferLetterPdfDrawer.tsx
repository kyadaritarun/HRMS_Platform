import React from 'react';
import { createPortal } from 'react-dom';
import {
  IconArrowLeft,
  IconPrinter,
  IconX,
  IconFileText,
  IconChevronDown,
  IconPaperclip,
} from '@tabler/icons-react';

export interface SalaryComponentItem {
  id?: string;
  name: string;
  monthly: number;
}

export interface AttachedFileItem {
  id?: string;
  name: string;
  size?: string;
  url?: string;
}

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
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'JOINED' | 'DECLINED';
  createdAt: string;
  includeSalaryBreakdown?: boolean;
  includeTermsAndConditions?: boolean;
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
    customComponents?: SalaryComponentItem[];
  };
  attachedFiles?: AttachedFileItem[];
}

export interface OfferLetterPdfDrawerProps {
  letter: OfferLetterItem | null;
  company?: {
    name?: string;
    subdomain?: string;
  } | null;
  onClose: () => void;
  onUpdateStatus?: (newStatus: OfferLetterItem['status']) => void;
  onUpdateOptions?: (
    letterId: string,
    options: { includeSalaryBreakdown?: boolean; includeTermsAndConditions?: boolean }
  ) => void;
}

export const OfferLetterPdfDrawer: React.FC<OfferLetterPdfDrawerProps> = ({
  letter,
  company,
  onClose,
  onUpdateStatus,
  onUpdateOptions,
}) => {
  if (!letter || typeof document === 'undefined') return null;

  const [includeSalaryBreakdown, setIncludeSalaryBreakdown] = React.useState<boolean>(
    letter.includeSalaryBreakdown !== false
  );
  const [includeTermsAndConditions, setIncludeTermsAndConditions] = React.useState<boolean>(
    letter.includeTermsAndConditions !== false
  );

  React.useEffect(() => {
    if (letter) {
      setIncludeSalaryBreakdown(letter.includeSalaryBreakdown !== false);
      setIncludeTermsAndConditions(letter.includeTermsAndConditions !== false);
    }
  }, [letter.id, letter.includeSalaryBreakdown, letter.includeTermsAndConditions]);

  const handleToggleSalary = (val: boolean) => {
    setIncludeSalaryBreakdown(val);
    onUpdateOptions?.(letter.id, {
      includeSalaryBreakdown: val,
      includeTermsAndConditions,
    });
  };

  const handleToggleTerms = (val: boolean) => {
    setIncludeTermsAndConditions(val);
    onUpdateOptions?.(letter.id, {
      includeSalaryBreakdown,
      includeTermsAndConditions: val,
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadWord = () => {
    const companyName = company?.name || 'Company Name';
    const formattedDate = new Date(letter.createdAt).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const joiningDateFormatted = new Date(letter.joiningDate).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>Employment Offer Letter - ${letter.candidateName}</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          @page {
            size: A4 portrait;
            margin: 20mm 20mm 20mm 20mm;
          }
          body {
            font-family: 'Calibri', 'Arial', sans-serif;
            font-size: 11pt;
            line-height: 1.5;
            color: #1e293b;
          }
          h1, h2, h3, h4 { color: #0f172a; margin-top: 16pt; margin-bottom: 6pt; }
          .header-box { border-bottom: 2pt solid #0f172a; padding-bottom: 12pt; margin-bottom: 20pt; }
          .company-name { font-size: 20pt; font-weight: bold; text-transform: uppercase; color: #312e81; }
          .sub-header { font-size: 9pt; color: #64748b; margin-top: 2pt; }
          .date-box { text-align: right; font-size: 10pt; color: #475569; margin-bottom: 15pt; }
          .recipient { margin-bottom: 15pt; line-height: 1.4; }
          .subject-box { background-color: #f8fafc; border-left: 4pt solid #4f46e5; padding: 8pt 12pt; font-weight: bold; margin-bottom: 15pt; font-size: 11pt; }
          .section-title { font-size: 12pt; font-weight: bold; text-transform: uppercase; margin-top: 16pt; margin-bottom: 8pt; color: #0f172a; border-bottom: 1pt solid #e2e8f0; padding-bottom: 3pt; }
          table { width: 100%; border-collapse: collapse; margin-top: 10pt; margin-bottom: 15pt; font-size: 10pt; }
          th, td { border: 1pt solid #cbd5e1; padding: 6pt 10pt; text-align: left; }
          th { background-color: #f1f5f9; font-weight: bold; color: #0f172a; }
          .text-right { text-align: right; }
          .bold { font-weight: bold; }
          .total-row { background-color: #f8fafc; font-weight: bold; }
          .takehome-row { background-color: #ecfdf5; font-weight: bold; color: #065f46; }
          .term-item { margin-bottom: 8pt; }
          .term-title { font-weight: bold; color: #0f172a; }
          .signatures { margin-top: 40pt; width: 100%; }
          .sig-cell { width: 50%; vertical-align: top; padding-top: 50pt; }
          .sig-line { border-top: 1pt solid #64748b; width: 180pt; padding-top: 4pt; font-size: 9pt; color: #64748b; }
        </style>
      </head>
      <body>
        <div class="header-box">
          <div class="company-name">${companyName}</div>
          <div class="sub-header">Registered Corporate Office • Uptrix HRMS Platform</div>
        </div>

        <div class="date-box">
          <strong>Date:</strong> ${formattedDate}
        </div>

        <div class="recipient">
          <strong>To,</strong><br/>
          <strong>${letter.candidateName}</strong><br/>
          ${letter.candidateEmail}<br/>
          ${letter.candidatePhone || ''}
        </div>

        <div class="subject-box">
          Subject: Formal Offer of Employment for the position of ${letter.jobTitle}
        </div>

        <p>Dear <strong>${letter.candidateName}</strong>,</p>

        <p>
          On behalf of <strong>${companyName}</strong>, we are pleased to extend this formal offer of employment for the position of <strong>${letter.jobTitle}</strong> in the <strong>${letter.department}</strong> department. We were impressed with your qualifications and believe your skills will make a valuable impact.
        </p>

        <div class="section-title">1. Employment Terms</div>
        <ul>
          <li><strong>Date of Joining:</strong> ${joiningDateFormatted}</li>
          <li><strong>Designation:</strong> ${letter.jobTitle}</li>
          <li><strong>Department:</strong> ${letter.department}</li>
          <li><strong>Work Mode:</strong> ${letter.terms?.workMode || 'On-site (WFO)'}</li>
          <li><strong>Probation Period:</strong> ${letter.terms?.probationMonths || 3} months from date of joining</li>
          <li><strong>Notice Period:</strong> ${letter.terms?.noticeDays || 30} days upon confirmation</li>
          <li><strong>Working Hours:</strong> ${letter.terms?.workingHours || '09:30 AM - 06:30 PM (Mon-Fri)'}</li>
        </ul>

        <div class="section-title">2. Annual Compensation ${includeSalaryBreakdown ? 'Structure (Annexure A)' : ''}</div>
        <p>
          Your total Cost to Company (CTC) will be <strong>₹${Number(letter.annualCtc).toLocaleString('en-IN')}</strong> per annum${includeSalaryBreakdown ? ', structured as follows:' : '.'}
        </p>

        ${includeSalaryBreakdown ? `
        <table>
          <thead>
            <tr>
              <th>Salary Component</th>
              <th class="text-right">Monthly (₹)</th>
              <th class="text-right">Annual (₹)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Basic Salary (50%)</td>
              <td class="text-right">₹${letter.breakdown.basicMonthly.toLocaleString('en-IN')}</td>
              <td class="text-right">₹${(letter.breakdown.basicMonthly * 12).toLocaleString('en-IN')}</td>
            </tr>
            <tr>
              <td>House Rent Allowance (HRA 20%)</td>
              <td class="text-right">₹${letter.breakdown.hraMonthly.toLocaleString('en-IN')}</td>
              <td class="text-right">₹${(letter.breakdown.hraMonthly * 12).toLocaleString('en-IN')}</td>
            </tr>
            <tr>
              <td>Special Allowance</td>
              <td class="text-right">₹${letter.breakdown.specialAllowanceMonthly.toLocaleString('en-IN')}</td>
              <td class="text-right">₹${(letter.breakdown.specialAllowanceMonthly * 12).toLocaleString('en-IN')}</td>
            </tr>
            ${letter.breakdown.customComponents?.map((c) => `
            <tr>
              <td>${c.name}</td>
              <td class="text-right">₹${Number(c.monthly).toLocaleString('en-IN')}</td>
              <td class="text-right">₹${(Number(c.monthly) * 12).toLocaleString('en-IN')}</td>
            </tr>
            `).join('') || ''}
            <tr class="total-row">
              <td>Total Gross Salary (Monthly CTC)</td>
              <td class="text-right">₹${Math.round(letter.annualCtc / 12).toLocaleString('en-IN')}</td>
              <td class="text-right">₹${Number(letter.annualCtc).toLocaleString('en-IN')}</td>
            </tr>
            <tr class="takehome-row">
              <td>Estimated Net Take-Home (Pre-Tax)</td>
              <td class="text-right">₹${letter.breakdown.netMonthly.toLocaleString('en-IN')}</td>
              <td class="text-right">₹${(letter.breakdown.netMonthly * 12).toLocaleString('en-IN')}</td>
            </tr>
          </tbody>
        </table>
        ` : ''}

        ${includeTermsAndConditions ? `
        <div class="section-title">3. Standard Terms &amp; Conditions (Annexure B)</div>
        <div class="term-item">
          <div class="term-title">3.1 Duties &amp; Code of Conduct:</div>
          <div>You shall devote your full business time and best efforts to the performance of your duties, adhering strictly to Company policies, ethics standards, and operational guidelines.</div>
        </div>
        <div class="term-item">
          <div class="term-title">3.2 Work Arrangement &amp; Location:</div>
          <div>Your role is designated under <strong>${letter.terms?.workMode || 'On-site (WFO)'}</strong>. The Company reserves the right to reassign or adjust work locations and project responsibilities based on operational exigencies.</div>
        </div>
        <div class="term-item">
          <div class="term-title">3.3 Probation &amp; Confirmation:</div>
          <div>You will be on probation for <strong>${letter.terms?.probationMonths || 3} months</strong>. Upon satisfactory completion, formal employment confirmation will be issued in writing.</div>
        </div>
        <div class="term-item">
          <div class="term-title">3.4 Notice Period &amp; Separation:</div>
          <div>During probation, either party may terminate employment with 15 days written notice. After confirmation, the notice period shall be <strong>${letter.terms?.noticeDays || 30} days</strong>, or salary in lieu thereof with management concurrence.</div>
        </div>
        <div class="term-item">
          <div class="term-title">3.5 Confidentiality &amp; Non-Disclosure:</div>
          <div>You agree not to disclose, divulge, or publish any trade secrets, software code, customer data, pricing, or proprietary business information of the Company during or after your tenure.</div>
        </div>
        <div class="term-item">
          <div class="term-title">3.6 Intellectual Property Rights:</div>
          <div>All inventions, software, documentation, designs, and discoveries conceived or created by you in connection with your employment shall belong exclusively to the Company.</div>
        </div>
        <div class="term-item">
          <div class="term-title">3.7 Background Verification &amp; Documents:</div>
          <div>This offer is contingent upon successful verification of references and background records, and presentation of valid relieving documents, educational certificates, and identity verification.</div>
        </div>
        ` : ''}

        ${letter.attachedFiles && letter.attachedFiles.length > 0 ? `
        <div class="section-title">4. Enclosed Documents &amp; Attachments</div>
        <ul>
          ${letter.attachedFiles.map((f) => `<li><strong>${f.name}</strong> ${f.size ? `(${f.size})` : ''}</li>`).join('')}
        </ul>
        ` : ''}

        <table class="signatures" style="border: none;">
          <tr style="border: none;">
            <td class="sig-cell" style="border: none;">
              <p><strong>For ${companyName}:</strong></p>
              <div class="sig-line">Authorized HR Signatory</div>
            </td>
            <td class="sig-cell" style="border: none;">
              <p><strong>Candidate Acceptance:</strong></p>
              <div class="sig-line">${letter.candidateName} (Sign &amp; Date)</div>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff' + htmlContent], {
      type: 'application/msword;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${letter.candidateName.replace(/\s+/g, '_')}_Offer_Letter.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
            <div className="flex flex-wrap items-center justify-between p-4 sm:p-5 border-b border-slate-200 bg-white shrink-0 print:hidden no-print gap-3">
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
                  Offer Letter Preview — {letter.candidateName}
                </span>
              </div>

              <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                {/* Status Selector */}
                {onUpdateStatus && (
                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
                    <span className="text-slate-400 font-semibold text-[11px]">Status:</span>
                    <select
                      value={letter.status}
                      onChange={(e) => onUpdateStatus(e.target.value as any)}
                      className="bg-transparent font-bold text-xs text-slate-800 outline-none cursor-pointer"
                    >
                      <option value="DRAFT">Draft</option>
                      <option value="SENT">Sent</option>
                      <option value="ACCEPTED">Accepted</option>
                      <option value="JOINED">Joined</option>
                      <option value="DECLINED">Declined</option>
                    </select>
                  </div>
                )}

                {/* Download Word Document Button */}
                <button
                  type="button"
                  onClick={handleDownloadWord}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                  title="Download editable Word document with complete Terms & Conditions"
                >
                  <IconFileText className="w-4 h-4" />
                  <span>Download Word (.doc)</span>
                </button>

                {/* Print / Save as PDF Button */}
                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                >
                  <IconPrinter className="w-4 h-4" />
                  <span>Print / Save as PDF</span>
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

            {/* Content Customization Sub-bar */}
            <div className="px-4 sm:px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-3 shrink-0 print:hidden no-print">
              <span className="font-semibold text-slate-700 text-[11px] uppercase tracking-wider">
                Include in Offer Letter:
              </span>
              <div className="flex items-center gap-3 sm:gap-5 flex-wrap">
                <label className="flex items-center gap-2 cursor-pointer select-none font-medium hover:text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                  <input
                    type="checkbox"
                    checked={includeSalaryBreakdown}
                    onChange={(e) => handleToggleSalary(e.target.checked)}
                    className="w-3.5 h-3.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span>Salary Structure Table (Annexure A)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none font-medium hover:text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                  <input
                    type="checkbox"
                    checked={includeTermsAndConditions}
                    onChange={(e) => handleToggleTerms(e.target.checked)}
                    className="w-3.5 h-3.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span>Terms &amp; Conditions (Annexure B)</span>
                </label>
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
                    <span className="text-xs text-slate-500 block">
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
                      <li><strong>Work Mode:</strong> {letter.terms?.workMode || 'On-site (WFO)'}</li>
                      <li><strong>Probation Period:</strong> {letter.terms?.probationMonths || 3} months</li>
                      <li><strong>Notice Period:</strong> {letter.terms?.noticeDays || 30} days upon confirmation</li>
                      <li><strong>Working Hours:</strong> {letter.terms?.workingHours || '09:30 AM - 06:30 PM (Mon-Fri)'}</li>
                    </ul>
                  </div>

                  <div className="pt-2">
                    <h4 className="font-bold text-slate-900 uppercase text-xs tracking-wider mb-2">
                      2. Annual Compensation {includeSalaryBreakdown ? '& Salary Structure (Annexure A)' : ''}
                    </h4>
                    <p className="mb-3 text-slate-600">
                      Your Total Cost to Company (CTC) will be <strong>₹{Number(letter.annualCtc).toLocaleString('en-IN')}</strong> per annum{includeSalaryBreakdown ? ', structured as follows:' : '.'}
                    </p>

                    {includeSalaryBreakdown ? (
                      <table className="w-full border border-slate-200 text-xs text-left mb-4">
                        <thead className="bg-[#e5e7eb] border-b border-slate-300 font-bold text-xs text-slate-900">
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
                          {letter.breakdown.customComponents?.map((comp, idx) => (
                            <tr key={idx}>
                              <td className="p-2.5 border-r border-slate-200 font-medium">{comp.name}</td>
                              <td className="p-2.5 border-r border-slate-200 text-right">₹{Number(comp.monthly).toLocaleString('en-IN')}</td>
                              <td className="p-2.5 text-right">₹{(Number(comp.monthly) * 12).toLocaleString('en-IN')}</td>
                            </tr>
                          ))}
                          <tr className="bg-slate-50 font-bold text-slate-900 border-t-2 border-slate-300">
                            <td className="p-2.5 border-r border-slate-200">Total Gross Salary (Monthly CTC)</td>
                            <td className="p-2.5 border-r border-slate-200 text-right">₹{Math.round(letter.annualCtc / 12).toLocaleString('en-IN')}</td>
                            <td className="p-2.5 text-right text-indigo-600">₹{Number(letter.annualCtc).toLocaleString('en-IN')}</td>
                          </tr>
                          <tr className="bg-emerald-50/60 font-bold text-emerald-900">
                            <td className="p-2.5 border-r border-slate-200">Estimated Net Take-Home (Pre-Tax)</td>
                            <td className="p-2.5 border-r border-slate-200 text-right">₹{letter.breakdown.netMonthly.toLocaleString('en-IN')}</td>
                            <td className="p-2.5 text-right">₹{(letter.breakdown.netMonthly * 12).toLocaleString('en-IN')}</td>
                          </tr>
                        </tbody>
                      </table>
                    ) : (
                      <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-500 mb-4 print:border-none print:p-0">
                        <span className="italic">Detailed itemized salary breakdown annexure is omitted per offer options.</span>
                      </div>
                    )}
                  </div>

                  {/* Comprehensive Terms & Conditions (Annexure B) */}
                  {includeTermsAndConditions && (
                    <div className="pt-4 border-t border-slate-100">
                      <h4 className="font-bold text-slate-900 uppercase text-xs tracking-wider mb-2">
                        3. Standard Terms &amp; Conditions of Employment (Annexure B)
                      </h4>
                      <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
                        <div>
                          <strong className="text-slate-800 block mb-0.5">3.1 Duties and Code of Conduct</strong>
                          <p>
                            You are required to perform your responsibilities with professional diligence and integrity, in compliance with company operational directives, security procedures, and code of business ethics.
                          </p>
                        </div>
                        <div>
                          <strong className="text-slate-800 block mb-0.5">3.2 Working Arrangement &amp; Location</strong>
                          <p>
                            Your standard engagement mode shall be <strong>{letter.terms?.workMode || 'On-site (WFO)'}</strong> during operating hours of {letter.terms?.workingHours || '09:30 AM - 06:30 PM (Mon-Fri)'}. The Company reserves the discretion to assign or reassign workstations in accordance with business requirements.
                          </p>
                        </div>
                        <div>
                          <strong className="text-slate-800 block mb-0.5">3.3 Probation Period &amp; Confirmation</strong>
                          <p>
                            You shall serve an initial probationary period of <strong>{letter.terms?.probationMonths || 3} months</strong> from your joining date. Confirmation of employment is contingent upon satisfactory appraisal and will be communicated in writing.
                          </p>
                        </div>
                        <div>
                          <strong className="text-slate-800 block mb-0.5">3.4 Notice Period &amp; Separation</strong>
                          <p>
                            During probation, either party may terminate this agreement with 15 calendar days' written notice. Following confirmation, the applicable notice period shall be <strong>{letter.terms?.noticeDays || 30} days</strong>, or gross compensation in lieu thereof upon mutual approval.
                          </p>
                        </div>
                        <div>
                          <strong className="text-slate-800 block mb-0.5">3.5 Confidentiality &amp; Non-Disclosure</strong>
                          <p>
                            You agree to maintain strict confidentiality regarding all proprietary information, software codebase, client contracts, financial data, and trade secrets during and after your term of employment.
                          </p>
                        </div>
                        <div>
                          <strong className="text-slate-800 block mb-0.5">3.6 Intellectual Property Rights</strong>
                          <p>
                            All intellectual property, software code, inventions, and research produced by you in the course of your employment shall vest exclusively with the Company.
                          </p>
                        </div>
                        <div>
                          <strong className="text-slate-800 block mb-0.5">3.7 Background Verification Contingency</strong>
                          <p>
                            This offer is provisional and subject to successful background checks, identity validation, and submission of authentic educational qualifications and relieving credentials from prior employers.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Enclosed Attachments & Documents */}
                  {letter.attachedFiles && letter.attachedFiles.length > 0 && (
                    <div className="pt-4 border-t border-slate-100">
                      <h4 className="font-bold text-slate-900 uppercase text-xs tracking-wider mb-2">
                        {includeTermsAndConditions ? '4.' : '3.'} Enclosed Documents &amp; Attachments
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {letter.attachedFiles.map((file, idx) => (
                          <div
                            key={idx}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 shadow-2xs"
                          >
                            <IconPaperclip className="w-3.5 h-3.5 text-indigo-600" />
                            <span>{file.name}</span>
                            {file.size && <span className="text-[10px] text-slate-400">({file.size})</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

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
