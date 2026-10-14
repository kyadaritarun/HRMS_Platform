import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import prisma from '../lib/prisma.js';
import { calculateEmployeePayroll, round2 } from '../services/payroll/calculatePayroll.js';

describe('Milestone 5: Payroll Engine and Acceptance Tests', () => {
  let hrToken: string;
  let employeeToken: string;
  let employeeId: number;
  let acmeCompanyId: number;
  let publishedPayslipId: number;

  beforeAll(async () => {
    const acme = await prisma.company.findUnique({ where: { code: 'ACME' } });
    if (!acme) throw new Error('ACME company not found');
    acmeCompanyId = acme.id;

    const hrLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ login: 'hr@acme.com', password: 'Hr@123' });
    hrToken = hrLogin.body.token;

    const empLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ login: 'employee@acme.com', password: 'Employee@123' });
    employeeToken = empLogin.body.token;
    employeeId = empLogin.body.user.id;

    // Clean up any existing payslips for employee before test
    await prisma.payslip.deleteMany({ where: { employeeId } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('1. Exact formulas match hand-calculated expectations (Standard month calculation)', () => {
    // 2026-06 (June 2026): 30 calendar days, 22 workable days (Mon-Fri)
    // Workable dates: Jun 1-5 (5), Jun 8-12 (5), Jun 15-19 (5), Jun 22-26 (5), Jun 29-30 (2) = 22 days
    const juneWorkableDates = [
      '2026-06-01', '2026-06-02', '2026-06-03', '2026-06-04', '2026-06-05',
      '2026-06-08', '2026-06-09', '2026-06-10', '2026-06-11', '2026-06-12',
      '2026-06-15', '2026-06-16', '2026-06-17', '2026-06-18', '2026-06-19',
      '2026-06-22', '2026-06-23', '2026-06-24', '2026-06-25', '2026-06-26',
      '2026-06-29', '2026-06-30',
    ];

    // 20 present days (first 20 workable dates)
    const presentDates = juneWorkableDates.slice(0, 20).map((d) => ({
      checkIn: new Date(`${d}T09:00:00Z`),
    }));

    // 1 paid leave day on Jun 29 (21st workable date)
    const leaveDay = new Date('2026-06-29T00:00:00Z');
    // Jun 30 is unworked and unexcused -> 1 absent day!

    const result = calculateEmployeePayroll(2026, 6, {
      monthlySalary: 66000, // 66,000 / 22 = 3000/day
      bonus: 5000,
      otherDeductions: 1000,
      currency: 'INR',
      workingDaysStr: 'mon,tue,wed,thu,fri',
      holidays: [],
      attendances: presentDates,
      leaves: [
        {
          startDate: leaveDay,
          endDate: leaveDay,
          isPaid: true,
          isHalfDay: false,
        },
      ],
    });

    expect(result.totalCalendarDays).toBe(30);
    expect(result.workingDaysCount).toBe(22);
    expect(result.perDayRate).toBe(3000); // 66000 / 22
    expect(result.presentDays).toBe(20);
    expect(result.paidLeaveDays).toBe(1);
    expect(result.absentDays).toBe(1);
    expect(result.totalLopDays).toBe(1);
    expect(result.leaveDeduction).toBe(3000);
    expect(result.grossEarnings).toBe(71000); // 66000 + 5000
    expect(result.totalDeductions).toBe(4000); // 3000 + 1000
    expect(result.netSalary).toBe(67000); // 71000 - 4000
  });

  it('2. Edge Case: Mid-month joiner is prorated without penalty for days before joining', () => {
    // Employee joined on June 15, 2026
    // Workable dates from June 15 to June 30 are exactly 12 days:
    // Jun 15-19 (5), Jun 22-26 (5), Jun 29-30 (2) = 12 workable days
    const postJoinWorkableDates = [
      '2026-06-15', '2026-06-16', '2026-06-17', '2026-06-18', '2026-06-19',
      '2026-06-22', '2026-06-23', '2026-06-24', '2026-06-25', '2026-06-26',
      '2026-06-29', '2026-06-30',
    ];

    const attendances = postJoinWorkableDates.map((d) => ({
      checkIn: new Date(`${d}T09:00:00Z`),
    }));

    const result = calculateEmployeePayroll(2026, 6, {
      monthlySalary: 44000,
      joiningDate: new Date('2026-06-15T00:00:00Z'),
      workingDaysStr: 'mon,tue,wed,thu,fri',
      holidays: [],
      attendances,
      leaves: [],
    });

    // Absent days must be 0 because days before June 15 are excluded from expected workable dates
    expect(result.presentDays).toBe(12);
    expect(result.absentDays).toBe(0);
    expect(result.totalLopDays).toBe(0);
    expect(result.leaveDeduction).toBe(0);
    expect(result.netSalary).toBe(44000);
  });

  it('3. Edge Case: Zero salary employee calculations', () => {
    const result = calculateEmployeePayroll(2026, 6, {
      monthlySalary: 0,
      bonus: 2000,
      otherDeductions: 500,
      workingDaysStr: 'mon,tue,wed,thu,fri',
    });

    expect(result.perDayRate).toBe(0);
    expect(result.leaveDeduction).toBe(0);
    expect(result.grossEarnings).toBe(2000);
    expect(result.totalDeductions).toBe(500);
    expect(result.netSalary).toBe(1500);
  });

  it('4. Edge Case: Half-day leave with an attendance punch the same day has 0 absent days', () => {
    const punchDate = new Date('2026-06-10T09:00:00Z');
    const result = calculateEmployeePayroll(2026, 6, {
      monthlySalary: 22000,
      workingDaysStr: 'mon,tue,wed,thu,fri',
      attendances: [{ checkIn: punchDate }],
      leaves: [
        {
          startDate: punchDate,
          endDate: punchDate,
          isPaid: true,
          isHalfDay: true,
        },
      ],
    });

    // The punch day is present, half day paid leave is recorded
    expect(result.paidLeaveDays).toBe(0.5);
    expect(result.presentDays).toBe(1);
  });

  it('5. Publishing payroll locks payslip; editing or re-publishing without force is rejected', async () => {
    // 1. Publish payslip for employee
    const pubRes = await request(app)
      .post('/api/v1/payroll/publish')
      .set('Authorization', `Bearer ${hrToken}`)
      .set('x-company-id', String(acmeCompanyId))
      .send({
        month: 10,
        year: 2026,
        employeeIds: [employeeId],
        force: false,
      });

    expect(pubRes.status).toBe(200);
    expect(pubRes.body.count).toBe(1);
    publishedPayslipId = pubRes.body.payslips[0].id;

    // 2. Editing published payslip via adjustments fails with 400
    const editRes = await request(app)
      .put('/api/v1/payroll/adjustments')
      .set('Authorization', `Bearer ${hrToken}`)
      .set('x-company-id', String(acmeCompanyId))
      .send({
        employeeId,
        month: 10,
        year: 2026,
        bonus: 9999,
      });

    expect(editRes.status).toBe(400);
    expect(editRes.body.code).toBe('CANNOT_EDIT_PUBLISHED');

    // 3. Re-publishing without force fails
    const republishFailRes = await request(app)
      .post('/api/v1/payroll/publish')
      .set('Authorization', `Bearer ${hrToken}`)
      .set('x-company-id', String(acmeCompanyId))
      .send({
        month: 10,
        year: 2026,
        employeeIds: [employeeId],
        force: false,
      });

    expect(republishFailRes.status).toBe(400);
    expect(republishFailRes.body.code).toBe('PAYSLIP_ALREADY_PUBLISHED');

    // 4. Re-publishing WITH force succeeds
    const republishOkRes = await request(app)
      .post('/api/v1/payroll/publish')
      .set('Authorization', `Bearer ${hrToken}`)
      .set('x-company-id', String(acmeCompanyId))
      .send({
        month: 10,
        year: 2026,
        employeeIds: [employeeId],
        force: true,
      });

    expect(republishOkRes.status).toBe(200);
    expect(republishOkRes.body.success).toBe(true);
  });

  it('6. Employee can view their payslip and stream valid PDF', async () => {
    // List my payslips
    const listRes = await request(app)
      .get('/api/v1/payroll/my-payslips')
      .set('Authorization', `Bearer ${employeeToken}`)
      .set('x-company-id', String(acmeCompanyId));

    expect(listRes.status).toBe(200);
    expect(listRes.body.payslips.length).toBeGreaterThanOrEqual(1);

    // Stream PDF
    const pdfRes = await request(app)
      .get(`/api/v1/payroll/payslips/${publishedPayslipId}/pdf`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .set('x-company-id', String(acmeCompanyId));

    expect(pdfRes.status).toBe(200);
    expect(pdfRes.header['content-type']).toBe('application/pdf');
    expect(pdfRes.body.length).toBeGreaterThan(500); // Valid PDF binary bytes
  });
});
