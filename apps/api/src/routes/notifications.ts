import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authMiddleware } from '../middlewares/auth.js';
import { tenantMatchMiddleware } from '../middlewares/tenantMatch.js';
import { policyComplianceMiddleware } from '../middlewares/policyCompliance.js';

const router = Router();

router.use(authMiddleware, tenantMatchMiddleware, policyComplianceMiddleware);

// GET /notifications
router.get('/', async (req, res, next) => {
  try {
    const user = req.user!;
    const userId = user.id;

    // 1. Fetch personal notifications assigned directly to this user
    const personalNotifs = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // 2. If user is PRODUCT_SUPER_ADMIN, combine or supplement with live platform alerts
    if (user.role === 'PRODUCT_SUPER_ADMIN') {
      const [recentCompanies, recentOrders, recentFailedEmails] = await Promise.all([
        prisma.company.findMany({
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: { package: true },
        }),
        prisma.subscriptionPaymentOrder.findMany({
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
        prisma.emailLog.findMany({
          where: { status: 'FAILED' },
          orderBy: { createdAt: 'desc' },
          take: 3,
        }),
      ]);

      const platformNotifs: any[] = [];

      for (const order of recentOrders) {
        platformNotifs.push({
          id: 1000000 + order.id,
          kind: 'PAYMENT',
          title: order.status === 'PAID'
            ? `Payment Received: ₹${Number(order.amount).toLocaleString('en-IN')}`
            : `Payment ${order.status === 'FAILED' ? 'Failed' : 'In Process'}`,
          message: `${order.companyName} (${order.planType}) — Contact: ${order.contactEmail}. Status: ${order.status}`,
          url: '/super-admin/companies',
          isRead: order.status === 'PAID',
          createdAt: order.createdAt,
        });
      }

      for (const comp of recentCompanies) {
        platformNotifs.push({
          id: 2000000 + comp.id,
          kind: 'TENANT',
          title: `Tenant: ${comp.name}`,
          message: `Package: ${comp.package?.name || 'Custom'} (${comp.planType}). Domain: ${comp.subdomain}.uptrix.io`,
          url: '/super-admin/companies',
          isRead: comp.isActive,
          createdAt: comp.createdAt,
        });
      }

      for (const email of recentFailedEmails) {
        platformNotifs.push({
          id: 3000000 + email.id,
          kind: 'SYSTEM',
          title: `Email Delivery Failed`,
          message: `Failed to deliver "${email.subject}" to ${email.toEmail}`,
          url: '/super-admin/emails',
          isRead: false,
          createdAt: email.createdAt,
        });
      }

      const combined = [...personalNotifs, ...platformNotifs];
      combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return res.json({ notifications: combined.slice(0, 30) });
    }

    return res.json({ notifications: personalNotifs });
  } catch (error) {
    next(error);
  }
});

// PATCH /notifications/:id/read
router.patch('/:id/read', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const id = Number(req.params.id);

    if (id < 1000000) {
      await prisma.notification.updateMany({
        where: { id, userId },
        data: { isRead: true, readAt: new Date() },
      });
    }

    return res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// POST /notifications/read-all
router.post('/read-all', async (req, res, next) => {
  try {
    const userId = req.user!.id;

    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    return res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
