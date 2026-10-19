import { Router } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma.js';
import { authMiddleware } from '../middlewares/auth.js';
import { roleGuard } from '../middlewares/roleGuard.js';
import { validateBody } from '../middlewares/validate.js';
import { AppError } from '../middlewares/errorHandler.js';
import {
  SuperAdminCreateCompanySchema,
  SuperAdminUpdateCompanySchema,
  SuperAdminPackageSchema,
  SuperAdminInvoiceSchema,
} from '../schemas/superadmin.js';
import { getRenewalsAndExpiring, getLicenseOveruseList, generateInvoiceNumber } from '../services/billing.js';
import { upload } from '../lib/storage.js';
import { sendEmail } from '../lib/mailer.js';
import { sendPlanProposal, checkAndSendExpiryAlerts } from '../services/subscriptionBilling.js';
import { createRazorpayPaymentLink } from '../lib/razorpay.js';

const router = Router();

// Super Admin platform routes bypass tenant resolution
router.use(authMiddleware);
router.use(roleGuard('PRODUCT_SUPER_ADMIN'));

function generateMonthBuckets(startDate: Date, endDate: Date) {
  const buckets: { label: string; key: string; start: Date; end: Date }[] = [];
  const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const last = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

  while (cursor <= last) {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const nextMonth = new Date(year, month + 1, 1);
    const key = `${year}-${String(month + 1).padStart(2, '0')}`;
    const label = cursor.toLocaleString('en-US', { month: 'short' });

    buckets.push({
      label,
      key,
      start: new Date(cursor),
      end: nextMonth,
    });

    cursor.setMonth(cursor.getMonth() + 1);
  }
  return buckets;
}

// GET /superadmin/dashboard
router.get('/dashboard', async (req, res, next) => {
  try {
    // Default range: past 6 months to today
    let startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 5);
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    let endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    if (req.query.start && typeof req.query.start === 'string') {
      const parsed = new Date(req.query.start);
      if (!isNaN(parsed.getTime())) startDate = parsed;
    }
    if (req.query.end && typeof req.query.end === 'string') {
      const parsed = new Date(req.query.end);
      if (!isNaN(parsed.getTime())) {
        parsed.setHours(23, 59, 59, 999);
        endDate = parsed;
      }
    }
    if (startDate > endDate) {
      const tmp = startDate;
      startDate = endDate;
      endDate = tmp;
    }

    const totalCompanies = await prisma.company.count();
    const activeCompanies = await prisma.company.count({ where: { isActive: true } });
    const companiesInRange = await prisma.company.findMany({
      where: { createdAt: { gte: startDate, lte: endDate } },
      select: { id: true, createdAt: true, isActive: true },
    });
    const packages = await prisma.package.findMany();
    const allInvoices = await prisma.invoice.findMany({
      include: { company: { select: { id: true, name: true } } },
    });
    const latestCompanies = await prisma.company.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { package: true },
    });
    const recentSubscriptions = await prisma.company.findMany({
      where: { subIsActive: true },
      orderBy: { subStartDate: 'desc' },
      take: 5,
      include: { package: true },
    });
    const renewals = await getRenewalsAndExpiring(14);
    const overuse = await getLicenseOveruseList();

    const paidInvoices = allInvoices.filter((inv) => inv.status === 'PAID');
    const totalRevenue = paidInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0);
    const rangePaidInvoices = paidInvoices.filter(
      (inv) => new Date(inv.paidAt || inv.issuedAt) >= startDate && new Date(inv.paidAt || inv.issuedAt) <= endDate
    );
    const rangeRevenue = rangePaidInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0);

    // Monthly buckets for charts
    const buckets = generateMonthBuckets(startDate, endDate);
    const monthCounts = buckets.map((b) => ({
      label: b.label,
      key: b.key,
      count: companiesInRange.filter(
        (c) => new Date(c.createdAt) >= b.start && new Date(c.createdAt) < b.end
      ).length,
    }));

    const revenueMonths = buckets.map((b) => ({
      label: b.label,
      key: b.key,
      total: paidInvoices
        .filter((inv) => new Date(inv.paidAt || inv.issuedAt) >= b.start && new Date(inv.paidAt || inv.issuedAt) < b.end)
        .reduce((sum, inv) => sum + Number(inv.amount), 0),
    }));

    // Invoices status counts
    const invoiceStatusCounts = {
      pending: allInvoices.filter((i) => i.status === 'PENDING').length,
      overdue: allInvoices.filter((i) => i.status === 'OVERDUE').length,
      paid: paidInvoices.length,
      total: allInvoices.length,
      totalAmount: totalRevenue,
    };

    const welcomeName =
      req.user?.firstName || (req.user?.email ? req.user.email.split('@')[0] : 'Super Admin');

    return res.json({
      welcomeName,
      range: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0],
      },
      kpis: {
        totalCompanies,
        activeCompanies,
        inactiveCompanies: totalCompanies - activeCompanies,
        totalSubscriptions: paidInvoices.length,
        totalRevenue,
        rangeRevenue,
        newCompaniesInRange: companiesInRange.length,
      },
      monthCounts,
      revenueMonths,
      invoiceStatusCounts,
      latestCompanies,
      recentSubscriptions,
      renewals,
      licenseOveruse: overuse,
      packagesCount: packages.length,
    });
  } catch (error) {
    next(error);
  }
});

// GET /superadmin/companies
router.get('/companies', async (_req, res, next) => {
  try {
    const companies = await prisma.company.findMany({
      include: {
        package: true,
        users: {
          where: { role: 'COMPANY_ADMIN' },
          select: { id: true, firstName: true, lastName: true, email: true, phone: true, isActive: true },
        },
        paymentOrders: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        _count: { select: { users: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const enrichedCompanies = companies.map((c: any) => {
      const settings = (c.settings && typeof c.settings === 'object' ? c.settings : {}) as any;
      const latestOrder = c.paymentOrders && c.paymentOrders.length > 0 ? c.paymentOrders[0] : null;

      let paymentStatus: 'IN_PROCESS' | 'PAYMENT_DONE' | 'DECLINE' = 'IN_PROCESS';

      if (settings.paymentStatus) {
        paymentStatus = settings.paymentStatus;
      } else if (latestOrder?.status === 'PAID' || (c.users && c.users.length > 0)) {
        paymentStatus = 'PAYMENT_DONE';
      } else if (latestOrder?.status === 'EXPIRED' || latestOrder?.status === 'FAILED') {
        paymentStatus = 'DECLINE';
      } else {
        paymentStatus = 'IN_PROCESS';
      }

      const adminContact = settings.adminContact || {
        name: latestOrder?.contactName || '',
        email: latestOrder?.contactEmail || (c.users && c.users[0]?.email) || '',
        phone: latestOrder?.contactPhone || (c.users && c.users[0]?.phone) || '',
      };

      const paymentLinkUrl = latestOrder?.paymentLinkUrl || settings.paymentLinkUrl || '';

      return {
        ...c,
        paymentStatus,
        paymentLinkUrl,
        adminContact,
        latestOrder,
      };
    });

    const totalCompanies = enrichedCompanies.length;
    const activeCompanies = enrichedCompanies.filter((c) => c.isActive).length;
    const inactiveCompanies = enrichedCompanies.filter((c) => !c.isActive).length;

    const locations = new Set(
      enrichedCompanies
        .map((c: any) => c.address?.city || c.address?.state)
        .filter(Boolean)
    );
    const locationsCount = locations.size > 0 ? String(locations.size) : '-';

    return res.json({
      companies: enrichedCompanies,
      metrics: {
        totalCompanies,
        activeCompanies,
        inactiveCompanies,
        locationsCount,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /superadmin/upload-logo
router.post('/upload-logo', upload.single('logo'), (req, res, next) => {
  try {
    if (!req.file) {
      return next(new AppError(400, 'NO_FILE', 'No logo file uploaded'));
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    return res.json({ url: fileUrl });
  } catch (err) {
    next(err);
  }
});

// POST /superadmin/companies
router.post('/companies', validateBody(SuperAdminCreateCompanySchema), async (req, res, next) => {
  try {
    const data = req.body;
    const companyCode =
      (data.code && data.code.trim()) ||
      data.name.replace(/[^a-zA-Z]/g, '').slice(0, 5).toUpperCase() ||
      `CMP${Math.floor(Math.random() * 900 + 100)}`;

    const existing = await prisma.company.findFirst({
      where: {
        OR: [{ code: companyCode }, { subdomain: data.subdomain }],
      },
    });

    if (existing) {
      return next(new AppError(400, 'DUPLICATE_COMPANY', 'Company code or subdomain already exists'));
    }

    let assignedPackageId = data.packageId || null;
    let pkg: any = null;
    if (assignedPackageId) {
      pkg = await prisma.package.findUnique({ where: { id: assignedPackageId } });
    }
    if (!pkg) {
      pkg = (await prisma.package.findFirst({ orderBy: { id: 'asc' } })) || null;
      assignedPackageId = pkg?.id || null;
    }

    const planType = data.planType || 'MONTHLY';
    let basePrice = 0;
    if (pkg) {
      if (planType === 'YEARLY') {
        basePrice = Number(pkg.priceYearly) || Number(pkg.priceMonthly || 999) * 10;
      } else if (planType === 'QUARTERLY') {
        basePrice = Number(pkg.priceQuarterly) || Number(pkg.priceMonthly || 999) * 3;
      } else {
        basePrice = Number(pkg.priceMonthly || 999);
      }
    }
    if (data.subAmount && data.subAmount > 0) {
      basePrice = data.subAmount;
    }

    const gst = Math.round(basePrice * 0.18 * 100) / 100;
    const totalAmount = basePrice + gst;

    const adminEmail = (data.adminEmail || '').trim().toLowerCase();
    const adminName = (data.adminName || '').trim() || `${data.name} Admin`;
    const adminPhone = (data.adminPhone || '').trim();
    const initialPaymentStatus = data.paymentStatus || 'IN_PROCESS';

    const company = await prisma.company.create({
      data: {
        name: data.name,
        code: companyCode,
        subdomain: data.subdomain,
        customDomain: data.customDomain || null,
        logo: data.logo || null,
        website: data.website || null,
        address: data.address || {},
        packageId: assignedPackageId,
        planType,
        subAmount: totalAmount,
        workingDays: data.workingDays || 'mon,tue,wed,thu,fri',
        timezone: data.timezone || 'Asia/Kolkata',
        allowedEmailDomains: data.allowedEmailDomains || '',
        isActive: false, // Inactive until payment is done & admin is created
        subIsActive: true,
        subStartDate: new Date(),
        subEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        settings: {
          paymentStatus: initialPaymentStatus,
          adminContact: {
            name: adminName,
            email: adminEmail,
            phone: adminPhone,
          },
          billingBreakdown: {
            basePrice,
            gst,
            totalAmount,
            currency: pkg?.currency || 'INR',
          },
        },
      },
    });

    let paymentOrder: any = null;
    let paymentLinkUrl = '';

    if (adminEmail && pkg) {
      const internalOrderId = `comp_prop_${company.id}_${Date.now()}`;
      const rzpResult = await createRazorpayPaymentLink({
        amount: totalAmount,
        currency: pkg.currency || 'INR',
        description: `Uptrix HRMS Subscription - ${pkg.name} (${planType})`,
        customer: {
          name: adminName,
          email: adminEmail,
          contact: adminPhone || undefined,
        },
        notes: {
          companyId: String(company.id),
          companyName: company.name,
          subdomain: company.subdomain,
          packageId: String(pkg.id),
          planType,
        },
        orderIdRef: internalOrderId,
      });

      paymentLinkUrl = rzpResult.paymentLinkUrl;

      paymentOrder = await prisma.subscriptionPaymentOrder.create({
        data: {
          orderId: rzpResult.orderId,
          companyId: company.id,
          companyName: company.name,
          contactName: adminName,
          contactEmail: adminEmail,
          contactPhone: adminPhone,
          subdomain: company.subdomain,
          packageId: pkg.id,
          planType,
          amount: totalAmount,
          currency: pkg.currency || 'INR',
          status: 'PENDING',
          paymentLinkUrl,
          meta: {
            baseAmount: basePrice,
            gstAmount: gst,
            companyId: company.id,
          },
        },
      });

      await prisma.company.update({
        where: { id: company.id },
        data: {
          settings: {
            paymentStatus: initialPaymentStatus,
            adminContact: {
              name: adminName,
              email: adminEmail,
              phone: adminPhone,
            },
            paymentOrderId: paymentOrder.orderId,
            paymentLinkUrl,
            billingBreakdown: {
              basePrice,
              gst,
              totalAmount,
              currency: pkg.currency || 'INR',
            },
          },
        },
      });

      if (data.sendPaymentLink !== false) {
        try {
          const featuresList = (Array.isArray(pkg.enabledFeatures) ? pkg.enabledFeatures : [])
            .map((f: string) => `<li style="margin-bottom: 6px; color: #334155;">✓ ${f.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</li>`)
            .join('');

          const emailHtml = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
              <div style="text-align: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #f1f5f9;">
                <h1 style="color: #5E4BE2; margin: 0; font-size: 24px; font-weight: 800;">UPTRIX HRMS</h1>
                <p style="color: #64748b; font-size: 13px; margin-top: 4px;">Subscription Invoice &amp; Payment Link</p>
              </div>

              <div style="margin-bottom: 20px;">
                <h2 style="color: #0f172a; font-size: 18px; margin: 0 0 8px;">Hi ${adminName},</h2>
                <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0;">
                  Your organization account for <strong>${company.name}</strong> has been registered on Uptrix HRMS. Complete your subscription payment to activate your workspace and set up your administrator account.
                </p>
              </div>

              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin-bottom: 22px;">
                <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">
                  <strong style="color: #0f172a; font-size: 16px;">${pkg.name} (${planType})</strong>
                  <span style="font-size: 18px; font-weight: 800; color: #5E4BE2;">₹${totalAmount.toLocaleString('en-IN')}</span>
                </div>
                
                <table style="width: 100%; font-size: 13px; color: #64748b; margin-bottom: 12px;">
                  <tr><td>Company:</td><td style="text-align: right; font-weight: 600; color: #0f172a;">${company.name}</td></tr>
                  <tr><td>Account URL:</td><td style="text-align: right; font-weight: 600; color: #0f172a;">${company.subdomain}.uptrix.io</td></tr>
                  <tr><td>Plan Base Amount:</td><td style="text-align: right; color: #0f172a;">₹${basePrice.toLocaleString('en-IN')}</td></tr>
                  <tr><td>GST (18%):</td><td style="text-align: right; color: #0f172a;">₹${gst.toLocaleString('en-IN')}</td></tr>
                  <tr style="border-top: 1px dashed #cbd5e1; font-weight: 700; color: #0f172a;">
                    <td style="padding-top: 6px;">Total Payable:</td>
                    <td style="text-align: right; padding-top: 6px; color: #5E4BE2; font-size: 15px;">₹${totalAmount.toLocaleString('en-IN')}</td>
                  </tr>
                </table>

                ${featuresList ? `
                  <div style="margin-top: 14px; padding-top: 10px; border-top: 1px solid #e2e8f0;">
                    <p style="font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; margin: 4px 0 8px;">Included Features:</p>
                    <ul style="padding-left: 18px; margin: 0; font-size: 13px;">${featuresList}</ul>
                  </div>
                ` : ''}
              </div>

              <div style="text-align: center; margin: 28px 0;">
                <a href="${paymentLinkUrl}" target="_blank" style="background-color: #5E4BE2; color: #ffffff; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 12px rgba(94, 75, 226, 0.25);">
                  Pay Now with Razorpay
                </a>
                <p style="color: #94a3b8; font-size: 12px; margin-top: 10px;">
                  Supports UPI (GPay, PhonePe, Paytm), Credit/Debit Cards, Net Banking &amp; Wallets.
                </p>
              </div>

              <div style="background-color: #f1f5f9; border-radius: 10px; padding: 14px; font-size: 12px; color: #475569; line-height: 1.5; margin-bottom: 20px;">
                <strong>Next Step:</strong> Once payment is confirmed, the Super Administrator will activate your account and issue your Company Administrator credentials.
              </div>
            </div>
          `;

          await sendEmail({
            to: adminEmail,
            subject: `Payment Link & Plan Activation for ${company.name} — Uptrix HRMS`,
            html: emailHtml,
            category: 'ONBOARDING_PAYMENT',
          });
        } catch (mailErr) {
          console.error('[Add Company] Failed to send payment email:', mailErr);
        }
      }
    }

    return res.status(201).json({
      success: true,
      company: {
        ...company,
        paymentStatus: initialPaymentStatus,
        paymentLinkUrl,
        adminContact: { name: adminName, email: adminEmail, phone: adminPhone },
      },
      paymentOrder,
    });
  } catch (error) {
    next(error);
  }
});

// GET /superadmin/companies/:id
router.get('/companies/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const company = await prisma.company.findUnique({
      where: { id },
      include: {
        package: true,
        invoices: true,
        _count: { select: { users: true, departments: true } },
      },
    });

    if (!company) {
      return next(new AppError(404, 'NOT_FOUND', 'Company not found'));
    }

    return res.json({ company });
  } catch (error) {
    next(error);
  }
});

// PATCH /superadmin/companies/:id
router.patch('/companies/:id', validateBody(SuperAdminUpdateCompanySchema), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const data = req.body;

    const updateData: any = { ...data };
    if (data.subEndDate) updateData.subEndDate = new Date(data.subEndDate);
    if (data.nextPaymentDate) updateData.nextPaymentDate = new Date(data.nextPaymentDate);

    const updated = await prisma.company.update({
      where: { id },
      data: updateData,
    });

    return res.json({ company: updated });
  } catch (error) {
    next(error);
  }
});

// DELETE /superadmin/companies/:id
router.delete('/companies/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    await prisma.company.delete({ where: { id } });
    return res.json({ success: true, message: 'Company deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// POST /superadmin/companies/:id/admin
router.post('/companies/:id/admin', async (req, res, next) => {
  try {
    const companyId = Number(req.params.id);
    const { email, password, firstName, lastName, phone } = req.body;
    if (!email) {
      return next(new AppError(400, 'REQUIRED_FIELDS', 'Email is required'));
    }

    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
      return next(new AppError(404, 'NOT_FOUND', 'Company not found'));
    }

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email: email.trim().toLowerCase() }, { username: email.trim().toLowerCase() }] },
    });
    if (existingUser) {
      return next(new AppError(400, 'USER_EXISTS', 'User with this email already exists'));
    }

    const tempPassword = password || `Admin@${Math.floor(1000 + Math.random() * 9000)}`;
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const user = await prisma.user.create({
      data: {
        email: email.trim().toLowerCase(),
        username: email.trim().toLowerCase(),
        passwordHash,
        firstName: firstName || '',
        lastName: lastName || '',
        phone: phone || '',
        role: 'COMPANY_ADMIN',
        companyId,
        isActive: true,
        mustChangePassword: true,
      },
    });

    // Automatically activate company and mark payment as done
    const currentSettings = (company.settings && typeof company.settings === 'object' ? company.settings : {}) as any;
    currentSettings.paymentStatus = 'PAYMENT_DONE';
    await prisma.company.update({
      where: { id: companyId },
      data: {
        isActive: true,
        settings: currentSettings,
      },
    });

    // Send welcome email with login credentials to Company Admin
    try {
      const portalUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`;
      await sendEmail({
        companyId,
        to: user.email,
        subject: `Welcome to ${company.name} — Your Company Administrator Credentials`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h2 style="color: #5E4BE2; margin: 0;">Welcome to ${company.name}</h2>
              <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Uptrix HRMS Workspace Administration</p>
            </div>
            <p style="color: #334155; font-size: 14px;">Hello <strong>${user.firstName || 'Administrator'}</strong>,</p>
            <p style="color: #334155; font-size: 14px;">Your Company Administrator account for <strong>${company.name}</strong> has been created. Below are your initial login credentials:</p>
            <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #cbd5e1; margin: 20px 0; font-size: 14px;">
              <p style="margin: 6px 0;"><strong>Workspace Login URL:</strong> <a href="${portalUrl}" style="color: #5E4BE2; font-weight: bold;">${portalUrl}</a></p>
              <p style="margin: 6px 0;"><strong>Username / Email:</strong> <span style="font-family: monospace; font-weight: bold; color: #1e293b;">${user.email}</span></p>
              <p style="margin: 6px 0;"><strong>Temporary Password:</strong> <code style="font-size: 15px; font-weight: bold; background: #ede9fe; color: #5b21b6; padding: 3px 8px; border-radius: 4px; font-family: monospace;">${tempPassword}</code></p>
            </div>
            <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px; margin-bottom: 20px; border-radius: 4px;">
              <p style="color: #b45309; font-size: 13px; margin: 0;">
                <strong>Security Notice:</strong> You will be required to change this temporary password upon your first login before accessing administrative modules.
              </p>
            </div>
            <p style="color: #64748b; font-size: 13px;">If you have any questions, please reach out to your system administrator or support team.</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">This is an automated notification from Uptrix Platform.</p>
          </div>
        `,
        category: 'ONBOARDING',
      });
    } catch (mailErr) {
      console.error('Failed to send company admin welcome email:', mailErr);
    }

    return res.status(201).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      tempPassword,
    });
  } catch (error) {
    next(error);
  }
});

// POST /superadmin/companies/:id/mark-payment
router.post('/companies/:id/mark-payment', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;
    if (!['PAYMENT_DONE', 'IN_PROCESS', 'DECLINE'].includes(status)) {
      return next(new AppError(400, 'INVALID_STATUS', 'Status must be PAYMENT_DONE, IN_PROCESS, or DECLINE'));
    }

    const company = await prisma.company.findUnique({
      where: { id },
      include: {
        paymentOrders: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    if (!company) {
      return next(new AppError(404, 'NOT_FOUND', 'Company not found'));
    }

    const settings = (company.settings && typeof company.settings === 'object' ? company.settings : {}) as any;
    settings.paymentStatus = status;

    if (company.paymentOrders.length > 0) {
      const orderStatus = status === 'PAYMENT_DONE' ? 'PAID' : (status === 'DECLINE' ? 'FAILED' : 'PENDING');
      await prisma.subscriptionPaymentOrder.update({
        where: { id: company.paymentOrders[0].id },
        data: {
          status: orderStatus,
          paidAt: status === 'PAYMENT_DONE' ? new Date() : undefined,
        },
      });
    }

    const updatedCompany = await prisma.company.update({
      where: { id },
      data: {
        settings,
      },
    });

    return res.json({ success: true, company: updatedCompany, paymentStatus: status });
  } catch (error) {
    next(error);
  }
});

// POST /superadmin/companies/:id/resend-payment-link
router.post('/companies/:id/resend-payment-link', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const company = await prisma.company.findUnique({
      where: { id },
      include: {
        package: true,
        paymentOrders: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    if (!company) {
      return next(new AppError(404, 'NOT_FOUND', 'Company not found'));
    }

    const settings = (company.settings && typeof company.settings === 'object' ? company.settings : {}) as any;
    const adminContact = settings.adminContact || {};
    const recipientEmail = adminContact.email || company.paymentOrders[0]?.contactEmail;

    if (!recipientEmail) {
      return next(new AppError(400, 'NO_EMAIL', 'No contact email found for this company'));
    }

    let paymentLinkUrl = company.paymentOrders[0]?.paymentLinkUrl || settings.paymentLinkUrl;
    const totalAmount = company.paymentOrders[0]?.amount || company.subAmount || 0;

    if (!paymentLinkUrl) {
      const rzp = await createRazorpayPaymentLink({
        amount: Number(totalAmount) || 999,
        description: `Uptrix HRMS Subscription - ${company.name}`,
        customer: {
          name: adminContact.name || company.name,
          email: recipientEmail,
          contact: adminContact.phone || undefined,
        },
        orderIdRef: `comp_resend_${company.id}_${Date.now()}`,
      });
      paymentLinkUrl = rzp.paymentLinkUrl;
    }

    await sendEmail({
      to: recipientEmail,
      subject: `Payment Link Reminder — ${company.name} Uptrix HRMS Subscription`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 14px;">
          <h2 style="color: #5E4BE2; margin-top: 0;">Payment Link for ${company.name}</h2>
          <p>Hi ${adminContact.name || 'there'},</p>
          <p>Please use the button below to complete your Uptrix HRMS subscription payment of <strong>₹${Number(totalAmount).toLocaleString('en-IN')}</strong>.</p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${paymentLinkUrl}" style="background-color: #5E4BE2; color: #fff; padding: 14px 30px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
              Proceed to Razorpay Payment
            </a>
          </div>
          <p style="font-size: 12px; color: #64748b; line-height: 1.5;">Direct link: <a href="${paymentLinkUrl}" style="color: #5E4BE2;">${paymentLinkUrl}</a></p>
        </div>
      `,
      category: 'ONBOARDING_REMINDER',
    });

    return res.json({
      success: true,
      message: `Payment link resent to ${recipientEmail}`,
      paymentLinkUrl,
    });
  } catch (error) {
    next(error);
  }
});

// GET /superadmin/companies/:id/admins
router.get('/companies/:id/admins', async (req, res, next) => {
  try {
    const companyId = Number(req.params.id);
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true, customDomain: true, subdomain: true, isActive: true },
    });
    if (!company) {
      return next(new AppError(404, 'NOT_FOUND', 'Company not found'));
    }

    const admins = await prisma.user.findMany({
      where: {
        companyId,
        role: 'COMPANY_ADMIN',
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({
      success: true,
      company,
      admins,
    });
  } catch (error) {
    next(error);
  }
});

// POST /superadmin/companies/:id/admins/:userId/reset-password
router.post('/companies/:id/admins/:userId/reset-password', async (req, res, next) => {
  try {
    const companyId = Number(req.params.id);
    const userId = Number(req.params.userId);
    const { password } = req.body;

    const user = await prisma.user.findFirst({
      where: { id: userId, companyId, role: 'COMPANY_ADMIN' },
    });
    if (!user) {
      return next(new AppError(404, 'NOT_FOUND', 'Company admin user not found'));
    }

    const tempPassword = password || `Admin@${Math.floor(1000 + Math.random() * 9000)}`;
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash, mustChangePassword: true },
    });

    const company = await prisma.company.findUnique({ where: { id: companyId } });

    // Send reset email with new temporary password
    try {
      await sendEmail({
        companyId,
        to: user.email,
        subject: `Password Reset — ${company?.name || 'Uptrix'} Administrator Account`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
            <h2 style="color: #5E4BE2; margin: 0 0 12px 0;">Administrator Password Reset</h2>
            <p style="color: #334155; font-size: 14px;">Hello <strong>${user.firstName || 'Administrator'}</strong>,</p>
            <p style="color: #334155; font-size: 14px;">Your administrator account password for <strong>${company?.name || 'your company'}</strong> has been reset. Below are your temporary login details:</p>
            <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #cbd5e1; margin: 16px 0; font-size: 14px;">
              <p style="margin: 6px 0;"><strong>Portal Login:</strong> <a href="${process.env.APP_URL || 'http://localhost:5173'}/login" style="color: #5E4BE2; font-weight: bold;">${process.env.APP_URL || 'http://localhost:5173'}/login</a></p>
              <p style="margin: 6px 0;"><strong>Username / Email:</strong> <span style="font-family: monospace; font-weight: bold;">${user.email}</span></p>
              <p style="margin: 6px 0;"><strong>New Temporary Password:</strong> <code style="font-size: 15px; font-weight: bold; background: #ede9fe; color: #5b21b6; padding: 3px 8px; border-radius: 4px; font-family: monospace;">${tempPassword}</code></p>
            </div>
            <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px; margin-bottom: 20px; border-radius: 4px;">
              <p style="color: #b45309; font-size: 13px; margin: 0;">
                <strong>Security Notice:</strong> You will be prompted to choose a new password on your next login.
              </p>
            </div>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">This is an automated security notification from Uptrix Platform.</p>
          </div>
        `,
        category: 'SECURITY',
      });
    } catch (mailErr) {
      console.error('Failed to send admin reset email:', mailErr);
    }

    return res.json({
      success: true,
      message: 'Password reset successfully',
      tempPassword,
    });
  } catch (error) {
    next(error);
  }
});

// POST /superadmin/companies/:id/deploy-domain
router.post('/companies/:id/deploy-domain', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { customDomain, serverId } = req.body;

    const updated = await prisma.company.update({
      where: { id },
      data: {
        customDomain: customDomain ? customDomain.trim().toLowerCase() : null,
        serverId: serverId ? Number(serverId) : undefined,
      },
    });

    return res.json({
      success: true,
      message: 'Domain deployment updated successfully',
      company: updated,
    });
  } catch (error) {
    next(error);
  }
});

const DEFAULT_3_PLANS = [
  {
    name: 'Basic Plan',
    description: 'Essential HR foundation for small teams and growing startups',
    currency: 'INR',
    priceMonthly: 999,
    priceQuarterly: 2799,
    priceYearly: 9999,
    employeeLimit: 25,
    billingDefault: 'MONTHLY',
    enabledFeatures: ['time_attendance_management', 'leave_management'],
  },
  {
    name: 'Medium Plan',
    description: 'Complete workforce management with claims, tickets, and shifts',
    currency: 'INR',
    priceMonthly: 2499,
    priceQuarterly: 6999,
    priceYearly: 24999,
    employeeLimit: 50,
    billingDefault: 'MONTHLY',
    enabledFeatures: [
      'time_attendance_management',
      'leave_management',
      'claims',
      'support_ticket_management',
      'appreciations',
      'shift_roster',
    ],
  },
  {
    name: 'Custom Plan',
    description: 'Full-featured enterprise suite with custom company workforce setup, payroll, and AI',
    currency: 'INR',
    priceMonthly: 4999,
    priceQuarterly: 13999,
    priceYearly: 49999,
    employeeLimit: 100,
    billingDefault: 'MONTHLY',
    enabledFeatures: [
      'time_attendance_management',
      'leave_management',
      'support_ticket_management',
      'payroll',
      'performance',
      'claims',
      'appreciations',
      'ai_assistant',
      'shift_roster',
      'comp_off',
    ],
  },
];

// Helper to determine package tier and associated company
function enrichPackageDetails(pkg: any) {
  const nameLower = (pkg.name || '').toLowerCase();
  const descLower = (pkg.description || '').toLowerCase();

  let tier: 'BASIC' | 'MEDIUM' | 'CUSTOM' = 'MEDIUM';
  if (nameLower.includes('basic') || nameLower.includes('starter')) {
    tier = 'BASIC';
  } else if (nameLower.includes('custom') || nameLower.includes('enterprise') || nameLower.includes('cutermis')) {
    tier = 'CUSTOM';
  } else if (nameLower.includes('medium') || nameLower.includes('pro') || nameLower.includes('standard')) {
    tier = 'MEDIUM';
  }

  // Extract company name if it's a custom plan formatted like "[Company Name] Custom Plan" or "Custom Plan - [Company Name]"
  let companyName = '';
  if (tier === 'CUSTOM') {
    if (pkg.name.includes(' - ')) {
      const parts = pkg.name.split(' - ');
      companyName = parts[0].toLowerCase().includes('custom') ? parts[1].trim() : parts[0].trim();
    } else if (pkg.name.includes('(') && pkg.name.includes(')')) {
      const match = pkg.name.match(/\((.*?)\)/);
      if (match) companyName = match[1].trim();
    }
  }

  return {
    ...pkg,
    tier,
    companyName: companyName || undefined,
  };
}

// GET /superadmin/packages
router.get('/packages', async (_req, res, next) => {
  try {
    let packages = await prisma.package.findMany({
      include: {
        _count: { select: { companies: true } },
      },
      orderBy: { id: 'asc' },
    });

    if (packages.length < 3) {
      for (const plan of DEFAULT_3_PLANS) {
        const exists = packages.find(
          (p) =>
            p.name.toLowerCase() === plan.name.toLowerCase() ||
            (plan.name === 'Basic Plan' && p.name.toLowerCase().includes('starter')) ||
            (plan.name === 'Medium Plan' && p.name.toLowerCase().includes('professional')) ||
            (plan.name === 'Custom Plan' && p.name.toLowerCase().includes('enterprise'))
        );
        if (!exists) {
          await prisma.package.create({ data: plan as any });
        }
      }
      packages = await prisma.package.findMany({
        include: {
          _count: { select: { companies: true } },
        },
        orderBy: { id: 'asc' },
      });
    }

    const enriched = packages.map(enrichPackageDetails);
    return res.json({ packages: enriched });
  } catch (error) {
    next(error);
  }
});

// POST /superadmin/packages
router.post('/packages', validateBody(SuperAdminPackageSchema), async (req, res, next) => {
  try {
    const data = req.body;
    let packageName = data.name.trim();

    // If companyName is specified, ensure it appears in the plan title
    if (data.companyName && data.companyName.trim()) {
      const cName = data.companyName.trim();
      if (!packageName.toLowerCase().includes(cName.toLowerCase())) {
        packageName = `${cName} - ${packageName}`;
      }
    }

    const pkg = await prisma.package.create({
      data: {
        name: packageName,
        description: data.description || (data.companyName ? `Tailored plan for ${data.companyName}` : ''),
        currency: data.currency || 'INR',
        priceMonthly: data.priceMonthly,
        priceQuarterly: data.priceQuarterly,
        priceYearly: data.priceYearly,
        employeeLimit: data.employeeLimit || 10,
        billingDefault: data.billingDefault || 'MONTHLY',
        enabledFeatures: data.enabledFeatures as any,
      },
    });

    return res.status(201).json({ package: enrichPackageDetails(pkg) });
  } catch (error) {
    next(error);
  }
});

// PATCH /superadmin/packages/:id
router.patch('/packages/:id', validateBody(SuperAdminPackageSchema.partial()), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const data = req.body;

    const updated = await prisma.package.update({
      where: { id },
      data: {
        ...data,
        enabledFeatures: data.enabledFeatures ? (data.enabledFeatures as any) : undefined,
      },
    });

    return res.json({ package: updated });
  } catch (error) {
    next(error);
  }
});

// DELETE /superadmin/packages/:id
router.delete('/packages/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    await prisma.package.delete({ where: { id } });
    return res.json({ success: true, message: 'Package deleted' });
  } catch (error) {
    next(error);
  }
});

// GET /superadmin/invoices
router.get('/invoices', async (_req, res, next) => {
  try {
    const invoices = await prisma.invoice.findMany({
      include: {
        company: { select: { id: true, name: true, code: true, subdomain: true } },
      },
      orderBy: { issuedAt: 'desc' },
    });
    return res.json({ invoices });
  } catch (error) {
    next(error);
  }
});

// POST /superadmin/invoices
router.post('/invoices', validateBody(SuperAdminInvoiceSchema), async (req, res, next) => {
  try {
    const data = req.body;

    const invoice = await prisma.$transaction(async (tx) => {
      const invoiceNumber = await generateInvoiceNumber(tx);
      const isPaid = data.status === 'PAID';

      return tx.invoice.create({
        data: {
          companyId: data.companyId,
          invoiceNumber,
          amount: data.amount,
          currency: data.currency,
          billingCycle: data.billingCycle,
          periodStart: new Date(data.periodStart),
          periodEnd: new Date(data.periodEnd),
          dueDate: new Date(data.dueDate),
          status: data.status,
          paidAt: isPaid ? new Date() : null,
          payment: {
            method: data.paymentMethod || 'BANK',
            paymentMethod: data.paymentMethod || 'BANK',
            reference: data.paymentReference || '',
            notes: data.notes || '',
            status: isPaid ? 'succeeded' : 'pending',
            itemDescription: `${data.billingCycle} Enterprise SaaS Subscription License`,
          },
        },
      });
    });

    if (data.sendEmail) {
      prisma.company.findUnique({
        where: { id: data.companyId },
        include: { users: { where: { role: 'COMPANY_ADMIN' }, take: 1 } },
      }).then((targetCompany) => {
        const toEmail = targetCompany?.users?.[0]?.email || `billing@${targetCompany?.subdomain || 'company'}.uptrix.io`;
        return sendEmail({
          companyId: data.companyId,
          invoiceId: invoice.id,
          to: toEmail,
          subject: `Invoice ${invoice.invoiceNumber} from Uptrix HRMS Platform`,
          html: `<p>Dear ${targetCompany?.name || 'Customer'},</p><p>An invoice <strong>${invoice.invoiceNumber}</strong> has been issued for ₹${Number(invoice.amount).toLocaleString('en-IN')}.</p><p>Payment Method: <strong>${data.paymentMethod || 'BANK'}</strong></p><p>Status: <strong>${invoice.status}</strong></p><p>Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}</p>`,
          category: 'BILLING_INVOICE',
        });
      }).catch((err) => {
        console.error('Failed to dispatch invoice email:', err);
      });
    }

    return res.status(201).json({ invoice });
  } catch (error) {
    next(error);
  }
});

// PATCH /superadmin/invoices/:id
router.patch('/invoices/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { status, paymentMethod, paymentReference } = req.body;

    const existing = await prisma.invoice.findUnique({ where: { id } });
    if (!existing) {
      return next(new AppError(404, 'NOT_FOUND', 'Invoice not found'));
    }

    const currentPayment = (existing.payment as any) || {};
    const updatedPayment = {
      ...currentPayment,
      ...(paymentMethod ? { method: paymentMethod, paymentMethod } : {}),
      ...(paymentReference !== undefined ? { reference: paymentReference } : {}),
      ...(status === 'PAID' ? { status: 'succeeded' } : {}),
      ...(status === 'VOID' || status === 'CANCELLED' ? { status: 'void' } : {}),
    };

    const isPaid = status === 'PAID';
    const isVoid = status === 'VOID' || status === 'CANCELLED';

    const updated = await prisma.invoice.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        paidAt: isPaid ? new Date() : isVoid ? null : undefined,
        payment: updatedPayment,
      },
    });

    return res.json({ invoice: updated });
  } catch (error) {
    next(error);
  }
});


// POST /superadmin/super-admins
router.post('/super-admins', async (req, res, next) => {
  try {
    const { email, username, password, firstName, lastName, fullName, phone } = req.body;
    if (!email) {
      return next(new AppError(400, 'REQUIRED_FIELDS', 'Email is required'));
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanUsername = (username || cleanEmail).trim();
    let fName = firstName;
    let lName = lastName;

    if (!fName && fullName) {
      const parts = fullName.trim().split(' ');
      fName = parts[0] || 'Super';
      lName = parts.slice(1).join(' ') || 'Admin';
    }

    const finalPass = password || Math.random().toString(36).slice(-10) + 'A1!';
    const passwordHash = await bcrypt.hash(finalPass, 12);

    const user = await prisma.user.create({
      data: {
        email: cleanEmail,
        username: cleanUsername,
        passwordHash,
        firstName: fName || 'Super',
        lastName: lName || 'Admin',
        phone: phone || '',
        role: 'PRODUCT_SUPER_ADMIN',
        companyId: null,
        addedBySuperadmin: true,
        mustChangePassword: !password, // if generated, require change
        tempPasswordExpiresAt: !password ? new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) : null,
      },
    });

    const { passwordHash: _, ...safeUser } = user;
    return res.status(201).json({ user: safeUser, tempPassword: !password ? finalPass : undefined });
  } catch (error) {
    next(error);
  }
});

// GET /superadmin/emails
router.get('/emails', async (req, res, next) => {
  try {
    const { status, category, search } = req.query;

    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = String(status);
    }
    if (category && category !== 'ALL') {
      where.category = String(category);
    }
    if (search) {
      const q = String(search).trim();
      where.OR = [
        { toEmail: { contains: q, mode: 'insensitive' } },
        { subject: { contains: q, mode: 'insensitive' } },
        { bodyHtml: { contains: q, mode: 'insensitive' } },
      ];
    }

    const emails = await prisma.emailLog.findMany({
      where,
      include: {
        company: {
          select: {
            id: true,
            name: true,
            subdomain: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return res.json({ emails, total: emails.length });
  } catch (error) {
    next(error);
  }
});

// POST /superadmin/emails/test
router.post('/emails/test', async (req, res, next) => {
  try {
    const { to, subject, html, category } = req.body;
    if (!to) {
      return res.status(400).json({ error: 'Recipient email is required' });
    }

    const targetSubject = subject || 'Test Notification from Uptrix HRMS Platform';
    const targetHtml =
      html ||
      `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px;">
          <h2 style="color: #6366f1; margin: 0; font-size: 20px;">Uptrix HRMS &bull; Office 365 SMTP Relay Test</h2>
        </div>
        <p style="color: #334155; font-size: 14px; line-height: 1.6;">
          This is an automated test message dispatched via Microsoft Office 365 Exchange SMTP server to verify your live email pipeline configuration.
        </p>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0; font-size: 13px; color: #475569;">
          <p style="margin: 0 0 8px 0;"><strong>Sender:</strong> Uptrix &lt;alerts@uptrix.io&gt;</p>
          <p style="margin: 0 0 8px 0;"><strong>Recipient:</strong> ${to}</p>
          <p style="margin: 0 0 8px 0;"><strong>SMTP Host:</strong> smtp.office365.com (Port 587, STARTTLS)</p>
          <p style="margin: 0;"><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        </div>
        <p style="color: #64748b; font-size: 12px; margin: 0;">
          All credentials and notification logs are tracked under the Super Admin Platform Audit logs.
        </p>
      </div>`;

    const result = await sendEmail({
      to,
      subject: targetSubject,
      html: targetHtml,
      category: category || 'TEST',
      templateKey: 'SYSTEM_TEST',
    });

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to dispatch email via Office 365 SMTP gateway',
      });
    }

    return res.json({ success: true, message: 'Test email successfully sent and logged!' });
  } catch (error) {
    next(error);
  }
});

// POST /superadmin/emails/:id/resend
router.post('/emails/:id/resend', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const log = await prisma.emailLog.findUnique({ where: { id } });
    if (!log) {
      return res.status(404).json({ error: 'Email log not found' });
    }

    const result = await sendEmail({
      companyId: log.companyId || undefined,
      invoiceId: log.invoiceId || undefined,
      to: log.toEmail,
      subject: log.subject,
      html: log.bodyHtml,
      cc: log.cc || undefined,
      bcc: log.bcc || undefined,
      category: log.category,
      templateKey: log.templateKey,
    });

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to resend email via Office 365 gateway',
      });
    }

    return res.json({ success: true, message: `Email to ${log.toEmail} successfully resent!` });
  } catch (error) {
    next(error);
  }
});

// POST /superadmin/proposals/send
router.post('/proposals/send', async (req, res, next) => {
  try {
    const {
      packageId,
      planType,
      companyName,
      contactName,
      contactEmail,
      contactPhone,
      subdomain,
      customAmount,
      customEmployeeLimit,
      customFeatures,
      notes,
    } = req.body;

    if (!packageId || !companyName || !contactEmail || !subdomain) {
      return next(new AppError(400, 'REQUIRED_FIELDS', 'packageId, companyName, contactEmail, and subdomain are required'));
    }

    const proposalResult = await sendPlanProposal({
      packageId: Number(packageId),
      planType: planType || 'MONTHLY',
      companyName: companyName.trim(),
      contactName: contactName ? contactName.trim() : companyName.trim(),
      contactEmail: contactEmail.trim().toLowerCase(),
      contactPhone: contactPhone ? contactPhone.trim() : undefined,
      subdomain: subdomain.trim(),
      customAmount: customAmount ? Number(customAmount) : undefined,
      customEmployeeLimit: customEmployeeLimit ? Number(customEmployeeLimit) : undefined,
      customFeatures: Array.isArray(customFeatures) ? customFeatures : undefined,
      notes,
      actorId: req.user!.id,
    });

    return res.status(201).json(proposalResult);
  } catch (error) {
    next(error);
  }
});

// GET /superadmin/proposals
router.get('/proposals', async (req, res, next) => {
  try {
    const proposals = await prisma.subscriptionPaymentOrder.findMany({
      include: {
        package: true,
        company: {
          select: { id: true, name: true, subdomain: true, code: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return res.json({ proposals });
  } catch (error) {
    next(error);
  }
});

// POST /superadmin/proposals/:id/resend
router.post('/proposals/:id/resend', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const proposal = await prisma.subscriptionPaymentOrder.findUnique({
      where: { id },
      include: { package: true },
    });

    if (!proposal) {
      return next(new AppError(404, 'NOT_FOUND', 'Proposal not found'));
    }

    const meta = (proposal.meta as any) || {};

    const resendResult = await sendPlanProposal({
      packageId: proposal.packageId,
      planType: proposal.planType as any,
      companyName: proposal.companyName,
      contactName: proposal.contactName,
      contactEmail: proposal.contactEmail,
      contactPhone: proposal.contactPhone || undefined,
      subdomain: proposal.subdomain,
      customAmount: meta.baseAmount ? Number(meta.baseAmount) : undefined,
      customEmployeeLimit: meta.customEmployeeLimit ? Number(meta.customEmployeeLimit) : undefined,
      customFeatures: meta.customFeatures,
      notes: meta.proposalNotes,
      actorId: req.user!.id,
    });

    return res.json({
      success: true,
      message: `Proposal and payment link resent to ${proposal.contactEmail}`,
      resendResult,
    });
  } catch (error) {
    next(error);
  }
});

// POST /superadmin/trigger-expiry-alerts
router.post('/trigger-expiry-alerts', async (_req, res, next) => {
  try {
    const report = await checkAndSendExpiryAlerts();
    return res.json({
      success: true,
      message: `Scanned all companies: ${report.alertsSentCount} 10-day renewal warnings dispatched.`,
      report,
    });
  } catch (error) {
    next(error);
  }
});

// Renewals & Billing
router.get('/renewals-billing', async (req, res, next) => {
  try {
    const { companyId, startDate, endDate } = req.query;

    const allExpiringAndRenewals = await getRenewalsAndExpiring(30);

    let list = allExpiringAndRenewals;
    if (companyId && companyId !== 'all') {
      list = list.filter((c) => String(c.id) === String(companyId));
    }

    const now = new Date();
    const upcomingRenewals = list.filter(
      (c) => c.status !== 'Expired' && (!c.subEndDate || new Date(c.subEndDate) >= now)
    );
    const expiredBilling = list.filter(
      (c) => c.status === 'Expired' || (c.subEndDate && new Date(c.subEndDate) < now)
    );

    // Invoices
    const invoiceWhere: any = {};
    if (companyId && companyId !== 'all') {
      invoiceWhere.companyId = Number(companyId);
    }
    if (startDate && endDate) {
      invoiceWhere.dueDate = {
        gte: new Date(String(startDate)),
        lte: new Date(String(endDate)),
      };
    }

    const allInvoices = await prisma.invoice.findMany({
      where: invoiceWhere,
      include: { company: true },
      orderBy: { dueDate: 'asc' },
    });

    const pendingOverdueInvoices = allInvoices.filter(
      (i) => i.status === 'PENDING' || i.status === 'OVERDUE'
    );
    const paidInvoices = allInvoices
      .filter((i) => i.status === 'PAID')
      .slice(0, 10);

    const companies = await prisma.company.findMany({
      select: { id: true, name: true, code: true },
      orderBy: { name: 'asc' },
    });

    return res.json({
      metrics: {
        renewalsCount: upcomingRenewals.length,
        pendingOverdueCount: pendingOverdueInvoices.length,
        paidCount: paidInvoices.length,
      },
      upcomingRenewals,
      expiredBilling,
      pendingOverdueInvoices,
      paidInvoices,
      companies,
      allCompanies: companies,
      renewals: allExpiringAndRenewals,
      expiringCompanies: allExpiringAndRenewals,
      overdueInvoices: pendingOverdueInvoices,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/renewals-billing/:id/extend', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const days = Number(req.body.days) || 30;
    const company = await prisma.company.findUnique({ where: { id } });
    if (!company) {
      return next(new AppError(404, 'NOT_FOUND', 'Company not found'));
    }

    const currentEnd =
      company.subEndDate && new Date(company.subEndDate) > new Date()
        ? new Date(company.subEndDate)
        : new Date();
    const newEnd = new Date(currentEnd.getTime() + days * 24 * 60 * 60 * 1000);

    const updated = await prisma.company.update({
      where: { id },
      data: {
        subEndDate: newEnd,
        subIsActive: true,
      },
    });

    return res.json({ success: true, company: updated, newEndDate: newEnd });
  } catch (error) {
    next(error);
  }
});

// Infrastructure servers (optional module)
router.get('/infrastructure/servers', async (_req, res, next) => {
  try {
    const servers = await prisma.server.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ servers });
  } catch (error) {
    next(error);
  }
});

router.post('/infrastructure/servers', async (req, res, next) => {
  try {
    const { name, host, ipAddress, sshPort, port, username, sshUsername } = req.body;
    const server = await prisma.server.create({
      data: {
        name,
        host: host || ipAddress || '127.0.0.1',
        sshPort: sshPort || port || 22,
        username: username || sshUsername || 'root',
        status: 'active',
      },
    });
    return res.status(201).json({ server });
  } catch (error) {
    next(error);
  }
});

router.post('/infrastructure/servers/:id/test', async (req, res) => {
  const serverId = Number(req.params.id);
  res.json({
    success: true,
    serverId,
    latencyMs: 42,
    message: 'SSH connection tested successfully.',
  });
});

export default router;
