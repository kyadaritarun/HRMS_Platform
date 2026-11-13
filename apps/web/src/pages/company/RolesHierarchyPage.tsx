import React, { useState, useEffect, useMemo } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
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
  IconPlus,
  IconMinus,
  IconArrowsMaximize,
  IconArrowsMinimize,
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

interface OrgTreeNode extends HierarchyUser {
  reports: OrgTreeNode[];
  directReportCount: number;
}

const AVATAR_COLORS = [
  'bg-[#a855f7]', // purple
  'bg-[#06b6d4]', // cyan
  'bg-[#f43f5e]', // rose
  'bg-[#14b8a6]', // teal
  'bg-[#6366f1]', // indigo
  'bg-[#ec4899]', // pink
  'bg-[#3b82f6]', // blue
  'bg-[#f97316]', // orange
  'bg-[#8b5cf6]', // violet
  'bg-[#10b981]', // emerald
];

const getAvatarBg = (name: string, id: number) => {
  const charSum = (name || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[(charSum + id) % AVATAR_COLORS.length];
};

const buildHierarchyTree = (usersList: HierarchyUser[]): OrgTreeNode[] => {
  if (!usersList || usersList.length === 0) return [];

  const map = new Map<number, OrgTreeNode>();
  usersList.forEach((u) => {
    map.set(u.id, {
      ...u,
      reports: [],
      directReportCount: 0,
    });
  });

  const roots: OrgTreeNode[] = [];

  // Connect direct reports to their respective manager
  usersList.forEach((u) => {
    const node = map.get(u.id)!;
    if (u.managerId && map.has(u.managerId) && u.managerId !== u.id) {
      const mgr = map.get(u.managerId)!;
      mgr.reports.push(node);
      mgr.directReportCount++;
    } else {
      roots.push(node);
    }
  });

  // If there are multiple unparented roots, unify them under the apex executive (Company Admin / CEO)
  if (roots.length > 1) {
    const primaryRoot =
      roots.find((r) => r.role === 'COMPANY_ADMIN') ||
      roots.find((r) => r.directReportCount > 0) ||
      roots[0];

    if (primaryRoot) {
      const otherRoots = roots.filter((r) => r.id !== primaryRoot.id);
      otherRoots.forEach((other) => {
        primaryRoot.reports.push(other);
        primaryRoot.directReportCount++;
      });
      return [primaryRoot];
    }
  }

  return roots;
};

// ----------------------------------------------------------------------------
// Org Chart Node Component (Matching User's Provided Image)
// ----------------------------------------------------------------------------
interface OrgChartNodeProps {
  node: OrgTreeNode;
  companyName: string;
  expandedNodes: Record<number, boolean>;
  toggleNode: (id: number) => void;
  searchQuery: string;
  depth?: number;
}

const OrgChartNode: React.FC<OrgChartNodeProps> = ({
  node,
  companyName,
  expandedNodes,
  toggleNode,
  searchQuery,
  depth = 0,
}) => {
  const hasChildren = node.reports && node.reports.length > 0;
  // If expandedNodes[node.id] is explicitly boolean, use it. Otherwise, top 3 levels default to expanded.
  const isExpanded =
    expandedNodes[node.id] !== undefined
      ? expandedNodes[node.id]
      : depth < 3;

  const fullName = `${node.firstName || ''} ${node.lastName || ''}`.trim() || 'Team Member';
  const initials = `${node.firstName?.[0] || ''}${node.lastName?.[0] || ''}`.toUpperCase() || 'U';
  const avatarBg = getAvatarBg(fullName, node.id);

  const q = searchQuery.trim().toLowerCase();
  const isMatch =
    q.length > 0 &&
    (fullName.toLowerCase().includes(q) ||
      (node.jobTitle || '').toLowerCase().includes(q) ||
      (node.department?.name || '').toLowerCase().includes(q) ||
      (node.role || '').toLowerCase().includes(q));

  return (
    <div className="flex flex-col items-center select-none">
      {/* 1. Node Card */}
      <div className="relative flex flex-col items-center">
        <div
          className={`w-[220px] sm:w-[245px] bg-white rounded-xl border transition-all p-3 text-left relative z-10 ${
            isMatch
              ? 'border-indigo-600 ring-4 ring-indigo-500/20 shadow-md scale-105'
              : 'border-slate-200/90 hover:border-indigo-300 hover:shadow-md shadow-xs'
          }`}
        >
          <div className="flex items-start gap-2.5">
            {/* Avatar */}
            <div
              className={`w-9 h-9 rounded-full ${avatarBg} text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs overflow-hidden`}
            >
              {node.profilePhoto ? (
                <img
                  src={node.profilePhoto}
                  alt={fullName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <span>{initials}</span>
              )}
            </div>

            {/* Details */}
            <div className="min-w-0 flex-1">
              <h4 className="font-bold text-xs sm:text-[13px] text-slate-900 truncate leading-snug" title={fullName}>
                {fullName}
              </h4>
              <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5" title={node.jobTitle}>
                {node.jobTitle || 'Team Member'}
              </p>
              <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5" title={companyName}>
                {companyName}
              </p>
              <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold truncate mt-1">
                {node.department?.name || 'GENERAL'}
              </p>
            </div>
          </div>
        </div>

        {/* Expand / Collapse Badge Button */}
        {hasChildren && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleNode(node.id);
            }}
            title={isExpanded ? 'Collapse direct reports' : `Expand ${node.reports.length} direct reports`}
            className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 z-20 w-5 h-5 rounded-full bg-[#5E4BE2] hover:bg-[#4D3CD1] text-white flex items-center justify-center font-bold text-[10px] shadow-xs cursor-pointer transition-transform hover:scale-110 active:scale-95 select-none"
          >
            {isExpanded ? (
              <span className="leading-none pb-0.5 text-xs font-black">—</span>
            ) : (
              <span className="leading-none text-[10px] font-bold">{node.reports.length}</span>
            )}
          </button>
        )}

        {/* Stem leaving bottom of this card if children are visible */}
        {hasChildren && isExpanded && <div className="w-px h-7 bg-slate-300" />}
      </div>

      {/* 2. Children Tier with Orthogonal Connector Lines */}
      {hasChildren && isExpanded && (
        <div className="relative flex justify-center pt-0">
          {node.reports.map((child, idx) => {
            const count = node.reports.length;
            const isFirst = idx === 0;
            const isLast = idx === count - 1;
            const isOnly = count === 1;

            return (
              <div key={child.id} className="relative flex flex-col items-center px-3 sm:px-4">
                {/* Horizontal crossbar segment spanning across siblings */}
                {!isOnly && (
                  <div
                    className={`absolute top-0 h-px bg-slate-300 ${
                      isFirst
                        ? 'left-1/2 right-0'
                        : isLast
                        ? 'left-0 right-1/2'
                        : 'left-0 right-0'
                    }`}
                  />
                )}

                {/* Vertical drop line down into child node */}
                <div className="w-px h-7 bg-slate-300" />

                {/* Recursive Child Node */}
                <OrgChartNode
                  node={child}
                  companyName={companyName}
                  expandedNodes={expandedNodes}
                  toggleNode={toggleNode}
                  searchQuery={searchQuery}
                  depth={depth + 1}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

interface DepartmentItem {
  id: number;
  name: string;
  isActive?: boolean;
  parent?: { id: number; name: string } | null;
  users?: any[];
  _count?: { users: number };
}

export const RolesHierarchyPage: React.FC = () => {
  const { company } = useAuth();
  const companyName = company?.name || 'Docplexus';

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

  // Org Tree specific state
  const [treeZoom, setTreeZoom] = useState<number>(1);
  const [treeSearch, setTreeSearch] = useState<string>('');
  const [expandedNodes, setExpandedNodes] = useState<Record<number, boolean>>({});

  const treeRoots = useMemo(() => buildHierarchyTree(users), [users]);

  // Set default expansion: expand levels 0, 1, 2 so that level 3 (Level 4 in screenshot) displays report count badges
  useEffect(() => {
    if (treeRoots.length === 0) return;
    const initial: Record<number, boolean> = {};

    const mark = (nodes: OrgTreeNode[], depth: number) => {
      nodes.forEach((n) => {
        initial[n.id] = depth < 3;
        if (n.reports && n.reports.length > 0) {
          mark(n.reports, depth + 1);
        }
      });
    };

    mark(treeRoots, 0);
    setExpandedNodes(initial);
  }, [treeRoots]);

  // If user searches inside the Org Tree, automatically expand ancestor path to any matches
  useEffect(() => {
    const q = treeSearch.trim().toLowerCase();
    if (!q) return;

    const toExpand: Record<number, boolean> = {};
    const searchAndExpand = (node: OrgTreeNode): boolean => {
      const fullName = `${node.firstName || ''} ${node.lastName || ''}`.toLowerCase();
      const title = (node.jobTitle || '').toLowerCase();
      const dept = (node.department?.name || '').toLowerCase();
      const role = (node.role || '').toLowerCase();
      const matchesSelf = fullName.includes(q) || title.includes(q) || dept.includes(q) || role.includes(q);

      let childMatched = false;
      if (node.reports) {
        node.reports.forEach((child) => {
          if (searchAndExpand(child)) {
            childMatched = true;
          }
        });
      }

      if (matchesSelf || childMatched) {
        toExpand[node.id] = true;
        return true;
      }
      return false;
    };

    treeRoots.forEach((root) => searchAndExpand(root));
    setExpandedNodes((prev) => ({ ...prev, ...toExpand }));
  }, [treeSearch, treeRoots]);

  const toggleTreeNode = (id: number) => {
    setExpandedNodes((prev) => ({
      ...prev,
      [id]: prev[id] !== undefined ? !prev[id] : false,
    }));
  };

  const handleExpandAll = () => {
    const all: Record<number, boolean> = {};
    const mark = (nodes: OrgTreeNode[]) => {
      nodes.forEach((n) => {
        all[n.id] = true;
        if (n.reports) mark(n.reports);
      });
    };
    mark(treeRoots);
    setExpandedNodes(all);
  };

  const handleCollapseAll = () => {
    const collapsed: Record<number, boolean> = {};
    const mark = (nodes: OrgTreeNode[], isRoot = false) => {
      nodes.forEach((n) => {
        collapsed[n.id] = isRoot;
        if (n.reports) mark(n.reports, false);
      });
    };
    mark(treeRoots, true);
    setExpandedNodes(collapsed);
  };

  const handleResetView = () => {
    setTreeZoom(1);
    setTreeSearch('');
    const initial: Record<number, boolean> = {};
    const mark = (nodes: OrgTreeNode[], depth: number) => {
      nodes.forEach((n) => {
        initial[n.id] = depth < 3;
        if (n.reports) mark(n.reports, depth + 1);
      });
    };
    mark(treeRoots, 0);
    setExpandedNodes(initial);
  };

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
      case 'FINANCE':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/70 shadow-2xs">
            Finance
          </span>
        );
      case 'IT':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/70 shadow-2xs">
            IT Operations
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
            <span>Org Structure</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
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

      

      {/* ===================== TAB 1: ORGANIZATIONAL TREE HIERARCHY ===================== */}
      {activeTab === 'ORG_TREE' && (
        <div className="space-y-4">
          {/* Org Tree Toolbar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <IconSearch className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={treeSearch}
                onChange={(e) => setTreeSearch(e.target.value)}
                placeholder="Search org chart by name, title, department..."
                className="w-full pl-9 pr-8 py-2 text-xs font-medium bg-slate-50/70 border border-slate-200/80 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#5E4BE2]/20 focus:border-[#5E4BE2] transition-all placeholder:text-slate-400 text-slate-800"
              />
              {treeSearch && (
                <button
                  type="button"
                  onClick={() => setTreeSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                >
                  <IconX className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Tree Action Buttons & Zoom Controls */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Expand / Collapse All */}
              <button
                type="button"
                onClick={handleExpandAll}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-xl cursor-pointer transition-colors shadow-2xs"
                title="Expand all nodes"
              >
                <IconArrowsMaximize className="w-3.5 h-3.5 text-[#5E4BE2]" />
                <span>Expand All</span>
              </button>

              <button
                type="button"
                onClick={handleCollapseAll}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-xl cursor-pointer transition-colors shadow-2xs"
                title="Collapse all nodes"
              >
                <IconArrowsMinimize className="w-3.5 h-3.5 text-slate-500" />
                <span>Collapse All</span>
              </button>

              <div className="h-5 w-px bg-slate-200 mx-1 hidden sm:block" />

              {/* Zoom Controls */}
              <div className="flex items-center bg-slate-50 border border-slate-200/80 rounded-xl p-0.5 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setTreeZoom((z) => Math.max(0.5, Number((z - 0.1).toFixed(2))))}
                  disabled={treeZoom <= 0.5}
                  className="p-1.5 text-slate-600 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white rounded-lg transition-colors cursor-pointer"
                  title="Zoom Out"
                >
                  <IconMinus className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setTreeZoom(1)}
                  className="px-2 py-1 text-[11px] font-bold text-slate-700 hover:text-[#5E4BE2] transition-colors cursor-pointer"
                  title="Reset Zoom to 100%"
                >
                  {Math.round(treeZoom * 100)}%
                </button>

                <button
                  type="button"
                  onClick={() => setTreeZoom((z) => Math.min(1.5, Number((z + 0.1).toFixed(2))))}
                  disabled={treeZoom >= 1.5}
                  className="p-1.5 text-slate-600 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white rounded-lg transition-colors cursor-pointer"
                  title="Zoom In"
                >
                  <IconPlus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Reset View Button */}
              <button
                type="button"
                onClick={handleResetView}
                className="px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                title="Reset layout and zoom"
              >
                Reset View
              </button>
            </div>
          </div>

          {/* Org Tree Canvas */}
          {isLoading ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200/70 shadow-xs flex flex-col items-center justify-center min-h-[450px] animate-pulse">
              <div className="w-56 h-20 bg-slate-200 rounded-xl mb-8" />
              <div className="flex gap-8">
                <div className="w-48 h-20 bg-slate-100 rounded-xl" />
                <div className="w-48 h-20 bg-slate-100 rounded-xl" />
              </div>
            </div>
          ) : treeRoots.length === 0 ? (
            <div className="bg-white p-16 rounded-2xl border border-slate-200/70 shadow-xs text-center">
              <IconNetwork className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-800">No organizational data available</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                No active employee records or manager reporting hierarchies found for this organization.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-auto min-h-[600px] max-h-[calc(100vh-280px)] p-8 sm:p-12 relative">
              <div
                className="min-w-max flex justify-center items-start pt-4 pb-20 transition-transform duration-150 ease-out"
                style={{
                  transform: `scale(${treeZoom})`,
                  transformOrigin: 'top center',
                }}
              >
                <div className="flex justify-center gap-12">
                  {treeRoots.map((rootNode) => (
                    <OrgChartNode
                      key={rootNode.id}
                      node={rootNode}
                      companyName={companyName}
                      expandedNodes={expandedNodes}
                      toggleNode={toggleTreeNode}
                      searchQuery={treeSearch}
                      depth={0}
                    />
                  ))}
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
              <IconSearch className="w-4 h-4 text-slate-500 font-medium absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by employee name, job title, or email..."
                className="w-full pl-10 pr-10 py-2.5 text-xs font-medium bg-white border border-slate-200/80 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#5E4BE2]/20 focus:border-[#5E4BE2] transition-all placeholder:text-slate-500 text-slate-800"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium hover:text-slate-600 p-1 cursor-pointer"
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
                  <option value="FINANCE">Finance</option>
                  <option value="IT">IT Operations</option>
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
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500 font-medium">
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
                              <div className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
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
                              <IconBuilding className="w-3 h-3 text-slate-500 font-medium" />
                              {u.department.name}
                            </span>
                          ) : (
                            <span className="text-slate-500 font-medium text-xs italic">Unassigned</span>
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
                            <span className="text-slate-500 font-medium italic">Direct Executive</span>
                          )}
                        </td>

                        {/* Manager Status */}
                        <td className="px-6 py-3.5 text-right">
                          {u.isManager ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-[#5E4BE2] border border-indigo-200/70 shadow-2xs">
                              <IconUserCheck className="w-3 h-3" /> Approver Manager
                            </span>
                          ) : (
                            <span className="text-xs text-slate-500 font-medium">Team Contributor</span>
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
