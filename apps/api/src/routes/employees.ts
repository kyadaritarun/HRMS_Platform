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

const router = Router();

router.use(authMiddleware, tenantMatchMiddleware, policyComplianceMiddleware);

// GET /employees
router.get('/', roleGuard('COMPANY_ADMIN', 'HR', 'EMPLOYEE'), async (req, res, next) => {
  try {
    const companyId = req.user!.companyId!;
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));
    const search = req.query.search ? String(req.query.search).trim() : '';
    const departmentId = req.query.departmentId ? Number(req.query.departmentId) : undefined;

    const where: any = { companyId, isActive: true };

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
          jobTitle: true,
          profilePhoto: true,
          workMode: true,
          employmentType: true,
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

      // 4. Generate temporary password
      const tempPassword = `Temp@${Math.random().toString(36).slice(-6)}!Aa1`;
      const passwordHash = await bcrypt.hash(tempPassword, 12);
      const tempPasswordExpiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours

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
          employeeNumber: data.employeeNumber,
          joiningDate: data.joiningDate ? new Date(data.joiningDate) : new Date(),
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
          monthlySalary: data.monthlySalary,
          currency: data.currency,
          bankDetails: data.bankDetails as any,
          emergencyContact: data.emergencyContact as any,
          mustChangePassword: true,
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
      await sendEmail({
        companyId,
        to: user.email,
        subject: `Welcome to ${company.name} — Your Uptrix Workspace Account`,
        html: `
          <p>Hello ${user.firstName},</p>
          <p>Your workspace account at <strong>${company.name}</strong> has been created.</p>
          <p>Temporary credentials:</p>
          <ul>
            <li><strong>Username / Email:</strong> ${user.email}</li>
            <li><strong>Temporary Password:</strong> <code>${tempPassword}</code></li>
          </ul>
          <p>Please log in within 72 hours and update your password.</p>
        `,
        category: 'ONBOARDING',
      });

      const { passwordHash: _, ...safeCreatedUser } = user;

      return res.status(201).json({
        employee: safeCreatedUser,
        temporaryPassword: tempPassword,
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

export default router;
