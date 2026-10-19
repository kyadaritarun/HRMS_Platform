const { PrismaClient, Role, WorkMode, RequestType, RequestStatus } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('--- Seeding Comprehensive Data for Kyadari Technologies (Company 2) ---');

  // 1. Ensure Package 3 (Enterprise Tier) exists and assign it to Company 2
  const enterprisePkg = await prisma.package.upsert({
    where: { id: 3 },
    update: {
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
        'policy_documents_management',
        'employee_document_management',
        'holiday_calendar',
      ],
    },
    create: {
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
        'policy_documents_management',
        'employee_document_management',
        'holiday_calendar',
      ],
    },
  });

  // 2. Update Company 2 Details & Shifts & Settings
  const shiftsData = [
    {
      id: 'shift-gen',
      name: 'General Day Shift (IST)',
      startTime: '09:30',
      endTime: '18:30',
      gracePeriodMinutes: 15,
      isDefault: true,
      color: '#4f46e5',
    },
    {
      id: 'shift-us',
      name: 'US Overlap Shift',
      startTime: '14:00',
      endTime: '23:00',
      gracePeriodMinutes: 15,
      isDefault: false,
      color: '#059669',
    },
    {
      id: 'shift-night',
      name: 'Night Support Shift',
      startTime: '21:00',
      endTime: '06:00',
      gracePeriodMinutes: 15,
      isDefault: false,
      color: '#d97706',
    },
  ];

  const companySettings = {
    quickLinks: [
      { id: 'ql-1', title: 'EPFO Unified Portal', url: 'https://unifiedportal-mem.epfindia.gov.in/' },
      { id: 'ql-2', title: 'ESIC Portal', url: 'https://www.esic.gov.in/' },
      { id: 'ql-3', title: 'Income Tax e-Filing', url: 'https://www.incometax.gov.in/' },
    ],
    announcements: [
      { id: 'ann-1', title: 'Q3 Annual Townhall & Appraisal Updates', date: '2026-10-15', author: 'Kyadari' },
      { id: 'ann-2', title: 'Diwali Festive Bonus Disbursement Schedule', date: '2026-10-18', author: 'HR Desk' },
    ],
  };

  const company = await prisma.company.update({
    where: { id: 2 },
    data: {
      name: 'Kyadari Technologies Pvt Ltd',
      code: 'KYADARI',
      packageId: 3,
      subIsActive: true,
      workingDays: 'mon,tue,wed,thu,fri',
      shifts: shiftsData,
      settings: companySettings,
    },
  });

  console.log(`Updated Company: ${company.name} (ID: ${company.id})`);

  // 3. Departments
  const deptNames = [
    'Engineering & Tech',
    'Human Resources',
    'Product & Design',
    'Sales & Business Dev',
    'Finance & Accounts',
  ];

  const depts = {};
  for (const name of deptNames) {
    const dept = await prisma.department.upsert({
      where: { companyId_name: { companyId: 2, name } },
      update: {},
      create: { companyId: 2, name },
    });
    depts[name] = dept.id;
  }
  console.log('Departments created:', Object.keys(depts));

  // 4. Passwords Hash
  const adminPass = await bcrypt.hash('Admin@123!', 10);
  const managerPass = await bcrypt.hash('Manager@123', 10);
  const employeePass = await bcrypt.hash('Employee@123', 10);

  // Update Kyadari Admin Profile
  await prisma.user.update({
    where: { email: 'kyadarit@gmail.com' },
    data: {
      firstName: 'Kyadari',
      lastName: 'Tarun',
      username: 'kyadari_admin',
      jobTitle: 'Founder & CEO',
      departmentId: depts['Engineering & Tech'],
      employeeNumber: 'KYA-001',
      monthlySalary: 250000,
      phone: '+91 98765 43210',
      joiningDate: new Date('2022-01-01'),
      dateOfBirth: new Date('1994-08-15'),
      bankDetails: {
        paymentMode: 'BANK_TRANSFER',
        bankName: 'HDFC Bank',
        accountNumber: '50100234891023',
        ifscCode: 'HDFC0001234',
        panNumber: 'ABCDE1234F',
      },
    },
  });

  // Update HR Profile (hr@gmail.com)
  const hrUser = await prisma.user.upsert({
    where: { email: 'hr@gmail.com' },
    update: {
      firstName: 'Jone',
      lastName: 'Doe',
      username: 'jone_hr',
      passwordHash: adminPass,
      role: Role.HR,
      jobTitle: 'Head of People & Culture',
      departmentId: depts['Human Resources'],
      employeeNumber: 'KYA-002',
      monthlySalary: 85000,
      phone: '+91 98111 22334',
      joiningDate: new Date('2023-03-01'),
      dateOfBirth: new Date('1996-05-20'),
      bankDetails: {
        paymentMode: 'BANK_TRANSFER',
        bankName: 'ICICI Bank',
        accountNumber: '001205009876',
        ifscCode: 'ICIC0000012',
        panNumber: 'FGHIJ5678K',
      },
    },
    create: {
      email: 'hr@gmail.com',
      username: 'jone_hr',
      passwordHash: adminPass,
      role: Role.HR,
      companyId: 2,
      firstName: 'Jone',
      lastName: 'Doe',
      jobTitle: 'Head of People & Culture',
      departmentId: depts['Human Resources'],
      employeeNumber: 'KYA-002',
      monthlySalary: 85000,
      phone: '+91 98111 22334',
      joiningDate: new Date('2023-03-01'),
      dateOfBirth: new Date('1996-05-20'),
      bankDetails: {
        paymentMode: 'BANK_TRANSFER',
        bankName: 'ICICI Bank',
        accountNumber: '001205009876',
        ifscCode: 'ICIC0000012',
        panNumber: 'FGHIJ5678K',
      },
    },
  });

  // Create Manager (manager1@novatech.io)
  const managerUser = await prisma.user.upsert({
    where: { email: 'manager1@novatech.io' },
    update: {
      firstName: 'Vikram',
      lastName: 'Malhotra',
      username: 'vikram_manager',
      passwordHash: managerPass,
      role: Role.EMPLOYEE,
      jobTitle: 'VP of Engineering',
      departmentId: depts['Engineering & Tech'],
      employeeNumber: 'KYA-003',
      monthlySalary: 140000,
      phone: '+91 98222 33445',
      joiningDate: new Date('2023-06-15'),
      dateOfBirth: new Date('1991-11-12'),
      bankDetails: {
        paymentMode: 'BANK_TRANSFER',
        bankName: 'HDFC Bank',
        accountNumber: '50100987654321',
        ifscCode: 'HDFC0001234',
        panNumber: 'KLMNO9012P',
      },
    },
    create: {
      email: 'manager1@novatech.io',
      username: 'vikram_manager',
      passwordHash: managerPass,
      role: Role.EMPLOYEE,
      companyId: 2,
      firstName: 'Vikram',
      lastName: 'Malhotra',
      jobTitle: 'VP of Engineering',
      departmentId: depts['Engineering & Tech'],
      employeeNumber: 'KYA-003',
      monthlySalary: 140000,
      phone: '+91 98222 33445',
      joiningDate: new Date('2023-06-15'),
      dateOfBirth: new Date('1991-11-12'),
      bankDetails: {
        paymentMode: 'BANK_TRANSFER',
        bankName: 'HDFC Bank',
        accountNumber: '50100987654321',
        ifscCode: 'HDFC0001234',
        panNumber: 'KLMNO9012P',
      },
    },
  });

  // Create Second Manager (Design / Operations Lead)
  const designLead = await prisma.user.upsert({
    where: { email: 'ananya.manager@kyadari.com' },
    update: {
      passwordHash: managerPass,
    },
    create: {
      email: 'ananya.manager@kyadari.com',
      username: 'ananya_design',
      passwordHash: managerPass,
      role: Role.EMPLOYEE,
      companyId: 2,
      firstName: 'Ananya',
      lastName: 'Roy',
      jobTitle: 'Lead Product Designer',
      departmentId: depts['Product & Design'],
      employeeNumber: 'KYA-004',
      monthlySalary: 110000,
      phone: '+91 98333 44556',
      joiningDate: new Date('2023-09-01'),
      dateOfBirth: new Date('1995-02-14'),
      bankDetails: {
        paymentMode: 'BANK_TRANSFER',
        bankName: 'Axis Bank',
        accountNumber: '918010045678901',
        ifscCode: 'UTIB0000123',
        panNumber: 'QRSTU3456V',
      },
    },
  });

  // Create Staff Employees (reporting to Vikram, Ananya, Kyadari)
  const staffList = [
    {
      email: 'emp2@novatech.io',
      username: 'maya_patel',
      firstName: 'Maya',
      lastName: 'Patel',
      jobTitle: 'Senior Fullstack Engineer',
      departmentId: depts['Engineering & Tech'],
      managerId: managerUser.id,
      salary: 95000,
      empNo: 'KYA-005',
      dob: new Date('1998-10-19'), // Birthday today!
      joiningDate: new Date('2024-01-10'),
    },
    {
      email: 'rahul.dev@kyadari.com',
      username: 'rahul_dev',
      firstName: 'Rahul',
      lastName: 'Verma',
      jobTitle: 'Backend Go/Node Engineer',
      departmentId: depts['Engineering & Tech'],
      managerId: managerUser.id,
      salary: 80000,
      empNo: 'KYA-006',
      dob: new Date('1997-04-12'),
      joiningDate: new Date('2024-02-15'),
    },
    {
      email: 'sneha.qa@kyadari.com',
      username: 'sneha_qa',
      firstName: 'Sneha',
      lastName: 'Nair',
      jobTitle: 'SDET / QA Automation Engineer',
      departmentId: depts['Engineering & Tech'],
      managerId: managerUser.id,
      salary: 65000,
      empNo: 'KYA-007',
      dob: new Date('1999-07-28'),
      joiningDate: new Date('2024-03-01'),
    },
    {
      email: 'pooja.designer@kyadari.com',
      username: 'pooja_design',
      firstName: 'Pooja',
      lastName: 'Gupta',
      jobTitle: 'Product & Visual Designer',
      departmentId: depts['Product & Design'],
      managerId: designLead.id,
      salary: 60000,
      empNo: 'KYA-008',
      dob: new Date('1998-12-05'),
      joiningDate: new Date('2024-04-15'),
    },
    {
      email: 'rohit.sales@kyadari.com',
      username: 'rohit_sales',
      firstName: 'Rohit',
      lastName: 'Sharma',
      jobTitle: 'Enterprise Account Executive',
      departmentId: depts['Sales & Business Dev'],
      managerId: 7, // Kyadari
      salary: 75000,
      empNo: 'KYA-009',
      dob: new Date('1996-03-22'),
      joiningDate: new Date('2024-05-01'),
    },
    {
      email: 'amit.finance@kyadari.com',
      username: 'amit_finance',
      firstName: 'Amit',
      lastName: 'Desai',
      jobTitle: 'Senior Financial Analyst',
      departmentId: depts['Finance & Accounts'],
      managerId: 7, // Kyadari
      salary: 70000,
      empNo: 'KYA-010',
      dob: new Date('1995-09-18'),
      joiningDate: new Date('2024-06-01'),
    },
  ];

  const createdStaff = [];
  for (const s of staffList) {
    const user = await prisma.user.upsert({
      where: { email: s.email },
      update: {
        firstName: s.firstName,
        lastName: s.lastName,
        username: s.username,
        passwordHash: employeePass,
        jobTitle: s.jobTitle,
        departmentId: s.departmentId,
        managerId: s.managerId,
        monthlySalary: s.salary,
        employeeNumber: s.empNo,
        dateOfBirth: s.dob,
        joiningDate: s.joiningDate,
        role: Role.EMPLOYEE,
        companyId: 2,
      },
      create: {
        email: s.email,
        username: s.username,
        passwordHash: employeePass,
        firstName: s.firstName,
        lastName: s.lastName,
        jobTitle: s.jobTitle,
        departmentId: s.departmentId,
        managerId: s.managerId,
        monthlySalary: s.salary,
        employeeNumber: s.empNo,
        dateOfBirth: s.dob,
        joiningDate: s.joiningDate,
        role: Role.EMPLOYEE,
        companyId: 2,
        bankDetails: {
          paymentMode: 'BANK_TRANSFER',
          bankName: 'HDFC Bank',
          accountNumber: `50100${Math.floor(10000000 + Math.random() * 90000000)}`,
          ifscCode: 'HDFC0001234',
          panNumber: `ABCDE${Math.floor(1000 + Math.random() * 9000)}F`,
        },
      },
    });
    createdStaff.push(user);
  }
  console.log(`Created/Updated ${createdStaff.length + 3} staff members`);

  // All active company 2 users
  const allUsers = await prisma.user.findMany({ where: { companyId: 2 } });

  // 5. Leave Types
  const leaveTypesData = [
    { name: 'Paid / Privilege Leave', code: 'PL', defaultAllocation: 18, isPaid: true, allowHalfDay: true, allowCarry: true, color: 'blue' },
    { name: 'Casual Leave', code: 'CL', defaultAllocation: 12, isPaid: true, allowHalfDay: true, allowCarry: false, color: 'emerald' },
    { name: 'Sick Leave', code: 'SL', defaultAllocation: 10, isPaid: true, allowHalfDay: true, allowCarry: false, color: 'amber' },
    { name: 'Compensatory Off', code: 'CO', defaultAllocation: 5, isPaid: true, allowHalfDay: true, isCompOff: true, color: 'indigo' },
  ];

  const createdLeaveTypes = [];
  for (const lt of leaveTypesData) {
    const l = await prisma.leaveType.upsert({
      where: { companyId_code: { companyId: 2, code: lt.code } },
      update: {},
      create: { ...lt, companyId: 2 },
    });
    createdLeaveTypes.push(l);
  }

  // 6. Leave Balances for all users
  for (const u of allUsers) {
    for (const lt of createdLeaveTypes) {
      await prisma.leaveBalance.upsert({
        where: { userId_leaveTypeId: { userId: u.id, leaveTypeId: lt.id } },
        update: {},
        create: {
          userId: u.id,
          leaveTypeId: lt.id,
          balance: Number(lt.defaultAllocation) - Math.floor(Math.random() * 3),
          carriedOver: 2,
        },
      });
    }
  }
  console.log('Leave Types and balances initialized.');

  // 7. Holidays (2026 Indian National Holidays)
  const holidaysData = [
    { name: 'Republic Day', date: new Date('2026-01-26'), description: 'National Holiday' },
    { name: 'Holi Festival', date: new Date('2026-03-04'), description: 'Festival of Colors' },
    { name: 'Good Friday', date: new Date('2026-04-03'), description: 'Public Holiday' },
    { name: 'Independence Day', date: new Date('2026-08-15'), description: 'National Holiday' },
    { name: 'Gandhi Jayanti', date: new Date('2026-10-02'), description: 'National Holiday' },
    { name: 'Dussehra / Vijayadashami', date: new Date('2026-10-20'), description: 'Festive Holiday' },
    { name: 'Diwali (Deepavali)', date: new Date('2026-11-08'), description: 'Festival of Lights' },
    { name: 'Christmas Day', date: new Date('2026-12-25'), description: 'Public Holiday' },
  ];

  for (const h of holidaysData) {
    await prisma.holiday.create({
      data: {
        companyId: 2,
        name: h.name,
        date: h.date,
        description: h.description,
        type: 'PUBLIC',
      },
    });
  }
  console.log('Holidays seeded.');

  // 8. Policies
  const policiesData = [
    {
      title: 'Employee Code of Conduct & Ethics',
      slug: 'code-of-conduct',
      policyType: 'HR',
      body: 'Our Code of Conduct outlines our expectations regarding employee behavior, professional integrity, non-disclosure, and respect in the workplace.',
    },
    {
      title: 'Information Security & Remote Work Guidelines',
      slug: 'it-security-policy',
      policyType: 'HR',
      body: 'Mandatory guidelines on multi-factor authentication, VPN usage, laptop encryption, and secure handling of confidential client data.',
    },
    {
      title: 'Leave & Attendance Policy',
      slug: 'leave-attendance-policy',
      policyType: 'LEAVE',
      body: 'Overview of standard 09:30 - 18:30 working hours, bi-weekly hybrid flexibility, planned leave notice periods, and loss of pay (LOP) terms.',
    },
    {
      title: 'Travel & Expense Reimbursement Policy',
      slug: 'expense-policy',
      policyType: 'CLAIM',
      body: 'Rules governing official business travel, daily per-diem limits, client entertainment approvals, and expense voucher submissions.',
    },
  ];

  for (const p of policiesData) {
    await prisma.policy.upsert({
      where: { companyId_slug: { companyId: 2, slug: p.slug } },
      update: {},
      create: { ...p, companyId: 2, validUntil: new Date('2027-12-31') },
    });
  }
  console.log('Policies seeded.');

  // 9. Attendance Check-ins for October 2026
  await prisma.attendance.deleteMany({ where: { companyId: 2 } });
  await prisma.request.deleteMany({ where: { companyId: 2 } });
  await prisma.ticket.deleteMany({ where: { companyId: 2 } });
  await prisma.notification.deleteMany({ where: { companyId: 2 } });

  // Seed past 15 working days for all staff
  for (let day = 1; day <= 18; day++) {
    const checkDate = new Date(2026, 9, day);
    const dayOfWeek = checkDate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6 || day === 2) continue; // skip weekends and Gandhi Jayanti

    for (const u of allUsers) {
      const checkInTime = new Date(Date.UTC(2026, 9, day, 4, 0, 0)); // 09:30 AM IST
      const checkOutTime = new Date(Date.UTC(2026, 9, day, 13, 15, 0)); // 06:45 PM IST
      const durationHours = 9.25;

      await prisma.attendance.create({
        data: {
          companyId: 2,
          userId: u.id,
          checkIn: checkInTime,
          checkOut: checkOutTime,
          durationHours,
          workMode: u.id % 2 === 0 ? WorkMode.WFH : WorkMode.WFO,
          note: 'Regular Working Hours',
        },
      });
    }
  }
  console.log('Attendance seeded for October 2026.');

  // 10. Requests: Leaves & Claims (Pending & Approved for Manager / HR workflows)
  // Pending Leave for Maya Patel -> Vikram Manager
  const maya = allUsers.find(u => u.email === 'emp2@novatech.io');
  if (maya && managerUser) {
    await prisma.request.create({
      data: {
        type: RequestType.LEAVE,
        companyId: 2,
        userId: maya.id,
        approverId: managerUser.id,
        status: RequestStatus.PENDING,
        title: 'Casual Leave Request - Family Occasion',
        reason: 'Attending sibling wedding in Jaipur',
        startDate: new Date('2026-10-23'),
        endDate: new Date('2026-10-24'),
        days: 2,
        leaveTypeId: createdLeaveTypes[1].id,
      },
    });

    // Approved Leave for Rahul Verma
    const rahul = allUsers.find(u => u.email === 'rahul.dev@kyadari.com');
    if (rahul) {
      await prisma.request.create({
        data: {
          type: RequestType.LEAVE,
          companyId: 2,
          userId: rahul.id,
          approverId: managerUser.id,
          status: RequestStatus.APPROVED,
          title: 'Sick Leave - Viral Fever',
          reason: 'Doctor advised 1 day rest',
          startDate: new Date('2026-10-10'),
          endDate: new Date('2026-10-10'),
          days: 1,
          leaveTypeId: createdLeaveTypes[2].id,
          decisionNote: 'Get well soon!',
          resolvedAt: new Date('2026-10-10'),
        },
      });
    }

    // Pending Expense Claim for Vikram (VP Eng) -> Kyadari
    await prisma.request.create({
      data: {
        type: RequestType.CLAIM,
        companyId: 2,
        userId: managerUser.id,
        approverId: 7, // Kyadari
        status: RequestStatus.PENDING,
        title: 'AWS Cloud Summit Travel & Stay',
        reason: 'Conference pass, flight tickets, and hotel accommodation in Bengaluru',
        amount: 14500,
        meta: {
          category: 'Travel & Accommodation',
          receipts: ['https://example.com/receipt-aws-summit.pdf'],
        },
      },
    });

    // Pending Claim for Rohit Sales -> Kyadari
    const rohit = allUsers.find(u => u.email === 'rohit.sales@kyadari.com');
    if (rohit) {
      await prisma.request.create({
        data: {
          type: RequestType.CLAIM,
          companyId: 2,
          userId: rohit.id,
          approverId: 7, // Kyadari
          status: RequestStatus.PENDING,
          title: 'Client Lunch - Q3 Enterprise Deal',
          reason: 'Lunch meeting with VP Tech at Taj Deccan',
          amount: 4200,
          meta: {
            category: 'Client Entertainment',
            receipts: ['https://example.com/taj-bill.pdf'],
          },
        },
      });
    }
  }
  console.log('Approval requests (Leaves & Claims) seeded.');

  // 11. Tickets
  await prisma.ticket.create({
    data: {
      companyId: 2,
      code: 'TCK-2026-101',
      requesterId: maya ? maya.id : 7,
      assigneeId: hrUser.id,
      departmentId: depts['Human Resources'],
      category: 'PAYROLL',
      subject: 'Clarification regarding Q2 Tax Deduction (TDS)',
      description: 'Kindly share the updated Form 16 Part B breakdown for investment declaration submissions.',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      comments: [
        {
          id: 'c-1',
          authorName: 'Jone Doe (HR)',
          message: 'Received. Our finance desk is preparing the updated tax computation sheet.',
          createdAt: new Date().toISOString(),
        },
      ],
    },
  });

  await prisma.ticket.create({
    data: {
      companyId: 2,
      code: 'TCK-2026-102',
      requesterId: managerUser.id,
      assigneeId: 7, // Kyadari
      departmentId: depts['Engineering & Tech'],
      category: 'HARDWARE',
      subject: 'Dual 4K Monitor Allocation for Frontend Dev Team',
      description: 'Requesting 2 additional external displays for new engineering joiners.',
      priority: 'MEDIUM',
      status: 'OPEN',
    },
  });
  console.log('Tickets seeded.');

  // 12. Appreciations & Kudos (Notifications)
  await prisma.notification.create({
    data: {
      companyId: 2,
      userId: maya ? maya.id : 7,
      kind: 'KUDOS',
      title: 'Shoutout from Vikram Malhotra! 🌟',
      message: 'Exceptional work delivering the multi-tenant auth module 2 days ahead of schedule!',
    },
  });

  await prisma.notification.create({
    data: {
      companyId: 2,
      userId: 7,
      kind: 'KUDOS',
      title: 'Company Milestone: 10 Active Enterprise Clients! 🚀',
      message: 'Congratulations team on crossing the milestone this quarter.',
    },
  });
  console.log('Notifications & Appreciations seeded.');

  // 13. Payroll Payslips (Published for September & October 2026)
  for (const u of allUsers) {
    const salary = Number(u.monthlySalary) || 60000;
    const basic = Math.round(salary * 0.5);
    const hra = Math.round(salary * 0.2);
    const special = salary - basic - hra;
    const pf = Math.min(1800, Math.round(basic * 0.12));
    const pt = 200;
    const tds = salary > 100000 ? 5000 : 0;
    const totalDeductions = pf + pt + tds;
    const netSalary = salary - totalDeductions;

    const snapData = {
      baseSalary: salary,
      basicSalary: basic,
      hra: hra,
      specialAllowance: special,
      grossSalary: salary,
      grossEarnings: salary,
      pf,
      pt,
      tds,
      totalDeductions,
      netSalary,
      workingDaysCount: 22,
      presentDays: 22,
      totalLopDays: 0,
      leaveDeduction: 0,
      currency: 'INR',
      paymentMode: 'BANK_TRANSFER',
      bankName: 'HDFC Bank',
      accountNumberMasked: '••••' + (u.id * 1111).toString().slice(-4),
    };

    // October 2026 Payslip
    await prisma.payslip.upsert({
      where: { employeeId_month_year: { employeeId: u.id, month: 10, year: 2026 } },
      update: {
        status: 'PUBLISHED',
        netSalary,
        snapshot: snapData,
        publishedAt: new Date('2026-10-18T10:00:00Z'),
        publishedById: 7,
      },
      create: {
        companyId: 2,
        employeeId: u.id,
        month: 10,
        year: 2026,
        status: 'PUBLISHED',
        netSalary,
        snapshot: snapData,
        publishedAt: new Date('2026-10-18T10:00:00Z'),
        publishedById: 7,
      },
    });

    // September 2026 Payslip
    await prisma.payslip.upsert({
      where: { employeeId_month_year: { employeeId: u.id, month: 9, year: 2026 } },
      update: {
        status: 'PUBLISHED',
        netSalary,
        snapshot: snapData,
        publishedAt: new Date('2026-09-30T10:00:00Z'),
        publishedById: 7,
      },
      create: {
        companyId: 2,
        employeeId: u.id,
        month: 9,
        year: 2026,
        status: 'PUBLISHED',
        netSalary,
        snapshot: snapData,
        publishedAt: new Date('2026-09-30T10:00:00Z'),
        publishedById: 7,
      },
    });
  }
  console.log('Published Payslips seeded for Sept & Oct 2026.');

  console.log('=== SEEDING COMPLETED SUCCESSFULLY! ===');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
