import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authMiddleware } from '../middlewares/auth.js';
import { tenantMatchMiddleware } from '../middlewares/tenantMatch.js';
import { policyComplianceMiddleware } from '../middlewares/policyCompliance.js';
import { roleGuard } from '../middlewares/roleGuard.js';
import { AppError } from '../middlewares/errorHandler.js';

export const referralsRouter = Router();

// Apply security middlewares
referralsRouter.use(authMiddleware, tenantMatchMiddleware, policyComplianceMiddleware);

let tablesEnsured = false;
async function ensureTables() {
  if (tablesEnsured) return;
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "LeadReferral" (
        "id" SERIAL PRIMARY KEY,
        "companyId" INTEGER NOT NULL,
        "userId" INTEGER NOT NULL,
        "businessName" TEXT NOT NULL,
        "ownerName" TEXT NOT NULL,
        "mobileNumber" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "city" TEXT NOT NULL,
        "zipCode" TEXT,
        "address" TEXT,
        "status" TEXT NOT NULL DEFAULT 'NEW_LEAD',
        "rewardAmount" DECIMAL(10,2) NOT NULL DEFAULT 3000.00,
        "rewardStatus" TEXT NOT NULL DEFAULT 'PENDING',
        "notes" TEXT,
        "convertedAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS "LeadReferral_companyId_userId_idx" ON "LeadReferral"("companyId", "userId");
      CREATE INDEX IF NOT EXISTS "LeadReferral_status_idx" ON "LeadReferral"("status");

      CREATE TABLE IF NOT EXISTS "ReferralWithdrawal" (
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
      CREATE INDEX IF NOT EXISTS "ReferralWithdrawal_companyId_userId_idx" ON "ReferralWithdrawal"("companyId", "userId");
      CREATE INDEX IF NOT EXISTS "ReferralWithdrawal_status_idx" ON "ReferralWithdrawal"("status");
    `);
    tablesEnsured = true;
  } catch (err) {
    console.error('Failed to ensure LeadReferral tables in DB:', err);
  }
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
      if ((prisma as any).leadReferral) {
        referrals = await (prisma as any).leadReferral.findMany({
          where: { companyId, userId },
          orderBy: { createdAt: 'desc' },
        });
      } else {
        referrals = await prisma.$queryRawUnsafe<any[]>(
          `SELECT * FROM "LeadReferral" WHERE "companyId" = $1 AND "userId" = $2 ORDER BY "createdAt" DESC`,
          companyId,
          userId
        );
      }
    } catch {
      referrals = await prisma.$queryRawUnsafe<any[]>(
        `SELECT * FROM "LeadReferral" WHERE "companyId" = $1 AND "userId" = $2 ORDER BY "createdAt" DESC`,
        companyId,
        userId
      );
    }

    try {
      if ((prisma as any).referralWithdrawal) {
        withdrawals = await (prisma as any).referralWithdrawal.findMany({
          where: { companyId, userId },
          orderBy: { createdAt: 'desc' },
        });
      } else {
        withdrawals = await prisma.$queryRawUnsafe<any[]>(
          `SELECT * FROM "ReferralWithdrawal" WHERE "companyId" = $1 AND "userId" = $2 ORDER BY "createdAt" DESC`,
          companyId,
          userId
        );
      }
    } catch {
      withdrawals = await prisma.$queryRawUnsafe<any[]>(
        `SELECT * FROM "ReferralWithdrawal" WHERE "companyId" = $1 AND "userId" = $2 ORDER BY "createdAt" DESC`,
        companyId,
        userId
      );
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
        businessName: r.businessName,
        ownerName: r.ownerName,
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
// Submit a new lead referral
// Accessible by: EMPLOYEE, MANAGER, HR, COMPANY_ADMIN
// ----------------------------------------------------------------------------
referralsRouter.post('/', async (req, res, next) => {
  try {
    await ensureTables();
    const companyId = req.user!.companyId!;
    const userId = req.user!.id!;

    const {
      businessName,
      ownerName,
      mobileNumber,
      email,
      city,
      zipCode,
      address,
    } = req.body;

    if (!businessName?.trim()) {
      throw new AppError(400, 'BAD_REQUEST', 'Business name is required');
    }
    if (!ownerName?.trim()) {
      throw new AppError(400, 'BAD_REQUEST', 'Owner name is required');
    }
    if (!mobileNumber?.trim()) {
      throw new AppError(400, 'BAD_REQUEST', 'Mobile number is required');
    }
    if (!email?.trim()) {
      throw new AppError(400, 'BAD_REQUEST', 'Email address is required');
    }
    if (!city?.trim()) {
      throw new AppError(400, 'BAD_REQUEST', 'City is required');
    }

    const cleanMobile = mobileNumber.trim().replace(/^\+91\s*/, '');
    const cleanEmail = email.trim().toLowerCase();

    let newLead: any;
    try {
      if ((prisma as any).leadReferral) {
        newLead = await (prisma as any).leadReferral.create({
          data: {
            companyId,
            userId,
            businessName: businessName.trim(),
            ownerName: ownerName.trim(),
            mobileNumber: cleanMobile,
            email: cleanEmail,
            city: city.trim(),
            zipCode: zipCode ? String(zipCode).trim() : null,
            address: address ? String(address).trim() : null,
            status: 'NEW_LEAD',
            rewardAmount: 3000.00,
            rewardStatus: 'PENDING',
          },
        });
      } else {
        const rows = await prisma.$queryRawUnsafe<any[]>(
          `INSERT INTO "LeadReferral" 
           ("companyId", "userId", "businessName", "ownerName", "mobileNumber", "email", "city", "zipCode", "address", "status", "rewardAmount", "rewardStatus", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'NEW_LEAD', 3000.00, 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
           RETURNING *`,
          companyId,
          userId,
          businessName.trim(),
          ownerName.trim(),
          cleanMobile,
          cleanEmail,
          city.trim(),
          zipCode ? String(zipCode).trim() : null,
          address ? String(address).trim() : null
        );
        newLead = rows[0];
      }
    } catch {
      const rows = await prisma.$queryRawUnsafe<any[]>(
        `INSERT INTO "LeadReferral" 
         ("companyId", "userId", "businessName", "ownerName", "mobileNumber", "email", "city", "zipCode", "address", "status", "rewardAmount", "rewardStatus", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'NEW_LEAD', 3000.00, 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING *`,
        companyId,
        userId,
        businessName.trim(),
        ownerName.trim(),
        cleanMobile,
        cleanEmail,
        city.trim(),
        zipCode ? String(zipCode).trim() : null,
        address ? String(address).trim() : null
      );
      newLead = rows[0];
    }

    return res.status(201).json({
      success: true,
      message: 'Lead referral submitted successfully! Our sales team will reach out to them.',
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
    const myLeads = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "LeadReferral" WHERE "companyId" = $1 AND "userId" = $2`,
      companyId,
      userId
    );
    const myWithdrawals = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "ReferralWithdrawal" WHERE "companyId" = $1 AND "userId" = $2`,
      companyId,
      userId
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

    const rows = await prisma.$queryRawUnsafe<any[]>(
      `INSERT INTO "ReferralWithdrawal"
       ("companyId", "userId", "amount", "bankName", "accountNumber", "ifscCode", "accountHolder", "status", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'REQUESTED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      companyId,
      userId,
      numAmount,
      bankName.trim(),
      accountNumber.trim(),
      ifscCode.trim().toUpperCase(),
      accountHolder.trim()
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

    const leads = await prisma.$queryRawUnsafe<any[]>(
      `SELECT lr.*, u."firstName", u."lastName", u."email" as "referrerEmail", u."role" as "referrerRole"
       FROM "LeadReferral" lr
       JOIN "User" u ON lr."userId" = u."id"
       WHERE lr."companyId" = $1
       ORDER BY lr."createdAt" DESC`,
      companyId
    );

    return res.json({
      success: true,
      leads: leads.map((l) => ({
        ...l,
        rewardAmount: Number(l.rewardAmount || 3000),
        referrerName: `${l.firstName || ''} ${l.lastName || ''}`.trim() || 'Employee',
      })),
    });
  } catch (error) {
    next(error);
  }
});

// ----------------------------------------------------------------------------
// 5. PATCH /api/v1/referrals/:id/status
// Update referral lead status (for HR / Company Admin / Sales)
// ----------------------------------------------------------------------------
referralsRouter.patch('/:id/status', roleGuard('COMPANY_ADMIN', 'HR'), async (req, res, next) => {
  try {
    await ensureTables();
    const companyId = req.user!.companyId!;
    const referralId = parseInt(req.params.id, 10);
    const { status, notes } = req.body;

    const validStatuses = ['NEW_LEAD', 'CONTACTED', 'DEMO_SCHEDULED', 'CONVERTED', 'REJECTED'];
    if (!validStatuses.includes(status)) {
      throw new AppError(400, 'BAD_REQUEST', `Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    const rewardStatus = status === 'CONVERTED' ? 'CREDITED' : status === 'REJECTED' ? 'VOID' : 'PENDING';
    const convertedAt = status === 'CONVERTED' ? new Date() : null;

    const rows = await prisma.$queryRawUnsafe<any[]>(
      `UPDATE "LeadReferral"
       SET "status" = $1, "rewardStatus" = $2, "notes" = COALESCE($3, "notes"), 
           "convertedAt" = COALESCE($4, "convertedAt"), "updatedAt" = CURRENT_TIMESTAMP
       WHERE "id" = $5 AND "companyId" = $6
       RETURNING *`,
      status,
      rewardStatus,
      notes || null,
      convertedAt,
      referralId,
      companyId
    );

    if (!rows.length) {
      throw new AppError(404, 'NOT_FOUND', 'Referral lead not found');
    }

    return res.json({
      success: true,
      message: `Lead status updated to ${status}`,
      lead: rows[0],
    });
  } catch (error) {
    next(error);
  }
});

export default referralsRouter;

