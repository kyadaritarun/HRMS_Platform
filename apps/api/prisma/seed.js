"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('Seeding Uptrix HRMS database...');
    // 1. Package
    const enterprisePackage = await prisma.package.upsert({
        where: { id: 1 },
        update: {},
        create: {
            name: 'Enterprise Tier',
            description: 'Full-featured enterprise suite with unlimited automation and AI',
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
            ],
        },
    });
    // 2. Company
    const company = await prisma.company.upsert({
        where: { code: 'ACME' },
        update: {},
        create: {
            name: 'Acme Corporation',
            code: 'ACME',
            subdomain: 'acme',
            packageId: enterprisePackage.id,
            planType: 'YEARLY',
            subAmount: 49999,
            subStartDate: new Date('2026-01-01'),
            subEndDate: new Date('2027-01-01'),
            subIsActive: true,
            isActive: true,
            workingDays: 'mon,tue,wed,thu,fri',
            timezone: 'Asia/Kolkata',
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
                        url: 'https://acme.internal/handbook',
                        audience: 'ALL',
                        sortOrder: 1,
                        isActive: true,
                    },
                    {
                        id: 'ql-2',
                        label: 'Health Benefits Portal',
                        url: 'https://insurance.acme.internal',
                        audience: 'EMPLOYEE',
                        sortOrder: 2,
                        isActive: true,
                    },
                ],
                performanceCycles: [
                    {
                        id: 'cycle-q4',
                        name: 'Q4 2026 Annual Performance Review',
                        description: 'Annual milestone OKR evaluations',
                        startDate: '2026-10-01',
                        endDate: '2026-12-31',
                        isActive: true,
                    },
                ],
            },
        },
    });
    // 3. Departments
    const engDept = await prisma.department.upsert({
        where: { companyId_name: { companyId: company.id, name: 'Engineering' } },
        update: {},
        create: { companyId: company.id, name: 'Engineering' },
    });
    const hrDept = await prisma.department.upsert({
        where: { companyId_name: { companyId: company.id, name: 'Human Resources' } },
        update: {},
        create: { companyId: company.id, name: 'Human Resources' },
    });
    const execDept = await prisma.department.upsert({
        where: { companyId_name: { companyId: company.id, name: 'Executive' } },
        update: {},
        create: { companyId: company.id, name: 'Executive' },
    });
    // 4. Leave Types
    const leaveTypesData = [
        { name: 'Casual Leave', code: 'CL', defaultAllocation: 12, isPaid: true, allowHalfDay: true, color: 'blue' },
        { name: 'Sick Leave', code: 'SL', defaultAllocation: 10, isPaid: true, allowHalfDay: true, color: 'emerald' },
        { name: 'Earned Leave', code: 'EL', defaultAllocation: 15, isPaid: true, allowCarry: true, color: 'amber' },
        { name: 'Floater Holiday', code: 'FH', defaultAllocation: 2, isPaid: true, allowHalfDay: false, color: 'purple' },
        { name: 'Comp Off', code: 'CO', defaultAllocation: 0, isPaid: true, isCompOff: true, color: 'indigo' },
    ];
    const leaveTypes = [];
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
    // 5. Users
    const superAdminPass = await bcryptjs_1.default.hash('SuperAdmin@123', 12);
    const adminPass = await bcryptjs_1.default.hash('Admin@123', 12);
    const hrPass = await bcryptjs_1.default.hash('Hr@123', 12);
    const managerPass = await bcryptjs_1.default.hash('Manager@123', 12);
    const employeePass = await bcryptjs_1.default.hash('Employee@123', 12);
    const newhirePass = await bcryptjs_1.default.hash('TempPass@123', 12);
    // Super Admin
    await prisma.user.upsert({
        where: { email: 'superadmin@uptrix.io' },
        update: {},
        create: {
            email: 'superadmin@uptrix.io',
            username: 'superadmin',
            passwordHash: superAdminPass,
            firstName: 'Apex',
            lastName: 'Superadmin',
            role: client_1.Role.PRODUCT_SUPER_ADMIN,
            companyId: null,
            mustChangePassword: false,
        },
    });
    // Company Admin
    const admin = await prisma.user.upsert({
        where: { email: 'admin@acme.com' },
        update: {},
        create: {
            email: 'admin@acme.com',
            username: 'acme_admin',
            passwordHash: adminPass,
            firstName: 'Alex',
            lastName: 'Vance',
            role: client_1.Role.COMPANY_ADMIN,
            companyId: company.id,
            departmentId: execDept.id,
            jobTitle: 'Chief Executive Officer',
            monthlySalary: 250000,
            mustChangePassword: false,
            workMode: client_1.WorkMode.WFO,
        },
    });
    // HR
    const hr = await prisma.user.upsert({
        where: { email: 'hr@acme.com' },
        update: {},
        create: {
            email: 'hr@acme.com',
            username: 'acme_hr',
            passwordHash: hrPass,
            firstName: 'Rachel',
            lastName: 'Green',
            role: client_1.Role.HR,
            companyId: company.id,
            departmentId: hrDept.id,
            jobTitle: 'HR Director',
            monthlySalary: 120000,
            hrPermissions: null, // full HR access
            mustChangePassword: false,
            workMode: client_1.WorkMode.WFO,
        },
    });
    // Manager
    const manager = await prisma.user.upsert({
        where: { email: 'manager@acme.com' },
        update: {},
        create: {
            email: 'manager@acme.com',
            username: 'acme_manager',
            passwordHash: managerPass,
            firstName: 'David',
            lastName: 'Miller',
            role: client_1.Role.EMPLOYEE,
            companyId: company.id,
            departmentId: engDept.id,
            jobTitle: 'Engineering Manager',
            monthlySalary: 180000,
            canManagePerformance: true,
            mustChangePassword: false,
            workMode: client_1.WorkMode.HYBRID,
            joiningDate: new Date('2025-06-01'),
        },
    });
    // Employee (Reporting to Manager)
    const employee = await prisma.user.upsert({
        where: { email: 'employee@acme.com' },
        update: {},
        create: {
            email: 'employee@acme.com',
            username: 'acme_employee',
            passwordHash: employeePass,
            firstName: 'Sarah',
            lastName: 'Connor',
            role: client_1.Role.EMPLOYEE,
            companyId: company.id,
            departmentId: engDept.id,
            managerId: manager.id,
            jobTitle: 'Senior Full Stack Engineer',
            monthlySalary: 85000,
            shiftId: 'shift-general',
            mustChangePassword: false,
            workMode: client_1.WorkMode.HYBRID,
            joiningDate: new Date('2026-01-15'),
            bankDetails: {
                paymentMode: 'BANK_TRANSFER',
                bankName: 'HDFC Bank',
                accountNumber: '50100458923184',
                ifscCode: 'HDFC0001234',
                panNumber: 'ABCDE1234F',
            },
        },
    });
    // Newhire with mustChangePassword = true (for testing compliance)
    const newhire = await prisma.user.upsert({
        where: { email: 'newhire@acme.com' },
        update: {},
        create: {
            email: 'newhire@acme.com',
            username: 'acme_newhire',
            passwordHash: newhirePass,
            firstName: 'John',
            lastName: 'Doe',
            role: client_1.Role.EMPLOYEE,
            companyId: company.id,
            departmentId: engDept.id,
            managerId: manager.id,
            jobTitle: 'Associate Software Engineer',
            monthlySalary: 45000,
            mustChangePassword: true,
            tempPasswordExpiresAt: new Date(Date.now() + 72 * 3600 * 1000),
            workMode: client_1.WorkMode.WFO,
            joiningDate: new Date('2026-10-01'),
        },
    });
    // Create Leave Balances for all company users
    const companyUsers = [admin, hr, manager, employee, newhire];
    for (const u of companyUsers) {
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
    // 6. Holidays
    const holidaysData = [
        { name: 'New Year Day', date: new Date('2026-01-01') },
        { name: 'Republic Day', date: new Date('2026-01-26') },
        { name: 'Holi Festival', date: new Date('2026-03-04') },
        { name: 'Independence Day', date: new Date('2026-08-15') },
        { name: 'Gandhi Jayanti', date: new Date('2026-10-02') },
        { name: 'Diwali Festival', date: new Date('2026-11-08') },
        { name: 'Christmas Day', date: new Date('2026-12-25') },
    ];
    for (const h of holidaysData) {
        await prisma.holiday.create({
            data: {
                companyId: company.id,
                name: h.name,
                date: h.date,
                type: 'PUBLIC',
            },
        });
    }
    // 7. Policies
    const samplePolicies = [
        {
            policyType: 'HR',
            title: 'Code of Conduct & Workplace Ethics',
            slug: 'code-of-conduct',
            body: 'All employees must maintain the highest standards of integrity, respect, and professionalism in all workplace interactions.',
            extractedText: 'All employees must maintain the highest standards of integrity, respect, and professionalism.',
        },
        {
            policyType: 'LEAVE',
            title: 'Leave & Absence Management Policy',
            slug: 'leave-policy',
            body: 'Employees receive 12 days Casual Leave, 10 days Sick Leave, and 15 days Earned Leave per calendar year. Half-day leaves require prior manager approval.',
            extractedText: 'Employees receive 12 days Casual Leave, 10 days Sick Leave, and 15 days Earned Leave per calendar year. Half-day leaves require prior manager approval.',
        },
        {
            policyType: 'CLAIM',
            title: 'Travel & Expense Reimbursement Policy',
            slug: 'claim-policy',
            body: 'Legitimate business expenses must be submitted within 30 days of expense date with valid itemized receipts for manager and finance approval.',
            extractedText: 'Legitimate business expenses must be submitted within 30 days of expense date with valid itemized receipts.',
        },
    ];
    for (const p of samplePolicies) {
        await prisma.policy.upsert({
            where: { companyId_slug: { companyId: company.id, slug: p.slug } },
            update: {},
            create: {
                companyId: company.id,
                policyType: p.policyType,
                title: p.title,
                slug: p.slug,
                body: p.body,
                extractedText: p.extractedText,
            },
        });
    }
    console.log('Database seeded successfully!');
    console.log('Seeded Users:');
    console.log('1. Super Admin: superadmin@uptrix.io / SuperAdmin@123');
    console.log('2. Company Admin: admin@acme.com / Admin@123 (Acme Corp)');
    console.log('3. HR Director: hr@acme.com / Hr@123');
    console.log('4. Manager: manager@acme.com / Manager@123');
    console.log('5. Employee: employee@acme.com / Employee@123');
    console.log('6. New Hire (forced pass change): newhire@acme.com / TempPass@123');
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
