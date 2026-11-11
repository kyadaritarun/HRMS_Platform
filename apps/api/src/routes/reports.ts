import { Router } from 'express';
import ExcelJS from 'exceljs';
import prisma from '../lib/prisma.js';
import { authMiddleware } from '../middlewares/auth.js';
import { tenantMatchMiddleware } from '../middlewares/tenantMatch.js';
import { policyComplianceMiddleware } from '../middlewares/policyCompliance.js';
import { roleGuard } from '../middlewares/roleGuard.js';
import { toDateKey, isWorkableDay } from '../lib/dates.js';

const router = Router();

// Only Company Admin and HR can access Reports
router.use(authMiddleware, tenantMatchMiddleware, policyComplianceMiddleware);
router.use(roleGuard('COMPANY_ADMIN', 'HR'));

/**
 * Helper to format 12-hour time string
 */
function formatTime12(dateVal: Date | string | null | undefined, timezone = 'Asia/Kolkata'): string {
  if (!dateVal) return '';
  const d = typeof dateVal === 'string' ? new Date(dateVal) : dateVal;
  if (isNaN(d.getTime())) return '';
  try {
    return d.toLocaleTimeString('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }
}

/**
 * Helper to calculate minutes from midnight in the company timezone
 */
function getMinutesInTimezone(dateVal: Date | string | null | undefined, timezone = 'Asia/Kolkata'): number {
  if (!dateVal) return 0;
  const d = typeof dateVal === 'string' ? new Date(dateVal) : dateVal;
  if (isNaN(d.getTime())) return 0;
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    }).formatToParts(d);

    let h = 0;
    let m = 0;
    parts.forEach((p) => {
      if (p.type === 'hour') h = Number(p.value);
      if (p.type === 'minute') m = Number(p.value);
    });
    if (h === 24) h = 0;
    return h * 60 + m;
  } catch {
    return d.getHours() * 60 + d.getMinutes();
  }
}

/**
 * Format DD-MM-YYYY
 */
function formatDateDDMMYYYY(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

/**
 * Parse date string YYYY-MM-DD to local start of day
 */
function parseLocalDate(str: string): Date {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

/**
 * GET /reports/daily-punch
 * Matrix report showing check-in and check-out times for every employee across each day in the date range.
 */
router.get('/daily-punch', async (req, res, next) => {
  try {
    const companyId = req.user!.companyId!;
    const departmentId = req.query.departmentId ? Number(req.query.departmentId) : undefined;
    const search = req.query.search ? String(req.query.search).trim().toLowerCase() : '';

    // Date range (defaults to last 10 days up to today)
    const today = new Date();
    let startDate: Date;
    let endDate: Date;

    if (req.query.startDate && req.query.endDate) {
      startDate = parseLocalDate(String(req.query.startDate));
      endDate = parseLocalDate(String(req.query.endDate));
    } else {
      endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
      startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 10, 0, 0, 0, 0);
    }

    if (startDate > endDate) {
      const temp = startDate;
      startDate = endDate;
      endDate = temp;
    }

    // Limit maximum range to 31 days for performance and UI clarity
    const diffDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    if (diffDays > 31) {
      startDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate() - 30, 0, 0, 0, 0);
    }

    // Query Company settings, shifts and holidays
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { shifts: true, workingDays: true, timezone: true },
    });

    const timezone = company?.timezone || 'Asia/Kolkata';
    const companyWorkingDays = company?.workingDays || 'mon,tue,wed,thu,fri';
    const companyShifts = Array.isArray(company?.shifts) ? (company.shifts as any[]) : [];
    const defaultShift = companyShifts.find((s: any) => s.isDefault) || companyShifts[0] || {
      startTime: '09:00',
      endTime: '18:00',
      gracePeriodMinutes: 15,
      workingDays: companyWorkingDays,
    };

    // Generate date columns array
    const dateColumns: Array<{
      dateKey: string;
      formattedDate: string;
      dayName: string;
      dayOfWeek: number;
      isWeekend: boolean;
      rawDate: Date;
    }> = [];

    const cur = new Date(startDate);
    while (cur <= endDate) {
      const dateKey = toDateKey(cur);
      const dayOfWeek = cur.getDay(); // 0 is Sun, 6 is Sat
      const isWeekend = !isWorkableDay(cur, companyWorkingDays);
      const dayName = cur.toLocaleDateString('en-US', { weekday: 'long' });
      const formattedDate = formatDateDDMMYYYY(cur);

      dateColumns.push({
        dateKey,
        formattedDate,
        dayName,
        dayOfWeek,
        isWeekend,
        rawDate: new Date(cur),
      });

      cur.setDate(cur.getDate() + 1);
    }

    // Query active employees
    const userWhere: any = {
      companyId,
      isActive: true,
      role: { not: 'PRODUCT_SUPER_ADMIN' },
    };

    if (departmentId) {
      userWhere.departmentId = departmentId;
    }

    const employees = await prisma.user.findMany({
      where: userWhere,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        employeeNumber: true,
        jobTitle: true,
        profilePhoto: true,
        shiftId: true,
        shiftTiming: true,
        department: { select: { id: true, name: true } },
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });

    // Filter employees by search query if provided
    const filteredEmployees = search
      ? employees.filter((emp) => {
          const fullName = `${emp.firstName || ''} ${emp.lastName || ''}`.toLowerCase();
          const empNum = (emp.employeeNumber || '').toLowerCase();
          const dept = (emp.department?.name || '').toLowerCase();
          const role = (emp.jobTitle || '').toLowerCase();
          return fullName.includes(search) || empNum.includes(search) || dept.includes(search) || role.includes(search);
        })
      : employees;

    const employeeIds = filteredEmployees.map((e) => e.id);

    // Query Attendance in the range for these employees
    const rangeStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 0, 0, 0, 0);
    const rangeEnd = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999);

    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        companyId,
        userId: { in: employeeIds },
        checkIn: { gte: rangeStart, lte: rangeEnd },
      },
      orderBy: { checkIn: 'asc' },
    });

    // Query Approved Leaves overlapping this date range
    const leaveRequests = await prisma.request.findMany({
      where: {
        companyId,
        userId: { in: employeeIds },
        type: 'LEAVE',
        status: 'APPROVED',
        startDate: { lte: rangeEnd },
        endDate: { gte: rangeStart },
      },
      include: {
        leaveType: { select: { id: true, name: true, code: true, color: true } },
      },
    });

    // Map Attendance by userId + dateKey
    const attendanceMap = new Map<string, any>();
    attendanceRecords.forEach((att) => {
      const dKey = toDateKey(att.checkIn);
      const key = `${att.userId}_${dKey}`;
      // In case of multiple, keep earliest checkIn and latest checkOut
      if (!attendanceMap.has(key)) {
        attendanceMap.set(key, att);
      } else {
        const existing = attendanceMap.get(key);
        const checkIn = existing.checkIn < att.checkIn ? existing.checkIn : att.checkIn;
        const checkOut = att.checkOut
          ? existing.checkOut
            ? existing.checkOut > att.checkOut
              ? existing.checkOut
              : att.checkOut
            : att.checkOut
          : existing.checkOut;
        attendanceMap.set(key, { ...existing, checkIn, checkOut });
      }
    });

    // Helper to resolve employee shift matching attendance engine
    const resolveEmployeeShift = (emp: { shiftId?: number | null | string; shiftTiming?: string | null }) => {
      let matched = companyShifts.find((s: any) => String(s.id) === String(emp.shiftId));
      if (!matched && emp.shiftTiming) {
        const cleanTiming = emp.shiftTiming.split('(')[0].trim().toLowerCase();
        matched = companyShifts.find(
          (s: any) =>
            (s.name && s.name.trim().toLowerCase() === cleanTiming) ||
            emp.shiftTiming?.toLowerCase().includes((s.name || '').trim().toLowerCase())
        );
      }
      if (!matched && emp.shiftTiming) {
        const match12 = emp.shiftTiming.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        if (match12) {
          let h = parseInt(match12[1], 10);
          const m = parseInt(match12[2], 10);
          const ampm = match12[3].toUpperCase();
          if (ampm === 'PM' && h < 12) h += 12;
          if (ampm === 'AM' && h === 12) h = 0;
          return {
            name: emp.shiftTiming,
            startTime: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
            gracePeriodMinutes: defaultShift.gracePeriodMinutes || 15,
          };
        }
        const match24 = emp.shiftTiming.match(/(\d{1,2}):(\d{2})/);
        if (match24) {
          const h = parseInt(match24[1], 10);
          const m = parseInt(match24[2], 10);
          return {
            name: emp.shiftTiming,
            startTime: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
            gracePeriodMinutes: defaultShift.gracePeriodMinutes || 15,
          };
        }
      }
      return matched || defaultShift;
    };

    // Build the grid matrix for each employee
    let totalPunchesCount = 0;
    let totalLatePunches = 0;
    let totalMissingCheckouts = 0;
    let totalWorkedHours = 0;

    const employeePunches = filteredEmployees.map((emp) => {
      const shift = resolveEmployeeShift(emp);
      const empWorkingDays = shift?.workingDays || companyWorkingDays;
      const shiftStart = shift?.startTime || '09:00';
      const graceMin = Number(shift?.gracePeriodMinutes) || 15;
      const [shH, shM] = shiftStart.split(':').map(Number);
      const shiftThresholdMinutes = (isNaN(shH) ? 9 : shH) * 60 + (isNaN(shM) ? 0 : shM) + graceMin;

      const punchesByDate: Record<string, any> = {};

      dateColumns.forEach((col) => {
        const key = `${emp.id}_${col.dateKey}`;
        const att = attendanceMap.get(key);
        const isEmpWorkDay = isWorkableDay(col.rawDate, empWorkingDays);
        const isEmployeeWeekend = !isEmpWorkDay;

        // Check if employee has approved leave on this date
        const onLeave = leaveRequests.find((req) => {
          if (req.userId !== emp.id) return false;
          if (!req.startDate || !req.endDate) return false;
          const startKey = toDateKey(req.startDate);
          const endKey = toDateKey(req.endDate);
          return col.dateKey >= startKey && col.dateKey <= endKey;
        });

        if (att) {
          totalPunchesCount++;
          const checkInTime = formatTime12(att.checkIn, timezone);
          const checkOutTime = att.checkOut ? formatTime12(att.checkOut, timezone) : null;
          const duration = Number(att.durationHours) || 0;
          totalWorkedHours += duration;

          // Check if punch is late based on company timezone & shift grace period
          const checkInMinutes = getMinutesInTimezone(att.checkIn, timezone);
          const isLate = checkInMinutes > shiftThresholdMinutes;
          if (isLate) totalLatePunches++;

          // Check if checkout is missing on past days or overdue today
          const isPast = col.rawDate < new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
          const isToday = col.dateKey === toDateKey(today);
          const shiftEnd = shift?.endTime || '18:00';
          const [endH, endM] = shiftEnd.split(':').map(Number);
          const shiftEndMinutes = (isNaN(endH) ? 18 : endH) * 60 + (isNaN(endM) ? 0 : endM);
          const currentMinutesNow = getMinutesInTimezone(today, timezone);
          const isTodayShiftEnded = isToday && currentMinutesNow > shiftEndMinutes + 30;

          const isMissingPunch = Boolean(!att.checkOut && (isPast || isTodayShiftEnded));
          const isOngoing = Boolean(!att.checkOut && isToday && !isTodayShiftEnded);
          if (isMissingPunch) totalMissingCheckouts++;

          punchesByDate[col.dateKey] = {
            hasPunch: true,
            checkIn: checkInTime,
            checkOut: checkOutTime,
            checkInRaw: att.checkIn,
            checkOutRaw: att.checkOut,
            durationHours: duration,
            workMode: att.workMode,
            note: att.note || '',
            isLate,
            isMissingPunch,
            isOngoing,
            isOnLeave: false,
            isWeekend: isEmployeeWeekend,
          };
        } else if (onLeave) {
          punchesByDate[col.dateKey] = {
            hasPunch: false,
            isOnLeave: true,
            leave: {
              id: onLeave.id,
              name: onLeave.leaveType?.name || onLeave.title || 'Leave',
              code: onLeave.leaveType?.code || 'LV',
              color: onLeave.leaveType?.color || 'purple',
              days: Number(onLeave.days) || 1,
            },
            isWeekend: isEmployeeWeekend,
          };
        } else {
          punchesByDate[col.dateKey] = {
            hasPunch: false,
            isOnLeave: false,
            isWeekend: isEmployeeWeekend,
          };
        }
      });

      return {
        id: emp.id,
        firstName: emp.firstName,
        lastName: emp.lastName,
        fullName: `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.email,
        email: emp.email,
        employeeNumber: emp.employeeNumber?.trim() || '',
        jobTitle: emp.jobTitle || 'Employee',
        department: emp.department?.name || 'General',
        departmentId: emp.department?.id || null,
        profilePhoto: emp.profilePhoto,
        shiftName: shift.name || 'Standard Shift',
        punchesByDate,
      };
    });

    return res.json({
      startDate: toDateKey(startDate),
      endDate: toDateKey(endDate),
      dates: dateColumns,
      employees: employeePunches,
      summary: {
        totalEmployees: filteredEmployees.length,
        totalPunchesCount,
        totalLatePunches,
        totalMissingCheckouts,
        totalWorkedHours: Math.round(totalWorkedHours * 10) / 10,
        averageHoursPerPunch:
          totalPunchesCount > 0 ? Math.round((totalWorkedHours / totalPunchesCount) * 10) / 10 : 0,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /reports/daily-punch/export
 * Download Daily Punch Report as Excel (.xlsx) file
 */
router.get('/daily-punch/export', async (req, res, next) => {
  try {
    const companyId = req.user!.companyId!;
    const departmentId = req.query.departmentId ? Number(req.query.departmentId) : undefined;
    const search = req.query.search ? String(req.query.search).trim().toLowerCase() : '';

    const today = new Date();
    let startDate: Date;
    let endDate: Date;

    if (req.query.startDate && req.query.endDate) {
      startDate = parseLocalDate(String(req.query.startDate));
      endDate = parseLocalDate(String(req.query.endDate));
    } else {
      endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
      startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 10, 0, 0, 0, 0);
    }

    if (startDate > endDate) {
      const temp = startDate;
      startDate = endDate;
      endDate = temp;
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { name: true, timezone: true, shifts: true, workingDays: true },
    });

    const timezone = company?.timezone || 'Asia/Kolkata';
    const companyWorkingDays = company?.workingDays || 'mon,tue,wed,thu,fri';

    // Generate date columns
    const dateColumns: Array<{
      dateKey: string;
      formattedDate: string;
      dayName: string;
      rawDate: Date;
    }> = [];

    const cur = new Date(startDate);
    while (cur <= endDate) {
      dateColumns.push({
        dateKey: toDateKey(cur),
        formattedDate: formatDateDDMMYYYY(cur),
        dayName: cur.toLocaleDateString('en-US', { weekday: 'short' }),
        rawDate: new Date(cur),
      });
      cur.setDate(cur.getDate() + 1);
    }

    const userWhere: any = { companyId, isActive: true, role: { not: 'PRODUCT_SUPER_ADMIN' } };
    if (departmentId) userWhere.departmentId = departmentId;

    let employees = await prisma.user.findMany({
      where: userWhere,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        employeeNumber: true,
        jobTitle: true,
        shiftId: true,
        shiftTiming: true,
        department: { select: { name: true } },
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });

    const companyShifts = Array.isArray(company?.shifts) ? (company.shifts as any[]) : [];
    const defaultShift = companyShifts.find((s: any) => s.isDefault) || companyShifts[0] || {
      startTime: '09:00',
      endTime: '18:00',
      gracePeriodMinutes: 15,
    };

    const resolveEmployeeShift = (emp: { shiftId?: number | null | string; shiftTiming?: string | null }) => {
      let matched = companyShifts.find((s: any) => String(s.id) === String(emp.shiftId));
      if (!matched && emp.shiftTiming) {
        const cleanTiming = emp.shiftTiming.split('(')[0].trim().toLowerCase();
        matched = companyShifts.find(
          (s: any) =>
            (s.name && s.name.trim().toLowerCase() === cleanTiming) ||
            emp.shiftTiming?.toLowerCase().includes((s.name || '').trim().toLowerCase())
        );
      }
      if (!matched && emp.shiftTiming) {
        const match12 = emp.shiftTiming.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        if (match12) {
          let h = parseInt(match12[1], 10);
          const m = parseInt(match12[2], 10);
          const ampm = match12[3].toUpperCase();
          if (ampm === 'PM' && h < 12) h += 12;
          if (ampm === 'AM' && h === 12) h = 0;
          return {
            name: emp.shiftTiming,
            startTime: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
            gracePeriodMinutes: defaultShift.gracePeriodMinutes || 15,
          };
        }
        const match24 = emp.shiftTiming.match(/(\d{1,2}):(\d{2})/);
        if (match24) {
          const h = parseInt(match24[1], 10);
          const m = parseInt(match24[2], 10);
          return {
            name: emp.shiftTiming,
            startTime: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
            gracePeriodMinutes: defaultShift.gracePeriodMinutes || 15,
          };
        }
      }
      return matched || defaultShift;
    };

    if (search) {
      employees = employees.filter((emp) => {
        const full = `${emp.firstName || ''} ${emp.lastName || ''}`.toLowerCase();
        return (
          full.includes(search) ||
          (emp.employeeNumber || '').toLowerCase().includes(search) ||
          (emp.department?.name || '').toLowerCase().includes(search)
        );
      });
    }

    const employeeIds = employees.map((e) => e.id);
    const rangeStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 0, 0, 0, 0);
    const rangeEnd = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999);

    const [attendanceRecords, leaveRequests] = await Promise.all([
      prisma.attendance.findMany({
        where: {
          companyId,
          userId: { in: employeeIds },
          checkIn: { gte: rangeStart, lte: rangeEnd },
        },
      }),
      prisma.request.findMany({
        where: {
          companyId,
          userId: { in: employeeIds },
          type: 'LEAVE',
          status: 'APPROVED',
          startDate: { lte: rangeEnd },
          endDate: { gte: rangeStart },
        },
        include: { leaveType: true },
      }),
    ]);

    const attMap = new Map<string, any>();
    attendanceRecords.forEach((att) => {
      const k = `${att.userId}_${toDateKey(att.checkIn)}`;
      attMap.set(k, att);
    });

    // Create Excel Workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Uptrix HRMS';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Daily Punch Report');

    // Title Row
    sheet.mergeCells('A1', 'E1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = `${company?.name || 'Company'} - Daily Punch Report (${toDateKey(startDate)} to ${toDateKey(endDate)})`;
    titleCell.font = { bold: true, size: 14, color: { argb: 'FF1E293B' } };
    titleCell.alignment = { vertical: 'middle' };
    sheet.getRow(1).height = 28;

    // Headers Row
    const headerCols = ['Employee Name', 'Employee Code', 'Department', 'Designation'];
    dateColumns.forEach((col) => {
      headerCols.push(`${col.formattedDate} (${col.dayName})`);
    });

    const headerRow = sheet.addRow(headerCols);
    headerRow.height = 24;
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4338CA' }, // Indigo-700
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    // Align the first 4 columns to left
    headerRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
    headerRow.getCell(2).alignment = { vertical: 'middle', horizontal: 'left' };
    headerRow.getCell(3).alignment = { vertical: 'middle', horizontal: 'left' };
    headerRow.getCell(4).alignment = { vertical: 'middle', horizontal: 'left' };

    // Data rows
    employees.forEach((emp) => {
      const rowData: any[] = [
        `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Employee',
        emp.employeeNumber?.trim() || '-',
        emp.department?.name || '-',
        emp.jobTitle || '-',
      ];

      dateColumns.forEach((col) => {
        const k = `${emp.id}_${col.dateKey}`;
        const att = attMap.get(k);

        const onLeave = leaveRequests.find((req) => {
          if (req.userId !== emp.id) return false;
          if (!req.startDate || !req.endDate) return false;
          const s = toDateKey(req.startDate);
          const e = toDateKey(req.endDate);
          return col.dateKey >= s && col.dateKey <= e;
        });

        if (att) {
          const shift = resolveEmployeeShift(emp);
          const shiftStart = shift?.startTime || '09:00';
          const graceMin = Number(shift?.gracePeriodMinutes) || 15;
          const [shH, shM] = shiftStart.split(':').map(Number);
          const shiftThresholdMinutes = (isNaN(shH) ? 9 : shH) * 60 + (isNaN(shM) ? 0 : shM) + graceMin;

          const inT = formatTime12(att.checkIn, timezone);
          const checkInMinutes = getMinutesInTimezone(att.checkIn, timezone);
          const isLate = checkInMinutes > shiftThresholdMinutes;
          const lateFlag = isLate ? ' ⚠️' : '';

          const isPast = col.rawDate < new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
          const isToday = col.dateKey === toDateKey(today);
          const shiftEnd = shift?.endTime || '18:00';
          const [endH, endM] = shiftEnd.split(':').map(Number);
          const shiftEndMinutes = (isNaN(endH) ? 18 : endH) * 60 + (isNaN(endM) ? 0 : endM);
          const currentMinutesNow = getMinutesInTimezone(today, timezone);
          const isTodayShiftEnded = isToday && currentMinutesNow > shiftEndMinutes + 30;

          let outT = att.checkOut ? formatTime12(att.checkOut, timezone) : '';
          if (!att.checkOut) {
            outT = (isPast || isTodayShiftEnded) ? 'No Out ⚠️' : 'In Progress';
          }
          rowData.push(`${inT}${lateFlag}\n${outT}`);
        } else if (onLeave) {
          rowData.push(`Leave (${onLeave.leaveType?.code || 'LV'})`);
        } else {
          const shift = resolveEmployeeShift(emp);
          const empWorkingDays = shift?.workingDays || companyWorkingDays;
          const isEmpWorkDay = isWorkableDay(col.rawDate, empWorkingDays);
          rowData.push(isEmpWorkDay ? '-' : 'Weekend');
        }
      });

      const row = sheet.addRow(rowData);
      row.height = 32;
      row.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      row.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
      row.getCell(2).alignment = { vertical: 'middle', horizontal: 'left' };
      row.getCell(3).alignment = { vertical: 'middle', horizontal: 'left' };
      row.getCell(4).alignment = { vertical: 'middle', horizontal: 'left' };
    });

    // Auto-fit column widths
    sheet.columns.forEach((column: any, i) => {
      if (i < 4) {
        column.width = 22;
      } else {
        column.width = 16;
      }
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=daily_punch_report_${toDateKey(startDate)}_${toDateKey(endDate)}.xlsx`
    );

    const buffer = await workbook.xlsx.writeBuffer();
    return res.send(buffer);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /reports/leave-taken
 * Comprehensive audit report of all leaves taken across the organization.
 */
router.get('/leave-taken', async (req, res, next) => {
  try {
    const companyId = req.user!.companyId!;
    const departmentId = req.query.departmentId ? Number(req.query.departmentId) : undefined;
    const leaveTypeId = req.query.leaveTypeId ? Number(req.query.leaveTypeId) : undefined;
    const status = req.query.status ? String(req.query.status) : 'APPROVED';
    const search = req.query.search ? String(req.query.search).trim().toLowerCase() : '';
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(200, Math.max(1, Number(req.query.pageSize) || 50));

    const where: any = {
      companyId,
      type: 'LEAVE',
    };

    if (status !== 'ALL') {
      where.status = status;
    }

    if (leaveTypeId) {
      where.leaveTypeId = leaveTypeId;
    }

    if (departmentId) {
      where.user = { departmentId };
    }

    if (req.query.startDate && req.query.endDate) {
      const s = parseLocalDate(String(req.query.startDate));
      const e = parseLocalDate(String(req.query.endDate));
      e.setHours(23, 59, 59, 999);
      where.startDate = { lte: e };
      where.endDate = { gte: s };
    }

    if (search) {
      where.OR = [
        { user: { firstName: { contains: search, mode: 'insensitive' } } },
        { user: { lastName: { contains: search, mode: 'insensitive' } } },
        { user: { employeeNumber: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { reason: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [leaves, totalCount, allApprovedCompanyLeaves] = await Promise.all([
      prisma.request.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              employeeNumber: true,
              jobTitle: true,
              profilePhoto: true,
              department: { select: { id: true, name: true } },
            },
          },
          approver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          leaveType: {
            select: {
              id: true,
              name: true,
              code: true,
              color: true,
              isPaid: true,
            },
          },
        },
        orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.request.count({ where }),
      prisma.request.findMany({
        where: {
          companyId,
          type: 'LEAVE',
          status: 'APPROVED',
        },
        select: {
          days: true,
          leaveTypeId: true,
          startDate: true,
          endDate: true,
          leaveType: { select: { name: true } },
        },
      }),
    ]);

    // Calculate Summary Metrics
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let totalDaysTaken = 0;
    let activeLeavesToday = 0;
    const leaveTypeCounts: Record<string, { name: string; count: number; days: number }> = {};

    allApprovedCompanyLeaves.forEach((l) => {
      const days = Number(l.days) || 1;
      totalDaysTaken += days;

      if (l.startDate && l.endDate) {
        const s = new Date(l.startDate);
        const e = new Date(l.endDate);
        if (today >= s && today <= e) {
          activeLeavesToday++;
        }
      }

      const typeName = l.leaveType?.name || 'General Leave';
      if (!leaveTypeCounts[typeName]) {
        leaveTypeCounts[typeName] = { name: typeName, count: 0, days: 0 };
      }
      leaveTypeCounts[typeName].count += 1;
      leaveTypeCounts[typeName].days += days;
    });

    const leaveTypeDistribution = Object.values(leaveTypeCounts).sort((a, b) => b.days - a.days);

    return res.json({
      leaves: leaves.map((l) => ({
        id: l.id,
        employee: {
          id: l.user.id,
          name: `${l.user.firstName || ''} ${l.user.lastName || ''}`.trim() || l.user.email,
          employeeNumber: l.user.employeeNumber?.trim() || '',
          email: l.user.email,
          jobTitle: l.user.jobTitle || 'Employee',
          department: l.user.department?.name || 'General',
          profilePhoto: l.user.profilePhoto,
        },
        leaveType: {
          id: l.leaveType?.id || 0,
          name: l.leaveType?.name || l.title || 'Leave',
          code: l.leaveType?.code || 'LV',
          color: l.leaveType?.color || 'blue',
          isPaid: l.leaveType?.isPaid ?? true,
        },
        startDate: l.startDate,
        endDate: l.endDate,
        days: Number(l.days) || 1,
        reason: l.reason || '-',
        status: l.status,
        appliedDate: l.createdAt,
        approvedBy: l.approver
          ? `${l.approver.firstName || ''} ${l.approver.lastName || ''}`.trim() || l.approver.email
          : null,
        resolvedAt: l.resolvedAt,
        decisionNote: l.decisionNote || null,
      })),
      total: totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize) || 1,
      summary: {
        totalLeavesTaken: allApprovedCompanyLeaves.length,
        totalDaysTaken: Math.round(totalDaysTaken * 10) / 10,
        activeLeavesToday,
        topLeaveType: leaveTypeDistribution[0]?.name || 'Casual Leave',
        distribution: leaveTypeDistribution,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /reports/leave-taken/export
 * Download Leave Taken Report as Excel (.xlsx) file
 */
router.get('/leave-taken/export', async (req, res, next) => {
  try {
    const companyId = req.user!.companyId!;
    const departmentId = req.query.departmentId ? Number(req.query.departmentId) : undefined;
    const leaveTypeId = req.query.leaveTypeId ? Number(req.query.leaveTypeId) : undefined;
    const status = req.query.status ? String(req.query.status) : 'APPROVED';
    const search = req.query.search ? String(req.query.search).trim().toLowerCase() : '';

    const where: any = { companyId, type: 'LEAVE' };
    if (status !== 'ALL') where.status = status;
    if (leaveTypeId) where.leaveTypeId = leaveTypeId;
    if (departmentId) where.user = { departmentId };

    if (req.query.startDate && req.query.endDate) {
      const s = parseLocalDate(String(req.query.startDate));
      const e = parseLocalDate(String(req.query.endDate));
      e.setHours(23, 59, 59, 999);
      where.startDate = { lte: e };
      where.endDate = { gte: s };
    }

    if (search) {
      where.OR = [
        { user: { firstName: { contains: search, mode: 'insensitive' } } },
        { user: { lastName: { contains: search, mode: 'insensitive' } } },
        { user: { employeeNumber: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { reason: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [company, leaves] = await Promise.all([
      prisma.company.findUnique({ where: { id: companyId }, select: { name: true } }),
      prisma.request.findMany({
        where,
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              employeeNumber: true,
              jobTitle: true,
              department: { select: { name: true } },
            },
          },
          approver: {
            select: { firstName: true, lastName: true, email: true },
          },
          leaveType: true,
        },
        orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
      }),
    ]);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Uptrix HRMS';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Leave Taken Report');

    sheet.mergeCells('A1', 'H1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = `${company?.name || 'Company'} - Leave Taken Audit Report`;
    titleCell.font = { bold: true, size: 14, color: { argb: 'FF1E293B' } };
    titleCell.alignment = { vertical: 'middle' };
    sheet.getRow(1).height = 28;

    const headers = [
      'Employee Name',
      'Employee ID',
      'Email',
      'Department',
      'Designation',
      'Leave Type',
      'From Date',
      'To Date',
      'Total Days',
      'Reason',
      'Applied Date',
      'Status',
      'Approved By',
      'Decision Note',
    ];

    const headerRow = sheet.addRow(headers);
    headerRow.height = 24;
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0284C7' }, // Sky-600
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    leaves.forEach((l) => {
      const fromStr = l.startDate ? formatDateDDMMYYYY(new Date(l.startDate)) : '-';
      const toStr = l.endDate ? formatDateDDMMYYYY(new Date(l.endDate)) : '-';
      const appliedStr = l.createdAt ? formatDateDDMMYYYY(new Date(l.createdAt)) : '-';
      const approverName = l.approver
        ? `${l.approver.firstName || ''} ${l.approver.lastName || ''}`.trim() || l.approver.email
        : '-';

      const row = sheet.addRow([
        `${l.user.firstName || ''} ${l.user.lastName || ''}`.trim() || 'Employee',
        l.user.employeeNumber?.trim() || '-',
        l.user.email,
        l.user.department?.name || '-',
        l.user.jobTitle || '-',
        l.leaveType?.name || l.title || 'Leave',
        fromStr,
        toStr,
        Number(l.days) || 1,
        l.reason || '-',
        appliedStr,
        l.status,
        approverName,
        l.decisionNote || '-',
      ]);

      row.height = 22;
      row.alignment = { vertical: 'middle', horizontal: 'left' };
      row.getCell(9).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(12).alignment = { vertical: 'middle', horizontal: 'center' };
    });

    sheet.columns.forEach((column: any) => {
      column.width = 20;
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=leave_taken_report_${toDateKey(new Date())}.xlsx`);

    const buffer = await workbook.xlsx.writeBuffer();
    return res.send(buffer);
  } catch (error) {
    next(error);
  }
});

export default router;

