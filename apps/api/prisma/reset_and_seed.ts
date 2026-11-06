import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function resetAndSeed() {
  const schema = process.env.DB_SCHEMA || 'HRMS_test';
  console.log(`[Reset & Seed] Target schema: "${schema}"`);

  // 1. Find all tables in the target schema (excluding prisma migrations if any)
  const tables: Array<{ tablename: string }> = await prisma.$queryRawUnsafe(
    `SELECT tablename FROM pg_tables WHERE schemaname = $1 AND tablename NOT LIKE '_prisma%'`,
    schema
  );

  console.log(`[Reset & Seed] Found ${tables.length} tables in "${schema}". Truncating with CASCADE...`);

  if (tables.length > 0) {
    const tableList = tables.map((t) => `"${schema}"."${t.tablename}"`).join(', ');
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE;`);
    console.log(`[Reset & Seed] Successfully truncated all tables and reset identity sequences.`);
  }

  // 2. Seed Standard Packages
  console.log(`[Reset & Seed] Seeding standard packages...`);
  await prisma.package.createMany({
    data: [
      {
        id: 1,
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
      {
        id: 2,
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
      {
        id: 3,
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
          'leave_management',
          'support_ticket_management',
          'payroll',
          'performance',
          'claims',
          'appreciations',
          'ai_assistant',
          'shift_roster',
          'comp_off',
        ],
      },
    ],
  });

  // 3. Seed Super Admin User
  console.log(`[Reset & Seed] Seeding Super Admin user...`);
  const superAdminPass = await bcrypt.hash('SuperAdmin@123', 12);
  await prisma.user.create({
    data: {
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

  // 4. Verification Check
  const companiesCount = await prisma.company.count();
  const users = await prisma.user.findMany({ select: { id: true, email: true, role: true, companyId: true } });
  const packagesCount = await prisma.package.count();

  let referralsCount = 0;
  try {
    const refRes: any = await prisma.$queryRawUnsafe(`SELECT count(*) FROM "${schema}"."LeadReferral"`);
    referralsCount = Number(refRes[0]?.count || 0);
  } catch {
    // LeadReferral might be freshly truncated
  }

  console.log('\n==========================================');
  console.log(`[Reset & Seed COMPLETED] Schema: "${schema}"`);
  console.log(`- Companies: ${companiesCount} (0 - No company data)`);
  console.log(`- Employees / Users: ${users.length} (${users.map((u) => `${u.email} [${u.role}]`).join(', ')})`);
  console.log(`- Packages: ${packagesCount}`);
  console.log(`- Referrals: ${referralsCount}`);
  console.log('==========================================\n');
}

resetAndSeed()
  .catch((e) => {
    console.error('[Reset & Seed Error]', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

