import { Router } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma.js';
import { authMiddleware } from '../middlewares/auth.js';
import { tenantMatchMiddleware } from '../middlewares/tenantMatch.js';
import { policyComplianceMiddleware } from '../middlewares/policyCompliance.js';
import { roleGuard } from '../middlewares/roleGuard.js';
import { hrPermission } from '../middlewares/hrPermission.js';
import { validateBody } from '../middlewares/validate.js';
import { AppError } from '../middlewares/errorHandler.js';
import { CreateEmployeeSchema, UpdateEmployeeSchema } from '../schemas/employee.js';
import { logActivity } from '../services/activityLog.js';
import { sendEmail } from '../lib/mailer.js';
import { uploadProfileImage } from '../lib/storage.js';
import ExcelJS from 'exceljs';

const router = Router();

router.use(authMiddleware, tenantMatchMiddleware, policyComplianceMiddleware);

// GET /employees
router.get('/', roleGuard('COMPANY_ADMIN', 'HR', 'FINANCE', 'IT', 'EMPLOYEE'), async (req, res, next) => {
  try {
    const companyId = req.user!.companyId!;
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));
    const search = req.query.search ? String(req.query.search).trim() : '';
    const departmentId = req.query.departmentId ? Number(req.query.departmentId) : undefined;
    const status = req.query.status ? String(req.query.status).toUpperCase() : 'ACTIVE';

    const where: any = { companyId };
    if (status === 'ACTIVE') {
      where.isActive = true;
    } else if (status === 'OFFBOARDED' || status === 'INACTIVE') {
      where.isActive = false;
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { jobTitle: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (departmentId) {
      where.departmentId = departmentId;
    }

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          isActive: true,
          jobTitle: true,
          profilePhoto: true,
          workMode: true,
          employmentType: true,
          employeeNumber: true,
          personalEmail: true,
          emergencyContact: true,
          joiningDate: true,
          dateOfBirth: true,
          monthlySalary: true,
          currency: true,
          bankDetails: true,
          department: { select: { id: true, name: true } },
          manager: { select: { id: true, firstName: true, lastName: true } },
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.user.count({ where }),
    ]);

    // Mask bank account number unless Admin or HR
    const canSeeBank = req.user!.role === 'COMPANY_ADMIN' || req.user!.role === 'HR';
    const sanitizedItems = items.map((emp) => {
      if (!canSeeBank && emp.bankDetails) {
        const bank = emp.bankDetails as any;
        const acct = bank.accountNumber || '';
        const masked = acct.length > 4 ? `••••••••${acct.slice(-4)}` : '••••';
        return {
          ...emp,
          bankDetails: {
            ...bank,
            accountNumber: masked,
          },
        };
      }
      return emp;
    });

    return res.json({ items: sanitizedItems, total, page, pageSize });
  } catch (error) {
    next(error);
  }
});

// POST /employees
router.post(
  '/',
  roleGuard('COMPANY_ADMIN', 'HR'),
  hrPermission('employees'),
  validateBody(CreateEmployeeSchema),
  async (req, res, next) => {
    try {
      const companyId = req.user!.companyId!;
      const data = req.body;

      // 0. Role authorization checks
      if (req.user!.role === 'HR' && data.role !== 'EMPLOYEE') {
        return next(new AppError(403, 'FORBIDDEN', 'HR can only create Staff Employee accounts.'));
      }
      if (req.user!.role === 'COMPANY_ADMIN' && data.role === 'COMPANY_ADMIN') {
        return next(new AppError(403, 'FORBIDDEN', 'Company Admin can only create Staff Employee or HR accounts.'));
      }

      // 1. Fetch company and package seat limit
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        include: { package: true },
      });

      if (!company) {
        return next(new AppError(404, 'NOT_FOUND', 'Company not found'));
      }

      const activeEmployeeCount = await prisma.user.count({
        where: { companyId, isActive: true },
      });

      const seatLimit = company.package?.employeeLimit ?? 10;
      if (activeEmployeeCount >= seatLimit) {
        return next(
          new AppError(
            400,
            'SEAT_LIMIT_EXCEEDED',
            `Subscribed seat limit reached (${seatLimit} seats). Please upgrade your package subscription.`
          )
        );
      }

      // 2. Validate allowed email domains
      if (company.allowedEmailDomains) {
        const allowed = company.allowedEmailDomains.toLowerCase().split(',').map((s) => s.trim());
        const emailDomain = data.email.split('@')[1]?.toLowerCase();
        if (emailDomain && !allowed.includes(emailDomain)) {
          return next(
            new AppError(
              400,
              'INVALID_EMAIL_DOMAIN',
              `Email domain '@${emailDomain}' is not in the company's allowed email domains (${company.allowedEmailDomains}).`
            )
          );
        }
      }

      // 3. Unique email/username check
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [{ email: data.email.toLowerCase().trim() }, { username: data.username.trim() }],
        },
      });

      if (existingUser) {
        return next(new AppError(400, 'DUPLICATE_USER', 'User with this email or username already exists'));
      }

      // 4. Password provisioning (Manual custom password or Auto-generated temporary password)
      const isManual = data.passwordMode === 'MANUAL' && data.password && data.password.trim().length >= 6;
      const initialPassword = isManual ? data.password.trim() : `Temp@${Math.random().toString(36).slice(-6)}!Aa1`;
      const passwordHash = await bcrypt.hash(initialPassword, 12);
      const tempPasswordExpiresAt = isManual ? null : new Date(Date.now() + 72 * 60 * 60 * 1000);
      const mustChangePassword = data.mustChangePassword !== undefined ? Boolean(data.mustChangePassword) : true;

      // 5. Create user
      const user = await prisma.user.create({
        data: {
          companyId,
          email: data.email.toLowerCase().trim(),
          username: data.username.trim(),
          passwordHash,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          role: data.role,
          departmentId: data.departmentId || null,
          managerId: data.managerId || null,
          jobTitle: data.jobTitle,
          shiftId: data.shiftId || null,
          workMode: data.workMode,
          employmentType: data.employmentType,
          employeeNumber: data.employeeNumber || '',
          personalEmail: data.personalEmail || '',
          address: data.address || '',
          workingAddress: data.workingAddress || '',
          shiftTiming: data.shiftTiming || '',
          joiningDate: data.joiningDate ? new Date(data.joiningDate) : new Date(),
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
          monthlySalary: data.monthlySalary,
          currency: data.currency,
          bankDetails: data.bankDetails as any,
          emergencyContact: data.emergencyContact as any,
          mustChangePassword,
          tempPasswordExpiresAt,
          hrPermissions: data.hrPermissions ? (data.hrPermissions as any) : null,
          canManagePerformance: data.canManagePerformance,
        },
      });

      // 6. Create LeaveBalance rows for every active LeaveType
      const activeLeaveTypes = await prisma.leaveType.findMany({
        where: { companyId, isActive: true },
      });

      for (const lt of activeLeaveTypes) {
        await prisma.leaveBalance.upsert({
          where: { userId_leaveTypeId: { userId: user.id, leaveTypeId: lt.id } },
          update: {},
          create: {
            userId: user.id,
            leaveTypeId: lt.id,
            balance: lt.defaultAllocation,
            carriedOver: 0,
          },
        });
      }

      // 7. Activity Log
      await logActivity({
        companyId,
        actorId: req.user!.id,
        action: 'CREATE_EMPLOYEE',
        objectType: 'User',
        objectId: String(user.id),
        message: `Created employee: ${user.firstName} ${user.lastName} (${user.email})`,
      });

      // 8. Welcome Email
      // 8. Welcome Email with credentials & temp password
      try {
        await sendEmail({
          companyId,
          to: user.email,
          cc: user.personalEmail || undefined,
          subject: `Welcome to ${company.name} — Your Workspace Login Credentials`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
              <div style="text-align: center; margin-bottom: 24px;">
                <h2 style="color: #5E4BE2; margin: 0; font-size: 22px;">Welcome to ${company.name}!</h2>
                <p style="color: #64748b; font-size: 14px; margin-top: 6px;">Your employee workspace account has been created.</p>
              </div>

              <p style="color: #334155; font-size: 14px; line-height: 1.6;">
                Hello <strong>${user.firstName} ${user.lastName}</strong>,
              </p>
              <p style="color: #334155; font-size: 14px; line-height: 1.6;">
                An account has been provisioned for you on the <strong>${company.name}</strong> HRMS portal. You can sign in using your credentials below:
              </p>

              <div style="background-color: #f8fafc; padding: 18px; border-radius: 10px; border: 1px solid #cbd5e1; margin: 20px 0;">
                <p style="margin: 6px 0; font-size: 14px; color: #475569;">
                  <strong>Portal Login Link:</strong><br/>
                  <a href="${process.env.APP_URL || 'http://localhost:5173'}/login" style="color: #5E4BE2; font-weight: bold; text-decoration: none;">${process.env.APP_URL || 'http://localhost:5173'}/login</a>
                </p>
                <div style="margin-top: 12px; padding-top: 12px; border-top: 1px dashed #cbd5e1;">
                  <p style="margin: 4px 0; font-size: 14px; color: #475569;">
                    <strong>Work Email / User ID:</strong><br/>
                    <span style="font-family: monospace; font-size: 15px; font-weight: bold; color: #0f172a;">${user.email}</span>
                  </p>
                  <p style="margin: 10px 0 4px 0; font-size: 14px; color: #475569;">
                    <strong>Temporary Password:</strong><br/>
                    <code style="display: inline-block; font-size: 16px; font-weight: bold; font-family: monospace; background-color: #ede9fe; color: #5b21b6; padding: 4px 10px; border-radius: 6px; margin-top: 4px; border: 1px solid #ddd6fe;">${initialPassword}</code>
                  </p>
                </div>
              </div>

              ${
                mustChangePassword
                  ? `
                <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 16px; margin-bottom: 20px; border-radius: 4px;">
                  <p style="color: #b45309; font-size: 13px; margin: 0; line-height: 1.5;">
                    <strong>Security Notice:</strong> Upon your first sign-in, you will be prompted to choose a new secure password before accessing your workspace.
                  </p>
                </div>
              `
                  : ''
              }

              <p style="color: #64748b; font-size: 13px; line-height: 1.5;">
                If you have any questions or require assistance, please contact your HR or IT department.
              </p>

              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0 16px 0;" />
              <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">
                This is an automated notification from ${company.name} • Uptrix HRMS Platform.
              </p>
            </div>
          `,
          category: 'ONBOARDING',
        });
      } catch (mailErr) {
        console.error('Failed to send employee onboarding email:', mailErr);
      }

      const { passwordHash: _, ...safeCreatedUser } = user;

      return res.status(201).json({
        employee: safeCreatedUser,
        temporaryPassword: initialPassword,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /employees/template
router.get('/template', roleGuard('COMPANY_ADMIN', 'HR'), hrPermission('employees'), async (req, res, next) => {
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Uptrix HRMS';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Employees Template');
    worksheet.columns = [
      { header: 'First Name *', key: 'firstName', width: 18 },
      { header: 'Last Name', key: 'lastName', width: 18 },
      { header: 'Work Email *', key: 'email', width: 30 },
      { header: 'Personal Email *', key: 'personalEmail', width: 30 },
      { header: 'Employee ID *', key: 'employeeNumber', width: 18 },
      { header: 'Date of Birth (YYYY-MM-DD) *', key: 'dateOfBirth', width: 28 },
      { header: 'Work Type (PERMANENT / CONTRACT) *', key: 'workType', width: 32 },
      { header: 'Job Title', key: 'jobTitle', width: 24 },
      { header: 'Role (EMPLOYEE / HR / COMPANY_ADMIN)', key: 'role', width: 34 },
      { header: 'Phone Number', key: 'phone', width: 20 },
      { header: 'Work Mode (WFO / WFH)', key: 'workMode', width: 24 },
      { header: 'Joining Date (YYYY-MM-DD)', key: 'joiningDate', width: 26 },
      { header: 'Shift Timing', key: 'shiftTiming', width: 34 },
      { header: 'Residential / Permanent Address', key: 'address', width: 36 },
      { header: 'Working Address *', key: 'workingAddress', width: 34 },
      { header: 'Cost to Company (CTC)', key: 'monthlySalary', width: 22 },
      { header: 'Currency (INR / USD)', key: 'currency', width: 20 },
      { header: 'Emergency Contact Name *', key: 'emergencyContactName', width: 26 },
      { header: 'Emergency Contact Relationship *', key: 'emergencyContactRelationship', width: 30 },
      { header: 'Emergency Contact Phone *', key: 'emergencyContactPhone', width: 26 },
    ];

    // Format Header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF5E4BE2' },
    };
    headerRow.height = 26;
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    // Sample data rows
    worksheet.addRow({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@uptrix.demo',
      personalEmail: 'john.personal@gmail.com',
      employeeNumber: 'EMP-1001',
      dateOfBirth: '1992-05-15',
      workType: 'PERMANENT',
      jobTitle: 'Senior Software Engineer',
      role: 'EMPLOYEE',
      phone: '+91 9876543210',
      workMode: 'WFO',
      joiningDate: '2026-01-15',
      shiftTiming: 'General Shift (09:30 AM - 06:30 PM)',
      address: 'Flat 402, Green Meadows, Indiranagar, Bengaluru, KA 560038',
      workingAddress: 'Uptrix Tower, 5th Floor, Outer Ring Road, Bengaluru',
      monthlySalary: 85000,
      currency: 'INR',
      emergencyContactName: 'Mary Doe',
      emergencyContactRelationship: 'Spouse',
      emergencyContactPhone: '+91 9876543219',
    });

    worksheet.addRow({
      firstName: 'Sarah',
      lastName: 'Connor',
      email: 'sarah.connor@uptrix.demo',
      personalEmail: 'sarah.c@yahoo.com',
      employeeNumber: 'EMP-1002',
      dateOfBirth: '1994-08-22',
      workType: 'CONTRACT',
      jobTitle: 'Product Designer',
      role: 'EMPLOYEE',
      phone: '+91 9811223344',
      workMode: 'WFH',
      joiningDate: '2026-02-01',
      shiftTiming: 'Flexible Shift',
      address: 'House 12, Palm Grove, Koramangala, Bengaluru, KA 560034',
      workingAddress: 'Remote / Work From Home',
      monthlySalary: 65000,
      currency: 'INR',
      emergencyContactName: 'Robert Connor',
      emergencyContactRelationship: 'Brother',
      emergencyContactPhone: '+91 9811223399',
    });

    // Instructions worksheet
    const instrSheet = workbook.addWorksheet('Instructions');
    instrSheet.columns = [
      { header: 'Column Field', key: 'field', width: 28 },
      { header: 'Required?', key: 'required', width: 14 },
      { header: 'Allowed Values & Format Instructions', key: 'notes', width: 65 },
    ];
    const instrHeader = instrSheet.getRow(1);
    instrHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    instrHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
    instrHeader.height = 24;

    instrSheet.addRow({ field: 'First Name', required: 'YES', notes: 'First name of the employee (e.g. John)' });
    instrSheet.addRow({ field: 'Last Name', required: 'NO', notes: 'Last name or surname (e.g. Doe)' });
    instrSheet.addRow({ field: 'Work Email', required: 'YES', notes: 'Corporate email address. Must be unique in system.' });
    instrSheet.addRow({ field: 'Personal Email', required: 'YES', notes: 'Personal primary email address for recovery / records' });
    instrSheet.addRow({ field: 'Employee ID', required: 'YES', notes: 'Unique ID code, e.g. EMP-1001' });
    instrSheet.addRow({ field: 'Date of Birth', required: 'YES', notes: 'Format: YYYY-MM-DD, e.g. 1995-04-20' });
    instrSheet.addRow({ field: 'Work Type', required: 'YES', notes: 'Must be either PERMANENT or CONTRACT' });
    instrSheet.addRow({ field: 'Job Title', required: 'NO', notes: 'Designation / role title, e.g. Software Engineer' });
    instrSheet.addRow({ field: 'Role', required: 'NO', notes: 'EMPLOYEE, HR, or COMPANY_ADMIN (Default: EMPLOYEE)' });
    instrSheet.addRow({ field: 'Work Mode', required: 'NO', notes: 'WFO (Office) or WFH (Work From Home). Default: WFO' });
    instrSheet.addRow({ field: 'Joining Date', required: 'NO', notes: 'Format: YYYY-MM-DD, e.g. 2026-01-15' });
    instrSheet.addRow({ field: 'Shift Timing', required: 'NO', notes: 'e.g. General Shift (09:30 AM - 06:30 PM), Morning, Afternoon, Night, Flexible' });
    instrSheet.addRow({ field: 'Residential Address', required: 'NO', notes: 'Residential or permanent home address' });
    instrSheet.addRow({ field: 'Working Address', required: 'YES', notes: 'Office or branch location address' });
    instrSheet.addRow({ field: 'Cost to Company (CTC)', required: 'NO', notes: 'Base monthly CTC amount, e.g. 85000' });
    instrSheet.addRow({ field: 'Emergency Contact', required: 'YES', notes: 'Provide Name, Relationship, and Phone number' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Employee_Bulk_Import_Template.xlsx"');
    await workbook.xlsx.write(res);
    return res.end();
  } catch (error) {
    next(error);
  }
});

// POST /employees/bulk-create
router.post(
  '/bulk-create',
  roleGuard('COMPANY_ADMIN', 'HR'),
  hrPermission('employees'),
  async (req, res, next) => {
    try {
      const companyId = req.user!.companyId!;
      const { employees } = req.body;

      if (!Array.isArray(employees) || employees.length === 0) {
        return next(new AppError(400, 'INVALID_BODY', 'Please provide a non-empty list of employees to import.'));
      }

      // Check company & seat limit
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        include: { package: true },
      });
      if (!company) {
        return next(new AppError(404, 'NOT_FOUND', 'Company not found'));
      }

      const activeEmployeeCount = await prisma.user.count({
        where: { companyId, isActive: true },
      });
      const seatLimit = Math.max(company.package?.employeeLimit ?? 2500, 2500);
      if (activeEmployeeCount + employees.length > seatLimit) {
        return next(
          new AppError(
            400,
            'SEAT_LIMIT_EXCEEDED',
            `Cannot import ${employees.length} employees. Current active: ${activeEmployeeCount}/${seatLimit} seats. Please upgrade your package subscription.`
          )
        );
      }

      const allowedDomains = company.allowedEmailDomains
        ? company.allowedEmailDomains.toLowerCase().split(',').map((s) => s.trim())
        : null;

      const activeLeaveTypes = await prisma.leaveType.findMany({
        where: { companyId, isActive: true },
      });

      // Pre-fetch all existing emails and usernames in a single query
      const batchEmails = employees.map((e: any) => String(e.email || '').toLowerCase().trim()).filter(Boolean);
      const batchUsernames = employees.map((e: any) => (e.username?.trim() || String(e.email || '').split('@')[0])).filter(Boolean);

      const existingInDb = await prisma.user.findMany({
        where: {
          OR: [
            { email: { in: batchEmails } },
            { username: { in: batchUsernames } },
          ],
        },
        select: { email: true, username: true },
      });

      const existingEmailSet = new Set(existingInDb.map((u) => u.email.toLowerCase()));
      const existingUsernameSet = new Set(existingInDb.map((u) => u.username.toLowerCase()));

      const seenBatchEmails = new Set<string>();
      const seenBatchUsernames = new Set<string>();

      // Safe date parser helper
      const parseSafeDate = (val: any) => {
        if (!val) return null;
        if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
        if (typeof val === 'number' || (!isNaN(Number(val)) && !String(val).includes('-') && !String(val).includes('/'))) {
          const num = Number(val);
          if (num > 1000 && num < 100000) {
            const d = new Date(Math.round((num - 25569) * 86400 * 1000));
            return isNaN(d.getTime()) ? null : d;
          }
        }
        const str = String(val).trim();
        const d = new Date(str);
        return isNaN(d.getTime()) ? null : d;
      };

      // Pre-compute password hash once for the entire batch
      const defaultTempPassword = `Welcome@${new Date().getFullYear()}!`;
      const sharedPasswordHash = await bcrypt.hash(defaultTempPassword, 10);
      const tempPasswordExpiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);

      const results: Array<{ row: number; email: string; success: boolean; error?: string }> = [];
      const createdUsers: any[] = [];
      const leaveBalanceRows: any[] = [];

      for (let i = 0; i < employees.length; i++) {
        const item = employees[i];
        const rowNum = i + 1;
        const email = String(item.email || '').toLowerCase().trim();
        const firstName = String(item.firstName || '').trim();

        if (!email || !firstName) {
          results.push({ row: rowNum, email, success: false, error: 'First Name and Work Email are required.' });
          continue;
        }

        const workingAddress = String(item.workingAddress || '').trim();
        if (!workingAddress) {
          results.push({ row: rowNum, email, success: false, error: 'Working Address is required.' });
          continue;
        }

        // Domain check
        if (allowedDomains) {
          const domain = email.split('@')[1]?.toLowerCase();
          if (domain && !allowedDomains.includes(domain)) {
            results.push({ row: rowNum, email, success: false, error: `Email domain @${domain} is not permitted.` });
            continue;
          }
        }

        const username = item.username?.trim() || email.split('@')[0];

        // Check if already in DB
        if (existingEmailSet.has(email) || existingUsernameSet.has(username)) {
          results.push({ row: rowNum, email, success: false, error: 'Email or username already exists in system.' });
          continue;
        }

        // Check if duplicate within current batch
        if (seenBatchEmails.has(email) || seenBatchUsernames.has(username)) {
          results.push({ row: rowNum, email, success: false, error: 'Duplicate email or username within this file.' });
          continue;
        }

        seenBatchEmails.add(email);
        seenBatchUsernames.add(username);

        let assignedRole: any = 'EMPLOYEE';
        if (req.user!.role === 'HR') {
          assignedRole = 'EMPLOYEE';
        } else if (req.user!.role === 'COMPANY_ADMIN') {
          assignedRole = ['HR', 'FINANCE', 'IT'].includes(item.role) ? item.role : 'EMPLOYEE';
        } else if (['HR', 'FINANCE', 'IT', 'COMPANY_ADMIN'].includes(item.role)) {
          assignedRole = item.role;
        }

        try {
          const user = await prisma.user.create({
            data: {
              companyId,
              email,
              username,
              passwordHash: sharedPasswordHash,
              firstName,
              lastName: String(item.lastName || '').trim(),
              phone: String(item.phone || '').trim(),
              role: assignedRole,
              jobTitle: String(item.jobTitle || '').trim(),
              workMode: item.workMode === 'WFH' ? 'WFH' : 'WFO',
              employmentType: String(item.workType || item.employmentType || '').toUpperCase() === 'CONTRACT' ? 'CONTRACT' : 'PERMANENT',
              employeeNumber: String(item.employeeNumber || '').trim(),
              personalEmail: String(item.personalEmail || '').trim(),
              address: String(item.address || '').trim(),
              workingAddress: String(item.workingAddress || '').trim(),
              shiftTiming: String(item.shiftTiming || 'General Shift (09:30 AM - 06:30 PM)').trim(),
              joiningDate: parseSafeDate(item.joiningDate) || new Date(),
              dateOfBirth: parseSafeDate(item.dateOfBirth),
              monthlySalary: Number(item.monthlySalary) || 0,
              currency: String(item.currency || 'INR').trim(),
              emergencyContact: {
                name: String(item.emergencyContactName || item.emergencyContact?.name || '').trim(),
                relationship: String(item.emergencyContactRelationship || item.emergencyContact?.relationship || '').trim(),
                phone: String(item.emergencyContactPhone || item.emergencyContact?.phone || '').trim(),
              },
              mustChangePassword: true,
              tempPasswordExpiresAt,
            },
          });

          // Queue leave balances for bulk insertion
          for (const lt of activeLeaveTypes) {
            leaveBalanceRows.push({
              userId: user.id,
              leaveTypeId: lt.id,
              balance: lt.defaultAllocation,
              carriedOver: 0,
            });
          }

          createdUsers.push({ id: user.id, email: user.email, firstName: user.firstName, tempPassword: defaultTempPassword });
          results.push({ row: rowNum, email, success: true });
        } catch (rowErr: any) {
          results.push({ row: rowNum, email, success: false, error: rowErr.message || 'Database error during insertion.' });
        }
      }

      // Bulk insert leave balances in one query
      if (leaveBalanceRows.length > 0) {
        await prisma.leaveBalance.createMany({
          data: leaveBalanceRows,
          skipDuplicates: true,
        });
      }

      if (createdUsers.length > 0) {
        await logActivity({
          companyId,
          actorId: req.user!.id,
          action: 'BULK_IMPORT_EMPLOYEES',
          objectType: 'User',
          objectId: String(createdUsers[0].id),
          message: `Bulk imported ${createdUsers.length} employee(s) via Excel/Bulk input`,
        });

        // Dispatch welcome emails with login credentials & temp password
        for (const u of createdUsers) {
          sendEmail({
            companyId,
            to: u.email,
            subject: `Welcome to ${company.name} — Your Workspace Login Credentials`,
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
                <div style="text-align: center; margin-bottom: 24px;">
                  <h2 style="color: #5E4BE2; margin: 0; font-size: 22px;">Welcome to ${company.name}!</h2>
                  <p style="color: #64748b; font-size: 14px; margin-top: 6px;">Your workspace account has been created.</p>
                </div>
                <p style="color: #334155; font-size: 14px;">Hello <strong>${u.firstName}</strong>,</p>
                <p style="color: #334155; font-size: 14px;">Your account has been onboarded to <strong>${company.name}</strong> HRMS portal. Here are your initial login credentials:</p>
                <div style="background-color: #f8fafc; padding: 18px; border-radius: 10px; border: 1px solid #cbd5e1; margin: 20px 0;">
                  <p style="margin: 6px 0; font-size: 14px; color: #475569;">
                    <strong>Portal Login URL:</strong><br/>
                    <a href="${process.env.APP_URL || 'http://localhost:5173'}/login" style="color: #5E4BE2; font-weight: bold;">${process.env.APP_URL || 'http://localhost:5173'}/login</a>
                  </p>
                  <p style="margin: 10px 0 4px 0; font-size: 14px; color: #475569;">
                    <strong>Work Email:</strong><br/>
                    <span style="font-family: monospace; font-size: 15px; font-weight: bold; color: #0f172a;">${u.email}</span>
                  </p>
                  <p style="margin: 10px 0 4px 0; font-size: 14px; color: #475569;">
                    <strong>Temporary Password:</strong><br/>
                    <code style="display: inline-block; font-size: 16px; font-weight: bold; font-family: monospace; background-color: #ede9fe; color: #5b21b6; padding: 4px 10px; border-radius: 6px; margin-top: 4px;">${u.tempPassword}</code>
                  </p>
                </div>
                <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 16px; margin-bottom: 20px; border-radius: 4px;">
                  <p style="color: #b45309; font-size: 13px; margin: 0;">
                    <strong>Security Notice:</strong> You will be prompted to choose a new password upon your first sign-in.
                  </p>
                </div>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0 16px 0;" />
                <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">This is an automated notification from ${company.name} • Uptrix HRMS Platform.</p>
              </div>
            `,
            category: 'ONBOARDING',
          }).catch((err) => console.error(`Failed to send bulk onboarding email to ${u.email}:`, err));
        }
      }

      return res.status(200).json({
        success: true,
        totalSubmitted: employees.length,
        createdCount: createdUsers.length,
        failedCount: employees.length - createdUsers.length,
        defaultTempPassword,
        results,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /employees/:id
router.get('/:id', async (req, res, next) => {
  try {
    const companyId = req.user!.companyId!;
    const empId = Number(req.params.id);

    const employee = await prisma.user.findFirst({
      where: { id: empId, companyId },
      include: {
        department: true,
        manager: { select: { id: true, firstName: true, lastName: true, email: true } },
        leaveBalances: { include: { leaveType: true } },
      },
    });

    if (!employee) {
      return next(new AppError(404, 'NOT_FOUND', 'Employee not found'));
    }

    const { passwordHash, ...safeEmployee } = employee;
    return res.json({ employee: safeEmployee });
  } catch (error) {
    next(error);
  }
});

// PATCH /employees/:id
router.patch(
  '/:id',
  roleGuard('COMPANY_ADMIN', 'HR'),
  hrPermission('employees'),
  validateBody(UpdateEmployeeSchema),
  async (req, res, next) => {
    try {
      const companyId = req.user!.companyId!;
      const empId = Number(req.params.id);
      const data = req.body;

      const employee = await prisma.user.findFirst({
        where: { id: empId, companyId },
      });
      if (!employee) {
        return next(new AppError(404, 'NOT_FOUND', 'Employee not found'));
      }

      if (data.role) {
        if (req.user!.role === 'HR' && data.role !== 'EMPLOYEE') {
          return next(new AppError(403, 'FORBIDDEN', 'HR can only assign Staff Employee role.'));
        }
        if (req.user!.role === 'COMPANY_ADMIN' && data.role === 'COMPANY_ADMIN') {
          return next(new AppError(403, 'FORBIDDEN', 'Company Admin cannot assign Company Admin role.'));
        }
      }

      const updateData: any = { ...data };
      if (data.joiningDate) updateData.joiningDate = new Date(data.joiningDate);
      if (data.dateOfBirth) updateData.dateOfBirth = new Date(data.dateOfBirth);

      const updated = await prisma.user.update({
        where: { id: empId },
        data: updateData,
      });

      await logActivity({
        companyId,
        actorId: req.user!.id,
        action: 'UPDATE_EMPLOYEE',
        objectType: 'User',
        objectId: String(empId),
        message: `Updated profile of employee: ${updated.firstName} ${updated.lastName}`,
      });

      const { passwordHash, ...safeUpdated } = updated;
      return res.json({ employee: safeUpdated });
    } catch (error) {
      next(error);
    }
  }
);

// POST /employees/:id/photo (Upload profile photo to AWS S3 'image/' folder)
router.post(
  '/:id/photo',
  roleGuard('COMPANY_ADMIN', 'HR'),
  hrPermission('employees'),
  uploadProfileImage.any(),
  async (req, res, next) => {
    try {
      const companyId = req.user!.companyId!;
      const empId = Number(req.params.id);
      const files = req.files as Express.Multer.File[];
      const file = files && files.length > 0 ? files[0] : null;

      if (!file) {
        return next(new AppError(400, 'NO_FILE', 'No image file uploaded'));
      }

      const fileUrl = (file as any).location || `/image/${file.filename}`;
      const s3Key = (file as any).key || `image/${file.filename}`;

      const updated = await prisma.user.update({
        where: { id: empId },
        data: { profilePhoto: fileUrl },
      });

      await logActivity({
        companyId,
        actorId: req.user!.id,
        action: 'UPDATE_EMPLOYEE_PHOTO',
        objectType: 'User',
        objectId: String(empId),
        message: `Updated profile image for employee ID ${empId} in AWS S3 (image folder)`,
      });

      return res.json({
        success: true,
        message: 'Employee profile photo updated successfully in AWS S3',
        profilePhoto: updated.profilePhoto,
        url: fileUrl,
        key: s3Key,
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /employees/:id/reset-password
router.post(
  '/:id/reset-password',
  roleGuard('COMPANY_ADMIN', 'HR'),
  hrPermission('employees'),
  async (req, res, next) => {
    try {
      const companyId = req.user!.companyId!;
      const empId = Number(req.params.id);

      const employee = await prisma.user.findFirst({
        where: { id: empId, companyId },
      });
      if (!employee) {
        return next(new AppError(404, 'NOT_FOUND', 'Employee not found'));
      }

      const tempPassword = `Reset@${Math.random().toString(36).slice(-6)}!Aa1`;
      const passwordHash = await bcrypt.hash(tempPassword, 12);
      const tempPasswordExpiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);

      await prisma.user.update({
        where: { id: empId },
        data: {
          passwordHash,
          mustChangePassword: true,
          tempPasswordExpiresAt,
        },
      });

      await logActivity({
        companyId,
        actorId: req.user!.id,
        action: 'RESET_EMPLOYEE_PASSWORD',
        objectType: 'User',
        objectId: String(empId),
        message: `Reset temporary password for ${employee.firstName} ${employee.lastName}`,
      });

      return res.json({
        success: true,
        temporaryPassword: tempPassword,
        message: 'Password reset successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

// PATCH /employees/:id/deactivate
router.patch('/:id/deactivate', roleGuard('COMPANY_ADMIN', 'HR'), hrPermission('employees'), async (req, res, next) => {
  try {
    const companyId = req.user!.companyId!;
    const empId = Number(req.params.id);

    const employee = await prisma.user.findFirst({
      where: { id: empId, companyId },
    });
    if (!employee) {
      return next(new AppError(404, 'NOT_FOUND', 'Employee not found'));
    }

    await prisma.user.update({
      where: { id: empId },
      data: { isActive: false },
    });

    await logActivity({
      companyId,
      actorId: req.user!.id,
      action: 'DEACTIVATE_EMPLOYEE',
      objectType: 'User',
      objectId: String(empId),
      message: `Deactivated employee ${employee.firstName} ${employee.lastName}`,
    });

    return res.json({ success: true, message: 'Employee account deactivated' });
  } catch (error) {
    next(error);
  }
});

// PATCH /employees/:id/reactivate
router.patch('/:id/reactivate', roleGuard('COMPANY_ADMIN', 'HR'), hrPermission('employees'), async (req, res, next) => {
  try {
    const companyId = req.user!.companyId!;
    const empId = Number(req.params.id);

    const employee = await prisma.user.findFirst({
      where: { id: empId, companyId },
    });
    if (!employee) {
      return next(new AppError(404, 'NOT_FOUND', 'Employee not found'));
    }

    await prisma.user.update({
      where: { id: empId },
      data: { isActive: true },
    });

    await logActivity({
      companyId,
      actorId: req.user!.id,
      action: 'REACTIVATE_EMPLOYEE',
      objectType: 'User',
      objectId: String(empId),
      message: `Reactivated employee ${employee.firstName} ${employee.lastName}`,
    });

    return res.json({ success: true, message: 'Employee account reactivated' });
  } catch (error) {
    next(error);
  }
});

export default router;
