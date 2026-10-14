import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import prisma from '../lib/prisma.js';

describe('Milestone 2: Company Setup and Employees Acceptance Tests', () => {
  let adminToken: string;
  let hrToken: string;
  let newEmpToken: string;
  let newEmpId: number;
  let uploadedDocId: number;
  let acmeCompanyId: number;

  beforeAll(async () => {
    const acme = await prisma.company.findUnique({ where: { code: 'ACME' } });
    if (!acme) throw new Error('ACME company not found');
    acmeCompanyId = acme.id;

    // Login Admin
    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ login: 'admin@acme.com', password: 'Admin@123' });
    adminToken = adminLogin.body.token;

    // Login HR
    const hrLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ login: 'hr@acme.com', password: 'Hr@123' });
    hrToken = hrLogin.body.token;

    // Clean up test user from previous runs
    await prisma.user.deleteMany({
      where: { email: 'test.developer@acme.com' },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('1. Admin creates an employee with automatic leave balances and seat check', async () => {
    const res = await request(app)
      .post('/api/v1/employees')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-company-id', String(acmeCompanyId))
      .send({
        email: 'test.developer@acme.com',
        username: 'test_developer',
        firstName: 'Marcus',
        lastName: 'Aurelius',
        role: 'EMPLOYEE',
        jobTitle: 'Backend Engineer',
        monthlySalary: 95000,
        joiningDate: '2026-10-15',
        workMode: 'HYBRID',
      });

    expect(res.status).toBe(201);
    expect(res.body.employee).toBeDefined();
    expect(res.body.employee.firstName).toBe('Marcus');
    expect(res.body.employee.mustChangePassword).toBe(true);
    expect(res.body.temporaryPassword).toBeDefined();

    newEmpId = res.body.employee.id;

    // Verify automatic LeaveBalance rows created
    const balances = await prisma.leaveBalance.findMany({
      where: { userId: newEmpId },
    });
    expect(balances.length).toBeGreaterThanOrEqual(4);

    // Verify ActivityLog was created
    const log = await prisma.activityLog.findFirst({
      where: { companyId: acmeCompanyId, action: 'CREATE_EMPLOYEE', objectId: String(newEmpId) },
    });
    expect(log).not.toBeNull();
  });

  it('2. New employee logs in, changes password, and unlocks account', async () => {
    // Get temporary password from DB or created earlier
    const user = await prisma.user.findUnique({ where: { id: newEmpId } });
    expect(user?.mustChangePassword).toBe(true);

    // Login with temp pass
    // We can reset password with known pass to be certain:
    const resetRes = await request(app)
      .post(`/api/v1/employees/${newEmpId}/reset-password`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-company-id', String(acmeCompanyId));

    const tempPass = resetRes.body.temporaryPassword;

    const empLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ login: 'test.developer@acme.com', password: tempPass });

    expect(empLogin.status).toBe(200);
    expect(empLogin.body.user.mustChangePassword).toBe(true);
    newEmpToken = empLogin.body.token;

    // Change password
    const changeRes = await request(app)
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${newEmpToken}`)
      .send({
        oldPassword: tempPass,
        newPassword: 'MyNewStrongPass@2026',
      });

    expect(changeRes.status).toBe(200);

    // Check in DB
    const updatedUser = await prisma.user.findUnique({ where: { id: newEmpId } });
    expect(updatedUser?.mustChangePassword).toBe(false);
  });

  it('3. Employee uploads a KYC document in status PENDING', async () => {
    const res = await request(app)
      .post('/api/v1/documents')
      .set('Authorization', `Bearer ${newEmpToken}`)
      .set('x-company-id', String(acmeCompanyId))
      .send({
        category: 'IDENTITY',
        title: 'National Passport',
        identifier: 'P987654321',
        notes: 'Submitted for onboarding identity check',
      });

    expect(res.status).toBe(201);
    expect(res.body.document.status).toBe('PENDING');
    expect(res.body.document.category).toBe('IDENTITY');
    uploadedDocId = res.body.document.id;

    // Verify activity log
    const log = await prisma.activityLog.findFirst({
      where: { companyId: acmeCompanyId, action: 'UPLOAD_DOCUMENT', objectId: String(uploadedDocId) },
    });
    expect(log).not.toBeNull();
  });

  it('4. HR reviews and verifies the document', async () => {
    // HR lists pending documents
    const listRes = await request(app)
      .get('/api/v1/company/documents/review?status=PENDING')
      .set('Authorization', `Bearer ${hrToken}`)
      .set('x-company-id', String(acmeCompanyId));

    expect(listRes.status).toBe(200);
    const found = listRes.body.documents.find((d: any) => d.id === uploadedDocId);
    expect(found).toBeDefined();

    // HR verifies document
    const verifyRes = await request(app)
      .patch(`/api/v1/documents/${uploadedDocId}/verify`)
      .set('Authorization', `Bearer ${hrToken}`)
      .set('x-company-id', String(acmeCompanyId));

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.document.status).toBe('VERIFIED');

    // Verify ActivityLog was written
    const log = await prisma.activityLog.findFirst({
      where: { companyId: acmeCompanyId, action: 'VERIFY_DOCUMENT', objectId: String(uploadedDocId) },
    });
    expect(log).not.toBeNull();
  });

  it('5. Rejection requires rejectionNote', async () => {
    // Create another document
    const docRes = await request(app)
      .post('/api/v1/documents')
      .set('Authorization', `Bearer ${newEmpToken}`)
      .set('x-company-id', String(acmeCompanyId))
      .send({
        category: 'OTHER',
        title: 'Address Proof',
      });
    const docId = docRes.body.document.id;

    // Attempt reject without note -> should fail
    const failRes = await request(app)
      .patch(`/api/v1/documents/${docId}/reject`)
      .set('Authorization', `Bearer ${hrToken}`)
      .set('x-company-id', String(acmeCompanyId))
      .send({});
    expect(failRes.status).toBe(400);

    // Reject with note -> should succeed
    const okRes = await request(app)
      .patch(`/api/v1/documents/${docId}/reject`)
      .set('Authorization', `Bearer ${hrToken}`)
      .set('x-company-id', String(acmeCompanyId))
      .send({ rejectionNote: 'Image is too blurry. Please resubmit a clean scan.' });
    expect(okRes.status).toBe(200);
    expect(okRes.body.document.status).toBe('REJECTED');
    expect(okRes.body.document.rejectionNote).toContain('blurry');
  });
});
