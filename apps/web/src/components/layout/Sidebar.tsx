import React, { useState, useEffect, useMemo } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, UserRole } from '../../context/AuthContext';
import { LockedFeatureModal } from '../LockedFeatureModal';
import {
  SidebarOpsVisibility,
  getSidebarOpsVisibility,
  SIDEBAR_OPS_EVENT,
} from '../../utils/sidebarPreferences';
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
  IconShieldCheck,
  IconSchool,
  IconGift,
} from '@tabler/icons-react';
import { HelplineDrawer } from '../HelplineDrawer';
import { NavCategory, SubMenuItem, getFilteredCategories } from './sidebarNavigation';

export type { SubMenuItem, NavCategory };

interface SidebarProps {
  collapsed?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed = false }) => {
  const { user, company, hasFeature, hasHrPermission } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [openCategoryId, setOpenCategoryId] = useState<string | null>(null);
  const [lockedModal, setLockedModal] = useState<{ open: boolean; featureName?: string }>({ open: false });
  const [isHelplineOpen, setIsHelplineOpen] = useState(false);

  // Company admin custom visibility preferences for operations modules
  const [sidebarOpsPrefs, setSidebarOpsPrefs] = useState<SidebarOpsVisibility>(() =>
    getSidebarOpsVisibility(user?.id, company?.settings)
  );

  useEffect(() => {
    setSidebarOpsPrefs(getSidebarOpsVisibility(user?.id, company?.settings));

    const handlePrefsChange = () => {
      setSidebarOpsPrefs(getSidebarOpsVisibility(user?.id, company?.settings));
    };

    window.addEventListener(SIDEBAR_OPS_EVENT, handlePrefsChange);
    window.addEventListener('storage', handlePrefsChange);

    return () => {
      window.removeEventListener(SIDEBAR_OPS_EVENT, handlePrefsChange);
      window.removeEventListener('storage', handlePrefsChange);
    };
  }, [user?.id, company?.settings]);

  if (!user) return null;

  // Filter categories and sub-items based on manager status & HR permissions & company admin preferences
  const filteredCategories = useMemo(() => {
    return getFilteredCategories(user, company, hasHrPermission, sidebarOpsPrefs);
  }, [user, company, hasHrPermission, sidebarOpsPrefs]);

  // Set of all registered sub-item paths
  const allSubPaths = useMemo(() => {
    const paths = new Set<string>();
    filteredCategories.forEach((cat) => {
      cat.subItems?.forEach((sub) => {
        if (sub.path) paths.add(sub.path);
      });
    });
    return paths;
  }, [filteredCategories]);

  // Helper to determine if a sub-item is active
  const isSubItemActive = (subPath: string) => {
    if (location.pathname === subPath) return true;

    // If another registered menu item exactly matches the current path (e.g. /company/employees/new),
    // do not greedily mark the parent prefix (/company/employees) as active.
    if (!allSubPaths.has(location.pathname) && subPath !== '/' && location.pathname.startsWith(subPath + '/')) {
      return true;
    }
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
    if (
      subPath === '/company/assets' &&
      ['/company/assets', '/company/assets-onboarding'].includes(location.pathname)
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
      employees_directory: ['directory', 'org_structure', 'employees'],
      directory: ['employees_directory', 'employees'],
      org_structure: ['employees_directory', 'directory'],
      employees: ['employees_directory', 'directory'],
      compliance_management: ['compliance'],
      compliance: ['compliance_management'],
      reports_analytics: ['reports'],
      reports: ['reports_analytics'],
      shift_management: ['shift_roster', 'shifts'],
      shift_roster: ['shift_management', 'shifts'],
      asset_management: ['assets'],
      assets: ['asset_management'],
      onboarding_management: ['onboarding'],
      onboarding: ['onboarding_management'],
      exit_management: ['exits', 'settlement'],
      exits: ['exit_management', 'settlement'],
      company_goals: ['goals'],
      goals: ['company_goals'],
      departments: ['department_management'],
      department_management: ['departments'],
      billing: ['billing_management'],
      billing_management: ['billing'],
      activity_logs: ['audit_logs', 'logs'],
      logs: ['activity_logs', 'audit_logs'],
      lead_referrals: ['referrals'],
      referrals: ['lead_referrals'],
      loan_advances: ['loans', 'payroll'],
      loans: ['loan_advances', 'payroll'],
      tax_declarations: ['tax', 'payroll'],
      tax: ['tax_declarations', 'payroll'],
      it_operations: ['asset_management', 'onboarding_management'],
      finance_operations: ['payroll', 'compliance_management'],
      hr_operations: ['leave_management', 'time_attendance_management'],
      leave_types: ['leave_management'],
      appraisal_cycles: ['performance', 'performance_management'],
      salary_master: ['payroll'],
      form16_tax: ['tax_declarations', 'payroll'],
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
              <div className="w-9 h-9 rounded-xl bg-white border border-slate-200/80 p-1 flex items-center justify-center shadow-2xs shrink-0 overflow-hidden mx-auto">
                <img
                  src="/logo-icon.png"
                  alt="Uptrix Logo"
                  className="h-full w-full object-contain"
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
                              : 'text-slate-500 group-hover:text-slate-600'
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
                              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50/50 text-xs font-semibold cursor-pointer text-left"
                            >
                              <div className="flex items-center gap-2 truncate">
                                <SubIcon className="w-3.5 h-3.5 text-slate-500 font-medium" />
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
                            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50/50 transition-all text-xs font-semibold group cursor-pointer text-left"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <SubIcon className="w-3.5 h-3.5 text-slate-500 font-medium group-hover:text-amber-500 shrink-0" />
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
                              className={`w-3.5 h-3.5 shrink-0 transition-colors ${active ? 'text-white' : 'text-slate-500 group-hover:text-slate-600'
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

        {/* Pinned Helpline & Support Footer - Hidden for Super Admin */}
        {user?.role !== 'PRODUCT_SUPER_ADMIN' && (
          <div className="p-2.5 border-t border-slate-100 bg-slate-50/50 shrink-0">
            {collapsed ? (
              <button
                type="button"
                onClick={() => setIsHelplineOpen(true)}
                className="w-10 h-10 mx-auto rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 border border-indigo-100/80 text-[#5E4BE2] flex items-center justify-center transition-all shadow-2xs group cursor-pointer"
                title="Helpline & Contact Us"
              >
                <IconHeadset className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsHelplineOpen(true)}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-gradient-to-r from-indigo-50/70 via-purple-50/40 to-slate-50 border border-indigo-100/70 hover:border-indigo-200 text-slate-800 transition-all cursor-pointer group shadow-2xs text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#5E4BE2] to-[#4938CA] text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                  <IconHeadset className="w-4.5 h-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 group-hover:text-[#5E4BE2] transition-colors">
                      Helpline
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Support
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                    Contact us &amp; emergency info
                  </p>
                </div>
              </button>
            )}
          </div>
        )}
      </aside>

      {/* Feature Locked Modal */}
      <LockedFeatureModal
        isOpen={lockedModal.open}
        onClose={() => setLockedModal({ open: false })}
        featureName={lockedModal.featureName}
      />

      {/* Helpline Slide-over Drawer - Hidden for Super Admin */}
      {user?.role !== 'PRODUCT_SUPER_ADMIN' && (
        <HelplineDrawer
          isOpen={isHelplineOpen}
          onClose={() => setIsHelplineOpen(false)}
        />
      )}
    </>
  );
};

export default Sidebar;
