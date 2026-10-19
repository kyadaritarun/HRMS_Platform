import Razorpay from 'razorpay';
import crypto from 'crypto';

const keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_mockSandboxKey101';
const keySecret = process.env.RAZORPAY_KEY_SECRET || 'mockSandboxSecretKey202';
const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'mockWebhookSecretKey303';
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

// Check if live credentials or sandbox mock
export const isMockRazorpay = !keyId || keyId.includes('mock') || !keySecret || keySecret.includes('mock');

let razorpayClient: Razorpay | null = null;
if (!isMockRazorpay) {
  try {
    razorpayClient = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  } catch (err) {
    console.warn('[Razorpay] Failed to initialize live Razorpay instance, defaulting to mock mode:', err);
  }
}

export interface CreatePaymentLinkParams {
  amount: number; // in INR
  currency?: string;
  description: string;
  customer: {
    name: string;
    email: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  orderIdRef?: string;
}

export async function createRazorpayPaymentLink(params: CreatePaymentLinkParams): Promise<{
  orderId: string;
  paymentLinkUrl: string;
  isMock: boolean;
}> {
  const currency = params.currency || 'INR';
  const amountInPaise = Math.round(params.amount * 100);
  const internalRef = params.orderIdRef || `sub_${Date.now()}_${Math.floor(Math.random() * 9000 + 1000)}`;

  if (razorpayClient && !isMockRazorpay) {
    try {
      const response = await (razorpayClient as any).paymentLink.create({
        amount: amountInPaise,
        currency,
        accept_partial: false,
        description: params.description,
        customer: {
          name: params.customer.name,
          email: params.customer.email,
          contact: params.customer.contact || '',
        },
        notify: {
          sms: Boolean(params.customer.contact),
          email: true,
        },
        reminder_enable: true,
        notes: {
          ...params.notes,
          internalRef,
        },
        callback_url: `${frontendUrl}/checkout/pay?orderId=${internalRef}`,
        callback_method: 'get',
      });

      return {
        orderId: response.id || internalRef,
        paymentLinkUrl: response.short_url || `${frontendUrl}/checkout/pay?orderId=${internalRef}`,
        isMock: false,
      };
    } catch (err: any) {
      console.error('[Razorpay API Error] Fallback to sandbox link:', err?.error?.description || err?.message);
    }
  }

  // Sandbox / Test Mode Link
  return {
    orderId: internalRef,
    paymentLinkUrl: `${frontendUrl}/checkout/pay?orderId=${internalRef}`,
    isMock: true,
  };
}

export async function createRazorpayOrder(amount: number, currency = 'INR', receipt?: string, notes?: Record<string, string>) {
  const amountInPaise = Math.round(amount * 100);
  const receiptId = receipt || `rec_${Date.now()}`;

  if (razorpayClient && !isMockRazorpay) {
    try {
      const order = await razorpayClient.orders.create({
        amount: amountInPaise,
        currency,
        receipt: receiptId,
        notes: notes || {},
      });
      return {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
        isMock: false,
      };
    } catch (err: any) {
      console.error('[Razorpay Order Error]', err);
    }
  }

  // Mock order for sandbox
  return {
    id: `order_mock_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    amount: amountInPaise,
    currency,
    receipt: receiptId,
    isMock: true,
  };
}

export function verifyPaymentSignature(opts: {
  orderId: string;
  paymentId: string;
  signature?: string;
}): boolean {
  if (isMockRazorpay) {
    // In mock/sandbox mode, any signature or mock confirmation is valid
    return true;
  }
  if (!opts.signature) return false;

  const generatedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(`${opts.orderId}|${opts.paymentId}`)
    .digest('hex');

  return generatedSignature === opts.signature;
}

export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  if (isMockRazorpay) return true;
  if (!signature || !webhookSecret) return false;

  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');

  return expectedSignature === signature;
}

export const getRazorpayKeyId = () => keyId;
