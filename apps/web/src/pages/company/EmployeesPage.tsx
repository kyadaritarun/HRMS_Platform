import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
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
  IconBuildingSkyscraper,
  IconFilter,
  IconUserPlus,
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
  joiningDate?: string;
  monthlySalary?: number;
  currency?: string;
  bankDetails?: any;
  department?: { id: number; name: string };
  manager?: { id: number; firstName: string; lastName: string };
  createdAt: string;
}

interface Department {
  id: number;
  name: string;
}

export const EmployeesPage: React.FC = () => {
  const { user, hasHrPermission } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>(searchParams.get('departmentId') || '');
  const [selectedWorkMode, setSelectedWorkMode] = useState<string>('ALL');
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);

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
      const params: any = {};
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
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchEmployees();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, selectedDept]);

  // Filtered employees by work mode
  const filteredEmployees = useMemo(() => {
    if (selectedWorkMode === 'ALL') return employees;
    if (selectedWorkMode === 'WFH') return employees.filter((e) => e.workMode === 'WFH');
    if (selectedWorkMode === 'HYBRID') return employees.filter((e) => e.workMode === 'HYBRID');
    if (selectedWorkMode === 'ON_SITE') {
      return employees.filter((e) => e.workMode === 'ON_SITE' || !e.workMode || e.workMode === 'ONSITE');
    }
    return employees;
  }, [employees, selectedWorkMode]);

  // Dynamic KPI Stats derived strictly from real employee records
  const kpiStats = useMemo(() => {
    const total = employees.length;
    const now = new Date();
    const newJoiners = employees.filter((e) => {
      const d = new Date(e.joiningDate || e.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;

    const remoteCount = employees.filter((e) => e.workMode === 'WFH').length;
    const hybridCount = employees.filter((e) => e.workMode === 'HYBRID').length;
    const onSiteCount = employees.filter((e) => e.workMode === 'ON_SITE' || !e.workMode || e.workMode === 'ONSITE').length;

    return {
      total,
      newJoiners,
      departmentsCount: departments.length,
      remoteCount,
      hybridCount,
      onSiteCount,
    };
  }, [employees, departments]);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'COMPANY_ADMIN':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200/70 shadow-2xs">
            Company Admin
          </span>
        );
      case 'HR':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/70 shadow-2xs">
            HR Manager
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200/70 shadow-2xs">
            Employee
          </span>
        );
    }
  };

  const getWorkModeBadge = (mode: string) => {
    switch (mode) {
      case 'WFH':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/70 shadow-2xs">
            Remote
          </span>
        );
      case 'HYBRID':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200/70 shadow-2xs">
            Hybrid
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/70 shadow-2xs">
            On-site
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* ===================== TOP HEADER BAR ===================== */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Employees Directory
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
            <span>Add Employee</span>
          </Link>
        )}
      </div>

      {/* ===================== ROW 1: 4 KPI STAT CARDS ===================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Workforce */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <span className="text-xs font-bold text-slate-500">Total Workforce</span>
            <div className="text-2xl font-black text-slate-900 mt-1 leading-none tracking-tight">
              {kpiStats.total.toLocaleString()}
            </div>
            <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 mt-2">
              <span>↑</span>
              <span>{kpiStats.newJoiners} joined this month</span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5E4BE2]">
            <IconUsers className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Departments */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <span className="text-xs font-bold text-slate-500">Active Departments</span>
            <div className="text-2xl font-black text-slate-900 mt-1 leading-none tracking-tight">
              {kpiStats.departmentsCount}
            </div>
            <div className="text-[11px] font-bold text-purple-600 mt-2">
              Assigned business units
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
            <IconBriefcase className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Hybrid & Remote */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <span className="text-xs font-bold text-slate-500">Flexible Work</span>
            <div className="text-2xl font-black text-slate-900 mt-1 leading-none tracking-tight">
              {(kpiStats.remoteCount + kpiStats.hybridCount).toLocaleString()}
            </div>
            <div className="text-[11px] font-bold text-amber-600 mt-2">
              {kpiStats.remoteCount} Remote · {kpiStats.hybridCount} Hybrid
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
            <IconBuilding className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: On-Site Personnel */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <span className="text-xs font-bold text-slate-500">On-Site Office</span>
            <div className="text-2xl font-black text-slate-900 mt-1 leading-none tracking-tight">
              {kpiStats.onSiteCount.toLocaleString()}
            </div>
            <div className="text-[11px] font-bold text-blue-600 mt-2">
              {kpiStats.total > 0 ? Math.round((kpiStats.onSiteCount / kpiStats.total) * 100) : 0}% of workforce
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <IconBuildingSkyscraper className="w-5 h-5" />
          </div>
        </div>
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
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 text-xs font-medium bg-slate-50/70 border border-slate-200/80 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#5E4BE2]/20 focus:border-[#5E4BE2] transition-all placeholder:text-slate-400 text-slate-800"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
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
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          {/* Work Mode Toggle Pills */}
          <div className="flex items-center bg-slate-50/80 border border-slate-200/70 p-1 rounded-xl">
            {(['ALL', 'ON_SITE', 'HYBRID', 'WFH'] as const).map((mode) => {
              const label =
                mode === 'ALL'
                  ? 'All'
                  : mode === 'ON_SITE'
                  ? 'On-site'
                  : mode === 'HYBRID'
                  ? 'Hybrid'
                  : 'Remote';
              const isActive = selectedWorkMode === mode;
              return (
                <button
                  key={mode}
                  onClick={() => setSelectedWorkMode(mode)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isActive
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
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="px-6 py-3.5">Employee</th>
                <th className="px-6 py-3.5">Designation</th>
                <th className="px-6 py-3.5">Department</th>
                <th className="px-6 py-3.5">Role</th>
                <th className="px-6 py-3.5">Work Mode</th>
                <th className="px-6 py-3.5">Manager</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/80">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-200" />
                        <div className="space-y-1.5">
                          <div className="w-28 h-3.5 bg-slate-200 rounded-sm" />
                          <div className="w-36 h-3 bg-slate-100 rounded-sm" />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4"><div className="w-24 h-3 bg-slate-200 rounded-sm" /></td>
                    <td className="px-6 py-4"><div className="w-20 h-3 bg-slate-200 rounded-sm" /></td>
                    <td className="px-6 py-4"><div className="w-16 h-4 bg-slate-200 rounded-full" /></td>
                    <td className="px-6 py-4"><div className="w-14 h-4 bg-slate-200 rounded-full" /></td>
                    <td className="px-6 py-4"><div className="w-20 h-3 bg-slate-200 rounded-sm" /></td>
                    <td className="px-6 py-4 text-right"><div className="w-8 h-8 bg-slate-200 rounded-lg ml-auto" /></td>
                  </tr>
                ))
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-14 text-center">
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
                filteredEmployees.map((emp) => {
                  const initials = `${emp.firstName?.[0] || ''}${emp.lastName?.[0] || ''}`.toUpperCase();
                  return (
                    <tr
                      key={emp.id}
                      className="hover:bg-indigo-50/20 transition-colors group"
                    >
                      {/* Employee Name & Email */}
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#5E4BE2] to-indigo-500 text-white flex items-center justify-center font-bold text-xs shadow-2xs overflow-hidden shrink-0">
                            {emp.profilePhoto ? (
                              <img
                                src={
                                  emp.profilePhoto.includes('.amazonaws.com/image/')
                                    ? `/image/${emp.profilePhoto.split('.amazonaws.com/image/')[1]}`
                                    : emp.profilePhoto.includes('.amazonaws.com/uploads/')
                                    ? `/uploads/${emp.profilePhoto.split('.amazonaws.com/uploads/')[1]}`
                                    : emp.profilePhoto
                                }
                                alt={emp.firstName}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              initials || 'U'
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

                      {/* Designation */}
                      <td className="px-6 py-3.5 font-semibold text-xs text-slate-800">
                        {emp.jobTitle || 'Team Member'}
                      </td>

                      {/* Department */}
                      <td className="px-6 py-3.5">
                        {emp.department ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] bg-indigo-50/70 text-[#5E4BE2] font-semibold border border-indigo-100/50">
                            <IconBuilding className="w-3 h-3 text-[#5E4BE2]/80" />
                            {emp.department.name}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs italic">Unassigned</span>
                        )}
                      </td>

                      {/* Role Badge */}
                      <td className="px-6 py-3.5">{getRoleBadge(emp.role)}</td>

                      {/* Work Mode Badge */}
                      <td className="px-6 py-3.5">{getWorkModeBadge(emp.workMode)}</td>

                      {/* Manager */}
                      <td className="px-6 py-3.5 text-xs font-semibold text-slate-600">
                        {emp.manager ? `${emp.manager.firstName} ${emp.manager.lastName}` : '—'}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-3.5 text-right">
                        <button
                          onClick={() => setSelectedEmp(emp)}
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-[#5E4BE2] hover:bg-[#F0EEFF] transition-all ml-auto cursor-pointer"
                          title="View Profile Details"
                        >
                          <IconEye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===================== EMPLOYEE DETAIL MODAL ===================== */}
      {selectedEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="relative bg-gradient-to-r from-[#5E4BE2] to-[#4B39C3] p-6 text-white">
              <button
                onClick={() => setSelectedEmp(null)}
                className="absolute top-4 right-4 p-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
              >
                <IconX className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white text-[#5E4BE2] font-black text-xl flex items-center justify-center shadow-md shrink-0">
                  {selectedEmp.firstName?.[0]}
                  {selectedEmp.lastName?.[0]}
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-black tracking-tight leading-tight truncate">
                    {selectedEmp.firstName} {selectedEmp.lastName}
                  </h3>
                  <p className="text-xs text-white/80 font-medium mt-0.5">
                    {selectedEmp.jobTitle || 'Team Member'}
                  </p>
                  <div className="mt-2.5 flex items-center gap-2">
                    {getRoleBadge(selectedEmp.role)}
                    {getWorkModeBadge(selectedEmp.workMode)}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Work Email</label>
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 mt-1">
                    <IconMail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{selectedEmp.email}</span>
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
                <div>
                  <label className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Employment Type</label>
                  <div className="font-bold text-slate-800 mt-1 capitalize">
                    {selectedEmp.employmentType?.replace('_', ' ').toLowerCase() || 'Full time'}
                  </div>
                </div>
                <div>
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

            {/* Modal Footer */}
            <div className="bg-slate-50/80 p-4 px-6 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedEmp(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeesPage;
