import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Link, useSearchParams } from 'react-router-dom';
import api, { getFileUrl } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import TablePagination from '../../components/common/TablePagination';
import {
  IconUsers,
  IconSearch,
  IconPlus,
  IconBuilding,
  IconMail,
  IconPhone,
  IconBriefcase,
  IconEye,
  IconX,
  IconCalendar,
  IconUserCheck,
  IconFilter,
  IconUserPlus,
  IconPencil,
  IconUserMinus,
  IconRotateClockwise,
  IconCamera,
  IconId,
  IconHeartHandshake,
  IconClock,
  IconTrash,
} from '@tabler/icons-react';

interface Employee {
  id: number;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: string;
  jobTitle: string;
  profilePhoto?: string | null;
  workMode: string;
  employmentType: string;
  employeeNumber?: string;
  personalEmail?: string;
  emergencyContact?: {
    name?: string;
    relationship?: string;
    phone?: string;
  } | any;
  joiningDate?: string;
  dateOfBirth?: string;
  monthlySalary?: number;
  currency?: string;
  bankDetails?: any;
  address?: string;
  workingAddress?: string;
  shiftTiming?: string;
  department?: { id: number; name: string };
  manager?: { id: number; firstName: string; lastName: string };
  createdAt: string;
  isActive?: boolean;
}

interface Department {
  id: number;
  name: string;
}

export const EmployeesPage: React.FC = () => {
  const { user, hasHrPermission } = useAuth();
  const isCompanyAdmin = user?.role === 'COMPANY_ADMIN' || user?.role === 'PRODUCT_SUPER_ADMIN';
  const isHr = user?.role === 'HR';
  const [searchParams, setSearchParams] = useSearchParams();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>(searchParams.get('departmentId') || '');
  const [selectedWorkMode, setSelectedWorkMode] = useState<'ALL' | 'OFFICE' | 'WFH'>('ALL');
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);

  // Active vs Offboarded tab state
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'OFFBOARDED'>('ACTIVE');
  const [activeCount, setActiveCount] = useState<number>(0);
  const [offboardedCount, setOffboardedCount] = useState<number>(0);
  const [newJoinersCount, setNewJoinersCount] = useState<number>(0);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Edit employee modal state
  const [editTarget, setEditTarget] = useState<Employee | null>(null);
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    jobTitle: '',
    departmentId: '',
    role: 'EMPLOYEE',
    workMode: 'WFO',
    employmentType: 'PERMANENT',
    shiftTiming: 'General Shift (09:30 AM - 06:30 PM)',
    address: '',
    workingAddress: '',
    employeeNumber: '',
    personalEmail: '',
    monthlySalary: 0,
    joiningDate: '',
    dateOfBirth: '',
    emergencyContactName: '',
    emergencyContactRelationship: '',
    emergencyContactPhone: '',
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');

  // Offboard confirmation modal state
  const [offboardTarget, setOffboardTarget] = useState<Employee | null>(null);
  const [isOffboarding, setIsOffboarding] = useState(false);

  useEffect(() => {
    const deptFromUrl = searchParams.get('departmentId') || '';
    if (deptFromUrl !== selectedDept) {
      setSelectedDept(deptFromUrl);
    }
  }, [searchParams]);

  const canAdd = user?.role === 'COMPANY_ADMIN' || (user?.role === 'HR' && hasHrPermission('employees'));

  const fetchEmployees = async () => {
    setIsLoading(true);
    try {
      const params: any = { status: activeTab };
      if (search) params.search = search;
      if (selectedDept) params.departmentId = selectedDept;
      const res = await api.get('/employees', { params });
      setEmployees(res.data?.items || []);
    } catch (err) {
      console.error('Failed to load employees:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCounts = async () => {
    try {
      const [actRes, offRes, allRes] = await Promise.all([
        api.get('/employees', { params: { status: 'ACTIVE', pageSize: 1 } }),
        api.get('/employees', { params: { status: 'OFFBOARDED', pageSize: 1 } }),
        api.get('/employees', { params: { status: 'ALL', pageSize: 100 } }),
      ]);
      const act = actRes.data?.total ?? 0;
      const off = offRes.data?.total ?? 0;
      setActiveCount(act);
      setOffboardedCount(off);

      const items: Employee[] = allRes.data?.items || [];
      const now = Date.now();
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
      const joiners = items.filter((e) => {
        const rawDate = e.joiningDate || e.createdAt;
        if (!rawDate) return false;
        const joinTime = new Date(rawDate).getTime();
        return !isNaN(joinTime) && now - joinTime <= thirtyDaysMs && joinTime <= now + (24 * 60 * 60 * 1000);
      }).length;
      setNewJoinersCount(joiners);
    } catch (e) {
      console.error('Failed to load employee counts:', e);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await api.get('/company/departments');
      setDepartments(res.data?.departments || []);
    } catch (err) {
      console.error('Failed to load departments:', err);
    }
  };

  useEffect(() => {
    fetchDepartments();
    fetchCounts();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchEmployees();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, selectedDept, activeTab]);

  const handleOpenEdit = (emp: Employee) => {
    setEditTarget(emp);
    setEditError('');
    const emg = (emp.emergencyContact as any) || {};
    setEditForm({
      firstName: emp.firstName || '',
      lastName: emp.lastName || '',
      phone: emp.phone || '',
      jobTitle: emp.jobTitle || '',
      departmentId: emp.department?.id ? String(emp.department.id) : '',
      role: emp.role || 'EMPLOYEE',
      workMode: emp.workMode === 'WFH' || emp.workMode === 'REMOTE' ? 'WFH' : 'WFO',
      employmentType: emp.employmentType === 'CONTRACT' ? 'CONTRACT' : 'PERMANENT',
      employeeNumber: emp.employeeNumber || '',
      personalEmail: emp.personalEmail || '',
      address: emp.address || '',
      workingAddress: emp.workingAddress || '',
      shiftTiming: emp.shiftTiming || 'General Shift (09:30 AM - 06:30 PM)',
      monthlySalary: emp.monthlySalary ? Number(emp.monthlySalary) : 0,
      joiningDate: emp.joiningDate ? emp.joiningDate.split('T')[0] : '',
      dateOfBirth: emp.dateOfBirth ? emp.dateOfBirth.split('T')[0] : '',
      emergencyContactName: emg.name || '',
      emergencyContactRelationship: emg.relationship || '',
      emergencyContactPhone: emg.phone || '',
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    setIsSavingEdit(true);
    setEditError('');
    try {
      const payload: any = {
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
        phone: editForm.phone.trim(),
        role: isCompanyAdmin ? (editForm.role === 'HR' ? 'HR' : 'EMPLOYEE') : 'EMPLOYEE',
        workMode: editForm.workMode,
        employmentType: editForm.employmentType,
        shiftTiming: editForm.shiftTiming.trim(),
        workingAddress: editForm.workingAddress.trim(),
        personalEmail: editForm.personalEmail.trim(),
        emergencyContact: {
          name: editForm.emergencyContactName.trim(),
          relationship: editForm.emergencyContactRelationship.trim(),
          phone: editForm.emergencyContactPhone.trim(),
        },
      };
      if (editForm.dateOfBirth) {
        payload.dateOfBirth = editForm.dateOfBirth;
      }
      await api.patch(`/employees/${editTarget.id}`, payload);
      setEditTarget(null);
      await Promise.all([fetchEmployees(), fetchCounts()]);
    } catch (err: any) {
      setEditError(err.response?.data?.message || 'Failed to update employee details');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleConfirmOffboard = async () => {
    if (!offboardTarget) return;
    setIsOffboarding(true);
    try {
      await api.patch(`/employees/${offboardTarget.id}/deactivate`);
      setOffboardTarget(null);
      await Promise.all([fetchEmployees(), fetchCounts()]);
    } catch (err) {
      console.error('Failed to deactivate employee:', err);
      alert('Failed to deactivate employee. Please try again.');
    } finally {
      setIsOffboarding(false);
    }
  };

  const handleReactivate = async (emp: Employee) => {
    if (
      !window.confirm(
        `Are you sure you want to reactivate ${emp.firstName} ${emp.lastName}? Their account access will be restored and they will move to Active Employees.`
      )
    ) {
      return;
    }
    try {
      await api.patch(`/employees/${emp.id}/reactivate`);
      await Promise.all([fetchEmployees(), fetchCounts()]);
    } catch (err) {
      console.error('Failed to reactivate employee:', err);
      alert('Failed to reactivate employee. Please try again.');
    }
  };

  // Filtered employees by work mode
  const filteredEmployees = useMemo(() => {
    if (selectedWorkMode === 'ALL') return employees;
    if (selectedWorkMode === 'WFH') {
      return employees.filter((e) => e.workMode === 'WFH' || e.workMode === 'REMOTE');
    }
    if (selectedWorkMode === 'OFFICE') {
      return employees.filter(
        (e) =>
          e.workMode === 'WFO' ||
          e.workMode === 'ON_SITE' ||
          e.workMode === 'ONSITE' ||
          e.workMode === 'OFFICE' ||
          !e.workMode ||
          e.workMode === 'HYBRID'
      );
    }
    return employees;
  }, [employees, selectedWorkMode]);

  // Paginated employees for current page
  const paginatedEmployees = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredEmployees.slice(start, start + pageSize);
  }, [filteredEmployees, currentPage, pageSize]);

  // Dynamic KPI Stats derived strictly from real employee records
  const kpiStats = useMemo(() => {
    const total = activeCount + offboardedCount || employees.length;
    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

    const localNewJoiners = employees.filter((e) => {
      const rawDate = e.joiningDate || e.createdAt;
      if (!rawDate) return false;
      const joinTime = new Date(rawDate).getTime();
      return !isNaN(joinTime) && now - joinTime <= thirtyDaysMs && joinTime <= now + (24 * 60 * 60 * 1000);
    }).length;

    return {
      total,
      active: activeCount,
      inactive: offboardedCount,
      newJoiners: newJoinersCount || localNewJoiners,
    };
  }, [activeCount, offboardedCount, employees, newJoinersCount]);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'COMPANY_ADMIN':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200/70 shadow-2xs whitespace-nowrap">
            Company Admin
          </span>
        );
      case 'HR':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/70 shadow-2xs whitespace-nowrap">
            HR Manager
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200/70 shadow-2xs whitespace-nowrap">
            Employee
          </span>
        );
    }
  };

  const getWorkModeBadge = (mode: string) => {
    const isWfh = mode === 'WFH' || mode === 'REMOTE';
    if (isWfh) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/70 shadow-2xs whitespace-nowrap">
          Home
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/70 shadow-2xs whitespace-nowrap">
        Office
      </span>
    );
  };

  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const getEmployeePhotoUrl = (photo?: string | null): string | null => {
    if (!photo) return null;
    if (photo.includes('.amazonaws.com/image/')) {
      const filename = photo.split('.amazonaws.com/image/')[1];
      return getFileUrl(`/image/${filename}`);
    }
    if (photo.includes('.amazonaws.com/uploads/')) {
      const filename = photo.split('.amazonaws.com/uploads/')[1];
      return getFileUrl(`/uploads/${filename}`);
    }
    if (photo.startsWith('/image/') || photo.startsWith('/uploads/')) {
      return getFileUrl(photo);
    }
    if (photo.startsWith('http://') || photo.startsWith('https://')) {
      return photo;
    }
    return getFileUrl(photo);
  };

  const handlePhotoUpload = async (empId: number, file?: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Photo must be smaller than 5MB');
      return;
    }
    setIsUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('photo', file);
      const res = await api.post(`/employees/${empId}/photo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const updatedPhoto = res.data?.profilePhoto || res.data?.url;
      setEmployees((prev) =>
        prev.map((e) => (e.id === empId ? { ...e, profilePhoto: updatedPhoto } : e))
      );
      if (selectedEmp && selectedEmp.id === empId) {
        setSelectedEmp({ ...selectedEmp, profilePhoto: updatedPhoto });
      }
      if (editTarget && editTarget.id === empId) {
        setEditTarget({ ...editTarget, profilePhoto: updatedPhoto });
      }
    } catch (err: any) {
      console.error('Failed to upload photo:', err);
      alert(err.response?.data?.message || 'Failed to upload image');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ===================== TOP HEADER BAR ===================== */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Employees
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Browse and manage all team members, reporting structures, and departments.
          </p>
        </div>

        {/* Add Employee CTA */}
        {canAdd && (
          <Link
            to="/company/employees/new"
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#5E4BE2] to-[#4B39C3] hover:from-[#5340D4] hover:to-[#4130B4] text-white text-xs font-bold rounded-xl shadow-sm shadow-indigo-600/25 transition-all active:scale-[0.98] cursor-pointer"
          >
            <IconPlus className="w-4 h-4" />
            <span>Create Employee</span>
          </Link>
        )}
      </div>

      {/* ===================== ROW 1: 4 KPI STAT CARDS ===================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Employees */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <span className="text-xs font-bold text-slate-500">Total Employees</span>
            <div className="text-2xl font-black text-slate-900 mt-1 leading-none tracking-tight">
              {kpiStats.total.toLocaleString()}
            </div>
            <div className="text-[11px] font-bold text-slate-500 mt-2">
              {kpiStats.active} active · {kpiStats.inactive} inactive
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5E4BE2]">
            <IconUsers className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Active */}
        <button
          type="button"
          onClick={() => setActiveTab('ACTIVE')}
          className={`bg-white rounded-2xl border p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-all text-left cursor-pointer ${activeTab === 'ACTIVE' ? 'border-emerald-300 ring-2 ring-emerald-500/20' : 'border-slate-200'
            }`}
        >
          <div>
            <span className="text-xs font-bold text-slate-500">Active</span>
            <div className="text-2xl font-black text-slate-900 mt-1 leading-none tracking-tight">
              {kpiStats.active.toLocaleString()}
            </div>
            <div className="text-[11px] font-bold text-emerald-600 mt-2">
              {kpiStats.total > 0 ? Math.round((kpiStats.active / kpiStats.total) * 100) : 100}% of workforce
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <IconUserCheck className="w-5 h-5" />
          </div>
        </button>

        {/* Card 3: Inactive */}
        <button
          type="button"
          onClick={() => setActiveTab('OFFBOARDED')}
          className={`bg-white rounded-2xl border p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-all text-left cursor-pointer ${activeTab === 'OFFBOARDED' ? 'border-rose-300 ring-2 ring-rose-500/20' : 'border-slate-200'
            }`}
        >
          <div>
            <span className="text-xs font-bold text-slate-500">Inactive</span>
            <div className="text-2xl font-black text-slate-900 mt-1 leading-none tracking-tight">
              {kpiStats.inactive.toLocaleString()}
            </div>
            <div className="text-[11px] font-bold text-rose-600 mt-2">
              {kpiStats.total > 0 ? Math.round((kpiStats.inactive / kpiStats.total) * 100) : 0}% of workforce
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
            <IconUserMinus className="w-5 h-5" />
          </div>
        </button>

        {/* Card 4: New Joiners(-30d) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <span className="text-xs font-bold text-slate-500">New Joiners(-30d)</span>
            <div className="text-2xl font-black text-slate-900 mt-1 leading-none tracking-tight">
              {kpiStats.newJoiners.toLocaleString()}
            </div>
            <div className="flex items-center gap-1 text-[11px] font-bold text-blue-600 mt-2">
              <span>↑</span>
              <span>Joined in last 30 days</span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <IconUserPlus className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ===================== ROSTER STATUS TABS ===================== */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => {
            setActiveTab('ACTIVE');
            setCurrentPage(1);
          }}
          className={`flex items-center gap-2 pb-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${activeTab === 'ACTIVE'
              ? 'border-[#5E4BE2] text-[#5E4BE2]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
        >
          <IconUsers className="w-4 h-4" />
          <span>Active Employees</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${activeTab === 'ACTIVE' ? 'bg-indigo-50 text-[#5E4BE2]' : 'bg-slate-100 text-slate-500'
              }`}
          >
            {activeCount}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveTab('OFFBOARDED');
            setCurrentPage(1);
          }}
          className={`flex items-center gap-2 pb-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${activeTab === 'OFFBOARDED'
              ? 'border-rose-600 text-rose-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
        >
          <IconUserMinus className="w-4 h-4" />
          <span>Deactivated Employees</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${activeTab === 'OFFBOARDED' ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-500'
              }`}
          >
            {offboardedCount}
          </span>
        </button>
      </div>

      {/* ===================== ROW 2: SEARCH & FILTERS BAR ===================== */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <IconSearch className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name, email, or role title..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-10 py-2.5 text-xs font-medium bg-slate-50/70 border border-slate-200/80 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#5E4BE2]/20 focus:border-[#5E4BE2] transition-all placeholder:text-slate-400 text-slate-800"
          />
          {search && (
            <button
              onClick={() => {
                setSearch('');
                setCurrentPage(1);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
            >
              <IconX className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Department Dropdown & Work Mode Pills */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Department Select */}
          <div className="min-w-[190px]">
            <select
              value={selectedDept}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedDept(val);
                setCurrentPage(1);
                if (val) {
                  setSearchParams({ departmentId: val });
                } else {
                  setSearchParams({});
                }
              }}
              className="w-full px-3 py-2.5 text-xs font-semibold bg-slate-50/70 border border-slate-200/80 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#5E4BE2]/20 focus:border-[#5E4BE2] transition-all text-slate-700 cursor-pointer"
            >
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}{(dept as any).isActive === false ? ' (Inactive)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Work Mode Toggle Pills */}
          <div className="flex items-center bg-slate-50/80 border border-slate-200/70 p-1 rounded-xl">
            {(['ALL', 'OFFICE', 'WFH'] as const).map((mode) => {
              const label =
                mode === 'ALL'
                  ? 'All'
                  : mode === 'OFFICE'
                    ? 'Office'
                    : 'Home';
              const isActive = selectedWorkMode === mode;
              return (
                <button
                  key={mode}
                  onClick={() => {
                    setSelectedWorkMode(mode);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${isActive
                      ? 'bg-white text-[#5E4BE2] shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                    }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Active Count Pill */}
          <span className="hidden sm:inline-flex px-3 py-2 rounded-xl bg-indigo-50/70 text-[#5E4BE2] text-xs font-bold border border-indigo-100/60 shrink-0">
            {filteredEmployees.length} {filteredEmployees.length === 1 ? 'member' : 'members'}
          </span>
        </div>
      </div>

      {/* ===================== ROW 3: EMPLOYEES DATA TABLE ===================== */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm text-slate-600">
            <thead className="bg-[#e5e7eb] text-xs font-bold text-slate-900 border-b border-slate-300">
              <tr>
                <th className="px-5 py-3.5 whitespace-nowrap min-w-[220px]">Employee</th>
                <th className="px-5 py-3.5 whitespace-nowrap min-w-[160px]">Department</th>
                <th className="px-5 py-3.5 whitespace-nowrap min-w-[170px]">Shift</th>
                <th className="px-5 py-3.5 whitespace-nowrap min-w-[170px]">Designation</th>
                <th className="px-5 py-3.5 whitespace-nowrap min-w-[120px]">Role</th>
                <th className="px-5 py-3.5 whitespace-nowrap min-w-[100px]">Work Mode</th>
                <th className="px-5 py-3.5 whitespace-nowrap min-w-[130px]">Manager</th>
                <th className="px-5 py-3.5 text-right whitespace-nowrap min-w-[90px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/80">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-200" />
                        <div className="space-y-1.5">
                          <div className="w-28 h-3.5 bg-slate-200 rounded-sm" />
                          <div className="w-36 h-3 bg-slate-100 rounded-sm" />
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4"><div className="w-24 h-3 bg-slate-200 rounded-sm" /></td>
                    <td className="px-5 py-4"><div className="w-28 h-3 bg-slate-200 rounded-sm" /></td>
                    <td className="px-5 py-4"><div className="w-20 h-3 bg-slate-200 rounded-sm" /></td>
                    <td className="px-5 py-4"><div className="w-16 h-4 bg-slate-200 rounded-full" /></td>
                    <td className="px-5 py-4"><div className="w-14 h-4 bg-slate-200 rounded-full" /></td>
                    <td className="px-5 py-4"><div className="w-20 h-3 bg-slate-200 rounded-sm" /></td>
                    <td className="px-5 py-4 text-right"><div className="w-8 h-8 bg-slate-200 rounded-lg ml-auto" /></td>
                  </tr>
                ))
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-14 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-[#5E4BE2] flex items-center justify-center mx-auto mb-3 shadow-2xs">
                      <IconUsers className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-slate-800">No employees found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      No records match your search or department filter criteria.
                    </p>
                    {(search || selectedDept || selectedWorkMode !== 'ALL') && (
                      <button
                        onClick={() => {
                          setSearch('');
                          setSelectedDept('');
                          setSelectedWorkMode('ALL');
                          setSearchParams({});
                        }}
                        className="mt-3 text-xs font-bold text-[#5E4BE2] hover:underline cursor-pointer"
                      >
                        Reset all filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedEmployees.map((emp) => {
                  const initials = `${emp.firstName?.[0] || ''}${emp.lastName?.[0] || ''}`.toUpperCase();
                  return (
                    <tr
                      key={emp.id}
                      className="hover:bg-indigo-50/20 transition-colors group"
                    >
                      {/* Employee Name & Email */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#5E4BE2] to-indigo-500 text-white flex items-center justify-center font-bold text-xs shadow-2xs overflow-hidden shrink-0 relative">
                            <span className="select-none">{initials || 'U'}</span>
                            {getEmployeePhotoUrl(emp.profilePhoto) && (
                              <img
                                src={getEmployeePhotoUrl(emp.profilePhoto)!}
                                alt={emp.firstName}
                                className="absolute inset-0 w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-xs text-slate-900 group-hover:text-[#5E4BE2] transition-colors leading-tight truncate">
                              {emp.firstName} {emp.lastName}
                            </div>
                            <div className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
                              {emp.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Department */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {emp.department ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-indigo-50/70 text-[#5E4BE2] font-semibold border border-indigo-100/60 whitespace-nowrap">
                            <IconBuilding className="w-3.5 h-3.5 text-[#5E4BE2]/80 shrink-0" />
                            {emp.department.name}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs italic">Unassigned</span>
                        )}
                      </td>

                      {/* Shift Timing */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-800 leading-tight">
                            {emp.shiftTiming ? emp.shiftTiming.split('(')[0].trim() : 'General Shift'}
                          </span>
                          <span className="text-[11px] text-slate-400 font-medium mt-0.5">
                            {emp.shiftTiming && emp.shiftTiming.includes('(')
                              ? emp.shiftTiming.split('(')[1]?.replace(')', '').trim()
                              : '09:30 AM – 06:30 PM'}
                          </span>
                        </div>
                      </td>

                      {/* Designation */}
                      <td className="px-5 py-3.5 whitespace-nowrap text-xs font-semibold text-slate-800 capitalize">
                        {emp.jobTitle || 'Team Member'}
                      </td>

                      {/* Role Badge */}
                      <td className="px-5 py-3.5 whitespace-nowrap">{getRoleBadge(emp.role)}</td>

                      {/* Work Mode Badge */}
                      <td className="px-5 py-3.5 whitespace-nowrap">{getWorkModeBadge(emp.workMode)}</td>

                      {/* Manager */}
                      <td className="px-5 py-3.5 whitespace-nowrap text-xs font-semibold text-slate-600">
                        {emp.manager ? `${emp.manager.firstName} ${emp.manager.lastName}` : '—'}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          {/* View details */}
                          <button
                            type="button"
                            onClick={() => setSelectedEmp(emp)}
                            className="w-8 h-8 rounded-xl border border-slate-200 bg-white hover:bg-[#F0EEFF] hover:border-indigo-300 text-slate-700 hover:text-[#5E4BE2] flex items-center justify-center shadow-2xs transition-all cursor-pointer"
                            title="View Profile Details"
                          >
                            <IconEye className="w-4 h-4 stroke-[1.8]" />
                          </button>

                          {/* Edit button (Admin & HR) */}
                          {canAdd && (
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(emp)}
                              className="w-8 h-8 rounded-xl border border-slate-200 bg-white hover:bg-blue-50 hover:border-blue-300 text-slate-900 hover:text-blue-600 flex items-center justify-center shadow-2xs transition-all cursor-pointer"
                              title="Edit Employee Details"
                            >
                              <IconPencil className="w-4 h-4 stroke-[1.8]" />
                            </button>
                          )}

                          {/* Offboard / Reactivate button */}
                          {canAdd && (
                            activeTab === 'ACTIVE' ? (
                              <button
                                type="button"
                                onClick={() => setOffboardTarget(emp)}
                                className="w-8 h-8 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-300 text-rose-600 hover:text-rose-700 flex items-center justify-center shadow-2xs transition-all cursor-pointer"
                                title="Deactivate Employee"
                              >
                                <IconUserMinus className="w-4 h-4 stroke-[1.8]" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleReactivate(emp)}
                                className="px-2.5 py-1.5 rounded-xl border border-emerald-300 bg-white hover:bg-emerald-50 text-emerald-700 flex items-center gap-1.5 text-xs font-bold shadow-2xs transition-all cursor-pointer"
                                title="Reactivate Employee"
                              >
                                <IconUserCheck className="w-3.5 h-3.5 stroke-[2]" />
                                <span>Reactivate</span>
                              </button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <TablePagination
          currentPage={currentPage}
          totalItems={filteredEmployees.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[10, 25, 50, 100]}
          itemName="employees"
        />
      </div>

      {/* ===================== EMPLOYEE DETAIL RIGHT-SIDE DRAWER ===================== */}
      {selectedEmp && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] overflow-hidden bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
          onClick={() => setSelectedEmp(null)}
        >
          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div
              className="w-screen max-w-md bg-white shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-300 border-l border-slate-100"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drawer Header */}
              <div className="relative bg-gradient-to-r from-[#5E4BE2] to-[#4B39C3] p-6 text-white shrink-0">
                <button
                  onClick={() => setSelectedEmp(null)}
                  className="absolute top-5 right-5 p-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
                  title="Close panel"
                >
                  <IconX className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-4">
                  <div className="relative group shrink-0">
                    <div className="w-16 h-16 rounded-2xl bg-white text-[#5E4BE2] font-black text-xl flex items-center justify-center shadow-lg shrink-0 overflow-hidden relative border-2 border-white/60">
                      <span className="select-none">
                        {selectedEmp.firstName?.[0]}
                        {selectedEmp.lastName?.[0]}
                      </span>
                      {getEmployeePhotoUrl(selectedEmp.profilePhoto) && (
                        <img
                          src={getEmployeePhotoUrl(selectedEmp.profilePhoto)!}
                          alt={`${selectedEmp.firstName} ${selectedEmp.lastName}`}
                          className="absolute inset-0 w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      )}
                    </div>
                    {canAdd && (
                      <label
                        className="absolute -bottom-1 -right-1 p-1.5 rounded-xl bg-white text-[#5E4BE2] shadow-md hover:bg-slate-50 cursor-pointer transition-transform hover:scale-110 flex items-center justify-center"
                        title="Change employee image"
                      >
                        <IconCamera className="w-3.5 h-3.5" />
                        <input
                          type="file"
                          accept="image/*"
                          disabled={isUploadingPhoto}
                          className="hidden"
                          onChange={(e) => handlePhotoUpload(selectedEmp.id, e.target.files?.[0])}
                        />
                      </label>
                    )}
                  </div>
                  <div className="min-w-0 pr-8">
                    <h3 className="text-lg font-black tracking-tight leading-tight truncate">
                      {selectedEmp.firstName} {selectedEmp.lastName}
                    </h3>
                    <p className="text-xs text-white/80 font-medium mt-0.5 truncate">
                      {selectedEmp.jobTitle || 'Team Member'}
                    </p>
                    <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                      {getRoleBadge(selectedEmp.role)}
                      {getWorkModeBadge(selectedEmp.workMode)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Drawer Scrollable Content */}
              <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Employee ID</label>
                    <div className="flex items-center gap-1.5 font-bold text-slate-800 mt-1">
                      <IconId className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span className="font-mono">{selectedEmp.employeeNumber || '—'}</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Work Type</label>
                    <div className="flex items-center gap-1.5 font-bold text-slate-800 mt-1">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${selectedEmp.employmentType === 'CONTRACT'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200/80'
                          : 'bg-indigo-50 text-indigo-700 border border-indigo-200/80'
                        }`}>
                        {selectedEmp.employmentType === 'CONTRACT' ? 'Contract' : 'Permanent'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Work Email</label>
                    <div className="flex items-center gap-1.5 font-bold text-slate-800 mt-1">
                      <IconMail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{selectedEmp.email}</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Personal Email</label>
                    <div className="flex items-center gap-1.5 font-bold text-slate-800 mt-1">
                      <IconMail className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                      <span className="truncate">{selectedEmp.personalEmail || '—'}</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Contact Phone</label>
                    <div className="flex items-center gap-1.5 font-bold text-slate-800 mt-1">
                      <IconPhone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{selectedEmp.phone || 'Not provided'}</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Date of Birth</label>
                    <div className="flex items-center gap-1.5 font-bold text-slate-800 mt-1">
                      <IconCalendar className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span>
                        {selectedEmp.dateOfBirth
                          ? new Date(selectedEmp.dateOfBirth).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                          : '—'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Department</label>
                    <div className="flex items-center gap-1.5 font-bold text-slate-800 mt-1">
                      <IconBuilding className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{selectedEmp.department?.name || 'Unassigned'}</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Reports To</label>
                    <div className="font-bold text-slate-800 mt-1">
                      {selectedEmp.manager ? `${selectedEmp.manager.firstName} ${selectedEmp.manager.lastName}` : 'Direct Report to CEO'}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <label className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Joined On</label>
                    <div className="flex items-center gap-1.5 font-bold text-slate-800 mt-1">
                      <IconCalendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>
                        {selectedEmp.joiningDate
                          ? new Date(selectedEmp.joiningDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                          : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Emergency Contact */}
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2 mb-2">
                    <IconHeartHandshake className="w-4 h-4 text-rose-500" />
                    <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      Emergency Contact
                    </h4>
                  </div>
                  <div className="grid grid-cols-3 gap-3 bg-rose-50/50 p-3.5 rounded-2xl border border-rose-100">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Name</span>
                      <p className="font-bold text-slate-900 mt-0.5 text-xs truncate">
                        {(selectedEmp.emergencyContact as any)?.name || '—'}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Relationship</span>
                      <p className="font-bold text-slate-900 mt-0.5 text-xs truncate">
                        {(selectedEmp.emergencyContact as any)?.relationship || '—'}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Contact</span>
                      <p className="font-mono font-bold text-slate-900 mt-0.5 text-xs truncate">
                        {(selectedEmp.emergencyContact as any)?.phone || '—'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Compensation (if admin/hr) */}
                {(user?.role === 'COMPANY_ADMIN' || user?.role === 'HR') && selectedEmp.monthlySalary !== undefined && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Compensation & Banking
                    </h4>
                    <div className="grid grid-cols-2 gap-4 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/70">
                      <div>
                        <span className="text-[11px] text-slate-400 font-medium">Monthly CTC</span>
                        <p className="font-black text-slate-900 mt-0.5 text-sm">
                          {selectedEmp.currency || 'INR'} {Number(selectedEmp.monthlySalary).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400 font-medium">Bank Account</span>
                        <p className="font-mono text-xs text-slate-800 mt-0.5 font-bold">
                          {selectedEmp.bankDetails?.accountNumber || '—'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Drawer Footer Actions */}
              <div className="bg-slate-50/80 p-4 px-6 border-t border-slate-100 flex items-center justify-between shrink-0">
                {canAdd ? (
                  <button
                    onClick={() => {
                      const emp = selectedEmp;
                      setSelectedEmp(null);
                      handleOpenEdit(emp);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-[#5E4BE2] hover:bg-indigo-50 border border-indigo-200/60 transition-colors cursor-pointer"
                  >
                    <IconPencil className="w-3.5 h-3.5" />
                    <span>Edit Profile</span>
                  </button>
                ) : <div />}

                <button
                  onClick={() => setSelectedEmp(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ===================== OFFBOARD CONFIRMATION MODAL ===================== */}
      {offboardTarget && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100 p-6 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
              <IconUserMinus className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-black text-slate-900 tracking-tight">
              Deactivate Employee
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Are you sure you want to deactivate <strong className="text-slate-800">{offboardTarget.firstName} {offboardTarget.lastName}</strong>?
            </p>

            <div className="mt-3 p-3 rounded-xl bg-amber-50/80 border border-amber-200/80 text-[11px] text-amber-800 font-medium">
              This action will deactivate their system access and shift their records to the <strong>Deactivated Employees</strong> tab.
            </div>

            <div className="flex items-center justify-end gap-2.5 mt-6">
              <button
                type="button"
                onClick={() => setOffboardTarget(null)}
                disabled={isOffboarding}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmOffboard}
                disabled={isOffboarding}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-sm shadow-rose-600/25 transition-all cursor-pointer disabled:opacity-50"
              >
                {isOffboarding ? 'Deactivating...' : 'Confirm Deactivate'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ===================== EDIT EMPLOYEE RIGHT-SIDE DRAWER ===================== */}
      {editTarget && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] overflow-hidden bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
          onClick={() => setEditTarget(null)}
        >
          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div
              className="w-screen max-w-lg bg-white shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-300 border-l border-slate-100"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drawer Header */}
              <div className="relative bg-gradient-to-r from-[#5E4BE2] to-[#4B39C3] p-6 text-white shrink-0">
                <button
                  type="button"
                  onClick={() => setEditTarget(null)}
                  className="absolute top-5 right-5 p-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
                  title="Close panel"
                >
                  <IconX className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-3.5 pr-8">
                  <div className="relative shrink-0">
                    <div className="w-13 h-13 rounded-2xl bg-white text-[#5E4BE2] font-black text-lg flex items-center justify-center shadow-md shrink-0 overflow-hidden relative border border-white/60">
                      <span className="select-none">
                        {editTarget.firstName?.[0]}
                        {editTarget.lastName?.[0]}
                      </span>
                      {getEmployeePhotoUrl(editTarget.profilePhoto) && (
                        <img
                          src={getEmployeePhotoUrl(editTarget.profilePhoto)!}
                          alt={`${editTarget.firstName} ${editTarget.lastName}`}
                          className="absolute inset-0 w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      )}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-black tracking-tight leading-tight truncate">
                      Edit Employee Details
                    </h3>
                    <p className="text-xs text-white/80 font-medium mt-0.5 truncate">
                      {editTarget.firstName} {editTarget.lastName} · {editTarget.email}
                    </p>
                  </div>
                </div>
              </div>

              {/* Form Body & Footer */}
              <form onSubmit={handleSaveEdit} className="flex flex-col flex-1 overflow-hidden">
                <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
                  {editError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700">
                      {editError}
                    </div>
                  )}

                  {/* Employee Image Upload / Change Section */}
                  <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-white text-[#5E4BE2] font-black text-sm flex items-center justify-center shadow-xs overflow-hidden relative border border-slate-200 shrink-0">
                        <span className="select-none">
                          {editTarget.firstName?.[0]}
                          {editTarget.lastName?.[0]}
                        </span>
                        {getEmployeePhotoUrl(editTarget.profilePhoto) && (
                          <img
                            src={getEmployeePhotoUrl(editTarget.profilePhoto)!}
                            alt={editTarget.firstName}
                            className="absolute inset-0 w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-800">Employee Image</div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {editTarget.profilePhoto ? 'Custom image uploaded' : 'Default initials avatar'}
                        </div>
                      </div>
                    </div>
                    <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-[#5E4BE2] bg-white border border-indigo-200/80 hover:bg-indigo-50/60 shadow-2xs transition-colors cursor-pointer shrink-0">
                      <IconCamera className="w-3.5 h-3.5" />
                      <span>{isUploadingPhoto ? 'Uploading...' : 'Change Image'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={isUploadingPhoto}
                        className="hidden"
                        onChange={(e) => handlePhotoUpload(editTarget.id, e.target.files?.[0])}
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* First Name (Editable) */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">First Name *</label>
                      <input
                        type="text"
                        required
                        value={editForm.firstName}
                        onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                        className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#5E4BE2]/20 focus:border-[#5E4BE2]"
                      />
                    </div>

                    {/* Last Name (Editable) */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Last Name</label>
                      <input
                        type="text"
                        value={editForm.lastName}
                        onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                        className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#5E4BE2]/20 focus:border-[#5E4BE2]"
                      />
                    </div>

                    {/* Employee ID (Read-only) */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-bold text-slate-700">Employee ID</label>
                        <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">Read-only</span>
                      </div>
                      <input
                        type="text"
                        disabled
                        readOnly
                        value={editForm.employeeNumber || '—'}
                        className="w-full px-3 py-2 text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200 rounded-xl cursor-not-allowed select-none"
                      />
                    </div>

                    {/* Date of Birth (Editable) */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Date of Birth *</label>
                      <input
                        type="date"
                        required
                        value={editForm.dateOfBirth}
                        onChange={(e) => setEditForm({ ...editForm, dateOfBirth: e.target.value })}
                        className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#5E4BE2]/20 focus:border-[#5E4BE2]"
                      />
                    </div>

                    {/* Personal Email Address (Editable) */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Personal Email Address *</label>
                      <input
                        type="email"
                        required
                        value={editForm.personalEmail}
                        onChange={(e) => setEditForm({ ...editForm, personalEmail: e.target.value })}
                        placeholder="personal@gmail.com"
                        className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#5E4BE2]/20 focus:border-[#5E4BE2]"
                      />
                    </div>

                    {/* Phone Number (Editable) */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Phone Number</label>
                      <input
                        type="text"
                        value={editForm.phone}
                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                        className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#5E4BE2]/20 focus:border-[#5E4BE2]"
                      />
                    </div>

                    {/* Designation / Job Title (Read-only) */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-bold text-slate-700">Designation / Job Title</label>
                        <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">Read-only</span>
                      </div>
                      <input
                        type="text"
                        disabled
                        readOnly
                        value={editForm.jobTitle || '—'}
                        className="w-full px-3 py-2 text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200 rounded-xl cursor-not-allowed select-none"
                      />
                    </div>

                    {/* Department (Read-only) */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-bold text-slate-700">Department</label>
                        <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">Read-only</span>
                      </div>
                      <input
                        type="text"
                        disabled
                        readOnly
                        value={departments.find((d) => String(d.id) === String(editForm.departmentId))?.name || editTarget?.department?.name || 'Unassigned'}
                        className="w-full px-3 py-2 text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200 rounded-xl cursor-not-allowed select-none"
                      />
                    </div>

                    {/* System Role (Editable) */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">System Role</label>
                      <select
                        value={isHr ? 'EMPLOYEE' : (editForm.role === 'COMPANY_ADMIN' ? 'EMPLOYEE' : editForm.role)}
                        onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                        disabled={isHr}
                        className={`w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#5E4BE2]/20 focus:border-[#5E4BE2] ${isHr ? 'cursor-not-allowed opacity-80' : ''}`}
                      >
                        <option value="EMPLOYEE">Staff Employee</option>
                        {isCompanyAdmin && <option value="HR">HR</option>}
                      </select>
                    </div>

                    {/* Work Mode (Editable) */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Work Mode</label>
                      <select
                        value={editForm.workMode}
                        onChange={(e) => setEditForm({ ...editForm, workMode: e.target.value })}
                        className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#5E4BE2]/20 focus:border-[#5E4BE2]"
                      >
                        <option value="WFO">Office (WFO)</option>
                        <option value="WFH">Home (WFH)</option>
                      </select>
                    </div>

                    {/* Work Type (Editable) */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Work Type *</label>
                      <select
                        value={editForm.employmentType}
                        onChange={(e) => setEditForm({ ...editForm, employmentType: e.target.value })}
                        className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#5E4BE2]/20 focus:border-[#5E4BE2]"
                      >
                        <option value="PERMANENT">Permanent</option>
                        <option value="CONTRACT">Contract</option>
                      </select>
                    </div>

                    {/* Monthly Salary (Read-only) */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-bold text-slate-700">Monthly Salary (INR)</label>
                        <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">Read-only</span>
                      </div>
                      <input
                        type="text"
                        disabled
                        readOnly
                        value={editForm.monthlySalary ? Number(editForm.monthlySalary).toLocaleString('en-IN') : '0'}
                        className="w-full px-3 py-2 text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200 rounded-xl cursor-not-allowed select-none"
                      />
                    </div>

                    {/* Joining Date (Read-only) */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-bold text-slate-700">Joining Date</label>
                        <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">Read-only</span>
                      </div>
                      <input
                        type="date"
                        disabled
                        readOnly
                        value={editForm.joiningDate}
                        className="w-full px-3 py-2 text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200 rounded-xl cursor-not-allowed select-none"
                      />
                    </div>

                    {/* Shift Timing (Editable) */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Shift Timing</label>
                      <select
                        value={editForm.shiftTiming}
                        onChange={(e) => setEditForm({ ...editForm, shiftTiming: e.target.value })}
                        className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#5E4BE2]/20 focus:border-[#5E4BE2]"
                      >
                        <option value="General Shift (09:30 AM - 06:30 PM)">General Shift (09:30 AM - 06:30 PM)</option>
                        <option value="Morning Shift (06:00 AM - 02:30 PM)">Morning Shift (06:00 AM - 02:30 PM)</option>
                        <option value="Evening Shift (02:00 PM - 10:30 PM)">Evening Shift (02:00 PM - 10:30 PM)</option>
                        <option value="Night Shift (10:00 PM - 06:30 AM)">Night Shift (10:00 PM - 06:30 AM)</option>
                        <option value="Flexible Hours (09:00 AM - 06:00 PM)">Flexible Hours (09:00 AM - 06:00 PM)</option>
                      </select>
                    </div>

                    {/* Working Address (Editable) */}
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Working Address</label>
                      <input
                        type="text"
                        value={editForm.workingAddress}
                        onChange={(e) => setEditForm({ ...editForm, workingAddress: e.target.value })}
                        placeholder="Office or branch location"
                        className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#5E4BE2]/20 focus:border-[#5E4BE2]"
                      />
                    </div>

                    {/* Residential Address (Read-only) */}
                    <div className="sm:col-span-2">
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-bold text-slate-700">Residential Address</label>
                        <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">Read-only</span>
                      </div>
                      <textarea
                        rows={2}
                        disabled
                        readOnly
                        value={editForm.address || '—'}
                        className="w-full px-3 py-2 text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200 rounded-xl cursor-not-allowed select-none resize-none"
                      />
                    </div>
                  </div>

                  {/* Emergency Contact Group in Edit Drawer */}
                  <div className="mt-2 pt-3 border-t border-slate-200/80 space-y-3">
                    <div className="flex items-center gap-2">
                      <IconHeartHandshake className="w-4 h-4 text-rose-500" />
                      <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                        Emergency Contact
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Name *</label>
                        <input
                          type="text"
                          required
                          value={editForm.emergencyContactName}
                          onChange={(e) => setEditForm({ ...editForm, emergencyContactName: e.target.value })}
                          placeholder="Contact person"
                          className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#5E4BE2]/20 focus:border-[#5E4BE2]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Relationship *</label>
                        <input
                          type="text"
                          required
                          value={editForm.emergencyContactRelationship}
                          onChange={(e) => setEditForm({ ...editForm, emergencyContactRelationship: e.target.value })}
                          placeholder="Spouse / Parent"
                          className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#5E4BE2]/20 focus:border-[#5E4BE2]"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[11px] font-bold text-slate-700">Contact *</label>
                          <span className="text-[10px] text-slate-400 font-mono font-medium">{editForm.emergencyContactPhone.length}/10</span>
                        </div>
                        <input
                          type="tel"
                          required
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={10}
                          value={editForm.emergencyContactPhone}
                          onChange={(e) => setEditForm({ ...editForm, emergencyContactPhone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                          onKeyDown={(e) => {
                            if (['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key) || ((e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase()))) return;
                            if (!/^[0-9]$/.test(e.key)) e.preventDefault();
                          }}
                          placeholder="9876543210"
                          className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#5E4BE2]/20 focus:border-[#5E4BE2]"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Drawer Footer Actions */}
                <div className="bg-slate-50/80 p-4 px-6 border-t border-slate-100 flex items-center justify-end gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setEditTarget(null)}
                    disabled={isSavingEdit}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingEdit}
                    className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#5E4BE2] to-[#4B39C3] hover:from-[#5340D4] hover:to-[#4130B4] shadow-sm shadow-indigo-600/25 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSavingEdit ? 'Saving Changes...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default EmployeesPage;
