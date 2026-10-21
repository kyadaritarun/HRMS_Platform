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

    let checkInFilter: any;
    if (req.query.startDate && req.query.endDate) {
      checkInFilter = {
        gte: new Date(String(req.query.startDate)),
        lte: new Date(String(req.query.endDate)),
      };
    } else if (req.query.month) {
      const [yearStr, monthStr] = String(req.query.month).split('-');
      const y = Number(yearStr);
      const m = Number(monthStr);
      if (!isNaN(y) && !isNaN(m)) {
        const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
        const end = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
        checkInFilter = { gte: start, lte: end };
      }
    }

    if (!checkInFilter) {
      // Default to last 90 days for full calendar and history coverage
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      checkInFilter = { gte: ninetyDaysAgo };
    }

    const sessions = await prisma.attendance.findMany({
      where: {
        userId,
        checkIn: checkInFilter,
      },
      orderBy: { checkIn: 'desc' },
    });

    return res.json({
      activeSession,
      recentSessions: sessions,
      sessions,
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

export default router;
