import prisma from '../lib/prisma.js';

export async function getRenewalsAndExpiring(daysThreshold: number = 14) {
  const futureThreshold = new Date(Date.now() + daysThreshold * 24 * 60 * 60 * 1000);
  const now = new Date();

  const companies = await prisma.company.findMany({
    where: {
      OR: [
        { nextPaymentDate: { lte: futureThreshold } },
        { subEndDate: { lte: now } },
      ],
      isActive: true,
    },
    include: {
      package: true,
      users: {
        where: { role: 'COMPANY_ADMIN', isActive: true },
        select: { id: true, firstName: true, lastName: true, email: true, phone: true },
        take: 1,
      },
    },
    orderBy: { nextPaymentDate: 'asc' },
  });

  return companies.map((c) => {
    const isExpired = Boolean(c.subEndDate && new Date(c.subEndDate) < now);
    return {
      id: c.id,
      companyId: c.id,
      name: c.name,
      subdomain: c.subdomain,
      logo: c.logo,
      address: c.address,
      planType: c.planType,
      package: c.package,
      subEndDate: c.subEndDate,
      nextPaymentDate: c.nextPaymentDate,
      status: isExpired ? 'Expired' : 'Expiring soon',
      admin: c.users[0] || null,
    };
  });
}

export async function getLicenseOveruseList() {
  const companies = await prisma.company.findMany({
    where: { isActive: true },
    include: {
      package: true,
      users: {
        where: { role: 'COMPANY_ADMIN', isActive: true },
        select: { id: true, firstName: true, lastName: true, email: true, phone: true },
        take: 1,
      },
      _count: {
        select: { users: { where: { isActive: true } } },
      },
    },
  });

  return companies
    .filter((c) => {
      const limit = c.package?.employeeLimit || 10;
      return c._count.users > limit;
    })
    .map((c) => ({
      companyId: c.id,
      companyName: c.name,
      subdomain: c.subdomain,
      logo: c.logo,
      admin: c.users[0] || null,
      activeUsers: c._count.users,
      seatLimit: c.package?.employeeLimit || 10,
      excessSeats: c._count.users - (c.package?.employeeLimit || 10),
    }));
}

export async function generateInvoiceNumber(tx: any): Promise<string> {
  const now = new Date();
  const yearMonth = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const prefix = `INV-${yearMonth}-`;

  const latest = await tx.invoice.findFirst({
    where: { invoiceNumber: { startsWith: prefix } },
    orderBy: { invoiceNumber: 'desc' },
  });

  let seq = 1;
  if (latest) {
    const parts = latest.invoiceNumber.split('-');
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastSeq)) {
      seq = lastSeq + 1;
    }
  }

  return `${prefix}${String(seq).padStart(4, '0')}`;
}
