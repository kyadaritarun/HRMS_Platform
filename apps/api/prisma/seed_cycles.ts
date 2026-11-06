import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const company = await prisma.company.findFirst({
    where: { code: 'UPTRIX' },
  });

  if (!company) {
    console.error('Uptrix company not found');
    return;
  }

  const currentSettings = (company.settings as Record<string, any>) || {};

  const performanceCycles = [
    {
      id: 'cycle-2026-q4',
      name: 'Q4 2026 Appraisal Cycle',
      description: 'Oct 2026 - Dec 2026 Quarterly Performance & OKR Evaluation',
      startDate: '2026-10-01',
      endDate: '2026-12-31',
      isActive: true,
    },
    {
      id: 'cycle-2026-annual',
      name: 'Annual Review 2026',
      description: 'Full-Year 2026 Comprehensive Evaluation',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      isActive: true,
    },
  ];

  const updatedSettings = {
    ...currentSettings,
    performanceCycles,
  };

  await prisma.company.update({
    where: { id: company.id },
    data: {
      settings: updatedSettings,
    },
  });

  console.log('Seeded 2 active performance cycles for Uptrix Technologies successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

