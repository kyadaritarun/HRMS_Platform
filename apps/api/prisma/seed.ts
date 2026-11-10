
import '../src/lib/database.js';
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Uptrix HRMS database...');

  // 1. Packages (3 Standard Plans)
  await prisma.package.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: 'Starter Plan',
      description: 'Essential HR foundation for small teams and growing startups',
      currency: 'INR',
      priceMonthly: 999,
      priceQuarterly: 2799,
      priceYearly: 9999,
      employeeLimit: 25,
      billingDefault: 'MONTHLY',
      enabledFeatures: ['time_attendance_management', 'leave_management'],
    },
  });

  await prisma.package.upsert({
    where: { id: 2 },
    update: {},
    create: {
      name: 'Professional Plan',
      description: 'Complete workforce management with claims, tickets, and shifts',
      currency: 'INR',
      priceMonthly: 2499,
      priceQuarterly: 6999,
      priceYearly: 24999,
      employeeLimit: 50,
      billingDefault: 'MONTHLY',
      enabledFeatures: [
        'time_attendance_management',
        'leave_management',
        'claims',
        'support_ticket_management',
        'appreciations',
        'shift_roster',
      ],
    },
  });

  await prisma.package.upsert({
    where: { id: 3 },
    update: {},
    create: {
      name: 'Enterprise Tier',
      description: 'Full-featured enterprise suite with payroll, performance, and AI',
      currency: 'INR',
      priceMonthly: 4999,
      priceQuarterly: 13999,
      priceYearly: 49999,
      employeeLimit: 100,
      billingDefault: 'MONTHLY',
      enabledFeatures: [
        'time_attendance_management',
        'attendance',
        'shift_roster',
        'shift_management',
        'leave_management',
        'leaves',
        'comp_off_management',
        'comp_off',
        'compensation_off',
        'holiday_calendar',
        'holidays',
        'payroll',
        'payroll_management',
        'loan_advances',
        'tax_declarations',
        'compliance_reports',
        'claim_process_management',
        'claims',
        'performance_management',
        'performance',
        'employee_appreciation',
        'appreciations',
        'policy_documents_management',
        'policies',
        'employee_document_management',
        'documents',
        'support_ticket_management',
        'tickets',
        'ai_assistance',
        'ai_assistant',
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
        'exit_management',
        'exits',
        'settlement',
        'company_goals',
        'goals',
        'departments',
        'department_management',
        'billing',
        'billing_management',
      ],
    },
  });

  // Reset sequence for Package table so autoincrement works seamlessly
  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('"Package"', 'id'), COALESCE((SELECT MAX(id) FROM "Package"), 1));`
  ).catch(() => {});

  // 2. Super Admin User (Platform Scope - companyId: null)
  const superAdminPass = await bcrypt.hash('SuperAdmin@123', 12);
  await prisma.user.upsert({
    where: { email: 'superadmin@uptrix.io' },
    update: {},
    create: {
      email: 'superadmin@uptrix.io',
      username: 'superadmin',
      passwordHash: superAdminPass,
      firstName: 'Apex',
      lastName: 'Superadmin',
      role: Role.PRODUCT_SUPER_ADMIN,
      companyId: null,
      mustChangePassword: false,
    },
  });

  console.log('Database seeded successfully!');
  console.log('1. Packages seeded: Starter Plan, Professional Plan, Enterprise Tier');
  console.log('2. Super Admin seeded: superadmin@uptrix.io / SuperAdmin@123');
  console.log('3. Companies list: Empty (Ready for fresh onboarding)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
