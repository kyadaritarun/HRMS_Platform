import prisma from '../lib/prisma.js';
import { toDateKey } from '../lib/dates.js';

export async function runDailyAlerts() {
  const today = new Date();
  const currentMonth = today.getUTCMonth();
  const currentDay = today.getUTCDate();
  const todayKey = toDateKey(today);

  // 1. Birthday Alerts
  const allUsers = await prisma.user.findMany({
    where: { isActive: true, dateOfBirth: { not: null }, companyId: { not: null } },
  });

  for (const u of allUsers) {
    if (!u.dateOfBirth || !u.companyId) continue;
    const dob = new Date(u.dateOfBirth);
    if (dob.getUTCMonth() === currentMonth && dob.getUTCDate() === currentDay) {
      // Check deduplication
      const existing = await prisma.notification.findFirst({
        where: {
          companyId: u.companyId,
          sourceType: 'BIRTHDAY',
          sourceId: String(u.id),
          eventDate: new Date(todayKey),
        },
      });

      if (!existing) {
        // Broadcast to company colleagues or user
        await prisma.notification.create({
          data: {
            companyId: u.companyId,
            userId: u.id,
            kind: 'BIRTHDAY',
            title: `Happy Birthday, ${u.firstName}! 🎂`,
            message: `Wishing you a wonderful birthday from everyone at the company!`,
            sourceType: 'BIRTHDAY',
            sourceId: String(u.id),
            eventDate: new Date(todayKey),
          },
        });
      }
    }
  }

  // 2. Document Expiry Alerts (30 days ahead)
  const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const expiringDocs = await prisma.document.findMany({
    where: {
      expiryDate: { lte: in30Days, gte: today },
      status: 'VERIFIED',
    },
    include: { user: true },
  });

  for (const doc of expiringDocs) {
    const existing = await prisma.notification.findFirst({
      where: {
        companyId: doc.companyId,
        sourceType: 'DOC_EXPIRY',
        sourceId: String(doc.id),
        eventDate: new Date(todayKey),
      },
    });

    if (!existing) {
      await prisma.notification.create({
        data: {
          companyId: doc.companyId,
          userId: doc.userId,
          kind: 'SYSTEM',
          title: `Document Expiring Soon: ${doc.title}`,
          message: `Your verified document '${doc.title}' expires in less than 30 days. Please arrange renewal.`,
          sourceType: 'DOC_EXPIRY',
          sourceId: String(doc.id),
          eventDate: new Date(todayKey),
        },
      });
    }
  }
}
