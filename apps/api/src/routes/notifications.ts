import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authMiddleware } from '../middlewares/auth.js';
import { tenantMatchMiddleware } from '../middlewares/tenantMatch.js';
import { policyComplianceMiddleware } from '../middlewares/policyCompliance.js';

const router = Router();

router.use(authMiddleware, tenantMatchMiddleware, policyComplianceMiddleware);

function enrichNotificationUrl(n: any): string {
  if (n.url && typeof n.url === 'string' && n.url.trim() !== '') {
    return n.url.trim();
  }
  const kind = (n.kind || '').toUpperCase();
  const title = (n.title || '').toLowerCase();

  if (kind === 'LEAVE') {
    return title.includes('new') ? '/company/leaves/manage' : '/leaves';
  }
  if (kind === 'GOAL') {
    return title.includes('new') ? '/performance/goals/manage' : '/performance/goals';
  }
  if (kind === 'CLAIM' || kind === 'EXPENSE') {
    return title.includes('new') ? '/company/claims/manage' : '/claims';
  }
  if (kind === 'COMP_OFF') {
    return title.includes('new') ? '/company/comp-off/manage' : '/comp-off';
  }
  if (kind === 'REGULARIZATION' || kind === 'ATTENDANCE_REGULARIZATION') {
    return title.includes('new') ? '/attendance/regularizations/manage' : '/attendance';
  }
  if (kind === 'PAYSLIP' || kind === 'PAYROLL') {
    return '/payroll/my-payslips';
  }
  if (kind === 'HOLIDAY') {
    return '/company/holidays';
  }
  if (kind === 'KUDOS' || kind === 'APPRECIATION') {
    return '/appreciations';
  }
  if (kind === 'TICKET') {
    return title.includes('assigned') ? '/tickets/assigned' : '/tickets';
  }
  if (kind === 'DOC_EXPIRY' || kind === 'DOCUMENT') {
    return '/my-documents';
  }
  return '';
}

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

    const mappedPersonalNotifs = personalNotifs.map((n) => ({
      ...n,
      url: enrichNotificationUrl(n),
    }));

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

      const combined = [...mappedPersonalNotifs, ...platformNotifs];
      combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return res.json({ notifications: combined.slice(0, 30) });
    }

    return res.json({ notifications: mappedPersonalNotifs });
  } catch (error) {
    next(error);
  }
});

// GET /notifications/settings
router.get('/settings', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const companyId = req.user!.companyId;

    if (!companyId) {
      return res.json({
        success: true,
        settings: { emailNotifications: true, browserAlerts: true, weeklyDigest: false },
      });
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { settings: true },
    });

    const companySettings = (company?.settings as any) || {};
    const userNotifs = companySettings.userNotificationSettings?.[String(userId)] || {};

    const settings = {
      emailNotifications: userNotifs.emailNotifications !== false,
      browserAlerts: userNotifs.browserAlerts !== false,
      weeklyDigest: Boolean(userNotifs.weeklyDigest),
    };

    return res.json({ success: true, settings });
  } catch (error) {
    next(error);
  }
});

// PUT /notifications/settings
router.put('/settings', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const companyId = req.user!.companyId;
    const { emailNotifications, browserAlerts, weeklyDigest } = req.body;

    if (!companyId) {
      return res.json({
        success: true,
        settings: {
          emailNotifications: emailNotifications !== false,
          browserAlerts: browserAlerts !== false,
          weeklyDigest: Boolean(weeklyDigest),
        },
      });
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { settings: true },
    });

    const currentSettings = (company?.settings as any) || {};
    const existingUserMap = currentSettings.userNotificationSettings || {};

    const updatedUserPrefs = {
      emailNotifications: emailNotifications !== false,
      browserAlerts: browserAlerts !== false,
      weeklyDigest: Boolean(weeklyDigest),
    };

    const newSettings = {
      ...currentSettings,
      userNotificationSettings: {
        ...existingUserMap,
        [String(userId)]: updatedUserPrefs,
      },
    };

    await prisma.company.update({
      where: { id: companyId },
      data: { settings: newSettings },
    });

    return res.json({
      success: true,
      message: 'Notification preferences saved to database successfully.',
      settings: updatedUserPrefs,
    });
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

// DELETE /notifications/clear-all
router.delete('/clear-all', async (req, res, next) => {
  try {
    const userId = req.user!.id;

    await prisma.notification.deleteMany({
      where: { userId },
    });

    return res.json({ success: true, message: 'All notifications cleared' });
  } catch (error) {
    next(error);
  }
});

// DELETE /notifications/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const id = Number(req.params.id);

    if (id < 1000000) {
      await prisma.notification.deleteMany({
        where: { id, userId },
      });
    }

    return res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
