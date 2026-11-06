import { PrismaClient, WorkMode } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const schema = process.env.DB_SCHEMA || 'HRMS_test';
  console.log(`[Seed Attendance] Adding attendance for 1-Nov to 5-Nov-2026 in schema "${schema}"...`);

  // 1. Find Uptrix Technologies company
  const company = await prisma.company.findFirst({
    where: { code: 'UPTRIX' },
    include: {
      users: {
        where: { isActive: true },
        select: { id: true, firstName: true, lastName: true, email: true, jobTitle: true, role: true },
        orderBy: { id: 'asc' },
      },
    },
  });

  if (!company) {
    throw new Error('Uptrix Technologies company not found in database.');
  }

  const users = company.users;
  console.log(`[Seed Attendance] Found company "${company.name}" (ID: ${company.id}) with ${users.length} active employees.`);

  // 2. Dates to seed: 1 Nov 2026 to 5 Nov 2026
  const dateList = [
    { year: 2026, month: 10, day: 1, label: '1-Nov-2026 (Sun)' },
    { year: 2026, month: 10, day: 2, label: '2-Nov-2026 (Mon)' },
    { year: 2026, month: 10, day: 3, label: '3-Nov-2026 (Tue)' },
    { year: 2026, month: 10, day: 4, label: '4-Nov-2026 (Wed)' },
    { year: 2026, month: 10, day: 5, label: '5-Nov-2026 (Thu)' },
  ];

  const userIds = users.map((u) => u.id);

  // 3. Clear any existing records for these users and date range to avoid duplicates
  const rangeStart = new Date(Date.UTC(2026, 10, 1, 0, 0, 0, 0));
  const rangeEnd = new Date(Date.UTC(2026, 10, 5, 23, 59, 59, 999));

  const deleted = await prisma.attendance.deleteMany({
    where: {
      userId: { in: userIds },
      checkIn: { gte: rangeStart, lte: rangeEnd },
    },
  });
  console.log(`[Seed Attendance] Cleaned ${deleted.count} pre-existing records in range.`);

  // 4. Create punch in & punch out records for each user & each date
  let totalCreated = 0;

  for (const u of users) {
    for (const d of dateList) {
      // Deterministic slight variance in minutes based on user id and day
      const inMinuteVariance = ((u.id * 7 + d.day * 13) % 18) - 8; // -8 to +10 mins around 09:30 AM IST
      const outMinuteVariance = ((u.id * 11 + d.day * 17) % 20); // 0 to +20 mins past 06:30 PM IST

      // 09:30 AM IST is 04:00 UTC
      const checkInUTC = new Date(Date.UTC(d.year, d.month, d.day, 4, 0 + inMinuteVariance, 0));
      // 06:30 PM IST is 13:00 UTC
      const checkOutUTC = new Date(Date.UTC(d.year, d.month, d.day, 13, 0 + outMinuteVariance, 0));

      const durationMs = checkOutUTC.getTime() - checkInUTC.getTime();
      const durationHours = Math.round((durationMs / 3600000) * 100) / 100;

      // Work mode: mostly WFO, with occasional Hybrid/WFH for realism
      const mode = (u.id + d.day) % 7 === 0 ? WorkMode.WFH : WorkMode.WFO;

      await prisma.attendance.create({
        data: {
          companyId: company.id,
          userId: u.id,
          shiftId: 'shift-general',
          checkIn: checkInUTC,
          checkOut: checkOutUTC,
          workMode: mode,
          note: d.day === 1 ? 'Weekend shift' : 'Regular shift completed',
          checkInGeo: {
            lat: 17.4933,
            lng: 78.3914,
            address: 'KPHB Colony Near Metro, Hyderabad',
          },
          checkOutGeo: {
            lat: 17.4933,
            lng: 78.3914,
            address: 'KPHB Colony Near Metro, Hyderabad',
          },
          durationHours,
        },
      });

      totalCreated++;
    }
  }

  console.log('\n======================================================');
  console.log(`✅ ATTENDANCE SEEDING COMPLETED`);
  console.log(`======================================================`);
  console.log(`Company: ${company.name} (Code: ${company.code})`);
  console.log(`Date Range: 1-Nov-2026 to 5-Nov-2026 (5 days)`);
  console.log(`Total Employees: ${users.length}`);
  console.log(`Total Attendance Records Created: ${totalCreated} (Punch In & Punch Out)`);
  console.log(`------------------------------------------------------`);
  console.log(`Employees Processed:`);
  for (const u of users) {
    console.log(` • ${u.firstName} ${u.lastName} (${u.jobTitle}) - ${u.email}`);
  }
  console.log('======================================================\n');
}

main()
  .catch((e) => {
    console.error('[Seed Attendance Error]', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

