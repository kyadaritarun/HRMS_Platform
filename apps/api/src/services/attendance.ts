import ExcelJS from 'exceljs';
import prisma from '../lib/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';
import { WorkMode } from '@prisma/client';
import { toDateKey } from '../lib/dates.js';

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  // If external reverse geocode provider configured, query it.
  // Otherwise provide structured coordinate address:
  return `GeoLocation [${lat.toFixed(4)}, ${lng.toFixed(4)}]`;
}

export async function checkIn(opts: {
  userId: number;
  companyId: number;
  latitude: number;
  longitude: number;
  workMode: WorkMode;
  note?: string;
  shiftId?: string | null;
}) {
  // 1. Check if user already has an active (open) session
  const openSession = await prisma.attendance.findFirst({
    where: {
      userId: opts.userId,
      checkOut: null,
    },
  });

  if (openSession) {
    throw new AppError(400, 'ALREADY_CHECKED_IN', 'You already have an active check-in session. Please check out first.');
  }

  // 2. Prevent duplicate punch-in if shift is already completed today
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const completedToday = await prisma.attendance.findFirst({
    where: {
      userId: opts.userId,
      checkIn: { gte: startOfDay, lte: endOfDay },
      checkOut: { not: null },
    },
  });

  if (completedToday) {
    throw new AppError(
      400,
      'SHIFT_ALREADY_COMPLETED',
      'You have already completed your attendance punch for today. Multiple shift punches are not allowed. Please submit a Regularization request if you need timing adjustments.'
    );
  }

  let assignedShiftId = opts.shiftId || null;
  if (!assignedShiftId) {
    const user = await prisma.user.findUnique({
      where: { id: opts.userId },
      select: { shiftId: true, shiftTiming: true },
    });
    assignedShiftId = user?.shiftTiming || user?.shiftId || 'General Shift (09:30 AM - 06:30 PM)';
  }

  const address = await reverseGeocode(opts.latitude, opts.longitude);

  const record = await prisma.attendance.create({
    data: {
      companyId: opts.companyId,
      userId: opts.userId,
      shiftId: assignedShiftId,
      checkIn: now,
      workMode: opts.workMode,
      note: opts.note || '',
      checkInGeo: {
        lat: opts.latitude,
        lng: opts.longitude,
        address,
      },
      durationHours: 0,
    },
  });

  return record;
}

export async function checkOut(opts: {
  userId: number;
  companyId: number;
  latitude: number;
  longitude: number;
  note?: string;
}) {
  // 1. Find open session
  const openSession = await prisma.attendance.findFirst({
    where: {
      userId: opts.userId,
      checkOut: null,
    },
  });

  if (!openSession) {
    throw new AppError(400, 'NO_ACTIVE_SESSION', 'No active check-in session found to check out.');
  }

  const address = await reverseGeocode(opts.latitude, opts.longitude);
  const checkOutTime = new Date();

  // Duration in hours rounded to 2 decimals
  const durationMs = checkOutTime.getTime() - openSession.checkIn.getTime();
  const durationHours = Math.round((durationMs / 3600000) * 100) / 100;

  const updated = await prisma.attendance.update({
    where: { id: openSession.id },
    data: {
      checkOut: checkOutTime,
      durationHours,
      note: opts.note ? `${openSession.note} ${opts.note}`.trim() : openSession.note,
      checkOutGeo: {
        lat: opts.latitude,
        lng: opts.longitude,
        address,
      },
    },
  });

  return updated;
}

export async function generateAttendanceExcel(
  companyId: number,
  fromDate?: Date,
  toDate?: Date,
  format: 'xlsx' | 'csv' = 'xlsx'
): Promise<Buffer> {
  const where: any = { companyId };
  if (fromDate || toDate) {
    where.checkIn = {};
    if (fromDate) where.checkIn.gte = fromDate;
    if (toDate) where.checkIn.lte = toDate;
  }

  const [records, company] = await Promise.all([
    prisma.attendance.findMany({
      where,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            jobTitle: true,
            department: { select: { name: true } },
          },
        },
      },
      orderBy: { checkIn: 'desc' },
    }),
    prisma.company.findUnique({
      where: { id: companyId },
      select: { timezone: true },
    }),
  ]);

  const tz = company?.timezone || 'Asia/Kolkata';

  const formatNormalTime = (date?: Date | null): string => {
    if (!date) return 'Active';
    try {
      return date.toLocaleTimeString('en-US', {
        timeZone: tz,
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    }
  };

  const formatNormalDate = (date: Date): string => {
    try {
      return date.toLocaleDateString('en-CA', { timeZone: tz });
    } catch {
      return toDateKey(date);
    }
  };

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Uptrix HRMS';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Attendance Logs');

  worksheet.columns = [
    { header: 'Log ID', key: 'id', width: 10 },
    { header: 'Employee Name', key: 'name', width: 25 },
    { header: 'Email', key: 'email', width: 28 },
    { header: 'Department', key: 'dept', width: 18 },
    { header: 'Date', key: 'date', width: 14 },
    { header: 'Check In', key: 'checkIn', width: 16 },
    { header: 'Check Out', key: 'checkOut', width: 16 },
    { header: 'Duration (Hours)', key: 'duration', width: 18 },
    { header: 'Work Mode', key: 'workMode', width: 18 },
    { header: 'Notes', key: 'note', width: 25 },
  ];

  // Header style
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4F46E5' },
  };

  for (const r of records) {
    worksheet.addRow({
      id: r.id,
      name: `${r.user.firstName} ${r.user.lastName}`,
      email: r.user.email,
      dept: r.user.department?.name || 'N/A',
      date: formatNormalDate(r.checkIn),
      checkIn: formatNormalTime(r.checkIn),
      checkOut: formatNormalTime(r.checkOut),
      duration: r.durationHours !== null && r.durationHours !== undefined ? Number(Number(r.durationHours).toFixed(2)) : 0,
      workMode: r.workMode === 'WFH' ? 'Work From Home' : 'Office',
      note: r.note || '—',
    });
  }

  if (format === 'csv') {
    const csvBuffer = await workbook.csv.writeBuffer();
    return Buffer.from(csvBuffer);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
