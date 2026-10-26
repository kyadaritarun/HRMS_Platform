import React, { useState, useEffect, useMemo } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, UserRole } from '../../context/AuthContext';
import { LockedFeatureModal } from '../LockedFeatureModal';
import {
  IconSmartHome,
  IconUsers,
  IconUserPlus,
  IconUser,
  IconClock,
  IconCalendarEvent,
  IconReceipt2,
  IconCash,
  IconTarget,
  IconFileText,
  IconFolderCheck,
  IconSettings,
  IconChevronRight,
  IconChevronDown,
  IconCrown,
  IconBriefcase,
  IconNetwork,
  IconFileCertificate,
  IconChecklist,
  IconHeartHandshake,
  IconHelpCircle,
  IconCreditCard,
  IconHistory,
  IconCpu,
  IconBuildingSkyscraper,
  IconPackage,
  IconIdBadge,
  IconMail,
  IconShieldLock,
  IconDoorExit,
  IconBuildingBank,
  IconDevices,
} from '@tabler/icons-react';

export interface SubMenuItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  feature?: string;
  permission?: string;
  requiresManager?: boolean;
  roles?: UserRole[];
}

export interface NavCategory {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
  path?: string; // Direct link (no accordion children)
  subItems?: SubMenuItem[];
}

interface SidebarProps {
  collapsed?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed = false }) => {
  const { user, company, hasFeature, hasHrPermission } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [openCategoryId, setOpenCategoryId] = useState<string | null>(null);
  const [lockedModal, setLockedModal] = useState<{ open: boolean; featureName?: string }>({ open: false });

  // Distinct, non-overlapping categories based on user role
  const categories: NavCategory[] = useMemo(() => {
    if (!user) return [];

    // ==========================================
    // 1. PRODUCT SUPER ADMIN SIDEBAR
    // ==========================================
    if (user.role === 'PRODUCT_SUPER_ADMIN') {
      return [
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: IconSmartHome,
          roles: ['PRODUCT_SUPER_ADMIN'],
          path: '/super-admin/dashboard',
        },
        {
          id: 'companies',
          label: 'Tenants & Companies',
          icon: IconBuildingSkyscraper,
          roles: ['PRODUCT_SUPER_ADMIN'],
          path: '/super-admin/companies',
        },
        {
          id: 'renewals',
          label: 'Renewals & Billing',
          icon: IconHistory,
          roles: ['PRODUCT_SUPER_ADMIN'],
          path: '/super-admin/renewals-billing',
        },
        {
          id: 'packages',
          label: 'Packages & Pricing',
          icon: IconPackage,
          roles: ['PRODUCT_SUPER_ADMIN'],
          path: '/super-admin/packages',
        },
        {
          id: 'invoices',
          label: 'Invoices',
          icon: IconIdBadge,
          roles: ['PRODUCT_SUPER_ADMIN'],
          path: '/super-admin/invoices',
        },
        {
          id: 'emails',
          label: 'Email Notifications',
          icon: IconMail,
          roles: ['PRODUCT_SUPER_ADMIN'],
          path: '/super-admin/emails',
        },
        {
          id: 'admins',
          label: 'Super Administrators',
          icon: IconShieldLock,
          roles: ['PRODUCT_SUPER_ADMIN'],
          path: '/super-admin/super-admins/add',
        },
        {
          id: 'profile',
          label: 'My Profile',
          icon: IconUser,
          roles: ['PRODUCT_SUPER_ADMIN'],
          path: '/profile',
        },
      ];
    }

    // ==========================================
    // ==========================================
    // 2. COMPANY ADMIN & HR SIDEBAR
    // ==========================================
    if (user.role === 'COMPANY_ADMIN' || user.role === 'HR') {
      return [
        {
          id: 'company_dashboard',
          label: 'Company Dashboard',
          icon: IconSmartHome,
          roles: ['COMPANY_ADMIN', 'HR'],
          path: '/company/dashboard',
        },
        {
          id: 'company',
          label: 'Company',
          icon: IconBuildingSkyscraper,
          roles: ['COMPANY_ADMIN', 'HR'],
          subItems: [
            { label: 'Employees', path: '/company/employees', icon: IconUsers, permission: 'employees' },
            { label: 'Create Employee', path: '/company/employees/new', icon: IconUserPlus, permission: 'employees' },
            { label: 'Employee Attendance', path: '/company/attendance', icon: IconClock, permission: 'attendance', feature: 'time_attendance_management' },
            { label: 'Departments', path: '/company/departments', icon: IconBriefcase },
            { label: 'Roles & Hierarchy', path: '/company/roles-hierarchy', icon: IconNetwork },
            { label: 'Billing', path: '/company/billing', icon: IconCreditCard, roles: ['COMPANY_ADMIN'] },
            { label: 'Activity Logs', path: '/company/activity-logs', icon: IconHistory, roles: ['COMPANY_ADMIN'] },
          ],
        },
        {
          id: 'hr_operations',
          label: 'HR Operations',
          icon: IconBriefcase,
          roles: ['COMPANY_ADMIN', 'HR'],
          subItems: [
            { label: 'Holiday Calendar', path: '/company/holidays', icon: IconCalendarEvent, feature: 'holiday_calendar' },
            { label: 'Leave Types', path: '/company/leaves/types', icon: IconFileCertificate, feature: 'leave_management' },
            { label: 'Manage Policies', path: '/company/policies/manage', icon: IconFileText, feature: 'policy_documents_management' },
            { label: 'Offer Letters', path: '/company/offer-letters', icon: IconFileCertificate },
            { label: 'HR Letters Hub', path: '/company/hr-letters', icon: IconFileCertificate },
            { label: 'Assets & Onboarding', path: '/company/assets-onboarding', icon: IconDevices },
            { label: 'Shift & Roster', path: '/company/shift-roster', icon: IconClock },
          ],
        },
        {
          id: 'payroll_compensation',
          label: 'Payroll & Compensation',
          icon: IconCash,
          roles: ['COMPANY_ADMIN', 'HR'],
          subItems: [
            { label: 'Attendance & Salary', path: '/payroll/attendance-salary', icon: IconClock, feature: 'payroll' },
            { label: 'Salary Master', path: '/payroll/salaries', icon: IconReceipt2, feature: 'payroll' },
            { label: 'Compliance & Bank Payout', path: '/payroll/compliance-reports', icon: IconBuildingBank, feature: 'payroll' },
            { label: 'Exit & F&F Settlement', path: '/company/exits', icon: IconDoorExit },
          ],
        },
        {
          id: 'assigned_to_me',
          label: 'Assigned To Me',
          icon: IconChecklist,
          roles: ['COMPANY_ADMIN', 'HR'],
          subItems: [
            { label: 'Approval Requests', path: '/company/approvals', icon: IconChecklist },
            { label: 'Claims Review', path: '/company/claims/manage', icon: IconCash, feature: 'claim_process_management' },
            { label: 'Tickets', path: '/tickets/assigned', icon: IconHelpCircle, feature: 'support_ticket_management' },
            { label: 'Document Review', path: '/company/documents/review', icon: IconFolderCheck, feature: 'employee_document_management' },
          ],
        },
        {
          id: 'self_service',
          label: 'Self Service',
          icon: IconUser,
          roles: ['COMPANY_ADMIN', 'HR'],
          subItems: [
            { label: 'Attendance', path: '/attendance', icon: IconClock, feature: 'time_attendance_management' },
            { label: 'Leaves', path: '/leaves', icon: IconCalendarEvent, feature: 'leave_management' },
            { label: 'Comp Off', path: '/comp-off', icon: IconCalendarEvent, feature: 'comp_off_management' },
            { label: 'Payslips', path: '/payroll/my-payslips', icon: IconReceipt2, feature: 'payroll' },
            { label: 'Performance Goals', path: '/performance/my-goals', icon: IconTarget, feature: 'performance_management' },
            { label: 'Claims', path: '/claims', icon: IconCash, feature: 'claim_process_management' },
            { label: 'Tickets', path: '/tickets', icon: IconHelpCircle, feature: 'support_ticket_management' },
            { label: 'Org Structure', path: '/org-structure', icon: IconNetwork, feature: 'employees_directory' },
            { label: 'Policies', path: '/policies', icon: IconFileText, feature: 'policy_documents_management' },
            { label: 'Appreciations', path: '/appreciations', icon: IconHeartHandshake, feature: 'employee_appreciation' },
            { label: 'AI Assistant', path: '/assistant', icon: IconCpu, feature: 'ai_assistance' },
          ],
        },
        {
          id: 'miscellaneous',
          label: 'Miscellaneous',
          icon: IconSettings,
          roles: ['COMPANY_ADMIN', 'HR'],
          subItems: [
            { label: 'Manage Cycles', path: '/company/cycles', icon: IconCalendarEvent, feature: 'performance_management' },
            { label: 'Claim Categories', path: '/company/claims/categories', icon: IconReceipt2, feature: 'claim_process_management' },
          ],
        },
        {
          id: 'account',
          label: 'Account',
          icon: IconIdBadge,
          roles: ['COMPANY_ADMIN', 'HR'],
          subItems: [
            { label: 'Dashboard', path: '/employee/dashboard', icon: IconSmartHome },
            { label: 'My Profile', path: '/profile', icon: IconUser },
            { label: 'My Documents', path: '/my-documents', icon: IconFolderCheck, feature: 'employee_document_management' },
          ],
        },
      ];
    }

    // ==========================================
    // 3. EMPLOYEE & MANAGER SIDEBAR
    // ==========================================
    const isManagerUser = Boolean(user.isManager || (user as any)?._count?.reports > 0);

    return [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: IconSmartHome,
        roles: ['EMPLOYEE'],
        path: '/employee/dashboard',
      },
      ...(isManagerUser
        ? [
          {
            id: 'team_management',
            label: 'Team Management',
            icon: IconChecklist,
            roles: ['EMPLOYEE'] as UserRole[],
            subItems: [
              { label: 'Approvals Desk', path: '/company/approvals', icon: IconChecklist, requiresManager: true },
              { label: 'Expense Claims Review', path: '/company/claims/manage', icon: IconCash, requiresManager: true, feature: 'claim_process_management' },
              { label: 'Assigned Tickets', path: '/tickets/assigned', icon: IconHelpCircle, requiresManager: true, feature: 'support_ticket_management' },
              { label: 'Document Verification', path: '/company/documents/review', icon: IconFolderCheck, requiresManager: true, feature: 'employee_document_management' },
            ],
          },
        ]
        : []),
      {
        id: 'self_service',
        label: 'Self Service',
        icon: IconUser,
        roles: ['EMPLOYEE'],
        subItems: [
          { label: 'Attendance', path: '/attendance', icon: IconClock, feature: 'time_attendance_management' },
          { label: 'Leaves', path: '/leaves', icon: IconCalendarEvent, feature: 'leave_management' },
          { label: 'Comp Off', path: '/comp-off', icon: IconCalendarEvent, feature: 'comp_off_management' },
          { label: 'Payslips', path: '/payroll/my-payslips', icon: IconReceipt2, feature: 'payroll' },
          { label: 'Performance Goals', path: '/performance/my-goals', icon: IconTarget, feature: 'performance_management' },
          { label: 'Claims', path: '/claims', icon: IconCash, feature: 'claim_process_management' },
          { label: 'Tickets', path: '/tickets', icon: IconHelpCircle, feature: 'support_ticket_management' },
          { label: 'Org Structure', path: '/org-structure', icon: IconNetwork, feature: 'employees_directory' },
          { label: 'Policies', path: '/policies', icon: IconFileText, feature: 'policy_documents_management' },
          { label: 'Appreciations', path: '/appreciations', icon: IconHeartHandshake, feature: 'employee_appreciation' },
          { label: 'AI Assistant', path: '/assistant', icon: IconCpu, feature: 'ai_assistance' },
        ],
      },
      {
        id: 'account',
        label: 'Account',
        icon: IconIdBadge,
        roles: ['EMPLOYEE'],
        subItems: [
          { label: 'My Profile', path: '/profile', icon: IconUser },
          { label: 'My Documents', path: '/my-documents', icon: IconFolderCheck, feature: 'employee_document_management' },
        ],
      },
    ];

  }, [user]);

  if (!user) return null;

  // Filter categories and sub-items based on manager status & HR permissions
  const filteredCategories = categories
    .filter((cat) => cat.roles.includes(user.role))
    .map((cat) => {
      if (!cat.subItems) return cat;

      const validSubItems = cat.subItems.filter((sub) => {
        if (sub.roles && !sub.roles.includes(user.role)) return false;

        if (sub.requiresManager) {
          const isManagerOrAdmin = user.isManager || (user as any)?._count?.reports > 0 || user.role === 'COMPANY_ADMIN' || user.role === 'HR';
          if (!isManagerOrAdmin) return false;
        }

        if (sub.permission && user.role === 'HR') {
          if (!hasHrPermission(sub.permission)) return false;
        }

        return true;
      });

      return {
        ...cat,
        subItems: validSubItems,
      };
    })
    .filter((cat) => (cat.path ? true : (cat.subItems && cat.subItems.length > 0)));

  // Helper to determine if a sub-item is active
  const isSubItemActive = (subPath: string) => {
    if (location.pathname === subPath) return true;
    if (subPath !== '/' && location.pathname.startsWith(subPath + '/')) return true;
    if (
      subPath === '/company/approvals' &&
      [
        '/company/approvals',
        '/company/leaves/manage',
        '/attendance/regularizations/manage',
        '/company/comp-off/manage',
        '/performance/goals/manage',
      ].includes(location.pathname)
    ) {
      return true;
    }
    if (
      subPath === '/payroll/attendance-salary' &&
      ['/payroll/attendance-salary', '/payroll/dashboard'].includes(location.pathname)
    ) {
      return true;
    }
    return false;
  };

  // Identify active category from current path
  const activeCategoryId = useMemo(() => {
    for (const cat of filteredCategories) {
      if (cat.path && location.pathname === cat.path) {
        return cat.id;
      }
      if (cat.subItems) {
        const hasMatch = cat.subItems.some((sub) => isSubItemActive(sub.path));
        if (hasMatch) return cat.id;
      }
    }
    return null;
  }, [filteredCategories, location.pathname]);

  const checkFeature = (feat?: string) => {
    if (!feat) return true;
    if (hasFeature(feat)) return true;
    const aliasMap: Record<string, string[]> = {
      ai_assistance: ['ai_assistant'],
      ai_assistant: ['ai_assistance'],
      employee_appreciation: ['appreciations'],
      appreciations: ['employee_appreciation'],
      performance_management: ['performance'],
      performance: ['performance_management'],
      claim_process_management: ['claims'],
      claims: ['claim_process_management'],
      leave_management: ['leaves'],
      leaves: ['leave_management'],
      time_attendance_management: ['attendance'],
      attendance: ['time_attendance_management'],
      payroll_management: ['payroll'],
      payroll: ['payroll_management'],
      holiday_calendar: ['holidays'],
      holidays: ['holiday_calendar'],
      employee_document_management: ['documents'],
      documents: ['employee_document_management'],
      policy_documents_management: ['policies'],
      policies: ['policy_documents_management'],
      support_ticket_management: ['tickets'],
      tickets: ['support_ticket_management'],
      comp_off_management: ['comp_off', 'compensation_off'],
      comp_off: ['comp_off_management', 'compensation_off'],
      employees_directory: ['directory', 'org_structure'],
      directory: ['employees_directory'],
      compliance_management: ['compliance'],
      compliance: ['compliance_management'],
      reports_analytics: ['reports'],
      reports: ['reports_analytics'],
    };
    return (aliasMap[feat] || []).some((a) => hasFeature(a));
  };

  // Keep active category expanded by default
  useEffect(() => {
    if (activeCategoryId && activeCategoryId !== 'dashboard' && activeCategoryId !== 'company_dashboard') {
      setOpenCategoryId(activeCategoryId);
    }
  }, [activeCategoryId]);

  // Handle category click
  const handleCategoryClick = (cat: NavCategory) => {
    if (cat.path && (!cat.subItems || cat.subItems.length === 0)) {
      setOpenCategoryId(null);
      navigate(cat.path);
      return;
    }

    // Toggle downward accordion
    if (openCategoryId === cat.id) {
      setOpenCategoryId(null);
    } else {
      setOpenCategoryId(cat.id);
    }
  };

  return (
    <>
      <aside
        className={`${collapsed ? 'w-20' : 'w-64'
          } bg-white border-r border-slate-200/80 flex flex-col h-screen fixed left-0 top-0 z-30 select-none transition-all duration-200 shadow-2xs`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-center px-4 border-b border-slate-100 shrink-0">
          <span className="sr-only">UPTRIX HRMS</span>
          <div className="flex items-center justify-center min-w-0 w-full">
            {collapsed ? (
              <div className="w-9 h-9 rounded-xl bg-white border border-slate-200/80 p-0.5 flex items-center justify-center shadow-2xs shrink-0 overflow-hidden mx-auto">
                <img
                  src="/Uptrix_logo.png"
                  alt="Uptrix Logo"
                  className="h-full w-full object-cover object-left scale-105"
                />
              </div>
            ) : (
              <img
                src="/Uptrix_logo.png"
                alt="Uptrix Logo"
                className="h-8 max-h-8 w-auto max-w-[180px] object-contain mx-auto"
              />
            )}
          </div>
        </div>

        {/* Clean, Non-Scrolling Navigation List with Downward Accordion & Collapsed Flyouts */}
        <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-0.5 scrollbar-thin scrollbar-thumb-slate-200">
          {filteredCategories.map((cat) => {
            const Icon = cat.icon;
            const isCurrentActive = activeCategoryId === cat.id;
            const isSubMenuOpen = openCategoryId === cat.id;
            const isHighlighted = isCurrentActive || isSubMenuOpen;
            const hasChildren = Boolean(cat.subItems && cat.subItems.length > 0);

            return (
              <div key={cat.id} className="relative group">
                {/* Category Header Button */}
                <button
                  onClick={() => handleCategoryClick(cat)}
                  title={collapsed ? cat.label : undefined}
                  className={`w-full flex items-center ${collapsed ? 'justify-center px-2' : 'justify-between px-3'
                    } py-2.5 rounded-xl transition-all duration-150 group cursor-pointer text-left relative ${isHighlighted
                      ? 'bg-[#F0EEFF] text-[#5E4BE2] font-bold'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-50 font-medium'
                    }`}
                >
                  {/* Purple Vertical Accent Bar for active item */}
                  {isHighlighted && !collapsed && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#5E4BE2] rounded-r-md" />
                  )}

                  <div className="flex items-center gap-3 min-w-0">
                    <Icon
                      className={`w-5 h-5 shrink-0 transition-colors ${isHighlighted ? 'text-[#5E4BE2]' : 'text-slate-600 group-hover:text-slate-900'
                        }`}
                    />
                    {!collapsed && (
                      <span className="text-[13px] truncate tracking-tight">
                        {cat.label}
                      </span>
                    )}
                  </div>

                  {/* Down / Right Chevron Arrow */}
                  {!collapsed && (
                    <div>
                      {hasChildren ? (
                        isSubMenuOpen ? (
                          <IconChevronDown className="w-4 h-4 shrink-0 text-[#5E4BE2] transition-transform" />
                        ) : (
                          <IconChevronRight
                            className={`w-4 h-4 shrink-0 transition-colors ${isHighlighted
                              ? 'text-[#5E4BE2]'
                              : 'text-slate-400 group-hover:text-slate-600'
                              }`}
                          />
                        )
                      ) : isHighlighted ? (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#5E4BE2]" />
                      ) : null}
                    </div>
                  )}
                </button>

                {/* Collapsed Mode Floating Flyout Menu */}
                {collapsed && hasChildren && cat.subItems && (
                  <div className="hidden group-hover:block absolute left-full top-0 ml-2 z-50 bg-white border border-slate-200/90 rounded-2xl shadow-xl min-w-[210px] py-2 px-2 animate-in fade-in slide-in-from-left-2 duration-150">
                    <div className="px-3 py-1.5 border-b border-slate-100 mb-1 flex items-center gap-2 text-xs font-bold text-slate-800">
                      <Icon className="w-4 h-4 text-[#5E4BE2]" />
                      <span>{cat.label}</span>
                    </div>
                    <div className="space-y-0.5">
                      {cat.subItems.map((subItem) => {
                        const isLocked = subItem.feature && !checkFeature(subItem.feature);
                        const SubIcon = subItem.icon;
                        if (isLocked) {
                          return (
                            <button
                              key={subItem.path}
                              onClick={() => setLockedModal({ open: true, featureName: subItem.label })}
                              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50/50 text-xs font-semibold cursor-pointer text-left"
                            >
                              <div className="flex items-center gap-2 truncate">
                                <SubIcon className="w-3.5 h-3.5 text-slate-400" />
                                <span className="truncate">{subItem.label}</span>
                              </div>
                              <IconCrown className="w-3 h-3 text-amber-500 shrink-0 ml-1" />
                            </button>
                          );
                        }
                        const active = isSubItemActive(subItem.path);
                        return (
                          <NavLink
                            key={subItem.path}
                            to={subItem.path}
                            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${active ? 'bg-[#5E4BE2] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                              }`}
                          >
                            <SubIcon className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{subItem.label}</span>
                          </NavLink>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Downward Accordion Sub-Items */}
                {isSubMenuOpen && !collapsed && hasChildren && cat.subItems && (
                  <div className="mt-1 ml-4 pl-3.5 border-l-2 border-indigo-100/90 space-y-0.5 py-1 animate-in fade-in slide-in-from-top-1 duration-150">
                    {cat.subItems.map((subItem) => {
                      const isLocked = subItem.feature && !checkFeature(subItem.feature);
                      const SubIcon = subItem.icon;

                      if (isLocked) {
                        return (
                          <button
                            key={subItem.path}
                            onClick={() => setLockedModal({ open: true, featureName: subItem.label })}
                            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50/50 transition-all text-xs font-semibold group cursor-pointer text-left"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <SubIcon className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-500 shrink-0" />
                              <span className="truncate">{subItem.label}</span>
                            </div>
                            <div className="flex items-center text-amber-500 bg-amber-50 px-1 py-0.5 rounded text-[9px] font-bold gap-0.5 shrink-0">
                              <IconCrown className="w-3 h-3 text-amber-500" />
                            </div>
                          </button>
                        );
                      }

                      const active = isSubItemActive(subItem.path);

                      return (
                        <NavLink
                          key={subItem.path}
                          to={subItem.path}
                          end
                          className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all group ${active
                            ? 'bg-[#5E4BE2] text-white shadow-xs shadow-indigo-600/20'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                            }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <SubIcon
                              className={`w-3.5 h-3.5 shrink-0 transition-colors ${active ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'
                                }`}
                            />
                            <span className="truncate">{subItem.label}</span>
                          </div>
                          {active && (
                            <span className="w-1.5 h-1.5 rounded-full bg-white/90 shrink-0" />
                          )}
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </aside>

      {/* Feature Locked Modal */}
      <LockedFeatureModal
        isOpen={lockedModal.open}
        onClose={() => setLockedModal({ open: false })}
        featureName={lockedModal.featureName}
      />
    </>
  );
};

export default Sidebar;
