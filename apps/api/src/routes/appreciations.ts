import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authMiddleware } from '../middlewares/auth.js';
import { tenantMatchMiddleware } from '../middlewares/tenantMatch.js';
import { policyComplianceMiddleware } from '../middlewares/policyCompliance.js';
import { featureGuard } from '../middlewares/featureGuard.js';
import { AppError } from '../middlewares/errorHandler.js';
import { logActivity } from '../services/activityLog.js';

const router = Router();

router.use(authMiddleware, tenantMatchMiddleware, policyComplianceMiddleware);
router.use(featureGuard('appreciations'));

// GET /appreciations (Public company kudos wall)
router.get('/', async (req, res, next) => {
  try {
    const companyId = req.user!.companyId!;

    const kudos = await prisma.notification.findMany({
      where: {
        companyId,
        kind: 'KUDOS',
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, jobTitle: true, profilePhoto: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const senderIds = Array.from(
      new Set(
        kudos
          .map((k) => {
            try {
              const p = typeof k.payload === 'string' ? JSON.parse(k.payload) : (k.payload || {});
              return p.senderId ? Number(p.senderId) : null;
            } catch {
              return null;
            }
          })
          .filter((id): id is number => typeof id === 'number' && !isNaN(id))
      )
    );

    const senders = senderIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: senderIds } },
          select: { id: true, firstName: true, lastName: true, jobTitle: true, profilePhoto: true },
        })
      : [];
    const senderMap = new Map(senders.map((s) => [s.id, s]));

    const enriched = kudos.map((k) => {
      let p: any = {};
      try {
        p = typeof k.payload === 'string' ? JSON.parse(k.payload) : (k.payload || {});
      } catch {
        p = {};
      }

      const senderUser = p.senderId ? senderMap.get(Number(p.senderId)) : null;
      const senderNameParts = (p.senderName || '').trim().split(' ');
      const senderFirstName = senderUser?.firstName || senderNameParts[0] || 'Teammate';
      const senderLastName = senderUser?.lastName || senderNameParts.slice(1).join(' ') || '';

      return {
        ...k,
        badge: p.badge || 'ROCKSTAR',
        message: p.message || k.message,
        receiver: k.user,
        sender: {
          id: p.senderId,
          firstName: senderFirstName,
          lastName: senderLastName,
          name: senderUser
            ? `${senderUser.firstName} ${senderUser.lastName}`.trim()
            : (p.senderName || `${senderFirstName} ${senderLastName}`.trim()),
          profilePhoto: senderUser?.profilePhoto || p.senderPhoto || null,
          jobTitle: senderUser?.jobTitle || '',
        },
      };
    });

    return res.json({ appreciations: enriched });
  } catch (error) {
    next(error);
  }
});

// POST /appreciations (Send Kudos to peer)
router.post('/', async (req, res, next) => {
  try {
    const senderId = req.user!.id;
    const senderName = `${req.user!.firstName} ${req.user!.lastName}`.trim();
    const senderPhoto = req.user!.profilePhoto || null;
    const companyId = req.user!.companyId!;
    const rawRecipient = req.body.recipientId || req.body.receiverId;
    const recipientId = Number(rawRecipient);
    const { badge, message } = req.body;

    if (!recipientId || isNaN(recipientId) || !badge) {
      return next(new AppError(400, 'BADGE_OR_RECIPIENT_REQUIRED', 'Recipient and badge are required'));
    }

    const recipient = await prisma.user.findFirst({
      where: { id: recipientId, companyId, isActive: true },
    });
    if (!recipient) {
      return next(new AppError(404, 'NOT_FOUND', 'Recipient employee not found'));
    }

    const kudosNotification = await prisma.notification.create({
      data: {
        companyId,
        userId: recipientId,
        kind: 'KUDOS',
        title: `Kudos from ${senderName}`,
        message: message || `Awarded you the ${badge} badge!`,
        url: '/appreciations',
        payload: {
          senderId,
          senderName,
          senderPhoto,
          badge,
          message: message || '',
        },
      },
    });

    await logActivity({
      companyId,
      actorId: senderId,
      action: 'SEND_KUDOS',
      objectType: 'Notification',
      objectId: String(kudosNotification.id),
      message: `${senderName} awarded ${badge} to ${recipient.firstName}`,
    });

    return res.status(201).json({ success: true, appreciation: kudosNotification });
  } catch (error) {
    next(error);
  }
});

export default router;
