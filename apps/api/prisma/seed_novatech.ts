import { PrismaClient, Role, WorkMode, RequestType, RequestStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting NovaTech Solutions seeding...');

  // 1. Get Enterprise Package
  const enterprisePackage = await prisma.package.findFirst({
    where: { name: { contains: 'Enterprise' } },
  }) || await prisma.package.findFirst();

  if (!enterprisePackage) {
    throw new Error('No package found in database.');
  }

  // 2. Create Company: NovaTech Solutions
  const company = await prisma.company.upsert({
    where: { code: 'NOVATECH' },
    update: {
      name: 'NovaTech Solutions',
      subdomain: 'novatech',
      isActive: true,
      workingDays: 'mon,tue,wed,thu,fri',
      timezone: 'Asia/Kolkata',
      logo: '/Uptrix_logo.png',
    },
    create: {
      name: 'NovaTech Solutions',
      code: 'NOVATECH',
      subdomain: 'novatech',
      packageId: enterprisePackage.id,
      planType: 'YEARLY',
      subAmount: 49999,
      subStartDate: new Date('2026-01-01'),
      subEndDate: new Date('2027-01-01'),
      subIsActive: true,
      isActive: true,
      workingDays: 'mon,tue,wed,thu,fri',
      timezone: 'Asia/Kolkata',
      logo: '/Uptrix_logo.png',
      shifts: [
        {
          id: 'shift-general',
          name: 'General Shift',
          startTime: '09:00',
          endTime: '18:00',
          workingDays: 'mon,tue,wed,thu,fri',
          isDefault: true,
        },
      ],
      settings: {
        claimCategories: [
          { id: 'cat-travel', name: 'Travel & Transport', isActive: true },
          { id: 'cat-food', name: 'Meals & Food', isActive: true },
          { id: 'cat-tech', name: 'Hardware & Tech Tools', isActive: true },
        ],
        claimCurrencies: [
          { code: 'INR', isActive: true },
          { code: 'USD', isActive: true },
        ],
        quickLinks: [
          {
            id: 'ql-1',
            label: 'Company Portal & Handbook',
            url: 'https://novatech.internal/handbook',
            audience: 'ALL',
            sortOrder: 1,
            isActive: true,
          },
          {
            id: 'ql-2',
            label: 'Health & Medical Benefits',
            url: 'https://insurance.novatech.internal',
            audience: 'EMPLOYEE',
            sortOrder: 2,
            isActive: true,
          },
        ],
        performanceCycles: [
          {
            id: 'cycle-q4',
            name: 'Q4 2026 Annual Evaluation Cycle',
            description: 'Year-end OKRs & performance evaluations',
            startDate: '2026-10-01',
            endDate: '2026-12-31',
            isActive: true,
          },
        ],
      },
    },
  });

  console.log(`✅ Company created: ${company.name} (ID: ${company.id})`);

  // 3. Departments
  const deptNames = [
    'Engineering',
    'Product & Design',
    'Human Resources',
    'Sales & Marketing',
    'Finance & Operations',
  ];

  const depts: Record<string, any> = {};
  for (const name of deptNames) {
    depts[name] = await prisma.department.upsert({
      where: { companyId_name: { companyId: company.id, name } },
      update: {},
      create: { companyId: company.id, name },
    });
  }
  console.log('✅ Departments created');

  // 4. Leave Types
  const leaveTypesData = [
    { name: 'Casual Leave', code: 'CL', defaultAllocation: 12, isPaid: true, allowHalfDay: true, color: 'blue' },
    { name: 'Sick Leave', code: 'SL', defaultAllocation: 10, isPaid: true, allowHalfDay: true, color: 'emerald' },
    { name: 'Earned Leave', code: 'EL', defaultAllocation: 15, isPaid: true, allowCarry: true, color: 'amber' },
    { name: 'Floater Holiday', code: 'FH', defaultAllocation: 2, isPaid: true, allowHalfDay: false, color: 'purple' },
    { name: 'Comp Off', code: 'CO', defaultAllocation: 0, isPaid: true, isCompOff: true, color: 'indigo' },
  ];

  const leaveTypes: any[] = [];
  for (const lt of leaveTypesData) {
    const created = await prisma.leaveType.upsert({
      where: { companyId_code: { companyId: company.id, code: lt.code } },
      update: {},
      create: {
        companyId: company.id,
        name: lt.name,
        code: lt.code,
        defaultAllocation: lt.defaultAllocation,
        isPaid: lt.isPaid,
        allowHalfDay: lt.allowHalfDay,
        allowCarry: lt.allowCarry || false,
        isCompOff: lt.isCompOff || false,
        color: lt.color,
      },
    });
    leaveTypes.push(created);
  }
  console.log('✅ Leave types created');

  // 5. Holidays
  const holidaysData = [
    { name: 'Independence Day', date: new Date('2026-08-15') },
    { name: 'Gandhi Jayanti', date: new Date('2026-10-02') },
    { name: 'Diwali Festival', date: new Date('2026-11-08') },
    { name: 'Christmas Day', date: new Date('2026-12-25') },
    { name: 'New Year Day', date: new Date('2026-01-01') },
    { name: 'Republic Day', date: new Date('2026-01-26') },
  ];

  for (const h of holidaysData) {
    const existing = await prisma.holiday.findFirst({
      where: { companyId: company.id, name: h.name },
    });
    if (!existing) {
      await prisma.holiday.create({
        data: {
          companyId: company.id,
          name: h.name,
          date: h.date,
          type: 'PUBLIC',
        },
      });
    }
  }
  console.log('✅ Holidays created');

  // 6. Passwords
  const adminPass = await bcrypt.hash('Admin@123', 10);
  const hrPass = await bcrypt.hash('Hr@123', 10);
  const managerPass = await bcrypt.hash('Manager@123', 10);
  const employeePass = await bcrypt.hash('Employee@123', 10);

  // Helper for bank details
  const createBankDetails = (empNum: number) => ({
    paymentMode: 'BANK_TRANSFER',
    bankName: ['HDFC Bank', 'ICICI Bank', 'Axis Bank', 'State Bank of India'][empNum % 4],
    accountNumber: `501004${String(10000000 + empNum * 123456).slice(0, 8)}`,
    ifscCode: 'HDFC0001234',
    panNumber: `ABCDE${String(1000 + empNum)}F`,
  });

  // A. Company Admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@novatech.io' },
    update: {
      profilePhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=256&h=256&fit=crop&crop=faces',
    },
    create: {
      email: 'admin@novatech.io',
      username: 'novatech_admin',
      passwordHash: adminPass,
      firstName: 'Alexander',
      lastName: 'Wright',
      role: Role.COMPANY_ADMIN,
      companyId: company.id,
      departmentId: depts['Finance & Operations'].id,
      jobTitle: 'Chief Executive Officer',
      monthlySalary: 280000,
      mustChangePassword: false,
      workMode: WorkMode.WFO,
      joiningDate: new Date('2025-01-01'),
      dateOfBirth: new Date('1985-10-18'), // Birthday in 5 days!
      phone: '+91 98765 43201',
      profilePhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=256&h=256&fit=crop&crop=faces',
      bankDetails: createBankDetails(1),
    },
  });

  // B. 2 HR Managers
  const hr1 = await prisma.user.upsert({
    where: { email: 'hr1@novatech.io' },
    update: {
      profilePhoto: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=256&h=256&fit=crop&crop=faces',
    },
    create: {
      email: 'hr1@novatech.io',
      username: 'novatech_hr1',
      passwordHash: hrPass,
      firstName: 'Elena',
      lastName: 'Rostova',
      role: Role.HR,
      companyId: company.id,
      departmentId: depts['Human Resources'].id,
      jobTitle: 'Head of People & Culture',
      monthlySalary: 140000,
      hrPermissions: null, // Full HR access
      mustChangePassword: false,
      workMode: WorkMode.WFO,
      joiningDate: new Date('2025-02-15'),
      dateOfBirth: new Date('1990-11-04'), // Birthday in Nov
      phone: '+91 98765 43202',
      profilePhoto: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=256&h=256&fit=crop&crop=faces',
      bankDetails: createBankDetails(2),
    },
  });

  const hr2 = await prisma.user.upsert({
    where: { email: 'hr2@novatech.io' },
    update: {
      profilePhoto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=256&h=256&fit=crop&crop=faces',
    },
    create: {
      email: 'hr2@novatech.io',
      username: 'novatech_hr2',
      passwordHash: hrPass,
      firstName: 'Marcus',
      lastName: 'Vance',
      role: Role.HR,
      companyId: company.id,
      departmentId: depts['Human Resources'].id,
      jobTitle: 'HR Operations & Talent Specialist',
      monthlySalary: 95000,
      hrPermissions: null,
      mustChangePassword: false,
      workMode: WorkMode.HYBRID,
      joiningDate: new Date('2025-04-01'),
      dateOfBirth: new Date('1993-10-14'), // Birthday TOMORROW!
      phone: '+91 98765 43203',
      profilePhoto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=256&h=256&fit=crop&crop=faces',
      bankDetails: createBankDetails(3),
    },
  });

  // C. 2 Managers
  const manager1 = await prisma.user.upsert({
    where: { email: 'manager1@novatech.io' },
    update: {
      profilePhoto: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=256&h=256&fit=crop&crop=faces',
    },
    create: {
      email: 'manager1@novatech.io',
      username: 'novatech_manager1',
      passwordHash: managerPass,
      firstName: 'Vikram',
      lastName: 'Malhotra',
      role: Role.EMPLOYEE,
      canManagePerformance: true,
      companyId: company.id,
      departmentId: depts['Engineering'].id,
      jobTitle: 'VP of Engineering',
      monthlySalary: 210000,
      mustChangePassword: false,
      workMode: WorkMode.HYBRID,
      joiningDate: new Date('2025-01-10'),
      dateOfBirth: new Date('1988-10-25'), // Birthday in Oct
      phone: '+91 98765 43204',
      profilePhoto: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=256&h=256&fit=crop&crop=faces',
      bankDetails: createBankDetails(4),
    },
  });

  const manager2 = await prisma.user.upsert({
    where: { email: 'manager2@novatech.io' },
    update: {
      profilePhoto: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=256&h=256&fit=crop&crop=faces',
    },
    create: {
      email: 'manager2@novatech.io',
      username: 'novatech_manager2',
      passwordHash: managerPass,
      firstName: 'Sophia',
      lastName: 'Sterling',
      role: Role.EMPLOYEE,
      canManagePerformance: true,
      companyId: company.id,
      departmentId: depts['Product & Design'].id,
      jobTitle: 'Director of Product & UX',
      monthlySalary: 195000,
      mustChangePassword: false,
      workMode: WorkMode.WFO,
      joiningDate: new Date('2025-03-01'),
      dateOfBirth: new Date('1989-12-09'), // Birthday in Dec
      phone: '+91 98765 43205',
      profilePhoto: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=256&h=256&fit=crop&crop=faces',
      bankDetails: createBankDetails(5),
    },
  });

  // D. 30 Employees
  const employeesData = [
    // 15 Engineering Employees (reporting to Manager 1)
    { first: 'Liam', last: 'Carter', title: 'Senior Frontend Architect', salary: 115000, dob: '1994-01-15', mode: WorkMode.WFO, dept: 'Engineering', mgr: manager1.id, photo: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=256&h=256&fit=crop&crop=faces' },
    { first: 'Maya', last: 'Patel', title: 'Senior Backend Engineer', salary: 120000, dob: '1995-10-13', mode: WorkMode.HYBRID, dept: 'Engineering', mgr: manager1.id, photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=256&h=256&fit=crop&crop=faces' }, // TODAY's Birthday! 🎂
    { first: 'Ethan', last: 'Hayes', title: 'Full Stack Developer', salary: 95000, dob: '1996-03-22', mode: WorkMode.HYBRID, dept: 'Engineering', mgr: manager1.id, photo: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=256&h=256&fit=crop&crop=faces' },
    { first: 'Priya', last: 'Sharma', title: 'DevOps & Cloud Specialist', salary: 125000, dob: '1993-11-19', mode: WorkMode.WFH, dept: 'Engineering', mgr: manager1.id, photo: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=256&h=256&fit=crop&crop=faces' },
    { first: 'Lucas', last: 'Bennett', title: 'Cloud Infrastructure Architect', salary: 135000, dob: '1992-06-11', mode: WorkMode.WFO, dept: 'Engineering', mgr: manager1.id, photo: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=256&h=256&fit=crop&crop=faces' },
    { first: 'Chloe', last: 'Rodriguez', title: 'QA Automation Lead', salary: 92000, dob: '1995-08-04', mode: WorkMode.HYBRID, dept: 'Engineering', mgr: manager1.id, photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=256&h=256&fit=crop&crop=faces' },
    { first: 'Daniel', last: 'Kim', title: 'iOS Mobile Developer', salary: 105000, dob: '1996-12-03', mode: WorkMode.WFO, dept: 'Engineering', mgr: manager1.id, photo: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=256&h=256&fit=crop&crop=faces' },
    { first: 'Sophia', last: 'Zhang', title: 'Android Mobile Developer', salary: 105000, dob: '1997-04-18', mode: WorkMode.WFH, dept: 'Engineering', mgr: manager1.id, photo: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=256&h=256&fit=crop&crop=faces' },
    { first: 'Marcus', last: 'Thorne', title: 'Data Platform Engineer', salary: 110000, dob: '1994-09-29', mode: WorkMode.HYBRID, dept: 'Engineering', mgr: manager1.id, photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=256&h=256&fit=crop&crop=faces' },
    { first: 'Olivia', last: 'Campbell', title: 'Site Reliability Engineer', salary: 118000, dob: '1993-10-29', mode: WorkMode.HYBRID, dept: 'Engineering', mgr: manager1.id, photo: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=256&h=256&fit=crop&crop=faces' }, // In Oct
    { first: 'Aiden', last: 'Foster', title: 'Frontend Developer', salary: 85000, dob: '1998-02-14', mode: WorkMode.WFO, dept: 'Engineering', mgr: manager1.id, photo: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=256&h=256&fit=crop&crop=faces' },
    { first: 'Zoe', last: 'Walker', title: 'Backend Developer', salary: 88000, dob: '1997-07-08', mode: WorkMode.HYBRID, dept: 'Engineering', mgr: manager1.id, photo: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=256&h=256&fit=crop&crop=faces' },
    { first: 'Noah', last: 'Mitchell', title: 'Junior Software Engineer', salary: 65000, dob: '1999-11-25', mode: WorkMode.WFO, dept: 'Engineering', mgr: manager1.id, photo: 'https://images.unsplash.com/photo-1513956589380-bad6acb9b9d4?w=256&h=256&fit=crop&crop=faces' },
    { first: 'Ava', last: 'Reynolds', title: 'Cybersecurity Analyst', salary: 112000, dob: '1994-05-30', mode: WorkMode.WFH, dept: 'Engineering', mgr: manager1.id, photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=256&h=256&fit=crop&crop=faces' },
    { first: 'James', last: 'Watson', title: 'Database Administrator', salary: 100000, dob: '1992-12-19', mode: WorkMode.HYBRID, dept: 'Engineering', mgr: manager1.id, photo: 'https://images.unsplash.com/photo-1463453091185-61582044d556?w=256&h=256&fit=crop&crop=faces' },

    // 10 Product & Design Employees (reporting to Manager 2)
    { first: 'Emma', last: 'Anderson', title: 'Lead UI/UX Designer', salary: 118000, dob: '1993-10-16', mode: WorkMode.WFO, dept: 'Product & Design', mgr: manager2.id, photo: 'https://images.unsplash.com/photo-1534751516642-a171edd25215?w=256&h=256&fit=crop&crop=faces' }, // Birthday in 3 days!
    { first: 'Leo', last: 'Ross', title: 'Product Designer', salary: 95000, dob: '1996-01-28', mode: WorkMode.HYBRID, dept: 'Product & Design', mgr: manager2.id, photo: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=256&h=256&fit=crop&crop=faces' },
    { first: 'Isabella', last: 'Cooper', title: 'Senior Product Manager', salary: 145000, dob: '1991-08-14', mode: WorkMode.WFO, dept: 'Product & Design', mgr: manager2.id, photo: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=256&h=256&fit=crop&crop=faces' },
    { first: 'Ryan', last: 'Jenkins', title: 'Technical Product Manager', salary: 135000, dob: '1992-11-02', mode: WorkMode.WFO, dept: 'Product & Design', mgr: manager2.id, photo: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=256&h=256&fit=crop&crop=faces' },
    { first: 'Mia', last: 'Sullivan', title: 'Design System Engineer', salary: 92000, dob: '1997-03-09', mode: WorkMode.WFH, dept: 'Product & Design', mgr: manager2.id, photo: 'https://images.unsplash.com/photo-1548142813-c348350df52b?w=256&h=256&fit=crop&crop=faces' },
    { first: 'Jack', last: 'Hayes', title: 'UX Researcher', salary: 88000, dob: '1995-09-17', mode: WorkMode.HYBRID, dept: 'Product & Design', mgr: manager2.id, photo: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=256&h=256&fit=crop&crop=faces' },
    { first: 'Harper', last: 'Foster', title: 'Interaction Designer', salary: 82000, dob: '1998-04-26', mode: WorkMode.WFO, dept: 'Product & Design', mgr: manager2.id, photo: 'https://images.unsplash.com/photo-1569913486515-b74bf7751574?w=256&h=256&fit=crop&crop=faces' },
    { first: 'Benjamin', last: 'Miller', title: 'Motion & Visual Designer', salary: 80000, dob: '1997-06-20', mode: WorkMode.WFH, dept: 'Product & Design', mgr: manager2.id, photo: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=256&h=256&fit=crop&crop=faces' },
    { first: 'Grace', last: 'Brooks', title: 'Associate Product Manager', salary: 75000, dob: '1999-07-15', mode: WorkMode.WFO, dept: 'Product & Design', mgr: manager2.id, photo: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=256&h=256&fit=crop&crop=faces' },
    { first: 'Nathan', last: 'Chen', title: 'Senior Technical Writer', salary: 74000, dob: '1996-10-31', mode: WorkMode.WFO, dept: 'Product & Design', mgr: manager2.id, photo: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=256&h=256&fit=crop&crop=faces' }, // Halloween Birthday!

    // 5 Sales, Marketing & Operations Employees
    { first: 'Lily', last: 'Reed', title: 'Senior Account Executive', salary: 98000, dob: '1994-02-18', mode: WorkMode.WFO, dept: 'Sales & Marketing', mgr: admin.id, photo: 'https://images.unsplash.com/photo-1580894732444-8ecded7900cd?w=256&h=256&fit=crop&crop=faces' },
    { first: 'Samuel', last: 'Scott', title: 'Growth Marketing Lead', salary: 108000, dob: '1993-12-24', mode: WorkMode.HYBRID, dept: 'Sales & Marketing', mgr: admin.id, photo: 'https://images.unsplash.com/photo-1492447273231-0f8feabc1a36?w=256&h=256&fit=crop&crop=faces' },
    { first: 'Hannah', last: 'Diaz', title: 'Enterprise Sales Specialist', salary: 92000, dob: '1995-05-12', mode: WorkMode.WFO, dept: 'Sales & Marketing', mgr: admin.id, photo: 'https://images.unsplash.com/photo-1573496799652-408c2ac9fe98?w=256&h=256&fit=crop&crop=faces' },
    { first: 'Oliver', last: 'Clark', title: 'Financial Controller', salary: 128000, dob: '1991-03-05', mode: WorkMode.WFO, dept: 'Finance & Operations', mgr: admin.id, photo: 'https://images.unsplash.com/photo-1562788869-4ed32648eb72?w=256&h=256&fit=crop&crop=faces' },
    { first: 'Emily', last: 'Vance', title: 'Operations Coordinator', salary: 68000, dob: '1998-08-22', mode: WorkMode.HYBRID, dept: 'Finance & Operations', mgr: admin.id, photo: 'https://images.unsplash.com/photo-1558898479-33c0057a5d12?w=256&h=256&fit=crop&crop=faces' },
  ];

  const createdEmployees: any[] = [];
  let empIdx = 1;
  for (const emp of employeesData) {
    const email = `emp${empIdx}@novatech.io`;
    const username = `novatech_emp${empIdx}`;
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        dateOfBirth: new Date(emp.dob),
        monthlySalary: emp.salary,
        profilePhoto: emp.photo,
      },
      create: {
        email,
        username,
        passwordHash: employeePass,
        firstName: emp.first,
        lastName: emp.last,
        role: Role.EMPLOYEE,
        companyId: company.id,
        departmentId: depts[emp.dept]?.id,
        managerId: emp.mgr,
        jobTitle: emp.title,
        monthlySalary: emp.salary,
        mustChangePassword: false,
        workMode: emp.mode,
        joiningDate: new Date('2025-06-01'),
        dateOfBirth: new Date(emp.dob),
        phone: `+91 98765 ${String(43200 + empIdx).slice(-5)}`,
        bankDetails: createBankDetails(empIdx + 5),
        profilePhoto: emp.photo,
      },
    });
    createdEmployees.push(user);
    empIdx++;
  }

  const allCompanyUsers = [admin, hr1, hr2, manager1, manager2, ...createdEmployees];
  console.log(`✅ All ${allCompanyUsers.length} users created (1 Admin + 2 HRs + 2 Managers + 30 Employees)`);

  // 7. Seed Leave Balances for all 35 users
  for (const u of allCompanyUsers) {
    for (const lt of leaveTypes) {
      await prisma.leaveBalance.upsert({
        where: { userId_leaveTypeId: { userId: u.id, leaveTypeId: lt.id } },
        update: {},
        create: {
          userId: u.id,
          leaveTypeId: lt.id,
          balance: lt.defaultAllocation,
          carriedOver: 0,
        },
      });
    }
  }
  console.log('✅ Leave balances seeded for all users');

  // 8. Generate 3 Months Attendance (August, September, October 2026)
  console.log('⏳ Generating 3 months of attendance records...');
  // Delete previous attendance for this company to avoid duplicate spam
  await prisma.attendance.deleteMany({ where: { companyId: company.id } });

  const attendanceBatch: any[] = [];
  const today = new Date('2026-10-13T00:00:00.000Z');

  // Loop through dates from 2026-08-01 to 2026-10-13
  const startDate = new Date('2026-08-01T00:00:00.000Z');
  const currDate = new Date(startDate);

  while (currDate <= today) {
    const dayOfWeek = currDate.getUTCDay(); // 0 = Sun, 6 = Sat
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const dateStr = currDate.toISOString().split('T')[0];
    const isHoliday = dateStr === '2026-08-15' || dateStr === '2026-10-02';
    const isToday = dateStr === '2026-10-13';

    if (!isWeekend && !isHoliday) {
      for (const u of allCompanyUsers) {
        // High attendance probability (~94%)
        // Deterministic pseudo-random based on user.id and date
        const seedVal = (u.id * 31 + currDate.getUTCDate() * 7) % 100;
        const isPresent = isToday ? true : seedVal < 94; // Almost everyone present today!

        if (isPresent) {
          // Check-in around 09:00 - 09:25
          const inMinute = (seedVal % 25);
          const checkInTime = new Date(currDate);
          checkInTime.setUTCHours(3, 30 + inMinute, 0, 0); // 09:00 - 09:25 IST = 03:30 - 03:55 UTC

          let checkOutTime: Date | null = null;
          let durationHours = 0;

          if (isToday) {
            // For TODAY (2026-10-13):
            // 27 employees currently IN PROGRESS (Active on duty!)
            // 8 employees completed shift
            const hasCheckedOutToday = seedVal % 5 === 0;
            if (hasCheckedOutToday) {
              checkOutTime = new Date(currDate);
              checkOutTime.setUTCHours(12, 15 + (seedVal % 30), 0, 0); // ~17:45 - 18:15 IST
              durationHours = 8.5;
            } else {
              checkOutTime = null; // Currently On Duty!
              durationHours = 0;
            }
          } else {
            // Past dates: completed full shift
            const outMinute = (seedVal % 35);
            checkOutTime = new Date(currDate);
            checkOutTime.setUTCHours(12, 30 + outMinute, 0, 0); // ~18:00 - 18:35 IST
            durationHours = 8.5 + (seedVal % 10) / 10;
          }

          attendanceBatch.push({
            companyId: company.id,
            userId: u.id,
            shiftId: 'shift-general',
            checkIn: checkInTime,
            checkOut: checkOutTime,
            workMode: u.workMode || WorkMode.WFO,
            durationHours,
            note: 'Biometric / GPS punch verified',
            checkInGeo: {
              lat: 12.9716,
              lng: 77.5946,
              address: 'NovaTech Tower, Bengaluru, KA',
            },
            checkOutGeo: checkOutTime ? {
              lat: 12.9716,
              lng: 77.5946,
              address: 'NovaTech Tower, Bengaluru, KA',
            } : null,
          });
        }
      }
    }

    // Move to next day
    currDate.setUTCDate(currDate.getUTCDate() + 1);
  }

  console.log(`Inserting ${attendanceBatch.length} attendance records in chunks...`);
  // Insert in chunks of 500
  const chunkSize = 500;
  for (let i = 0; i < attendanceBatch.length; i += chunkSize) {
    const chunk = attendanceBatch.slice(i, i + chunkSize);
    await prisma.attendance.createMany({ data: chunk });
  }
  console.log('✅ 3 months of attendance records successfully seeded!');

  // 9. Generate 3 Months of Payslips (August 2026, September 2026, October 2026)
  console.log('⏳ Generating 3 months of payslips...');
  await prisma.payslip.deleteMany({ where: { companyId: company.id } });

  const payrollMonths = [
    { month: 8, year: 2026, status: 'PUBLISHED', workingDays: 21 },
    { month: 9, year: 2026, status: 'PUBLISHED', workingDays: 22 },
    { month: 10, year: 2026, status: 'DRAFT', workingDays: 21 },
  ];

  for (const pm of payrollMonths) {
    for (const u of allCompanyUsers) {
      const baseSalary = Number(u.monthlySalary) || 75000;
      const bonus = pm.month === 8 ? (u.id % 3 === 0 ? 5000 : 0) : 0;
      const deductions = Math.round(baseSalary * 0.12); // PF / Tax deductions
      const netSalary = baseSalary + bonus - deductions;

      const snapshot = {
        baseSalary,
        currency: 'INR',
        totalCalendarDays: pm.month === 9 ? 30 : 31,
        workingDaysCount: pm.workingDays,
        presentDays: pm.workingDays,
        paidLeaveDays: 0,
        unpaidLeaveDays: 0,
        absentDays: 0,
        totalLopDays: 0,
        perDayRate: Math.round(baseSalary / pm.workingDays),
        leaveDeduction: 0,
        bonus,
        otherDeductions: deductions,
        totalDeductions: deductions,
        grossEarnings: baseSalary + bonus,
        netSalary,
        paymentMode: 'BANK_TRANSFER',
        bankName: (u.bankDetails as any)?.bankName || 'HDFC Bank',
        accountNumberMasked: (u.bankDetails as any)?.accountNumber || '••••••••1234',
        remarks: `${pm.month === 8 ? 'August' : pm.month === 9 ? 'September' : 'October'} 2026 Salary Disbursal`,
      };

      await prisma.payslip.create({
        data: {
          companyId: company.id,
          employeeId: u.id,
          month: pm.month,
          year: pm.year,
          status: pm.status,
          bonus,
          otherDeductions: deductions,
          remarks: snapshot.remarks,
          netSalary,
          publishedById: pm.status === 'PUBLISHED' ? admin.id : null,
          publishedAt: pm.status === 'PUBLISHED' ? new Date(`${pm.year}-${String(pm.month).padStart(2, '0')}-28`) : null,
          snapshot,
        },
      });
    }
  }
  console.log('✅ 3 months of payslips seeded for all employees');

  // 10. Create 3 Sample Support Tickets for NovaTech
  await prisma.ticket.deleteMany({ where: { companyId: company.id } });
  await prisma.ticket.createMany({
    skipDuplicates: true,
    data: [
      {
        code: 'TIC-NOV-001',
        subject: 'Upgrade Workstation RAM for ML Training',
        description: 'Need additional 32GB RAM module for local model inference experiments.',
        category: 'HARDWARE',
        priority: 'HIGH',
        status: 'OPEN',
        companyId: company.id,
        requesterId: createdEmployees[1].id,
      },
      {
        code: 'TIC-NOV-002',
        subject: 'Health Insurance Policy Clarification',
        description: 'Requesting updated family floater inclusion forms for newly added dependents.',
        category: 'HR',
        priority: 'MEDIUM',
        status: 'OPEN',
        companyId: company.id,
        requesterId: createdEmployees[0].id,
      },
      {
        code: 'TIC-NOV-003',
        subject: 'Dual 4K Monitor Setup Request',
        description: 'Design workspace setup for high-resolution prototype previews.',
        category: 'HARDWARE',
        priority: 'MEDIUM',
        status: 'RESOLVED',
        companyId: company.id,
        requesterId: createdEmployees[15].id,
      },
    ],
  });
  console.log('✅ Support tickets created');

  // 11. Create 5 Official Corporate Policies
  await prisma.policy.deleteMany({ where: { companyId: company.id } });
  const samplePolicies = [
    {
      title: 'Information Security & Data Protection Policy',
      slug: 'info-sec-data-protection-2026',
      policyType: 'IT_SECURITY',
      version: 2,
      body: 'All employees must safeguard client intellectual property, utilize hardware-backed multi-factor authentication (MFA), and adhere to SOC2 and GDPR compliance standards. Company-issued laptops must remain encrypted at all times.',
      validUntil: new Date('2027-12-31'),
      acceptances: allCompanyUsers.slice(0, 28).map((u) => ({
        userId: u.id,
        version: 2,
        at: new Date('2026-08-10T10:00:00Z').toISOString(),
      })),
    },
    {
      title: 'Global Code of Business Conduct & Ethics',
      slug: 'code-of-conduct-ethics-2026',
      policyType: 'CODE_OF_CONDUCT',
      version: 1,
      body: 'NovaTech Solutions is committed to transparency, mutual respect, and ethical business dealings. Conflicts of interest, bribery, and anti-competitive practices are strictly prohibited across all operations.',
      validUntil: new Date('2027-12-31'),
      acceptances: allCompanyUsers.slice(0, 32).map((u) => ({
        userId: u.id,
        version: 1,
        at: new Date('2026-08-05T09:30:00Z').toISOString(),
      })),
    },
    {
      title: 'Prevention of Sexual Harassment (POSH) Policy',
      slug: 'posh-workplace-policy-2026',
      policyType: 'POSH',
      version: 1,
      body: 'Zero-tolerance policy against any form of sexual harassment or discriminatory intimidation. The Internal Complaints Committee (ICC) conducts confidential and prompt inquiries in accordance with statutory guidelines.',
      validUntil: new Date('2027-12-31'),
      acceptances: allCompanyUsers.slice(0, 30).map((u) => ({
        userId: u.id,
        version: 1,
        at: new Date('2026-08-02T11:15:00Z').toISOString(),
      })),
    },
    {
      title: 'Remote & Hybrid Workplace Guidelines',
      slug: 'remote-hybrid-work-guidelines',
      policyType: 'REMOTE_WORK',
      version: 1,
      body: 'Guidelines for asynchronous collaboration, core overlap working hours (10:00 AM - 4:00 PM IST), home-office ergonomics reimbursement, and team physical anchor days.',
      validUntil: new Date('2027-06-30'),
      acceptances: allCompanyUsers.slice(0, 24).map((u) => ({
        userId: u.id,
        version: 1,
        at: new Date('2026-08-15T14:20:00Z').toISOString(),
      })),
    },
    {
      title: 'Comprehensive Paid Leave & Wellness Framework',
      slug: 'paid-leave-wellness-framework',
      policyType: 'LEAVE_POLICY',
      version: 2,
      body: 'Details governing earned annual leave accruals, casual & medical leave entitlements, bereavement, floater holidays, and parental leave benefits.',
      validUntil: new Date('2027-12-31'),
      acceptances: allCompanyUsers.slice(0, 33).map((u) => ({
        userId: u.id,
        version: 2,
        at: new Date('2026-09-01T08:45:00Z').toISOString(),
      })),
    },
  ];

  for (const p of samplePolicies) {
    await prisma.policy.create({
      data: {
        companyId: company.id,
        title: p.title,
        slug: p.slug,
        policyType: p.policyType,
        version: p.version,
        body: p.body,
        validUntil: p.validUntil,
        acceptances: p.acceptances,
      },
    });
  }
  console.log('✅ 5 Corporate policies created with employee compliance acceptances');

  console.log('\n🎉 ALL DONE! NovaTech Solutions is fully configured:');
  console.log('Company: NovaTech Solutions (code: NOVATECH, subdomain: novatech)');
  console.log('👑 Company Admin: admin@novatech.io / Admin@123');
  console.log('📋 HR 1: hr1@novatech.io / Hr@123');
  console.log('📋 HR 2: hr2@novatech.io / Hr@123');
  console.log('💼 Manager 1: manager1@novatech.io / Manager@123 (Engineering VP)');
  console.log('💼 Manager 2: manager2@novatech.io / Manager@123 (Product & Design Director)');
  console.log('👥 Employees: 30 employees (emp1@novatech.io to emp30@novatech.io / Employee@123)');
  console.log('📅 Attendance: 3 full months (August, September, October 2026) with live active clock-in status for today');
  console.log('💰 Payslips: 3 months (August Published, September Published, October Draft/Processing)');
  console.log('🎂 Birthdays: Seeded for all employees, including Maya Patel (TODAY! 🎂), Marcus Vance (Tomorrow!), Emma Anderson (in 3 days!), and Alexander Wright (in 5 days!)');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
