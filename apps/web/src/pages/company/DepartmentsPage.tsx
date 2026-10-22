import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import TablePagination from '../../components/common/TablePagination';
import {
  IconBuilding,
  IconPlus,
  IconPower,
  IconCheck,
  IconUsers,
  IconX,
  IconAlertCircle,
  IconSearch,
  IconFilter,
  IconChevronDown,
  IconSettings,
  IconTrendingUp,
  IconPencil,
  IconBriefcase,
  IconEye,
  IconExternalLink,
  IconMail,
  IconArrowRight,
  IconPalette,
} from '@tabler/icons-react';

interface DepartmentUser {
  id: number;
  firstName: string;
  lastName: string;
  email?: string;
  jobTitle?: string;
  role?: string;
  profilePhoto?: string | null;
  workMode?: string;
}

interface Department {
  id: number;
  name: string;
  isActive?: boolean;
  parentId?: number | null;
  parent?: { id: number; name: string } | null;
  users?: DepartmentUser[];
  _count?: { users: number };
}

export const DepartmentsPage: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterType]);

  // Members Modal state
  const [viewingMembersDept, setViewingMembersDept] = useState<Department | null>(null);
  const [memberSearch, setMemberSearch] = useState('');

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<string>('');
  const [isActive, setIsActive] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDepartments = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/company/departments');
      setDepartments(res.data?.departments || []);
    } catch (err) {
      console.error('Failed to load departments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleOpenAddModal = () => {
    setEditingDept(null);
    setName('');
    setParentId('');
    setIsActive(true);
    setError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (dept: Department) => {
    setEditingDept(dept);
    setName(dept.name);
    setParentId(dept.parentId ? String(dept.parentId) : '');
    setIsActive(dept.isActive !== false);
    setError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);
    setIsSubmitting(true);
    try {
      if (editingDept) {
        await api.patch(`/company/departments/${editingDept.id}`, {
          name: name.trim(),
          parentId: parentId ? Number(parentId) : null,
          isActive,
        });
      } else {
        await api.post('/company/departments', {
          name: name.trim(),
          parentId: parentId ? Number(parentId) : null,
          isActive,
        });
      }
      setIsModalOpen(false);
      setName('');
      setParentId('');
      setIsActive(true);
      fetchDepartments();
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to save department');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (dept: Department) => {
    const isCurrentlyActive = dept.isActive !== false;
    const actionWord = isCurrentlyActive ? 'deactivate' : 'activate';
    const confirmMessage = isCurrentlyActive
      ? `Are you sure you want to deactivate "${dept.name}"? Members will remain assigned, but this department will be marked as inactive.`
      : `Are you sure you want to activate "${dept.name}"?`;

    if (!window.confirm(confirmMessage)) return;

    try {
      await api.patch(`/company/departments/${dept.id}`, {
        isActive: !isCurrentlyActive,
      });
      setDepartments((prev) =>
        prev.map((d) => (d.id === dept.id ? { ...d, isActive: !isCurrentlyActive } : d))
      );
    } catch (err: any) {
      alert(err.response?.data?.error || err.response?.data?.message || `Failed to ${actionWord} department`);
      fetchDepartments();
    }
  };

  const getDepartmentMeta = (deptName: string) => {
    const lower = deptName.toLowerCase();
    if (lower.includes('eng') || lower.includes('tech') || lower.includes('dev')) {
      return {
        icon: IconSettings,
        iconBg: 'bg-blue-50 text-blue-600',
        description: 'Product development and technical operations team.',
      };
    }
    if (lower.includes('prod') || lower.includes('design') || lower.includes('ux') || lower.includes('ui')) {
      return {
        icon: IconPalette,
        iconBg: 'bg-purple-50 text-purple-600',
        description: 'Product strategy, user experience research, and interface design.',
      };
    }
    if (lower.includes('human') || lower.includes('hr') || lower.includes('people')) {
      return {
        icon: IconUsers,
        iconBg: 'bg-orange-50 text-orange-600',
        description: 'People operations, recruitment, and employee support.',
      };
    }
    if (lower.includes('sale') || lower.includes('market') || lower.includes('growth')) {
      return {
        icon: IconBriefcase,
        iconBg: 'bg-rose-50 text-rose-600',
        description: 'Revenue generation, brand growth, and customer acquisition.',
      };
    }
    if (lower.includes('finance') || lower.includes('operat') || lower.includes('admin')) {
      return {
        icon: IconBuilding,
        iconBg: 'bg-emerald-50 text-emerald-600',
        description: 'Financial management, compliance, and corporate operations.',
      };
    }
    if (lower.includes('exec') || lower.includes('lead') || lower.includes('manage')) {
      return {
        icon: IconTrendingUp,
        iconBg: 'bg-indigo-50 text-indigo-600',
        description: 'Corporate leadership, governance, and strategic management.',
      };
    }
    return {
      icon: IconBuilding,
      iconBg: 'bg-indigo-50 text-indigo-600',
      description: 'Functional organizational unit and departmental administration.',
    };
  };

  const avatarColorList = [
    'bg-blue-600 text-white',
    'bg-teal-600 text-white',
    'bg-purple-600 text-white',
    'bg-amber-600 text-white',
    'bg-rose-600 text-white',
  ];

  // Filtered departments for table
  const filteredDepartments = departments.filter((d) => {
    const q = search.toLowerCase().trim();
    const meta = getDepartmentMeta(d.name);
    const matchesSearch = !q || d.name.toLowerCase().includes(q) || meta.description.toLowerCase().includes(q);

    if (filterType === 'ACTIVE') {
      return matchesSearch && d.isActive !== false;
    }
    if (filterType === 'INACTIVE') {
      return matchesSearch && d.isActive === false;
    }
    if (filterType === 'WITH_MEMBERS') {
      return matchesSearch && ((d._count?.users || 0) > 0);
    }
    if (filterType === 'TOP_LEVEL') {
      return matchesSearch && !d.parentId;
    }
    return matchesSearch;
  });

  const paginatedDepartments = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredDepartments.slice(start, start + pageSize);
  }, [filteredDepartments, currentPage, pageSize]);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner (Hero Banner) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5E4BE2] shrink-0">
              <IconBuilding className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Departments
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Organize functional business units, configure team reporting, and manage departmental headcount.
          </p>
        </div>

        {/* Primary CTA: Add Department */}
        <button
          onClick={handleOpenAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#5E4BE2] hover:bg-[#4d3cc9] text-white text-xs font-bold shadow-xs hover:shadow-md transition-all cursor-pointer shrink-0"
        >
          <IconPlus className="w-4 h-4" />
          <span>Create</span>
        </button>
      </div>

      {/* Bottom Section: All Departments List & Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <IconUsers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">All Departments</h2>
              <p className="text-xs text-slate-400 mt-0.5">View and manage all departments in your organization.</p>
            </div>
          </div>

          {/* Right Controls: Search, Filter, & Add */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <IconSearch className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search departments..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500 text-slate-800 placeholder-slate-400"
              />
            </div>

            {/* Filter Dropdown */}
            <div className="relative">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="appearance-none pl-8 pr-7 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500 text-slate-700 cursor-pointer"
              >
                <option value="ALL">All Departments</option>
                <option value="ACTIVE">Active Only</option>
                <option value="INACTIVE">Inactive Only</option>
                <option value="WITH_MEMBERS">With Members</option>
                <option value="TOP_LEVEL">Top-level Units</option>
              </select>
              <IconFilter className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <IconChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

           
          </div>
        </div>

        {/* Table Structure */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#e5e7eb] text-xs font-bold text-slate-900 border-b border-slate-300">
              <tr>
                <th className="px-5 py-3.5">Department Name</th>
                <th className="px-5 py-3.5">Description</th>
                <th className="px-5 py-3.5">Members</th>
                <th className="px-5 py-3.5">Department Code</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDepartments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-2">
                      <IconBuilding className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-800">No departments found</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      {search ? 'Try modifying your search filter.' : 'Click "Add Department" to create your first department.'}
                    </p>
                    {!search && (
                      <button
                        onClick={handleOpenAddModal}
                        className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#5E4BE2] hover:bg-[#4d3cc9] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                      >
                        <IconPlus className="w-4 h-4" />
                        <span>Add Department</span>
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedDepartments.map((dept) => {
                  const meta = getDepartmentMeta(dept.name);
                  const Icon = meta.icon;
                  const memberCount = dept._count?.users || dept.users?.length || 0;
                  const users = dept.users || [];
                  const isDeactivated = dept.isActive === false;

                  return (
                    <tr
                      key={dept.id}
                      className={`hover:bg-slate-50/60 transition-colors ${
                        isDeactivated ? 'bg-slate-50/40' : ''
                      }`}
                    >
                      <td className="px-4 py-3.5 font-bold text-slate-900 flex items-center gap-2.5">
                        <div
                          className={`w-7 h-7 rounded-lg ${
                            isDeactivated ? 'bg-slate-100 text-slate-400' : meta.iconBg
                          } flex items-center justify-center shrink-0`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className={isDeactivated ? 'text-slate-600' : 'text-slate-900'}>
                              {dept.name}
                            </span>
                            {isDeactivated && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 font-medium">
                                Deactivated
                              </span>
                            )}
                          </div>
                          {dept.parent && (
                            <span className="text-[10px] text-slate-400 block font-normal">
                              Parent: {dept.parent.name}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 max-w-xs truncate">
                        {meta.description}
                      </td>
                      <td className="px-4 py-3.5">
                        <button
                          type="button"
                          onClick={() => {
                            setViewingMembersDept(dept);
                            setMemberSearch('');
                          }}
                          className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer text-left focus:outline-hidden"
                          title="Click to view department members"
                        >
                          {users.length > 0 && (
                            <div className="flex -space-x-1 items-center shrink-0">
                              {users.slice(0, 3).map((u, uIdx) => (
                                <div
                                  key={u.id || uIdx}
                                  className={`w-5 h-5 min-w-[20px] min-h-[20px] rounded-full ${avatarColorList[uIdx % avatarColorList.length]} flex items-center justify-center font-bold text-[9px] ring-1 ring-white shrink-0`}
                                  title={`${u.firstName} ${u.lastName}`}
                                >
                                  {(u.firstName?.[0] || 'U').toUpperCase()}
                                </div>
                              ))}
                            </div>
                          )}
                          <span className="font-medium text-slate-700">
                            {memberCount} {memberCount === 1 ? 'Member' : 'Members'}
                          </span>
                        </button>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold text-slate-500 bg-slate-100">
                          DEPT #{dept.id}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        {!isDeactivated ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setViewingMembersDept(dept);
                              setMemberSearch('');
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                            title="View Department Members"
                          >
                            <IconUsers className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(dept)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                            title="Edit Department"
                          >
                            <IconPencil className="w-4 h-4" />
                          </button>
                          {!isDeactivated ? (
                            <button
                              onClick={() => handleToggleStatus(dept)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                              title="Deactivate Department"
                            >
                              <IconPower className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleToggleStatus(dept)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                              title="Activate Department"
                            >
                              <IconCheck className="w-4 h-4" />
                            </button>
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

        <TablePagination
          currentPage={currentPage}
          totalItems={filteredDepartments.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
          pageSizeOptions={[5, 10, 20, 50]}
          itemName="departments"
        />
      </div>

      {/* Add / Edit Department Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div
            className="bg-white rounded-3xl max-w-md w-full shadow-2xl p-6 border border-slate-100 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <IconBuilding className="w-5 h-5 text-indigo-600" />
                {editingDept ? 'Edit Department' : 'New Department'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <IconX className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <IconAlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Department Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Engineering, Executive, Human Resources"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-indigo-500 font-medium text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Parent Department (Optional)</label>
                <select
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-indigo-500 font-medium text-slate-800"
                >
                  <option value="">No Parent (Top-level Unit)</option>
                  {departments
                    .filter((d) => !editingDept || d.id !== editingDept.id)
                    .map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Department Status</label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsActive(true)}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-2 ring-emerald-500/20'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>Active</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsActive(false)}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      !isActive
                        ? 'bg-amber-50 text-amber-700 border-amber-300 ring-2 ring-amber-500/20'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    <span>Inactive</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Departments cannot be permanently deleted. Select Inactive to deactivate this department.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Saving...' : editingDept ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Department Members Modal */}
      {viewingMembersDept && (() => {
        const meta = getDepartmentMeta(viewingMembersDept.name);
        const Icon = meta.icon;
        const allMembers = viewingMembersDept.users || [];
        const totalCount = viewingMembersDept._count?.users ?? allMembers.length;
        const filteredMembers = allMembers.filter((m) => {
          const q = memberSearch.toLowerCase().trim();
          if (!q) return true;
          const fullName = `${m.firstName} ${m.lastName}`.toLowerCase();
          const email = (m.email || '').toLowerCase();
          const title = (m.jobTitle || '').toLowerCase();
          const role = (m.role || '').toLowerCase();
          return fullName.includes(q) || email.includes(q) || title.includes(q) || role.includes(q);
        });

        const getRoleBadge = (role?: string) => {
          switch (role) {
            case 'COMPANY_ADMIN':
              return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">Admin</span>;
            case 'HR':
              return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">HR</span>;
            default:
              return <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">Employee</span>;
          }
        };

        const getWorkModeBadge = (workMode?: string) => {
          if (workMode === 'REMOTE' || workMode === 'WFH') {
            return <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-emerald-50 text-emerald-700">Work From Home</span>;
          }
          return <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-blue-50 text-blue-700">Office</span>;
        };

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150"
            onClick={() => setViewingMembersDept(null)}
          >
            <div
              className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between gap-4 bg-gradient-to-r from-slate-50/80 via-indigo-50/20 to-white">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-11 h-11 rounded-2xl ${meta.iconBg} flex items-center justify-center shrink-0 shadow-2xs`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900 truncate">
                        {viewingMembersDept.name} Members
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100/80 shrink-0">
                        {totalCount} {totalCount === 1 ? 'member' : 'members'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {meta.description}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setViewingMembersDept(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                >
                  <IconX className="w-5 h-5" />
                </button>
              </div>

              {/* Sub-bar: Search & Directory Shortcut */}
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                <div className="relative flex-1">
                  <IconSearch className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search members by name, role or email..."
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500 text-slate-800 placeholder-slate-400"
                  />
                </div>
                <Link
                  to={`/company/employees?departmentId=${viewingMembersDept.id}`}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs transition-colors shrink-0 whitespace-nowrap"
                >
                  <span>Open Directory</span>
                  <IconExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Members List */}
              <div className="p-5 sm:p-6 overflow-y-auto space-y-2 divide-y divide-slate-100/80 max-h-[50vh]">
                {filteredMembers.length === 0 ? (
                  <div className="py-10 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                      <IconUsers className="w-6 h-6" />
                    </div>
                    {allMembers.length === 0 ? (
                      <>
                        <h4 className="text-sm font-bold text-slate-800">No members assigned yet</h4>
                        <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                          Employees can be assigned to {viewingMembersDept.name} from the Employee Directory.
                        </p>
                        <Link
                          to={`/company/employees?departmentId=${viewingMembersDept.id}`}
                          className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs"
                        >
                          Go to Employees Directory
                          <IconArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </>
                    ) : (
                      <>
                        <h4 className="text-sm font-bold text-slate-800">No matching members found</h4>
                        <p className="text-xs text-slate-400 mt-1">Try clearing your search query.</p>
                      </>
                    )}
                  </div>
                ) : (
                  filteredMembers.map((member, idx) => {
                    const initials = `${(member.firstName?.[0] || 'U')}${(member.lastName?.[0] || '')}`.toUpperCase();
                    const colorClass = avatarColorList[idx % avatarColorList.length];

                    return (
                      <div
                        key={member.id}
                        className="pt-2 first:pt-0 flex items-center justify-between gap-3 hover:bg-slate-50/70 p-2.5 -mx-2.5 rounded-2xl transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {member.profilePhoto ? (
                            <img
                              src={member.profilePhoto}
                              alt={`${member.firstName} ${member.lastName}`}
                              className="w-10 h-10 rounded-xl object-cover shrink-0 ring-1 ring-slate-200"
                            />
                          ) : (
                            <div className={`w-10 h-10 rounded-xl ${colorClass} flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs`}>
                              {initials}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-bold text-slate-900 truncate">
                                {member.firstName} {member.lastName}
                              </h4>
                              {getRoleBadge(member.role)}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate mt-0.5">
                              {member.jobTitle || 'Team Member'}
                            </div>
                            {member.email && (
                              <div className="flex items-center gap-1 text-[10px] text-slate-400 truncate mt-0.5">
                                <IconMail className="w-3 h-3 shrink-0" />
                                <span>{member.email}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {getWorkModeBadge(member.workMode)}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">
                  Showing {filteredMembers.length} of {totalCount} {totalCount === 1 ? 'member' : 'members'}
                </span>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default DepartmentsPage;
