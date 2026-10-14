import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import prisma from '../lib/prisma.js';
import bcrypt from 'bcryptjs';

describe('Milestone 1: Foundation Acceptance Tests', () => {
  let acmeCompanyId: number;
  let otherCompanyId: number;

  beforeAll(async () => {
    // Find Acme company
    const acme = await prisma.company.findUnique({ where: { code: 'ACME' } });
    if (!acme) throw new Error('ACME company not found, run seed first');
    acmeCompanyId = acme.id;

    // Create a temporary other company to test cross-tenant isolation
    const otherCompany = await prisma.company.upsert({
      where: { code: 'OTHER' },
      update: {},
      create: {
        name: 'Other Corp',
        code: 'OTHER',
        subdomain: 'other',
        isActive: true,
        subIsActive: true,
      },
    });
    otherCompanyId = otherCompany.id;

    // Reset newhire password and mustChangePassword for idempotent tests
    const tempPass = await bcrypt.hash('TempPass@123', 12);
    await prisma.user.updateMany({
      where: { email: 'newhire@acme.com' },
      data: {
        passwordHash: tempPass,
        mustChangePassword: true,
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('1. Seeded Super Admin can log in successfully', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ login: 'superadmin@uptrix.io', password: 'SuperAdmin@123' });

    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('PRODUCT_SUPER_ADMIN');
    expect(res.body.user.companyId).toBeNull();
    expect(res.body.token).toBeDefined();
  });

  it('2. Seeded Company Admin can log in successfully', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ login: 'admin@acme.com', password: 'Admin@123' });

    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('COMPANY_ADMIN');
    expect(res.body.user.companyId).toBe(acmeCompanyId);
    expect(res.body.company.name).toBe('Acme Corporation');
  });

  it('3. Seeded HR can log in successfully', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ login: 'hr@acme.com', password: 'Hr@123' });

    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('HR');
    expect(res.body.user.companyId).toBe(acmeCompanyId);
  });

  it('4. Seeded Employee can log in successfully', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ login: 'employee@acme.com', password: 'Employee@123' });

    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('EMPLOYEE');
    expect(res.body.user.companyId).toBe(acmeCompanyId);
  });

  it('5. New hire with mustChangePassword=true is blocked from normal protected routes', async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ login: 'newhire@acme.com', password: 'TempPass@123' });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.user.mustChangePassword).toBe(true);
    const token = loginRes.body.token;

    // Attempt to access protected tenant route
    const blockedRes = await request(app)
      .get('/api/v1/protected-tenant-test')
      .set('Authorization', `Bearer ${token}`)
      .set('x-company-id', String(acmeCompanyId));

    expect(blockedRes.status).toBe(403);
    expect(blockedRes.body.code).toBe('PASSWORD_CHANGE_REQUIRED');
  });

  it('6. New hire can change password and then access protected routes', async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ login: 'newhire@acme.com', password: 'TempPass@123' });

    const token = loginRes.body.token;

    // Change password
    const changeRes = await request(app)
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({
        oldPassword: 'TempPass@123',
        newPassword: 'BrandNewSecurePass@2026',
      });

    expect(changeRes.status).toBe(200);
    expect(changeRes.body.success).toBe(true);

    // Now protected route must succeed
    const allowedRes = await request(app)
      .get('/api/v1/protected-tenant-test')
      .set('Authorization', `Bearer ${token}`)
      .set('x-company-id', String(acmeCompanyId));

    expect(allowedRes.status).toBe(200);
    expect(allowedRes.body.success).toBe(true);
  });

  it('7. Cross-tenant access is rejected with CROSS_TENANT_FORBIDDEN', async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ login: 'employee@acme.com', password: 'Employee@123' });

    const token = loginRes.body.token;

    // Request with other company header
    const crossRes = await request(app)
      .get('/api/v1/protected-tenant-test')
      .set('Authorization', `Bearer ${token}`)
      .set('x-company-id', String(otherCompanyId));

    expect(crossRes.status).toBe(403);
    expect(crossRes.body.code).toBe('CROSS_TENANT_FORBIDDEN');
  });
});
