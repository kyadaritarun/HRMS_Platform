import React, { useState, useEffect, useRef } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import {
  IconFileCertificate,
  IconPlus,
  IconPrinter,
  IconDownload,
  IconSearch,
  IconCheck,
  IconUser,
  IconBuilding,
  IconCalendar,
  IconFileText,
  IconAward,
  IconAlertTriangle,
  IconBriefcase,
  IconEye,
  IconX,
  IconPencil,
  IconRotateClockwise,
  IconTrash,
  IconCopy,
  IconBold,
  IconItalic,
  IconUnderline,
} from '@tabler/icons-react';

export type LetterType =
  | 'RELIEVING_EXPERIENCE'
  | 'BONAFIDE_EMPLOYMENT'
  | 'INCREMENT_APPRAISAL'
  | 'INTERNSHIP_COMPLETION'
  | 'WARNING_SHOWCAUSE';

export interface IssuedLetter {
  id: string;
  type: LetterType;
  employeeName: string;
  employeeId?: string;
  designation: string;
  department: string;
  issueDate: string;
  referenceNumber: string;
  contentSnapshot: any;
}

const STORAGE_KEY = 'uptrix_issued_hr_letters';

const stripHtml = (html: string) => {
  const tmp = document.createElement('DIV');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
};

const getDefaultLetterContent = (
  type: LetterType,
  data: any,
  companyName: string
): { title: string; salutation: string; paragraphs: string[] } => {
  const comp = companyName || 'Kyadari Technologies Pvt Ltd';
  const boldName = `<strong class="font-bold text-slate-950">${data.recipientName || 'Employee'}</strong>`;
  const boldCompany = `<strong class="font-bold text-slate-950">${comp}</strong>`;
  const boldDesignation = `<strong class="font-bold text-slate-900">${data.designation || 'Associate'}</strong>`;
  const boldDept = `<strong class="font-bold text-slate-900">${data.department || 'General'}</strong>`;

  switch (type) {
    case 'RELIEVING_EXPERIENCE':
      return {
        title: 'EXPERIENCE & SERVICE RELIEVING CERTIFICATE',
        salutation: 'To Whom It May Concern,',
        paragraphs: [
          `This is to certify that ${boldName} was employed with ${boldCompany} from <strong class="font-bold text-slate-900">${data.joiningDate}</strong> to <strong class="font-bold text-slate-900">${data.relievingDate}</strong>. At the time of relieving, their designation was ${boldDesignation} in the ${boldDept} department.`,
          `During their tenure with us, we found them to be diligent, self-motivated, and committed to their responsibilities. They have successfully completed all project handovers, and all organizational dues and clearances have been settled in full.`,
          `They are relieved of their duties effective close of business hours on <strong class="font-bold text-slate-900">${data.relievingDate}</strong>. We sincerely thank them for their valuable contributions and wish them the very best in all their future professional endeavors.`,
        ],
      };

    case 'BONAFIDE_EMPLOYMENT':
      return {
        title: 'CERTIFICATE OF BONAFIDE EMPLOYMENT',
        salutation: 'To Whom It May Concern,',
        paragraphs: [
          `This is to formally certify that ${boldName} is a bonafide full-time employee of ${boldCompany}, holding the position of ${boldDesignation} in the ${boldDept} department since <strong class="font-bold text-slate-900">${data.joiningDate}</strong>.`,
          `Their current Annual Cost to Company (CTC) is <strong class="font-bold text-slate-950">₹${Number(data.annualCtc || 0).toLocaleString('en-IN')}</strong> (Indian Rupees). Their employment status with the company is active, confirmed, and in good standing.`,
          `This certificate is being issued upon the specific request of the employee for the purpose of <strong class="font-bold text-slate-900">${data.bonafidePurpose}</strong>, without any financial liability on the part of ${boldCompany}.`,
        ],
      };

    case 'INCREMENT_APPRAISAL':
      return {
        title: 'ANNUAL COMPENSATION REVISION & APPRAISAL',
        salutation: `Dear ${boldName},`,
        paragraphs: [
          `Following your annual performance review and in recognition of your consistent dedication, impact, and contributions to the ${boldDept} department, the management is pleased to inform you of the revision in your annual compensation package.`,
          `Effective <strong class="font-bold text-slate-900">${data.effectiveDate}</strong>, your designation will be ${boldDesignation}. Your annual compensation has been revised from <strong class="font-bold text-slate-900">₹${Number(data.previousCtc || 0).toLocaleString('en-IN')}</strong> to <strong class="font-bold text-emerald-700">₹${Number(data.revisedCtc || 0).toLocaleString('en-IN')}</strong> per annum, representing an increment of <strong class="font-bold text-emerald-700">${data.incrementPercentage}%</strong>.`,
          `All other terms, covenants, and conditions of your original employment appointment agreement remain unaltered and in full effect. We look forward to your continued leadership and scaling new milestones together.`,
        ],
      };

    case 'INTERNSHIP_COMPLETION':
      return {
        title: 'CERTIFICATE OF INTERNSHIP COMPLETION',
        salutation: 'To Whom It May Concern,',
        paragraphs: [
          `This is to certify that ${boldName} has successfully completed an intensive internship training program of <strong class="font-bold text-slate-900">${data.internshipDurationMonths} months</strong> with ${boldCompany} in the ${boldDept} division.`,
          `During this tenure, they actively contributed to the project entitled: <strong class="font-bold text-slate-900">&ldquo;${data.internshipProject}&rdquo;</strong>. Their analytical problem-solving skills, proactive teamwork, and willingness to learn were commendable throughout the duration of the program.`,
          `We congratulate them on the successful completion of the internship training and wish them abundant success in all their academic and professional pursuits.`,
        ],
      };

    case 'WARNING_SHOWCAUSE':
      return {
        title: 'FORMAL SHOW CAUSE NOTICE / ADVISORY',
        salutation: `Dear ${boldName},`,
        paragraphs: [
          `<strong class="font-bold text-rose-700">Official Notice Regarding: ${data.warningSubject}</strong>`,
          `It has been formally brought to the attention of People Operations that on or around <strong class="font-bold text-slate-900">${data.warningIncidentDate}</strong>, your conduct was found to be in non-adherence with company workplace guidelines regarding <strong class="font-bold text-slate-900">${data.warningSubject}</strong>.`,
          `Punctuality, professional conduct, and policy compliance are essential core expectations for every team member at ${boldCompany}. You are hereby requested to provide a written explanation addressing the above matter within <strong class="font-bold text-slate-900">${data.explanationDeadlineDays} working days</strong> from the receipt of this notice.`,
          `Failure to submit a satisfactory written explanation within the stipulated window may necessitate formal disciplinary action in accordance with standard organizational governance policies.`,
        ],
      };
  }
};

interface EditableParagraphProps {
  html: string;
  onChange: (newHtml: string) => void;
  onDelete?: () => void;
  canDelete?: boolean;
}

const EditableParagraph: React.FC<EditableParagraphProps> = ({
  html,
  onChange,
  onDelete,
  canDelete,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const lastHtmlRef = useRef<string>('');
  const isInitializedRef = useRef<boolean>(false);

  // Synchronize innerHTML only on initial mount or when external html changes (e.g. template reset)
  useEffect(() => {
    if (!ref.current) return;
    if (!isInitializedRef.current || (html !== lastHtmlRef.current && ref.current.innerHTML !== html)) {
      ref.current.innerHTML = html;
      lastHtmlRef.current = html;
      isInitializedRef.current = true;
    }
  }, [html]);

  return (
    <div className="relative group/p">
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => {
          const newHtml = e.currentTarget.innerHTML;
          lastHtmlRef.current = newHtml;
          onChange(newHtml);
        }}
        className="w-full bg-transparent p-2.5 -m-2.5 rounded-xl border border-transparent hover:border-indigo-200 hover:bg-slate-50/50 focus:border-indigo-500 focus:bg-indigo-50/15 focus:ring-1 focus:ring-indigo-400 outline-none font-sans text-xs sm:text-sm text-slate-800 leading-relaxed text-justify transition-all"
      />
      {canDelete && onDelete && (
        <button
          type="button"
          onClick={onDelete}
          className="absolute -right-6 top-1.5 opacity-0 group-hover/p:opacity-100 transition-opacity p-1 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-600 print:hidden cursor-pointer"
          title="Delete paragraph"
        >
          <IconTrash className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

export const HrLettersPage: React.FC = () => {
  const { company, user } = useAuth();
  const [employees, setEmployees] = useState<any[]>([]);
  const [issuedLetters, setIssuedLetters] = useState<IssuedLetter[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return [
      {
        id: 'LTR-2026-001',
        type: 'RELIEVING_EXPERIENCE',
        employeeName: 'Pooja Reddy',
        employeeId: 'EMP-104',
        designation: 'Senior Frontend Developer',
        department: 'Engineering',
        issueDate: '2026-10-15',
        referenceNumber: 'UPTX/HR/REL/2026/089',
        contentSnapshot: {
          joiningDate: '2023-01-10',
          relievingDate: '2026-10-15',
          conduct: 'exemplary',
        },
      },
      {
        id: 'LTR-2026-002',
        type: 'BONAFIDE_EMPLOYMENT',
        employeeName: 'Karan Mehra',
        employeeId: 'EMP-112',
        designation: 'Product Designer',
        department: 'Product & Design',
        issueDate: '2026-10-18',
        referenceNumber: 'UPTX/HR/BON/2026/041',
        contentSnapshot: {
          purpose: 'Schengen Visa Application & Verification of Employment',
          annualCtc: 950000,
        },
      },
    ];
  });

  const [activeTab, setActiveTab] = useState<'GENERATE' | 'REPOSITORY'>('GENERATE');
  const [selectedLetterType, setSelectedLetterType] = useState<LetterType>('RELIEVING_EXPERIENCE');
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState(false);

  // Form State for Letter Generation
  const [formData, setFormData] = useState({
    employeeId: '',
    recipientName: 'Vikram Joshi',
    designation: 'Full Stack Engineer',
    department: 'Engineering',
    joiningDate: '2023-06-01',
    relievingDate: '2026-10-31',
    referenceNumber: `UPTX/HR/${new Date().getFullYear()}/${Math.floor(100 + Math.random() * 900)}`,
    issueDate: new Date().toISOString().split('T')[0],
    signatoryName: user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Head of Human Resources',
    signatoryDesignation: 'Head - People Operations',
    // Custom fields for specific letters
    bonafidePurpose: 'Bank Home Loan Application & Proof of Employment',
    annualCtc: 1200000,
    previousCtc: 1000000,
    revisedCtc: 1250000,
    incrementPercentage: 25,
    effectiveDate: '2026-11-01',
    internshipProject: 'Design System & API Automation Portal',
    internshipDurationMonths: 6,
    warningSubject: 'Unauthorized Absence & Lapses in Attendance Adherence',
    warningIncidentDate: '2026-10-12',
    explanationDeadlineDays: 3,
  });

  // Direct In-Place Editable Content State with HTML formatting support
  const [letterTitle, setLetterTitle] = useState('');
  const [letterSalutation, setLetterSalutation] = useState('');
  const [letterParagraphs, setLetterParagraphs] = useState<string[]>([]);
  const [isCustomEdited, setIsCustomEdited] = useState(false);

  // Sync default template content when inputs change (unless user manually modified text)
  useEffect(() => {
    if (!isCustomEdited) {
      const defaultContent = getDefaultLetterContent(selectedLetterType, formData, company?.name || '');
      setLetterTitle(defaultContent.title);
      setLetterSalutation(defaultContent.salutation);
      setLetterParagraphs(defaultContent.paragraphs);
    }
  }, [
    selectedLetterType,
    formData.recipientName,
    formData.designation,
    formData.department,
    formData.joiningDate,
    formData.relievingDate,
    formData.bonafidePurpose,
    formData.annualCtc,
    formData.previousCtc,
    formData.revisedCtc,
    formData.incrementPercentage,
    formData.effectiveDate,
    formData.internshipProject,
    formData.internshipDurationMonths,
    formData.warningSubject,
    formData.warningIncidentDate,
    formData.explanationDeadlineDays,
    company?.name,
    isCustomEdited,
  ]);

  // Fetch employees
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const res = await api.get('/employees?pageSize=100');
        setEmployees(res.data?.items || []);
      } catch (err) {
        console.error('Failed to load employees for letters:', err);
      }
    };
    fetchStaff();
  }, []);

  // Save issued letters
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(issuedLetters));
    } catch (_) {}
  }, [issuedLetters]);

  // When an employee is picked from dropdown, auto-fill fields & refresh letter
  const handleSelectEmployee = (empId: string) => {
    const emp = employees.find((e) => String(e.id) === String(empId));
    if (!emp) return;

    setFormData((prev) => ({
      ...prev,
      employeeId: String(emp.id),
      recipientName: `${emp.firstName} ${emp.lastName}`.trim(),
      designation: emp.jobTitle || 'Associate',
      department: emp.department?.name || 'General',
      joiningDate: emp.joiningDate ? emp.joiningDate.split('T')[0] : '2024-01-01',
      annualCtc: Number(emp.monthlySalary || 50000) * 12,
      previousCtc: Number(emp.monthlySalary || 50000) * 12,
      revisedCtc: Math.round(Number(emp.monthlySalary || 50000) * 12 * 1.15),
      incrementPercentage: 15,
    }));
    setIsCustomEdited(false);
  };

  // Switch template
  const handleSelectTemplate = (typeId: LetterType) => {
    setSelectedLetterType(typeId);
    setFormData((p) => ({
      ...p,
      referenceNumber: `UPTX/HR/${typeId.slice(0, 3)}/${new Date().getFullYear()}/${Math.floor(
        100 + Math.random() * 900
      )}`,
    }));
    setIsCustomEdited(false);
  };

  // Reset in-place edited text back to standard template
  const handleResetToTemplate = () => {
    const defaultContent = getDefaultLetterContent(selectedLetterType, formData, company?.name || '');
    setLetterTitle(defaultContent.title);
    setLetterSalutation(defaultContent.salutation);
    setLetterParagraphs(defaultContent.paragraphs);
    setIsCustomEdited(false);
  };

  // Paragraph handlers
  const handleParagraphChange = (index: number, val: string) => {
    setIsCustomEdited(true);
    setLetterParagraphs((prev) => {
      const copy = [...prev];
      copy[index] = val;
      return copy;
    });
  };

  const handleAddParagraph = () => {
    setIsCustomEdited(true);
    setLetterParagraphs((prev) => [...prev, 'Type your custom paragraph here...']);
  };

  const handleDeleteParagraph = (index: number) => {
    setIsCustomEdited(true);
    setLetterParagraphs((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Copy letter text to clipboard
  const handleCopyFullText = () => {
    const fullText = [
      formData.referenceNumber,
      `Date: ${formData.issueDate}`,
      '',
      stripHtml(letterSalutation),
      formData.recipientName,
      `${formData.designation} - ${formData.department}`,
      '',
      letterTitle,
      '',
      ...letterParagraphs.map(stripHtml),
      '',
      formData.signatoryName,
      formData.signatoryDesignation,
      company?.name || 'Kyadari Technologies Pvt Ltd',
    ].join('\n\n');

    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Issue Letter
  const handleIssueLetter = () => {
    const newRecord: IssuedLetter = {
      id: `LTR-${new Date().getFullYear()}-${String(issuedLetters.length + 1).padStart(3, '0')}`,
      type: selectedLetterType,
      employeeName: formData.recipientName,
      employeeId: formData.employeeId ? `EMP-${formData.employeeId}` : undefined,
      designation: formData.designation,
      department: formData.department,
      issueDate: formData.issueDate,
      referenceNumber: formData.referenceNumber,
      contentSnapshot: {
        ...formData,
        letterTitle,
        letterSalutation,
        letterParagraphs,
        isCustomEdited,
      },
    };

    setIssuedLetters([newRecord, ...issuedLetters]);
    alert('Letter successfully registered in the HR repository! You can now print or save as PDF.');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <IconFileCertificate className="w-7 h-7 text-indigo-600" />
            HR Letters & Certificates Hub
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Generate, customize, and issue verified corporate letters on company letterhead with direct in-place editing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('GENERATE')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'GENERATE'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            Create New Letter
          </button>
          <button
            onClick={() => setActiveTab('REPOSITORY')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'REPOSITORY'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            Letter Repository ({issuedLetters.length})
          </button>
        </div>
      </div>

      {activeTab === 'GENERATE' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Letter Configuration Form (col-span 5) */}
          <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-5 print:hidden">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                1. Select Letter Template
              </label>
              <div className="space-y-2">
                {[
                  {
                    id: 'RELIEVING_EXPERIENCE',
                    name: 'Experience & Relieving Letter',
                    icon: IconBriefcase,
                    desc: 'Official certificate confirming tenure, conduct & relieving',
                  },
                  {
                    id: 'BONAFIDE_EMPLOYMENT',
                    name: 'Bonafide / Visa Certificate',
                    icon: IconAward,
                    desc: 'Employment verification for loans, visas & address proof',
                  },
                  {
                    id: 'INCREMENT_APPRAISAL',
                    name: 'Annual Increment / Appraisal',
                    icon: IconFileText,
                    desc: 'Revised CTC structure post-performance review',
                  },
                  {
                    id: 'INTERNSHIP_COMPLETION',
                    name: 'Internship Certificate',
                    icon: IconCalendar,
                    desc: 'Certificate of completion for intern trainees',
                  },
                  {
                    id: 'WARNING_SHOWCAUSE',
                    name: 'Warning / Show Cause Notice',
                    icon: IconAlertTriangle,
                    desc: 'Formal disciplinary notice for policy or attendance breach',
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectTemplate(item.id as LetterType)}
                      className={`w-full p-3 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                        selectedLetterType === item.id
                          ? 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-500/20'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div
                        className={`p-2 rounded-xl mt-0.5 ${
                          selectedLetterType === item.id
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-sm font-bold text-slate-900 block">{item.name}</span>
                        <span className="text-xs text-slate-500 block leading-tight">{item.desc}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Quick Auto-fill from Employee */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Auto-fill from Employee Profile
              </label>
              <select
                value={formData.employeeId}
                onChange={(e) => handleSelectEmployee(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl cursor-pointer outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
              >
                <option value="">-- Choose Existing Employee or Enter Custom --</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.firstName} {e.lastName} ({e.department?.name || 'General'} - {e.jobTitle || 'Staff'})
                  </option>
                ))}
              </select>
            </div>

            {/* Common Fields */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Recipient Name</label>
                <input
                  type="text"
                  value={formData.recipientName}
                  onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Designation</label>
                <input
                  type="text"
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Department</label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Issue Date</label>
                <input
                  type="date"
                  value={formData.issueDate}
                  onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Template Specific Fields */}
            {selectedLetterType === 'RELIEVING_EXPERIENCE' && (
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Joining Date</label>
                  <input
                    type="date"
                    value={formData.joiningDate}
                    onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Relieving Date</label>
                  <input
                    type="date"
                    value={formData.relievingDate}
                    onChange={(e) => setFormData({ ...formData, relievingDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            )}

            {selectedLetterType === 'BONAFIDE_EMPLOYMENT' && (
              <div className="space-y-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Certificate Purpose</label>
                  <input
                    type="text"
                    value={formData.bonafidePurpose}
                    onChange={(e) => setFormData({ ...formData, bonafidePurpose: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Annual CTC (₹)</label>
                  <input
                    type="number"
                    value={formData.annualCtc}
                    onChange={(e) => setFormData({ ...formData, annualCtc: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-indigo-500 font-bold"
                  />
                </div>
              </div>
            )}

            {selectedLetterType === 'INCREMENT_APPRAISAL' && (
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Previous CTC (₹)</label>
                  <input
                    type="number"
                    value={formData.previousCtc}
                    onChange={(e) => setFormData({ ...formData, previousCtc: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Revised CTC (₹)</label>
                  <input
                    type="number"
                    value={formData.revisedCtc}
                    onChange={(e) => setFormData({ ...formData, revisedCtc: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl font-bold text-emerald-600 outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Effective Date</label>
                  <input
                    type="date"
                    value={formData.effectiveDate}
                    onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            )}

            {selectedLetterType === 'INTERNSHIP_COMPLETION' && (
              <div className="space-y-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Project Undertaken</label>
                  <input
                    type="text"
                    value={formData.internshipProject}
                    onChange={(e) => setFormData({ ...formData, internshipProject: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Tenure (Months)</label>
                  <input
                    type="number"
                    value={formData.internshipDurationMonths}
                    onChange={(e) =>
                      setFormData({ ...formData, internshipDurationMonths: Number(e.target.value) || 3 })
                    }
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            )}

            {selectedLetterType === 'WARNING_SHOWCAUSE' && (
              <div className="space-y-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Subject / Violation</label>
                  <input
                    type="text"
                    value={formData.warningSubject}
                    onChange={(e) => setFormData({ ...formData, warningSubject: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl font-semibold text-rose-700 outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Incident Date</label>
                    <input
                      type="date"
                      value={formData.warningIncidentDate}
                      onChange={(e) => setFormData({ ...formData, warningIncidentDate: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Reply Window (Days)</label>
                    <input
                      type="number"
                      value={formData.explanationDeadlineDays}
                      onChange={(e) =>
                        setFormData({ ...formData, explanationDeadlineDays: Number(e.target.value) || 2 })
                      }
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={handleIssueLetter}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
              >
                Save to HR Repository
              </button>
            </div>
          </div>

          {/* Right Column: Live Letterhead Preview & Direct In-Place Editor (col-span 7) */}
          <div className="lg:col-span-7 space-y-3 print:w-full print:col-span-12 print:p-0 print:m-0">
            {/* Editor Action Toolbar with Rich Formatting Bar */}
            <div className="flex items-center justify-between px-2 print:hidden flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <IconPencil className="w-4 h-4 text-indigo-600" />
                  Live Letterhead
                </span>

                {/* Quick Formatting Buttons for In-Place Editor */}
                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 ml-1">
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      document.execCommand('bold', false);
                    }}
                    className="p-1 hover:bg-white rounded text-slate-700 hover:text-slate-900 transition-colors cursor-pointer"
                    title="Bold selected text (Ctrl+B)"
                  >
                    <IconBold className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      document.execCommand('italic', false);
                    }}
                    className="p-1 hover:bg-white rounded text-slate-700 hover:text-slate-900 transition-colors cursor-pointer"
                    title="Italic selected text (Ctrl+I)"
                  >
                    <IconItalic className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      document.execCommand('underline', false);
                    }}
                    className="p-1 hover:bg-white rounded text-slate-700 hover:text-slate-900 transition-colors cursor-pointer"
                    title="Underline selected text (Ctrl+U)"
                  >
                    <IconUnderline className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isCustomEdited && (
                  <button
                    type="button"
                    onClick={handleResetToTemplate}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                    title="Reset letter text back to standard template"
                  >
                    <IconRotateClockwise className="w-3.5 h-3.5" />
                    Reset Template
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleCopyFullText}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  {copied ? <IconCheck className="w-3.5 h-3.5 text-emerald-600" /> : <IconCopy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied!' : 'Copy Text'}
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  <IconPrinter className="w-4 h-4" />
                  Print / Save as PDF
                </button>
              </div>
            </div>

            {/* Letterhead Paper Container */}
            <div className="p-8 sm:p-10 bg-white border border-slate-300 rounded-3xl shadow-sm min-h-[750px] font-serif text-slate-800 space-y-6 text-sm relative print:border-none print:shadow-none print:p-0 print:m-0 print:w-full print:rounded-none">
              {/* Header Letterhead */}
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-5">
                <div>
                  <h2 className="text-2xl font-black font-sans tracking-tight text-slate-900">
                    {company?.name || 'Kyadari Technologies Pvt Ltd'}
                  </h2>
                  <p className="text-xs font-sans text-slate-500 mt-0.5">
                    Corporate Identity: HR-OPS • Human Capital & People Success Desk
                  </p>
                  <p className="text-[11px] font-sans text-slate-400">
                    Registered Office: Tech Hub Phase II, Hyderabad, Telangana 500081
                  </p>
                </div>
                <div className="text-right font-sans text-xs">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-black flex items-center justify-center text-lg ml-auto mb-1">
                    {company?.name ? company.name.charAt(0).toUpperCase() : 'K'}
                  </div>
                  <span className="font-bold text-slate-900">CONFIDENTIAL</span>
                </div>
              </div>

              {/* Reference & Date */}
              <div className="flex justify-between items-center font-sans text-xs text-slate-600">
                <div>
                  <span className="font-semibold text-slate-400">Ref: </span>
                  <span className="font-bold text-slate-900">{formData.referenceNumber}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-400">Date: </span>
                  <span className="font-bold text-slate-900">
                    {new Date(formData.issueDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              </div>

              {/* Salutation & Recipient Info (Candidate Name is explicitly bold and prominent) */}
              <div className="font-sans text-xs space-y-1">
                <input
                  type="text"
                  value={letterSalutation}
                  onChange={(e) => {
                    setLetterSalutation(e.target.value);
                    setIsCustomEdited(true);
                  }}
                  className="font-semibold text-slate-600 text-xs bg-transparent border-b border-transparent hover:border-indigo-300 focus:border-indigo-500 focus:bg-indigo-50/20 rounded px-1 -mx-1 outline-none w-full max-w-sm transition-all print:border-none print:p-0"
                  placeholder="Salutation (e.g. To Whom It May Concern,)"
                />
                <p className="text-base font-black text-slate-950 px-1 -mx-1 tracking-tight">
                  {formData.recipientName}
                </p>
                <p className="text-slate-600 font-medium px-1 -mx-1">
                  {formData.designation} - {formData.department}
                </p>
              </div>

              {/* Letter Title Banner (In-Place Editable) */}
              <div className="text-center py-2 border-y border-slate-200 my-4">
                <input
                  type="text"
                  value={letterTitle}
                  onChange={(e) => {
                    setLetterTitle(e.target.value);
                    setIsCustomEdited(true);
                  }}
                  className="w-full text-center font-sans font-black text-xs sm:text-sm tracking-wide text-slate-900 uppercase bg-transparent border-b border-transparent hover:border-indigo-300 focus:border-indigo-500 focus:bg-indigo-50/20 rounded px-2 outline-none transition-all print:border-none print:p-0"
                  placeholder="Letter Title"
                />
              </div>

              {/* Letter Body: Direct In-Place Rich Editable Paragraphs with Bold Candidate Names */}
              <div className="space-y-4">
                {letterParagraphs.map((paraHtml, idx) => (
                  <EditableParagraph
                    key={idx}
                    html={paraHtml}
                    onChange={(newHtml) => handleParagraphChange(idx, newHtml)}
                    canDelete={letterParagraphs.length > 1}
                    onDelete={() => handleDeleteParagraph(idx)}
                  />
                ))}

                {/* Increment appraisal CTC breakdown card */}
                {selectedLetterType === 'INCREMENT_APPRAISAL' && (
                  <div className="my-3 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 font-sans text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Designation:</span>
                      <span className="font-bold text-slate-900">{formData.designation}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Effective Date:</span>
                      <span className="font-bold text-slate-900">{formData.effectiveDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Previous Annual CTC:</span>
                      <span className="font-bold text-slate-600">
                        ₹{Number(formData.previousCtc || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 pt-1 text-sm">
                      <span className="font-bold text-slate-900">Revised Annual CTC:</span>
                      <span className="font-black text-emerald-600">
                        ₹{Number(formData.revisedCtc || 0).toLocaleString('en-IN')} (+{formData.incrementPercentage}%)
                      </span>
                    </div>
                  </div>
                )}

                {/* Editor Action Buttons below Body */}
                <div className="pt-2 print:hidden flex items-center justify-between border-t border-dashed border-slate-200">
                  <button
                    type="button"
                    onClick={handleAddParagraph}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dashed border-indigo-300 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100/70 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <IconPlus className="w-3.5 h-3.5" />
                    <span>Add New Paragraph</span>
                  </button>
                  <span className="text-[11px] text-slate-400 italic">
                    💡 Click anywhere to edit text. Highlight words and press <kbd className="px-1 py-0.5 bg-slate-100 rounded border border-slate-300 font-mono text-[10px]">Ctrl+B</kbd> to bold.
                  </span>
                </div>
              </div>

              {/* Signatory Footer (In-Place Editable) */}
              <div className="pt-10 flex justify-between items-end border-t border-slate-100 font-sans text-xs">
                <div>
                  <div className="inline-block px-3 py-1 bg-slate-100 rounded-lg text-[10px] font-bold text-slate-500 uppercase tracking-widest border border-slate-200 mb-2">
                    OFFICIAL HR SEAL
                  </div>
                  <p className="text-slate-400 text-[10px]">Issued via Uptrix Enterprise HRMS Core</p>
                </div>

                <div className="text-right space-y-0.5">
                  <input
                    type="text"
                    value={formData.signatoryName}
                    onChange={(e) => setFormData({ ...formData, signatoryName: e.target.value })}
                    className="font-bold text-slate-900 text-sm bg-transparent border-b border-transparent hover:border-indigo-300 focus:border-indigo-500 outline-none text-right w-56 block ml-auto rounded px-1 transition-all print:border-none print:p-0"
                    placeholder="Signatory Name"
                  />
                  <input
                    type="text"
                    value={formData.signatoryDesignation}
                    onChange={(e) => setFormData({ ...formData, signatoryDesignation: e.target.value })}
                    className="text-slate-500 text-xs bg-transparent border-b border-transparent hover:border-indigo-300 focus:border-indigo-500 outline-none text-right w-56 block ml-auto rounded px-1 transition-all print:border-none print:p-0"
                    placeholder="Signatory Title"
                  />
                  <div className="text-slate-400 text-[11px] pr-1">
                    {company?.name || 'Kyadari Technologies Pvt Ltd'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Repository Tab: List of Issued Letters */
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="relative w-80">
              <IconSearch className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search issued letters..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-[#e5e7eb] text-xs font-bold text-slate-900 border-b border-slate-300">
                <tr>
                  <th className="px-6 py-3.5">Ref Number</th>
                  <th className="px-6 py-3.5">Letter Type</th>
                  <th className="px-6 py-3.5">Recipient</th>
                  <th className="px-6 py-3.5">Department</th>
                  <th className="px-6 py-3.5">Issue Date</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {issuedLetters
                  .filter((l) => l.employeeName.toLowerCase().includes(search.toLowerCase()))
                  .map((letter) => (
                    <tr key={letter.id} className="hover:bg-slate-50/60">
                      <td className="px-6 py-4 font-bold text-slate-900">{letter.referenceNumber}</td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-semibold text-[10px]">
                          {letter.type.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-900">{letter.employeeName}</td>
                      <td className="px-6 py-4">{letter.department}</td>
                      <td className="px-6 py-4 text-slate-500">{letter.issueDate}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedLetterType(letter.type);
                            setFormData((p) => ({ ...p, ...letter.contentSnapshot }));
                            if (letter.contentSnapshot?.letterParagraphs) {
                              setLetterTitle(letter.contentSnapshot.letterTitle || '');
                              setLetterSalutation(letter.contentSnapshot.letterSalutation || '');
                              setLetterParagraphs(letter.contentSnapshot.letterParagraphs);
                              setIsCustomEdited(true);
                            } else {
                              setIsCustomEdited(false);
                            }
                            setActiveTab('GENERATE');
                          }}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-800 font-bold cursor-pointer transition-colors"
                        >
                          View & Print
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default HrLettersPage;
