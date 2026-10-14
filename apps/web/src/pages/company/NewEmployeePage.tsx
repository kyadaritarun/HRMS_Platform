import React, { useState, useEffect, useMemo } from 'react';
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
  IconSparkles,
  IconUpload,
  IconFileText,
  IconId,
  IconPhoto,
  IconX,
  IconAt,
  IconFileCheck,
  IconPaperclip,
} from '@tabler/icons-react';

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

const HR_PERMISSIONS = [
  { key: 'employees', label: 'Manage Employees' },
  { key: 'attendance', label: 'Manage Attendance' },
  { key: 'leave_claims', label: 'Manage Leaves & Claims' },
  { key: 'payroll', label: 'Process Payroll' },
  { key: 'policies', label: 'Publish Policies' },
  { key: 'tickets', label: 'Administer Helpdesk' },
  { key: 'documents', label: 'Review Documents' },
];

export const NewEmployeePage: React.FC = () => {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    phone: '',
    role: 'EMPLOYEE',
    jobTitle: '',
    departmentId: '',
    managerId: '',
    workMode: 'WFO',
    employmentType: 'FULL_TIME',
    joiningDate: new Date().toISOString().split('T')[0],
    monthlySalary: '',
    currency: 'INR',
    hrPermissions: [] as string[],
    canManagePerformance: false,
  });

  // State for Document / File Attachments (Input Files)
  const [uploadedFiles, setUploadedFiles] = useState<{
    avatar: UploadedDoc;
    resume: UploadedDoc;
    idProof: UploadedDoc;
    offerLetter: UploadedDoc;
  }>({
    avatar: { file: null, name: '', size: '' },
    resume: { file: null, name: '', size: '' },
    idProof: { file: null, name: '', size: '' },
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

  const handlePermissionToggle = (key: string) => {
    setForm((prev) => {
      const exists = prev.hrPermissions.includes(key);
      const next = exists ? prev.hrPermissions.filter((p) => p !== key) : [...prev.hrPermissions, key];
      return { ...prev, hrPermissions: next };
    });
  };

  const handleFileUpload = (key: 'avatar' | 'resume' | 'idProof' | 'offerLetter', file: File | null) => {
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

    const previewUrl = key === 'avatar' ? URL.createObjectURL(file) : undefined;

    setUploadedFiles((prev) => ({
      ...prev,
      [key]: { file, name: file.name, size: sizeStr, previewUrl },
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
        username: form.username.trim(),
        phone: form.phone.trim(),
        role: form.role,
        jobTitle: form.jobTitle.trim(),
        workMode: form.workMode,
        employmentType: form.employmentType,
        joiningDate: form.joiningDate,
        monthlySalary: Number(form.monthlySalary) || 0,
        currency: form.currency,
        canManagePerformance: form.canManagePerformance,
      };

      if (form.departmentId) payload.departmentId = Number(form.departmentId);
      if (form.managerId) payload.managerId = Number(form.managerId);
      if (form.role === 'HR') payload.hrPermissions = form.hrPermissions;

      await api.post('/employees', payload);
      navigate('/company/employees');
    } catch (err: any) {
      console.error('Failed to onboard employee:', err);
      const msg = err.response?.data?.message || err.response?.data?.error || 'Failed to create employee profile.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Preview helper values
  const previewInitials = useMemo(() => {
    const f = form.firstName?.trim()?.[0] || '';
    const l = form.lastName?.trim()?.[0] || '';
    return (f + l).toUpperCase() || 'NE';
  }, [form.firstName, form.lastName]);

  const selectedDeptName = useMemo(() => {
    if (!form.departmentId) return 'Unassigned';
    const found = departments.find((d) => String(d.id) === String(form.departmentId));
    return found ? found.name : 'Unassigned';
  }, [form.departmentId, departments]);

  const selectedManagerName = useMemo(() => {
    if (!form.managerId) return 'Direct to CEO / None';
    const found = managers.find((m) => String(m.id) === String(form.managerId));
    return found ? `${found.firstName} ${found.lastName}` : 'Direct to CEO / None';
  }, [form.managerId, managers]);

  const attachedFilesCount = useMemo(() => {
    return Object.values(uploadedFiles).filter((f) => f.file !== null).length;
  }, [uploadedFiles]);

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
              Onboard New Employee
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Create account, attach onboarding documents, configure compensation, and provision system credentials.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-3 text-xs animate-in fade-in shadow-xs">
          <IconAlertCircle className="w-5 h-5 shrink-0 text-rose-500 mt-0.5" />
          <div>
            <p className="font-bold text-sm">Onboarding Failed</p>
            <p className="mt-0.5 text-rose-600 font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* ===================== 2-COLUMN LAYOUT: FORM + LIVE PREVIEW ===================== */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form Sections (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Section 1: Identity & Contact */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
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

              <div>
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

          {/* Section 2: Role & Reporting Structure */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <IconBuildingSkyscraper className="w-4 h-4" />
              </div>
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Role & Reporting
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">System Role *</label>
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
                  <option value="WFO">Work From Office (WFO)</option>
                  <option value="WFH">Remote / Work From Home (WFH)</option>
                  <option value="HYBRID">Hybrid</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Employment Type</label>
                <select
                  name="employmentType"
                  value={form.employmentType}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 text-xs font-semibold text-slate-900 bg-[#f1f5f9] border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#5E4BE2]/15 focus:border-[#5E4BE2] shadow-2xs hover:bg-slate-100 hover:border-slate-300 transition-all cursor-pointer"
                >
                  <option value="FULL_TIME">Full-time Regular</option>
                  <option value="PART_TIME">Part-time / Contractor</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Salary Master Configuration */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
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

          {/* Section 4: Employee Documents & File Attachments (Input Files) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <IconPaperclip className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Documents &amp; File Attachments
                  </h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Upload employee onboarding records, identification proof, headshot, and contract files
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100/60">
                Optional
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* 1. Profile Picture / Avatar */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <IconPhoto className="w-4 h-4 text-indigo-600" />
                    <span>Profile Photo / Headshot</span>
                  </label>
                  {uploadedFiles.avatar.file && (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <IconCheck className="w-3 h-3" /> Attached
                    </span>
                  )}
                </div>

                {uploadedFiles.avatar.file ? (
                  <div className="flex items-center justify-between p-2.5 bg-white border border-emerald-200 rounded-xl shadow-2xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {uploadedFiles.avatar.previewUrl ? (
                        <img
                          src={uploadedFiles.avatar.previewUrl}
                          alt="Avatar"
                          className="w-9 h-9 rounded-lg object-cover border border-slate-200 shrink-0"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 font-bold text-xs">
                          IMG
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{uploadedFiles.avatar.name}</p>
                        <p className="text-[10px] text-slate-400">{uploadedFiles.avatar.size}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleFileUpload('avatar', null)}
                      className="p-1 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Remove file"
                    >
                      <IconX className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-3.5 border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-white rounded-xl cursor-pointer group transition-all">
                    <IconUpload className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 transition-colors mb-1" />
                    <span className="text-xs font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">
                      Click to upload headshot
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">PNG, JPG or WebP (max 5MB)</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileUpload('avatar', e.target.files?.[0] || null)}
                    />
                  </label>
                )}
              </div>

              {/* 2. Resume / Curriculum Vitae (CV) */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <IconFileText className="w-4 h-4 text-purple-600" />
                    <span>Resume / Curriculum Vitae</span>
                  </label>
                  {uploadedFiles.resume.file && (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <IconCheck className="w-3 h-3" /> Attached
                    </span>
                  )}
                </div>

                {uploadedFiles.resume.file ? (
                  <div className="flex items-center justify-between p-2.5 bg-white border border-emerald-200 rounded-xl shadow-2xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                        <IconFileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{uploadedFiles.resume.name}</p>
                        <p className="text-[10px] text-slate-400">{uploadedFiles.resume.size}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleFileUpload('resume', null)}
                      className="p-1 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Remove file"
                    >
                      <IconX className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-3.5 border-2 border-dashed border-slate-300 hover:border-purple-500 bg-white rounded-xl cursor-pointer group transition-all">
                    <IconUpload className="w-5 h-5 text-slate-400 group-hover:text-purple-600 transition-colors mb-1" />
                    <span className="text-xs font-bold text-slate-700 group-hover:text-purple-600 transition-colors">
                      Click to upload Resume / CV
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">PDF or DOCX (max 10MB)</span>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      className="hidden"
                      onChange={(e) => handleFileUpload('resume', e.target.files?.[0] || null)}
                    />
                  </label>
                )}
              </div>

              {/* 3. National ID Proof (Aadhaar / Passport / SSN) */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <IconId className="w-4 h-4 text-blue-600" />
                    <span>Government ID (Aadhaar / Passport)</span>
                  </label>
                  {uploadedFiles.idProof.file && (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <IconCheck className="w-3 h-3" /> Attached
                    </span>
                  )}
                </div>

                {uploadedFiles.idProof.file ? (
                  <div className="flex items-center justify-between p-2.5 bg-white border border-emerald-200 rounded-xl shadow-2xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <IconId className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{uploadedFiles.idProof.name}</p>
                        <p className="text-[10px] text-slate-400">{uploadedFiles.idProof.size}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleFileUpload('idProof', null)}
                      className="p-1 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Remove file"
                    >
                      <IconX className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-3.5 border-2 border-dashed border-slate-300 hover:border-blue-500 bg-white rounded-xl cursor-pointer group transition-all">
                    <IconUpload className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors mb-1" />
                    <span className="text-xs font-bold text-slate-700 group-hover:text-blue-600 transition-colors">
                      Click to upload ID document
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">PDF, PNG, JPG (max 10MB)</span>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={(e) => handleFileUpload('idProof', e.target.files?.[0] || null)}
                    />
                  </label>
                )}
              </div>

              {/* 4. Signed Offer Letter / Agreement */}
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

          {/* Section 5: HR Granular Sub-Permissions (Only if HR role selected) */}
          {form.role === 'HR' && (
            <div className="bg-indigo-50/40 rounded-2xl border border-indigo-100 p-6 space-y-3">
              <div className="flex items-center gap-2">
                <IconShieldLock className="w-4 h-4 text-[#5E4BE2]" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Granular HR Privileges
                </h3>
              </div>
              <p className="text-xs text-slate-600 font-medium">
                Select specific administrative modules this HR manager can access and operate.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                {HR_PERMISSIONS.map((perm) => {
                  const checked = form.hrPermissions.includes(perm.key);
                  return (
                    <label
                      key={perm.key}
                      className={`flex items-center gap-2.5 text-xs font-semibold p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                        checked
                          ? 'bg-white border-[#5E4BE2] text-[#5E4BE2] shadow-2xs'
                          : 'bg-white/80 border-slate-200 text-slate-600 hover:bg-white hover:text-slate-800'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handlePermissionToggle(perm.key)}
                        className="rounded-sm text-[#5E4BE2] focus:ring-[#5E4BE2] w-3.5 h-3.5"
                      />
                      <span>{perm.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action Buttons Row */}
          <div className="flex items-center justify-end gap-3 pt-2">
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
                'Onboarding Employee...'
              ) : (
                <>
                  <IconCheck className="w-4 h-4" />
                  <span>Complete Onboarding</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Live Onboarding Profile Preview (4 Cols) */}
        <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-20">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <IconSparkles className="w-4 h-4 text-[#5E4BE2]" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Live Preview
                </h3>
              </div>
              <span className="text-[10px] font-bold text-[#5E4BE2] bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100/50">
                Draft
              </span>
            </div>

            {/* Profile Card Preview */}
            <div className="p-4 rounded-2xl bg-gradient-to-b from-indigo-50/50 to-slate-50/50 border border-indigo-100/60 text-center space-y-3">
              {uploadedFiles.avatar.previewUrl ? (
                <img
                  src={uploadedFiles.avatar.previewUrl}
                  alt="Profile Preview"
                  className="w-16 h-16 rounded-2xl object-cover mx-auto border-2 border-white shadow-md shadow-indigo-500/20"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#5E4BE2] to-indigo-500 text-white font-black text-xl flex items-center justify-center mx-auto shadow-sm shadow-indigo-500/20">
                  {previewInitials}
                </div>
              )}

              <div>
                <h4 className="font-black text-slate-900 text-sm tracking-tight truncate">
                  {form.firstName || form.lastName ? `${form.firstName} ${form.lastName}`.trim() : 'Jane Doe'}
                </h4>
                <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                  {form.jobTitle || 'Role Title Unassigned'}
                </p>
                <div className="mt-2.5 flex items-center justify-center gap-1.5 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200/70">
                    {form.role.replace('_', ' ')}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                    {form.workMode}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Metadata */}
            <div className="space-y-2.5 text-xs pt-1">
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100/80">
                <span className="text-slate-400 font-medium">Department</span>
                <span className="font-bold text-slate-800">{selectedDeptName}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100/80">
                <span className="text-slate-400 font-medium">Reports To</span>
                <span className="font-bold text-slate-800 truncate max-w-[170px] text-right">
                  {selectedManagerName}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100/80">
                <span className="text-slate-400 font-medium">Work Email</span>
                <span className="font-bold text-slate-800 truncate max-w-[170px] text-right">
                  {form.email || '—'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100/80">
                <span className="text-slate-400 font-medium">Monthly CTC</span>
                <span className="font-black text-slate-900">
                  {form.currency} {Number(form.monthlySalary || 0).toLocaleString()}
                </span>
              </div>
              {attachedFilesCount > 0 && (
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100/80">
                  <span className="text-slate-400 font-medium">Attached Files</span>
                  <span className="font-bold text-emerald-600 flex items-center gap-1">
                    <IconFileCheck className="w-3.5 h-3.5" />
                    {attachedFilesCount} {attachedFilesCount === 1 ? 'file' : 'files'}
                  </span>
                </div>
              )}
            </div>

            {/* Informational Notice */}
            <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/60 text-[11px] text-slate-500 font-medium leading-relaxed">
              Upon completing onboarding, a temporary login password and system invite will be sent to the employee's work email address automatically.
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default NewEmployeePage;
