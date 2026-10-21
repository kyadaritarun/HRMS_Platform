import prisma from '../lib/prisma.js';
import { sendEmail } from '../lib/mailer.js';
import { toDateKey } from '../lib/dates.js';

export interface EventEmailSettings {
  autoBirthdayEmails: boolean;
  autoHolidayEmails: boolean;
  holidayNoticeDays: number; // e.g. 1 means notify 1 day in advance + day of
  customBirthdayMessage?: string;
  customHolidayMessage?: string;
}

export const DEFAULT_EVENT_EMAIL_SETTINGS: EventEmailSettings = {
  autoBirthdayEmails: true,
  autoHolidayEmails: true,
  holidayNoticeDays: 1,
  customBirthdayMessage: '',
  customHolidayMessage: '',
};

/**
 * Generates an elegant, celebratory HTML email template for employee birthdays
 */
export function generateBirthdayEmailHtml(params: {
  employeeName: string;
  companyName: string;
  companyLogo?: string | null;
  customMessage?: string;
}): string {
  const { employeeName, companyName, companyLogo, customMessage } = params;

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 32px 24px; background-color: #fdf2f8; border-radius: 24px;">
      <div style="background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 20px rgba(236, 72, 153, 0.12); border: 1px solid #fce7f3;">
        
        <!-- Header Banner -->
        <div style="background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); padding: 36px 24px; text-align: center; color: #ffffff;">
          ${
            companyLogo
              ? `<img src="${companyLogo}" alt="${companyName}" style="max-height: 44px; margin-bottom: 16px; border-radius: 8px; background: rgba(255,255,255,0.9); padding: 4px;" />`
              : `<div style="font-size: 13px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; opacity: 0.9; margin-bottom: 8px;">${companyName}</div>`
          }
          <div style="font-size: 44px; margin-bottom: 8px;">🎂 🎉 🎈</div>
          <h1 style="margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">Happy Birthday, ${employeeName}!</h1>
          <p style="margin: 8px 0 0; font-size: 14px; opacity: 0.92;">Wishing you joy, success, and another wonderful year!</p>
        </div>

        <!-- Body Content -->
        <div style="padding: 32px 28px; color: #334155; line-height: 1.65; font-size: 15px;">
          <p style="margin-top: 0; font-size: 16px;">
            Dear <strong>${employeeName}</strong>,
          </p>
          <p>
            On this very special day, everyone at <strong>${companyName}</strong> wants to wish you a tremendous 
            <strong>Happy Birthday!</strong> 🥳
          </p>
          <p>
            ${
              customMessage && customMessage.trim().length > 0
                ? customMessage
                : `We truly appreciate your dedication, creativity, and the positive energy you bring to our team every single day. 
                   May your special day be filled with laughter, great celebrations, and wonderful moments with loved ones.`
            }
          </p>

          <!-- Quote / Highlight Box -->
          <div style="margin: 24px 0; padding: 20px; background: #fff1f2; border-left: 4px solid #f43f5e; border-radius: 12px; font-style: italic; color: #9f1239;">
            "Count your life by smiles, not tears. Count your age by friends, not years."
          </div>

          <p style="margin-bottom: 0;">
            Here’s to another fabulous year of learning, milestones, and shared success together! 🥂
          </p>

          <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #f1f5f9; display: flex; align-items: center;">
            <div>
              <div style="font-weight: 700; color: #0f172a; font-size: 14px;">With Warmest Wishes,</div>
              <div style="color: #64748b; font-size: 13px; margin-top: 2px;">The Entire Team at ${companyName}</div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #f8fafc; padding: 16px 24px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9;">
          Sent automatically on behalf of ${companyName} via Uptrix HRMS
        </div>
      </div>
    </div>
  `;
}

/**
 * Generates a vibrant, festive HTML email template for upcoming company holidays
 */
export function generateHolidayEmailHtml(params: {
  holidayName: string;
  holidayDate: Date;
  type: string;
  description?: string;
  companyName: string;
  companyLogo?: string | null;
  customMessage?: string;
}): string {
  const { holidayName, holidayDate, type, description, companyName, companyLogo, customMessage } = params;

  const dateFormatted = holidayDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 32px 24px; background-color: #eef2ff; border-radius: 24px;">
      <div style="background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 20px rgba(99, 102, 241, 0.12); border: 1px solid #e0e7ff;">
        
        <!-- Header Banner -->
        <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 36px 24px; text-align: center; color: #ffffff;">
          ${
            companyLogo
              ? `<img src="${companyLogo}" alt="${companyName}" style="max-height: 44px; margin-bottom: 16px; border-radius: 8px; background: rgba(255,255,255,0.9); padding: 4px;" />`
              : `<div style="font-size: 13px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; opacity: 0.9; margin-bottom: 8px;">${companyName}</div>`
          }
          <div style="font-size: 40px; margin-bottom: 8px;">✨ 🎊 🌴</div>
          <h1 style="margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">Upcoming Holiday: ${holidayName}</h1>
          <p style="margin: 8px 0 0; font-size: 14px; opacity: 0.92;">Mark your calendar — Company Observance & Celebration</p>
        </div>

        <!-- Body Content -->
        <div style="padding: 32px 28px; color: #334155; line-height: 1.65; font-size: 15px;">
          <p style="margin-top: 0; font-size: 16px;">
            Hello Team,
          </p>
          <p>
            Please note that our company will be observing an official holiday for <strong>${holidayName}</strong> on <strong>${dateFormatted}</strong>.
          </p>

          <!-- Holiday Info Card -->
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 20px; margin: 24px 0;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600; width: 140px;">Occasion:</td>
                <td style="padding: 6px 0; color: #0f172a; font-weight: 700;">${holidayName}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Date:</td>
                <td style="padding: 6px 0; color: #4338ca; font-weight: 700;">${dateFormatted}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Holiday Type:</td>
                <td style="padding: 6px 0; color: #0f172a; font-weight: 600; text-transform: capitalize;">${type.toLowerCase()} Holiday</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Office Status:</td>
                <td style="padding: 6px 0; color: #059669; font-weight: 700;">Closed (Full Day Holiday)</td>
              </tr>
              ${
                description && description.trim()
                  ? `<tr>
                      <td style="padding: 6px 0; color: #64748b; font-weight: 600; vertical-align: top;">Details:</td>
                      <td style="padding: 6px 0; color: #334155;">${description}</td>
                    </tr>`
                  : ''
              }
            </table>
          </div>

          <p>
            ${
              customMessage && customMessage.trim().length > 0
                ? customMessage
                : `We wish you and your loved ones a joyful, peaceful, and rejuvenating holiday. 
                   Take time to unwind, celebrate with your family, and recharge!`
            }
          </p>

          <p style="margin-bottom: 0;">
            Regular work and scheduled operations will resume promptly on the next business day.
          </p>

          <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #f1f5f9;">
            <div style="font-weight: 700; color: #0f172a; font-size: 14px;">Warm Regards,</div>
            <div style="color: #64748b; font-size: 13px; margin-top: 2px;">People Operations & Management, ${companyName}</div>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #f8fafc; padding: 16px 24px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9;">
          Sent automatically to all company employees on behalf of ${companyName} via Uptrix HRMS
        </div>
      </div>
    </div>
  `;
}

/**
 * Sends a birthday wish email to a specific employee
 */
export async function sendBirthdayWish(params: {
  companyId: number;
  userId: number;
  isManual?: boolean;
}): Promise<{ success: boolean; message: string }> {
  const { companyId, userId, isManual = false } = params;

  const user = await prisma.user.findFirst({
    where: { id: userId, companyId, isActive: true },
    include: { company: true },
  });

  if (!user || !user.company) {
    return { success: false, message: 'Active employee not found.' };
  }

  const today = new Date();
  const currentYear = today.getFullYear();
  const templateKey = `bday_${user.id}_${currentYear}`;

  // Deduplication check for automated runs
  if (!isManual) {
    const existingLog = await prisma.emailLog.findFirst({
      where: {
        companyId,
        templateKey,
        status: 'SENT',
      },
    });
    if (existingLog) {
      return { success: true, message: 'Birthday wish was already sent to this employee today.' };
    }
  }

  const companySettings = (user.company.settings as any) || {};
  const eventSettings: EventEmailSettings = {
    ...DEFAULT_EVENT_EMAIL_SETTINGS,
    ...(companySettings.eventEmails || {}),
  };

  const html = generateBirthdayEmailHtml({
    employeeName: `${user.firstName} ${user.lastName}`.trim(),
    companyName: user.company.name,
    companyLogo: user.company.logo,
    customMessage: eventSettings.customBirthdayMessage,
  });

  const subject = `🎉 Happy Birthday, ${user.firstName}! Warmest Wishes from ${user.company.name}`;

  const mailResult = await sendEmail({
    companyId,
    to: user.email,
    subject,
    html,
    category: 'BIRTHDAY_WISH',
    templateKey,
  });

  // Create in-app notification for the employee
  try {
    await prisma.notification.create({
      data: {
        companyId,
        userId: user.id,
        kind: 'BIRTHDAY',
        title: `Happy Birthday, ${user.firstName}! 🎂`,
        message: `Wishing you a wonderful birthday filled with joy and success from everyone at ${user.company.name}!`,
        sourceType: 'BIRTHDAY',
        sourceId: String(user.id),
        eventDate: new Date(toDateKey(today)),
      },
    });
  } catch (err) {
    // Ignore notification duplicate errors
  }

  return {
    success: mailResult.success,
    message: mailResult.success
      ? `Birthday greeting email sent successfully to ${user.firstName} ${user.lastName} (${user.email})!`
      : (mailResult.error || 'Failed to send birthday email'),
  };
}

/**
 * Sends a holiday announcement email to all active employees in a company
 */
export async function sendHolidayAnnouncement(params: {
  companyId: number;
  holidayId: number;
  isManual?: boolean;
}): Promise<{ success: boolean; recipientsCount: number; message: string }> {
  const { companyId, holidayId, isManual = false } = params;

  const holiday = await prisma.holiday.findFirst({
    where: { id: holidayId, companyId },
    include: {
      company: {
        include: {
          users: {
            where: { isActive: true },
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
      },
    },
  });

  if (!holiday || !holiday.company) {
    return { success: false, recipientsCount: 0, message: 'Holiday not found.' };
  }

  const employees = holiday.company.users;
  if (employees.length === 0) {
    return { success: false, recipientsCount: 0, message: 'No active employees in this company to notify.' };
  }

  const holidayDateKey = toDateKey(holiday.date);
  const templateKey = `holiday_${holiday.id}_${holidayDateKey}`;

  // Deduplication check for automated runs
  if (!isManual) {
    const existingLog = await prisma.emailLog.findFirst({
      where: {
        companyId,
        templateKey,
        status: 'SENT',
      },
    });
    if (existingLog) {
      return { success: true, recipientsCount: 0, message: 'Holiday announcement already sent for this date.' };
    }
  }

  const companySettings = (holiday.company.settings as any) || {};
  const eventSettings: EventEmailSettings = {
    ...DEFAULT_EVENT_EMAIL_SETTINGS,
    ...(companySettings.eventEmails || {}),
  };

  const html = generateHolidayEmailHtml({
    holidayName: holiday.name,
    holidayDate: new Date(holiday.date),
    type: holiday.type,
    description: holiday.description,
    companyName: holiday.company.name,
    companyLogo: holiday.company.logo,
    customMessage: eventSettings.customHolidayMessage,
  });

  const subject = `🎉 Upcoming Holiday: ${holiday.name} — ${holiday.company.name}`;

  let successCount = 0;
  // Send email to each active employee
  for (const emp of employees) {
    try {
      const res = await sendEmail({
        companyId,
        to: emp.email,
        subject,
        html,
        category: 'HOLIDAY_ANNOUNCEMENT',
        templateKey,
      });
      if (res.success) successCount++;

      // Create in-app notification for each employee
      await prisma.notification.create({
        data: {
          companyId,
          userId: emp.id,
          kind: 'HOLIDAY',
          title: `Upcoming Holiday: ${holiday.name}`,
          message: `${holiday.name} is on ${new Date(holiday.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}. Office will remain closed.`,
          sourceType: 'HOLIDAY',
          sourceId: String(holiday.id),
          eventDate: new Date(holidayDateKey),
        },
      });
    } catch {
      // Continue sending to next employees even if one fails
    }
  }

  return {
    success: successCount > 0,
    recipientsCount: successCount,
    message: `Holiday announcement email dispatched to ${successCount} employee(s) for "${holiday.name}"!`,
  };
}

/**
 * Automated daily routine that checks:
 * 1. Employees whose birthday is today -> sends automated birthday wish
 * 2. Upcoming holidays within notice window -> sends automated holiday announcement to all employees
 */
export async function runAutomatedEventEmails(): Promise<{
  birthdayEmailsSent: number;
  holidayEmailsSent: number;
}> {
  console.log('[Event Emails Job] Running daily automated birthday and holiday check...');

  const today = new Date();
  const currentMonth = today.getMonth();
  const currentDay = today.getDate();
  const todayKey = toDateKey(today);

  let totalBirthdays = 0;
  let totalHolidays = 0;

  try {
    const companies = await prisma.company.findMany({
      where: { isActive: true },
      include: {
        users: {
          where: { isActive: true },
          select: { id: true, firstName: true, lastName: true, email: true, dateOfBirth: true },
        },
        holidays: {
          orderBy: { date: 'asc' },
        },
      },
    });

    for (const company of companies) {
      const settings = (company.settings as any) || {};
      const eventSettings: EventEmailSettings = {
        ...DEFAULT_EVENT_EMAIL_SETTINGS,
        ...(settings.eventEmails || {}),
      };

      // 1. AUTOMATED BIRTHDAY EMAILS
      if (eventSettings.autoBirthdayEmails) {
        for (const u of company.users) {
          if (!u.dateOfBirth) continue;
          const dob = new Date(u.dateOfBirth);
          // Compare month and day
          if (dob.getMonth() === currentMonth && dob.getDate() === currentDay) {
            const result = await sendBirthdayWish({
              companyId: company.id,
              userId: u.id,
              isManual: false,
            });
            if (result.success && !result.message.includes('already sent')) {
              totalBirthdays++;
              console.log(`[Event Emails Job] Sent birthday greeting to ${u.firstName} (${u.email}) at ${company.name}`);
            }
          }
        }
      }

      // 2. AUTOMATED UPCOMING HOLIDAY EMAILS
      if (eventSettings.autoHolidayEmails) {
        const noticeDays = eventSettings.holidayNoticeDays || 1;
        const maxUpcomingDate = new Date(today);
        maxUpcomingDate.setDate(maxUpcomingDate.getDate() + noticeDays);
        maxUpcomingDate.setHours(23, 59, 59, 999);

        const startOfToday = new Date(today);
        startOfToday.setHours(0, 0, 0, 0);

        for (const h of company.holidays) {
          const hDate = new Date(h.date);
          // Check if holiday is between today and today + noticeDays
          if (hDate >= startOfToday && hDate <= maxUpcomingDate) {
            const result = await sendHolidayAnnouncement({
              companyId: company.id,
              holidayId: h.id,
              isManual: false,
            });
            if (result.success && result.recipientsCount > 0) {
              totalHolidays += result.recipientsCount;
              console.log(
                `[Event Emails Job] Sent holiday announcement for "${h.name}" to ${result.recipientsCount} employee(s) at ${company.name}`
              );
            }
          }
        }
      }
    }

    console.log(
      `[Event Emails Job] Finished: Sent ${totalBirthdays} birthday email(s), ${totalHolidays} holiday email(s).`
    );
  } catch (err: any) {
    console.error('[Event Emails Job Error]', err.message);
  }

  return { birthdayEmailsSent: totalBirthdays, holidayEmailsSent: totalHolidays };
}
