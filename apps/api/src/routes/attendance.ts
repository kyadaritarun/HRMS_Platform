import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authMiddleware } from '../middlewares/auth.js';
import { tenantMatchMiddleware } from '../middlewares/tenantMatch.js';
import { policyComplianceMiddleware } from '../middlewares/policyCompliance.js';
import { roleGuard } from '../middlewares/roleGuard.js';
import { hrPermission } from '../middlewares/hrPermission.js';
import { featureGuard } from '../middlewares/featureGuard.js';
import { validateBody } from '../middlewares/validate.js';
import { CheckInSchema, CheckOutSchema } from '../schemas/attendance.js';
import { checkIn, checkOut, generateAttendanceExcel } from '../services/attendance.js';

const router = Router();

router.use(authMiddleware, tenantMatchMiddleware, policyComplianceMiddleware);

// POST /attendance/check-in
router.post(
  '/check-in',
  featureGuard('time_attendance_management'),
  validateBody(CheckInSchema),
  async (req, res, next) => {
    try {
      const userId = req.user!.id;
      const companyId = req.user!.companyId!;
      const { latitude, longitude, workMode, note } = req.body;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { shiftId: true },
      });

      const record = await checkIn({
        userId,
        companyId,
        latitude,
        longitude,
        workMode,
        note,
        shiftId: user?.shiftId,
      });

      return res.status(201).json({ success: true, attendance: record });
    } catch (error) {
      next(error);
    }
  }
);

// POST /attendance/check-out
router.post(
  '/check-out',
  featureGuard('time_attendance_management'),
  validateBody(CheckOutSchema),
  async (req, res, next) => {
    try {
      const userId = req.user!.id;
      const companyId = req.user!.companyId!;
      const { latitude, longitude, note } = req.body;

      const record = await checkOut({
        userId,
        companyId,
        latitude,
        longitude,
        note,
      });

      return res.json({ success: true, attendance: record });
    } catch (error) {
      next(error);
    }
  }
);

// GET /attendance/me
router.get('/me', async (req, res, next) => {
  try {
    const userId = req.user!.id;

    // Active session
    const activeSession = await prisma.attendance.findFirst({
      where: { userId, checkOut: null },
    });

    // Recent 7 days sessions
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentSessions = await prisma.attendance.findMany({
      where: {
        userId,
        checkIn: { gte: sevenDaysAgo },
      },
      orderBy: { checkIn: 'desc' },
    });

    return res.json({
      activeSession,
      recentSessions,
    });
  } catch (error) {
    next(error);
  }
});

// GET /company/attendance or /attendance (Company attendance list)
router.get(
  ['/company', '/'],
  roleGuard('COMPANY_ADMIN', 'HR'),
  hrPermission('attendance'),
  async (req, res, next) => {
    try {
      const companyId = req.user!.companyId!;
      const page = Math.max(1, Number(req.query.page) || 1);
      const pageSize = Math.min(500, Math.max(1, Number(req.query.pageSize) || 100));

      const where: any = { companyId };
      if (req.query.date) {
        const dStr = String(req.query.date);
        const startOfDay = new Date(`${dStr}T00:00:00.000Z`);
        const endOfDay = new Date(`${dStr}T23:59:59.999Z`);
        where.checkIn = { gte: startOfDay, lte: endOfDay };
      }

      const [items, total] = await Promise.all([
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

      return res.json({ records: items, items, total, page, pageSize });
    } catch (error) {
      next(error);
    }
  }
);

// GET /company/attendance/export or /attendance/export
router.get(
  ['/company/export', '/export'],
  roleGuard('COMPANY_ADMIN', 'HR'),
  hrPermission('attendance'),
  async (req, res, next) => {
    try {
      const companyId = req.user!.companyId!;
      const from = req.query.from ? new Date(String(req.query.from)) : undefined;
      const to = req.query.to ? new Date(String(req.query.to)) : undefined;

      const excelBuffer = await generateAttendanceExcel(companyId, from, to);

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=attendance_export.xlsx');
      return res.send(excelBuffer);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
