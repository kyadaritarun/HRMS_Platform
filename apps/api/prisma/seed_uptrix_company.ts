import { PrismaClient, Role, WorkMode } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const schema = process.env.DB_SCHEMA || 'HRMS_test';
  console.log(`[Seed Company] Setting up "Uptrix Technologies" in schema "${schema}"...`);

  // 0. Remove any previous Uptrix company to prevent duplicate key violations
  const existingCompany = await prisma.company.findFirst({
    where: { code: 'UPTRIX' },
  });
  if (existingCompany) {
    await prisma.company.delete({ where: { id: existingCompany.id } });
    console.log(`[Seed Company] Cleared previous Uptrix Technologies company data.`);
  }

  // Purge any lingering users with the old deprecated email IDs
  const oldEmailsToPurge = [
    'kyadarit@gmail.com',
    'hr@gmail.com',
    'finance@kyadari.com',
    'it@kyadari.com',
    'manager1@novatech.io',
    'emp2@novatech.io',
    'srikanth@uptrixglobal.com',
    'alekhya@uptrixglobal.com',
    'chandrakali@uptrixglobal.com',
    'harikaran@uptrixglobal.com',
    'tarun@uptrixglobal.com',
    'karan@uptrixglobal.com',
    'rajukali@uptrixglobal.com',
    'greeshmadevi@uptrixglobal.com',
    'sushanth@uptrixglobal.com',
    'tumpellekiran@uptrixglobal.com',
  ];
  await prisma.user.deleteMany({
    where: {
      OR: [
        { email: { in: oldEmailsToPurge } },
        { personalEmail: { in: oldEmailsToPurge } },
      ],
    },
  });
  console.log(`[Seed Company] Purged all deprecated Kyadari & NovaTech accounts.`);

  // 1. Password Hash for all accounts
  const defaultPassword = 'Password@123';
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  // 2. Ensure Enterprise Package (id: 3) or fallback to available with all features active
  const ALL_FEATURES = [
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
  ];

  let enterprisePkg = await prisma.package.findFirst({
    where: { name: { contains: 'Enterprise' } },
  });
  if (enterprisePkg) {
    await prisma.package.update({
      where: { id: enterprisePkg.id },
      data: { enabledFeatures: ALL_FEATURES },
    });
  } else {
    enterprisePkg = await prisma.package.findFirst({ orderBy: { id: 'desc' } });
  }

  // 3. Create Company: Uptrix Technologies
  const shifts = [
    {
      id: 'shift-general',
      name: 'General Shift',
      startTime: '09:30',
      endTime: '18:30',
      isDefault: true,
      breakDuration: 60,
      color: '#6366F1',
    },
  ];

  const address = {
    street: 'KPHB near metro station',
    city: 'Hyderabad',
    state: 'Telangana',
    country: 'India',
    zip: '500072',
  };

  const company = await prisma.company.create({
    data: {
      name: 'Uptrix Technologies',
      code: 'UPTRIX',
      subdomain: 'uptrix',
      website: 'https://uptrixglobal.com',
      address,
      workingDays: 'mon,tue,wed,thu,fri',
      timezone: 'Asia/Kolkata',
      shifts,
      settings: {
        paymentStatus: 'PAID',
        currency: 'INR',
        timezone: 'Asia/Kolkata',
        branding: {
          primaryColor: '#6366F1',
          companyName: 'Uptrix Technologies',
        },
        sidebarOperations: {
          hr_operations: true,
          it_operations: true,
          finance_operations: true,
        },
        performanceCycles: [
          {
            id: 'cycle-2026-q4',
            name: 'Q4 2026 Appraisal Cycle',
            description: 'Oct 2026 - Dec 2026 Quarterly Performance & OKR Evaluation',
            startDate: '2026-10-01',
            endDate: '2026-12-31',
            isActive: true,
          },
          {
            id: 'cycle-2026-annual',
            name: 'Annual Review 2026',
            description: 'Full-Year 2026 Comprehensive Evaluation',
            startDate: '2026-01-01',
            endDate: '2026-12-31',
            isActive: true,
          },
        ],
        claimCategories: [
          {
            id: 'cat-travel',
            name: 'Travel & Transport',
            maxLimit: 25000,
            requiresReceipt: true,
            description: 'Flights, cabs, train tickets, lodging for official company travel.',
            isActive: true,
          },
          {
            id: 'cat-meals',
            name: 'Food & Meals',
            maxLimit: 3000,
            requiresReceipt: true,
            description: 'Client lunches, team dinners, or late-night overtime meals.',
            isActive: true,
          },
          {
            id: 'cat-internet',
            name: 'Internet & Mobile Reimbursement',
            maxLimit: 2000,
            requiresReceipt: true,
            description: 'Monthly work-from-home broadband and mobile utility bills.',
            isActive: true,
          },
          {
            id: 'cat-learning',
            name: 'Learning & Certifications',
            maxLimit: 15000,
            requiresReceipt: true,
            description: 'Professional development courses, books, and exams.',
            isActive: true,
          },
          {
            id: 'cat-office',
            name: 'Office Supplies & Peripherals',
            maxLimit: 10000,
            requiresReceipt: true,
            description: 'Desk accessories, monitors, ergonomic accessories.',
            isActive: true,
          },
          {
            id: 'cat-medical',
            name: 'Health & Wellness',
            maxLimit: 5000,
            requiresReceipt: true,
            description: 'Annual health checkups and preventative wellness claims.',
            isActive: true,
          },
        ],
      },
      allowedEmailDomains: 'uptrixglobal.com,uptrix.com',
      isActive: true,
      packageId: enterprisePkg?.id || null,
      planType: 'YEARLY',
      subAmount: 49999,
      subStartDate: new Date(),
      subEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      subIsActive: true,
    },
  });

  console.log(`[Seed Company] Created Company: "${company.name}" (ID: ${company.id}, Code: ${company.code})`);

  // 4. Create Departments
  const deptNames = [
    'Administration',
    'Human Resources',
    'Digital Marketing',
    'IT Team',
    'IT Tickets',
    'Finance',
  ];

  const depts: Record<string, any> = {};
  for (const name of deptNames) {
    const d = await prisma.department.create({
      data: {
        companyId: company.id,
        name,
        isActive: true,
      },
    });
    depts[name] = d;
  }
  console.log(`[Seed Company] Created ${Object.keys(depts).length} departments.`);

  // 5. Create Leave Types
  const leaveTypesData = [
    { name: 'Casual Leave', code: 'CL', defaultAllocation: 12, isPaid: true, color: 'blue' },
    { name: 'Sick Leave', code: 'SL', defaultAllocation: 12, isPaid: true, color: 'rose' },
    { name: 'Paid Leave', code: 'PL', defaultAllocation: 15, isPaid: true, color: 'emerald' },
  ];

  const createdLeaveTypes: any[] = [];
  for (const lt of leaveTypesData) {
    const rec = await prisma.leaveType.create({
      data: {
        companyId: company.id,
        name: lt.name,
        code: lt.code,
        defaultAllocation: lt.defaultAllocation,
        isPaid: lt.isPaid,
        color: lt.color,
        isActive: true,
      },
    });
    createdLeaveTypes.push(rec);
  }

  // 6. Helper to create user & leave balances
  const createdUsers: Record<string, any> = {};

  async function createUser(params: {
    key: string;
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    role: Role;
    jobTitle: string;
    deptName: string;
    employeeNumber: string;
    phone: string;
    managerId?: number | null;
  }) {
    const user = await prisma.user.create({
      data: {
        companyId: company.id,
        email: params.email,
        username: params.username,
        passwordHash,
        firstName: params.firstName,
        lastName: params.lastName,
        role: params.role,
        jobTitle: params.jobTitle,
        departmentId: depts[params.deptName]?.id || null,
        employeeNumber: params.employeeNumber,
        phone: params.phone,
        managerId: params.managerId || null,
        isActive: true,
        mustChangePassword: false,
        workMode: WorkMode.WFO,
        joiningDate: new Date('2026-01-15'),
        address: 'KPHB near metro station, Hyderabad',
        workingAddress: 'KPHB near metro station, Hyderabad',
        shiftId: 'shift-general',
        shiftTiming: '09:30 - 18:30',
        monthlySalary: 75000,
        currency: 'INR',
      },
    });

    // Create initial leave balances
    for (const lt of createdLeaveTypes) {
      await prisma.leaveBalance.create({
        data: {
          userId: user.id,
          leaveTypeId: lt.id,
          balance: lt.defaultAllocation,
          carriedOver: 0,
        },
      });
    }

    createdUsers[params.key] = user;
    return user;
  }

  // --- Step A: Top Level (Admin & HR) ---
  // 1. Srikanth - Admin
  const srikanth = await createUser({
    key: 'srikanth',
    email: 'srikanth@uptrixglobal.com',
    username: 'srikanth',
    firstName: 'Srikanth',
    lastName: 'Admin',
    role: Role.COMPANY_ADMIN,
    jobTitle: 'Company Administrator',
    deptName: 'Administration',
    employeeNumber: 'EMP-001',
    phone: '+91 9876500001',
  });

  // 2. Alekhya - HR
  const alekhya = await createUser({
    key: 'alekhya',
    email: 'alekhya@uptrixglobal.com',
    username: 'alekhya',
    firstName: 'Alekhya',
    lastName: 'HR',
    role: Role.HR,
    jobTitle: 'HR Manager',
    deptName: 'Human Resources',
    employeeNumber: 'EMP-002',
    phone: '+91 9876500002',
    managerId: srikanth.id,
  });

  // --- Step B: Team Managers ---
  // 3. Chandra kali - digital marketing manager team 3
  const chandrakali = await createUser({
    key: 'chandrakali',
    email: 'chandrakali@uptrixglobal.com',
    username: 'chandrakali',
    firstName: 'Chandra',
    lastName: 'Kali',
    role: Role.EMPLOYEE,
    jobTitle: 'Digital Marketing Manager (Team 3)',
    deptName: 'Digital Marketing',
    employeeNumber: 'EMP-003',
    phone: '+91 9876500003',
    managerId: srikanth.id,
  });

  // 5. kyadari tarun - it employ manager team 1
  const tarun = await createUser({
    key: 'tarun',
    email: 'tarun@uptrixglobal.com',
    username: 'kyadaritarun',
    firstName: 'Tarun',
    lastName: 'Kyadari',
    role: Role.IT,
    jobTitle: 'IT Manager (Team 1)',
    deptName: 'IT Team',
    employeeNumber: 'EMP-005',
    phone: '+91 9876500005',
    managerId: srikanth.id,
  });

  // 7. raju kali - IT manager team 2 (IT Tickets)
  const rajukali = await createUser({
    key: 'rajukali',
    email: 'rajukali@uptrixglobal.com',
    username: 'rajukali',
    firstName: 'Raju',
    lastName: 'Kali',
    role: Role.IT,
    jobTitle: 'IT Tickets Manager (Team 2)',
    deptName: 'IT Tickets',
    employeeNumber: 'EMP-007',
    phone: '+91 9876500007',
    managerId: srikanth.id,
  });

  // 9. sushanth - Finance manager team 4
  const sushanth = await createUser({
    key: 'sushanth',
    email: 'sushanth@uptrixglobal.com',
    username: 'sushanth',
    firstName: 'Sushanth',
    lastName: 'Reddy',
    role: Role.FINANCE,
    jobTitle: 'Finance Manager (Team 4)',
    deptName: 'Finance',
    employeeNumber: 'EMP-009',
    phone: '+91 9876500009',
    managerId: srikanth.id,
  });

  // --- Step C: Team Employees Reporting to Respective Managers ---
  // 4. hari karan - employee team 3 (reports to Chandra kali)
  await createUser({
    key: 'harikaran',
    email: 'harikaran@uptrixglobal.com',
    username: 'harikaran',
    firstName: 'Hari',
    lastName: 'Karan',
    role: Role.EMPLOYEE,
    jobTitle: 'Marketing Executive (Team 3)',
    deptName: 'Digital Marketing',
    employeeNumber: 'EMP-004',
    phone: '+91 9876500004',
    managerId: chandrakali.id,
  });

  // 6. karan - employ team 1 (reports to kyadari tarun - IT Team)
  await createUser({
    key: 'karan',
    email: 'karan@uptrixglobal.com',
    username: 'karan',
    firstName: 'Karan',
    lastName: 'Kumar',
    role: Role.EMPLOYEE,
    jobTitle: 'IT Associate (Team 1)',
    deptName: 'IT Team',
    employeeNumber: 'EMP-006',
    phone: '+91 9876500006',
    managerId: tarun.id,
  });

  // 8. greeshma devi - employe team 2 (reports to raju kali - IT Tickets)
  await createUser({
    key: 'greeshmadevi',
    email: 'greeshmadevi@uptrixglobal.com',
    username: 'greeshmadevi',
    firstName: 'Greeshma',
    lastName: 'Devi',
    role: Role.EMPLOYEE,
    jobTitle: 'IT Tickets Associate (Team 2)',
    deptName: 'IT Tickets',
    employeeNumber: 'EMP-008',
    phone: '+91 9876500008',
    managerId: rajukali.id,
  });

  // 10. tumpelle kiran - employee team 4 (reports to sushanth)
  await createUser({
    key: 'tumpellekiran',
    email: 'tumpellekiran@uptrixglobal.com',
    username: 'tumpellekiran',
    firstName: 'Tumpelle',
    lastName: 'Kiran',
    role: Role.EMPLOYEE,
    jobTitle: 'Finance Associate (Team 4)',
    deptName: 'Finance',
    employeeNumber: 'EMP-010',
    phone: '+91 9876500010',
    managerId: sushanth.id,
  });

  console.log('\n======================================================');
  console.log('✅ UPTRIX TECHNOLOGIES ONBOARDING COMPLETED');
  console.log('======================================================');
  console.log(`Company: ${company.name} (Code: ${company.code})`);
  console.log(`Website: ${company.website}`);
  console.log(`Address: ${address.street}, ${address.city}`);
  console.log(`Default Password: ${defaultPassword}`);
  console.log('------------------------------------------------------');
  console.log('User Accounts Created (All using @uptrixglobal.com):');
  for (const [key, u] of Object.entries(createdUsers)) {
    console.log(` • ${u.firstName} ${u.lastName} (${u.jobTitle}) - ${u.email} [${u.role}] (Manager: ${u.managerId || 'None'})`);
  }
  console.log('======================================================\n');
}

main()
  .catch((e) => {
    console.error('[Seed Company Error]', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
