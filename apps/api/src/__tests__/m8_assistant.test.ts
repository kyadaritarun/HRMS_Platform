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

  it('3. AI Agent drafts Autonomous Leave Action Card without external API key', async () => {
    const res = await request(app)
      .post('/api/v1/assistant/chat')
      .set('Authorization', `Bearer ${employeeToken}`)
      .set('x-company-id', String(acmeCompanyId))
      .send({ message: 'Apply sick leave for tomorrow due to fever' });

    expect(res.status).toBe(200);
    expect(res.body.action).toBeDefined();
    expect(res.body.action.tool).toBe('apply_leave');
    expect(res.body.action.status).toBe('PROPOSED');
    expect(res.body.action.payload.reason).toContain('fever');
    expect(res.body.action.payload.leaveTypeId).toBeDefined();
  });

  it('4. AI Agent executes confirmed tool via POST /assistant/execute-tool', async () => {
    // 1. Prepare proposed action
    const chatRes = await request(app)
      .post('/api/v1/assistant/chat')
      .set('Authorization', `Bearer ${employeeToken}`)
      .set('x-company-id', String(acmeCompanyId))
      .send({ message: 'Raise an IT ticket for broken mouse' });

    expect(chatRes.status).toBe(200);
    expect(chatRes.body.action).toBeDefined();
    expect(chatRes.body.action.tool).toBe('create_ticket');

    // 2. Execute tool
    const execRes = await request(app)
      .post('/api/v1/assistant/execute-tool')
      .set('Authorization', `Bearer ${employeeToken}`)
      .set('x-company-id', String(acmeCompanyId))
      .send({
        tool: chatRes.body.action.tool,
        payload: chatRes.body.action.payload,
      });

    expect(execRes.status).toBe(200);
    expect(execRes.body.success).toBe(true);
    expect(execRes.body.data.code).toMatch(/^TCK-/);
    expect(execRes.body.data.category).toBe('IT');
  });

  it('5. Correctly parses single calendar date and reason: "Apply sick leave for 14-nov due to fever"', async () => {
    const res = await request(app)
      .post('/api/v1/assistant/chat')
      .set('Authorization', `Bearer ${employeeToken}`)
      .set('x-company-id', String(acmeCompanyId))
      .send({ message: 'Apply sick leave for 14-nov due to fever' });

    expect(res.status).toBe(200);
    expect(res.body.action).toBeDefined();
    expect(res.body.action.tool).toBe('apply_leave');
    expect(res.body.action.payload.startDate).toMatch(/-11-14$/);
    expect(res.body.action.payload.endDate).toMatch(/-11-14$/);
    expect(res.body.action.payload.days).toBe(1);
    expect(res.body.action.payload.reason).toBe('Fever');
  });

  it('6. Correctly parses date range and typo reason: "apply leave from 10-nov to 12-nov from traving"', async () => {
    const res = await request(app)
      .post('/api/v1/assistant/chat')
      .set('Authorization', `Bearer ${employeeToken}`)
      .set('x-company-id', String(acmeCompanyId))
      .send({ message: 'apply leave from 10-nov to 12-nov from traving' });

    expect(res.status).toBe(200);
    expect(res.body.action).toBeDefined();
    expect(res.body.action.tool).toBe('apply_leave');
    expect(res.body.action.payload.startDate).toMatch(/-11-10$/);
    expect(res.body.action.payload.endDate).toMatch(/-11-12$/);
    expect(res.body.action.payload.days).toBe(3);
    expect(res.body.action.payload.reason).toBe('Traveling');
  });
});
