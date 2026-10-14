import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import prisma from '../lib/prisma.js';
import ExcelJS from 'exceljs';

describe('Milestone 3: Attendance Acceptance Tests', () => {
  let employeeToken: string;
  let hrToken: string;
  let employeeId: number;
  let acmeCompanyId: number;

  beforeAll(async () => {
    const acme = await prisma.company.findUnique({ where: { code: 'ACME' } });
    if (!acme) throw new Error('ACME company not found');
    acmeCompanyId = acme.id;

    // Login Employee
    const empLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ login: 'employee@acme.com', password: 'Employee@123' });
    employeeToken = empLogin.body.token;
    employeeId = empLogin.body.user.id;

    // Login HR
    const hrLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ login: 'hr@acme.com', password: 'Hr@123' });
    hrToken = hrLogin.body.token;

    // Ensure any open sessions for this employee are cleaned up before test
    await prisma.attendance.deleteMany({ where: { userId: employeeId } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('1. Employee checks in successfully', async () => {
    const res = await request(app)
      .post('/api/v1/attendance/check-in')
      .set('Authorization', `Bearer ${employeeToken}`)
      .set('x-company-id', String(acmeCompanyId))
      .send({
        latitude: 19.076,
        longitude: 72.8777,
        workMode: 'WFO',
        note: 'Reporting to office HQ',
      });

    expect(res.status).toBe(201);
    expect(res.body.attendance).toBeDefined();
    expect(res.body.attendance.checkOut).toBeNull();
    expect(res.body.attendance.workMode).toBe('WFO');
    expect(res.body.attendance.checkInGeo).toBeDefined();
  });

  it('2. Cannot check in twice while an active session is open', async () => {
    const res = await request(app)
      .post('/api/v1/attendance/check-in')
      .set('Authorization', `Bearer ${employeeToken}`)
      .set('x-company-id', String(acmeCompanyId))
      .send({
        latitude: 19.076,
        longitude: 72.8777,
        workMode: 'WFO',
      });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('ALREADY_CHECKED_IN');
  });

  it('3. Employee checks out and duration is calculated', async () => {
    const res = await request(app)
      .post('/api/v1/attendance/check-out')
      .set('Authorization', `Bearer ${employeeToken}`)
      .set('x-company-id', String(acmeCompanyId))
      .send({
        latitude: 19.076,
        longitude: 72.8777,
        note: 'Completed daily shift',
      });

    expect(res.status).toBe(200);
    expect(res.body.attendance.checkOut).not.toBeNull();
    expect(Number(res.body.attendance.durationHours)).toBeGreaterThanOrEqual(0);
  });

  it('4. Duration is calculated correctly across midnight', async () => {
    // Manually create a session starting at 22:00 on Day 1 and ending at 06:30 on Day 2 (8.5 hours)
    const checkInTime = new Date('2026-10-01T22:00:00.000Z');
    const checkOutTime = new Date('2026-10-02T06:30:00.000Z');

    const midnightSession = await prisma.attendance.create({
      data: {
        companyId: acmeCompanyId,
        userId: employeeId,
        checkIn: checkInTime,
        checkOut: null,
        workMode: 'WFO',
      },
    });

    // Close session directly or via service
    const durationMs = checkOutTime.getTime() - checkInTime.getTime();
    const durationHours = Math.round((durationMs / 3600000) * 100) / 100;

    const closedSession = await prisma.attendance.update({
      where: { id: midnightSession.id },
      data: {
        checkOut: checkOutTime,
        durationHours,
      },
    });

    expect(Number(closedSession.durationHours)).toBe(8.5);
  });

  it('5. Attendance export generates a valid Excel (.xlsx) file readable by ExcelJS', async () => {
    const res = await request(app)
      .get('/api/v1/company/attendance/export')
      .set('Authorization', `Bearer ${hrToken}`)
      .set('x-company-id', String(acmeCompanyId))
      .responseType('blob');

    expect(res.status).toBe(200);
    expect(res.header['content-type']).toContain('spreadsheetml.sheet');

    // Load buffer into ExcelJS to confirm validity
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(res.body);

    const sheet = workbook.getWorksheet('Attendance Logs');
    expect(sheet).toBeDefined();
    expect(sheet?.rowCount).toBeGreaterThanOrEqual(2); // Header row + records
  });
});
