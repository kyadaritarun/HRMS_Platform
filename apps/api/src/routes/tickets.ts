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

const router = Router();

router.use(authMiddleware, tenantMatchMiddleware, policyComplianceMiddleware);
router.use(featureGuard('support_ticket_management'));

/**
 * Resolves the designated department agent/handler based on ticket category:
 * - IT / HARDWARE -> User with role IT
 * - FINANCE -> User with role FINANCE
 * - HR / FACILITIES -> User with role HR
 * - Fallback -> COMPANY_ADMIN
 */
async function resolveDepartmentAgent(
  companyId: number,
  category: string
): Promise<{ assigneeId: number | null; departmentId: number | null }> {
  const norm = (category || 'GENERAL').toUpperCase();

  // 1. IT or HARDWARE -> Route to IT role
  if (norm === 'IT' || norm === 'HARDWARE') {
    const itUser = await prisma.user.findFirst({
      where: { companyId, role: 'IT', isActive: true },
      select: { id: true, departmentId: true },
    });
    if (itUser) return { assigneeId: itUser.id, departmentId: itUser.departmentId };
  }

  // 2. FINANCE (and Finance Sub-categories) -> Route to FINANCE role
  if (norm.startsWith('FINANCE') || norm === 'SALARY' || norm === 'TAX' || norm === 'PAYROLL') {
    const finUser = await prisma.user.findFirst({
      where: { companyId, role: 'FINANCE', isActive: true },
      select: { id: true, departmentId: true },
    });
    if (finUser) return { assigneeId: finUser.id, departmentId: finUser.departmentId };
  }

  // 3. HR or FACILITIES -> Route to HR role
  if (norm === 'HR' || norm === 'FACILITIES') {
    const hrUser = await prisma.user.findFirst({
      where: { companyId, role: 'HR', isActive: true },
      select: { id: true, departmentId: true },
    });
    if (hrUser) return { assigneeId: hrUser.id, departmentId: hrUser.departmentId };
  }

  // 4. Fallback -> Company Admin or active HR
  const adminOrHr = await prisma.user.findFirst({
    where: { companyId, role: { in: ['COMPANY_ADMIN', 'HR'] }, isActive: true },
    select: { id: true, departmentId: true },
    orderBy: { role: 'asc' }, // COMPANY_ADMIN first
  });

  return {
    assigneeId: adminOrHr?.id || null,
    departmentId: adminOrHr?.departmentId || null,
  };
}

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
    const isAgentRole = userRole === 'COMPANY_ADMIN' || userRole === 'HR' || userRole === 'IT' || userRole === 'FINANCE';
    const scope = (req.query.scope as string) || (userRole === 'COMPANY_ADMIN' || userRole === 'HR' ? 'company' : isAgentRole ? 'assigned' : 'mine');

    const where: any = { companyId };
    if (scope === 'mine') {
      where.requesterId = userId;
    } else if (scope === 'assigned' || scope === 'team') {
      if (userRole === 'COMPANY_ADMIN' || userRole === 'PRODUCT_SUPER_ADMIN') {
        where.assigneeId = userId;
      } else if (userRole === 'IT') {
        where.OR = [
          { assigneeId: userId },
          { category: { in: ['IT', 'HARDWARE'] } },
        ];
      } else if (userRole === 'FINANCE') {
        where.OR = [
          { assigneeId: userId },
          { category: 'FINANCE' },
          { category: { startsWith: 'FINANCE' } },
          { category: { in: ['SALARY', 'TAX', 'PAYROLL'] } },
        ];
      } else if (userRole === 'HR') {
        where.OR = [
          { assigneeId: userId },
          { category: { in: ['HR', 'FACILITIES', 'GENERAL'] } },
        ];
      } else {
        // For managers / regular employees
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
    const category = (data.category || data.department || 'GENERAL').toUpperCase();

    // Auto-resolve assignee & department based on category if not explicitly provided
    const { assigneeId: autoAssigneeId, departmentId: autoDeptId } = await resolveDepartmentAgent(companyId, category);
    const assigneeId = data.assigneeId !== undefined ? data.assigneeId : autoAssigneeId;
    const departmentId = data.departmentId !== undefined ? data.departmentId : autoDeptId;

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
        departmentId: departmentId || null,
        status: 'OPEN',
        comments: [],
      },
      include: {
        requester: { select: { id: true, firstName: true, lastName: true, email: true } },
        assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
        department: { select: { id: true, name: true } },
      },
    });

    // Notify assignee if assigned
    if (assigneeId && assigneeId !== userId) {
      await prisma.notification.create({
        data: {
          companyId,
          userId: assigneeId,
          kind: 'TICKET',
          title: `New Support Ticket [${category}]`,
          message: `${req.user!.firstName || 'An employee'} raised ticket ${ticket.code}: ${ticket.subject}`,
          url: '/tickets/assigned',
          sourceType: 'Ticket',
          sourceId: String(ticket.id),
        },
      }).catch((e) => console.error('Failed to create ticket notification:', e));
    }

    await logActivity({
      companyId,
      actorId: userId,
      action: 'CREATE_TICKET',
      objectType: 'Ticket',
      objectId: String(ticket.id),
      message: `Created ticket ${ticket.code} [${category}] assigned to user #${assigneeId}: ${ticket.subject}`,
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
    const isItAgent = userRole === 'IT' && ['IT', 'HARDWARE'].includes(ticket.category);
    const isFinanceAgent = userRole === 'FINANCE' && (ticket.category.startsWith('FINANCE') || ['FINANCE', 'SALARY', 'TAX', 'PAYROLL'].includes(ticket.category));
    const isAssignee = ticket.assignee?.id === userId;
    const isRequester = ticket.requester?.id === userId;
    const isRequesterManager = ticket.requester?.managerId === userId;

    if (!isAdminOrHr && !isItAgent && !isFinanceAgent && !isAssignee && !isRequester && !isRequesterManager) {
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
    const userName = `${req.user!.firstName} ${req.user!.lastName}`.trim() || 'User';
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
      const isItAgent = req.user!.role === 'IT' && ['IT', 'HARDWARE'].includes(ticket.category);
      const isFinanceAgent = req.user!.role === 'FINANCE' && (ticket.category.startsWith('FINANCE') || ['FINANCE', 'SALARY', 'TAX', 'PAYROLL'].includes(ticket.category));
      const isAssignee = ticket.assigneeId === userId;
      const isRequester = ticket.requesterId === userId;
      const isRequesterManager = ticket.requester?.managerId === userId;

      if (!isAdminOrHr && !isItAgent && !isFinanceAgent && !isAssignee && !isRequester && !isRequesterManager) {
        throw new AppError(403, 'FORBIDDEN', 'You do not have access to comment on this ticket');
      }

      const existingComments = Array.isArray(ticket.comments) ? (ticket.comments as any[]) : [];
      const updatedComments = [...existingComments, newComment];

      const saved = await tx.ticket.update({
        where: { id: ticketId },
        data: {
          comments: updatedComments as any,
        },
      });

      return { saved, ticket, isRequester };
    });

    // Notify the other party
    const notifyRecipientId = updated.isRequester ? updated.ticket.assigneeId : updated.ticket.requesterId;
    if (notifyRecipientId && notifyRecipientId !== userId) {
      await prisma.notification.create({
        data: {
          companyId,
          userId: notifyRecipientId,
          kind: 'TICKET',
          title: `New Reply on Ticket ${updated.ticket.code}`,
          message: `${userName}: ${commentText.slice(0, 100)}`,
          url: updated.isRequester ? '/tickets/assigned' : '/tickets',
          sourceType: 'Ticket',
          sourceId: String(ticketId),
        },
      }).catch((e) => console.error('Failed to create ticket comment notification:', e));
    }

    return res.status(201).json({ success: true, comment: newComment, comments: updated.saved.comments });
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
    const isItAgent = userRole === 'IT' && ['IT', 'HARDWARE'].includes(ticket.category);
    const isFinanceAgent = userRole === 'FINANCE' && (ticket.category.startsWith('FINANCE') || ['FINANCE', 'SALARY', 'TAX', 'PAYROLL'].includes(ticket.category));
    const isAssignee = ticket.assigneeId === userId;
    const isRequester = ticket.requesterId === userId;
    const isRequesterManager = ticket.requester?.managerId === userId;
    const isSupportAgent = isAdminOrHr || isItAgent || isFinanceAgent || isAssignee || isRequesterManager;

    if (!isSupportAgent && !isRequester) {
      return next(new AppError(403, 'FORBIDDEN', 'You do not have permission to update this ticket'));
    }

    // Requester status constraint: Requester can only CLOSE or REOPEN (OPEN)
    if (req.body.status && isRequester && !isSupportAgent) {
      if (!['CLOSED', 'OPEN'].includes(req.body.status)) {
        return next(
          new AppError(400, 'INVALID_STATUS_TRANSITION', 'Employees can only Close a resolved ticket or Reopen an issue.')
        );
      }
    }

    // Only support agents/managers can reassign tickets
    if (req.body.assigneeId !== undefined && !isSupportAgent) {
      return next(new AppError(403, 'FORBIDDEN', 'Only managers and support agents can reassign tickets'));
    }

    const oldAssigneeId = ticket.assigneeId;

    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: req.body,
      include: {
        requester: { select: { id: true, firstName: true, lastName: true, email: true } },
        assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
        department: { select: { id: true, name: true } },
      },
    });

    // Notify new assignee if reassigned
    if (req.body.assigneeId && req.body.assigneeId !== oldAssigneeId) {
      const assignedName = updated.assignee ? `${updated.assignee.firstName} ${updated.assignee.lastName}`.trim() : 'team member';
      await prisma.notification.create({
        data: {
          companyId,
          userId: req.body.assigneeId,
          kind: 'TICKET',
          title: `Ticket Assigned to You [${updated.code}]`,
          message: `${req.user!.firstName || 'Manager'} assigned you ticket ${updated.code}: ${updated.subject}`,
          url: '/tickets/assigned',
          sourceType: 'Ticket',
          sourceId: String(ticket.id),
        },
      }).catch((e) => console.error('Failed to notify new assignee:', e));

      await logActivity({
        companyId,
        actorId: userId,
        action: 'REASSIGN_TICKET',
        objectType: 'Ticket',
        objectId: String(ticket.id),
        message: `Reassigned ticket ${ticket.code} to ${assignedName} (ID: ${req.body.assigneeId})`,
      });
    }

    // Notify requester if agent updated the status
    if (req.body.status && req.body.status !== ticket.status && ticket.requesterId !== userId) {
      await prisma.notification.create({
        data: {
          companyId,
          userId: ticket.requesterId,
          kind: 'TICKET',
          title: `Ticket ${ticket.code} Updated`,
          message: `Your ticket status is now ${req.body.status}`,
          url: '/tickets',
          sourceType: 'Ticket',
          sourceId: String(ticket.id),
        },
      }).catch((e) => console.error('Failed to create status notification:', e));
    }

    return res.json({ ticket: formatTicket(updated) });
  } catch (error) {
    next(error);
  }
});

export default router;
