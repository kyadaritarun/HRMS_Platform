import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import prisma from '../lib/prisma.js';

describe('Milestone 4: Unified Requests Acceptance Tests', () => {
  let employeeToken: string;
  let employeeId: number;
  let managerToken: string;
  let managerId: number;
  let hrToken: string;
  let acmeCompanyId: number;
  let casualLeaveTypeId: number;

  beforeAll(async () => {
    const acme = await prisma.company.findUnique({ where: { code: 'ACME' } });
    if (!acme) throw new Error('ACME company not found');
    acmeCompanyId = acme.id;

    const cl = await prisma.leaveType.findFirst({
      where: { companyId: acmeCompanyId, code: 'CL' },
    });
    if (!cl) throw new Error('CL leave type not found');
    casualLeaveTypeId = cl.id;

    // Login Employee
    const empLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ login: 'employee@acme.com', password: 'Employee@123' });
    employeeToken = empLogin.body.token;
    employeeId = empLogin.body.user.id;

    // Login Manager
    const mgrLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ login: 'manager@acme.com', password: 'Manager@123' });
    managerToken = mgrLogin.body.token;
    managerId = mgrLogin.body.user.id;

    // Login HR
    const hrLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ login: 'hr@acme.com', password: 'Hr@123' });
    hrToken = hrLogin.body.token;

    // Reset employee CL balance to 12
    await prisma.leaveBalance.upsert({
      where: { userId_leaveTypeId: { userId: employeeId, leaveTypeId: casualLeaveTypeId } },
      update: { balance: 12 },
      create: { userId: employeeId, leaveTypeId: casualLeaveTypeId, balance: 12, carriedOver: 0 },
    });

    // Clean up any existing requests for employeeId from previous runs
    await prisma.request.deleteMany({ where: { userId: employeeId } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('1. Employee applies for leave and approver is set to manager', async () => {
    const res = await request(app)
      .post('/api/v1/requests')
      .set('Authorization', `Bearer ${employeeToken}`)
      .set('x-company-id', String(acmeCompanyId))
      .send({
        type: 'LEAVE',
        leaveTypeId: casualLeaveTypeId,
        startDate: '2026-11-16', // Monday
        endDate: '2026-11-17',   // Tuesday (2 working days)
        reason: 'Personal work at home',
      });

    expect(res.status).toBe(201);
    expect(res.body.request.status).toBe('PENDING');
    expect(res.body.request.approverId).toBe(managerId);
    expect(Number(res.body.request.days)).toBe(2);
  });

  it('2. Employee cannot approve their own request (CANNOT_APPROVE_OWN_REQUEST)', async () => {
    // Find pending request
    const pending = await prisma.request.findFirst({
      where: { userId: employeeId, status: 'PENDING' },
    });
    expect(pending).not.toBeNull();

    const res = await request(app)
      .patch(`/api/v1/requests/${pending!.id}/decision`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .set('x-company-id', String(acmeCompanyId))
      .send({ status: 'APPROVED' });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('CANNOT_APPROVE_OWN_REQUEST');
  });

  it('3. Manager approves leave request: balance is deducted from LeaveBalance', async () => {
    const pending = await prisma.request.findFirst({
      where: { userId: employeeId, status: 'PENDING' },
    });

    const res = await request(app)
      .patch(`/api/v1/requests/${pending!.id}/decision`)
      .set('Authorization', `Bearer ${managerToken}`)
      .set('x-company-id', String(acmeCompanyId))
      .send({ status: 'APPROVED', note: 'Approved. Enjoy your time off.' });

    expect(res.status).toBe(200);
    expect(res.body.request.status).toBe('APPROVED');

    // Check balance is deducted (12 - 2 = 10)
    const balance = await prisma.leaveBalance.findUnique({
      where: { userId_leaveTypeId: { userId: employeeId, leaveTypeId: casualLeaveTypeId } },
    });
    expect(Number(balance?.balance)).toBe(10);
  });

  it('4. Employee cancels the approved leave: balance is restored', async () => {
    const approved = await prisma.request.findFirst({
      where: { userId: employeeId, type: 'LEAVE', status: 'APPROVED' },
    });

    const res = await request(app)
      .patch(`/api/v1/requests/${approved!.id}/cancel`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .set('x-company-id', String(acmeCompanyId));

    expect(res.status).toBe(200);
    expect(res.body.request.status).toBe('CANCELLED');

    // Check balance restored to 12
    const balance = await prisma.leaveBalance.findUnique({
      where: { userId_leaveTypeId: { userId: employeeId, leaveTypeId: casualLeaveTypeId } },
    });
    expect(Number(balance?.balance)).toBe(12);
  });

  it('5. Regularization request creates attendance record on approval', async () => {
    // Employee applies for regularization
    const regDate = '2026-10-14';
    const regRes = await request(app)
      .post('/api/v1/requests')
      .set('Authorization', `Bearer ${employeeToken}`)
      .set('x-company-id', String(acmeCompanyId))
      .send({
        type: 'REGULARIZATION',
        startDate: regDate,
        reason: 'Missed card swipe due to badge malfunction',
        meta: {
          requestedCheckIn: '09:15',
          requestedCheckOut: '18:15',
        },
      });

    expect(regRes.status).toBe(201);
    const regId = regRes.body.request.id;

    // Manager approves regularization
    const approveRes = await request(app)
      .patch(`/api/v1/requests/${regId}/decision`)
      .set('Authorization', `Bearer ${managerToken}`)
      .set('x-company-id', String(acmeCompanyId))
      .send({ status: 'APPROVED', note: 'Regularized swipe.' });

    expect(approveRes.status).toBe(200);

    // Verify Attendance record was created
    const att = await prisma.attendance.findFirst({
      where: {
        userId: employeeId,
        note: { contains: `Regularized per request #${regId}` },
      },
    });
    expect(att).not.toBeNull();
    expect(Number(att?.durationHours)).toBe(9);
  });

  it('6. Approver sees only their scope (mine, assigned, company)', async () => {
    // Manager checks assigned requests
    const assignedRes = await request(app)
      .get('/api/v1/requests?scope=assigned')
      .set('Authorization', `Bearer ${managerToken}`)
      .set('x-company-id', String(acmeCompanyId));

    expect(assignedRes.status).toBe(200);
    expect(assignedRes.body.items).toBeDefined();

    // Employee attempts to view company scope -> forbidden
    const companyScopeRes = await request(app)
      .get('/api/v1/requests?scope=company')
      .set('Authorization', `Bearer ${employeeToken}`)
      .set('x-company-id', String(acmeCompanyId));

    expect(companyScopeRes.status).toBe(403);
    expect(companyScopeRes.body.code).toBe('FORBIDDEN_SCOPE');
  });
});
