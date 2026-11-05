import { describe, it, expect } from 'vitest';
import { executeHybridRag, PolicyDocument } from '../services/hybridRag.js';

describe('Pillar 2: True Hybrid Semantic RAG Engine Unit Tests', () => {
  const samplePolicies: PolicyDocument[] = [
    {
      id: 1,
      title: 'Leave & Absence Management Policy',
      policyType: 'LEAVE',
      version: 2,
      body: 'Employees receive 12 days Casual Leave, 10 days Sick Leave, and 15 days Earned Leave per calendar year. Half-day leaves require prior manager approval. Maternity leave entitlement is 26 weeks of paid leave for female employees for up to two surviving children. Paternity leave entitlement is 10 consecutive working days for new fathers within 6 months of childbirth or legal adoption. Bereavement leave provides 5 paid days in the event of loss of an immediate family member.',
    },
    {
      id: 2,
      title: 'Travel & Expense Reimbursement Policy',
      policyType: 'CLAIM',
      version: 1,
      body: 'Legitimate business expenses must be submitted within 30 days of expense date with valid itemized receipts for manager and finance approval. Domestic flight travel is permitted for business trips exceeding 6 hours by train. Daily per diem food allowance is capped at INR 1500 per day for tier-1 cities and INR 1000 for tier-2 cities. Local transit via Ola/Uber/cab is claimable with digital tax invoices.',
    },
    {
      id: 3,
      title: 'Code of Conduct & Workplace Ethics',
      policyType: 'HR',
      version: 1,
      body: 'All employees must maintain the highest standards of integrity, respect, and professionalism in all workplace interactions. Conflicts of interest, accepting gifts from vendors exceeding INR 2000, secondary employment (moonlighting), and bribery or kickbacks are strictly prohibited and grounds for immediate termination.',
    },
    {
      id: 4,
      title: 'Prevention of Sexual Harassment (POSH) Policy',
      policyType: 'POSH',
      version: 1,
      body: 'Zero-tolerance policy against any form of sexual harassment, unwelcome physical or verbal conduct, or discriminatory intimidation. The Internal Complaints Committee (ICC) conducts confidential and prompt inquiries in accordance with statutory guidelines. Complaints must be lodged within 3 months of the incident with the ICC Presiding Officer.',
    },
    {
      id: 5,
      title: 'Remote & Hybrid Workplace Guidelines',
      policyType: 'REMOTE_WORK',
      version: 1,
      body: 'Guidelines for asynchronous collaboration, core overlap working hours (10:00 AM - 4:00 PM IST), and team physical anchor days (Tuesdays and Thursdays in office). Full-time remote employees are eligible for a one-time home-office ergonomics reimbursement of up to INR 15000 for purchasing an ergonomic desk, standing desk converter, or office chair, plus an ongoing monthly internet and broadband allowance of INR 1000.',
    },
    {
      id: 6,
      title: 'Information Security & Data Protection Policy',
      policyType: 'IT_SECURITY',
      version: 2,
      body: 'All employees must safeguard client intellectual property, utilize hardware-backed multi-factor authentication (MFA), and adhere to SOC2 and GDPR compliance standards. Company-issued laptops must remain encrypted at all times. In case of accidental physical damage, cracked screens, or stolen assets, report immediately to IT Helpdesk within 2 hours to initiate incident response.',
    },
  ];

  it('1. Semantic match without keywords: "What if I have a baby?" -> Maternity & Parental Leave', () => {
    const res = executeHybridRag({
      query: 'What if I have a baby?',
      companyName: 'NovaTech Solutions',
      policies: samplePolicies,
    });

    expect(res).not.toBeNull();
    expect(res!.policy.id).toBe(1);
    expect(res!.policy.title).toBe('Leave & Absence Management Policy');
    expect(res!.citations).toContain('Leave & Absence Management Policy (v2)');
    expect(res!.answer.toLowerCase()).toContain('maternity');
    expect(res!.denseScore).toBeGreaterThan(0.2);
  });

  it('2. Ergonomics & Internet: "Can I buy a standing desk or claim internet bill?" -> Remote Guidelines', () => {
    const res = executeHybridRag({
      query: 'Can I buy a standing desk or claim internet bill?',
      companyName: 'NovaTech Solutions',
      policies: samplePolicies,
    });

    expect(res).not.toBeNull();
    expect(res!.policy.id).toBe(5);
    expect(res!.policy.title).toBe('Remote & Hybrid Workplace Guidelines');
    expect(res!.answer.toLowerCase()).toContain('ergonomic');
  });

  it('3. Behavioral grievance: "Someone is sending uncomfortable and inappropriate messages" -> POSH', () => {
    const res = executeHybridRag({
      query: 'Someone in my team is sending uncomfortable and inappropriate messages',
      companyName: 'NovaTech Solutions',
      policies: samplePolicies,
    });

    expect(res).not.toBeNull();
    expect(res!.policy.id).toBe(4);
    expect(res!.policy.title).toBe('Prevention of Sexual Harassment (POSH) Policy');
    expect(res!.answer.toLowerCase()).toContain('harassment');
  });

  it('4. Dual employment & gifts: "Can I take gifts from clients or do freelance moonlighting?" -> Code of Conduct', () => {
    const res = executeHybridRag({
      query: 'Can I take gifts from clients or do freelance moonlighting?',
      companyName: 'NovaTech Solutions',
      policies: samplePolicies,
    });

    expect(res).not.toBeNull();
    expect(res!.policy.id).toBe(3);
    expect(res!.policy.title).toBe('Code of Conduct & Workplace Ethics');
    expect(res!.answer.toLowerCase()).toContain('moonlighting');
  });

  it('5. IT asset damage: "My laptop screen shattered when I dropped my backpack" -> InfoSec', () => {
    const res = executeHybridRag({
      query: 'My laptop screen shattered when I dropped my backpack',
      companyName: 'NovaTech Solutions',
      policies: samplePolicies,
    });

    expect(res).not.toBeNull();
    expect(res!.policy.id).toBe(6);
    expect(res!.policy.title).toBe('Information Security & Data Protection Policy');
    expect(res!.answer.toLowerCase()).toContain('helpdesk');
  });

  it('6. Strict Hallucination prevention: Unrelated question returns null', () => {
    const res = executeHybridRag({
      query: 'What is our corporate policy regarding pet hamsters and zoo animals in cafeteria?',
      companyName: 'NovaTech Solutions',
      policies: samplePolicies,
    });

    expect(res).toBeNull();
  });
});

