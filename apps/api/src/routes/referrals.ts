import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { sendEmail } from '../lib/mailer.js';
import { authMiddleware } from '../middlewares/auth.js';
import { tenantMatchMiddleware } from '../middlewares/tenantMatch.js';
import { policyComplianceMiddleware } from '../middlewares/policyCompliance.js';
import { roleGuard } from '../middlewares/roleGuard.js';
import { AppError } from '../middlewares/errorHandler.js';

export const referralsRouter = Router();

// Apply security middlewares
referralsRouter.use(authMiddleware, tenantMatchMiddleware, policyComplianceMiddleware);

let tablesEnsured = false;

async function runDdl(sql: string) {
  try {
    await prisma.$executeRawUnsafe(sql);
  } catch (err: any) {
    // Non-critical DDL errors (e.g. index/column already exists) are ignored
  }
}

async function ensureTables() {
  if (tablesEnsured) return;

  const schema = process.env.DB_SCHEMA || 'HRMS_test';

  // 1. Ensure schema exists & set search_path
  await runDdl(`CREATE SCHEMA IF NOT EXISTS "${schema}";`);
  await runDdl(`SET search_path TO "${schema}", public;`);

  // 2. DDL templates
  const createLeadTable = (tbl: string) => `
    CREATE TABLE IF NOT EXISTS ${tbl} (
      "id" SERIAL PRIMARY KEY,
      "companyId" INTEGER NOT NULL,
      "userId" INTEGER NOT NULL,
      "candidateName" TEXT,
      "jobRole" TEXT,
      "jobId" TEXT,
      "resumeUrl" TEXT,
      "businessName" TEXT,
      "ownerName" TEXT,
      "mobileNumber" TEXT NOT NULL,
      "email" TEXT NOT NULL,
      "city" TEXT,
      "zipCode" TEXT,
      "address" TEXT,
      "status" TEXT NOT NULL DEFAULT 'NEW_LEAD',
      "rewardAmount" DECIMAL(10,2) NOT NULL DEFAULT 3000.00,
      "rewardStatus" TEXT NOT NULL DEFAULT 'PENDING',
      "notes" TEXT,
      "hrFeedback" TEXT,
      "hrFeedbackBy" TEXT,
      "hrFeedbackAt" TIMESTAMP(3),
      "convertedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createWithdrawalTable = (tbl: string) => `
    CREATE TABLE IF NOT EXISTS ${tbl} (
      "id" SERIAL PRIMARY KEY,
      "companyId" INTEGER NOT NULL,
      "userId" INTEGER NOT NULL,
      "amount" DECIMAL(10,2) NOT NULL,
      "bankName" TEXT NOT NULL,
      "accountNumber" TEXT NOT NULL,
      "ifscCode" TEXT NOT NULL,
      "accountHolder" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'REQUESTED',
      "remarks" TEXT,
      "processedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `;

  // Create across target schemas so queries never fail regardless of search_path
  const tableTargets = [
    { lead: `"${schema}"."LeadReferral"`, withdrawal: `"${schema}"."ReferralWithdrawal"` },
    { lead: `"LeadReferral"`, withdrawal: `"ReferralWithdrawal"` },
    { lead: `"public"."LeadReferral"`, withdrawal: `"public"."ReferralWithdrawal"` },
  ];

  for (const target of tableTargets) {
    await runDdl(createLeadTable(target.lead));
    await runDdl(createWithdrawalTable(target.withdrawal));

    // Ensure candidate referral columns and nullable constraints
    await runDdl(`ALTER TABLE ${target.lead} ADD COLUMN IF NOT EXISTS "candidateName" TEXT;`);
    await runDdl(`ALTER TABLE ${target.lead} ADD COLUMN IF NOT EXISTS "jobRole" TEXT;`);
    await runDdl(`ALTER TABLE ${target.lead} ADD COLUMN IF NOT EXISTS "jobId" TEXT;`);
    await runDdl(`ALTER TABLE ${target.lead} ADD COLUMN IF NOT EXISTS "resumeUrl" TEXT;`);
    await runDdl(`ALTER TABLE ${target.lead} ADD COLUMN IF NOT EXISTS "hrFeedback" TEXT;`);
    await runDdl(`ALTER TABLE ${target.lead} ADD COLUMN IF NOT EXISTS "hrFeedbackBy" TEXT;`);
    await runDdl(`ALTER TABLE ${target.lead} ADD COLUMN IF NOT EXISTS "hrFeedbackAt" TIMESTAMP(3);`);
    await runDdl(`ALTER TABLE ${target.lead} ALTER COLUMN "businessName" DROP NOT NULL;`);
    await runDdl(`ALTER TABLE ${target.lead} ALTER COLUMN "ownerName" DROP NOT NULL;`);
    await runDdl(`ALTER TABLE ${target.lead} ALTER COLUMN "city" DROP NOT NULL;`);
  }

  // Indices
  await runDdl(`CREATE INDEX IF NOT EXISTS "LeadReferral_companyId_userId_idx" ON "LeadReferral"("companyId", "userId");`);
  await runDdl(`CREATE INDEX IF NOT EXISTS "LeadReferral_status_idx" ON "LeadReferral"("status");`);
  await runDdl(`CREATE INDEX IF NOT EXISTS "ReferralWithdrawal_companyId_userId_idx" ON "ReferralWithdrawal"("companyId", "userId");`);
  await runDdl(`CREATE INDEX IF NOT EXISTS "ReferralWithdrawal_status_idx" ON "ReferralWithdrawal"("status");`);

  tablesEnsured = true;
}

async function queryWithFallback<T = any[]>(
  tableBase: 'LeadReferral' | 'ReferralWithdrawal',
  sqlBuilder: (tblName: string) => string,
  params: any[] = []
): Promise<T> {
  await ensureTables();
  const schema = process.env.DB_SCHEMA || 'HRMS_test';
  const variants = [
    `"${schema}"."${tableBase}"`,
    `"${tableBase}"`,
    `"public"."${tableBase}"`,
  ];

  let lastErr: any = null;
  for (const variant of variants) {
    try {
      const sql = sqlBuilder(variant);
      return (await prisma.$queryRawUnsafe<any>(sql, ...params)) as T;
    } catch (err: any) {
      lastErr = err;
      if (err?.code === '42P01' || err?.message?.includes('does not exist')) {
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

// ----------------------------------------------------------------------------
// 1. GET /api/v1/referrals/my
// Get current user's leads, wallet stats, and withdrawal history
// Accessible by: EMPLOYEE, MANAGER, HR, COMPANY_ADMIN
// ----------------------------------------------------------------------------
referralsRouter.get('/my', async (req, res, next) => {
  try {
    await ensureTables();
    const companyId = req.user!.companyId!;
    const userId = req.user!.id!;

    let referrals: any[] = [];
    let withdrawals: any[] = [];

    try {
      referrals = await queryWithFallback<any[]>(
        'LeadReferral',
        (tbl) => `SELECT * FROM ${tbl} WHERE "companyId" = $1 AND "userId" = $2 ORDER BY "createdAt" DESC`,
        [companyId, userId]
      );
    } catch (err) {
      console.warn('Failed to load my referrals:', err);
    }

    try {
      withdrawals = await queryWithFallback<any[]>(
        'ReferralWithdrawal',
        (tbl) => `SELECT * FROM ${tbl} WHERE "companyId" = $1 AND "userId" = $2 ORDER BY "createdAt" DESC`,
        [companyId, userId]
      );
    } catch (err) {
      console.warn('Failed to load my withdrawals:', err);
    }

    // Calculate Wallet and Stats
    let totalEarned = 0;
    let pendingReward = 0;
    let successfulCount = 0;

    referrals.forEach((ref) => {
      const reward = Number(ref.rewardAmount || 3000);
      if (ref.status === 'CONVERTED' || ref.rewardStatus === 'CREDITED') {
        totalEarned += reward;
        successfulCount++;
      } else if (ref.status !== 'REJECTED') {
        pendingReward += reward;
      }
    });

    let totalWithdrawn = 0;
    let pendingWithdrawals = 0;
    withdrawals.forEach((w) => {
      const amount = Number(w.amount || 0);
      if (w.status === 'PROCESSED') {
        totalWithdrawn += amount;
      } else if (w.status === 'REQUESTED') {
        pendingWithdrawals += amount;
      }
    });

    const balance = Math.max(0, totalEarned - totalWithdrawn - pendingWithdrawals);

    // Build unified wallet history ledger
    const walletHistory = [
      ...referrals
        .filter((r) => r.status === 'CONVERTED' || r.rewardStatus === 'CREDITED')
        .map((r) => ({
          id: `ref-${r.id}`,
          date: r.convertedAt || r.updatedAt || r.createdAt,
          type: 'CREDIT',
          title: `Referral Reward: ${r.businessName}`,
          description: `Successful conversion for ${r.ownerName}`,
          amount: Number(r.rewardAmount || 3000),
          status: 'SUCCESS',
        })),
      ...withdrawals.map((w) => ({
        id: `wd-${w.id}`,
        date: w.createdAt,
        type: 'DEBIT',
        title: `Withdrawal to ${w.bankName}`,
        description: `A/C: ••••${String(w.accountNumber).slice(-4)} (${w.ifscCode})`,
        amount: Number(w.amount),
        status: w.status,
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return res.json({
      success: true,
      stats: {
        totalReferrals: referrals.length,
        successful: successfulCount,
        totalEarned,
        balance,
        pendingReward,
      },
      referrals: referrals.map((r) => ({
        id: r.id,
        candidateName: r.candidateName || r.ownerName,
        jobRole: r.jobRole || r.businessName,
        jobId: r.jobId || 'JOB-REF',
        resumeUrl: r.resumeUrl || null,
        hrFeedback: r.hrFeedback || null,
        hrFeedbackBy: r.hrFeedbackBy || null,
        hrFeedbackAt: r.hrFeedbackAt || null,
        businessName: r.businessName || r.jobRole,
        ownerName: r.ownerName || r.candidateName,
        mobileNumber: r.mobileNumber,
        email: r.email,
        city: r.city,
        zipCode: r.zipCode,
        address: r.address,
        status: r.status,
        rewardAmount: Number(r.rewardAmount || 3000),
        rewardStatus: r.rewardStatus,
        notes: r.notes,
        createdAt: r.createdAt,
        convertedAt: r.convertedAt,
      })),
      withdrawals: withdrawals.map((w) => ({
        id: w.id,
        amount: Number(w.amount),
        bankName: w.bankName,
        accountNumber: w.accountNumber,
        ifscCode: w.ifscCode,
        accountHolder: w.accountHolder,
        status: w.status,
        remarks: w.remarks,
        processedAt: w.processedAt,
        createdAt: w.createdAt,
      })),
      walletHistory,
    });
  } catch (error) {
    next(error);
  }
});

// ----------------------------------------------------------------------------
// 2. POST /api/v1/referrals
// Submit a new candidate referral
// Accessible by: EMPLOYEE, MANAGER, HR, COMPANY_ADMIN
// ----------------------------------------------------------------------------
referralsRouter.post('/', async (req, res, next) => {
  try {
    await ensureTables();
    const companyId = req.user!.companyId!;
    const userId = req.user!.id!;

    const {
      candidateName,
      ownerName, // fallback
      jobRole,
      businessName, // fallback
      jobId,
      mobileNumber,
      email,
      resumeUrl,
      notes,
      city,
      zipCode,
      address,
      companySize,
      designation,
    } = req.body;

    const effCandidateName = (candidateName || ownerName || '').trim();
    const effJobRole = (jobRole || businessName || designation || '').trim();
    const effJobId = (jobId || 'JOB-REF').trim();
    const effResumeUrl = (resumeUrl || '').trim();

    if (!effCandidateName) {
      throw new AppError(400, 'BAD_REQUEST', 'Candidate / Employee name is required');
    }
    if (!effJobRole) {
      throw new AppError(400, 'BAD_REQUEST', 'Job role / position is required');
    }
    if (!mobileNumber?.trim()) {
      throw new AppError(400, 'BAD_REQUEST', 'Mobile / WhatsApp number is required');
    }
    if (!email?.trim()) {
      throw new AppError(400, 'BAD_REQUEST', 'Working email address is required');
    }

    const cleanMobile = mobileNumber.trim().replace(/^\+91\s*/, '');
    const cleanEmail = email.trim().toLowerCase();
    const effectiveCity = city?.trim() || 'Pan-India';

    const notesParts: string[] = [];
    if (effJobId && effJobId !== 'JOB-REF') notesParts.push(`Job ID: ${effJobId}`);
    if (effResumeUrl) notesParts.push(`Resume: ${effResumeUrl}`);
    if (companySize?.trim()) notesParts.push(`Team Size: ${companySize.trim()}`);
    if (notes?.trim()) notesParts.push(notes.trim());
    const combinedNotes = notesParts.length > 0 ? notesParts.join(' • ') : null;

    let newLead: any;
    try {
      const rows = await queryWithFallback<any[]>(
        'LeadReferral',
        (tbl) => `INSERT INTO ${tbl} 
         ("companyId", "userId", "candidateName", "jobRole", "jobId", "resumeUrl", "businessName", "ownerName", "mobileNumber", "email", "city", "zipCode", "address", "notes", "status", "rewardAmount", "rewardStatus", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'NEW_LEAD', 3000.00, 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING *`,
        [
          companyId,
          userId,
          effCandidateName,
          effJobRole,
          effJobId,
          effResumeUrl || null,
          effJobRole,
          effCandidateName,
          cleanMobile,
          cleanEmail,
          effectiveCity,
          zipCode ? String(zipCode).trim() : null,
          address ? String(address).trim() : null,
          combinedNotes,
        ]
      );
      newLead = rows[0];
    } catch {
      const rows = await queryWithFallback<any[]>(
        'LeadReferral',
        (tbl) => `INSERT INTO ${tbl} 
         ("companyId", "userId", "businessName", "ownerName", "mobileNumber", "email", "city", "zipCode", "address", "notes", "status", "rewardAmount", "rewardStatus", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'NEW_LEAD', 3000.00, 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING *`,
        [
          companyId,
          userId,
          effJobRole,
          effCandidateName,
          cleanMobile,
          cleanEmail,
          effectiveCity,
          zipCode ? String(zipCode).trim() : null,
          address ? String(address).trim() : null,
          combinedNotes,
        ]
      );
      newLead = rows[0];
    }

    // Non-blocking Email Notifications
    try {
      const referrer = await prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true, email: true },
      });
      const referrerName = `${referrer?.firstName || ''} ${referrer?.lastName || ''}`.trim() || 'An Employee';

      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { name: true },
      });
      const companyName = company?.name || 'Company';

      // 1. Email HR / Admins
      const hrUsers = await prisma.user.findMany({
        where: {
          companyId,
          role: { in: ['HR', 'COMPANY_ADMIN'] },
          isActive: true,
        },
        select: { email: true },
      });
      const hrEmails = hrUsers.map((u) => u.email).filter(Boolean);

      for (const hrEmail of hrEmails) {
        await sendEmail({
          companyId,
          to: hrEmail,
          subject: `[New Referral] ${referrerName} referred ${effCandidateName} for ${effJobRole}`,
          html: `
            <div style="font-family: Arial, sans-serif; color: #1e293b; max-width: 600px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
              <h2 style="color: #4338ca; margin-top: 0;">New Employee Candidate Referral</h2>
              <p><strong>${referrerName}</strong> (${referrer?.email}) has submitted a candidate referral for the <strong>${effJobRole}</strong> role (Job ID: <strong>${effJobId}</strong>).</p>
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
                <p style="margin: 4px 0;"><strong>Candidate Name:</strong> ${effCandidateName}</p>
                <p style="margin: 4px 0;"><strong>Job Role:</strong> ${effJobRole}</p>
                <p style="margin: 4px 0;"><strong>Job ID:</strong> ${effJobId}</p>
                <p style="margin: 4px 0;"><strong>Working Email:</strong> ${cleanEmail}</p>
                <p style="margin: 4px 0;"><strong>Contact Number:</strong> +91 ${cleanMobile}</p>
                ${effResumeUrl ? `<p style="margin: 4px 0;"><strong>Resume:</strong> <a href="${effResumeUrl}" target="_blank" style="color: #4338ca; font-weight: bold;">View Resume</a></p>` : ''}
                ${notes ? `<p style="margin: 4px 0;"><strong>Referral Note:</strong> ${notes}</p>` : ''}
              </div>
              <p style="color: #64748b; font-size: 13px;">Review candidate details in your HRMS Referrals dashboard.</p>
            </div>
          `,
        }).catch((e) => console.error('Failed to email HR:', e));
      }

      // 2. Email the referred candidate
      await sendEmail({
        companyId,
        to: cleanEmail,
        subject: `You've been referred for ${effJobRole} at ${companyName}!`,
        html: `
          <div style="font-family: Arial, sans-serif; color: #1e293b; max-width: 600px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <h2 style="color: #4338ca; margin-top: 0;">You've Been Referred!</h2>
            <p>Hi <strong>${effCandidateName}</strong>,</p>
            <p><strong>${referrerName}</strong> has referred you for the <strong>${effJobRole}</strong> position (Job ID: <strong>${effJobId}</strong>) at <strong>${companyName}</strong>.</p>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
              <p style="margin: 4px 0;"><strong>Position:</strong> ${effJobRole}</p>
              <p style="margin: 4px 0;"><strong>Requisition ID:</strong> ${effJobId}</p>
              <p style="margin: 4px 0;"><strong>Referred By:</strong> ${referrerName}</p>
            </div>
            <p>Our recruitment team has received your profile and will contact you directly if there is a match.</p>
            <p style="margin-top: 24px; color: #64748b; font-size: 13px;">Best regards,<br/><strong>Talent Acquisition Team</strong><br/>${companyName}</p>
          </div>
        `,
      }).catch((e) => console.error('Failed to email candidate:', e));
    } catch (emailErr) {
      console.error('Email dispatch error (non-blocking):', emailErr);
    }

    return res.status(201).json({
      success: true,
      message: 'Candidate referral submitted successfully! HR and candidate have been notified via email.',
      lead: newLead,
    });
  } catch (error) {
    next(error);
  }
});

// ----------------------------------------------------------------------------
// 3. POST /api/v1/referrals/withdraw
// Request wallet withdrawal to bank account
// ----------------------------------------------------------------------------
referralsRouter.post('/withdraw', async (req, res, next) => {
  try {
    await ensureTables();
    const companyId = req.user!.companyId!;
    const userId = req.user!.id!;

    const { amount, bankName, accountNumber, ifscCode, accountHolder } = req.body;

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      throw new AppError(400, 'BAD_REQUEST', 'Valid withdrawal amount is required');
    }
    if (!bankName?.trim()) {
      throw new AppError(400, 'BAD_REQUEST', 'Bank name is required');
    }
    if (!accountNumber?.trim()) {
      throw new AppError(400, 'BAD_REQUEST', 'Bank account number is required');
    }
    if (!ifscCode?.trim()) {
      throw new AppError(400, 'BAD_REQUEST', 'Bank IFSC code is required');
    }
    if (!accountHolder?.trim()) {
      throw new AppError(400, 'BAD_REQUEST', 'Account holder name is required');
    }

    // Verify user has sufficient balance
    const myLeads = await queryWithFallback<any[]>(
      'LeadReferral',
      (tbl) => `SELECT * FROM ${tbl} WHERE "companyId" = $1 AND "userId" = $2`,
      [companyId, userId]
    );
    const myWithdrawals = await queryWithFallback<any[]>(
      'ReferralWithdrawal',
      (tbl) => `SELECT * FROM ${tbl} WHERE "companyId" = $1 AND "userId" = $2`,
      [companyId, userId]
    );

    let totalEarned = 0;
    myLeads.forEach((r) => {
      if (r.status === 'CONVERTED' || r.rewardStatus === 'CREDITED') {
        totalEarned += Number(r.rewardAmount || 3000);
      }
    });

    let debited = 0;
    myWithdrawals.forEach((w) => {
      if (w.status === 'PROCESSED' || w.status === 'REQUESTED') {
        debited += Number(w.amount || 0);
      }
    });

    const availableBalance = Math.max(0, totalEarned - debited);
    if (numAmount > availableBalance) {
      throw new AppError(400, 'INSUFFICIENT_FUNDS', `Insufficient wallet balance. Available balance: ₹ ${availableBalance.toLocaleString('en-IN')}`);
    }

    const rows = await queryWithFallback<any[]>(
      'ReferralWithdrawal',
      (tbl) => `INSERT INTO ${tbl}
       ("companyId", "userId", "amount", "bankName", "accountNumber", "ifscCode", "accountHolder", "status", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'REQUESTED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [
        companyId,
        userId,
        numAmount,
        bankName.trim(),
        accountNumber.trim(),
        ifscCode.trim().toUpperCase(),
        accountHolder.trim(),
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Withdrawal request submitted! It will be reviewed and transferred to your bank account.',
      withdrawal: rows[0],
    });
  } catch (error) {
    next(error);
  }
});

// ----------------------------------------------------------------------------
// 4. GET /api/v1/referrals/company
// View all company referrals (for HR / Company Admin)
// ----------------------------------------------------------------------------
referralsRouter.get('/company', roleGuard('COMPANY_ADMIN', 'HR'), async (req, res, next) => {
  try {
    await ensureTables();
    const companyId = req.user!.companyId!;

    const leads = await queryWithFallback<any[]>(
      'LeadReferral',
      (tbl) => `SELECT lr.*, u."firstName", u."lastName", u."email" as "referrerEmail", u."role" as "referrerRole"
       FROM ${tbl} lr
       JOIN "User" u ON lr."userId" = u."id"
       WHERE lr."companyId" = $1
       ORDER BY lr."createdAt" DESC`,
      [companyId]
    );

    return res.json({
      success: true,
      leads: leads.map((l) => ({
        ...l,
        candidateName: l.candidateName || l.ownerName,
        jobRole: l.jobRole || l.businessName,
        jobId: l.jobId || 'N/A',
        resumeUrl: l.resumeUrl || null,
        rewardAmount: Number(l.rewardAmount || 3000),
        referrerName: `${l.firstName || ''} ${l.lastName || ''}`.trim() || 'Employee',
        referrerEmail: l.referrerEmail,
        referrerRole: l.referrerRole,
      })),
    });
  } catch (error) {
    next(error);
  }
});

// ----------------------------------------------------------------------------
// 5. PATCH /api/v1/referrals/:id/status (also supports HR feedback)
// Update referral lead status and/or HR feedback (for HR / Company Admin)
// ----------------------------------------------------------------------------
referralsRouter.patch('/:id/status', roleGuard('COMPANY_ADMIN', 'HR'), async (req, res, next) => {
  try {
    await ensureTables();
    const companyId = req.user!.companyId!;
    const referralId = parseInt(req.params.id, 10);
    const { status, notes, hrFeedback } = req.body;

    const validStatuses = [
      'NEW_LEAD',
      'CONTACTED',
      'DEMO_SCHEDULED',
      'CONVERTED',
      'REJECTED',
      'REFERRED',
      'SCREENING',
      'INTERVIEWING',
      'OFFERED',
      'HIRED',
    ];

    if (status && !validStatuses.includes(status)) {
      throw new AppError(400, 'BAD_REQUEST', `Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    const rewardStatus = (status === 'CONVERTED' || status === 'HIRED') ? 'CREDITED' : status === 'REJECTED' ? 'VOID' : 'PENDING';
    const convertedAt = (status === 'CONVERTED' || status === 'HIRED') ? new Date() : null;
    const hrName = `${req.user!.firstName || ''} ${req.user!.lastName || ''}`.trim() || 'HR Team';

    const rows = await queryWithFallback<any[]>(
      'LeadReferral',
      (tbl) => `UPDATE ${tbl}
       SET "status" = COALESCE($1, "status"), 
           "rewardStatus" = CASE WHEN $1 IS NOT NULL THEN $2 ELSE "rewardStatus" END, 
           "hrFeedback" = COALESCE($3, "hrFeedback"),
           "hrFeedbackBy" = CASE WHEN $3 IS NOT NULL THEN $4 ELSE "hrFeedbackBy" END,
           "hrFeedbackAt" = CASE WHEN $3 IS NOT NULL THEN CURRENT_TIMESTAMP ELSE "hrFeedbackAt" END,
           "notes" = COALESCE($5, "notes"), 
           "convertedAt" = COALESCE($6, "convertedAt"), 
           "updatedAt" = CURRENT_TIMESTAMP
       WHERE "id" = $7 AND "companyId" = $8
       RETURNING *`,
      [status || null, rewardStatus, hrFeedback !== undefined ? hrFeedback : null, hrName, notes || null, convertedAt, referralId, companyId]
    );

    if (!rows.length) {
      throw new AppError(404, 'NOT_FOUND', 'Referral not found');
    }

    const updatedReferral = rows[0];

    // Non-blocking Email Notification to referring employee when feedback or status is updated
    if (updatedReferral.userId && (hrFeedback || status)) {
      (async () => {
        try {
          const referrer = await prisma.user.findUnique({
            where: { id: updatedReferral.userId },
            select: { email: true, firstName: true },
          });

          if (referrer?.email) {
            const candidateName = updatedReferral.candidateName || updatedReferral.ownerName || 'Candidate';
            const role = updatedReferral.jobRole || updatedReferral.businessName || 'Position';
            await sendEmail({
              companyId,
              to: referrer.email,
              subject: `[Referral Update] HR Review & Feedback for ${candidateName}`,
              html: `
                <div style="font-family: Arial, sans-serif; color: #1e293b; max-width: 600px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
                  <h2 style="color: #4338ca; margin-top: 0;">Update on Your Candidate Referral</h2>
                  <p>Hi ${referrer.firstName || 'there'},</p>
                  <p>HR has reviewed your referral for <strong>${candidateName}</strong> (${role}).</p>
                  <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
                    <p style="margin: 4px 0;"><strong>Status:</strong> ${updatedReferral.status}</p>
                    ${updatedReferral.hrFeedback ? `<p style="margin: 8px 0 4px 0;"><strong>HR Feedback:</strong></p><p style="margin: 4px 0; background: #ffffff; padding: 10px; border-left: 3px solid #4338ca; border-radius: 4px;">${updatedReferral.hrFeedback}</p>` : ''}
                  </div>
                  <p style="color: #64748b; font-size: 13px;">You can view details anytime under your Candidate Referrals tab.</p>
                </div>
              `,
            });
          }
        } catch (emailErr) {
          console.error('Failed to notify referring employee:', emailErr);
        }
      })();
    }

    return res.json({
      success: true,
      message: 'Referral updated successfully',
      lead: updatedReferral,
    });
  } catch (error) {
    next(error);
  }
});

export default referralsRouter;

