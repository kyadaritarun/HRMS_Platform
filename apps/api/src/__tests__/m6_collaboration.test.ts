import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import prisma from '../lib/prisma.js';

describe('Milestone 6: Collaboration, Tickets, Policies, Kudos Acceptance Tests', () => {
  let employeeToken: string;
  let employeeId: number;
  let hrToken: string;
  let acmeCompanyId: number;
  let testTicketId: number;
  let testPolicyId: number;

  beforeAll(async () => {
    const acme = await prisma.company.findUnique({ where: { code: 'ACME' } });
    if (!acme) throw new Error('ACME company not found');
    acmeCompanyId = acme.id;

    const empLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ login: 'employee@acme.com', password: 'Employee@123' });
    employeeToken = empLogin.body.token;
    employeeId = empLogin.body.user.id;

    const hrLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ login: 'hr@acme.com', password: 'Hr@123' });
    hrToken = hrLogin.body.token;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('1. Employee creates a support ticket', async () => {
    const res = await request(app)
      .post('/api/v1/tickets')
      .set('Authorization', `Bearer ${employeeToken}`)
      .set('x-company-id', String(acmeCompanyId))
      .send({
        category: 'HARDWARE',
        subject: 'Need Second Monitor for Development',
        description: 'Need an external 4K monitor for dual display workspace setup.',
        priority: 'MEDIUM',
      });

    expect(res.status).toBe(201);
    expect(res.body.ticket).toBeDefined();
    expect(res.body.ticket.code).toContain('TIC-');
    expect(res.body.ticket.status).toBe('OPEN');
    testTicketId = res.body.ticket.id;
  });

  it('2. Ticket comments append safely under concurrent writes', async () => {
    // Send 5 concurrent comment additions
    const commentBodies = [
      'Concurrent message #1: Model specs verified',
      'Concurrent message #2: HDMI cable also needed',
      'Concurrent message #3: Desk placement checked',
      'Concurrent message #4: Manager approval attached',
      'Concurrent message #5: Ready for procurement',
    ];

    const promises = commentBodies.map((body) =>
      request(app)
        .post(`/api/v1/tickets/${testTicketId}/comments`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('x-company-id', String(acmeCompanyId))
        .send({ body })
    );

    const responses = await Promise.all(promises);
    for (const r of responses) {
      expect(r.status).toBe(201);
    }

    // Verify all 5 comments are present on the ticket
    const ticketRes = await request(app)
      .get(`/api/v1/tickets/${testTicketId}`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .set('x-company-id', String(acmeCompanyId));

    expect(ticketRes.status).toBe(200);
    const comments = ticketRes.body.ticket.comments as any[];
    expect(comments.length).toBe(5);
  });

  it('3. Policy acceptance recorded per version', async () => {
    // 1. HR creates a new test policy (v1)
    const policySlug = `test-policy-${Date.now()}`;
    const createRes = await request(app)
      .post('/api/v1/policies/company')
      .set('Authorization', `Bearer ${hrToken}`)
      .set('x-company-id', String(acmeCompanyId))
      .send({
        policyType: 'HR',
        title: 'Hybrid Workplace Guidelines',
        slug: policySlug,
        body: 'Work from home is allowed up to 2 days per week.',
      });

    expect(createRes.status).toBe(201);
    testPolicyId = createRes.body.policy.id;
    expect(createRes.body.policy.version).toBe(1);

    // 2. Employee checks policies: hasAccepted must be false initially
    const list1Res = await request(app)
      .get('/api/v1/policies')
      .set('Authorization', `Bearer ${employeeToken}`)
      .set('x-company-id', String(acmeCompanyId));

    const policyBefore = list1Res.body.policies.find((p: any) => p.id === testPolicyId);
    expect(policyBefore.hasAccepted).toBe(false);

    // 3. Employee accepts v1
    const acceptRes = await request(app)
      .post(`/api/v1/policies/${testPolicyId}/accept`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .set('x-company-id', String(acmeCompanyId));

    expect(acceptRes.status).toBe(200);

    // 4. Employee checks policies: hasAccepted must be true for v1
    const list2Res = await request(app)
      .get('/api/v1/policies')
      .set('Authorization', `Bearer ${employeeToken}`)
      .set('x-company-id', String(acmeCompanyId));

    const policyAfterV1 = list2Res.body.policies.find((p: any) => p.id === testPolicyId);
    expect(policyAfterV1.hasAccepted).toBe(true);

    // 5. HR bumps version to v2
    const bumpRes = await request(app)
      .patch(`/api/v1/policies/company/${testPolicyId}`)
      .set('Authorization', `Bearer ${hrToken}`)
      .set('x-company-id', String(acmeCompanyId))
      .send({
        bumpVersion: true,
        body: 'Work from home is allowed up to 3 days per week with manager consent.',
      });

    expect(bumpRes.status).toBe(200);
    expect(bumpRes.body.policy.version).toBe(2);

    // 6. Employee checks policies again: hasAccepted must now be false for v2!
    const list3Res = await request(app)
      .get('/api/v1/policies')
      .set('Authorization', `Bearer ${employeeToken}`)
      .set('x-company-id', String(acmeCompanyId));

    const policyAfterV2 = list3Res.body.policies.find((p: any) => p.id === testPolicyId);
    expect(policyAfterV2.hasAccepted).toBe(false);

    // 7. Employee accepts v2
    const acceptV2Res = await request(app)
      .post(`/api/v1/policies/${testPolicyId}/accept`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .set('x-company-id', String(acmeCompanyId));

    expect(acceptV2Res.status).toBe(200);

    const list4Res = await request(app)
      .get('/api/v1/policies')
      .set('Authorization', `Bearer ${employeeToken}`)
      .set('x-company-id', String(acmeCompanyId));

    const policyFinal = list4Res.body.policies.find((p: any) => p.id === testPolicyId);
    expect(policyFinal.hasAccepted).toBe(true);
  });

  it('4. Appreciations / Kudos can be awarded and read on kudos wall', async () => {
    // Find manager user
    const manager = await prisma.user.findFirst({
      where: { email: 'manager@acme.com' },
    });

    const kudosRes = await request(app)
      .post('/api/v1/appreciations')
      .set('Authorization', `Bearer ${employeeToken}`)
      .set('x-company-id', String(acmeCompanyId))
      .send({
        recipientId: manager!.id,
        badge: '🚀 INNOVATION STAR',
        message: 'Great mentorship during the release sprint!',
      });

    expect(kudosRes.status).toBe(201);
    expect(kudosRes.body.success).toBe(true);

    // Public wall
    const wallRes = await request(app)
      .get('/api/v1/appreciations')
      .set('Authorization', `Bearer ${employeeToken}`)
      .set('x-company-id', String(acmeCompanyId));

    expect(wallRes.status).toBe(200);
    expect(wallRes.body.appreciations.length).toBeGreaterThanOrEqual(1);
  });

  it('5. Org structure returns department tree and reporting lines', async () => {
    const orgRes = await request(app)
      .get('/api/v1/org-structure')
      .set('Authorization', `Bearer ${employeeToken}`)
      .set('x-company-id', String(acmeCompanyId));

    expect(orgRes.status).toBe(200);
    expect(orgRes.body.departments).toBeDefined();
    expect(orgRes.body.hierarchy).toBeDefined();
    expect(orgRes.body.hierarchy.length).toBeGreaterThan(0);
  });
});
