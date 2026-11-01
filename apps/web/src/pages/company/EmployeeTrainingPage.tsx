import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import TablePagination from '../../components/common/TablePagination';
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
  IconBook,
  IconAward,
  IconX,
  IconExternalLink,
  IconPencil,
  IconTrash,
  IconDownload,
  IconSend,
  IconPlayerPlay,
  IconCalendar,
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
  assignedDate: string;
  dueDate: string;
  progressPercent: number;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'NOT_STARTED' | 'OVERDUE';
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
    progressPercent: 100,
    status: 'COMPLETED',
    score: 95,
    certificateId: 'CERT-POSH-2026-001',
    completedDate: '2026-09-20',
  },
  {
    id: 'enr_2',
    programId: 'tr_2',
    programTitle: 'Cybersecurity, Phishing & Data Privacy Awareness',
    employeeId: 101,
    employeeNumber: 'EMP-001',
    employeeName: 'jone',
    department: 'General',
    avatarColor: 'bg-indigo-100 text-indigo-700',
    assignedDate: '2026-09-10',
    dueDate: '2026-11-15',
    progressPercent: 60,
    status: 'IN_PROGRESS',
    score: null,
    certificateId: null,
    completedDate: null,
  },
  {
    id: 'enr_3',
    programId: 'tr_1',
    programTitle: 'POSH & Workplace Code of Conduct (2026)',
    employeeId: 102,
    employeeNumber: 'EMP-002',
    employeeName: 'Arjun Verma',
    department: 'General',
    avatarColor: 'bg-purple-100 text-purple-700',
    assignedDate: '2026-09-01',
    dueDate: '2026-10-15',
    progressPercent: 100,
    status: 'COMPLETED',
    score: 98,
    certificateId: 'CERT-POSH-2026-002',
    completedDate: '2026-09-15',
  },
  {
    id: 'enr_4',
    programId: 'tr_2',
    programTitle: 'Cybersecurity, Phishing & Data Privacy Awareness',
    employeeId: 102,
    employeeNumber: 'EMP-002',
    employeeName: 'Arjun Verma',
    department: 'General',
    avatarColor: 'bg-purple-100 text-purple-700',
    assignedDate: '2026-09-10',
    dueDate: '2026-11-15',
    progressPercent: 100,
    status: 'COMPLETED',
    score: 100,
    certificateId: 'CERT-CYBER-2026-002',
    completedDate: '2026-09-18',
  },
  {
    id: 'enr_5',
    programId: 'tr_3',
    programTitle: 'Workplace Health, Safety & Ergonomics (EHS)',
    employeeId: 103,
    employeeNumber: 'EMP-003',
    employeeName: 'Rohan Sharma',
    department: 'Finance & Accounts',
    avatarColor: 'bg-emerald-100 text-emerald-700',
    assignedDate: '2026-09-15',
    dueDate: '2026-10-31',
    progressPercent: 100,
    status: 'COMPLETED',
    score: 92,
    certificateId: 'CERT-EHS-2026-003',
    completedDate: '2026-10-02',
  },
  {
    id: 'enr_6',
    programId: 'tr_6',
    programTitle: 'Advanced Data Modeling & Business Analytics',
    employeeId: 103,
    employeeNumber: 'EMP-003',
    employeeName: 'Rohan Sharma',
    department: 'Finance & Accounts',
    avatarColor: 'bg-emerald-100 text-emerald-700',
    assignedDate: '2026-09-15',
    dueDate: '2026-11-30',
    progressPercent: 75,
    status: 'IN_PROGRESS',
    score: null,
    certificateId: null,
    completedDate: null,
  },
  {
    id: 'enr_7',
    programId: 'tr_1',
    programTitle: 'POSH & Workplace Code of Conduct (2026)',
    employeeId: 104,
    employeeNumber: 'EMP-004',
    employeeName: 'Priya Nair',
    department: 'Engineering',
    avatarColor: 'bg-rose-100 text-rose-700',
    assignedDate: '2026-09-01',
    dueDate: '2026-10-15',
    progressPercent: 20,
    status: 'OVERDUE',
    score: null,
    certificateId: null,
    completedDate: null,
  },
  {
    id: 'enr_8',
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
    status: 'NOT_STARTED',
    score: null,
    certificateId: null,
    completedDate: null,
  },
];

export const EmployeeTrainingPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'CATALOG' | 'TRACKER'>('CATALOG');
  const [programs, setPrograms] = useState<TrainingProgram[]>(INITIAL_PROGRAMS);
  const [enrollments, setEnrollments] = useState<TrainingEnrollment[]>(INITIAL_ENROLLMENTS);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');

  // Pagination for tracker tab
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal: New Training Program
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProgramData, setNewProgramData] = useState({
    title: '',
    category: 'COMPLIANCE',
    duration: '2.0 Hours',
    format: 'E-Learning (LMS)',
    isMandatory: true,
    description: '',
    materialsUrl: '',
    targetDepartment: 'ALL',
  });

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

  // Metrics
  const metrics = useMemo(() => {
    const totalPrograms = programs.length;
    const totalEnrollments = enrollments.length;
    const completed = enrollments.filter((e) => e.status === 'COMPLETED').length;
    const inProgress = enrollments.filter((e) => e.status === 'IN_PROGRESS').length;
    const overdue = enrollments.filter((e) => e.status === 'OVERDUE').length;
    const completionRate = totalEnrollments > 0 ? Math.round((completed / totalEnrollments) * 100) : 0;
    const mandatoryCount = programs.filter((p) => p.isMandatory).length;

    return { totalPrograms, totalEnrollments, completed, inProgress, overdue, completionRate, mandatoryCount };
  }, [programs, enrollments]);

  // Filtered Programs
  const filteredPrograms = useMemo(() => {
    return programs.filter((p) => {
      const q = search.toLowerCase().trim();
      const matchSearch = !q || p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
      if (!matchSearch) return false;
      if (categoryFilter !== 'ALL' && p.category !== categoryFilter) return false;
      return true;
    });
  }, [programs, search, categoryFilter]);

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

  const handleCreateProgram = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProgramData.title.trim()) return;

    const created: TrainingProgram = {
      id: `tr_${Date.now()}`,
      title: newProgramData.title.trim(),
      category: newProgramData.category as any,
      duration: newProgramData.duration,
      format: newProgramData.format as any,
      isMandatory: newProgramData.isMandatory,
      description: newProgramData.description || 'Training module curriculum configured for organizational workforce.',
      materialsUrl: newProgramData.materialsUrl || 'https://learning.uptrixhrms.com',
      targetDepartment: newProgramData.targetDepartment,
      enrolledCount: 0,
      completedCount: 0,
      createdAt: new Date().toISOString().slice(0, 10),
    };

    setPrograms([created, ...programs]);
    setShowCreateModal(false);
    setNewProgramData({
      title: '',
      category: 'COMPLIANCE',
      duration: '2.0 Hours',
      format: 'E-Learning (LMS)',
      isMandatory: true,
      description: '',
      materialsUrl: '',
      targetDepartment: 'ALL',
    });
    showToast('New training program created successfully!');
  };

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
      case 'NOT_STARTED':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
            Not Started
          </span>
        );
    }
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'COMPLIANCE':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'SECURITY':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'HEALTH_SAFETY':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'ONBOARDING':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'LEADERSHIP':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'TECHNICAL':
      default:
        return 'bg-cyan-100 text-cyan-800 border-cyan-200';
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
            <span>Employee Training &amp; Upskilling</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Administer statutory compliance courses, technical certifications, and track workforce training completion rates.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowAssignModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
          >
            <IconSend className="w-3.5 h-3.5 text-slate-500" />
            <span>Assign Training</span>
          </button>

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#5E4BE2] hover:bg-[#4D3BC9] text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer shrink-0"
          >
            <IconPlus className="w-4 h-4" />
            <span>Create Course</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">Active Courses</span>
            <IconBook className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-xl font-black text-slate-900">{metrics.totalPrograms}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">{metrics.mandatoryCount} mandatory compliance</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-indigo-200/80 shadow-2xs bg-indigo-50/20">
          <div className="flex items-center justify-between text-indigo-600 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Enrolled</span>
            <IconUsers className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-xl font-black text-indigo-900">{metrics.totalEnrollments}</div>
          <div className="text-[10px] text-indigo-600 font-semibold mt-0.5">Across all departments</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200/80 shadow-2xs bg-emerald-50/20">
          <div className="flex items-center justify-between text-emerald-600 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">Completed</span>
            <IconAward className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-emerald-700">{metrics.completed}</div>
          <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">{metrics.completionRate}% completion rate</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-blue-200/80 shadow-2xs bg-blue-50/20">
          <div className="flex items-center justify-between text-blue-600 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">In Progress</span>
            <IconPlayerPlay className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-black text-blue-700">{metrics.inProgress}</div>
          <div className="text-[10px] text-blue-600 font-semibold mt-0.5">Active learners</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-rose-200/80 shadow-2xs bg-rose-50/20 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-rose-600 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">Overdue</span>
            <IconAlertCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-xl font-black text-rose-700">{metrics.overdue}</div>
          <div className="text-[10px] text-rose-600 font-semibold mt-0.5">Escalated reminders sent</div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          type="button"
          onClick={() => setActiveTab('CATALOG')}
          className={`pb-3 text-xs font-bold transition-all relative cursor-pointer ${
            activeTab === 'CATALOG' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <IconBook className="w-4 h-4" />
            <span>Course Catalog ({programs.length})</span>
          </div>
          {activeTab === 'CATALOG' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('TRACKER')}
          className={`pb-3 text-xs font-bold transition-all relative cursor-pointer ${
            activeTab === 'TRACKER' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <IconCertificate className="w-4 h-4" />
            <span>Employee Progress &amp; Certificates ({enrollments.length})</span>
          </div>
          {activeTab === 'TRACKER' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />}
        </button>
      </div>

      {/* TAB 1: COURSE CATALOG */}
      {activeTab === 'CATALOG' && (
        <div className="space-y-4">
          {/* Search & Category Filter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <IconSearch className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search training programs or keywords..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden font-medium text-slate-800 placeholder-slate-400"
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="appearance-none pl-8 pr-7 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:outline-hidden text-slate-700 cursor-pointer"
                >
                  <option value="ALL">All Categories</option>
                  <option value="COMPLIANCE">Compliance &amp; Legal</option>
                  <option value="SECURITY">Security &amp; Privacy</option>
                  <option value="HEALTH_SAFETY">Health &amp; Safety</option>
                  <option value="ONBOARDING">Onboarding</option>
                  <option value="LEADERSHIP">Leadership</option>
                  <option value="TECHNICAL">Technical Skills</option>
                </select>
                <IconFilter className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <IconChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Programs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPrograms.map((p) => {
              const compPercent = p.enrolledCount > 0 ? Math.round((p.completedCount / p.enrolledCount) * 100) : 0;
              return (
                <div
                  key={p.id}
                  className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all p-5 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getCategoryColor(p.category)}`}>
                        {p.category.replace('_', ' ')}
                      </span>
                      {p.isMandatory ? (
                        <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                          Mandatory
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                          Optional
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="font-bold text-slate-900 text-sm leading-snug">{p.title}</h3>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">{p.description}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                      <div>
                        <span className="text-slate-400 block">Duration:</span>
                        <span className="font-bold text-slate-700">{p.duration}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Format:</span>
                        <span className="font-bold text-slate-700">{p.format}</span>
                      </div>
                    </div>

                    {/* Completion Bar */}
                    <div className="space-y-1 pt-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-500 font-medium">Workforce Progress:</span>
                        <span className="font-bold text-slate-800">
                          {p.completedCount} / {p.enrolledCount} ({compPercent}%)
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                          style={{ width: `${compPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <a
                      href={p.materialsUrl || '#'}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-bold inline-flex items-center gap-1"
                    >
                      <span>Course LMS</span>
                      <IconExternalLink className="w-3.5 h-3.5" />
                    </a>

                    <button
                      type="button"
                      onClick={() => {
                        setAssignForm({
                          programId: p.id,
                          targetType: 'ALL',
                          selectedEmployeeName: 'jone',
                          dueDate: '2026-11-30',
                        });
                        setShowAssignModal(true);
                      }}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                    >
                      Assign to Staff
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: PROGRESS TRACKER */}
      {activeTab === 'TRACKER' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
          {/* Tracker Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <IconSearch className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
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
                <IconFilter className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <IconChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Enrollments Table */}
          <div className="overflow-x-auto border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-[#e5e7eb] text-xs font-bold text-slate-900 border-b border-slate-300">
                <tr>
                  <th className="px-5 py-3.5 min-w-[200px]">Employee</th>
                  <th className="px-4 py-3.5 min-w-[220px]">Training Program</th>
                  <th className="px-4 py-3.5 min-w-[120px]">Due Date</th>
                  <th className="px-4 py-3.5 min-w-[140px]">Progress</th>
                  <th className="px-4 py-3.5 min-w-[120px] text-center">Status</th>
                  <th className="px-4 py-3.5 min-w-[130px] text-center">Certificate</th>
                  <th className="px-4 py-3.5 min-w-[120px] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedEnrollments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                      <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-2">
                        <IconSchool className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-800">No training enrollments found</h4>
                      <p className="text-xs text-slate-400 mt-1">Assign courses to employees to begin tracking progress.</p>
                    </td>
                  </tr>
                ) : (
                  paginatedEnrollments.map((enr) => (
                    <tr key={enr.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Employee */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full ${enr.avatarColor} flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs`}
                          >
                            {enr.employeeName.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-slate-900 block truncate">{enr.employeeName}</span>
                            <span className="text-[11px] text-slate-400 block truncate">
                              {enr.employeeNumber} • {enr.department}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Course Title */}
                      <td className="px-4 py-3.5">
                        <span className="font-bold text-slate-900 block truncate" title={enr.programTitle}>
                          {enr.programTitle}
                        </span>
                        <span className="text-[10px] text-slate-400">Assigned: {enr.assignedDate}</span>
                      </td>

                      {/* Due Date */}
                      <td className="px-4 py-3.5">
                        <span className="font-medium text-slate-700 block">{enr.dueDate}</span>
                      </td>

                      {/* Progress Bar */}
                      <td className="px-4 py-3.5">
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

                      {/* Status Badge */}
                      <td className="px-4 py-3.5 text-center">{getStatusBadge(enr.status)}</td>

                      {/* Certificate */}
                      <td className="px-4 py-3.5 text-center">
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
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3.5 text-right">
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
      )}

      {/* ===================== CREATE COURSE MODAL ===================== */}
      {showCreateModal && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] overflow-hidden bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <IconSchool className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Create New Training Program</h3>
                  <p className="text-xs text-slate-400">Configure a course curriculum and requirements</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <IconX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProgram}>
              <div className="p-5 space-y-4 text-xs">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Course Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Information Security & Phishing Awareness"
                    value={newProgramData.title}
                    onChange={(e) => setNewProgramData({ ...newProgramData, title: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden font-medium text-slate-800"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Category</label>
                    <select
                      value={newProgramData.category}
                      onChange={(e) => setNewProgramData({ ...newProgramData, category: e.target.value as any })}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium"
                    >
                      <option value="COMPLIANCE">Compliance &amp; Legal</option>
                      <option value="SECURITY">Security &amp; Privacy</option>
                      <option value="HEALTH_SAFETY">Health &amp; Safety</option>
                      <option value="ONBOARDING">Onboarding</option>
                      <option value="LEADERSHIP">Leadership</option>
                      <option value="TECHNICAL">Technical Skills</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Duration</label>
                    <input
                      type="text"
                      placeholder="e.g. 2.5 Hours"
                      value={newProgramData.duration}
                      onChange={(e) => setNewProgramData({ ...newProgramData, duration: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Format</label>
                    <select
                      value={newProgramData.format}
                      onChange={(e) => setNewProgramData({ ...newProgramData, format: e.target.value as any })}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium"
                    >
                      <option value="E-Learning (LMS)">E-Learning (LMS)</option>
                      <option value="Interactive Module">Interactive Module</option>
                      <option value="Self-Paced Video">Self-Paced Video</option>
                      <option value="Live Workshop">Live Workshop</option>
                      <option value="Classroom">Classroom</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Target Department</label>
                    <select
                      value={newProgramData.targetDepartment}
                      onChange={(e) => setNewProgramData({ ...newProgramData, targetDepartment: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium"
                    >
                      <option value="ALL">All Departments</option>
                      <option value="Engineering">Engineering</option>
                      <option value="Finance & Accounts">Finance &amp; Accounts</option>
                      <option value="General">General</option>
                      <option value="Management">Management</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Description</label>
                  <textarea
                    rows={2}
                    placeholder="Brief outline of syllabus or compliance objectives..."
                    value={newProgramData.description}
                    onChange={(e) => setNewProgramData({ ...newProgramData, description: e.target.value })}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Materials / LMS Video URL</label>
                  <input
                    type="url"
                    placeholder="https://learning.yourcompany.com/module"
                    value={newProgramData.materialsUrl}
                    onChange={(e) => setNewProgramData({ ...newProgramData, materialsUrl: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  />
                </div>

                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                  <input
                    type="checkbox"
                    id="isMandatory"
                    checked={newProgramData.isMandatory}
                    onChange={(e) => setNewProgramData({ ...newProgramData, isMandatory: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                  />
                  <label htmlFor="isMandatory" className="text-xs font-bold text-slate-700 cursor-pointer">
                    Mandatory for employee compliance audit
                  </label>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-200/60 rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs text-xs"
                >
                  Create Course
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

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
                  <p className="text-xs text-slate-400">Enroll workforce in required learning programs</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
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
                    <option value="jone">jone (EMP-001 • General)</option>
                    <option value="Arjun Verma">Arjun Verma (EMP-002 • General)</option>
                    <option value="Rohan Sharma">Rohan Sharma (EMP-003 • Finance)</option>
                    <option value="Priya Nair">Priya Nair (EMP-004 • Engineering)</option>
                    <option value="Vikram Joshi">Vikram Joshi (EMP-005 • Design)</option>
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
            <p className="text-xs text-slate-400">This verifies that</p>

            <h2 className="text-2xl font-black text-slate-900 my-2 tracking-tight">
              {viewingCertificate.employeeName}
            </h2>

            <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
              has successfully completed and met all mandatory evaluation benchmarks for the training program:
            </p>

            <div className="my-4 p-3 bg-amber-50/60 rounded-2xl border border-amber-200 text-sm font-bold text-amber-950 max-w-lg mx-auto">
              {viewingCertificate.programTitle}
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-slate-200 max-w-md mx-auto text-[11px] text-slate-500">
              <div className="text-left">
                <span className="text-slate-400 block font-semibold">Date Completed:</span>
                <span className="font-bold text-slate-800">{viewingCertificate.completedDate || '2026-10-15'}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block font-semibold">Credential ID:</span>
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
