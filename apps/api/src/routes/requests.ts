import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authMiddleware } from '../middlewares/auth.js';
import { tenantMatchMiddleware } from '../middlewares/tenantMatch.js';
import { policyComplianceMiddleware } from '../middlewares/policyCompliance.js';
import { roleGuard } from '../middlewares/roleGuard.js';
import { validateBody } from '../middlewares/validate.js';
import { AppError } from '../middlewares/errorHandler.js';
import { CreateRequestSchema, DecisionRequestSchema } from '../schemas/request.js';
import { createRequest, decideRequest, cancelRequest, payClaim } from '../services/requests.js';
import { RequestType, RequestStatus } from '@prisma/client';

const router = Router();

router.use(authMiddleware, tenantMatchMiddleware, policyComplianceMiddleware);

// GET /requests
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const companyId = req.user!.companyId!;
    const userRole = req.user!.role;

    const type = req.query.type as RequestType | undefined;
    const status = req.query.status as RequestStatus | undefined;
    const scope = (req.query.scope as string) || 'mine';
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));

    const where: any = { companyId };

    if (type) where.type = type;
    if (status) where.status = status;

    if (scope === 'mine') {
      where.userId = userId;
    } else if (scope === 'assigned') {
      where.approverId = userId;
    } else if (scope === 'company') {
      // Allowed for Admin or HR
      if (userRole !== 'COMPANY_ADMIN' && userRole !== 'HR' && userRole !== 'PRODUCT_SUPER_ADMIN') {
        return next(new AppError(403, 'FORBIDDEN_SCOPE', 'Only HR and Company Admin can view tenant-wide requests'));
      }
    }

    const [items, total] = await Promise.all([
      prisma.request.findMany({
        where,
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true, jobTitle: true },
          },
          approver: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          leaveType: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.request.count({ where }),
    ]);

    return res.json({ items, total, page, pageSize });
  } catch (error) {
    next(error);
  }
});

// POST /requests
router.post('/', validateBody(CreateRequestSchema), async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const companyId = req.user!.companyId!;

    const request = await createRequest({
      userId,
      companyId,
      ...req.body,
    });

    return res.status(201).json({ request });
  } catch (error) {
    next(error);
  }
});

// GET /requests/:id
router.get('/:id', async (req, res, next) => {
  try {
    const companyId = req.user!.companyId!;
    const id = Number(req.params.id);

    const request = await prisma.request.findFirst({
      where: { id, companyId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, jobTitle: true } },
        approver: { select: { id: true, firstName: true, lastName: true, email: true } },
        leaveType: true,
      },
    });

    if (!request) {
      return next(new AppError(404, 'NOT_FOUND', 'Request not found'));
    }

    return res.json({ request });
  } catch (error) {
    next(error);
  }
});

// PATCH /requests/:id/decision
router.patch('/:id/decision', validateBody(DecisionRequestSchema), async (req, res, next) => {
  try {
    const actorId = req.user!.id;
    const actorRole = req.user!.role;
    const companyId = req.user!.companyId!;
    const requestId = Number(req.params.id);
    const { status, note } = req.body;

    const updated = await decideRequest({
      requestId,
      companyId,
      actorId,
      actorRole,
      status,
      note,
    });

    return res.json({ success: true, request: updated });
  } catch (error) {
    next(error);
  }
});

// PATCH /requests/:id/cancel
router.patch('/:id/cancel', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const companyId = req.user!.companyId!;
    const requestId = Number(req.params.id);

    const updated = await cancelRequest({
      requestId,
      companyId,
      userId,
    });

    return res.json({ success: true, request: updated });
  } catch (error) {
    next(error);
  }
});

// PATCH /requests/:id/pay (Claims payment)
router.patch('/:id/pay', roleGuard('COMPANY_ADMIN', 'HR'), async (req, res, next) => {
  try {
    const actorId = req.user!.id;
    const companyId = req.user!.companyId!;
    const requestId = Number(req.params.id);

    const updated = await payClaim({
      requestId,
      companyId,
      actorId,
    });

    return res.json({ success: true, request: updated });
  } catch (error) {
    next(error);
  }
});

// PATCH /requests/:id/progress (Update Goal progress & notes)
router.patch('/:id/progress', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const companyId = req.user!.companyId!;
    const requestId = Number(req.params.id);
    const { goalStatus, note } = req.body;

    const existing = await prisma.request.findFirst({
      where: { id: requestId, companyId },
    });
    if (!existing) {
      return next(new AppError(404, 'NOT_FOUND', 'Request not found'));
    }

    const isOwner = existing.userId === userId;
    const isApprover = existing.approverId === userId;
    const isAdminOrHr = req.user!.role === 'COMPANY_ADMIN' || req.user!.role === 'HR';
    if (!isOwner && !isApprover && !isAdminOrHr) {
      return next(new AppError(403, 'FORBIDDEN', 'Not authorized to update this request progress'));
    }

    const currentMeta = (existing.meta as any) || {};
    const updatedMeta = {
      ...currentMeta,
      ...(goalStatus ? { goalStatus } : {}),
      ...(note ? {
        comments: [
          ...(Array.isArray(currentMeta.comments) ? currentMeta.comments : []),
          { authorId: userId, body: note, at: new Date().toISOString() },
        ],
      } : {}),
    };

    const updated = await prisma.request.update({
      where: { id: requestId },
      data: { meta: updatedMeta },
    });

    return res.json({ success: true, request: updated });
  } catch (error) {
    next(error);
  }
});

export default router;
