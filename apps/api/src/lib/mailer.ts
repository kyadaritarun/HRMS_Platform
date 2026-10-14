import nodemailer from 'nodemailer';
import prisma from './prisma.js';

interface SendMailOptions {
  companyId?: number;
  invoiceId?: number;
  to: string;
  subject: string;
  html: string;
  cc?: string;
  bcc?: string;
  category?: string;
  templateKey?: string;
}

const smtpHost = process.env.SMTP_HOST || process.env.EMAIL_HOST || 'smtp.office365.com';
const smtpPort = Number(process.env.SMTP_PORT || process.env.EMAIL_PORT) || 587;
const smtpUser = process.env.SMTP_USER || process.env.EMAIL_HOST_USER || '';
const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_HOST_PASSWORD || '';
const smtpFrom = process.env.SMTP_FROM || process.env.DEFAULT_FROM_EMAIL || 'Uptrix <alerts@uptrix.io>';

const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: process.env.SMTP_SECURE === 'true' || process.env.EMAIL_USE_SSL === 'true',
  auth:
    smtpUser && smtpPass
      ? {
          user: smtpUser,
          pass: smtpPass,
        }
      : undefined,
  tls: {
    ciphers: 'SSLv3',
    rejectUnauthorized: false,
  },
});

export async function sendEmail(opts: SendMailOptions): Promise<{ success: boolean; error?: string }> {
  try {
    if (smtpUser && smtpPass) {
      await transporter.sendMail({
        from: smtpFrom,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
        cc: opts.cc,
        bcc: opts.bcc,
      });
    } else {
      console.log(`[Email Simulation] To: ${opts.to} | Subject: ${opts.subject}`);
    }

    // Record in EmailLog table if database is accessible
    try {
      await prisma.emailLog.create({
        data: {
          companyId: opts.companyId,
          invoiceId: opts.invoiceId,
          subject: opts.subject,
          toEmail: opts.to,
          cc: opts.cc || '',
          bcc: opts.bcc || '',
          bodyHtml: opts.html,
          category: opts.category || 'SYSTEM',
          templateKey: opts.templateKey || '',
          status: 'SENT',
          sentAt: new Date(),
        },
      });
    } catch {
      // Ignore DB write error during decoupled testing
    }

    return { success: true };
  } catch (err: any) {
    console.error('[Email Error]', err.message);
    try {
      await prisma.emailLog.create({
        data: {
          companyId: opts.companyId,
          invoiceId: opts.invoiceId,
          subject: opts.subject,
          toEmail: opts.to,
          cc: opts.cc || '',
          bcc: opts.bcc || '',
          bodyHtml: opts.html,
          category: opts.category || 'SYSTEM',
          templateKey: opts.templateKey || '',
          status: 'FAILED',
          errorMessage: err.message,
        },
      });
    } catch {}
    return { success: false, error: err.message };
  }
}
