import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';

// Auth Pages
import { LoginPage } from './pages/auth/LoginPage';
import { ChangePasswordPage } from './pages/auth/ChangePasswordPage';
import { HostedPaymentPage } from './pages/checkout/HostedPaymentPage';

// Super Admin Pages
import { SuperAdminDashboard } from './pages/superadmin/SuperAdminDashboard';
import { CompaniesPage } from './pages/superadmin/CompaniesPage';
import { AddCompanyPage } from './pages/superadmin/AddCompanyPage';
import { PackagesPage } from './pages/superadmin/PackagesPage';
import { InvoicesPage } from './pages/superadmin/InvoicesPage';
import { RenewalsPage } from './pages/superadmin/RenewalsPage';
import { InfrastructurePage } from './pages/superadmin/InfrastructurePage';
import { AddSuperAdminPage } from './pages/superadmin/AddSuperAdminPage';
import { EmailsPage } from './pages/superadmin/EmailsPage';

// Company Management Pages
import { CompanyDashboard } from './pages/company/CompanyDashboard';
import { EmployeesPage } from './pages/company/EmployeesPage';
import { NewEmployeePage } from './pages/company/NewEmployeePage';
import { DepartmentsPage } from './pages/company/DepartmentsPage';
import { HolidaysPage } from './pages/company/HolidaysPage';
import { LeaveTypesPage } from './pages/company/LeaveTypesPage';
import { CompanyAttendancePage } from './pages/attendance/CompanyAttendancePage';
import { CompanyBillingPage } from './pages/company/CompanyBillingPage';
import { ActivityLogsPage } from './pages/company/ActivityLogsPage';

// Employee & Self Service Pages
import { EmployeeDashboard } from './pages/employee/EmployeeDashboard';
import { MyAttendancePage } from './pages/attendance/MyAttendancePage';
import { MyLeavesPage } from './pages/requests/MyLeavesPage';
import { MyCompOffPage } from './pages/requests/MyCompOffPage';
import { ApprovalsDeskPage } from './pages/requests/ApprovalsDeskPage';
import { ClaimsPage } from './pages/requests/ClaimsPage';
import { AttendanceSalaryPage } from './pages/payroll/AttendanceSalaryPage';
import { SalaryMasterPage } from './pages/payroll/SalaryMasterPage';
import { MyPayslipsPage } from './pages/payroll/MyPayslipsPage';
import { TicketsPage } from './pages/tickets/TicketsPage';
import { PoliciesPage } from './pages/policies/PoliciesPage';
import { ManagePoliciesPage } from './pages/policies/ManagePoliciesPage';
import { AppreciationsPage } from './pages/appreciations/AppreciationsPage';
import { OrgStructurePage } from './pages/org/OrgStructurePage';
import { AssistantPage } from './pages/assistant/AssistantPage';
import { ProfilePage } from './pages/profile/ProfilePage';
import { DocumentReviewPage } from './pages/company/DocumentReviewPage';
import { MyDocumentsPage } from './pages/documents/MyDocumentsPage';
import { PerformanceGoalsPage } from './pages/performance/PerformanceGoalsPage';
import { RolesHierarchyPage } from './pages/company/RolesHierarchyPage';
import { ManageCyclesPage } from './pages/company/ManageCyclesPage';
import { ClaimCategoriesPage } from './pages/company/ClaimCategoriesPage';
import { OfferLettersPage } from './pages/company/OfferLettersPage';
import { ExitManagementPage } from './pages/company/ExitManagementPage';
import { HrLettersPage } from './pages/company/HrLettersPage';
import { ComplianceReportsPage } from './pages/payroll/ComplianceReportsPage';
import { ShiftRosterPage } from './pages/company/ShiftRosterPage';
import { AssetsOnboardingPage } from './pages/company/AssetsOnboardingPage';

// Helper placeholder for minor system logs
const SystemNoticePage: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => (
  <div className="p-8 bg-white rounded-3xl border border-slate-200/80 shadow-xs text-center max-w-2xl mx-auto my-12">
    <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto mb-4 font-bold text-lg">
      ✓
    </div>
    <h2 className="text-xl font-bold text-slate-900 mb-2">{title}</h2>
    <p className="text-xs text-slate-500 mb-6">
      {subtitle || 'This module is connected and operational.'}
    </p>
  </div>
);

const RootRedirect: React.FC = () => {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.mustChangePassword) return <Navigate to="/change-password" replace />;
  if (user.role === 'PRODUCT_SUPER_ADMIN') return <Navigate to="/super-admin/dashboard" replace />;
  if (user.role === 'COMPANY_ADMIN' || user.role === 'HR') return <Navigate to="/company/dashboard" replace />;
  return <Navigate to="/employee/dashboard" replace />;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <Routes>
          {/* Public Auth & Checkout Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/change-password" element={<ChangePasswordPage />} />
          <Route path="/checkout/pay" element={<HostedPaymentPage />} />

          {/* Root Redirect */}
          <Route path="/" element={<RootRedirect />} />

          {/* Protected Main Layout */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            {/* Super Admin */}
            <Route
              path="/super-admin/dashboard"
              element={
                <ProtectedRoute allowedRoles={['PRODUCT_SUPER_ADMIN']}>
                  <SuperAdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/companies"
              element={
                <ProtectedRoute allowedRoles={['PRODUCT_SUPER_ADMIN']}>
                  <CompaniesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/companies/add"
              element={
                <ProtectedRoute allowedRoles={['PRODUCT_SUPER_ADMIN']}>
                  <AddCompanyPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/companies/new"
              element={
                <ProtectedRoute allowedRoles={['PRODUCT_SUPER_ADMIN']}>
                  <AddCompanyPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/packages"
              element={
                <ProtectedRoute allowedRoles={['PRODUCT_SUPER_ADMIN']}>
                  <PackagesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/invoices"
              element={
                <ProtectedRoute allowedRoles={['PRODUCT_SUPER_ADMIN']}>
                  <InvoicesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/renewals-billing"
              element={
                <ProtectedRoute allowedRoles={['PRODUCT_SUPER_ADMIN']}>
                  <RenewalsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/infrastructure/servers"
              element={
                <ProtectedRoute allowedRoles={['PRODUCT_SUPER_ADMIN']}>
                  <InfrastructurePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/super-admins/add"
              element={
                <ProtectedRoute allowedRoles={['PRODUCT_SUPER_ADMIN']}>
                  <AddSuperAdminPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/emails"
              element={
                <ProtectedRoute allowedRoles={['PRODUCT_SUPER_ADMIN']}>
                  <EmailsPage />
                </ProtectedRoute>
              }
            />

            {/* Company Admin & HR Management */}
            <Route
              path="/company/dashboard"
              element={
                <ProtectedRoute allowedRoles={['COMPANY_ADMIN', 'HR']}>
                  <CompanyDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/company/employees"
              element={
                <ProtectedRoute allowedRoles={['COMPANY_ADMIN', 'HR']}>
                  <EmployeesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/company/employees/new"
              element={
                <ProtectedRoute allowedRoles={['COMPANY_ADMIN', 'HR']}>
                  <NewEmployeePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/company/offer-letters"
              element={
                <ProtectedRoute allowedRoles={['COMPANY_ADMIN', 'HR']}>
                  <OfferLettersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/company/exits"
              element={
                <ProtectedRoute allowedRoles={['COMPANY_ADMIN', 'HR']}>
                  <ExitManagementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/company/hr-letters"
              element={
                <ProtectedRoute allowedRoles={['COMPANY_ADMIN', 'HR']}>
                  <HrLettersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/company/shift-roster"
              element={
                <ProtectedRoute allowedRoles={['COMPANY_ADMIN', 'HR']}>
                  <ShiftRosterPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/company/assets-onboarding"
              element={
                <ProtectedRoute allowedRoles={['COMPANY_ADMIN', 'HR']}>
                  <AssetsOnboardingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/company/attendance"
              element={
                <ProtectedRoute allowedRoles={['COMPANY_ADMIN', 'HR']}>
                  <CompanyAttendancePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/company/departments"
              element={
                <ProtectedRoute allowedRoles={['COMPANY_ADMIN', 'HR']}>
                  <DepartmentsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/company/holidays"
              element={
                <ProtectedRoute allowedRoles={['COMPANY_ADMIN', 'HR']}>
                  <HolidaysPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/company/leaves/types"
              element={
                <ProtectedRoute allowedRoles={['COMPANY_ADMIN', 'HR']}>
                  <LeaveTypesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/company/policies/manage"
              element={
                <ProtectedRoute allowedRoles={['COMPANY_ADMIN', 'HR']}>
                  <ManagePoliciesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/company/tickets/manage"
              element={
                <ProtectedRoute allowedRoles={['COMPANY_ADMIN', 'HR']}>
                  <TicketsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/company/billing"
              element={
                <ProtectedRoute allowedRoles={['COMPANY_ADMIN']}>
                  <CompanyBillingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/company/activity-logs"
              element={
                <ProtectedRoute allowedRoles={['COMPANY_ADMIN']}>
                  <ActivityLogsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/company/roles-hierarchy"
              element={
                <ProtectedRoute allowedRoles={['COMPANY_ADMIN', 'HR', 'EMPLOYEE']}>
                  <RolesHierarchyPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/roles-hierarchy"
              element={
                <ProtectedRoute allowedRoles={['COMPANY_ADMIN', 'HR', 'EMPLOYEE']}>
                  <RolesHierarchyPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/company/cycles"
              element={
                <ProtectedRoute allowedRoles={['COMPANY_ADMIN', 'HR']}>
                  <ManageCyclesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/company/claims/categories"
              element={
                <ProtectedRoute allowedRoles={['COMPANY_ADMIN', 'HR']}>
                  <ClaimCategoriesPage />
                </ProtectedRoute>
              }
            />

            {/* Approvals Desk */}
            <Route path="/company/approvals" element={<ApprovalsDeskPage />} />
            <Route path="/company/leaves/manage" element={<ApprovalsDeskPage />} />
            <Route path="/attendance/regularizations/manage" element={<ApprovalsDeskPage />} />
            <Route path="/company/comp-off/manage" element={<ApprovalsDeskPage />} />
            <Route path="/company/claims/manage" element={<ClaimsPage />} />
            <Route path="/performance/goals/manage" element={<ApprovalsDeskPage />} />
            <Route path="/tickets/assigned" element={<TicketsPage />} />
            <Route
              path="/company/documents/review"
              element={
                <ProtectedRoute allowedRoles={['COMPANY_ADMIN', 'HR']}>
                  <DocumentReviewPage />
                </ProtectedRoute>
              }
            />

            {/* Payroll Engine - Monthly Attendance & Salary Calculation */}
            <Route
              path="/payroll/attendance-salary"
              element={
                <ProtectedRoute allowedRoles={['COMPANY_ADMIN', 'HR']}>
                  <AttendanceSalaryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payroll/dashboard"
              element={<Navigate to="/payroll/attendance-salary" replace />}
            />
            <Route
              path="/payroll/salaries"
              element={
                <ProtectedRoute allowedRoles={['COMPANY_ADMIN', 'HR']}>
                  <SalaryMasterPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payroll/salary-master"
              element={
                <ProtectedRoute allowedRoles={['COMPANY_ADMIN', 'HR']}>
                  <SalaryMasterPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payroll/compliance-reports"
              element={
                <ProtectedRoute allowedRoles={['COMPANY_ADMIN', 'HR']}>
                  <ComplianceReportsPage />
                </ProtectedRoute>
              }
            />

            {/* Self Service (All roles: Admin, HR, Employee) */}
            <Route path="/employee/dashboard" element={<EmployeeDashboard />} />
            <Route path="/attendance" element={<MyAttendancePage />} />
            <Route path="/leaves" element={<MyLeavesPage />} />
            <Route path="/comp-off" element={<MyCompOffPage />} />
            <Route path="/claims" element={<ClaimsPage />} />
            <Route path="/tickets" element={<TicketsPage />} />
            <Route path="/payroll/my-payslips" element={<MyPayslipsPage />} />
            <Route path="/payroll/payslips" element={<MyPayslipsPage />} />
            <Route path="/payslips" element={<MyPayslipsPage />} />
            <Route path="/performance/my-goals" element={<PerformanceGoalsPage />} />
            <Route path="/performance/goals" element={<PerformanceGoalsPage />} />
            <Route path="/performance" element={<PerformanceGoalsPage />} />
            <Route path="/my-goals" element={<PerformanceGoalsPage />} />
            <Route path="/org-structure" element={<OrgStructurePage />} />
            <Route path="/policies" element={<PoliciesPage />} />
            <Route path="/appreciations" element={<AppreciationsPage />} />
            <Route path="/assistant" element={<AssistantPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/my-documents" element={<MyDocumentsPage />} />
          </Route>

          {/* Catch all */}
          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
