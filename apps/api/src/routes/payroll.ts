import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authMiddleware } from '../middlewares/auth.js';
import { tenantMatchMiddleware } from '../middlewares/tenantMatch.js';
import { policyComplianceMiddleware } from '../middlewares/policyCompliance.js';
import { roleGuard } from '../middlewares/roleGuard.js';
import { featureGuard } from '../middlewares/featureGuard.js';
import { validateBody } from '../middlewares/validate.js';
import { AppError } from '../middlewares/errorHandler.js';
import {
  AdjustmentsSchema,
  PublishPayrollSchema,
  UpdateSalarySchema,
} from '../schemas/payroll.js';
import { calculateEmployeePayroll } from '../services/payroll/calculatePayroll.js';
import { generatePayslipPdf } from '../services/payroll/generatePdf.js';
import { logActivity } from '../services/activityLog.js';

const router = Router();

router.use(authMiddleware, tenantMatchMiddleware, policyComplianceMiddleware);

// GET /payroll/dashboard?month&year
router.get(
  '/dashboard',
  roleGuard('COMPANY_ADMIN', 'HR'),
  featureGuard('payroll'),
  async (req, res, next) => {
    try {
      const companyId = req.user!.companyId!;
      const now = new Date();
      const month = Number(req.query.month) || now.getUTCMonth() + 1;
      const year = Number(req.query.year) || now.getUTCFullYear();

      // 1. Fetch company with holidays and workingDays
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        include: {
          holidays: true,
        },
      });

      if (!company) {
        return next(new AppError(404, 'NOT_FOUND', 'Company not found'));
      }

      // 2. Fetch active employees
      const employees = await prisma.user.findMany({
        where: { companyId, isActive: true },
        include: {
          department: { select: { name: true } },
        },
        orderBy: { firstName: 'asc' },
      });

      // 3. Fetch existing payslips for this period
      const existingPayslips = await prisma.payslip.findMany({
        where: {
          companyId,
          month,
          year,
        },
      });
      const payslipMap = new Map(existingPayslips.map((p) => [p.employeeId, p]));

      // 4. Fetch month attendances and approved leaves for all employees
      const startDate = new Date(Date.UTC(year, month - 1, 1));
      const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59));

      const [attendances, leaves] = await Promise.all([
        prisma.attendance.findMany({
          where: {
            companyId,
            checkIn: { gte: startDate, lte: endDate },
          },
        }),
        prisma.request.findMany({
          where: {
            companyId,
            type: 'LEAVE',
            status: 'APPROVED',
            startDate: { lte: endDate },
            endDate: { gte: startDate },
          },
          include: { leaveType: true },
        }),
      ]);

      // Group attendances and leaves by user
      const userAttMap = new Map<number, any[]>();
      for (const a of attendances) {
        const list = userAttMap.get(a.userId) || [];
        list.push(a);
        userAttMap.set(a.userId, list);
      }

      const userLeavesMap = new Map<number, any[]>();
      for (const l of leaves) {
        const list = userLeavesMap.get(l.userId) || [];
        list.push(l);
        userLeavesMap.set(l.userId, list);
      }

      // 5. Calculate for each employee
      const results = employees.map((emp) => {
        const payslip = payslipMap.get(emp.id);
        const bank = (emp.bankDetails as any) || {};
        const struct = (bank.salaryStructure as any) || {};
        const snap = (payslip?.snapshot as any) || {};

        const basicSalary = snap.basicSalary !== undefined ? Number(snap.basicSalary) : (struct.basicSalary !== undefined ? Number(struct.basicSalary) : undefined);
        const hra = snap.hra !== undefined ? Number(snap.hra) : (struct.hra !== undefined ? Number(struct.hra) : undefined);
        const specialAllowance = snap.specialAllowance !== undefined ? Number(snap.specialAllowance) : (struct.specialAllowance !== undefined ? Number(struct.specialAllowance) : undefined);
        const pf = snap.pf !== undefined ? Number(snap.pf) : (struct.pf !== undefined ? Number(struct.pf) : (bank.pf !== undefined ? Number(bank.pf) : 0));
        const pt = snap.pt !== undefined ? Number(snap.pt) : (struct.pt !== undefined ? Number(struct.pt) : (bank.pt !== undefined ? Number(bank.pt) : 0));
        const tds = snap.tds !== undefined ? Number(snap.tds) : (struct.tds !== undefined ? Number(struct.tds) : (bank.tds !== undefined ? Number(bank.tds) : 0));
        const bonus = payslip ? Number(payslip.bonus) : (snap.bonus !== undefined ? Number(snap.bonus) : (struct.bonus !== undefined ? Number(struct.bonus) : 0));
        const otherDeductions = payslip ? Number(payslip.otherDeductions) : (snap.otherDeductions !== undefined ? Number(snap.otherDeductions) : (struct.otherDeductions !== undefined ? Number(struct.otherDeductions) : 0));
        const customComponents = snap.customComponents || struct.customComponents || [];
        const remarks = payslip ? payslip.remarks : (snap.remarks || '');

        const empLeaves = (userLeavesMap.get(emp.id) || []).map((l) => ({
          startDate: l.startDate,
          endDate: l.endDate,
          isPaid: l.leaveType ? l.leaveType.isPaid : true,
          isHalfDay: Boolean((l.meta as any)?.isHalfDay),
          days: l.days ? Number(l.days) : 1,
        }));

        const empAtt = userAttMap.get(emp.id) || [];

        const calculated = calculateEmployeePayroll(year, month, {
          monthlySalary: Number(emp.monthlySalary),
          basicSalary,
          hra,
          specialAllowance,
          bonus,
          pf,
          pt,
          tds,
          otherDeductions,
          customComponents,
          currency: emp.currency,
          paymentMode: bank.paymentMode,
          bankName: bank.bankName,
          accountNumber: bank.accountNumber,
          remarks,
          joiningDate: emp.joiningDate,
          workingDaysStr: company.workingDays,
          holidays: company.holidays,
          leaves: empLeaves,
          attendances: empAtt,
        });

        return {
          employee: {
            id: emp.id,
            firstName: emp.firstName,
            lastName: emp.lastName,
            email: emp.email,
            jobTitle: emp.jobTitle,
            department: emp.department?.name || 'N/A',
          },
          payslipId: payslip ? payslip.id : null,
          status: payslip ? payslip.status : 'DRAFT',
          calculation: {
            ...calculated,
            grossSalary: calculated.grossEarnings,
            grossEarnings: calculated.grossEarnings,
            lopDays: calculated.totalLopDays,
            totalLopDays: calculated.totalLopDays,
            lopDeduction: calculated.leaveDeduction,
            leaveDeduction: calculated.leaveDeduction,
            overtimeHours: calculated.overtimeHours,
            overtimePay: calculated.overtimePay,
            basicSalary: calculated.basicSalary,
            hra: calculated.hra,
            specialAllowance: calculated.specialAllowance,
            pf: calculated.pf,
            pt: calculated.pt,
            tds: calculated.tds,
            pfEmployee: calculated.pf,
            esiEmployee: 0,
            totalEarnings: calculated.grossEarnings,
            customComponents: calculated.customComponents || [],
          },
        };
      });

      return res.json({
        period: { month, year },
        employees: results,
      });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /payroll/adjustments
router.put(
  '/adjustments',
  roleGuard('COMPANY_ADMIN', 'HR'),
  featureGuard('payroll'),
  validateBody(AdjustmentsSchema),
  async (req, res, next) => {
    try {
      const companyId = req.user!.companyId!;
      const {
        employeeId,
        month,
        year,
        basicSalary,
        hra,
        specialAllowance,
        bonus,
        pf,
        pt,
        tds,
        otherDeductions,
        customComponents,
        remarks,
        force,
      } = req.body;

      // Check if already published
      const existing = await prisma.payslip.findUnique({
        where: { employeeId_month_year: { employeeId, month, year } },
      });

      if (existing && existing.status === 'PUBLISHED' && !force) {
        return next(
          new AppError(
            400,
            'CANNOT_EDIT_PUBLISHED',
            'Published payslips cannot be edited directly. Re-publish with force flag if necessary.'
          )
        );
      }

      const snapData = {
        ...((existing?.snapshot as any) || {}),
        basicSalary: basicSalary !== undefined ? Number(basicSalary) : undefined,
        hra: hra !== undefined ? Number(hra) : undefined,
        specialAllowance: specialAllowance !== undefined ? Number(specialAllowance) : undefined,
        bonus: Number(bonus || 0),
        pf: Number(pf || 0),
        pt: Number(pt || 0),
        tds: Number(tds || 0),
        otherDeductions: Number(otherDeductions || 0),
        customComponents: Array.isArray(customComponents) ? customComponents : [],
        remarks: remarks || '',
      };

      const upserted = await prisma.payslip.upsert({
        where: { employeeId_month_year: { employeeId, month, year } },
        update: {
          bonus: Number(bonus || 0),
          otherDeductions: Number(otherDeductions || 0),
          remarks: remarks || '',
          snapshot: snapData as any,
          status: existing?.status === 'PUBLISHED' && force ? 'PUBLISHED' : 'DRAFT',
        },
        create: {
          companyId,
          employeeId,
          month,
          year,
          bonus: Number(bonus || 0),
          otherDeductions: Number(otherDeductions || 0),
          remarks: remarks || '',
          snapshot: snapData as any,
          status: 'DRAFT',
        },
      });

      await logActivity({
        companyId,
        actorId: req.user!.id,
        action: 'PAYROLL_ADJUSTMENT',
        objectType: 'Payslip',
        objectId: String(upserted.id),
        message: `Updated adjustments for employee #${employeeId} (${month}/${year})`,
      });

      return res.json({ success: true, payslip: upserted });
    } catch (error) {
      next(error);
    }
  }
);

// POST /payroll/publish
router.post(
  '/publish',
  roleGuard('COMPANY_ADMIN', 'HR'),
  featureGuard('payroll'),
  validateBody(PublishPayrollSchema),
  async (req, res, next) => {
    try {
      const companyId = req.user!.companyId!;
      const actorId = req.user!.id;
      const { month, year, employeeIds, force } = req.body;

      const company = await prisma.company.findUnique({
        where: { id: companyId },
        include: { holidays: true },
      });
      if (!company) return next(new AppError(404, 'NOT_FOUND', 'Company not found'));

      const startDate = new Date(Date.UTC(year, month - 1, 1));
      const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59));

      const publishedPayslips: any[] = [];

      for (const empId of employeeIds) {
        const emp = await prisma.user.findFirst({
          where: { id: empId, companyId },
        });
        if (!emp) continue;

        const existing = await prisma.payslip.findUnique({
          where: { employeeId_month_year: { employeeId: empId, month, year } },
        });

        if (existing && existing.status === 'PUBLISHED' && !force) {
          return next(
            new AppError(
              400,
              'PAYSLIP_ALREADY_PUBLISHED',
              `Payslip for ${emp.firstName} ${emp.lastName} is already published. Use force=true to override.`
            )
          );
        }

        // Fetch user data for calculation
        const [empAtt, empLeaves] = await Promise.all([
          prisma.attendance.findMany({
            where: { userId: empId, checkIn: { gte: startDate, lte: endDate } },
          }),
          prisma.request.findMany({
            where: {
              userId: empId,
              type: 'LEAVE',
              status: 'APPROVED',
              startDate: { lte: endDate },
              endDate: { gte: startDate },
            },
            include: { leaveType: true },
          }),
        ]);

        const bank = (emp.bankDetails as any) || {};
        const struct = (bank.salaryStructure as any) || {};
        const snap = (existing?.snapshot as any) || {};

        const basicSalary = snap.basicSalary !== undefined ? Number(snap.basicSalary) : (struct.basicSalary !== undefined ? Number(struct.basicSalary) : undefined);
        const hra = snap.hra !== undefined ? Number(snap.hra) : (struct.hra !== undefined ? Number(struct.hra) : undefined);
        const specialAllowance = snap.specialAllowance !== undefined ? Number(snap.specialAllowance) : (struct.specialAllowance !== undefined ? Number(struct.specialAllowance) : undefined);
        const pf = snap.pf !== undefined ? Number(snap.pf) : (struct.pf !== undefined ? Number(struct.pf) : (bank.pf !== undefined ? Number(bank.pf) : 0));
        const pt = snap.pt !== undefined ? Number(snap.pt) : (struct.pt !== undefined ? Number(struct.pt) : (bank.pt !== undefined ? Number(bank.pt) : 0));
        const tds = snap.tds !== undefined ? Number(snap.tds) : (struct.tds !== undefined ? Number(struct.tds) : (bank.tds !== undefined ? Number(bank.tds) : 0));
        const bonus = existing ? Number(existing.bonus) : (snap.bonus !== undefined ? Number(snap.bonus) : (struct.bonus !== undefined ? Number(struct.bonus) : 0));
        const otherDeductions = existing ? Number(existing.otherDeductions) : (snap.otherDeductions !== undefined ? Number(snap.otherDeductions) : (struct.otherDeductions !== undefined ? Number(struct.otherDeductions) : 0));
        const customComponents = snap.customComponents || struct.customComponents || [];
        const remarks = existing ? existing.remarks : (snap.remarks || '');

        const calculated = calculateEmployeePayroll(year, month, {
          monthlySalary: Number(emp.monthlySalary),
          basicSalary,
          hra,
          specialAllowance,
          bonus,
          pf,
          pt,
          tds,
          otherDeductions,
          customComponents,
          currency: emp.currency,
          paymentMode: bank.paymentMode,
          bankName: bank.bankName,
          accountNumber: bank.accountNumber,
          remarks,
          joiningDate: emp.joiningDate,
          workingDaysStr: company.workingDays,
          holidays: company.holidays,
          leaves: empLeaves.map((l) => ({
            startDate: l.startDate,
            endDate: l.endDate,
            isPaid: l.leaveType ? l.leaveType.isPaid : true,
            isHalfDay: Boolean((l.meta as any)?.isHalfDay),
            days: l.days ? Number(l.days) : 1,
          })),
          attendances: empAtt,
        });

        const snapData = {
          ...calculated,
          grossSalary: calculated.grossEarnings,
          grossEarnings: calculated.grossEarnings,
          lopDays: calculated.totalLopDays,
          totalLopDays: calculated.totalLopDays,
          lopDeduction: calculated.leaveDeduction,
          leaveDeduction: calculated.leaveDeduction,
          basicSalary: calculated.basicSalary,
          hra: calculated.hra,
          specialAllowance: calculated.specialAllowance,
          pf: calculated.pf,
          pt: calculated.pt,
          tds: calculated.tds,
        };

        const published = await prisma.payslip.upsert({
          where: { employeeId_month_year: { employeeId: empId, month, year } },
          update: {
            status: 'PUBLISHED',
            netSalary: calculated.netSalary,
            snapshot: snapData as any,
            publishedAt: new Date(),
            publishedById: actorId,
          },
          create: {
            companyId,
            employeeId: empId,
            month,
            year,
            bonus,
            otherDeductions,
            remarks,
            status: 'PUBLISHED',
            netSalary: calculated.netSalary,
            snapshot: snapData as any,
            publishedAt: new Date(),
            publishedById: actorId,
          },
        });

        // Notify employee
        await prisma.notification.create({
          data: {
            companyId,
            userId: empId,
            kind: 'PAYSLIP',
            title: `Payslip Published for ${month}/${year}`,
            message: `Your payslip for ${month}/${year} has been published. Take home salary: ${calculated.currency} ${calculated.netSalary.toFixed(2)}.`,
            sourceType: 'Payslip',
            sourceId: String(published.id),
          },
        });

        publishedPayslips.push(published);
      }

      await logActivity({
        companyId,
        actorId,
        action: 'PUBLISH_PAYROLL',
        objectType: 'Payslip',
        objectId: `${month}-${year}`,
        message: `Published payroll for ${publishedPayslips.length} employees (${month}/${year})${force ? ' [FORCE OVERRIDE]' : ''}`,
      });

      return res.json({ success: true, count: publishedPayslips.length, payslips: publishedPayslips });
    } catch (error) {
      next(error);
    }
  }
);

// GET /payroll/salaries/:userId
router.get('/salaries/:userId', roleGuard('COMPANY_ADMIN', 'HR', 'EMPLOYEE'), async (req, res, next) => {
  try {
    const targetUserId = Number(req.params.userId);
    const callerId = req.user!.id;
    const callerRole = req.user!.role;

    if (callerRole === 'EMPLOYEE' && callerId !== targetUserId) {
      return next(new AppError(403, 'FORBIDDEN', 'Employees can only view their own salary configuration'));
    }

    const employee = await prisma.user.findFirst({
      where: { id: targetUserId, companyId: req.user!.companyId! },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        monthlySalary: true,
        currency: true,
        bankDetails: true,
        salaryEffectiveDate: true,
      },
    });

    if (!employee) return next(new AppError(404, 'NOT_FOUND', 'Employee not found'));

    return res.json({ salary: employee });
  } catch (error) {
    next(error);
  }
});

// PUT /payroll/salaries/:userId
router.put(
  '/salaries/:userId',
  roleGuard('COMPANY_ADMIN', 'HR'),
  validateBody(UpdateSalarySchema),
  async (req, res, next) => {
    try {
      const companyId = req.user!.companyId!;
      const targetUserId = Number(req.params.userId);
      const { monthlySalary, currency, basicSalary, hra, specialAllowance, pf, pt, tds, customComponents, bankDetails } = req.body;

      const employee = await prisma.user.findFirst({
        where: { id: targetUserId, companyId },
      });
      if (!employee) return next(new AppError(404, 'NOT_FOUND', 'Employee not found'));

      const mergedBankDetails = {
        ...((employee.bankDetails as any) || {}),
        ...(bankDetails || {}),
        salaryStructure: {
          basicSalary: basicSalary !== undefined ? Number(basicSalary) : undefined,
          hra: hra !== undefined ? Number(hra) : undefined,
          specialAllowance: specialAllowance !== undefined ? Number(specialAllowance) : undefined,
          pf: pf !== undefined ? Number(pf) : undefined,
          pt: pt !== undefined ? Number(pt) : undefined,
          tds: tds !== undefined ? Number(tds) : undefined,
          customComponents: Array.isArray(customComponents) ? customComponents : [],
        },
      };

      const updated = await prisma.user.update({
        where: { id: targetUserId },
        data: {
          monthlySalary,
          currency,
          bankDetails: mergedBankDetails as any,
          salaryEffectiveDate: new Date(),
        },
      });

      await logActivity({
        companyId,
        actorId: req.user!.id,
        action: 'UPDATE_SALARY_CONFIG',
        objectType: 'User',
        objectId: String(targetUserId),
        message: `Updated salary for ${employee.firstName}: ${currency} ${monthlySalary}`,
      });

      return res.json({ success: true, user: updated });
    } catch (error) {
      next(error);
    }
  }
);

// GET /payroll/my-payslips
router.get('/my-payslips', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const payslips = await prisma.payslip.findMany({
      where: {
        employeeId: userId,
        status: 'PUBLISHED',
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });

    return res.json({ payslips });
  } catch (error) {
    next(error);
  }
});

// GET /payroll/payslips/:id/pdf
router.get('/payslips/:id/pdf', async (req, res, next) => {
  try {
    const payslipId = Number(req.params.id);
    if (!payslipId || isNaN(payslipId)) {
      return next(new AppError(400, 'INVALID_PAYSLIP_ID', 'Valid payslip id is required'));
    }
    const callerId = req.user!.id;
    const callerRole = req.user!.role;

    const payslip = await prisma.payslip.findUnique({
      where: { id: payslipId },
      include: {
        company: true,
        employee: {
          include: { department: true },
        },
      },
    });

    if (!payslip || payslip.status !== 'PUBLISHED') {
      return next(new AppError(404, 'NOT_FOUND', 'Published payslip not found'));
    }

    // Tenant check
    if (payslip.companyId !== req.user!.companyId && callerRole !== 'PRODUCT_SUPER_ADMIN') {
      return next(new AppError(403, 'FORBIDDEN', 'Access forbidden'));
    }

    // Role check: employees only view own
    if (callerRole === 'EMPLOYEE' && payslip.employeeId !== callerId) {
      return next(new AppError(403, 'FORBIDDEN', 'You can only download your own payslip'));
    }

    const snapshot = payslip.snapshot as any;
    if (!snapshot) {
      return next(new AppError(400, 'NO_SNAPSHOT', 'Payslip snapshot data is missing'));
    }

    const pdfBuffer = await generatePayslipPdf({
      companyName: payslip.company.name,
      employeeName: `${payslip.employee.firstName} ${payslip.employee.lastName}`,
      employeeNumber: payslip.employee.employeeNumber,
      jobTitle: payslip.employee.jobTitle,
      departmentName: payslip.employee.department?.name,
      month: payslip.month,
      year: payslip.year,
      snapshot,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="payslip-${payslip.month}-${payslip.year}.pdf"`);
    return res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
});

export default router;
