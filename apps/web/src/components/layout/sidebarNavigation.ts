import React from 'react';
import { UserRole } from '../../context/AuthContext';
import { SidebarOpsVisibility } from '../../utils/sidebarPreferences';
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
  IconBriefcase,
  IconNetwork,
  IconFileCertificate,
  IconChecklist,
  IconHeartHandshake,
  IconHelpCircle,
  IconCreditCard,
  IconHistory,
  IconSparkles,
  IconBuildingSkyscraper,
  IconPackage,
  IconIdBadge,
  IconMail,
  IconShieldLock,
  IconDoorExit,
  IconBuildingBank,
  IconDevices,
  IconChartPie,
  IconPigMoney,
  IconHeadset,
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
  path?: string;
  subItems?: SubMenuItem[];
}

export interface SearchableSidebarItem {
  id: string;
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  category: string;
}

export function getSidebarCategories(user: any): NavCategory[] {
  if (!user) return [];

  // 1. PRODUCT SUPER ADMIN SIDEBAR
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
        id: 'helpline',
        label: 'Global Helpline',
        icon: IconHeadset,
        roles: ['PRODUCT_SUPER_ADMIN'],
        path: '/super-admin/helpline',
      },
      {
        id: 'admins',
        label: 'Super Administrators',
        icon: IconShieldLock,
        roles: ['PRODUCT_SUPER_ADMIN'],
        path: '/super-admin/super-admins/add',
      },
    ];
  }

  // 2. COMPANY ADMIN & HR & FINANCE & IT SIDEBAR
  if (user.role === 'COMPANY_ADMIN' || user.role === 'HR' || user.role === 'FINANCE' || user.role === 'IT') {
    return [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: IconSmartHome,
        roles: ['COMPANY_ADMIN', 'HR', 'FINANCE', 'IT'],
        path: '/employee/dashboard',
      },
      {
        id: 'self_service',
        label: 'Self Service',
        icon: IconUser,
        roles: ['COMPANY_ADMIN', 'HR', 'FINANCE', 'IT'],
        subItems: [
          { label: 'Attendance', path: '/attendance', icon: IconClock, feature: 'time_attendance_management' },
          { label: 'Leaves', path: '/leaves', icon: IconCalendarEvent, feature: 'leave_management' },
          { label: 'Comp Off', path: '/comp-off', icon: IconCalendarEvent, feature: 'comp_off_management' },
          { label: 'Payslips', path: '/payroll/my-payslips', icon: IconReceipt2, feature: 'payroll' },
          { label: 'Claims', path: '/claims', icon: IconCash, feature: 'claim_process_management' },
          { label: 'Loans & Advances', path: '/loans-advances', icon: IconPigMoney, feature: 'loan_advances' },
          { label: 'Tax Declarations', path: '/tax-declarations', icon: IconFileCertificate, feature: 'tax_declarations' },
          { label: 'Performance Goals', path: '/performance/my-goals', icon: IconTarget, feature: 'performance_management' },
          { label: 'Appreciations', path: '/appreciations', icon: IconHeartHandshake, feature: 'employee_appreciation' },
          { label: 'Org Structure', path: '/company/roles-hierarchy', icon: IconNetwork, feature: 'employees_directory' },
          { label: 'Policies', path: '/policies', icon: IconFileText, feature: 'policy_documents_management' },
          { label: 'My Documents', path: '/my-documents', icon: IconFolderCheck, feature: 'employee_document_management' },
          { label: 'Tickets', path: '/tickets', icon: IconHelpCircle, feature: 'support_ticket_management' },
          { label: 'AI Assistant', path: '/assistant', icon: IconSparkles, feature: 'ai_assistance' },
          { label: 'Employee Referrals', path: '/referrals', icon: IconBriefcase, feature: 'lead_referrals' },
        ],
      },
      {
        id: 'assigned_to_me',
        label: 'Assigned To Me',
        icon: IconChecklist,
        roles: ['COMPANY_ADMIN', 'HR', 'FINANCE', 'IT'],
        subItems: [
          { label: 'Approval Requests', path: '/company/approvals', icon: IconChecklist },
          { label: 'Claims Review', path: '/company/claims/manage', icon: IconCash, feature: 'claim_process_management', roles: ['COMPANY_ADMIN', 'HR', 'FINANCE'] },
          { label: 'Tickets', path: '/tickets/assigned', icon: IconHelpCircle, feature: 'support_ticket_management' },
          { label: 'Document Review', path: '/company/documents/review', icon: IconFolderCheck, feature: 'employee_document_management' },
        ],
      },
      {
        id: 'company',
        label: 'Company',
        icon: IconBuildingSkyscraper,
        roles: ['COMPANY_ADMIN'],
        subItems: [
          { label: 'Company Dashboard', path: '/company/dashboard', icon: IconSmartHome, roles: ['COMPANY_ADMIN'] },
          { label: 'Company Goals', path: '/company/goals', icon: IconTarget, roles: ['COMPANY_ADMIN'], feature: 'company_goals' },
          { label: 'Create Employee', path: '/company/employees/new', icon: IconUserPlus, permission: 'employees', roles: ['COMPANY_ADMIN', 'HR'], feature: 'employees_directory' },
          { label: 'Add-on Services', path: '/company/addon-services', icon: IconSparkles, roles: ['COMPANY_ADMIN', 'HR'] },
          { label: 'Billing', path: '/company/billing', icon: IconCreditCard, roles: ['COMPANY_ADMIN'], feature: 'billing' },
          { label: 'Activity Logs', path: '/company/activity-logs', icon: IconHistory, roles: ['COMPANY_ADMIN'], feature: 'activity_logs' },
        ],
      },
      {
        id: 'hr_operations',
        label: 'HR Operations',
        icon: IconBriefcase,
        roles: ['COMPANY_ADMIN', 'HR'],
        subItems: [
          { label: 'Departments', path: '/company/departments', icon: IconBriefcase, feature: 'departments' },
          { label: 'Shift Management', path: '/company/shift-roster', icon: IconClock, feature: 'shift_management' },
          { label: 'Holiday Calendar', path: '/company/holidays', icon: IconCalendarEvent, feature: 'holiday_calendar' },
          { label: 'Leave Types', path: '/company/leaves/types', icon: IconFileCertificate, feature: 'leave_management' },
          { label: 'Manage Policies', path: '/company/policies/manage', icon: IconFileText, feature: 'policy_documents_management' },
          { label: 'Create Employee', path: '/company/employees/new', icon: IconUserPlus, permission: 'employees', roles: ['HR'], feature: 'employees_directory' },
          { label: 'Employees', path: '/company/employees', icon: IconUsers, permission: 'employees', feature: 'employees_directory' },
          { label: 'Employee Attendance', path: '/company/attendance', icon: IconClock, permission: 'attendance', feature: 'time_attendance_management' },
          { label: 'Manage Cycles', path: '/company/cycles', icon: IconCalendarEvent, feature: 'performance_management' },
          { label: 'Claim Categories', path: '/company/claims/categories', icon: IconReceipt2, feature: 'claim_process_management' },
          { label: 'Activity Logs', path: '/company/activity-logs', icon: IconHistory, roles: ['HR'], feature: 'activity_logs' },
        ],
      },
      {
        id: 'it_operations',
        label: 'IT Operations',
        icon: IconDevices,
        roles: ['COMPANY_ADMIN', 'IT'],
        subItems: [
          { label: 'Assets', path: '/company/assets', icon: IconDevices, feature: 'asset_management' },
          { label: 'Onboarding', path: '/company/onboarding', icon: IconChecklist, feature: 'onboarding_management' },
        ],
      },
      {
        id: 'finance_operations',
        label: 'Finance Operations',
        icon: IconCash,
        roles: ['COMPANY_ADMIN', 'FINANCE'],
        subItems: [
          { label: 'Finance Analytics', path: '/payroll/analytics', icon: IconChartPie, feature: 'payroll' },
          { label: 'Attendance & Salary', path: '/payroll/attendance-salary', icon: IconClock, feature: 'payroll' },
          { label: 'Salary Master', path: '/payroll/salaries', icon: IconReceipt2, feature: 'payroll' },
          { label: 'Loans & Advances', path: '/payroll/loans-advances', icon: IconPigMoney, feature: 'payroll' },
          { label: 'Tax Proofs & Form 16', path: '/payroll/tax-declarations', icon: IconFileCertificate, feature: 'payroll' },
          { label: 'Compliance & Bank Payout', path: '/payroll/compliance-reports', icon: IconBuildingBank, feature: 'payroll' },
          { label: 'Exit & F&F Settlement', path: '/company/exits', icon: IconDoorExit, feature: 'exit_management' },
        ],
      },
    ];
  }

  // 3. EMPLOYEE & MANAGER SIDEBAR
  const isManagerUser = Boolean(user.isManager || (user as any)?._count?.reports > 0);

  return [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: IconSmartHome,
      roles: ['EMPLOYEE'],
      path: '/employee/dashboard',
    },
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
        { label: 'Claims', path: '/claims', icon: IconCash, feature: 'claim_process_management' },
        { label: 'Loans & Advances', path: '/loans-advances', icon: IconPigMoney, feature: 'loan_advances' },
        { label: 'Tax Declarations', path: '/tax-declarations', icon: IconFileCertificate, feature: 'tax_declarations' },
        { label: 'Performance Goals', path: '/performance/my-goals', icon: IconTarget, feature: 'performance_management' },
        { label: 'Appreciations', path: '/appreciations', icon: IconHeartHandshake, feature: 'employee_appreciation' },
        { label: 'Org Structure', path: '/company/roles-hierarchy', icon: IconNetwork, feature: 'employees_directory' },
        { label: 'Policies', path: '/policies', icon: IconFileText, feature: 'policy_documents_management' },
        { label: 'My Documents', path: '/my-documents', icon: IconFolderCheck, feature: 'employee_document_management' },
        { label: 'Tickets', path: '/tickets', icon: IconHelpCircle, feature: 'support_ticket_management' },
        { label: 'AI Assistant', path: '/assistant', icon: IconSparkles, feature: 'ai_assistance' },
        { label: 'Employee Referrals', path: '/referrals', icon: IconBriefcase, feature: 'lead_referrals' },
      ],
    },
    ...(isManagerUser
      ? [
          {
            id: 'assigned_to_me',
            label: 'Assigned To Me',
            icon: IconChecklist,
            roles: ['EMPLOYEE'] as UserRole[],
            subItems: [
              { label: 'Team Attendance', path: '/company/team-attendance', icon: IconClock, requiresManager: true, feature: 'time_attendance_management' },
              { label: 'Approvals Desk', path: '/company/approvals', icon: IconChecklist, requiresManager: true },
              { label: 'Expense Claims Review', path: '/company/claims/manage', icon: IconCash, requiresManager: true, feature: 'claim_process_management' },
              { label: 'Assigned Tickets', path: '/tickets/assigned', icon: IconHelpCircle, requiresManager: true, feature: 'support_ticket_management' },
            ],
          },
        ]
      : []),
  ];
}

export function getFilteredCategories(
  user: any,
  company: any,
  hasHrPermission: (perm: string) => boolean,
  sidebarOpsPrefs: SidebarOpsVisibility
): NavCategory[] {
  if (!user) return [];
  const categories = getSidebarCategories(user);

  return categories
    .filter((cat) => cat.roles.includes(user.role))
    .filter((cat) => {
      if (user.role === 'COMPANY_ADMIN') {
        const pkgFeatures = (company?.package?.enabledFeatures as string[]) || [];

        if (cat.id === 'hr_operations') {
          if (!sidebarOpsPrefs.hr_operations) return false;
          if (pkgFeatures.length > 0 && !pkgFeatures.some((f) => ['hr_operations', 'leave_management', 'time_attendance_management'].includes(f))) {
            return false;
          }
        }
        if (cat.id === 'it_operations') {
          if (!sidebarOpsPrefs.it_operations) return false;
          if (pkgFeatures.length > 0 && !pkgFeatures.some((f) => ['it_operations', 'asset_management', 'onboarding_management'].includes(f))) {
            return false;
          }
        }
        if (cat.id === 'finance_operations') {
          if (!sidebarOpsPrefs.finance_operations) return false;
          if (pkgFeatures.length > 0 && !pkgFeatures.some((f) => ['finance_operations', 'payroll'].includes(f))) {
            return false;
          }
        }
      }
      return true;
    })
    .map((cat) => {
      if (!cat.subItems) return cat;

      const validSubItems = cat.subItems.filter((sub) => {
        if (sub.roles && !sub.roles.includes(user.role)) return false;

        if (sub.requiresManager) {
          const isManagerOrAdmin =
            user.isManager || (user as any)?._count?.reports > 0 || user.role === 'COMPANY_ADMIN' || user.role === 'HR';
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
}

export function getSearchableSidebarItems(categories: NavCategory[]): SearchableSidebarItem[] {
  const items: SearchableSidebarItem[] = [];
  const seenPaths = new Set<string>();

  categories.forEach((cat) => {
    if (cat.path && !seenPaths.has(cat.path)) {
      seenPaths.add(cat.path);
      items.push({
        id: cat.id,
        label: cat.label,
        path: cat.path,
        icon: cat.icon,
        category: cat.label,
      });
    }

    cat.subItems?.forEach((sub) => {
      if (sub.path && !seenPaths.has(sub.path)) {
        seenPaths.add(sub.path);
        items.push({
          id: `${cat.id}-${sub.path}`,
          label: sub.label,
          path: sub.path,
          icon: sub.icon,
          category: cat.label,
        });
      }
    });
  });

  return items;
}

