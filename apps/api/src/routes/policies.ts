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
import { upload } from '../lib/storage.js';

const router = Router();


router.use(authMiddleware, tenantMatchMiddleware, policyComplianceMiddleware);

// GET /policies (Self-service list with acceptance status)
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const companyId = req.user!.companyId!;
    const showAll = req.query.all === 'true';

    const whereClause: any = { companyId };
    if (!showAll && (req.user?.role === 'EMPLOYEE' || req.query.activeOnly === 'true')) {
      whereClause.isActive = true;
    }

    const policies = await prisma.policy.findMany({
      where: whereClause,
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
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
  upload.single('file'),
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
      let fileUrl: string | null = null;
      if (req.file) {
        fileUrl = `/uploads/${req.file.filename}`;
      } else if (data.documentUrl) {
        fileUrl = data.documentUrl.includes('amazonaws.com')
          ? `/uploads/${data.documentUrl.split('/uploads/').pop()}`
          : data.documentUrl;
      }

      const body = data.body || data.content || (req.file ? req.file.originalname : '');

      if (data.validUntil && data.validUntil.trim()) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const selectedDate = new Date(data.validUntil);
        selectedDate.setHours(0, 0, 0, 0);
        if (selectedDate < today) {
          return next(new AppError(400, 'INVALID_DATE', 'Review / Valid Until Date cannot be in the past'));
        }
      }

      const versionNum = typeof data.version === 'string' ? parseFloat(data.version) || 1 : data.version || 1;

      const policy = await prisma.policy.create({
        data: {
          companyId,
          policyType,
          title: data.title,
          slug,
          body,
          documentUrl: fileUrl,
          extractedText: data.extractedText || body,
          validUntil: data.validUntil && data.validUntil.trim() ? new Date(data.validUntil) : null,
          version: Math.max(1, Math.round(versionNum)),
          isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
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
  upload.single('file'),
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
      delete updateData.isMandatory;

      if (req.file) {
        updateData.documentUrl = `/uploads/${req.file.filename}`;
      } else if (data.documentUrl && data.documentUrl.includes('amazonaws.com')) {
        updateData.documentUrl = `/uploads/${data.documentUrl.split('/uploads/').pop()}`;
      }

      if (bumpVersion) {
        updateData.version = policy.version + 1;
      } else if (data.version !== undefined) {
        const vNum = typeof data.version === 'string' ? parseFloat(data.version) || 1 : data.version || 1;
        updateData.version = Math.max(1, Math.round(vNum));
      }

      if (data.validUntil !== undefined) {
        if (data.validUntil && data.validUntil.trim()) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const selectedDate = new Date(data.validUntil);
          selectedDate.setHours(0, 0, 0, 0);
          if (selectedDate < today) {
            return next(new AppError(400, 'INVALID_DATE', 'Review / Valid Until Date cannot be in the past'));
          }
          updateData.validUntil = selectedDate;
        } else {
          updateData.validUntil = null;
        }
      }
      if (data.isActive !== undefined) {
        updateData.isActive = Boolean(data.isActive);
      }

      const updated = await prisma.policy.update({
        where: { id: policyId },
        data: updateData,
      });

      const actionMessage =
        data.isActive === false
          ? `Deactivated policy '${policy.title}'`
          : data.isActive === true
          ? `Reactivated policy '${policy.title}'`
          : `Updated policy '${updated.title}' to v${updated.version}`;

      await logActivity({
        companyId,
        actorId: req.user!.id,
        action: 'UPDATE_POLICY',
        objectType: 'Policy',
        objectId: String(policyId),
        message: actionMessage,
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
