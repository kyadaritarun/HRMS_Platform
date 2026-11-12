import { Request } from 'express';

export interface WelcomeEmailParams {
  recipientName: string;
  email: string;
  temporaryPassword: string;
  companyName: string;
  companyLogo?: string | null;
  loginUrl: string;
  roleTitle?: string;
  isResent?: boolean;
  mustChangePassword?: boolean;
  expiresInHours?: number;
  supportEmail?: string;
}

export interface PasswordResetNoticeParams {
  recipientName: string;
  email: string;
  temporaryPassword: string;
  companyName: string;
  companyLogo?: string | null;
  loginUrl: string;
  roleTitle?: string;
}

/**
 * Dynamically resolves the base URL of the deployed frontend web application.
 * Priority:
 * 1. Explicit production APP_URL (if configured and not localhost)
 * 2. Origin header from incoming browser request (e.g. https://hrms.tarunkyadari.in)
 * 3. Referer header from incoming browser request
 * 4. Company custom domain (e.g. https://xyz.com)
 * 5. Explicit production FRONTEND_URL
 * 6. X-Forwarded-Host or Host header (if not localhost)
 * 7. APP_DOMAIN environment variable
 * 8. Production fallback (https://hrms.tarunkyadari.in) when in production mode
 * 9. Localhost fallback (http://localhost:3000) for local development
 */
export function resolveAppUrl(
  req?: Request | any,
  company?: { customDomain?: string | null; subdomain?: string | null } | null
): string {
  // 1. Explicit production APP_URL env
  const envAppUrl = process.env.APP_URL?.trim();
  if (envAppUrl && !envAppUrl.includes('localhost') && !envAppUrl.includes('127.0.0.1')) {
    return envAppUrl.replace(/\/$/, '');
  }

  // 2. Incoming Origin header from browser (highest accuracy for deployed frontend)
  const origin =
    req?.headers?.origin ||
    (typeof req?.get === 'function' ? req.get('origin') : undefined);
  if (origin && typeof origin === 'string' && origin !== 'null' && origin !== 'undefined') {
    return origin.trim().replace(/\/$/, '');
  }

  // 3. Incoming Referer header
  const referer =
    req?.headers?.referer ||
    (typeof req?.get === 'function' ? req.get('referer') : undefined);
  if (referer && typeof referer === 'string' && referer !== 'null') {
    try {
      const parsed = new URL(referer);
      return `${parsed.protocol}//${parsed.host}`;
    } catch {
      // ignore
    }
  }

  // 4. Company custom domain if set
  if (company?.customDomain && typeof company.customDomain === 'string' && company.customDomain.trim()) {
    const domain = company.customDomain.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
    return `https://${domain}`;
  }

  // 5. Explicit production FRONTEND_URL env
  const envFrontendUrl = process.env.FRONTEND_URL?.trim();
  if (envFrontendUrl && !envFrontendUrl.includes('localhost') && !envFrontendUrl.includes('127.0.0.1')) {
    return envFrontendUrl.replace(/\/$/, '');
  }

  // 6. X-Forwarded-Host or Host header
  const host =
    req?.headers?.['x-forwarded-host'] ||
    (typeof req?.get === 'function' ? req.get('x-forwarded-host') || req.get('host') : req?.headers?.host);
  if (host && typeof host === 'string' && !host.includes('localhost') && !host.includes('127.0.0.1')) {
    const proto =
      req?.headers?.['x-forwarded-proto'] ||
      (typeof req?.get === 'function' ? req.get('x-forwarded-proto') : undefined) ||
      (req?.secure ? 'https' : 'https');
    return `${proto}://${host.split(',')[0].trim()}`.replace(/\/$/, '');
  }

  // 7. APP_DOMAIN environment variable (e.g. hrms.tarunkyadari.in)
  const envDomain = process.env.APP_DOMAIN?.trim();
  if (envDomain && !envDomain.includes('localhost') && !envDomain.includes('127.0.0.1')) {
    return `https://${envDomain.replace(/^https?:\/\//, '').replace(/\/$/, '')}`;
  }

  // 8. If running in production mode, default to known production domain
  if (process.env.NODE_ENV === 'production') {
    return 'https://hrms.tarunkyadari.in';
  }

  // 9. Localhost fallback
  if (envFrontendUrl) return envFrontendUrl.replace(/\/$/, '');
  if (envAppUrl) return envAppUrl.replace(/\/$/, '');

  return 'http://localhost:3000';
}

/**
 * Resolves the full URL to the login page, optionally attaching prefilled email parameter
 */
export function resolveLoginUrl(
  req?: Request | any,
  company?: { customDomain?: string | null; subdomain?: string | null } | null,
  email?: string
): string {
  const baseUrl = resolveAppUrl(req, company);
  const loginBase = `${baseUrl}/login`;
  if (email && email.trim()) {
    return `${loginBase}?email=${encodeURIComponent(email.trim())}`;
  }
  return loginBase;
}

/**
 * Generates an executive, professional, responsive HTML email template for workspace onboarding & login credentials
 */
export function generateWelcomeCredentialsEmailHtml(params: WelcomeEmailParams): {
  subject: string;
  html: string;
} {
  const {
    recipientName,
    email,
    temporaryPassword,
    companyName,
    companyLogo,
    loginUrl,
    roleTitle = 'Employee',
    isResent = false,
    mustChangePassword = true,
    expiresInHours,
    supportEmail,
  } = params;

  // Derive plain login url (without email query parameter) for copy-paste link display
  let cleanLoginDisplay = loginUrl;
  try {
    const parsed = new URL(loginUrl);
    cleanLoginDisplay = `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
  } catch {
    cleanLoginDisplay = loginUrl.split('?')[0];
  }

  const subject = isResent
    ? `Welcome to ${companyName} — Your Workspace Login Credentials (Resent)`
    : `Welcome to ${companyName} — Your Workspace Login Credentials`;

  const bannerBadge = isResent ? 'WORKSPACE CREDENTIALS' : 'WORKSPACE INVITATION';
  const headerSubtitle = isResent
    ? 'Your workspace login credentials have been re-issued by your administrator'
    : 'Your workspace account has been successfully provisioned';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #1e293b;">
  <div style="background-color: #f1f5f9; padding: 36px 16px;">
    <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.03); border: 1px solid #e2e8f0;">
      
      <!-- Top Brand Accent Header -->
      <tr>
        <td style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 36px 28px; text-align: center; color: #ffffff;">
          ${
            companyLogo
              ? `<div style="margin-bottom: 14px;"><img src="${companyLogo}" alt="${companyName}" style="max-height: 44px; max-width: 200px; object-fit: contain; background: #ffffff; border-radius: 8px; padding: 6px 14px; box-shadow: 0 2px 8px rgba(0,0,0,0.12);" /></div>`
              : `<div style="display: inline-block; padding: 5px 14px; background: rgba(255, 255, 255, 0.18); border-radius: 9999px; font-size: 11px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: #ffffff; margin-bottom: 12px;">${bannerBadge}</div>`
          }
          <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; line-height: 1.25;">
            Welcome to ${companyName}!
          </h1>
          <p style="margin: 8px 0 0 0; color: #e0e7ff; font-size: 14px; font-weight: 400; line-height: 1.5;">
            ${headerSubtitle}
          </p>
        </td>
      </tr>

      <!-- Main Body Content -->
      <tr>
        <td style="padding: 32px 28px;">
          <p style="margin: 0 0 12px 0; font-size: 16px; color: #0f172a; font-weight: 600;">
            Hello ${recipientName},
          </p>
          <p style="margin: 0 0 22px 0; font-size: 14px; line-height: 1.65; color: #334155;">
            An official <strong>${roleTitle}</strong> workspace account has been provisioned for you on the <strong>${companyName}</strong> HRMS portal. You can now access your self-service portal to manage your profile, record attendance, apply for leaves, access payslips, and collaborate with your organization.
          </p>

          <!-- Credentials Card -->
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin: 20px 0; overflow: hidden;">
            <tr>
              <td style="padding: 16px 20px; background-color: #f1f5f9; border-bottom: 1px solid #e2e8f0;">
                <span style="font-size: 12px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; color: #475569;">
                  🔐 Your Account Sign-In Details
                </span>
              </td>
            </tr>
            <tr>
              <td style="padding: 20px;">
                <!-- Login URL -->
                <div style="margin-bottom: 14px;">
                  <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-bottom: 4px;">
                    Portal Login Link
                  </div>
                  <a href="${loginUrl}" target="_blank" style="color: #4f46e5; font-size: 14px; font-weight: 600; text-decoration: none; word-break: break-all;">
                    ${cleanLoginDisplay}
                  </a>
                </div>

                <!-- Username / Email -->
                <div style="margin-bottom: 14px;">
                  <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-bottom: 4px;">
                    Work Email / User ID
                  </div>
                  <div style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 14px; font-weight: 600; color: #0f172a; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 9px 12px;">
                    ${email}
                  </div>
                </div>

                <!-- Temporary Password -->
                <div>
                  <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-bottom: 4px;">
                    Temporary Password
                  </div>
                  <div style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 16px; font-weight: 700; color: #581c87; background: #f3e8ff; border: 1px solid #d8b4fe; border-radius: 6px; padding: 10px 12px; letter-spacing: 0.8px;">
                    ${temporaryPassword}
                  </div>
                </div>
              </td>
            </tr>
          </table>

          <!-- Primary CTA Button -->
          <div style="text-align: center; margin: 28px 0 20px 0;">
            <a href="${loginUrl}" target="_blank" style="background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%); color: #ffffff; display: inline-block; padding: 14px 34px; border-radius: 10px; font-weight: 700; font-size: 15px; text-decoration: none; box-shadow: 0 4px 14px rgba(79, 70, 229, 0.32); letter-spacing: 0.2px;">
              Sign In to Your Workspace &rarr;
            </a>
          </div>

          <!-- Security Notice -->
          ${
            mustChangePassword
              ? `
          <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 14px 16px; margin: 22px 0;">
            <div style="font-size: 13px; font-weight: 700; color: #92400e; margin-bottom: 2px;">
              🛡️ Security Notice
            </div>
            <div style="font-size: 13px; line-height: 1.5; color: #b45309;">
              Upon your first sign-in, you will be prompted to choose a new secure password before accessing your workspace. Please never share your credentials with anyone.${
                expiresInHours
                  ? ` This temporary credential will expire in <strong>${expiresInHours} hours</strong>.`
                  : ''
              }
            </div>
          </div>
          `
              : ''
          }

          <!-- Quick 3-Step Checklist -->
          <div style="background: #f8fafc; border-radius: 10px; padding: 16px 20px; margin: 22px 0; border: 1px solid #e2e8f0;">
            <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: #475569; margin-bottom: 10px;">
              Quick Steps to Get Started:
            </div>
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 13px; color: #475569; line-height: 1.6;">
              <tr>
                <td style="width: 22px; vertical-align: top; color: #10b981; font-weight: bold; font-size: 15px;">✓</td>
                <td style="padding-bottom: 6px;">Click the <strong>Sign In</strong> button above and enter your credentials.</td>
              </tr>
              <tr>
                <td style="width: 22px; vertical-align: top; color: #10b981; font-weight: bold; font-size: 15px;">✓</td>
                <td style="padding-bottom: 6px;">Set your new permanent secure password.</td>
              </tr>
              <tr>
                <td style="width: 22px; vertical-align: top; color: #10b981; font-weight: bold; font-size: 15px;">✓</td>
                <td>Explore your HRMS dashboard and record your attendance.</td>
              </tr>
            </table>
          </div>

          <!-- Support Note -->
          <p style="font-size: 13px; line-height: 1.55; color: #64748b; margin: 24px 0 0 0;">
            If you have any questions or require assistance, please contact your company HR department or IT support${
              supportEmail ? ` at <a href="mailto:${supportEmail}" style="color: #4f46e5; text-decoration: none;">${supportEmail}</a>` : ''
            }.
          </p>
        </td>
      </tr>

      <!-- Professional Footer -->
      <tr>
        <td style="background-color: #f8fafc; padding: 22px 28px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0; font-size: 13px; font-weight: 700; color: #334155;">
            ${companyName}
          </p>
          <p style="margin: 4px 0 0 0; font-size: 11px; color: #64748b;">
            Powered by Uptrix HRMS Platform • Enterprise Workforce Management
          </p>
          <p style="margin: 8px 0 0 0; font-size: 11px; color: #94a3b8;">
            This is an automated administrative notification sent to ${email}. Please do not reply directly to this email.
          </p>
        </td>
      </tr>

    </table>
  </div>
</body>
</html>
  `.trim();

  return { subject, html };
}

/**
 * Generates an executive, professional HTML email for administrator password resets
 */
export function generatePasswordResetNoticeEmailHtml(params: PasswordResetNoticeParams): {
  subject: string;
  html: string;
} {
  const {
    recipientName,
    email,
    temporaryPassword,
    companyName,
    companyLogo,
    loginUrl,
    roleTitle = 'Administrator',
  } = params;

  let cleanLoginDisplay = loginUrl;
  try {
    const parsed = new URL(loginUrl);
    cleanLoginDisplay = `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
  } catch {
    cleanLoginDisplay = loginUrl.split('?')[0];
  }

  const subject = `Password Reset — ${companyName} ${roleTitle} Account`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #1e293b;">
  <div style="background-color: #f1f5f9; padding: 36px 16px;">
    <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.03); border: 1px solid #e2e8f0;">
      
      <!-- Brand Header -->
      <tr>
        <td style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 32px 28px; text-align: center; color: #ffffff;">
          ${
            companyLogo
              ? `<div style="margin-bottom: 12px;"><img src="${companyLogo}" alt="${companyName}" style="max-height: 40px; max-width: 180px; object-fit: contain; background: #ffffff; border-radius: 8px; padding: 6px 12px;" /></div>`
              : `<div style="display: inline-block; padding: 4px 12px; background: rgba(255, 255, 255, 0.2); border-radius: 9999px; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: #ffffff; margin-bottom: 10px;">SECURITY NOTIFICATION</div>`
          }
          <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">
            Administrator Password Reset
          </h1>
          <p style="margin: 6px 0 0 0; color: #e0e7ff; font-size: 13px; font-weight: 400;">
            ${companyName} • Uptrix HRMS
          </p>
        </td>
      </tr>

      <!-- Body Content -->
      <tr>
        <td style="padding: 30px 28px;">
          <p style="margin: 0 0 12px 0; font-size: 15px; color: #0f172a; font-weight: 600;">
            Hello ${recipientName},
          </p>
          <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #334155;">
            The password for your <strong>${companyName}</strong> ${roleTitle.toLowerCase()} account has been reset by the Super Administrator. Below are your temporary sign-in credentials:
          </p>

          <!-- Credentials Box -->
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin: 18px 0; overflow: hidden;">
            <tr>
              <td style="padding: 18px;">
                <div style="margin-bottom: 12px;">
                  <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 4px;">Portal URL</div>
                  <a href="${loginUrl}" target="_blank" style="color: #4f46e5; font-size: 14px; font-weight: 600; text-decoration: none;">${cleanLoginDisplay}</a>
                </div>
                <div style="margin-bottom: 12px;">
                  <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 4px;">Username / Email</div>
                  <div style="font-family: monospace; font-size: 14px; font-weight: 600; color: #0f172a; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 12px;">${email}</div>
                </div>
                <div>
                  <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 4px;">New Temporary Password</div>
                  <div style="font-family: monospace; font-size: 16px; font-weight: 700; color: #581c87; background: #f3e8ff; border: 1px solid #d8b4fe; border-radius: 6px; padding: 9px 12px;">${temporaryPassword}</div>
                </div>
              </td>
            </tr>
          </table>

          <div style="text-align: center; margin: 26px 0 20px 0;">
            <a href="${loginUrl}" target="_blank" style="background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%); color: #ffffff; display: inline-block; padding: 13px 32px; border-radius: 10px; font-weight: 700; font-size: 14px; text-decoration: none; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);">
              Sign In with New Password &rarr;
            </a>
          </div>

          <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 6px; padding: 12px 14px; margin: 18px 0;">
            <div style="font-size: 12px; font-weight: 700; color: #92400e;">Security Notice</div>
            <div style="font-size: 12px; line-height: 1.5; color: #b45309; margin-top: 2px;">
              You will be prompted to choose a new permanent password on your next sign-in. If you did not request this password reset, please contact system security immediately.
            </div>
          </div>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="background-color: #f8fafc; padding: 18px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0; font-size: 11px; color: #94a3b8;">
            This is an automated security notification from Uptrix HRMS Platform.
          </p>
        </td>
      </tr>

    </table>
  </div>
</body>
</html>
  `.trim();

  return { subject, html };
}

