import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authMiddleware } from '../middlewares/auth.js';
import { tenantMatchMiddleware } from '../middlewares/tenantMatch.js';
import { policyComplianceMiddleware } from '../middlewares/policyCompliance.js';
import { featureGuard } from '../middlewares/featureGuard.js';
import { validateBody } from '../middlewares/validate.js';
import { AppError } from '../middlewares/errorHandler.js';
import { CreateTicketSchema, AddTicketCommentSchema, UpdateTicketSchema } from '../schemas/ticket.js';
import { TicketCommentJson } from '../schemas/json.js';
import { logActivity } from '../services/activityLog.js';
import { resolveWorkflowApprover } from '../services/requests.js';

const router = Router();

router.use(authMiddleware, tenantMatchMiddleware, policyComplianceMiddleware);
router.use(featureGuard('support_ticket_management'));

function formatTicket(t: any) {
  const author = t.requester || t.user || null;
  const comments = Array.isArray(t.comments)
    ? (t.comments as any[]).map((c) => ({
        id: c.id,
        userId: c.authorId || c.userId,
        userName: c.authorName || c.userName || 'User',
        userRole: c.userRole || 'MEMBER',
        message: c.body || c.message || '',
        body: c.body || c.message || '',
        createdAt: c.createdAt,
      }))
    : [];

  return {
    ...t,
    title: t.subject,
    subject: t.subject,
    user: author,
    requester: author,
    department: t.department?.name || t.category || 'General',
    comments,
  };
}

// GET /tickets
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const companyId = req.user!.companyId!;
    const userRole = req.user!.role;
    const scope = (req.query.scope as string) || (userRole === 'COMPANY_ADMIN' || userRole === 'HR' ? 'company' : 'mine');

    const where: any = { companyId };
    if (scope === 'mine') {
      where.requesterId = userId;
    } else if (scope === 'assigned' || scope === 'team') {
      if (userRole === 'COMPANY_ADMIN' || userRole === 'HR' || userRole === 'PRODUCT_SUPER_ADMIN') {
        where.assigneeId = userId;
      } else {
        // For managers: tickets assigned to them OR tickets raised by their team (direct reports)
        where.OR = [
          { assigneeId: userId },
          { requester: { managerId: userId } },
        ];
      }
    } else if (scope === 'company') {
      if (userRole !== 'COMPANY_ADMIN' && userRole !== 'HR' && userRole !== 'PRODUCT_SUPER_ADMIN') {
        return next(new AppError(403, 'FORBIDDEN_SCOPE', 'Only HR and Company Admin can view tenant-wide tickets'));
      }
    }

    const tickets = await prisma.ticket.findMany({
      where,
      include: {
        requester: { select: { id: true, firstName: true, lastName: true, email: true } },
        assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
        department: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ tickets: tickets.map(formatTicket) });
  } catch (error) {
    next(error);
  }
});

// POST /tickets
router.post('/', validateBody(CreateTicketSchema), async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const companyId = req.user!.companyId!;
    const data = req.body;

    const code = `TIC-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`;
    const subject = data.subject || data.title;
    const category = data.category || data.department || 'GENERAL';

    const assigneeId = data.assigneeId !== undefined
      ? data.assigneeId
      : await resolveWorkflowApprover(userId, companyId);

    const ticket = await prisma.ticket.create({
      data: {
        companyId,
        requesterId: userId,
        assigneeId,
        code,
        category,
        subject,
        description: data.description,
        priority: data.priority || 'MEDIUM',
        departmentId: data.departmentId || null,
        status: 'OPEN',
        comments: [],
      },
      include: {
        requester: { select: { id: true, firstName: true, lastName: true, email: true } },
        assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
        department: { select: { id: true, name: true } },
      },
    });

    await logActivity({
      companyId,
      actorId: userId,
      action: 'CREATE_TICKET',
      objectType: 'Ticket',
      objectId: String(ticket.id),
      message: `Created ticket ${ticket.code}: ${ticket.subject}`,
    });

    return res.status(201).json({ ticket: formatTicket(ticket) });
  } catch (error) {
    next(error);
  }
});

// GET /tickets/:id
router.get('/:id', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const companyId = req.user!.companyId!;
    const ticketId = Number(req.params.id);

    const ticket = await prisma.ticket.findFirst({
      where: { id: ticketId, companyId },
      include: {
        requester: { select: { id: true, firstName: true, lastName: true, email: true, managerId: true } },
        assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
        department: { select: { id: true, name: true } },
      },
    });

    if (!ticket) {
      return next(new AppError(404, 'NOT_FOUND', 'Ticket not found'));
    }

    const isAdminOrHr = ['COMPANY_ADMIN', 'HR', 'PRODUCT_SUPER_ADMIN'].includes(userRole);
    const isAssignee = ticket.assignee?.id === userId;
    const isRequester = ticket.requester?.id === userId;
    const isRequesterManager = ticket.requester?.managerId === userId;

    if (!isAdminOrHr && !isAssignee && !isRequester && !isRequesterManager) {
      return next(new AppError(403, 'FORBIDDEN', 'You do not have access to view this ticket'));
    }

    return res.json({ ticket: formatTicket(ticket) });
  } catch (error) {
    next(error);
  }
});

// POST /tickets/:id/comments (Appends safely inside transaction)
router.post('/:id/comments', validateBody(AddTicketCommentSchema), async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const userName = `${req.user!.firstName} ${req.user!.lastName}`;
    const companyId = req.user!.companyId!;
    const ticketId = Number(req.params.id);
    const { body, message, isInternal } = req.body;
    const commentText = body || message || '';

    const newComment: TicketCommentJson = {
      id: `comm-${Date.now()}-${Math.random().toString(36).slice(-5)}`,
      authorId: userId,
      authorName: userName,
      body: commentText,
      isInternal: Boolean(isInternal),
      createdAt: new Date().toISOString(),
    };

    // Transaction with FOR UPDATE lock ensures concurrent append safety
    const updated = await prisma.$transaction(async (tx) => {
      // Row-level exclusive lock on the ticket
      await tx.$queryRaw`SELECT id FROM "Ticket" WHERE id = ${ticketId} AND "companyId" = ${companyId} FOR UPDATE`;

      const ticket = await tx.ticket.findFirst({
        where: { id: ticketId, companyId },
        include: {
          requester: { select: { id: true, managerId: true } },
        },
      });

      if (!ticket) {
        throw new AppError(404, 'NOT_FOUND', 'Ticket not found');
      }

      const isAdminOrHr = ['COMPANY_ADMIN', 'HR', 'PRODUCT_SUPER_ADMIN'].includes(req.user!.role);
      const isAssignee = ticket.assigneeId === userId;
      const isRequester = ticket.requesterId === userId;
      const isRequesterManager = ticket.requester?.managerId === userId;

      if (!isAdminOrHr && !isAssignee && !isRequester && !isRequesterManager) {
        throw new AppError(403, 'FORBIDDEN', 'You do not have access to comment on this ticket');
      }

      const existingComments = Array.isArray(ticket.comments) ? (ticket.comments as any[]) : [];
      const updatedComments = [...existingComments, newComment];

      return tx.ticket.update({
        where: { id: ticketId },
        data: {
          comments: updatedComments as any,
        },
      });
    });

    return res.status(201).json({ success: true, comment: newComment, comments: updated.comments });
  } catch (error) {
    next(error);
  }
});

// PATCH /tickets/:id or /tickets/:id/status
router.patch(['/:id', '/:id/status'], validateBody(UpdateTicketSchema), async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const companyId = req.user!.companyId!;
    const ticketId = Number(req.params.id);

    const ticket = await prisma.ticket.findFirst({
      where: { id: ticketId, companyId },
      include: {
        requester: { select: { id: true, managerId: true } },
      },
    });
    if (!ticket) {
      return next(new AppError(404, 'NOT_FOUND', 'Ticket not found'));
    }

    const isAdminOrHr = ['COMPANY_ADMIN', 'HR', 'PRODUCT_SUPER_ADMIN'].includes(userRole);
    const isAssignee = ticket.assigneeId === userId;
    const isRequester = ticket.requesterId === userId;
    const isRequesterManager = ticket.requester?.managerId === userId;

    if (!isAdminOrHr && !isAssignee && !isRequester && !isRequesterManager) {
      return next(new AppError(403, 'FORBIDDEN', 'You can only update tickets assigned to you or from your team'));
    }

    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: req.body,
      include: {
        requester: { select: { id: true, firstName: true, lastName: true, email: true } },
        assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
        department: { select: { id: true, name: true } },
      },
    });

    return res.json({ ticket: formatTicket(updated) });
  } catch (error) {
    next(error);
  }
});

export default router;
