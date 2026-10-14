import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import prisma from '../lib/prisma.js';

describe('Milestone 8: AI Assistant Acceptance Tests', () => {
  let employeeToken: string;
  let acmeCompanyId: number;

  beforeAll(async () => {
    const acme = await prisma.company.findUnique({ where: { code: 'ACME' } });
    if (!acme) throw new Error('ACME company not found');
    acmeCompanyId = acme.id;

    const empLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ login: 'employee@acme.com', password: 'Employee@123' });

    expect(empLogin.status).toBe(200);
    employeeToken = empLogin.body.token;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('1. AI Assistant answers policy queries grounded in corporate policy text', async () => {
    const res = await request(app)
      .post('/api/v1/assistant/chat')
      .set('Authorization', `Bearer ${employeeToken}`)
      .set('x-company-id', String(acmeCompanyId))
      .send({ message: 'What is the policy for expense claims and receipts?' });

    expect(res.status).toBe(200);
    expect(res.body.reply).toBeDefined();
    expect(res.body.reply.toLowerCase()).toContain('receipt');
    expect(res.body.citations).toContain('Travel & Expense Reimbursement Policy');
  });

  it('2. AI Assistant answers leave and balance queries with user-specific context', async () => {
    const res = await request(app)
      .post('/api/v1/assistant/chat')
      .set('Authorization', `Bearer ${employeeToken}`)
      .set('x-company-id', String(acmeCompanyId))
      .send({ message: 'What are my leave balances and rules for half day leaves?' });

    expect(res.status).toBe(200);
    expect(res.body.reply).toBeDefined();
    expect(res.body.reply.toLowerCase()).toContain('balance');
    expect(res.body.citations).toContain('Leave & Absence Management Policy');
  });
});
