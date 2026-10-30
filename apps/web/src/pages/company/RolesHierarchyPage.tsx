import React, { useState, useEffect, useMemo } from 'react';
import api from '../../api/client';
import {
  IconNetwork,
  IconShieldLock,
  IconUsers,
  IconBriefcase,
  IconCheck,
  IconX,
  IconUserCheck,
  IconSearch,
  IconBuilding,
  IconChevronRight,
  IconChevronDown,
  IconFilter,
  IconKey,
  IconSettings,
  IconPalette,
  IconTrendingUp,
  IconInfoCircle,
} from '@tabler/icons-react';

interface HierarchyUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  jobTitle: string;
  isManager: boolean;
  profilePhoto?: string | null;
  hrPermissions?: string[] | null;
  department?: { id: number; name: string } | null;
  manager?: { id: number; firstName: string; lastName: string } | null;
  managerId?: number | null;
  reports?: { id: number }[];
}

interface DepartmentItem {
  id: number;
  name: string;
  isActive?: boolean;
  parent?: { id: number; name: string } | null;
  users?: any[];
  _count?: { users: number };
}

export const RolesHierarchyPage: React.FC = () => {
  const [users, setUsers] = useState<HierarchyUser[]>([]);
  const [departmentsList, setDepartmentsList] = useState<DepartmentItem[]>([]);
  const [rolesSummary, setRolesSummary] = useState<Record<string, HierarchyUser[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ORG_TREE' | 'MATRIX' | 'PERSONNEL'>('ORG_TREE');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [expandedManagers, setExpandedManagers] = useState<Record<number, boolean>>({});
  const [expandedDepts, setExpandedDepts] = useState<Record<string, boolean>>({});

  const fetchRolesData = async () => {
    setIsLoading(true);
    try {
      const [rolesRes, deptsRes] = await Promise.all([
        api.get('/company/roles-hierarchy'),
        api.get('/company/departments').catch(() => ({ data: { departments: [] } })),
      ]);
      const fetchedUsers: HierarchyUser[] = rolesRes.data?.users || [];
      const fetchedDepts: DepartmentItem[] = deptsRes.data?.departments || [];

      setUsers(fetchedUsers);
      setRolesSummary(rolesRes.data?.rolesSummary || {});
      setDepartmentsList(fetchedDepts);

      // Default expand all managers in org tree
      const expanded: Record<number, boolean> = {};
      fetchedUsers.forEach((u) => {
        if (u.isManager) expanded[u.id] = true;
      });
      setExpandedManagers(expanded);

      // Default expand all department cards
      const deptsExpanded: Record<string, boolean> = {};
      fetchedDepts.forEach((d) => {
        deptsExpanded[d.name] = true;
      });
      fetchedUsers.forEach((u) => {
        if (u.department?.name) deptsExpanded[u.department.name] = true;
      });
      setExpandedDepts(deptsExpanded);
    } catch (err) {
      console.error('Failed to load roles and hierarchy:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRolesData();
  }, []);

  const PERMISSIONS_MATRIX = [
    {
      module: 'Company Administration',
      feature: 'Manage Company Profile & Billing',
      superAdmin: true,
      companyAdmin: true,
      hr: false,
      manager: false,
      employee: false,
    },
    {
      module: 'Company Administration',
      feature: 'View Audit Activity Logs',
      superAdmin: true,
      companyAdmin: true,
      hr: false,
      manager: false,
      employee: false,
    },
    {
      module: 'Employee Directory',
      feature: 'Provision & Edit Employee Records',
      superAdmin: true,
      companyAdmin: true,
      hr: true,
      manager: false,
      employee: false,
    },
    {
      module: 'Payroll Engine',
      feature: 'Calculate & Publish Monthly Payslips',
      superAdmin: true,
      companyAdmin: true,
      hr: true,
      manager: false,
      employee: false,
    },
    {
      module: 'Payroll Engine',
      feature: 'Manage Salary Master & Bank Info',
      superAdmin: true,
      companyAdmin: true,
      hr: true,
      manager: false,
      employee: false,
    },
    {
      module: 'Approvals & Workflows',
      feature: 'Approve Leave & Attendance Requests',
      superAdmin: true,
      companyAdmin: true,
      hr: true,
      manager: true,
      employee: false,
    },
    {
      module: 'Approvals & Workflows',
      feature: 'Approve Expense Claims & Payouts',
      superAdmin: true,
      companyAdmin: true,
      hr: true,
      manager: true,
      employee: false,
    },
    {
      module: 'KYC & Compliance',
      feature: 'Verify & Reject Employee Documents',
      superAdmin: true,
      companyAdmin: true,
      hr: true,
      manager: false,
      employee: false,
    },
    {
      module: 'Self Service',
      feature: 'Check-In, Apply Leaves & View Payslips',
      superAdmin: false,
      companyAdmin: true,
      hr: true,
      manager: true,
      employee: true,
    },
  ];

  // Distinct departments
  const departments = useMemo(() => {
    const set = new Set<string>();
    users.forEach((u) => {
      if (u.department?.name) set.add(u.department.name);
    });
    return Array.from(set).sort();
  }, [users]);

  // Filtered users for directory
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== 'ALL') {
        if (roleFilter === 'MANAGER' && !u.isManager) return false;
        if (roleFilter !== 'MANAGER' && u.role !== roleFilter) return false;
      }
      if (deptFilter !== 'ALL') {
        if (!u.department?.name || u.department.name !== deptFilter) return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const name = `${u.firstName} ${u.lastName}`.toLowerCase();
        const email = u.email.toLowerCase();
        const title = (u.jobTitle || '').toLowerCase();
        if (!name.includes(q) && !email.includes(q) && !title.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [users, roleFilter, deptFilter, search]);

  // Tree structure computed from users
  const orgTree = useMemo(() => {
    const adminUser = users.find((u) => u.role === 'COMPANY_ADMIN') || users[0];
    if (!adminUser) return null;

    // Managers who report directly to Admin or are marked as managers
    const managers = users.filter((u) => u.isManager && u.id !== adminUser.id);

    // Group direct reports by managerId
    const reportsMap = new Map<number, HierarchyUser[]>();
    users.forEach((u) => {
      if (u.managerId) {
        const list = reportsMap.get(u.managerId) || [];
        list.push(u);
        reportsMap.set(u.managerId, list);
      }
    });

    // Unassigned direct reports (reporting directly to admin or without manager)
    const directToAdmin = users.filter(
      (u) => (u.managerId === adminUser.id || !u.managerId) && u.id !== adminUser.id && !u.isManager
    );

    return {
      adminUser,
      managers: managers.map((m) => ({
        ...m,
        reports: reportsMap.get(m.id) || [],
      })),
      directToAdmin,
    };
  }, [users]);

  const getDepartmentMeta = (deptName: string) => {
    const lower = (deptName || '').toLowerCase();
    if (lower.includes('eng') || lower.includes('tech') || lower.includes('dev')) {
      return {
        icon: IconSettings,
        iconBg: 'bg-blue-50 text-blue-600',
        badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
        borderHover: 'hover:border-blue-300',
        description: 'Product development and technical operations team.',
      };
    }
    if (lower.includes('prod') || lower.includes('design') || lower.includes('ux') || lower.includes('ui')) {
      return {
        icon: IconPalette,
        iconBg: 'bg-purple-50 text-purple-600',
        badgeBg: 'bg-purple-50 text-purple-700 border-purple-200',
        borderHover: 'hover:border-purple-300',
        description: 'Product strategy, user experience research, and interface design.',
      };
    }
    if (lower.includes('human') || lower.includes('hr') || lower.includes('people')) {
      return {
        icon: IconUsers,
        iconBg: 'bg-orange-50 text-orange-600',
        badgeBg: 'bg-orange-50 text-orange-700 border-orange-200',
        borderHover: 'hover:border-orange-300',
        description: 'People operations, recruitment, and employee support.',
      };
    }
    if (lower.includes('sale') || lower.includes('market') || lower.includes('growth')) {
      return {
        icon: IconBriefcase,
        iconBg: 'bg-rose-50 text-rose-600',
        badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
        borderHover: 'hover:border-rose-300',
        description: 'Revenue generation, brand growth, and customer acquisition.',
      };
    }
    if (lower.includes('finance') || lower.includes('operat') || lower.includes('account') || lower.includes('admin')) {
      return {
        icon: IconBuilding,
        iconBg: 'bg-emerald-50 text-emerald-600',
        badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        borderHover: 'hover:border-emerald-300',
        description: 'Financial management, compliance, and corporate operations.',
      };
    }
    if (lower.includes('exec') || lower.includes('lead') || lower.includes('manage')) {
      return {
        icon: IconTrendingUp,
        iconBg: 'bg-indigo-50 text-indigo-600',
        badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        borderHover: 'hover:border-indigo-300',
        description: 'Corporate leadership, governance, and strategic management.',
      };
    }
    return {
      icon: IconBuilding,
      iconBg: 'bg-indigo-50 text-indigo-600',
      badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      borderHover: 'hover:border-indigo-300',
      description: 'Functional organizational unit and departmental administration.',
    };
  };

  // Group all active users by their departments, incorporating official company departments
  const departmentTeams = useMemo(() => {
    const deptMap = new Map<
      string,
      { id?: number; name: string; members: HierarchyUser[] }
    >();

    // First initialize from official departmentsList if available
    departmentsList.forEach((d) => {
      deptMap.set(d.name, {
        id: d.id,
        name: d.name,
        members: [],
      });
    });

    // Populate with users
    users.forEach((u) => {
      const deptName = u.department?.name || 'Unassigned';
      if (!deptMap.has(deptName)) {
        deptMap.set(deptName, {
          id: u.department?.id,
          name: deptName,
          members: [],
        });
      }
      deptMap.get(deptName)!.members.push(u);
    });

    // Convert map to array and compute lead & manager info
    return Array.from(deptMap.values())
      .filter((dept) => dept.members.length > 0 || departmentsList.some((d) => d.name === dept.name))
      .map((dept) => {
        // Find lead: prefer user with isManager (excluding CEO if other members exist), or HR, or first member
        const nonAdminMembers = dept.members.filter((m) => m.role !== 'COMPANY_ADMIN');
        const candidatePool = nonAdminMembers.length > 0 ? nonAdminMembers : dept.members;

        const lead =
          candidatePool.find((m) => m.isManager) ||
          candidatePool.find((m) => m.role === 'HR') ||
          candidatePool[0] ||
          null;

        return {
          id: dept.id || dept.name,
          name: dept.name,
          lead,
          members: dept.members,
          memberCount: dept.members.length,
        };
      })
      .sort((a, b) => b.memberCount - a.memberCount);
  }, [departmentsList, users]);

  const toggleManager = (id: number) => {
    setExpandedManagers((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'COMPANY_ADMIN':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200/70 shadow-2xs">
            Company Admin
          </span>
        );
      case 'HR':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200/70 shadow-2xs">
            HR Director
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200/70 shadow-2xs">
            Employee
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* ===================== TOP HEADER BAR ===================== */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <IconNetwork className="w-5 h-5 text-indigo-600 shrink-0" />
            <span>Roles &amp; Hierarchy</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Role-based access matrix, granular HR sub-permissions, and direct manager reporting assignments.
          </p>
        </div>

        {/* Tab Selector Segmented Control */}
        <div className="flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200/70 self-stretch sm:self-auto">
          <button
            onClick={() => setActiveTab('ORG_TREE')}
            className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'ORG_TREE'
                ? 'bg-white text-[#5E4BE2] shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Org Tree
          </button>
          <button
            onClick={() => setActiveTab('PERSONNEL')}
            className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'PERSONNEL'
                ? 'bg-white text-[#5E4BE2] shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Directory ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('MATRIX')}
            className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'MATRIX'
                ? 'bg-white text-[#5E4BE2] shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Permissions Matrix
          </button>
        </div>
      </div>

      

      {/* ===================== TAB 1: ORGANIZATIONAL & TEAM HIERARCHY ===================== */}
      {activeTab === 'ORG_TREE' && (
        <div className="space-y-6">
          {isLoading ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-200/70 shadow-xs space-y-4 animate-pulse">
              <div className="w-64 h-16 bg-slate-200 rounded-2xl mx-auto" />
              <div className="grid grid-cols-2 gap-4 mt-8">
                <div className="h-32 bg-slate-100 rounded-2xl" />
                <div className="h-32 bg-slate-100 rounded-2xl" />
              </div>
            </div>
          ) : !orgTree ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200/70 text-center text-slate-400">
              No organizational hierarchy data available.
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/70 p-6 shadow-xs space-y-6">
              {/* LEVEL 1: EXECUTIVE LEADERSHIP (CEO / COMPANY ADMIN) */}
              <div className="flex flex-col items-center">
                <div className="border border-slate-200/80 rounded-2xl bg-slate-50/40 p-4 transition-all shadow-2xs hover:bg-white hover:border-indigo-200 max-w-md w-full">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs overflow-hidden shrink-0 border border-purple-100">
                        {orgTree.adminUser.profilePhoto ? (
                          <img
                            src={orgTree.adminUser.profilePhoto}
                            alt={`${orgTree.adminUser.firstName} ${orgTree.adminUser.lastName}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <>
                            {orgTree.adminUser.firstName?.[0]}
                            {orgTree.adminUser.lastName?.[0]}
                          </>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-sm text-slate-900">
                            {orgTree.adminUser.firstName} {orgTree.adminUser.lastName}
                          </h4>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200/70 shadow-2xs">
                            Chief Executive Officer
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {orgTree.adminUser.jobTitle || 'Executive Leadership'}
                        </p>
                        <div className="mt-2 flex items-center gap-2 text-[11px] font-semibold text-slate-600">
                          <span className="inline-flex items-center gap-1 bg-white px-2.5 py-0.5 rounded-full border border-slate-200/80 shadow-2xs text-slate-700">
                            <IconBuilding className="w-3 h-3 text-slate-400" />
                            {orgTree.adminUser.department?.name || 'Executive'}
                          </span>
                          <span className="bg-indigo-50 text-[#5E4BE2] px-2.5 py-0.5 rounded-full border border-indigo-100">
                            {users.length - 1} Direct & Indirect Reports
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Connector Line downwards */}
                <div className="w-0.5 h-8 bg-indigo-200 my-1" />
              </div>

              {/* ALL DEPARTMENT TEAMS (Engineering, Finance, HR, Product, Sales, etc.) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Company Departments & Functional Teams ({departmentTeams.length})
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      All functional units reporting to Executive Leadership with appointed team leads and rosters.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                  {departmentTeams.map((dept) => {
                    const isExpanded = expandedDepts[dept.name] !== false;
                    const meta = getDepartmentMeta(dept.name);
                    const Icon = meta.icon;

                    return (
                      <div
                        key={dept.name}
                        className={`border rounded-2xl bg-slate-50/40 p-4 transition-all shadow-2xs hover:bg-white hover:border-indigo-200 ${meta.borderHover}`}
                      >
                        {/* Department Card Header */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div
                              className={`w-10 h-10 rounded-xl ${meta.iconBg} flex items-center justify-center shrink-0 shadow-2xs`}
                            >
                              <Icon className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-bold text-sm text-slate-900">{dept.name}</h4>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${meta.badgeBg}`}
                                >
                                  {dept.memberCount} {dept.memberCount === 1 ? 'Member' : 'Members'}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                                {meta.description}
                              </p>

                              {dept.lead && (
                                <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-700 bg-white px-2 py-1 rounded-lg border border-slate-200/80 inline-flex shadow-2xs">
                                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
                                    Lead:
                                  </span>
                                  <span className="font-bold text-slate-900 text-[11px]">
                                    {dept.lead.firstName} {dept.lead.lastName}
                                  </span>
                                  <span className="text-slate-300">•</span>
                                  <span className="text-slate-500 text-[11px] truncate max-w-[140px]">
                                    {dept.lead.jobTitle}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Expand/Collapse Button */}
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedDepts((prev) => ({
                                ...prev,
                                [dept.name]: !isExpanded,
                              }))
                            }
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs shrink-0"
                          >
                            <span>{dept.members.length} Members</span>
                            {isExpanded ? (
                              <IconChevronDown className="w-3.5 h-3.5 text-slate-400" />
                            ) : (
                              <IconChevronRight className="w-3.5 h-3.5 text-slate-400" />
                            )}
                          </button>
                        </div>

                        {/* Team Members Roster */}
                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t border-slate-200/70 space-y-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block px-1">
                              Team Roster ({dept.members.length})
                            </span>
                            {dept.members.length === 0 ? (
                              <div className="p-3 text-center text-xs text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                                No members currently assigned to this department.
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {dept.members.map((emp) => (
                                  <div
                                    key={emp.id}
                                    className="flex items-center gap-2.5 p-2 rounded-xl bg-white border border-slate-200/60 shadow-2xs hover:border-slate-300 transition-colors"
                                  >
                                    <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 font-bold text-[10px] flex items-center justify-center shrink-0 overflow-hidden border border-slate-200/60">
                                      {emp.profilePhoto ? (
                                        <img
                                          src={emp.profilePhoto}
                                          alt={`${emp.firstName} ${emp.lastName}`}
                                          className="w-full h-full object-cover"
                                          onError={(e) => {
                                            e.currentTarget.style.display = 'none';
                                          }}
                                        />
                                      ) : (
                                        <>
                                          {emp.firstName?.[0]}
                                          {emp.lastName?.[0]}
                                        </>
                                      )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-1">
                                        <span className="font-bold text-xs text-slate-900 truncate">
                                          {emp.firstName} {emp.lastName}
                                        </span>
                                        {emp.isManager && (
                                          <span className="px-1 py-0.2 rounded text-[9px] font-extrabold bg-indigo-50 text-[#5E4BE2] border border-indigo-100 shrink-0">
                                            Manager
                                          </span>
                                        )}
                                        {emp.role === 'COMPANY_ADMIN' && (
                                          <span className="px-1 py-0.2 rounded text-[9px] font-extrabold bg-purple-50 text-purple-700 border border-purple-100 shrink-0">
                                            CEO
                                          </span>
                                        )}
                                        {emp.role === 'HR' && (
                                          <span className="px-1 py-0.2 rounded text-[9px] font-extrabold bg-amber-50 text-amber-700 border border-amber-100 shrink-0">
                                            HR
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-[10px] text-slate-400 truncate">
                                        {emp.jobTitle || emp.email}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================== TAB 2: PERSONNEL DIRECTORY & MANAGERS ===================== */}
      {activeTab === 'PERSONNEL' && (
        <div className="bg-white rounded-2xl border border-slate-200/70 shadow-xs overflow-hidden">
          {/* Filter Bar */}
          <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-50/40">
            {/* Search Input */}
            <div className="relative flex-1">
              <IconSearch className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by employee name, job title, or email..."
                className="w-full pl-10 pr-10 py-2.5 text-xs font-medium bg-white border border-slate-200/80 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#5E4BE2]/20 focus:border-[#5E4BE2] transition-all placeholder:text-slate-400 text-slate-800"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  <IconX className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Dropdown Filters */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Role Filter */}
              <div className="min-w-[150px]">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-200/80 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#5E4BE2]/20 focus:border-[#5E4BE2] transition-all text-slate-700 cursor-pointer"
                >
                  <option value="ALL">All Roles</option>
                  <option value="COMPANY_ADMIN">Company Admin</option>
                  <option value="HR">HR Leaders</option>
                  <option value="MANAGER">Team Managers</option>
                  <option value="EMPLOYEE">Employees</option>
                </select>
              </div>

              {/* Department Filter */}
              <div className="min-w-[160px]">
                <select
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-200/80 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#5E4BE2]/20 focus:border-[#5E4BE2] transition-all text-slate-700 cursor-pointer"
                >
                  <option value="ALL">All Departments</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              {/* Count badge */}
              <span className="hidden sm:inline-flex px-3 py-1.5 rounded-xl bg-indigo-50/70 text-[#5E4BE2] text-xs font-bold border border-indigo-100/60 shrink-0">
                {filteredUsers.length} records
              </span>
            </div>
          </div>

          {/* Directory Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-[#e5e7eb] text-xs font-bold text-slate-900 border-b border-slate-300">
                <tr>
                  <th className="px-6 py-3.5">Employee</th>
                  <th className="px-6 py-3.5">Role</th>
                  <th className="px-6 py-3.5">Department</th>
                  <th className="px-6 py-3.5">Reports To (Manager)</th>
                  <th className="px-6 py-3.5 text-right">Approval Authority</th>
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
                      <td className="px-6 py-4"><div className="w-20 h-4 bg-slate-200 rounded-full" /></td>
                      <td className="px-6 py-4"><div className="w-24 h-3 bg-slate-200 rounded-sm" /></td>
                      <td className="px-6 py-4"><div className="w-28 h-3 bg-slate-200 rounded-sm" /></td>
                      <td className="px-6 py-4 text-right"><div className="w-24 h-4 bg-slate-200 rounded-full ml-auto" /></td>
                    </tr>
                  ))
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                      No personnel matching your criteria. Try resetting filters.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const initials = `${u.firstName?.[0] || ''}${u.lastName?.[0] || ''}`.toUpperCase() || 'U';

                    return (
                      <tr key={u.id} className="hover:bg-indigo-50/20 transition-colors group">
                        {/* Employee */}
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#5E4BE2] to-indigo-500 text-white flex items-center justify-center font-bold text-xs shadow-2xs shrink-0 overflow-hidden relative border border-slate-100">
                              {u.profilePhoto ? (
                                <img
                                  src={u.profilePhoto}
                                  alt={`${u.firstName} ${u.lastName}`}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              ) : (
                                initials
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-xs text-slate-900 group-hover:text-[#5E4BE2] transition-colors leading-tight truncate">
                                {u.firstName} {u.lastName}
                              </div>
                              <div className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
                                {u.jobTitle || u.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Role */}
                        <td className="px-6 py-3.5">{getRoleBadge(u.role)}</td>

                        {/* Department */}
                        <td className="px-6 py-3.5">
                          {u.department?.name ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] bg-slate-100 text-slate-700 font-semibold border border-slate-200/60">
                              <IconBuilding className="w-3 h-3 text-slate-400" />
                              {u.department.name}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs italic">Unassigned</span>
                          )}
                        </td>

                        {/* Manager */}
                        <td className="px-6 py-3.5 text-xs font-semibold text-slate-800">
                          {u.manager ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[#5E4BE2] font-bold">↳</span>
                              <span>
                                {u.manager.firstName} {u.manager.lastName}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Direct Executive</span>
                          )}
                        </td>

                        {/* Manager Status */}
                        <td className="px-6 py-3.5 text-right">
                          {u.isManager ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-[#5E4BE2] border border-indigo-200/70 shadow-2xs">
                              <IconUserCheck className="w-3 h-3" /> Approver Manager
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">Team Contributor</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================== TAB 3: PERMISSIONS & ACCESS MATRIX ===================== */}
      {activeTab === 'MATRIX' && (
        <div className="bg-white rounded-2xl border border-slate-200/70 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-[#e5e7eb] text-xs font-bold text-slate-900 border-b border-slate-300">
                <tr>
                  <th className="px-6 py-3.5">Capability & Operation</th>
                  <th className="px-6 py-3.5">Module Scope</th>
                  <th className="px-4 py-3.5 text-center bg-indigo-50/40 border-x border-indigo-100/60 text-[#5E4BE2]">
                    Company Admin
                  </th>
                  <th className="px-4 py-3.5 text-center">HR Leader</th>
                  <th className="px-4 py-3.5 text-center">Team Manager</th>
                  <th className="px-4 py-3.5 text-center">Employee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/80 font-medium">
                {PERMISSIONS_MATRIX.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900 text-xs sm:text-sm">
                      {item.feature}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200/60">
                        {item.module}
                      </span>
                    </td>
                    {/* Company Admin (Highlighted Column) */}
                    <td className="px-4 py-4 text-center bg-indigo-50/20 border-x border-indigo-100/60">
                      {item.companyAdmin ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200/80 shadow-2xs mx-auto">
                          <IconCheck className="w-3.5 h-3.5 stroke-[2.5]" />
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-300 mx-auto">
                          <IconX className="w-3 h-3" />
                        </span>
                      )}
                    </td>
                    {/* HR */}
                    <td className="px-4 py-4 text-center">
                      {item.hr ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200/80 shadow-2xs mx-auto">
                          <IconCheck className="w-3.5 h-3.5 stroke-[2.5]" />
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-300 mx-auto">
                          <IconX className="w-3 h-3" />
                        </span>
                      )}
                    </td>
                    {/* Manager */}
                    <td className="px-4 py-4 text-center">
                      {item.manager ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200/80 shadow-2xs mx-auto">
                          <IconCheck className="w-3.5 h-3.5 stroke-[2.5]" />
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-300 mx-auto">
                          <IconX className="w-3 h-3" />
                        </span>
                      )}
                    </td>
                    {/* Employee */}
                    <td className="px-4 py-4 text-center">
                      {item.employee ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200/80 shadow-2xs mx-auto">
                          <IconCheck className="w-3.5 h-3.5 stroke-[2.5]" />
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-300 mx-auto">
                          <IconX className="w-3 h-3" />
                        </span>
                      )}
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

export default RolesHierarchyPage;
