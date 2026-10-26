import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authMiddleware } from '../middlewares/auth.js';
import { tenantMatchMiddleware } from '../middlewares/tenantMatch.js';
import { policyComplianceMiddleware } from '../middlewares/policyCompliance.js';
import { roleGuard } from '../middlewares/roleGuard.js';
import { hrPermission } from '../middlewares/hrPermission.js';
import { validateBody } from '../middlewares/validate.js';
import { AppError } from '../middlewares/errorHandler.js';
import {
  DepartmentSchema,
  HolidaySchema,
  LeaveTypeSchema,
  CompanySettingsUpdateSchema,
} from '../schemas/company.js';
import { logActivity } from '../services/activityLog.js';
import { generateAttendanceExcel } from '../services/attendance.js';
import {
  sendBirthdayWish,
  sendHolidayAnnouncement,
  runAutomatedEventEmails,
  DEFAULT_EVENT_EMAIL_SETTINGS,
} from '../services/eventEmailService.js';

const router = Router();

// Apply base tenant security to all company endpoints
router.use(authMiddleware, tenantMatchMiddleware, policyComplianceMiddleware);

// GET /company/dashboard
router.get('/dashboard', roleGuard('COMPANY_ADMIN', 'HR'), async (req, res, next) => {
  try {
    const companyId = req.user!.companyId!;

    const [
      employeeCount,
      departmentCount,
      policyCount,
      pendingRequests,
      recentEmployees,
      company,
    ] = await Promise.all([
      prisma.user.count({ where: { companyId, isActive: true } }),
      prisma.department.count({ where: { companyId } }),
      prisma.policy.count({ where: { companyId } }),
      prisma.request.groupBy({
        by: ['type'],
        where: { companyId, status: 'PENDING' },
        _count: { id: true },
      }),
      prisma.user.findMany({
        where: { companyId, isActive: true },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          jobTitle: true,
          department: { select: { name: true } },
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.company.findUnique({
        where: { id: companyId },
        select: { settings: true },
      }),
    ]);

    const pendingSummary: Record<string, number> = {
      LEAVE: 0,
      COMP_OFF: 0,
      REGULARIZATION: 0,
      CLAIM: 0,
      GOAL: 0,
      TASK: 0,
    };
    for (const pr of pendingRequests) {
      pendingSummary[pr.type] = pr._count.id;
    }

    const settings = (company?.settings as any) || {};

    return res.json({
      metrics: {
        totalEmployees: employeeCount,
        totalDepartments: departmentCount,
        totalPolicies: policyCount,
        pendingApprovals: pendingSummary,
      },
      recentEmployees,
      quickLinks: settings.quickLinks || [],
    });
  } catch (error) {
    next(error);
  }
});

// GET /company/settings
router.get('/settings', roleGuard('COMPANY_ADMIN', 'HR'), async (req, res, next) => {
  try {
    const companyId = req.user!.companyId!;
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        code: true,
        subdomain: true,
        customDomain: true,
        workingDays: true,
        timezone: true,
        shifts: true,
        settings: true,
        allowedEmailDomains: true,
        package: {
          select: {
            id: true,
            name: true,
            enabledFeatures: true,
            employeeLimit: true,
          },
        },
      },
    });

    if (!company) {
      return next(new AppError(404, 'NOT_FOUND', 'Company not found'));
    }

    return res.json({ company });
  } catch (error) {
    next(error);
  }
});

// PUT /company/settings
router.put(
  '/settings',
  roleGuard('COMPANY_ADMIN', 'HR'),
  validateBody(CompanySettingsUpdateSchema),
  async (req, res, next) => {
    try {
      const companyId = req.user!.companyId!;
      const data = req.body;

      const updated = await prisma.company.update({
        where: { id: companyId },
        data: {
          workingDays: data.workingDays,
          timezone: data.timezone,
          allowedEmailDomains: data.allowedEmailDomains,
          shifts: data.shifts as any,
          settings: data.settings as any,
        },
      });

      await logActivity({
        companyId,
        actorId: req.user!.id,
        action: 'UPDATE_COMPANY_SETTINGS',
        objectType: 'Company',
        objectId: String(companyId),
        message: `${req.user!.firstName} updated company configuration settings`,
      });

      return res.json({ success: true, company: updated });
    } catch (error) {
      next(error);
    }
  }
);

// Departments CRUD
router.get('/departments', async (req, res, next) => {
  try {
    const companyId = req.user!.companyId!;
    const departments = await prisma.department.findMany({
      where: { companyId },
      include: {
        parent: { select: { id: true, name: true } },
        users: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            jobTitle: true,
            role: true,
            profilePhoto: true,
            workMode: true,
          },
          take: 50,
        },
        _count: { select: { users: true } },
      },
      orderBy: { name: 'asc' },
    });
    return res.json({ departments });
  } catch (error) {
    next(error);
  }
});

router.post(
  '/departments',
  roleGuard('COMPANY_ADMIN', 'HR'),
  hrPermission('policies'),
  validateBody(DepartmentSchema),
  async (req, res, next) => {
    try {
      const companyId = req.user!.companyId!;
      const { name, parentId } = req.body;

      const existing = await prisma.department.findUnique({
        where: { companyId_name: { companyId, name } },
      });
      if (existing) {
        return next(new AppError(400, 'DUPLICATE_NAME', 'Department with this name already exists'));
      }

      const department = await prisma.department.create({
        data: {
          companyId,
          name,
          parentId: parentId || null,
        },
      });

      await logActivity({
        companyId,
        actorId: req.user!.id,
        action: 'CREATE_DEPARTMENT',
        objectType: 'Department',
        objectId: String(department.id),
        message: `Created department: ${name}`,
      });

      return res.status(201).json({ department });
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  '/departments/:id',
  roleGuard('COMPANY_ADMIN', 'HR'),
  hrPermission('policies'),
  validateBody(DepartmentSchema.partial()),
  async (req, res, next) => {
    try {
      const companyId = req.user!.companyId!;
      const deptId = Number(req.params.id);

      const department = await prisma.department.findFirst({
        where: { id: deptId, companyId },
        include: { _count: { select: { users: true } } },
      });
      if (!department) {
        return next(new AppError(404, 'NOT_FOUND', 'Department not found'));
      }

      if (req.body.isActive === false && department._count.users > 0) {
        return next(
          new AppError(
            400,
            'DEPARTMENT_HAS_MEMBERS',
            `Cannot deactivate "${department.name}" because it currently has ${department._count.users} employee(s) assigned. Please reassign them to another department first.`
          )
        );
      }

      const updated = await prisma.department.update({
        where: { id: deptId },
        data: req.body,
      });

      if (req.body.isActive !== undefined && req.body.isActive !== (department as any).isActive) {
        await logActivity({
          companyId,
          actorId: req.user!.id,
          action: req.body.isActive ? 'ACTIVATE_DEPARTMENT' : 'DEACTIVATE_DEPARTMENT',
          objectType: 'Department',
          objectId: String(deptId),
          message: `${req.body.isActive ? 'Activated' : 'Deactivated'} department: ${department.name}`,
        });
      }

      return res.json({ department: updated });
    } catch (error) {
      next(error);
    }
  }
);

router.delete('/departments/:id', roleGuard('COMPANY_ADMIN', 'HR'), hrPermission('policies'), async (req, res, next) => {
  try {
    const companyId = req.user!.companyId!;
    const deptId = Number(req.params.id);

    const department = await prisma.department.findFirst({
      where: { id: deptId, companyId },
    });
    if (!department) {
      return next(new AppError(404, 'NOT_FOUND', 'Department not found'));
    }

    // Departments cannot be permanently deleted to preserve referential integrity; deactivate instead
    await prisma.department.update({
      where: { id: deptId },
      data: { isActive: false },
    });

    await logActivity({
      companyId,
      actorId: req.user!.id,
      action: 'DEACTIVATE_DEPARTMENT',
      objectType: 'Department',
      objectId: String(deptId),
      message: `Deactivated department: ${department.name}`,
    });

    return res.json({ success: true, message: 'Department deactivated' });
  } catch (error) {
    next(error);
  }
});

// Holidays CRUD
router.get('/holidays', async (req, res, next) => {
  try {
    const companyId = req.user!.companyId!;
    const holidays = await prisma.holiday.findMany({
      where: { companyId },
      orderBy: { date: 'asc' },
    });
    return res.json({ holidays });
  } catch (error) {
    next(error);
  }
});

router.post(
  '/holidays',
  roleGuard('COMPANY_ADMIN', 'HR'),
  validateBody(HolidaySchema),
  async (req, res, next) => {
    try {
      const companyId = req.user!.companyId!;
      const { name, date, type, description, sendEmailToEmployees } = req.body;

      const holiday = await prisma.holiday.create({
        data: {
          companyId,
          name,
          date: new Date(date),
          type,
          description,
        },
      });

      await logActivity({
        companyId,
        actorId: req.user!.id,
        action: 'CREATE_HOLIDAY',
        objectType: 'Holiday',
        objectId: String(holiday.id),
        message: `Added holiday: ${name} on ${date}`,
      });

      // Automatically dispatch holiday announcement email to all employees once configured
      sendHolidayAnnouncement({
        companyId,
        holidayId: holiday.id,
        isManual: false,
      }).catch((err) => console.error('[Holiday Email Dispatch Error]', err.message));

      return res.status(201).json({ holiday });
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  '/holidays/:id',
  roleGuard('COMPANY_ADMIN', 'HR'),
  validateBody(HolidaySchema.partial()),
  async (req, res, next) => {
    try {
      const companyId = req.user!.companyId!;
      const id = Number(req.params.id);
      const existing = await prisma.holiday.findFirst({
        where: { id, companyId },
      });
      if (!existing) {
        return next(new AppError(404, 'NOT_FOUND', 'Holiday not found'));
      }
      const data: any = { ...req.body };
      delete data.sendEmailToEmployees;

      if (data.date) {
        data.date = new Date(data.date);
      }
      const updated = await prisma.holiday.update({
        where: { id },
        data,
      });

      // Automatically dispatch updated holiday announcement to all employees
      sendHolidayAnnouncement({
        companyId,
        holidayId: updated.id,
        isManual: false,
      }).catch((err) => console.error('[Holiday Email Dispatch Error]', err.message));

      return res.json({ holiday: updated });
    } catch (error) {
      next(error);
    }
  }
);

router.delete('/holidays/:id', roleGuard('COMPANY_ADMIN', 'HR'), async (req, res, next) => {
  try {
    const companyId = req.user!.companyId!;
    const id = Number(req.params.id);

    await prisma.holiday.deleteMany({
      where: { id, companyId },
    });

    return res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// AUTOMATED & ON-DEMAND EVENT EMAILS
// ==========================================

// GET /company/event-emails/settings
router.get('/event-emails/settings', roleGuard('COMPANY_ADMIN', 'HR'), async (req, res, next) => {
  try {
    const companyId = req.user!.companyId!;
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { settings: true },
    });
    const settings = (company?.settings as any) || {};
    const eventEmails = {
      ...DEFAULT_EVENT_EMAIL_SETTINGS,
      ...(settings.eventEmails || {}),
    };
    return res.json({ settings: eventEmails });
  } catch (error) {
    next(error);
  }
});

// PUT /company/event-emails/settings
router.put('/event-emails/settings', roleGuard('COMPANY_ADMIN', 'HR'), async (req, res, next) => {
  try {
    const companyId = req.user!.companyId!;
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { settings: true },
    });
    const currentSettings = (company?.settings as any) || {};
    const updatedEventEmails = {
      ...DEFAULT_EVENT_EMAIL_SETTINGS,
      ...(currentSettings.eventEmails || {}),
      ...req.body,
    };
    await prisma.company.update({
      where: { id: companyId },
      data: {
        settings: {
          ...currentSettings,
          eventEmails: updatedEventEmails,
        },
      },
    });

    await logActivity({
      companyId,
      actorId: req.user!.id,
      action: 'UPDATE_EVENT_EMAIL_SETTINGS',
      objectType: 'CompanySettings',
      objectId: String(companyId),
      message: `${req.user!.firstName} updated automated birthday & holiday email settings`,
    });

    return res.json({
      success: true,
      message: 'Automated email settings updated successfully.',
      settings: updatedEventEmails,
    });
  } catch (error) {
    next(error);
  }
});

// POST /company/event-emails/trigger-test
router.post('/event-emails/trigger-test', roleGuard('COMPANY_ADMIN', 'HR'), async (req, res, next) => {
  try {
    const result = await runAutomatedEventEmails();
    return res.json({
      success: true,
      message: 'Automated event emails check executed successfully.',
      result,
    });
  } catch (error) {
    next(error);
  }
});

// POST /company/birthdays/:id/send-wishes
router.post('/birthdays/:id/send-wishes', roleGuard('COMPANY_ADMIN', 'HR'), async (req, res, next) => {
  try {
    const companyId = req.user!.companyId!;
    const userId = Number(req.params.id);
    const result = await sendBirthdayWish({
      companyId,
      userId,
      isManual: true,
    });
    if (!result.success) {
      return res.status(400).json(result);
    }
    return res.json(result);
  } catch (error) {
    next(error);
  }
});

// POST /company/holidays/:id/send-announcement
router.post('/holidays/:id/send-announcement', roleGuard('COMPANY_ADMIN', 'HR'), async (req, res, next) => {
  try {
    const companyId = req.user!.companyId!;
    const holidayId = Number(req.params.id);
    const result = await sendHolidayAnnouncement({
      companyId,
      holidayId,
      isManual: true,
    });
    if (!result.success) {
      return res.status(400).json(result);
    }
    return res.json(result);
  } catch (error) {
    next(error);
  }
});

// Leave Types CRUD
router.get('/leave-types', async (req, res, next) => {
  try {
    const companyId = req.user!.companyId!;
    const userId = req.user?.id;
    const showAll = req.query.all === 'true' || req.query.includeInactive === 'true';

    const whereClause: any = { companyId };
    if (!showAll) {
      whereClause.isActive = true;
    }

    const leaveTypes = await prisma.leaveType.findMany({
      where: whereClause,
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });

    let userBalances: any[] = [];
    const approvedDaysByType: Record<number, number> = {};

    if (userId) {
      userBalances = await prisma.leaveBalance.findMany({
        where: { userId },
      });

      const approvedLeaves = await prisma.request.findMany({
        where: {
          userId,
          companyId,
          type: 'LEAVE',
          status: 'APPROVED',
        },
        select: {
          leaveTypeId: true,
          days: true,
        },
      });

      for (const reqItem of approvedLeaves) {
        if (reqItem.leaveTypeId) {
          approvedDaysByType[reqItem.leaveTypeId] =
            (approvedDaysByType[reqItem.leaveTypeId] || 0) + Number(reqItem.days || 0);
        }
      }
    }

    const leaveTypesWithUserData = await Promise.all(
      leaveTypes.map(async (lt) => {
        const ub = userBalances.find((b) => b.leaveTypeId === lt.id);
        const totalAllocated = Number(lt.defaultAllocation);
        const usedDays = approvedDaysByType[lt.id] || 0;
        const remainingBalance = Math.max(0, totalAllocated - usedDays);

        // Keep database leaveBalance in sync for the requesting user
        if (userId && (!ub || Number(ub.balance) !== remainingBalance)) {
          await prisma.leaveBalance.upsert({
            where: { userId_leaveTypeId: { userId, leaveTypeId: lt.id } },
            update: { balance: remainingBalance },
            create: {
              userId,
              leaveTypeId: lt.id,
              balance: remainingBalance,
              carriedOver: 0,
            },
          }).catch(() => { });
        }

        return {
          ...lt,
          defaultAllocation: totalAllocated,
          daysAllowed: totalAllocated,
          balance: remainingBalance,
          used: usedDays,
        };
      })
    );

    return res.json({ leaveTypes: leaveTypesWithUserData });
  } catch (error) {
    next(error);
  }
});

router.post(
  '/leave-types',
  roleGuard('COMPANY_ADMIN', 'HR'),
  hrPermission('leave_claims'),
  validateBody(LeaveTypeSchema),
  async (req, res, next) => {
    try {
      const companyId = req.user!.companyId!;
      const data = req.body;

      const existing = await prisma.leaveType.findUnique({
        where: { companyId_code: { companyId, code: data.code } },
      });
      if (existing) {
        return next(new AppError(400, 'DUPLICATE_CODE', `Leave type code '${data.code}' already exists`));
      }

      const leaveType = await prisma.leaveType.create({
        data: {
          companyId,
          ...data,
        },
      });

      // Automatically create balance for all existing active users in the company
      const users = await prisma.user.findMany({
        where: { companyId, isActive: true },
        select: { id: true },
      });

      for (const u of users) {
        await prisma.leaveBalance.upsert({
          where: { userId_leaveTypeId: { userId: u.id, leaveTypeId: leaveType.id } },
          update: { balance: data.defaultAllocation },
          create: {
            userId: u.id,
            leaveTypeId: leaveType.id,
            balance: data.defaultAllocation,
            carriedOver: 0,
          },
        });
      }

      await logActivity({
        companyId,
        actorId: req.user!.id,
        action: 'CREATE_LEAVE_TYPE',
        objectType: 'LeaveType',
        objectId: String(leaveType.id),
        message: `Created leave type: ${leaveType.name} (${leaveType.code})`,
      });

      return res.status(201).json({ leaveType });
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  '/leave-types/:id',
  roleGuard('COMPANY_ADMIN', 'HR'),
  hrPermission('leave_claims'),
  validateBody(LeaveTypeSchema.partial()),
  async (req, res, next) => {
    try {
      const companyId = req.user!.companyId!;
      const id = Number(req.params.id);
      const existing = await prisma.leaveType.findFirst({
        where: { id, companyId },
      });
      if (!existing) {
        return next(new AppError(404, 'NOT_FOUND', 'Leave type not found'));
      }

      if (req.body.code && req.body.code.toUpperCase() !== existing.code) {
        const codeConflict = await prisma.leaveType.findFirst({
          where: {
            companyId,
            code: req.body.code.toUpperCase(),
            id: { not: id },
          },
        });
        if (codeConflict) {
          return next(
            new AppError(
              400,
              'DUPLICATE_CODE',
              `Leave code '${req.body.code.toUpperCase()}' is already used by "${codeConflict.name}"`
            )
          );
        }
      }

      const updated = await prisma.leaveType.update({
        where: { id },
        data: req.body,
      });

      // When defaultAllocation is updated, sync leave balance for all users in this company
      if (req.body.defaultAllocation !== undefined) {
        const newAllocation = Number(req.body.defaultAllocation);
        const users = await prisma.user.findMany({
          where: { companyId, isActive: true },
          select: { id: true },
        });

        const approvedLeaves = await prisma.request.findMany({
          where: {
            companyId,
            leaveTypeId: id,
            type: 'LEAVE',
            status: 'APPROVED',
          },
          select: { userId: true, days: true },
        });

        const usedDaysByUser: Record<number, number> = {};
        for (const reqItem of approvedLeaves) {
          usedDaysByUser[reqItem.userId] =
            (usedDaysByUser[reqItem.userId] || 0) + Number(reqItem.days || 0);
        }

        for (const u of users) {
          const used = usedDaysByUser[u.id] || 0;
          const newBal = Math.max(0, newAllocation - used);

          await prisma.leaveBalance.upsert({
            where: { userId_leaveTypeId: { userId: u.id, leaveTypeId: id } },
            update: { balance: newBal },
            create: {
              userId: u.id,
              leaveTypeId: id,
              balance: newBal,
              carriedOver: 0,
            },
          });
        }
      }

      return res.json({ leaveType: updated });
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  '/leave-types/:id',
  roleGuard('COMPANY_ADMIN', 'HR'),
  hrPermission('leave_claims'),
  async (req, res, next) => {
    try {
      const companyId = req.user!.companyId!;
      const id = Number(req.params.id);
      const existing = await prisma.leaveType.findFirst({
        where: { id, companyId },
      });
      if (!existing) {
        return next(new AppError(404, 'NOT_FOUND', 'Leave type not found'));
      }

      if (req.query.mode === 'deactivate') {
        await prisma.leaveType.update({
          where: { id },
          data: { isActive: false },
        });
        await logActivity({
          companyId,
          actorId: req.user!.id,
          action: 'DEACTIVATE_LEAVE_TYPE',
          objectType: 'LeaveType',
          objectId: String(id),
          message: `Deactivated leave type: ${existing.name} (${existing.code})`,
        });
        return res.json({ success: true, message: 'Leave policy deactivated' });
      }

      // Permanent delete:
      // 1. Unlink historical requests so request history stays preserved without breaking FK
      await prisma.request.updateMany({
        where: { leaveTypeId: id },
        data: { leaveTypeId: null },
      });

      // 2. Delete user leave balances for this leave type
      await prisma.leaveBalance.deleteMany({
        where: { leaveTypeId: id },
      });

      // 3. Delete the leave type itself
      await prisma.leaveType.delete({
        where: { id },
      });

      await logActivity({
        companyId,
        actorId: req.user!.id,
        action: 'DELETE_LEAVE_TYPE',
        objectType: 'LeaveType',
        objectId: String(id),
        message: `Permanently deleted leave type: ${existing.name} (${existing.code})`,
      });

      return res.json({ success: true, message: 'Leave policy permanently deleted' });
    } catch (error) {
      next(error);
    }
  }
);

// GET /company/billing (Admin only)
router.get('/billing', roleGuard('COMPANY_ADMIN'), async (req, res, next) => {
  try {
    const companyId = req.user!.companyId!;
    let [company, activeEmployeeCount] = await Promise.all([
      prisma.company.findUnique({
        where: { id: companyId },
        include: {
          package: true,
          invoices: {
            where: {
              status: {
                notIn: ['VOID', 'CANCELLED'],
              },
            },
            orderBy: { issuedAt: 'desc' },
          },
        },
      }),
      prisma.user.count({
        where: { companyId, isActive: true },
      }),
    ]);

    if (!company) {
      return next(new AppError(404, 'NOT_FOUND', 'Company not found'));
    }

    // If company has no invoices yet, auto-create realistic invoices for the subscription record
    if (!company.invoices || company.invoices.length === 0) {
      const now = new Date();
      const year = now.getFullYear();
      const monthStr = String(now.getMonth() + 1).padStart(2, '0');
      const startOfPeriod = new Date(year, 0, 1);
      const endOfPeriod = new Date(year, 11, 31);

      const inv1 = await prisma.invoice.create({
        data: {
          companyId,
          invoiceNumber: `INV-${year}${monthStr}-0042`,
          amount: 49999,
          currency: 'INR',
          billingCycle: 'ANNUAL',
          periodStart: startOfPeriod,
          periodEnd: endOfPeriod,
          dueDate: startOfPeriod,
          status: 'PAID',
          paidAt: startOfPeriod,
          issuedAt: startOfPeriod,
          payment: {
            provider: 'STRIPE',
            reference: 'ch_3P4k8L2eZvKYlo1Q88219Ak9',
            status: 'succeeded',
            billingEmail: req.user!.email || 'finance@company.com',
            cardBrand: 'visa',
            cardLast4: '4242',
            expMonth: 12,
            expYear: 2028,
            itemDescription: 'Enterprise Plan Annual License (100 Active Seats)',
          },
        },
      });

      const priorYear = year - 1;
      const priorStart = new Date(priorYear, 0, 1);
      const priorEnd = new Date(priorYear, 11, 31);
      const inv2 = await prisma.invoice.create({
        data: {
          companyId,
          invoiceNumber: `INV-${priorYear}01-0019`,
          amount: 49999,
          currency: 'INR',
          billingCycle: 'ANNUAL',
          periodStart: priorStart,
          periodEnd: priorEnd,
          dueDate: priorStart,
          status: 'PAID',
          paidAt: priorStart,
          issuedAt: priorStart,
          payment: {
            provider: 'STRIPE',
            reference: 'ch_2O3j7K1eXvJYlo0P77108Zk8',
            status: 'succeeded',
            billingEmail: req.user!.email || 'finance@company.com',
            cardBrand: 'visa',
            cardLast4: '4242',
            expMonth: 12,
            expYear: 2028,
            itemDescription: 'Enterprise Plan Annual License Renewal',
          },
        },
      });

      company = {
        ...company,
        invoices: [inv1, inv2],
      };
    }

    const now = new Date();
    const expiryDate = company.subEndDate ? new Date(company.subEndDate) : null;
    const daysRemaining = expiryDate
      ? Math.max(0, Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 3600 * 24)))
      : null;
    const isExpiringSoon = daysRemaining !== null && daysRemaining <= 10;

    const availablePackages = await prisma.package.findMany({
      orderBy: { id: 'asc' },
    });

    return res.json({
      plan: {
        package: company.package,
        planType: company.planType,
        subAmount: company.subAmount,
        subStartDate: company.subStartDate,
        subEndDate: company.subEndDate,
        nextPaymentDate: company.nextPaymentDate,
        subIsActive: company.subIsActive,
        daysRemaining,
        isExpiringSoon,
      },
      availablePackages,
      activeEmployeeCount,
      invoices: company.invoices,
    });
  } catch (error) {
    next(error);
  }
});

// POST /company/billing/seats (Buy additional seats)
router.post('/billing/seats', roleGuard('COMPANY_ADMIN'), async (req, res, next) => {
  try {
    const companyId = req.user!.companyId!;
    const { additionalSeats } = req.body;
    const seatsToAdd = Math.max(1, Number(additionalSeats) || 10);

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: { package: true },
    });

    if (!company) {
      return next(new AppError(404, 'NOT_FOUND', 'Company not found'));
    }

    const currentLimit = company.package?.employeeLimit || 50;
    const newLimit = currentLimit + seatsToAdd;

    if (company.packageId) {
      await prisma.package.update({
        where: { id: company.packageId },
        data: { employeeLimit: newLimit },
      });
    }

    const now = new Date();
    const invNum = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
    const costPerSeat = 199;
    const totalCost = seatsToAdd * costPerSeat;

    const invoice = await prisma.invoice.create({
      data: {
        companyId,
        invoiceNumber: invNum,
        amount: totalCost,
        currency: 'INR',
        billingCycle: 'ONE_TIME',
        periodStart: now,
        periodEnd: company.subEndDate || new Date(now.getFullYear(), now.getMonth() + 1, 0),
        dueDate: now,
        status: 'PAID',
        paidAt: now,
        payment: {
          provider: 'STRIPE',
          reference: `ch_${Date.now()}_seats`,
          status: 'succeeded',
          billingEmail: req.user!.email,
          itemDescription: `Additional ${seatsToAdd} Employee Seats Expansion`,
          cardBrand: 'visa',
          cardLast4: '4242',
        },
      },
    });

    await logActivity({
      companyId,
      actorId: req.user!.id,
      action: 'BUY_SEATS',
      objectType: 'Company',
      objectId: String(companyId),
      message: `${req.user!.firstName} purchased ${seatsToAdd} extra seats (Limit upgraded to ${newLimit})`,
    });

    return res.json({ success: true, newLimit, invoice });
  } catch (error) {
    next(error);
  }
});

// POST /company/billing/plan (Switch or upgrade plan tier)
router.post('/billing/plan', roleGuard('COMPANY_ADMIN'), async (req, res, next) => {
  try {
    const companyId = req.user!.companyId!;
    const { planName, billingCycle } = req.body;

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: { package: true },
    });
    if (!company) return next(new AppError(404, 'NOT_FOUND', 'Company not found'));

    let newLimit = 100;
    let newPrice = 49999;
    if (planName === 'Starter Plan') {
      newLimit = 25;
      newPrice = billingCycle === 'ANNUAL' ? 9999 : 999;
    } else if (planName === 'Professional Plan') {
      newLimit = 50;
      newPrice = billingCycle === 'ANNUAL' ? 24999 : 2499;
    } else {
      newLimit = 100;
      newPrice = billingCycle === 'ANNUAL' ? 49999 : 4999;
    }

    if (company.packageId) {
      await prisma.package.update({
        where: { id: company.packageId },
        data: { name: planName, employeeLimit: newLimit },
      });
    }

    const now = new Date();
    const invNum = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 9000) + 1000)}`;

    const invoice = await prisma.invoice.create({
      data: {
        companyId,
        invoiceNumber: invNum,
        amount: newPrice,
        currency: 'INR',
        billingCycle: billingCycle || 'ANNUAL',
        periodStart: now,
        periodEnd: new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()),
        dueDate: now,
        status: 'PAID',
        paidAt: now,
        payment: {
          provider: 'STRIPE',
          reference: `ch_${Date.now()}_plan`,
          status: 'succeeded',
          billingEmail: req.user!.email,
          itemDescription: `Plan Switch to ${planName} (${billingCycle || 'ANNUAL'})`,
          cardBrand: 'visa',
          cardLast4: '4242',
        },
      },
    });

    await prisma.company.update({
      where: { id: companyId },
      data: {
        planType: billingCycle || 'ANNUAL',
        subAmount: newPrice,
      },
    });

    return res.json({ success: true, planName, invoice });
  } catch (error) {
    next(error);
  }
});

// GET /company/activity-logs (Admin only)
router.get('/activity-logs', roleGuard('COMPANY_ADMIN'), async (req, res, next) => {
  try {
    const companyId = req.user!.companyId!;
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));
    const search = req.query.search ? String(req.query.search).trim() : undefined;
    const action = req.query.action ? String(req.query.action).trim() : undefined;

    const where: any = { companyId };
    if (action && action !== 'ALL') {
      where.action = action;
    }
    if (search) {
      where.OR = [
        { message: { contains: search, mode: 'insensitive' } },
        { action: { contains: search, mode: 'insensitive' } },
        { objectType: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.activityLog.count({ where }),
    ]);

    const actorIds = [...new Set(items.map((i) => i.actorId).filter(Boolean))] as number[];
    const actors = actorIds.length > 0 ? await prisma.user.findMany({
      where: { id: { in: actorIds } },
      select: { id: true, firstName: true, lastName: true, email: true, role: true },
    }) : [];
    const actorMap = Object.fromEntries(actors.map((a) => [a.id, a]));

    const enrichedItems = items.map((i) => ({
      ...i,
      actor: i.actorId ? actorMap[i.actorId] || null : null,
    }));

    return res.json({ items: enrichedItems, total, page, pageSize });
  } catch (error) {
    next(error);
  }
});

// GET /company/attendance
router.get(
  '/attendance',
  roleGuard('COMPANY_ADMIN', 'HR'),
  hrPermission('attendance'),
  async (req, res, next) => {
    try {
      const companyId = req.user!.companyId!;
      const page = Math.max(1, Number(req.query.page) || 1);
      const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 50));
      const dateStr = req.query.date ? String(req.query.date) : undefined;

      const where: any = { companyId };
      if (dateStr) {
        const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
        const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);
        where.checkIn = { gte: startOfDay, lte: endOfDay };
      }

      const [records, total] = await Promise.all([
        prisma.attendance.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                jobTitle: true,
                profilePhoto: true,
                department: { select: { name: true } },
              },
            },
          },
          orderBy: { checkIn: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        prisma.attendance.count({ where }),
      ]);

      return res.json({ records, items: records, total, page, pageSize });
    } catch (error) {
      next(error);
    }
  }
);

// GET /company/attendance/export
router.get(
  '/attendance/export',
  roleGuard('COMPANY_ADMIN', 'HR'),
  hrPermission('attendance'),
  async (req, res, next) => {
    try {
      const companyId = req.user!.companyId!;
      const format = String(req.query.format || 'xlsx').toLowerCase() === 'csv' ? 'csv' : 'xlsx';
      let from: Date | undefined;
      let to: Date | undefined;

      if (req.query.from) {
        from = new Date(String(req.query.from));
      } else if (req.query.fromMonth) {
        const [y, m] = String(req.query.fromMonth).split('-').map(Number);
        if (y && m) from = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
      } else if (req.query.month && req.query.year) {
        const m = Number(req.query.month);
        const y = Number(req.query.year);
        from = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
        to = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
      }

      if (req.query.to) {
        to = new Date(String(req.query.to));
      } else if (req.query.toMonth) {
        const [y, m] = String(req.query.toMonth).split('-').map(Number);
        if (y && m) to = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
      }

      const fileBuffer = await generateAttendanceExcel(companyId, from, to, format);

      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=attendance_export.csv');
      } else {
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=attendance_export.xlsx');
      }
      return res.send(fileBuffer);
    } catch (error) {
      next(error);
    }
  }
);

// GET /company/cycles (Performance & Payroll Cycles)
router.get('/cycles', roleGuard('COMPANY_ADMIN', 'HR'), async (req, res, next) => {
  try {
    const companyId = req.user!.companyId!;
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { settings: true },
    });
    const settings = (company?.settings as any) || {};
    const performanceCycles = settings.performanceCycles || [
      { id: 'cycle-2026-q1', name: 'Q1 2026 Appraisal Cycle', description: 'Jan 2026 - Mar 2026 OKR Evaluation', startDate: '2026-01-01', endDate: '2026-03-31', isActive: true },
      { id: 'cycle-2026-q2', name: 'Q2 2026 Appraisal Cycle', description: 'Apr 2026 - Jun 2026 Mid-Year Review', startDate: '2026-04-01', endDate: '2026-06-30', isActive: true },
      { id: 'cycle-2026-annual', name: 'Annual 2026 Review', description: 'Comprehensive annual 360 appraisal', startDate: '2026-01-01', endDate: '2026-12-31', isActive: false },
    ];
    const payrollCycles = settings.payrollCycles || [
      { id: 'pay-cycle-monthly', name: 'Standard Monthly Payroll', payDay: 30, cutoffDay: 25, freezeAttendance: true, isActive: true },
    ];
    return res.json({ performanceCycles, payrollCycles });
  } catch (error) {
    next(error);
  }
});

// POST /company/cycles
router.post('/cycles', roleGuard('COMPANY_ADMIN', 'HR'), async (req, res, next) => {
  try {
    const companyId = req.user!.companyId!;
    const { type, cycle } = req.body;
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { settings: true },
    });
    const settings = (company?.settings as any) || {};
    if (type === 'payroll') {
      const existing = settings.payrollCycles || [];
      const newCycle = { id: `pay-${Date.now()}`, ...cycle };
      settings.payrollCycles = [...existing, newCycle];
    } else {
      const existing = settings.performanceCycles || [];
      const newCycle = { id: `perf-${Date.now()}`, ...cycle };
      settings.performanceCycles = [...existing, newCycle];
    }
    await prisma.company.update({
      where: { id: companyId },
      data: { settings },
    });
    return res.status(201).json({ success: true, settings });
  } catch (error) {
    next(error);
  }
});

// GET /company/claims/categories
router.get('/claims/categories', async (req, res, next) => {
  try {
    const companyId = req.user!.companyId!;
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { settings: true },
    });
    const settings = (company?.settings as any) || {};
    const defaultCategories = [
      { id: 'cat-travel', name: 'Travel & Transport', maxLimit: 25000, requiresReceipt: true, description: 'Flights, cabs, train tickets, lodging for official company travel.', isActive: true },
      { id: 'cat-meals', name: 'Food & Meals', maxLimit: 3000, requiresReceipt: true, description: 'Client lunches, team dinners, or late-night overtime meals.', isActive: true },
      { id: 'cat-internet', name: 'Internet & Mobile Reimbursement', maxLimit: 2000, requiresReceipt: true, description: 'Monthly work-from-home broadband and mobile utility bills.', isActive: true },
      { id: 'cat-learning', name: 'Learning & Certifications', maxLimit: 15000, requiresReceipt: true, description: 'Professional development courses, books, and exams.', isActive: true },
      { id: 'cat-office', name: 'Office Supplies & Peripherals', maxLimit: 10000, requiresReceipt: true, description: 'Desk accessories, monitors, ergonomic accessories.', isActive: true },
      { id: 'cat-medical', name: 'Health & Wellness', maxLimit: 5000, requiresReceipt: true, description: 'Annual health checkups and preventative wellness claims.', isActive: true },
    ];
    const categories = settings.claimCategories && settings.claimCategories.length > 0 ? settings.claimCategories : defaultCategories;
    return res.json({ categories });
  } catch (error) {
    next(error);
  }
});

// POST /company/claims/categories
router.post('/claims/categories', roleGuard('COMPANY_ADMIN', 'HR'), async (req, res, next) => {
  try {
    const companyId = req.user!.companyId!;
    const category = req.body;
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { settings: true },
    });
    const settings = (company?.settings as any) || {};
    const existing = settings.claimCategories || [];
    const newCat = { id: `cat-${Date.now()}`, ...category, isActive: category.isActive !== false };
    settings.claimCategories = [...existing, newCat];
    await prisma.company.update({
      where: { id: companyId },
      data: { settings },
    });
    return res.status(201).json({ success: true, category: newCat });
  } catch (error) {
    next(error);
  }
});

// GET /company/roles-hierarchy
router.get('/roles-hierarchy', roleGuard('COMPANY_ADMIN', 'HR', 'EMPLOYEE'), async (req, res, next) => {
  try {
    const companyId = req.user!.companyId!;
    const rawUsers = await prisma.user.findMany({
      where: { companyId, isActive: true },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        jobTitle: true,
        profilePhoto: true,
        hrPermissions: true,
        managerId: true,
        reports: {
          select: { id: true },
        },
        manager: {
          select: { id: true, firstName: true, lastName: true },
        },
        department: { select: { id: true, name: true } },
      },
      orderBy: { firstName: 'asc' },
    });

    const users = rawUsers.map((u) => ({
      ...u,
      isManager: (u.reports && u.reports.length > 0) || false,
    }));

    const rolesSummary = {
      COMPANY_ADMIN: users.filter((u) => u.role === 'COMPANY_ADMIN'),
      HR: users.filter((u) => u.role === 'HR'),
      MANAGERS: users.filter((u) => u.isManager),
      EMPLOYEES: users.filter((u) => u.role === 'EMPLOYEE'),
    };

    return res.json({ users, rolesSummary });
  } catch (error) {
    next(error);
  }
});

export default router;
