import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../api/client';
import {
  IconUserPlus,
  IconCheck,
  IconAlertCircle,
  IconBriefcase,
  IconBuilding,
  IconCash,
  IconShieldLock,
  IconMail,
  IconPhone,
  IconCalendar,
  IconUser,
  IconBuildingSkyscraper,
  IconUpload,
  IconId,
  IconX,
  IconAt,
  IconFileCheck,
  IconPaperclip,
  IconHeartHandshake,
  IconFileSpreadsheet,
  IconDownload,
  IconEye,
  IconEyeOff,
  IconCopy,
  IconArrowRight,
} from '@tabler/icons-react';
import BulkEmployeeImport from './BulkEmployeeImport';

interface Department {
  id: number;
  name: string;
}

interface Manager {
  id: number;
  firstName: string;
  lastName: string;
  jobTitle: string;
}

interface UploadedDoc {
  file: File | null;
  name: string;
  size: string;
  previewUrl?: string;
}


export const NewEmployeePage: React.FC = () => {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [onboardingMode, setOnboardingMode] = useState<'single' | 'bulk'>('single');
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);

  const handleDownloadTemplate = async () => {
    setIsDownloadingTemplate(true);
    try {
      const res = await api.get('/employees/template', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Employee_Bulk_Import_Template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Failed to download template:', err);
      alert('Failed to download template. Please try again.');
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    personalEmail: '',
    employeeNumber: '',
    dateOfBirth: '',
    username: '',
    phone: '',
    role: 'EMPLOYEE',
    jobTitle: '',
    departmentId: '',
    managerId: '',
    workMode: 'WFO',
    workType: 'PERMANENT',
    joiningDate: new Date().toISOString().split('T')[0],
    monthlySalary: '',
    currency: 'INR',
    emergencyContactName: '',
    emergencyContactRelationship: '',
    emergencyContactPhone: '',
    canManagePerformance: false,
  });

  // State for Success Credentials Modal
  const [createdCredentials, setCreatedCredentials] = useState<{
    name: string;
    email: string;
    employeeNumber: string;
    password: string;
    mustChangePassword: boolean;
  } | null>(null);
  const [showCreatedPassword, setShowCreatedPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleCopyAll = () => {
    if (!createdCredentials) return;
    const text = `HRMS Login Credentials\nEmployee: ${createdCredentials.name} (ID: ${createdCredentials.employeeNumber || 'N/A'})\nWork Email / Username: ${createdCredentials.email}\nPassword: ${createdCredentials.password}\nFirst-Time Login Requirement: ${createdCredentials.mustChangePassword ? 'Must change password on first login' : 'Direct access enabled'}`;
    navigator.clipboard.writeText(text);
    setCopiedField('all');
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handleResetForm = () => {
    setCreatedCredentials(null);
    setForm({
      firstName: '',
      lastName: '',
      email: '',
      personalEmail: '',
      employeeNumber: '',
      dateOfBirth: '',
      username: '',
      phone: '',
      role: 'EMPLOYEE',
      jobTitle: '',
      departmentId: '',
      managerId: '',
      workMode: 'WFO',
      workType: 'PERMANENT',
      joiningDate: new Date().toISOString().split('T')[0],
      monthlySalary: '',
      currency: 'INR',
      emergencyContactName: '',
      emergencyContactRelationship: '',
      emergencyContactPhone: '',
      canManagePerformance: false,
    });
    setUploadedFiles({
      offerLetter: { file: null, name: '', size: '' },
    });
  };

  // State for Document / File Attachments (Input Files)
  const [uploadedFiles, setUploadedFiles] = useState<{
    offerLetter: UploadedDoc;
  }>({
    offerLetter: { file: null, name: '', size: '' },
  });

  useEffect(() => {
    const loadPrerequisites = async () => {
      try {
        const [deptsRes, empsRes] = await Promise.all([
          api.get('/company/departments'),
          api.get('/employees?pageSize=100'),
        ]);
        setDepartments(deptsRes.data?.departments || []);
        setManagers(empsRes.data?.items || []);
      } catch (err) {
        console.error('Failed to load prerequisites:', err);
      }
    };
    loadPrerequisites();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));

    // Auto generate username from email prefix if empty
    if (name === 'email' && !form.username) {
      const prefix = value.split('@')[0];
      setForm((prev) => ({ ...prev, username: prefix }));
    }
  };



  const handleFileUpload = (key: 'offerLetter', file: File | null) => {
    if (!file) {
      setUploadedFiles((prev) => ({
        ...prev,
        [key]: { file: null, name: '', size: '', previewUrl: undefined },
      }));
      return;
    }

    const sizeStr = file.size > 1024 * 1024
      ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.round(file.size / 1024)} KB`;

    setUploadedFiles((prev) => ({
      ...prev,
      [key]: { file, name: file.name, size: sizeStr },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const payload: any = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        personalEmail: form.personalEmail.trim(),
        employeeNumber: form.employeeNumber.trim(),
        dateOfBirth: form.dateOfBirth ? form.dateOfBirth : undefined,
        username: form.username.trim(),
        phone: form.phone.trim(),
        role: form.role,
        jobTitle: form.jobTitle.trim(),
        workMode: form.workMode,
        employmentType: form.workType, // 'PERMANENT' or 'CONTRACT'
        joiningDate: form.joiningDate,
        monthlySalary: Number(form.monthlySalary) || 0,
        currency: form.currency,
        emergencyContact: {
          name: form.emergencyContactName.trim(),
          relationship: form.emergencyContactRelationship.trim(),
          phone: form.emergencyContactPhone.trim(),
        },
        canManagePerformance: form.canManagePerformance,
      };

      if (form.departmentId) payload.departmentId = Number(form.departmentId);
      if (form.managerId) payload.managerId = Number(form.managerId);

      const createRes = await api.post('/employees', payload);

      // Display the credentials modal to the administrator
      const returnedPassword = createRes.data?.temporaryPassword || '';
      setCreatedCredentials({
        name: `${form.firstName} ${form.lastName}`.trim(),
        email: form.email.trim(),
        employeeNumber: form.employeeNumber.trim(),
        password: returnedPassword,
        mustChangePassword: true,
      });
    } catch (err: any) {
      console.error('Failed to onboard employee:', err);
      const msg = err.response?.data?.message || err.response?.data?.error || 'Failed to create employee profile.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ===================== TOP HEADER BAR ===================== */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5E4BE2] shrink-0">
              <IconUserPlus className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Create Employee
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Create or bulk import employee accounts using Excel.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-nowrap">
          {/* Download Sample Excel */}
          <button
            type="button"
            onClick={handleDownloadTemplate}
            disabled={isDownloadingTemplate}
            className="flex items-center gap-2 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200/80 shadow-2xs transition-all cursor-pointer active:scale-[0.98]"
            title="Download Sample Excel Format (.xlsx)"
          >
            <IconFileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>{isDownloadingTemplate ? 'Downloading...' : 'Download Sample'}</span>
            <IconDownload className="w-3.5 h-3.5 text-emerald-700" />
          </button>

          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/70">
            <button
              type="button"
              onClick={() => setOnboardingMode('single')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${onboardingMode === 'single'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
                }`}
            >
              <IconUser className="w-3.5 h-3.5" />
              <span>Single Form</span>
            </button>
            <button
              type="button"
              onClick={() => setOnboardingMode('bulk')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${onboardingMode === 'bulk'
                ? 'bg-white text-[#5E4BE2] shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
                }`}
            >
              <IconFileSpreadsheet className="w-3.5 h-3.5" />
              <span>Bulk Excel & Grid</span>
            </button>
          </div>
        </div>
      </div>

      {onboardingMode === 'bulk' ? (
        <BulkEmployeeImport
          onDownloadTemplate={handleDownloadTemplate}
          isDownloadingTemplate={isDownloadingTemplate}
        />
      ) : (
        <>

          {error && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-3 text-xs animate-in fade-in shadow-xs">
              <IconAlertCircle className="w-5 h-5 shrink-0 text-rose-500 mt-0.5" />
              <div>
                <p className="font-bold text-sm">Employee Creation Failed</p>
                <p className="mt-0.5 text-rose-600 font-medium">{error}</p>
              </div>
            </div>
          )}

          {/* ===================== FORM ===================== */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
              {/* Section 1: Identity & Contact */}
              <div className="space-y-4">
                <div className="flex items-center gap-2.5 pb-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 text-[#5E4BE2] flex items-center justify-center shrink-0">
                    <IconUser className="w-4 h-4" />
                  </div>
                  <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Identity & Contact
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">First Name *</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#5E4BE2]">
                        <IconUser className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        name="firstName"
                        required
                        value={form.firstName}
                        onChange={handleChange}
                        placeholder="Jane"
                        className="w-full pl-10 pr-3.5 py-2.5 text-xs font-semibold text-slate-900 bg-[#f1f5f9] border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#5E4BE2]/15 focus:border-[#5E4BE2] shadow-2xs hover:bg-slate-100 hover:border-slate-300 transition-all placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Last Name</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#5E4BE2]">
                        <IconUser className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        name="lastName"
                        value={form.lastName}
                        onChange={handleChange}
                        placeholder="Doe"
                        className="w-full pl-10 pr-3.5 py-2.5 text-xs font-semibold text-slate-900 bg-[#f1f5f9] border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#5E4BE2]/15 focus:border-[#5E4BE2] shadow-2xs hover:bg-slate-100 hover:border-slate-300 transition-all placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Employee ID *</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-indigo-600">
                        <IconId className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        name="employeeNumber"
                        required
                        value={form.employeeNumber}
                        onChange={handleChange}
                        placeholder="EMP-001"
                        className="w-full pl-10 pr-3.5 py-2.5 text-xs font-semibold text-slate-900 bg-[#f1f5f9] border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#5E4BE2]/15 focus:border-[#5E4BE2] shadow-2xs hover:bg-slate-100 hover:border-slate-300 transition-all placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Date of Birth *</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-rose-500">
                        <IconCalendar className="w-4 h-4" />
                      </div>
                      <input
                        type="date"
                        name="dateOfBirth"
                        required
                        value={form.dateOfBirth}
                        onChange={handleChange}
                        className="w-full pl-10 pr-3.5 py-2.5 text-xs font-semibold text-slate-900 bg-[#f1f5f9] border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#5E4BE2]/15 focus:border-[#5E4BE2] shadow-2xs hover:bg-slate-100 hover:border-slate-300 transition-all cursor-pointer"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Work Email *</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-blue-600">
                        <IconMail className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        name="email"
                        required
                        value={form.email}
                        onChange={handleChange}
                        placeholder="jane.doe@acme.com"
                        className="w-full pl-10 pr-3.5 py-2.5 text-xs font-semibold text-slate-900 bg-[#f1f5f9] border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#5E4BE2]/15 focus:border-[#5E4BE2] shadow-2xs hover:bg-slate-100 hover:border-slate-300 transition-all placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Personal Email Address *</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-violet-600">
                        <IconMail className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        name="personalEmail"
                        required
                        value={form.personalEmail}
                        onChange={handleChange}
                        placeholder="jane.personal@gmail.com"
                        className="w-full pl-10 pr-3.5 py-2.5 text-xs font-semibold text-slate-900 bg-[#f1f5f9] border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#5E4BE2]/15 focus:border-[#5E4BE2] shadow-2xs hover:bg-slate-100 hover:border-slate-300 transition-all placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">System Username *</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-purple-600">
                        <IconAt className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        name="username"
                        required
                        value={form.username}
                        onChange={handleChange}
                        placeholder="jane.doe"
                        className="w-full pl-10 pr-3.5 py-2.5 text-xs font-semibold text-slate-900 bg-[#f1f5f9] border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#5E4BE2]/15 focus:border-[#5E4BE2] shadow-2xs hover:bg-slate-100 hover:border-slate-300 transition-all placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Phone Number</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-600">
                        <IconPhone className="w-4 h-4" />
                      </div>
                      <input
                        type="tel"
                        name="phone"
                        value={form.phone}
                        onChange={handleChange}
                        placeholder="+91 9876543210"
                        className="w-full pl-10 pr-3.5 py-2.5 text-xs font-semibold text-slate-900 bg-[#f1f5f9] border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#5E4BE2]/15 focus:border-[#5E4BE2] shadow-2xs hover:bg-slate-100 hover:border-slate-300 transition-all placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Joining Date</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-indigo-600">
                        <IconCalendar className="w-4 h-4" />
                      </div>
                      <input
                        type="date"
                        name="joiningDate"
                        value={form.joiningDate}
                        onChange={handleChange}
                        className="w-full pl-10 pr-3.5 py-2.5 text-xs font-semibold text-slate-900 bg-[#f1f5f9] border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#5E4BE2]/15 focus:border-[#5E4BE2] shadow-2xs hover:bg-slate-100 hover:border-slate-300 transition-all cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Line Separation */}
              <hr className="border-slate-200/80" />

              {/* Section 2: Role & Reporting Structure */}
              <div className="space-y-4">
                <div className="flex items-center gap-2.5 pb-2">
                  <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                    <IconBuildingSkyscraper className="w-4 h-4" />
                  </div>
                  <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Role & Reporting
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Role *</label>
                    <select
                      name="role"
                      value={form.role}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 text-xs font-semibold text-slate-900 bg-[#f1f5f9] border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#5E4BE2]/15 focus:border-[#5E4BE2] shadow-2xs hover:bg-slate-100 hover:border-slate-300 transition-all cursor-pointer"
                    >
                      <option value="EMPLOYEE">Staff Employee</option>
                      <option value="HR">HR Manager</option>
                      <option value="COMPANY_ADMIN">Company Admin</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Job Title</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-purple-600">
                        <IconBriefcase className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        name="jobTitle"
                        value={form.jobTitle}
                        onChange={handleChange}
                        placeholder="Senior Full Stack Engineer"
                        className="w-full pl-10 pr-3.5 py-2.5 text-xs font-semibold text-slate-900 bg-[#f1f5f9] border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#5E4BE2]/15 focus:border-[#5E4BE2] shadow-2xs hover:bg-slate-100 hover:border-slate-300 transition-all placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Department</label>
                    <select
                      name="departmentId"
                      value={form.departmentId}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 text-xs font-semibold text-slate-900 bg-[#f1f5f9] border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#5E4BE2]/15 focus:border-[#5E4BE2] shadow-2xs hover:bg-slate-100 hover:border-slate-300 transition-all cursor-pointer"
                    >
                      <option value="">Unassigned</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Reporting Manager</label>
                    <select
                      name="managerId"
                      value={form.managerId}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 text-xs font-semibold text-slate-900 bg-[#f1f5f9] border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#5E4BE2]/15 focus:border-[#5E4BE2] shadow-2xs hover:bg-slate-100 hover:border-slate-300 transition-all cursor-pointer"
                    >
                      <option value="">Direct to CEO / None</option>
                      {managers.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.firstName} {m.lastName} ({m.jobTitle || 'Team'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Work Mode</label>
                    <select
                      name="workMode"
                      value={form.workMode}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 text-xs font-semibold text-slate-900 bg-[#f1f5f9] border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#5E4BE2]/15 focus:border-[#5E4BE2] shadow-2xs hover:bg-slate-100 hover:border-slate-300 transition-all cursor-pointer"
                    >
                      <option value="WFO">Office (WFO)</option>
                      <option value="WFH">Home (WFH)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Work Type *</label>
                    <select
                      name="workType"
                      required
                      value={form.workType}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 text-xs font-semibold text-slate-900 bg-[#f1f5f9] border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#5E4BE2]/15 focus:border-[#5E4BE2] shadow-2xs hover:bg-slate-100 hover:border-slate-300 transition-all cursor-pointer"
                    >
                      <option value="PERMANENT">Permanent</option>
                      <option value="CONTRACT">Contract</option>
                    </select>
                  </div>
                </div>


              </div>

              {/* Line Separation */}
              <hr className="border-slate-200/80" />

              {/* Section 3: Emergency Contact */}
              <div className="space-y-4">
                <div className="flex items-center gap-2.5 pb-2">
                  <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                    <IconHeartHandshake className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Emergency Contact
                    </h2>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Contact details of the person to reach out to in case of an emergency
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Name *</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-rose-500">
                        <IconUser className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        name="emergencyContactName"
                        required
                        value={form.emergencyContactName}
                        onChange={handleChange}
                        placeholder="e.g. Sarah Vance"
                        className="w-full pl-10 pr-3.5 py-2.5 text-xs font-semibold text-slate-900 bg-[#f1f5f9] border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#5E4BE2]/15 focus:border-[#5E4BE2] shadow-2xs hover:bg-slate-100 hover:border-slate-300 transition-all placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Relationship *</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-rose-500">
                        <IconHeartHandshake className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        name="emergencyContactRelationship"
                        required
                        value={form.emergencyContactRelationship}
                        onChange={handleChange}
                        placeholder="e.g. Spouse / Parent / Sibling"
                        className="w-full pl-10 pr-3.5 py-2.5 text-xs font-semibold text-slate-900 bg-[#f1f5f9] border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#5E4BE2]/15 focus:border-[#5E4BE2] shadow-2xs hover:bg-slate-100 hover:border-slate-300 transition-all placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Contact *</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-rose-500">
                        <IconPhone className="w-4 h-4" />
                      </div>
                      <input
                        type="tel"
                        name="emergencyContactPhone"
                        required
                        value={form.emergencyContactPhone}
                        onChange={handleChange}
                        placeholder="e.g. +91 9876543210"
                        className="w-full pl-10 pr-3.5 py-2.5 text-xs font-semibold text-slate-900 bg-[#f1f5f9] border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#5E4BE2]/15 focus:border-[#5E4BE2] shadow-2xs hover:bg-slate-100 hover:border-slate-300 transition-all placeholder:text-slate-400"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Line Separation */}
              <hr className="border-slate-200/80" />

              {/* Section 3: Salary Master Configuration */}
              <div className="space-y-4">
                <div className="flex items-center gap-2.5 pb-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <IconCash className="w-4 h-4" />
                  </div>
                  <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Salary Master Configuration
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Monthly Gross Salary (CTC) *</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-xs text-emerald-600">
                        {form.currency}
                      </span>
                      <input
                        type="number"
                        name="monthlySalary"
                        min="0"
                        required
                        value={form.monthlySalary}
                        onChange={handleChange}
                        placeholder="60000"
                        className="w-full pl-14 pr-4 py-2.5 text-xs font-bold text-slate-900 bg-[#f1f5f9] border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#5E4BE2]/15 focus:border-[#5E4BE2] shadow-2xs hover:bg-slate-100 hover:border-slate-300 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Currency</label>
                    <select
                      name="currency"
                      value={form.currency}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 text-xs font-semibold text-slate-900 bg-[#f1f5f9] border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#5E4BE2]/15 focus:border-[#5E4BE2] shadow-2xs hover:bg-slate-100 hover:border-slate-300 transition-all cursor-pointer"
                    >
                      <option value="INR">INR (₹)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Line Separation */}
              <hr className="border-slate-200/80" />

              {/* Section 4: Employee Documents & File Attachments */}
              {/* Section 4: Signed Offer Letter / Agreement */}
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <IconPaperclip className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Offer Letter / Agreement
                      </h2>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Upload signed appointment letter or employment agreement contract
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100/60">
                    Optional
                  </span>
                </div>

                <div>
                  {/* Signed Offer Letter / Agreement */}
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <IconFileCheck className="w-4 h-4 text-emerald-600" />
                        <span>Offer Letter / Contract</span>
                      </label>
                      {uploadedFiles.offerLetter.file && (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <IconCheck className="w-3 h-3" /> Attached
                        </span>
                      )}
                    </div>

                    {uploadedFiles.offerLetter.file ? (
                      <div className="flex items-center justify-between p-2.5 bg-white border border-emerald-200 rounded-xl shadow-2xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                            <IconFileCheck className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate">{uploadedFiles.offerLetter.name}</p>
                            <p className="text-[10px] text-slate-400">{uploadedFiles.offerLetter.size}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleFileUpload('offerLetter', null)}
                          className="p-1 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Remove file"
                        >
                          <IconX className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center p-3.5 border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-white rounded-xl cursor-pointer group transition-all">
                        <IconUpload className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 transition-colors mb-1" />
                        <span className="text-xs font-bold text-slate-700 group-hover:text-emerald-600 transition-colors">
                          Click to upload Offer Letter
                        </span>
                        <span className="text-[10px] text-slate-400 mt-0.5">PDF or DOCX (max 10MB)</span>
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx"
                          className="hidden"
                          onChange={(e) => handleFileUpload('offerLetter', e.target.files?.[0] || null)}
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>

              {/* Informational Notice */}
              <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/60 text-[11px] text-slate-500 font-medium leading-relaxed">
                Upon creating the profile, a secure temporary login password will be auto-generated and emailed to the employee. A credentials summary pop-up will also appear for you to copy.
              </div>

              {/* Line Separation */}
              <hr className="border-slate-200/80" />

              {/* Action Buttons Row */}
              <div className="flex items-center justify-end gap-3 pt-1">
                <Link
                  to="/company/employees"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer shadow-2xs"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#5E4BE2] to-[#4B39C3] hover:from-[#5340D4] hover:to-[#4130B4] text-white text-xs font-bold rounded-xl shadow-sm shadow-indigo-600/25 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    'Creating Employee...'
                  ) : (
                    <>
                      <IconCheck className="w-4 h-4" />
                      <span>Create Employee</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </>
      )}

      {/* ===================== CREDENTIALS CREATED SUCCESS MODAL ===================== */}
      {createdCredentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-6">
            <div className="text-center space-y-1.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-xs">
                <IconCheck className="w-6 h-6 stroke-[2.5]" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Employee Account Created!</h2>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                <span className="font-semibold text-slate-700">{createdCredentials.name}</span> has been successfully onboarded. Here are their login credentials:
              </p>
            </div>

            {/* Credentials Card */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-3 font-mono text-xs">
              {/* Work Email / Username */}
              <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-slate-200">
                <div className="min-w-0 pr-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block font-sans">Work Email / Username</span>
                  <span className="text-slate-800 font-semibold truncate block select-all">{createdCredentials.email}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(createdCredentials.email, 'email')}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-sans font-semibold rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 cursor-pointer transition-colors shrink-0"
                >
                  {copiedField === 'email' ? <IconCheck className="w-3.5 h-3.5 text-emerald-600" /> : <IconCopy className="w-3.5 h-3.5" />}
                  <span>{copiedField === 'email' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              {/* Password */}
              <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-slate-200">
                <div className="min-w-0 pr-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block font-sans">Initial Password</span>
                  <span className="text-slate-800 font-bold truncate block select-all">
                    {showCreatedPassword ? createdCredentials.password : '••••••••••••'}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowCreatedPassword(!showCreatedPassword)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                    title={showCreatedPassword ? 'Hide password' : 'Show password'}
                  >
                    {showCreatedPassword ? <IconEyeOff className="w-4 h-4" /> : <IconEye className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopy(createdCredentials.password, 'password')}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-sans font-semibold rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 cursor-pointer transition-colors"
                  >
                    {copiedField === 'password' ? <IconCheck className="w-3.5 h-3.5 text-emerald-600" /> : <IconCopy className="w-3.5 h-3.5" />}
                    <span>{copiedField === 'password' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* Security Note */}
              {createdCredentials.mustChangePassword && (
                <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5 font-sans flex items-start gap-2">
                  <IconAlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>Employee will be prompted to change this password upon their first sign-in.</span>
                </div>
              )}
            </div>

            {/* Copy All Button */}
            <button
              type="button"
              onClick={handleCopyAll}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-50 hover:bg-indigo-100 text-[#5E4BE2] font-bold text-xs rounded-xl border border-indigo-200 transition-colors cursor-pointer"
            >
              {copiedField === 'all' ? <IconCheck className="w-4 h-4 text-emerald-600" /> : <IconCopy className="w-4 h-4" />}
              <span>{copiedField === 'all' ? 'Copied Full Credentials Message!' : 'Copy Full Credentials Message'}</span>
            </button>

            {/* Action buttons */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={handleResetForm}
                className="flex-1 px-4 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer text-center"
              >
                Create Another
              </button>
              <button
                type="button"
                onClick={() => navigate('/company/employees')}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-[#5E4BE2] to-[#4B39C3] hover:from-[#5340D4] hover:to-[#4130B4] rounded-xl shadow-sm transition-all cursor-pointer text-center"
              >
                <span>View Directory</span>
                <IconArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewEmployeePage;
