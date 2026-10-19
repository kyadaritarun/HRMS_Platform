import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authMiddleware } from '../middlewares/auth.js';
import { roleGuard } from '../middlewares/roleGuard.js';
import { AppError } from '../middlewares/errorHandler.js';
import { verifyWebhookSignature, getRazorpayKeyId } from '../lib/razorpay.js';
import {
  processSuccessfulPayment,
  createUpgradeOrder,
  checkAndSendExpiryAlerts,
} from '../services/subscriptionBilling.js';

const router = Router();

// GET /subscription/order/:orderId (Public: for checkout page)
router.get('/order/:orderId', async (req, res, next) => {
  try {
    const orderId = req.params.orderId;
    const order = await prisma.subscriptionPaymentOrder.findUnique({
      where: { orderId },
      include: {
        package: true,
        company: {
          select: { id: true, name: true, subdomain: true, logo: true },
        },
      },
    });

    if (!order) {
      return next(new AppError(404, 'ORDER_NOT_FOUND', 'Payment order or proposal not found'));
    }

    return res.json({
      order,
      razorpayKeyId: getRazorpayKeyId(),
    });
  } catch (error) {
    next(error);
  }
});

// POST /subscription/verify-payment (Public / Client callback)
router.post('/verify-payment', async (req, res, next) => {
  try {
    const { orderId, paymentId, paymentSignature, paymentMethod } = req.body;

    if (!orderId) {
      return next(new AppError(400, 'ORDER_ID_REQUIRED', 'Order ID is required'));
    }

    const result = await processSuccessfulPayment({
      orderId,
      paymentId: paymentId || `pay_sim_${Date.now()}`,
      paymentSignature,
      paymentMethod: paymentMethod || 'Razorpay Online',
    });

    return res.json({
      success: true,
      message: 'Payment verified and workspace successfully updated',
      result,
    });
  } catch (error) {
    next(error);
  }
});

// POST /subscription/webhook (Razorpay Webhooks)
router.post('/webhook', async (req, res, next) => {
  try {
    const signature = req.headers['x-razorpay-signature'] as string;
    const rawBody = JSON.stringify(req.body);

    const isValid = verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }

    const event = req.body.event;
    const payload = req.body.payload;

    if (event === 'payment.captured' || event === 'payment_link.paid') {
      const paymentEntity = payload.payment?.entity || payload.payment_link?.entity;
      const notes = paymentEntity?.notes || {};
      const orderId = notes.internalRef || paymentEntity?.id;

      if (orderId) {
        await processSuccessfulPayment({
          orderId,
          paymentId: paymentEntity?.id || `pay_hook_${Date.now()}`,
          paymentMethod: paymentEntity?.method || 'Razorpay Webhook',
        });
      }
    }

    return res.json({ status: 'ok' });
  } catch (error) {
    console.error('[Razorpay Webhook Error]', error);
    return res.status(500).json({ error: 'Webhook processing error' });
  }
});

// POST /subscription/upgrade (Protected: Company Admin)
router.post('/upgrade', authMiddleware, roleGuard('COMPANY_ADMIN'), async (req, res, next) => {
  try {
    const companyId = req.user!.companyId!;
    const { packageId, planType } = req.body;

    if (!packageId || !planType) {
      return next(new AppError(400, 'REQUIRED_FIELDS', 'packageId and planType are required'));
    }

    const upgradeResult = await createUpgradeOrder({
      companyId,
      packageId: Number(packageId),
      planType,
      actorId: req.user!.id,
    });

    return res.json(upgradeResult);
  } catch (error) {
    next(error);
  }
});

// POST /subscription/check-expiry-alerts (Protected: Super Admin manual trigger)
router.post('/check-expiry-alerts', authMiddleware, roleGuard('PRODUCT_SUPER_ADMIN'), async (req, res, next) => {
  try {
    const report = await checkAndSendExpiryAlerts();
    return res.json({
      success: true,
      message: `Checked expiring subscriptions: ${report.alertsSentCount} alerts delivered.`,
      report,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
