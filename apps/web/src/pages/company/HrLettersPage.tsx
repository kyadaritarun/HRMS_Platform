import React, { useState, useEffect } from 'react';
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

  // When an employee is picked from dropdown, auto-fill fields
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
  };

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
      contentSnapshot: { ...formData },
    };

    setIssuedLetters([newRecord, ...issuedLetters]);
    alert('Letter successfully registered in the HR repository! You can now print or save as PDF.');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <IconFileCertificate className="w-7 h-7 text-indigo-600" />
            HR Letters & Certificates Hub
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Generate, customize, and issue verified corporate letters on company letterhead with one-click print/PDF.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('GENERATE')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'GENERATE'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            Create New Letter
          </button>
          <button
            onClick={() => setActiveTab('REPOSITORY')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
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
          <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-5">
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
                      onClick={() => {
                        setSelectedLetterType(item.id as LetterType);
                        setFormData((p) => ({
                          ...p,
                          referenceNumber: `UPTX/HR/${item.id.slice(0, 3)}/${new Date().getFullYear()}/${Math.floor(
                            100 + Math.random() * 900
                          )}`,
                        }));
                      }}
                      className={`w-full p-3 rounded-2xl border text-left flex items-start gap-3 transition-all ${
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
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
              >
                <option value="">-- Choose Existing Employee or Enter Custom --</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.firstName} {e.lastName} ({e.department?.name || 'General'} - {e.jobTitle})
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
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Designation</label>
                <input
                  type="text"
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
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
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Issue Date</label>
                <input
                  type="date"
                  value={formData.issueDate}
                  onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
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
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Relieving Date</label>
                  <input
                    type="date"
                    value={formData.relievingDate}
                    onChange={(e) => setFormData({ ...formData, relievingDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl"
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
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Annual CTC (₹)</label>
                  <input
                    type="number"
                    value={formData.annualCtc}
                    onChange={(e) => setFormData({ ...formData, annualCtc: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl"
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
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Revised CTC (₹)</label>
                  <input
                    type="number"
                    value={formData.revisedCtc}
                    onChange={(e) => setFormData({ ...formData, revisedCtc: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl font-bold text-emerald-600"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Effective Date</label>
                  <input
                    type="date"
                    value={formData.effectiveDate}
                    onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl"
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
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl"
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
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl"
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
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl font-semibold text-rose-700"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Incident Date</label>
                    <input
                      type="date"
                      value={formData.warningIncidentDate}
                      onChange={(e) => setFormData({ ...formData, warningIncidentDate: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl"
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
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={handleIssueLetter}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
              >
                Save to HR Repository
              </button>
            </div>
          </div>

          {/* Right Column: Live Letterhead Preview (col-span 7) */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between px-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <IconEye className="w-4 h-4 text-indigo-600" />
                Live Corporate Letterhead Preview
              </span>
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
              >
                <IconPrinter className="w-4 h-4" />
                Print / Save as PDF
              </button>
            </div>

            {/* Letterhead Paper Container */}
            <div className="p-10 bg-white border border-slate-300 rounded-3xl shadow-sm min-h-[750px] font-serif text-slate-800 space-y-6 text-sm relative">
              {/* Header Letterhead */}
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-5">
                <div>
                  <h2 className="text-2xl font-black font-sans tracking-tight text-slate-900">
                    {company?.name || 'UPTRIX TECHNOLOGIES'}
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
                    U
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

              {/* Salutation */}
              <div className="font-sans text-xs space-y-1">
                <p className="font-semibold text-slate-500">To Whom It May Concern,</p>
                <p className="text-sm font-bold text-slate-900">
                  {formData.recipientName}
                </p>
                <p className="text-slate-600">{formData.designation} - {formData.department}</p>
              </div>

              {/* Letter Title Banner */}
              <div className="text-center py-2 border-y border-slate-200 my-4">
                <span className="font-sans font-black text-sm tracking-wide text-slate-900 uppercase">
                  {selectedLetterType === 'RELIEVING_EXPERIENCE' && 'EXPERIENCE & SERVICE RELIEVING CERTIFICATE'}
                  {selectedLetterType === 'BONAFIDE_EMPLOYMENT' && 'CERTIFICATE OF BONAFIDE EMPLOYMENT'}
                  {selectedLetterType === 'INCREMENT_APPRAISAL' && 'ANNUAL COMPENSATION REVISION & APPRAISAL'}
                  {selectedLetterType === 'INTERNSHIP_COMPLETION' && 'CERTIFICATE OF INTERNSHIP COMPLETION'}
                  {selectedLetterType === 'WARNING_SHOWCAUSE' && 'FORMAL SHOW CAUSE NOTICE / ADVISORY'}
                </span>
              </div>

              {/* Letter Body Paragraphs based on type */}
              <div className="space-y-4 leading-relaxed text-justify font-sans text-xs sm:text-sm text-slate-700">
                {selectedLetterType === 'RELIEVING_EXPERIENCE' && (
                  <>
                    <p>
                      This is to certify that <strong className="text-slate-900">{formData.recipientName}</strong> was
                      employed with <strong className="text-slate-900">{company?.name || 'Uptrix Technologies'}</strong>{' '}
                      from <strong className="text-slate-900">{formData.joiningDate}</strong> to{' '}
                      <strong className="text-slate-900">{formData.relievingDate}</strong>. At the time of relieving, their
                      designation was <strong className="text-slate-900">{formData.designation}</strong> in the{' '}
                      <strong className="text-slate-900">{formData.department}</strong> department.
                    </p>
                    <p>
                      During their tenure with us, we found them to be diligent, self-motivated, and committed to their
                      responsibilities. They have successfully completed all handovers, and all organizational dues and
                      clearances have been settled in full.
                    </p>
                    <p>
                      They are relieved of their duties effective close of business hours on{' '}
                      <strong className="text-slate-900">{formData.relievingDate}</strong>. We sincerely thank them for their
                      valuable contributions and wish them the very best in all their future endeavors.
                    </p>
                  </>
                )}

                {selectedLetterType === 'BONAFIDE_EMPLOYMENT' && (
                  <>
                    <p>
                      This is to formally certify that <strong className="text-slate-900">{formData.recipientName}</strong> is
                      a bonafide full-time employee of <strong className="text-slate-900">{company?.name || 'Uptrix Technologies'}</strong>,
                      holding the position of <strong className="text-slate-900">{formData.designation}</strong> in the{' '}
                      <strong className="text-slate-900">{formData.department}</strong> department since{' '}
                      <strong className="text-slate-900">{formData.joiningDate}</strong>.
                    </p>
                    <p>
                      Their current Annual Cost to Company (CTC) is{' '}
                      <strong className="text-slate-900">₹{Number(formData.annualCtc).toLocaleString()}</strong> (Indian
                      Rupees). Their employment status is active and in good standing.
                    </p>
                    <p>
                      This certificate is being issued upon the specific request of the employee for the purpose of{' '}
                      <strong className="text-slate-900">{formData.bonafidePurpose}</strong>, without any financial liability on the part of the company.
                    </p>
                  </>
                )}

                {selectedLetterType === 'INCREMENT_APPRAISAL' && (
                  <>
                    <p>
                      Dear <strong className="text-slate-900">{formData.recipientName}</strong>,
                    </p>
                    <p>
                      Following your annual performance review and in recognition of your dedication and contributions to the{' '}
                      <strong className="text-slate-900">{formData.department}</strong> department, the management is pleased
                      to inform you of the revision in your annual compensation package.
                    </p>
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
                        <span className="font-bold text-slate-600">₹{Number(formData.previousCtc).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between border-t border-slate-200 pt-1 text-sm">
                        <span className="font-bold text-slate-900">Revised Annual CTC:</span>
                        <span className="font-black text-emerald-600">
                          ₹{Number(formData.revisedCtc).toLocaleString()} (+{formData.incrementPercentage}%)
                        </span>
                      </div>
                    </div>
                    <p>
                      All other terms and conditions of your original employment agreement remain unaltered. We appreciate your
                      continued dedication and look forward to scaling new milestones together.
                    </p>
                  </>
                )}

                {selectedLetterType === 'INTERNSHIP_COMPLETION' && (
                  <>
                    <p>
                      This is to certify that <strong className="text-slate-900">{formData.recipientName}</strong> has
                      successfully completed an internship training program of{' '}
                      <strong className="text-slate-900">{formData.internshipDurationMonths} months</strong> with{' '}
                      <strong className="text-slate-900">{company?.name || 'Uptrix Technologies'}</strong> in the{' '}
                      <strong className="text-slate-900">{formData.department}</strong> division.
                    </p>
                    <p>
                      During this tenure, they actively contributed to the project entitled:{' '}
                      <strong className="text-slate-900">&ldquo;{formData.internshipProject}&rdquo;</strong>. Their
                      performance, analytical aptitude, and willingness to learn were commendable throughout the duration of
                      the internship.
                    </p>
                    <p>
                      We congratulate them on the successful completion of the internship and wish them all success in their
                      academic and professional journey.
                    </p>
                  </>
                )}

                {selectedLetterType === 'WARNING_SHOWCAUSE' && (
                  <>
                    <p>
                      Dear <strong className="text-slate-900">{formData.recipientName}</strong>,
                    </p>
                    <p className="text-rose-700 font-semibold">
                      Subject: Official Notice Regarding {formData.warningSubject}
                    </p>
                    <p>
                      It has been formally brought to the attention of People Operations that on or around{' '}
                      <strong className="text-slate-900">{formData.warningIncidentDate}</strong>, your conduct was found to be in
                      breach of company workplace guidelines regarding{' '}
                      <strong className="text-slate-900">{formData.warningSubject}</strong>.
                    </p>
                    <p>
                      Punctuality, professional conduct, and policy compliance are essential expectations for every team member
                      at {company?.name || 'Uptrix Technologies'}. You are hereby requested to provide a written explanation
                      addressing the above within{' '}
                      <strong className="text-slate-900">{formData.explanationDeadlineDays} working days</strong> from the receipt
                      of this notice.
                    </p>
                    <p>
                      Failure to submit a satisfactory response may lead to formal disciplinary action in accordance with company
                      policies.
                    </p>
                  </>
                )}
              </div>

              {/* Signatory Footer */}
              <div className="pt-12 flex justify-between items-end border-t border-slate-100 font-sans text-xs">
                <div>
                  <div className="inline-block px-3 py-1 bg-slate-100 rounded-lg text-[10px] font-bold text-slate-500 uppercase tracking-widest border border-slate-200 mb-2">
                    OFFICIAL HR SEAL
                  </div>
                  <p className="text-slate-400 text-[10px]">Issued via Uptrix Enterprise HRMS Core</p>
                </div>

                <div className="text-right">
                  <div className="font-bold text-slate-900 text-sm">{formData.signatoryName}</div>
                  <div className="text-slate-500 text-xs">{formData.signatoryDesignation}</div>
                  <div className="text-slate-400 text-[11px]">{company?.name || 'Uptrix Technologies'}</div>
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
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase border-b border-slate-100">
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
                          {letter.type.replace('_', ' ')}
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
                            setActiveTab('GENERATE');
                          }}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-800 font-bold"
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
