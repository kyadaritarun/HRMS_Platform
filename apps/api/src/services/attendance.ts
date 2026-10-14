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

  const address = await reverseGeocode(opts.latitude, opts.longitude);
  const now = new Date();

  const record = await prisma.attendance.create({
    data: {
      companyId: opts.companyId,
      userId: opts.userId,
      shiftId: opts.shiftId || null,
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

export async function generateAttendanceExcel(companyId: number, fromDate?: Date, toDate?: Date): Promise<Buffer> {
  const where: any = { companyId };
  if (fromDate || toDate) {
    where.checkIn = {};
    if (fromDate) where.checkIn.gte = fromDate;
    if (toDate) where.checkIn.lte = toDate;
  }

  const records = await prisma.attendance.findMany({
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
  });

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
    { header: 'Check In', key: 'checkIn', width: 20 },
    { header: 'Check Out', key: 'checkOut', width: 20 },
    { header: 'Duration (Hours)', key: 'duration', width: 18 },
    { header: 'Work Mode', key: 'workMode', width: 12 },
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
      date: toDateKey(r.checkIn),
      checkIn: r.checkIn.toISOString(),
      checkOut: r.checkOut ? r.checkOut.toISOString() : 'Active',
      duration: Number(r.durationHours),
      workMode: r.workMode,
      note: r.note,
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
