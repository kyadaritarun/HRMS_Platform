import prisma from '../lib/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';
import { createRazorpayPaymentLink, createRazorpayOrder, verifyPaymentSignature, getRazorpayKeyId } from '../lib/razorpay.js';
import { sendEmail } from '../lib/mailer.js';
import { logActivity } from './activityLog.js';
import { generateInvoiceNumber } from './billing.js';
import bcrypt from 'bcryptjs';

export interface SendPlanProposalParams {
  packageId: number;
  planType: 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  subdomain: string;
  customAmount?: number;
  customEmployeeLimit?: number;
  customFeatures?: string[];
  notes?: string;
  actorId?: number;
}

export async function sendPlanProposal(params: SendPlanProposalParams) {
  const pkg = await prisma.package.findUnique({
    where: { id: params.packageId },
  });

  if (!pkg) {
    throw new AppError(404, 'PACKAGE_NOT_FOUND', 'Selected package not found');
  }

  // Calculate pricing
  let amount = 0;
  if (params.customAmount && params.customAmount > 0) {
    amount = Number(params.customAmount);
  } else {
    if (params.planType === 'MONTHLY') amount = Number(pkg.priceMonthly || 999);
    else if (params.planType === 'QUARTERLY') amount = Number(pkg.priceQuarterly || 2799);
    else if (params.planType === 'YEARLY') amount = Number(pkg.priceYearly || 9999);
  }

  // Add 18% GST calculation display
  const subtotal = amount;
  const gst = Math.round(subtotal * 0.18 * 100) / 100;
  const totalAmount = subtotal + gst;

  // Clean subdomain
  const cleanSubdomain = params.subdomain
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

  // Check if company subdomain is already taken by an active company
  const existingCompany = await prisma.company.findFirst({
    where: { subdomain: cleanSubdomain },
  });
  if (existingCompany) {
    throw new AppError(400, 'SUBDOMAIN_EXISTS', `Subdomain "${cleanSubdomain}" is already registered`);
  }

  const internalOrderId = `prop_${Date.now()}_${Math.floor(Math.random() * 9000 + 1000)}`;

  // Create Razorpay payment link
  const rzpResult = await createRazorpayPaymentLink({
    amount: totalAmount,
    currency: 'INR',
    description: `Uptrix HRMS Subscription - ${pkg.name} (${params.planType})`,
    customer: {
      name: params.contactName || params.companyName,
      email: params.contactEmail,
      contact: params.contactPhone,
    },
    notes: {
      companyName: params.companyName,
      subdomain: cleanSubdomain,
      packageId: String(pkg.id),
      planType: params.planType,
    },
    orderIdRef: internalOrderId,
  });

  // Save Proposal Order
  const paymentOrder = await prisma.subscriptionPaymentOrder.create({
    data: {
      orderId: rzpResult.orderId,
      companyName: params.companyName,
      contactName: params.contactName,
      contactEmail: params.contactEmail.trim().toLowerCase(),
      contactPhone: params.contactPhone || '',
      subdomain: cleanSubdomain,
      packageId: pkg.id,
      planType: params.planType,
      amount: totalAmount,
      currency: 'INR',
      status: 'PENDING',
      paymentLinkUrl: rzpResult.paymentLinkUrl,
      isUpgrade: false,
      meta: {
        baseAmount: subtotal,
        gstAmount: gst,
        customEmployeeLimit: params.customEmployeeLimit || pkg.employeeLimit,
        customFeatures: params.customFeatures || pkg.enabledFeatures,
        proposalNotes: params.notes || '',
        sentBySuperAdminId: params.actorId || null,
      },
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days proposal validity
    },
    include: {
      package: true,
    },
  });

  // Prepare and send professional proposal email
  const featuresList = (params.customFeatures || (pkg.enabledFeatures as string[]) || [])
    .map((f) => `<li style="margin-bottom: 6px; color: #334155;">✓ ${f.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</li>`)
    .join('');

  const emailHtml = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #f1f5f9;">
        <h1 style="color: #5E4BE2; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">UPTRIX HRMS</h1>
        <p style="color: #64748b; font-size: 13px; margin-top: 4px;">Enterprise Workforce & Payroll Platform</p>
      </div>

      <div style="margin-bottom: 20px;">
        <h2 style="color: #0f172a; font-size: 18px; margin: 0 0 8px;">Hi ${params.contactName || params.companyName},</h2>
        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0;">
          Thank you for choosing Uptrix HRMS for <strong>${params.companyName}</strong>. Your customized platform proposal is ready for activation.
        </p>
      </div>

      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin-bottom: 22px;">
        <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">
          <strong style="color: #0f172a; font-size: 16px;">${pkg.name} (${params.planType})</strong>
          <span style="font-size: 18px; font-weight: 800; color: #5E4BE2;">₹${totalAmount.toLocaleString('en-IN')}</span>
        </div>
        
        <table style="width: 100%; font-size: 13px; color: #64748b; margin-bottom: 12px;">
          <tr><td>Company Subdomain:</td><td style="text-align: right; font-weight: 600; color: #0f172a;">${cleanSubdomain}.uptrix.io</td></tr>
          <tr><td>Employee Limit:</td><td style="text-align: right; font-weight: 600; color: #0f172a;">Up to ${params.customEmployeeLimit || pkg.employeeLimit} employees</td></tr>
          <tr><td>Plan Base Amount:</td><td style="text-align: right; color: #0f172a;">₹${subtotal.toLocaleString('en-IN')}</td></tr>
          <tr><td>GST (18%):</td><td style="text-align: right; color: #0f172a;">₹${gst.toLocaleString('en-IN')}</td></tr>
          <tr style="border-top: 1px dashed #cbd5e1; font-weight: 700; color: #0f172a;">
            <td style="padding-top: 6px;">Total Payable:</td>
            <td style="text-align: right; padding-top: 6px; color: #5E4BE2; font-size: 15px;">₹${totalAmount.toLocaleString('en-IN')}</td>
          </tr>
        </table>

        <div style="margin-top: 14px; pt-2; border-top: 1px solid #e2e8f0;">
          <p style="font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; margin: 8px 0;">Included Features:</p>
          <ul style="padding-left: 18px; margin: 0; font-size: 13px;">
            ${featuresList}
          </ul>
        </div>
      </div>

      <div style="text-align: center; margin: 28px 0;">
        <a href="${rzpResult.paymentLinkUrl}" target="_blank" style="background-color: #5E4BE2; color: #ffffff; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 12px rgba(94, 75, 226, 0.25);">
          Pay Now with Razorpay
        </a>
        <p style="color: #94a3b8; font-size: 12px; margin-top: 10px;">
          Supports UPI (GPay, PhonePe, Paytm), Credit/Debit Cards, Net Banking & Wallets.
        </p>
      </div>

      <div style="background-color: #f1f5f9; border-radius: 10px; padding: 14px; font-size: 12px; color: #475569; line-height: 1.5; margin-bottom: 20px;">
        <strong>Automatic Provisioning:</strong> As soon as your payment is confirmed, your organization account will be automatically provisioned, your administrator login credentials will be emailed to this address, and your official GST tax invoice will be issued instantly.
      </div>

      <div style="text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 14px;">
        Proposal ID: ${internalOrderId} • Valid for 14 days<br />
        Uptrix Cloud Solutions India Pvt. Ltd. • Financial District, Hyderabad, India
      </div>
    </div>
  `;

  await sendEmail({
    to: params.contactEmail,
    subject: `Plan Proposal & Payment Link for ${params.companyName} — Uptrix HRMS`,
    html: emailHtml,
    category: 'PROPOSAL',
    templateKey: 'PLAN_PROPOSAL',
  });

  return {
    success: true,
    paymentOrder,
  };
}

export async function processSuccessfulPayment(opts: {
  orderId: string;
  paymentId: string;
  paymentSignature?: string;
  paymentMethod?: string;
}) {
  const paymentOrder = await prisma.subscriptionPaymentOrder.findUnique({
    where: { orderId: opts.orderId },
    include: { package: true, company: true },
  });

  if (!paymentOrder) {
    throw new AppError(404, 'ORDER_NOT_FOUND', `Payment order ${opts.orderId} not found`);
  }

  if (paymentOrder.status === 'PAID') {
    return {
      success: true,
      alreadyProcessed: true,
      paymentOrder,
    };
  }

  // Verify signature if in live mode
  const isValidSignature = verifyPaymentSignature({
    orderId: opts.orderId,
    paymentId: opts.paymentId,
    signature: opts.paymentSignature,
  });

  if (!isValidSignature) {
    throw new AppError(400, 'INVALID_SIGNATURE', 'Razorpay payment signature verification failed');
  }

  const now = new Date();
  const pkg = paymentOrder.package;
  const meta = (paymentOrder.meta as any) || {};

  // Case A: Existing Company (Super Admin Onboarding Proposal OR Plan Upgrade)
  let existingCompany = null;
  if (paymentOrder.companyId) {
    existingCompany = await prisma.company.findUnique({
      where: { id: paymentOrder.companyId },
    });
  }
  if (!existingCompany && paymentOrder.subdomain) {
    existingCompany = await prisma.company.findFirst({
      where: { subdomain: paymentOrder.subdomain },
    });
  }

  if (existingCompany) {
    // Determine extension duration
    let extensionMonths = 1;
    if (paymentOrder.planType === 'QUARTERLY') extensionMonths = 3;
    if (paymentOrder.planType === 'YEARLY') extensionMonths = 12;

    const currentEnd = existingCompany.subEndDate && existingCompany.subEndDate > now ? existingCompany.subEndDate : now;
    const newSubEndDate = new Date(currentEnd);
    newSubEndDate.setMonth(newSubEndDate.getMonth() + extensionMonths);

    const currentSettings = (existingCompany.settings as Record<string, any>) || {};
    const updatedSettings = {
      ...currentSettings,
      paymentStatus: 'PAYMENT_DONE',
      lastPaidAt: now.toISOString(),
      lastPaymentOrderId: paymentOrder.orderId,
    };

    const result = await prisma.$transaction(async (tx) => {
      // 1. Update company subscription details and settings
      const updatedCompany = await tx.company.update({
        where: { id: existingCompany.id },
        data: {
          packageId: paymentOrder.packageId,
          planType: paymentOrder.planType,
          subAmount: paymentOrder.amount,
          subStartDate: now,
          subEndDate: newSubEndDate,
          subIsActive: true,
          nextPaymentDate: newSubEndDate,
          settings: updatedSettings,
        },
      });

      // 2. Generate Paid GST Tax Invoice
      const invoiceNumber = await generateInvoiceNumber(tx);
      const invoice = await tx.invoice.create({
        data: {
          companyId: existingCompany.id,
          invoiceNumber,
          amount: paymentOrder.amount,
          currency: paymentOrder.currency,
          billingCycle: paymentOrder.planType,
          periodStart: now,
          periodEnd: newSubEndDate,
          dueDate: now,
          status: 'PAID',
          paidAt: now,
          payment: {
            provider: 'RAZORPAY',
            reference: opts.paymentId,
            orderId: opts.orderId,
            method: opts.paymentMethod || 'Razorpay Gateway',
            itemDescription: `${pkg?.name || 'HRMS'} Subscription (${paymentOrder.planType})`,
          },
        },
      });

      // 3. Mark payment order as PAID
      const updatedOrder = await tx.subscriptionPaymentOrder.update({
        where: { id: paymentOrder.id },
        data: {
          status: 'PAID',
          paymentId: opts.paymentId,
          paidAt: now,
          invoiceId: invoice.id,
          companyId: existingCompany.id,
        },
      });

      return { updatedCompany, invoice, updatedOrder };
    });

    // Check if company admin exists
    const companyAdmin = await prisma.user.findFirst({
      where: { companyId: existingCompany.id, role: 'COMPANY_ADMIN', isActive: true },
    });

    if (companyAdmin) {
      await sendEmail({
        companyId: existingCompany.id,
        invoiceId: result.invoice.id,
        to: companyAdmin.email,
        subject: `Payment Confirmed — ${pkg?.name || 'HRMS'} Plan Active for ${existingCompany.name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 14px;">
            <h2 style="color: #5E4BE2; margin-top: 0;">Payment Received Successfully</h2>
            <p>Your subscription for <strong>${existingCompany.name}</strong> is now verified and active.</p>
            <div style="background-color: #f8fafc; padding: 14px; border-radius: 10px; margin: 16px 0;">
              <p style="margin: 4px 0;"><strong>Invoice Number:</strong> ${result.invoice.invoiceNumber}</p>
              <p style="margin: 4px 0;"><strong>Amount Paid:</strong> ₹${Number(paymentOrder.amount).toLocaleString('en-IN')}</p>
              <p style="margin: 4px 0;"><strong>Active Until:</strong> ${newSubEndDate.toLocaleDateString()}</p>
            </div>
            <p style="font-size: 13px; color: #64748b;">You can view and download your official GST tax receipt from Company &gt; Billing at any time.</p>
          </div>
        `,
        category: paymentOrder.isUpgrade ? 'UPGRADE' : 'PAYMENT',
      });
    } else {
      // Sent to contact email (Super Admin will provision the admin from Tenants & Companies page)
      await sendEmail({
        companyId: existingCompany.id,
        invoiceId: result.invoice.id,
        to: paymentOrder.contactEmail,
        subject: `Payment Confirmed — ${pkg?.name || 'HRMS'} Subscription for ${existingCompany.name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 14px;">
            <h2 style="color: #10b981; margin-top: 0;">✓ Payment Confirmed</h2>
            <p>Dear ${paymentOrder.contactName || 'Customer'},</p>
            <p>Thank you for subscribing to <strong>${existingCompany.name}</strong> on Uptrix HRMS Platform. We have received your payment of <strong>₹${Number(paymentOrder.amount).toLocaleString('en-IN')}</strong>.</p>
            <div style="background-color: #f8fafc; padding: 14px; border-radius: 10px; margin: 16px 0;">
              <p style="margin: 4px 0;"><strong>Invoice Number:</strong> ${result.invoice.invoiceNumber}</p>
              <p style="margin: 4px 0;"><strong>Plan:</strong> ${pkg?.name || 'HRMS'} (${paymentOrder.planType})</p>
              <p style="margin: 4px 0;"><strong>Valid Until:</strong> ${newSubEndDate.toLocaleDateString()}</p>
            </div>
            <p style="font-size: 13px; color: #64748b;">Your company payment status is now updated to <strong>Payment Done</strong>. Your administrator login credentials will be provisioned by the Super Administrator shortly.</p>
          </div>
        `,
        category: 'PAYMENT',
      });
    }

    return {
      success: true,
      isExistingCompany: true,
      isUpgrade: !!paymentOrder.isUpgrade,
      company: result.updatedCompany,
      invoice: result.invoice,
    };
  }

  // Case B: New Company Onboarding After Payment (Self-serve Public Registration)
  let baseCode = (paymentOrder.companyName || 'CMP').replace(/[^a-zA-Z0-9]/g, '').slice(0, 5).toUpperCase();
  if (!baseCode || baseCode.length < 2) baseCode = 'CMP';

  let code = baseCode;
  let codeExists = await prisma.company.findUnique({ where: { code } });
  while (codeExists) {
    code = `${baseCode.slice(0, 3)}${Math.floor(100 + Math.random() * 900)}`.toUpperCase();
    codeExists = await prisma.company.findUnique({ where: { code } });
  }

  let baseSub = (paymentOrder.subdomain || paymentOrder.companyName || 'org').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15);
  if (!baseSub) baseSub = 'workspace';

  let subdomain = baseSub;
  let subExists = await prisma.company.findFirst({ where: { subdomain } });
  while (subExists) {
    subdomain = `${baseSub}${Math.floor(10 + Math.random() * 90)}`;
    subExists = await prisma.company.findFirst({ where: { subdomain } });
  }

  let durationMonths = 1;
  if (paymentOrder.planType === 'QUARTERLY') durationMonths = 3;
  if (paymentOrder.planType === 'YEARLY') durationMonths = 12;

  const subEndDate = new Date(now);
  subEndDate.setMonth(subEndDate.getMonth() + durationMonths);

  const tempPassword = `Admin@${Math.floor(1000 + Math.random() * 9000)}`;
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  const newCompanyResult = await prisma.$transaction(async (tx) => {
    // 1. Create Company with guaranteed unique code & subdomain
    const company = await tx.company.create({
      data: {
        name: paymentOrder.companyName,
        code,
        subdomain,
        packageId: paymentOrder.packageId,
        planType: paymentOrder.planType,
        subAmount: paymentOrder.amount,
        subStartDate: now,
        subEndDate,
        nextPaymentDate: subEndDate,
        subIsActive: true,
        isActive: true,
        workingDays: 'mon,tue,wed,thu,fri',
        timezone: 'Asia/Kolkata',
        settings: {
          paymentStatus: 'PAYMENT_DONE',
        },
      },
    });

    // 2. Create / Link Initial Company Administrator User
    const adminEmail = paymentOrder.contactEmail.trim().toLowerCase();
    const existingUser = await tx.user.findFirst({
      where: {
        OR: [{ email: adminEmail }, { username: adminEmail }],
      },
    });

    let adminUser;
    if (existingUser) {
      adminUser = await tx.user.update({
        where: { id: existingUser.id },
        data: {
          role: 'COMPANY_ADMIN',
          companyId: company.id,
          isActive: true,
          passwordHash,
          phone: paymentOrder.contactPhone || existingUser.phone,
          firstName: paymentOrder.contactName || existingUser.firstName,
        },
      });
    } else {
      adminUser = await tx.user.create({
        data: {
          email: adminEmail,
          username: adminEmail,
          passwordHash,
          firstName: paymentOrder.contactName || 'Company',
          lastName: 'Admin',
          phone: paymentOrder.contactPhone || '',
          role: 'COMPANY_ADMIN',
          companyId: company.id,
          isActive: true,
          mustChangePassword: true,
        },
      });
    }

    // 3. Generate Paid Tax Invoice
    const invoiceNumber = await generateInvoiceNumber(tx);
    const invoice = await tx.invoice.create({
      data: {
        companyId: company.id,
        invoiceNumber,
        amount: paymentOrder.amount,
        currency: paymentOrder.currency,
        billingCycle: paymentOrder.planType,
        periodStart: now,
        periodEnd: subEndDate,
        dueDate: now,
        status: 'PAID',
        paidAt: now,
        payment: {
          provider: 'RAZORPAY',
          reference: opts.paymentId,
          orderId: opts.orderId,
          method: opts.paymentMethod || 'Razorpay Gateway',
          itemDescription: `New Platform Subscription - ${pkg?.name || 'HRMS'} (${paymentOrder.planType})`,
        },
      },
    });

    // 4. Update Payment Order
    const updatedOrder = await tx.subscriptionPaymentOrder.update({
      where: { id: paymentOrder.id },
      data: {
        status: 'PAID',
        paymentId: opts.paymentId,
        paidAt: now,
        companyId: company.id,
        invoiceId: invoice.id,
      },
    });

    return { company, adminUser, invoice, updatedOrder };
  });

  // Send Welcome Email with Credentials + Invoice Details
  const portalUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`;

  await sendEmail({
    companyId: newCompanyResult.company.id,
    invoiceId: newCompanyResult.invoice.id,
    to: paymentOrder.contactEmail,
    subject: `Welcome to ${newCompanyResult.company.name} — Your Uptrix HRMS Administrator Credentials & Tax Invoice`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #f1f5f9;">
          <h1 style="color: #5E4BE2; margin-size: 24px; font-weight: 800;">UPTRIX HRMS</h1>
          <p style="color: #64748b; font-size: 13px; margin-top: 4px;">Account Provisioning & Onboarding Confirmation</p>
        </div>

        <div style="margin-bottom: 20px;">
          <h2 style="color: #0f172a; font-size: 18px; margin: 0 0 8px;">Welcome, ${paymentOrder.contactName || 'Administrator'}!</h2>
          <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0;">
            Your payment of <strong>₹${Number(paymentOrder.amount).toLocaleString('en-IN')}</strong> was confirmed. Your dedicated company workspace has been successfully created and configured.
          </p>
        </div>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin-bottom: 22px;">
          <h3 style="color: #0f172a; font-size: 15px; margin: 0 0 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
            Your Administrator Login Credentials
          </h3>
          <table style="width: 100%; font-size: 13px; color: #475569;">
            <tr><td style="padding: 4px 0;">Workspace URL:</td><td style="text-align: right; font-weight: 700; color: #5E4BE2;">${subdomain}.uptrix.io</td></tr>
            <tr><td style="padding: 4px 0;">Admin Email / Username:</td><td style="text-align: right; font-weight: 700; color: #0f172a;">${paymentOrder.contactEmail}</td></tr>
            <tr><td style="padding: 4px 0;">Temporary Password:</td><td style="text-align: right; font-family: monospace; font-size: 14px; font-weight: 700; color: #e11d48; background: #ffe4e6; padding: 2px 8px; border-radius: 4px; display: inline-block;">${tempPassword}</td></tr>
            <tr><td style="padding: 4px 0;">Active Plan:</td><td style="text-align: right; font-weight: 600; color: #0f172a;">${pkg?.name || 'HRMS'} (${paymentOrder.planType})</td></tr>
            <tr><td style="padding: 4px 0;">Tax Invoice Number:</td><td style="text-align: right; font-mono font-bold color: #0f172a;">${newCompanyResult.invoice.invoiceNumber}</td></tr>
          </table>
        </div>

        <div style="text-align: center; margin: 28px 0;">
          <a href="${portalUrl}" target="_blank" style="background-color: #5E4BE2; color: #ffffff; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 15px; display: inline-block;">
            Sign In to Your Workspace
          </a>
          <p style="color: #94a3b8; font-size: 12px; margin-top: 10px;">
            You will be prompted to choose a new password upon your first sign in.
          </p>
        </div>

        <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 10px; padding: 12px; font-size: 12px; color: #065f46; margin-bottom: 18px;">
          ✓ <strong>Tax Invoice Issued:</strong> Your official GST tax receipt has been generated. You can access it anytime under Company &gt; Billing.
        </div>

        <div style="text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 14px;">
          Uptrix HRMS Platform • Dedicated Cloud Tenant: ${subdomain}
        </div>
      </div>
    `,
    category: 'ONBOARDING',
  });

  return {
    success: true,
    company: newCompanyResult.company,
    invoice: newCompanyResult.invoice,
  };
}

export async function createUpgradeOrder(opts: {
  companyId: number;
  packageId: number;
  planType: 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  actorId: number;
}) {
  const company = await prisma.company.findUnique({
    where: { id: opts.companyId },
    include: { package: true },
  });

  if (!company) {
    throw new AppError(404, 'COMPANY_NOT_FOUND', 'Company not found');
  }

  const pkg = await prisma.package.findUnique({
    where: { id: opts.packageId },
  });

  if (!pkg) {
    throw new AppError(404, 'PACKAGE_NOT_FOUND', 'Target package not found');
  }

  let amount = 0;
  if (opts.planType === 'MONTHLY') amount = Number(pkg.priceMonthly || 999);
  else if (opts.planType === 'QUARTERLY') amount = Number(pkg.priceQuarterly || 2799);
  else if (opts.planType === 'YEARLY') amount = Number(pkg.priceYearly || 9999);

  const subtotal = amount;
  const gst = Math.round(subtotal * 0.18 * 100) / 100;
  const totalAmount = subtotal + gst;

  const internalOrderId = `upg_${Date.now()}_${Math.floor(Math.random() * 9000 + 1000)}`;

  // Find company admin email
  const adminUser = await prisma.user.findFirst({
    where: { companyId: company.id, role: 'COMPANY_ADMIN', isActive: true },
  });

  const contactEmail = adminUser?.email || 'admin@' + company.subdomain + '.com';
  const contactName = `${adminUser?.firstName || company.name} ${adminUser?.lastName || ''}`.trim();

  const rzpResult = await createRazorpayPaymentLink({
    amount: totalAmount,
    currency: 'INR',
    description: `Upgrade to ${pkg.name} (${opts.planType}) for ${company.name}`,
    customer: {
      name: contactName,
      email: contactEmail,
    },
    notes: {
      isUpgrade: 'true',
      companyId: String(company.id),
      packageId: String(pkg.id),
      planType: opts.planType,
    },
    orderIdRef: internalOrderId,
  });

  const paymentOrder = await prisma.subscriptionPaymentOrder.create({
    data: {
      orderId: rzpResult.orderId,
      companyName: company.name,
      contactName,
      contactEmail,
      subdomain: company.subdomain,
      packageId: pkg.id,
      planType: opts.planType,
      amount: totalAmount,
      currency: 'INR',
      status: 'PENDING',
      paymentLinkUrl: rzpResult.paymentLinkUrl,
      companyId: company.id,
      isUpgrade: true,
      meta: {
        baseAmount: subtotal,
        gstAmount: gst,
        requestedByUserId: opts.actorId,
      },
      expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days validity
    },
    include: { package: true },
  });

  return {
    success: true,
    orderId: paymentOrder.orderId,
    paymentLinkUrl: paymentOrder.paymentLinkUrl,
    amount: totalAmount,
    package: pkg,
    keyId: getRazorpayKeyId(),
  };
}

export async function checkAndSendExpiryAlerts() {
  const now = new Date();
  const tenDaysFromNow = new Date();
  tenDaysFromNow.setDate(tenDaysFromNow.getDate() + 10);
  tenDaysFromNow.setHours(23, 59, 59, 999);

  // Find all active companies expiring in the next 10 days
  const expiringCompanies = await prisma.company.findMany({
    where: {
      isActive: true,
      subIsActive: true,
      subEndDate: {
        gte: now,
        lte: tenDaysFromNow,
      },
    },
    include: {
      package: true,
      users: {
        where: { role: 'COMPANY_ADMIN', isActive: true },
        select: { id: true, email: true, firstName: true, lastName: true },
      },
    },
  });

  let alertsSentCount = 0;
  const processedCompanies = [];

  for (const company of expiringCompanies) {
    // Only send if no alert was sent in the last 4 days
    if (company.lastExpiryAlertSentAt) {
      const daysSinceLastAlert = (now.getTime() - new Date(company.lastExpiryAlertSentAt).getTime()) / (1000 * 3600 * 24);
      if (daysSinceLastAlert < 4) {
        continue;
      }
    }

    const expiryDate = company.subEndDate ? new Date(company.subEndDate) : now;
    const daysRemaining = Math.max(0, Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 3600 * 24)));

    const admin = company.users[0];
    if (admin && admin.email) {
      // 1. Send Email Alert
      await sendEmail({
        companyId: company.id,
        to: admin.email,
        subject: `Urgent: Your Uptrix HRMS Subscription Expires in ${daysRemaining} Days`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #fecdd3; border-radius: 14px; background-color: #fff1f2;">
            <div style="background-color: #ffffff; padding: 20px; border-radius: 12px; border: 1px solid #fda4af;">
              <h2 style="color: #e11d48; margin-top: 0;">Subscription Expiring in ${daysRemaining} Days</h2>
              <p style="color: #334155; font-size: 14px; line-height: 1.6;">
                Dear ${admin.firstName || 'Administrator'},<br />
                The HRMS subscription for <strong>${company.name}</strong> (${company.package?.name || 'Standard Plan'}) is scheduled to expire on <strong>${expiryDate.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}</strong>.
              </p>
              
              <div style="background-color: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin: 16px 0; font-size: 13px;">
                <p style="margin: 4px 0;"><strong>Company Subdomain:</strong> ${company.subdomain}</p>
                <p style="margin: 4px 0;"><strong>Current Plan:</strong> ${company.package?.name || 'Active Plan'}</p>
                <p style="margin: 4px 0;"><strong>Days Left:</strong> ${daysRemaining} days remaining</p>
              </div>

              <p style="color: #64748b; font-size: 13px;">
                To avoid any interruption in employee biometric clock-ins, leave approvals, and payroll processing, please renew or upgrade your plan now.
              </p>

              <div style="text-align: center; margin: 20px 0;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/company/billing" target="_blank" style="background-color: #5E4BE2; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 14px; display: inline-block;">
                  Renew or Upgrade Subscription
                </a>
              </div>
            </div>
          </div>
        `,
        category: 'EXPIRY_ALERT',
        templateKey: 'TEN_DAY_EXPIRY_ALERT',
      });

      // 2. Create in-app Notification
      await prisma.notification.create({
        data: {
          companyId: company.id,
          userId: admin.id,
          kind: 'SYSTEM',
          title: `Subscription Expiring in ${daysRemaining} Days`,
          message: `Your ${company.package?.name || 'HRMS'} subscription will expire on ${expiryDate.toLocaleDateString()}. Please renew in Company > Billing.`,
          sourceType: 'Subscription',
        },
      });

      // 3. Update last alert timestamp
      await prisma.company.update({
        where: { id: company.id },
        data: { lastExpiryAlertSentAt: now },
      });

      alertsSentCount++;
      processedCompanies.push({ id: company.id, name: company.name, daysRemaining, email: admin.email });
    }
  }

  return {
    alertsSentCount,
    processedCompanies,
  };
}
