import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ALL_FEATURES = [
  // Attendance & Time
  'time_attendance_management',
  'attendance',
  'shift_roster',
  'shift_management',
  // Leaves & Comp-off
  'leave_management',
  'leaves',
  'comp_off_management',
  'comp_off',
  'compensation_off',
  'holiday_calendar',
  'holidays',
  // Payroll & Compensation
  'payroll',
  'payroll_management',
  'loan_advances',
  'tax_declarations',
  'compliance_reports',
  // Claims & Expenses
  'claim_process_management',
  'claims',
  // Performance & Recognition
  'performance_management',
  'performance',
  'employee_appreciation',
  'appreciations',
  // Documents & Policies
  'policy_documents_management',
  'policies',
  'employee_document_management',
  'documents',
  // Support, Tickets & AI
  'support_ticket_management',
  'tickets',
  'ai_assistance',
  'ai_assistant',
  // Organization, Onboarding & Assets
  'employees_directory',
  'directory',
  'org_structure',
  'asset_management',
  'assets',
  'onboarding_management',
  'onboarding',
  'employee_training',
  'background_verification',
  'activity_logs',
  'lead_referrals',
  'referrals',
  'compliance_management',
  'compliance',
  'reports_analytics',
  'reports',
];

async function main() {
  console.log('[Activate Sidebar] Updating packages with all features...');

  // 1. Update Enterprise Tier package (and other packages if appropriate)
  const packages = await prisma.package.findMany();
  for (const pkg of packages) {
    const updatedPkg = await prisma.package.update({
      where: { id: pkg.id },
      data: {
        enabledFeatures: ALL_FEATURES,
      },
    });
    console.log(`- Updated package "${updatedPkg.name}" (ID: ${updatedPkg.id}) with ${ALL_FEATURES.length} features.`);
  }

  // 2. Ensure Uptrix Technologies company has the Enterprise package and sidebarOperations: true
  const company = await prisma.company.findFirst({
    where: { code: 'UPTRIX' },
  });

  if (!company) {
    console.error('Company Uptrix Technologies not found!');
    return;
  }

  const enterprisePkg = await prisma.package.findFirst({
    where: { name: { contains: 'Enterprise', mode: 'insensitive' } },
  }) || packages[packages.length - 1];

  const currentSettings = (company.settings as Record<string, any>) || {};
  const updatedSettings = {
    ...currentSettings,
    sidebarOperations: {
      hr_operations: true,
      it_operations: true,
      finance_operations: true,
    },
  };

  const updatedCompany = await prisma.company.update({
    where: { id: company.id },
    data: {
      packageId: enterprisePkg.id,
      isActive: true,
      subIsActive: true,
      settings: updatedSettings,
    },
    include: {
      package: true,
    },
  });

  console.log(`[Activate Sidebar] Company "${updatedCompany.name}" (ID: ${updatedCompany.id}) updated:`);
  console.log(`  Package: ${updatedCompany.package?.name} (ID: ${updatedCompany.packageId})`);
  console.log(`  Settings.sidebarOperations:`, updatedCompany.settings);

  // 3. Grant full hrPermissions to Alekhya (HR)
  const hrUser = await prisma.user.findFirst({
    where: { email: 'alekhya@uptrixglobal.com' },
  });
  if (hrUser) {
    await prisma.user.update({
      where: { id: hrUser.id },
      data: {
        hrPermissions: ['employees', 'attendance', 'payroll', 'leaves', 'reports', 'settings', 'all'],
      },
    });
    console.log(`[Activate Sidebar] Updated HR permissions for ${hrUser.email}`);
  }

  console.log('[Activate Sidebar] Successfully activated all sidebar features and operations for Uptrix Technologies!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

