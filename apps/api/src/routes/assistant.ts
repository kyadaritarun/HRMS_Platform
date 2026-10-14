import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authMiddleware } from '../middlewares/auth.js';
import { tenantMatchMiddleware } from '../middlewares/tenantMatch.js';
import { policyComplianceMiddleware } from '../middlewares/policyCompliance.js';
import { featureGuard } from '../middlewares/featureGuard.js';
import { AppError } from '../middlewares/errorHandler.js';

const router = Router();

router.use(authMiddleware, tenantMatchMiddleware, policyComplianceMiddleware);
router.use(featureGuard('ai_assistant'));

// POST /assistant/chat
router.post('/chat', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const companyId = req.user!.companyId!;
    const message = (req.body.message || '').trim();

    if (!message) {
      return next(new AppError(400, 'MESSAGE_REQUIRED', 'Message is required'));
    }

    // 1. Fetch Company Policies (Knowledge Grounding)
    const policies = await prisma.policy.findMany({
      where: { companyId },
      select: { title: true, extractedText: true, policyType: true },
    });

    // 2. Fetch User Context
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        department: true,
        leaveBalances: { include: { leaveType: true } },
      },
    });

    const userBalances = user?.leaveBalances
      .map((lb) => `${lb.leaveType.name} (${lb.leaveType.code}): ${lb.balance} days`)
      .join(', ');

    // 3. Grounded Answer Synthesis
    const query = message.toLowerCase();
    let reply = '';
    const citations: string[] = [];

    // Check policies match
    for (const p of policies) {
      const pText = (p.extractedText || '').toLowerCase();
      if (
        (query.includes('leave') || query.includes('vacation') || query.includes('cl') || query.includes('sick')) &&
        p.policyType === 'LEAVE'
      ) {
        citations.push(p.title);
        reply += `According to the **${p.title}**:\n${p.extractedText}\n\n`;
      } else if (
        (query.includes('claim') || query.includes('expense') || query.includes('reimburse')) &&
        p.policyType === 'CLAIM'
      ) {
        citations.push(p.title);
        reply += `According to the **${p.title}**:\n${p.extractedText}\n\n`;
      } else if (
        (query.includes('code') || query.includes('conduct') || query.includes('ethics') || query.includes('behavior')) &&
        p.policyType === 'HR'
      ) {
        citations.push(p.title);
        reply += `According to the **${p.title}**:\n${p.extractedText}\n\n`;
      }
    }

    if (query.includes('balance') || query.includes('how many leaves')) {
      reply += `\nYour current leave balances are: **${userBalances || 'None allocated'}**.`;
    }

    if (!reply) {
      if (citations.length === 0 && policies.length > 0) {
        citations.push(policies[0].title);
      }
      reply = `Hello ${user?.firstName}! I am your Uptrix HR Assistant. Based on our company policies, all employees are expected to uphold high ethical standards and submit time-off or reimbursement requests through the self-service portal. How can I assist you with your leaves, claims, or attendance today?`;
    }

    return res.json({
      reply: reply.trim(),
      citations,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
