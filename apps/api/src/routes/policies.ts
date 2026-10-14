import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authMiddleware } from '../middlewares/auth.js';
import { tenantMatchMiddleware } from '../middlewares/tenantMatch.js';
import { policyComplianceMiddleware } from '../middlewares/policyCompliance.js';
import { roleGuard } from '../middlewares/roleGuard.js';
import { hrPermission } from '../middlewares/hrPermission.js';
import { validateBody } from '../middlewares/validate.js';
import { AppError } from '../middlewares/errorHandler.js';
import { CreatePolicySchema, UpdatePolicySchema } from '../schemas/policy.js';
import { logActivity } from '../services/activityLog.js';

const router = Router();

router.use(authMiddleware, tenantMatchMiddleware, policyComplianceMiddleware);

// GET /policies (Self-service list with acceptance status)
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const companyId = req.user!.companyId!;

    const policies = await prisma.policy.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });

    const enriched = policies.map((p) => {
      const acceptances = Array.isArray(p.acceptances) ? (p.acceptances as any[]) : [];
      const hasAccepted = acceptances.some((a) => a.userId === userId && a.version === p.version);
      return {
        ...p,
        hasAccepted,
      };
    });

    return res.json({ policies: enriched });
  } catch (error) {
    next(error);
  }
});

// POST /policies/:id/accept (Accept policy version)
router.post('/:id/accept', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const companyId = req.user!.companyId!;
    const policyId = Number(req.params.id);

    const updated = await prisma.$transaction(async (tx) => {
      const policy = await tx.policy.findFirst({
        where: { id: policyId, companyId },
      });

      if (!policy) {
        throw new AppError(404, 'NOT_FOUND', 'Policy not found');
      }

      const acceptances = Array.isArray(policy.acceptances) ? (policy.acceptances as any[]) : [];
      const alreadyAccepted = acceptances.some((a) => a.userId === userId && a.version === policy.version);

      if (alreadyAccepted) {
        return policy;
      }

      const updatedAcceptances = [
        ...acceptances,
        {
          userId,
          version: policy.version,
          at: new Date().toISOString(),
        },
      ];

      return tx.policy.update({
        where: { id: policyId },
        data: {
          acceptances: updatedAcceptances as any,
        },
      });
    });

    await logActivity({
      companyId,
      actorId: userId,
      action: 'ACCEPT_POLICY',
      objectType: 'Policy',
      objectId: String(policyId),
      message: `Accepted policy '${updated.title}' v${updated.version}`,
    });

    return res.json({ success: true, policy: updated });
  } catch (error) {
    next(error);
  }
});

// POST /policies or /policies/company (HR/Admin)
router.post(
  ['/', '/company'],
  roleGuard('COMPANY_ADMIN', 'HR'),
  hrPermission('policies'),
  validateBody(CreatePolicySchema),
  async (req, res, next) => {
    try {
      const companyId = req.user!.companyId!;
      const data = req.body;
      const baseSlug = (data.slug || data.title)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      const slug = `${baseSlug}-${Date.now().toString(36).slice(-4)}`;

      const policyType = data.category || data.policyType || 'HR';
      const body = data.body || data.content || '';

      const versionNum = typeof data.version === 'string' ? parseFloat(data.version) || 1 : data.version || 1;

      const policy = await prisma.policy.create({
        data: {
          companyId,
          policyType,
          title: data.title,
          slug,
          body,
          documentUrl: data.documentUrl || null,
          extractedText: data.extractedText || body,
          validUntil: data.validUntil ? new Date(data.validUntil) : null,
          version: Math.max(1, Math.round(versionNum)),
          acceptances: [],
        },
      });

      await logActivity({
        companyId,
        actorId: req.user!.id,
        action: 'CREATE_POLICY',
        objectType: 'Policy',
        objectId: String(policy.id),
        message: `Created policy '${policy.title}' (v${policy.version})`,
      });

      return res.status(201).json({ policy });
    } catch (error) {
      next(error);
    }
  }
);

// PATCH /policies/:id or /company/policies/:id (Update / Bump version)
router.patch(
  ['/:id', '/company/:id'],
  roleGuard('COMPANY_ADMIN', 'HR'),
  hrPermission('policies'),
  validateBody(UpdatePolicySchema),
  async (req, res, next) => {
    try {
      const companyId = req.user!.companyId!;
      const policyId = Number(req.params.id);
      const { bumpVersion, ...data } = req.body;

      const policy = await prisma.policy.findFirst({
        where: { id: policyId, companyId },
      });
      if (!policy) {
        return next(new AppError(404, 'NOT_FOUND', 'Policy not found'));
      }

      const updateData: any = { ...data };
      if (data.category && !data.policyType) {
        updateData.policyType = data.category;
      }
      if (data.content && !data.body) {
        updateData.body = data.content;
      }
      delete updateData.category;
      delete updateData.content;

      if (bumpVersion) {
        updateData.version = policy.version + 1;
      }
      if (data.validUntil) {
        updateData.validUntil = new Date(data.validUntil);
      }

      const updated = await prisma.policy.update({
        where: { id: policyId },
        data: updateData,
      });

      await logActivity({
        companyId,
        actorId: req.user!.id,
        action: 'UPDATE_POLICY',
        objectType: 'Policy',
        objectId: String(policyId),
        message: `Updated policy '${updated.title}' to v${updated.version}`,
      });

      return res.json({ policy: updated });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /policies/:id or /company/policies/:id (Delete Policy)
router.delete(
  ['/:id', '/company/:id'],
  roleGuard('COMPANY_ADMIN', 'HR'),
  hrPermission('policies'),
  async (req, res, next) => {
    try {
      const companyId = req.user!.companyId!;
      const policyId = Number(req.params.id);

      const policy = await prisma.policy.findFirst({
        where: { id: policyId, companyId },
      });
      if (!policy) {
        return next(new AppError(404, 'NOT_FOUND', 'Policy not found'));
      }

      await prisma.policy.delete({
        where: { id: policyId },
      });

      await logActivity({
        companyId,
        actorId: req.user!.id,
        action: 'DELETE_POLICY',
        objectType: 'Policy',
        objectId: String(policyId),
        message: `Deleted policy '${policy.title}'`,
      });

      return res.json({ success: true, message: 'Policy deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
