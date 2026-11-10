import '../apps/api/src/lib/database.js';
import prisma from '../apps/api/src/lib/prisma.js';

async function check() {
  const [
    companies,
    users,
    packages,
    attendance,
    leaves,
    requests,
    invoices,
    tickets,
    documents,
    departments,
    activities,
  ] = await Promise.all([
    prisma.company.count(),
    prisma.user.count(),
    prisma.package.count(),
    prisma.attendance.count(),
    prisma.leaveType.count(),
    prisma.request.count(),
    prisma.invoice.count(),
    prisma.ticket.count(),
    prisma.document.count(),
    prisma.department.count(),
    prisma.activityLog.count(),
  ]);

  console.log('Current Database Counts:');
  console.log({
    companies,
    users,
    packages,
    attendance,
    leaves,
    requests,
    invoices,
    tickets,
    documents,
    departments,
    activities,
  });

  await prisma.$disconnect();
}

check().catch(console.error);
