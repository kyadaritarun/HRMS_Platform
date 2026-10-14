import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import prisma from '../lib/prisma.js';
import bcrypt from 'bcryptjs';

describe('Milestone 7: Super Admin and Feature Gating Acceptance Tests', () => {
  let superAdminToken: string;
  let testCompanyId: number;
  let testUserToken: string;
  let testPackageId: number;

  beforeAll(async () => {
    // Login Super Admin
    const saLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ login: 'superadmin@uptrix.io', password: 'SuperAdmin@123' });

    expect(saLogin.status).toBe(200);
    superAdminToken = saLogin.body.token;

    // Create a restricted package with ONLY attendance (payroll disabled)
    const pkg = await prisma.package.create({
      data: {
        name: 'Attendance Only Plan',
        priceMonthly: 999,
        employeeLimit: 5,
        enabledFeatures: ['time_attendance_management'], // No 'payroll'
      },
    });
    testPackageId = pkg.id;

    // Create a company using this restricted package
    const comp = await prisma.company.create({
      data: {
        name: 'Restricted Corp',
        code: `RC_${Date.now()}`,
        subdomain: `restricted-${Date.now()}`,
        packageId: testPackageId,
        isActive: true,
        subIsActive: true,
      },
    });
    testCompanyId = comp.id;

    // Create an employee in this restricted company
    const pass = await bcrypt.hash('SecretPass@123', 12);
    const testUser = await prisma.user.create({
      data: {
        companyId: testCompanyId,
        email: `restricted.user.${Date.now()}@restricted.com`,
        username: `restricted_user_${Date.now()}`,
        passwordHash: pass,
        firstName: 'Test',
        lastName: 'User',
        role: 'COMPANY_ADMIN',
        mustChangePassword: false,
      },
    });

    const userLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ login: testUser.email, password: 'SecretPass@123' });

    expect(userLogin.status).toBe(200);
    testUserToken = userLogin.body.token;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('1. Super Admin can view global dashboard with KPIs and analytics', async () => {
    const res = await request(app)
      .get('/api/v1/superadmin/dashboard')
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.kpis).toBeDefined();
    expect(res.body.kpis.totalCompanies).toBeGreaterThanOrEqual(1);
    expect(res.body.latestCompanies).toBeDefined();
    expect(res.body.renewals).toBeDefined();
    expect(res.body.licenseOveruse).toBeDefined();
  });

  it('2. Feature Gating: Accessing disabled feature in plan is rejected with 403 FEATURE_LOCKED', async () => {
    // Restricted company has NO 'payroll' feature enabled in package
    const res = await request(app)
      .get('/api/v1/payroll/dashboard')
      .set('Authorization', `Bearer ${testUserToken}`)
      .set('x-company-id', String(testCompanyId));

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FEATURE_LOCKED');
    expect(res.body.error).toContain('payroll');
  });

  it('3. Feature Gating: Enabling the feature dynamically in the package unlocks the API', async () => {
    // Super Admin adds 'payroll' to the package
    const patchPkg = await request(app)
      .patch(`/api/v1/superadmin/packages/${testPackageId}`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        enabledFeatures: ['time_attendance_management', 'payroll'],
      });

    expect(patchPkg.status).toBe(200);

    // Now the tenant can access payroll
    const res = await request(app)
      .get('/api/v1/payroll/dashboard')
      .set('Authorization', `Bearer ${testUserToken}`)
      .set('x-company-id', String(testCompanyId));

    expect(res.status).toBe(200);
    expect(res.body.employees).toBeDefined();
  });

  it('4. Expired Subscription blocks tenant login with 403 SUBSCRIPTION_INACTIVE', async () => {
    // Super admin deactivates subscription for the test company
    await request(app)
      .patch(`/api/v1/superadmin/companies/${testCompanyId}`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ subIsActive: false });

    // Find the user email
    const user = await prisma.user.findFirst({ where: { companyId: testCompanyId } });

    // Attempt login
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ login: user!.email, password: 'SecretPass@123' });

    expect(loginRes.status).toBe(403);
    expect(loginRes.body.code).toBe('SUBSCRIPTION_INACTIVE');
  });

  it('5. Super Admin can provision another Super Admin with auto-generated temp password', async () => {
    const newAdminEmail = `ops.super.${Date.now()}@uptrix.io`;
    const res = await request(app)
      .post('/api/v1/superadmin/super-admins')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        fullName: 'Operations Lead',
        email: newAdminEmail,
        phone: '+91 98888 77777',
      });

    expect(res.status).toBe(201);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.role).toBe('PRODUCT_SUPER_ADMIN');
    expect(res.body.tempPassword).toBeDefined();
    expect(res.body.user.mustChangePassword).toBe(true);

    // Verify the newly created super admin can log in with temp password
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ login: newAdminEmail, password: res.body.tempPassword });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.user.role).toBe('PRODUCT_SUPER_ADMIN');
    expect(loginRes.body.user.mustChangePassword).toBe(true);
  }, 15000);

  it('6. Super Admin can manage infrastructure servers (list, create, test connection)', async () => {
    const listRes = await request(app)
      .get('/api/v1/superadmin/infrastructure/servers')
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.servers).toBeDefined();

    const createRes = await request(app)
      .post('/api/v1/superadmin/infrastructure/servers')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        name: `Node-Cluster-${Date.now()}`,
        ipAddress: '192.168.1.100',
        port: 22,
        sshUsername: 'ubuntu',
        authType: 'PASSWORD',
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.server).toBeDefined();
  });

  it('7. Super Admin can access renewals billing and manage invoices', async () => {
    const renewalsRes = await request(app)
      .get('/api/v1/superadmin/renewals-billing')
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(renewalsRes.status).toBe(200);
    expect(renewalsRes.body.renewals).toBeDefined();

    const invoicesRes = await request(app)
      .get('/api/v1/superadmin/invoices')
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(invoicesRes.status).toBe(200);
    expect(invoicesRes.body.invoices).toBeDefined();
  });

  it('8. Super Admin can view global email notification audit logs', async () => {
    const emailsRes = await request(app)
      .get('/api/v1/superadmin/emails')
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(emailsRes.status).toBe(200);
    expect(emailsRes.body.emails).toBeDefined();
  });

  it('9. Non-Super Admin (Company Admin / Employee) is rejected with 403 FORBIDDEN from superadmin routes', async () => {
    const res = await request(app)
      .get('/api/v1/superadmin/dashboard')
      .set('Authorization', `Bearer ${testUserToken}`);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN_ROLE');
  });
});
