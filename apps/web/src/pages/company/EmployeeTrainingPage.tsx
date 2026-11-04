import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import TablePagination from '../../components/common/TablePagination';
import api from '../../api/client';
import {
  IconSchool,
  IconPlus,
  IconSearch,
  IconFilter,
  IconChevronDown,
  IconCheck,
  IconClock,
  IconAlertCircle,
  IconCertificate,
  IconUsers,
  IconAward,
  IconX,
  IconDownload,
  IconSend,
  IconPlayerPlay,
  IconLock,
  IconMail,
} from '@tabler/icons-react';

export interface TrainingProgram {
  id: string;
  title: string;
  category: 'COMPLIANCE' | 'SECURITY' | 'ONBOARDING' | 'HEALTH_SAFETY' | 'LEADERSHIP' | 'TECHNICAL';
  duration: string;
  format: 'E-Learning (LMS)' | 'Interactive Module' | 'Self-Paced Video' | 'Live Workshop' | 'Classroom';
  isMandatory: boolean;
  description: string;
  materialsUrl?: string;
  targetDepartment: string;
  enrolledCount: number;
  completedCount: number;
  createdAt: string;
}

export interface TrainingEnrollment {
  id: string;
  programId: string;
  programTitle: string;
  employeeId: number;
  employeeNumber: string;
  employeeName: string;
  department: string;
  avatarColor: string;
  profilePhoto?: string | null;
  assignedDate: string;
  dueDate: string;
  progressPercent: number;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'NOT_STARTED' | 'OVERDUE' | 'PENDING';
  score?: number | null;
  certificateId?: string | null;
  completedDate?: string | null;
}

const INITIAL_PROGRAMS: TrainingProgram[] = [
  {
    id: 'tr_1',
    title: 'POSH & Workplace Code of Conduct (2026)',
    category: 'COMPLIANCE',
    duration: '1.5 Hours',
    format: 'E-Learning (LMS)',
    isMandatory: true,
    description: 'Mandatory annual training on prevention of sexual harassment and professional workplace ethics and safety.',
    materialsUrl: 'https://learning.uptrixhrms.com/posh-2026',
    targetDepartment: 'ALL',
    enrolledCount: 42,
    completedCount: 38,
    createdAt: '2026-01-10',
  },
  {
    id: 'tr_2',
    title: 'Cybersecurity, Phishing & Data Privacy Awareness',
    category: 'SECURITY',
    duration: '2.0 Hours',
    format: 'Interactive Module',
    isMandatory: true,
    description: 'Essential protocols on corporate data security, 2FA credentials, phishing threat detection, and device usage.',
    materialsUrl: 'https://learning.uptrixhrms.com/cybersecurity',
    targetDepartment: 'ALL',
    enrolledCount: 42,
    completedCount: 34,
    createdAt: '2026-02-15',
  },
  {
    id: 'tr_3',
    title: 'Workplace Health, Safety & Ergonomics (EHS)',
    category: 'HEALTH_SAFETY',
    duration: '1.0 Hour',
    format: 'Self-Paced Video',
    isMandatory: true,
    description: 'Workstation ergonomics, posture correction, fire safety protocols, and emergency evacuation drills.',
    materialsUrl: 'https://learning.uptrixhrms.com/workplace-safety',
    targetDepartment: 'ALL',
    enrolledCount: 42,
    completedCount: 29,
    createdAt: '2026-03-01',
  },
  {
    id: 'tr_4',
    title: 'New Hire Culture & HRMS Onboarding Walkthrough',
    category: 'ONBOARDING',
    duration: '3.0 Hours',
    format: 'Live Workshop',
    isMandatory: false,
    description: 'Comprehensive orientation covering company history, core values, leave management, payroll, and benefits.',
    materialsUrl: 'https://learning.uptrixhrms.com/onboarding-culture',
    targetDepartment: 'ALL',
    enrolledCount: 15,
    completedCount: 15,
    createdAt: '2026-04-10',
  },
  {
    id: 'tr_5',
    title: 'Managerial Leadership & OKR Goal Setting',
    category: 'LEADERSHIP',
    duration: '4.0 Hours',
    format: 'Live Workshop',
    isMandatory: false,
    description: 'Frameworks for team leaders and managers in quarterly performance evaluation, coaching, and cross-functional delivery.',
    materialsUrl: 'https://learning.uptrixhrms.com/leadership-okrs',
    targetDepartment: 'Management',
    enrolledCount: 12,
    completedCount: 9,
    createdAt: '2026-05-18',
  },
  {
    id: 'tr_6',
    title: 'Advanced Data Modeling & Business Analytics',
    category: 'TECHNICAL',
    duration: '6.0 Hours',
    format: 'E-Learning (LMS)',
    isMandatory: false,
    description: 'Analytical dashboards, forecasting models, and executive data presentation tools for operations & finance staff.',
    materialsUrl: 'https://learning.uptrixhrms.com/analytics-mastery',
    targetDepartment: 'Finance & Accounts',
    enrolledCount: 8,
    completedCount: 6,
    createdAt: '2026-06-20',
  },
];

const INITIAL_ENROLLMENTS: TrainingEnrollment[] = [
  {
    id: 'enr_1',
    programId: 'tr_1',
    programTitle: 'POSH & Workplace Code of Conduct (2026)',
    employeeId: 101,
    employeeNumber: 'EMP-001',
    employeeName: 'jone',
    department: 'General',
    avatarColor: 'bg-indigo-100 text-indigo-700',
    assignedDate: '2026-09-01',
    dueDate: '2026-10-15',
    progressPercent: 0,
    status: 'PENDING',
    score: null,
    certificateId: null,
    completedDate: null,
  },
  {
    id: 'enr_2',
    programId: 'tr_2',
    programTitle: 'Cybersecurity, Phishing & Data Privacy Awareness',
    employeeId: 102,
    employeeNumber: 'EMP-002',
    employeeName: 'Arjun Verma',
    department: 'General',
    avatarColor: 'bg-purple-100 text-purple-700',
    assignedDate: '2026-09-01',
    dueDate: '2026-10-15',
    progressPercent: 0,
    status: 'PENDING',
    score: null,
    certificateId: null,
    completedDate: null,
  },
  {
    id: 'enr_3',
    programId: 'tr_3',
    programTitle: 'Workplace Health, Safety & Ergonomics (EHS)',
    employeeId: 103,
    employeeNumber: 'EMP-003',
    employeeName: 'Rohan Sharma',
    department: 'Finance & Accounts',
    avatarColor: 'bg-emerald-100 text-emerald-700',
    assignedDate: '2026-09-15',
    dueDate: '2026-10-31',
    progressPercent: 0,
    status: 'PENDING',
    score: null,
    certificateId: null,
    completedDate: null,
  },
  {
    id: 'enr_4',
    programId: 'tr_1',
    programTitle: 'POSH & Workplace Code of Conduct (2026)',
    employeeId: 104,
    employeeNumber: 'EMP-004',
    employeeName: 'Priya Nair',
    department: 'Engineering',
    avatarColor: 'bg-rose-100 text-rose-700',
    assignedDate: '2026-09-01',
    dueDate: '2026-10-15',
    progressPercent: 0,
    status: 'PENDING',
    score: null,
    certificateId: null,
    completedDate: null,
  },
  {
    id: 'enr_5',
    programId: 'tr_2',
    programTitle: 'Cybersecurity, Phishing & Data Privacy Awareness',
    employeeId: 105,
    employeeNumber: 'EMP-005',
    employeeName: 'Vikram Joshi',
    department: 'Design',
    avatarColor: 'bg-amber-100 text-amber-700',
    assignedDate: '2026-09-10',
    dueDate: '2026-11-20',
    progressPercent: 0,
    status: 'PENDING',
    score: null,
    certificateId: null,
    completedDate: null,
  },
];

export const EmployeeTrainingPage: React.FC = () => {
  const [programs, setPrograms] = useState<TrainingProgram[]>(INITIAL_PROGRAMS);
  const [enrollments, setEnrollments] = useState<TrainingEnrollment[]>(INITIAL_ENROLLMENTS);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');

  // Pagination for tracker tab
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal: Assign Training
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignForm, setAssignForm] = useState({
    programId: INITIAL_PROGRAMS[0].id,
    targetType: 'ALL',
    selectedEmployeeName: 'jone',
    dueDate: '2026-11-30',
  });

  // Modal: Certificate Preview
  const [viewingCertificate, setViewingCertificate] = useState<TrainingEnrollment | null>(null);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Fetch real organization employees
  useEffect(() => {
    const fetchRealEmployees = async () => {
      try {
        const res = await api.get('/employees', { params: { pageSize: 100, status: 'ALL' } });
        const dbStaff = res.data?.items || res.data?.employees || res.data?.data?.employees || (Array.isArray(res.data) ? res.data : []);
        if (Array.isArray(dbStaff) && dbStaff.length > 0) {
          // Strictly deduplicate by employee id / employeeNumber so no employee is ever repeated
          const seen = new Set<string | number>();
          const uniqueStaff = dbStaff.filter((emp: any) => {
            const key = emp.id ?? emp.employeeNumber ?? emp.email;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });

          const defaultPrograms = [
            'POSH & Workplace Code of Conduct (2026)',
            'Cybersecurity, Phishing & Data Privacy Awareness',
            'Workplace Health, Safety & Ergonomics (EHS)',
            'New Hire Culture & HRMS Onboarding Walkthrough',
            'Managerial Leadership & OKR Goal Setting',
            'Advanced Data Modeling & Business Analytics',
          ];
          const colors = [
            'bg-indigo-100 text-indigo-700',
            'bg-purple-100 text-purple-700',
            'bg-emerald-100 text-emerald-700',
            'bg-rose-100 text-rose-700',
            'bg-amber-100 text-amber-700',
            'bg-cyan-100 text-cyan-700',
          ];
          const mapped: TrainingEnrollment[] = uniqueStaff.map((emp: any, idx: number) => {
            const empName = `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.username || emp.name || `Employee ${emp.id}`;
            const empCode = emp.employeeNumber || `EMP-${String(emp.id).padStart(3, '0')}`;
            const empDept = emp.department?.name || (typeof emp.department === 'string' ? emp.department : 'General');
            return {
              id: `enr_${emp.id}`,
              programId: `tr_${(idx % 6) + 1}`,
              programTitle: defaultPrograms[idx % defaultPrograms.length],
              employeeId: emp.id,
              employeeNumber: empCode,
              employeeName: empName,
              department: empDept,
              avatarColor: colors[idx % colors.length],
              profilePhoto: emp.profilePhoto,
              assignedDate: emp.joiningDate ? String(emp.joiningDate).slice(0, 10) : '2026-09-01',
              dueDate: '2026-11-30',
              progressPercent: 0,
              status: 'PENDING',
              score: null,
              certificateId: null,
              completedDate: null,
            };
          });
          setEnrollments(mapped);
        }
      } catch (err) {
        // Fallback to initial enrollments
      }
    };
    fetchRealEmployees();
  }, []);

  // Metrics
  const metrics = useMemo(() => {
    const totalEnrollments = enrollments.length;
    const completed = enrollments.filter((e) => e.status === 'COMPLETED').length;
    const inProgress = enrollments.filter((e) => e.status === 'IN_PROGRESS').length;
    const overdue = enrollments.filter((e) => e.status === 'OVERDUE').length;
    const pending = enrollments.filter((e) => e.status === 'PENDING').length;
    const completionRate = totalEnrollments > 0 ? Math.round((completed / totalEnrollments) * 100) : 0;

    return { totalEnrollments, completed, inProgress, overdue, pending, completionRate };
  }, [enrollments]);

  // Filtered Enrollments
  const filteredEnrollments = useMemo(() => {
    return enrollments.filter((e) => {
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        e.employeeName.toLowerCase().includes(q) ||
        e.programTitle.toLowerCase().includes(q) ||
        e.employeeNumber.toLowerCase().includes(q);
      if (!matchSearch) return false;
      if (statusFilter !== 'ALL' && e.status !== statusFilter) return false;
      if (departmentFilter !== 'ALL' && e.department !== departmentFilter) return false;
      return true;
    });
  }, [enrollments, search, statusFilter, departmentFilter]);

  const paginatedEnrollments = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredEnrollments.slice(start, start + pageSize);
  }, [filteredEnrollments, currentPage, pageSize]);

  const handleAssignTraining = (e: React.FormEvent) => {
    e.preventDefault();
    const matchedProgram = programs.find((p) => p.id === assignForm.programId);
    if (!matchedProgram) return;

    const newEnrollment: TrainingEnrollment = {
      id: `enr_${Date.now()}`,
      programId: matchedProgram.id,
      programTitle: matchedProgram.title,
      employeeId: 101,
      employeeNumber: 'EMP-001',
      employeeName: assignForm.selectedEmployeeName,
      department: 'General',
      avatarColor: 'bg-indigo-100 text-indigo-700',
      assignedDate: new Date().toISOString().slice(0, 10),
      dueDate: assignForm.dueDate,
      progressPercent: 0,
      status: 'NOT_STARTED',
      score: null,
      certificateId: null,
      completedDate: null,
    };

    setEnrollments([newEnrollment, ...enrollments]);
    // increment count
    setPrograms(
      programs.map((p) => (p.id === matchedProgram.id ? { ...p, enrolledCount: p.enrolledCount + 1 } : p))
    );
    setShowAssignModal(false);
    showToast(`Training assigned to ${assignForm.selectedEmployeeName} successfully!`);
  };

  const handleMarkCompleted = (enrollmentId: string) => {
    setEnrollments((prev) =>
      prev.map((item) => {
        if (item.id === enrollmentId) {
          return {
            ...item,
            status: 'COMPLETED',
            progressPercent: 100,
            score: item.score || 94,
            completedDate: new Date().toISOString().slice(0, 10),
            certificateId: item.certificateId || `CERT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
          };
        }
        return item;
      })
    );
    showToast('Marked as completed & Certificate generated!');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <IconCheck className="w-3 h-3 text-emerald-600" />
            Completed
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <IconClock className="w-3 h-3 text-blue-600" />
            In Progress
          </span>
        );
      case 'OVERDUE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <IconAlertCircle className="w-3 h-3 text-rose-600" />
            Overdue
          </span>
        );
      case 'PENDING':
      case 'NOT_STARTED':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <IconClock className="w-3 h-3 text-amber-600" />
            Pending
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <IconCheck className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Hero Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <IconSchool className="w-4 h-4" />
            </div>
            <span>Employee Training</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Administer statutory compliance courses, technical certifications, and track workforce training completion rates.
          </p>
        </div>
      </div>

      {/* Activation Alert Banner */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-50/90 via-indigo-50/70 to-purple-50/80 border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-100/80 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200">
            <IconLock className="w-4 h-4 stroke-[2]" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <span>Employee Training &amp; Certifications Inactive</span>
              <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold">
                Pending Activation
              </span>
            </div>
            <p className="text-[11px] text-slate-600 font-medium mt-0.5">
              Training programs, progress tracking, and certificate generation are pending. If you want to activate, contact to Uptrix organization.
            </p>
          </div>
        </div>
        <a
          href="mailto:support@uptrix.io?subject=Activate%20Employee%20Training&body=Hi%20Uptrix%20Team%2C%0A%0AWe%20would%20like%20to%20activate%20Employee%20Training%20and%20Certifications%20for%20our%20organization.%20Please%20guide%20us.%0A%0AThank%20you."
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-[#5E4BE2] hover:bg-[#4D3BC9] text-white text-xs font-bold rounded-xl shadow-xs transition-colors shrink-0 cursor-pointer self-start sm:self-auto"
        >
          <IconMail className="w-3.5 h-3.5" />
          <span>Contact Uptrix Organization</span>
        </a>
      </div>

      {/* Progress Tracker Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
        {/* Tracker Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <IconSearch className="w-4 h-4 text-slate-500 font-medium absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Employee or Course name..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden font-medium text-slate-800 placeholder-slate-400"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="appearance-none pl-8 pr-7 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:outline-hidden text-slate-700 cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="COMPLETED">Completed</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="NOT_STARTED">Not Started</option>
                <option value="OVERDUE">Overdue</option>
              </select>
              <IconFilter className="w-3.5 h-3.5 text-slate-500 font-medium absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <IconChevronDown className="w-3.5 h-3.5 text-slate-500 font-medium absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <div className="relative">
              <select
                value={departmentFilter}
                onChange={(e) => {
                  setDepartmentFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="appearance-none pl-8 pr-7 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:outline-hidden text-slate-700 cursor-pointer"
              >
                <option value="ALL">All Departments</option>
                <option value="General">General</option>
                <option value="Finance & Accounts">Finance &amp; Accounts</option>
                <option value="Engineering">Engineering</option>
                <option value="Design">Design</option>
              </select>
              <IconFilter className="w-3.5 h-3.5 text-slate-500 font-medium absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <IconChevronDown className="w-3.5 h-3.5 text-slate-500 font-medium absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Enrollments Table */}
        <div className="relative overflow-x-auto border border-slate-200/80 rounded-2xl shadow-2xs">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-[#e5e7eb] text-xs font-bold text-slate-900 border-b border-slate-300">
              <tr>
                <th className="px-5 py-3.5 min-w-[200px]">Employee</th>
                <th className="px-4 py-3.5 min-w-[220px] filter blur-[2px] select-none opacity-80">Training Program</th>
                <th className="px-4 py-3.5 min-w-[120px] filter blur-[2px] select-none opacity-80">Due Date</th>
                <th className="px-4 py-3.5 min-w-[140px] filter blur-[2px] select-none opacity-80">Progress</th>
                <th className="px-4 py-3.5 min-w-[120px] text-center filter blur-[2px] select-none opacity-80">Status</th>
                <th className="px-4 py-3.5 min-w-[130px] text-center filter blur-[2px] select-none opacity-80">Certificate</th>
                <th className="px-4 py-3.5 min-w-[120px] text-right filter blur-[2px] select-none opacity-80">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedEnrollments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500 font-medium">
                    <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-2">
                      <IconSchool className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-800">No training enrollments found</h4>
                    <p className="text-xs text-slate-500 font-medium mt-1">Assign courses to employees to begin tracking progress.</p>
                  </td>
                </tr>
              ) : (
                paginatedEnrollments.map((enr) => (
                  <tr key={enr.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Employee */}
                    <td className="px-5 py-3.5 bg-white">
                      <div className="flex items-center gap-3">
                        {enr.profilePhoto ? (
                          <img
                            src={enr.profilePhoto}
                            alt={enr.employeeName}
                            className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-slate-200"
                          />
                        ) : (
                          <div
                            className={`w-8 h-8 rounded-full ${enr.avatarColor} flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs`}
                          >
                            {enr.employeeName.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <span className="font-bold text-slate-900 block truncate">{enr.employeeName}</span>
                          <span className="text-[11px] text-slate-500 font-medium block truncate">
                            {enr.employeeNumber} • {enr.department}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Course Title - Blurred */}
                    <td className="px-4 py-3.5 filter blur-[4px] select-none pointer-events-none opacity-60">
                      <span className="font-bold text-slate-900 block truncate" title={enr.programTitle}>
                        {enr.programTitle}
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">Assigned: {enr.assignedDate}</span>
                    </td>

                    {/* Due Date - Blurred */}
                    <td className="px-4 py-3.5 filter blur-[4px] select-none pointer-events-none opacity-60">
                      <span className="font-medium text-slate-700 block">{enr.dueDate}</span>
                    </td>

                    {/* Progress Bar - Blurred */}
                    <td className="px-4 py-3.5 filter blur-[4px] select-none pointer-events-none opacity-60">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-semibold text-slate-700">
                          <span>{enr.progressPercent}%</span>
                          {enr.score && <span className="text-emerald-600">Score: {enr.score}%</span>}
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${enr.progressPercent === 100 ? 'bg-emerald-500' : 'bg-indigo-600'}`}
                            style={{ width: `${enr.progressPercent}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Status Badge - Blurred */}
                    <td className="px-4 py-3.5 text-center filter blur-[4px] select-none pointer-events-none opacity-60">{getStatusBadge(enr.status)}</td>

                    {/* Certificate - Blurred */}
                    <td className="px-4 py-3.5 text-center filter blur-[4px] select-none pointer-events-none opacity-60">
                      {enr.certificateId ? (
                        <button
                          type="button"
                          onClick={() => setViewingCertificate(enr)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-colors cursor-pointer"
                        >
                          <IconAward className="w-3.5 h-3.5 text-amber-600" />
                          <span>Certificate</span>
                        </button>
                      ) : (
                        <span className="text-slate-500 font-medium text-[11px]">—</span>
                      )}
                    </td>

                    {/* Action - Blurred */}
                    <td className="px-4 py-3.5 text-right filter blur-[4px] select-none pointer-events-none opacity-60">
                      {enr.status !== 'COMPLETED' ? (
                        <button
                          type="button"
                          onClick={() => handleMarkCompleted(enr.id)}
                          className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors cursor-pointer"
                        >
                          Mark Complete
                        </button>
                      ) : (
                        <span className="text-emerald-600 font-bold text-[11px]">Certified ✓</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Centered Activation Notice over the Blurred Training Columns */}
          <div className="absolute inset-y-0 right-0 left-[200px] sm:left-[220px] flex items-center justify-center p-4 z-20 pointer-events-none">
            <div className="pointer-events-auto bg-white/95 backdrop-blur-md border border-indigo-200/90 shadow-2xl rounded-2xl p-6 text-center max-w-sm mx-auto space-y-3 animate-in fade-in zoom-in-95 duration-150">
              <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 text-[#5E4BE2] flex items-center justify-center mx-auto shadow-2xs">
                <IconLock className="w-5 h-5 stroke-[2]" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Employee Training Inactive
                </h4>
                <p className="text-xs text-slate-600 font-medium mt-1 leading-relaxed">
                  If you want to activate, contact to Uptrix organization.
                </p>
              </div>
              <div className="pt-1">
                <a
                  href="mailto:support@uptrix.io?subject=Activate%20Employee%20Training&body=Hi%20Uptrix%20Team%2C%0A%0AWe%20would%20like%20to%20activate%20Employee%20Training%20and%20Certifications%20for%20our%20organization.%20Please%20guide%20us.%0A%0AThank%20you."
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#5E4BE2] hover:bg-[#4D3BC9] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <IconMail className="w-4 h-4" />
                  <span>Contact Uptrix Organization</span>
                </a>
              </div>
            </div>
          </div>
        </div>

          {/* Pagination */}
          {filteredEnrollments.length > 0 && (
            <TablePagination
              currentPage={currentPage}
              totalItems={filteredEnrollments.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              pageSizeOptions={[10, 25, 50]}
              itemName="enrollments"
            />
          )}
        </div>

      {/* ===================== ASSIGN TRAINING MODAL ===================== */}
      {showAssignModal && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] overflow-hidden bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowAssignModal(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <IconSend className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Assign Training to Employee</h3>
                  <p className="text-xs text-slate-500 font-medium">Enroll workforce in required learning programs</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="p-1.5 rounded-lg text-slate-500 font-medium hover:text-slate-600 hover:bg-slate-100"
              >
                <IconX className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAssignTraining}>
              <div className="p-5 space-y-4 text-xs">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Select Program</label>
                  <select
                    value={assignForm.programId}
                    onChange={(e) => setAssignForm({ ...assignForm, programId: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                  >
                    {programs.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} ({p.duration})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Target Employee</label>
                  <select
                    value={assignForm.selectedEmployeeName}
                    onChange={(e) => setAssignForm({ ...assignForm, selectedEmployeeName: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
                  >
                    {enrollments.map((enr) => (
                      <option key={enr.id} value={enr.employeeName}>
                        {enr.employeeName} ({enr.employeeNumber} • {enr.department})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Completion Deadline</label>
                  <input
                    type="date"
                    value={assignForm.dueDate}
                    onChange={(e) => setAssignForm({ ...assignForm, dueDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-200/60 rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs text-xs"
                >
                  Enroll Staff
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ===================== CERTIFICATE PREVIEW MODAL ===================== */}
      {viewingCertificate && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] overflow-hidden bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setViewingCertificate(null)}
        >
          <div
            className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border-4 border-amber-300 p-8 text-center relative overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Watermark badge */}
            <div className="w-16 h-16 rounded-full bg-amber-50 border-2 border-amber-400 text-amber-600 flex items-center justify-center mx-auto mb-3 shadow-md">
              <IconAward className="w-8 h-8" />
            </div>

            <div className="uppercase tracking-widest text-xs font-extrabold text-amber-700 mb-1">
              Certificate of Completion
            </div>
            <p className="text-xs text-slate-500 font-medium">This verifies that</p>

            <h2 className="text-2xl font-black text-slate-900 my-2 tracking-tight">
              {viewingCertificate.employeeName}
            </h2>

            <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
              has successfully completed and met all mandatory evaluation benchmarks for the training program:
            </p>

            <div className="my-4 p-3 bg-amber-50/60 rounded-2xl border border-amber-200 text-sm font-bold text-amber-950 max-w-lg mx-auto">
              {viewingCertificate.programTitle}
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-slate-200 max-w-md mx-auto text-[11px] text-slate-500 font-medium">
              <div className="text-left">
                <span className="text-slate-500 block font-semibold">Date Completed:</span>
                <span className="font-bold text-slate-800">{viewingCertificate.completedDate || '2026-10-15'}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-500 block font-semibold">Credential ID:</span>
                <span className="font-mono font-bold text-slate-800">{viewingCertificate.certificateId}</span>
              </div>
            </div>

            <div className="mt-6 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setViewingCertificate(null)}
                className="px-5 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl text-xs"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  showToast('Certificate PDF downloaded successfully!');
                  setViewingCertificate(null);
                }}
                className="px-5 py-2 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs text-xs inline-flex items-center gap-1.5"
              >
                <IconDownload className="w-3.5 h-3.5" />
                <span>Download Certificate</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default EmployeeTrainingPage;
