import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Professional, distinct, high-res corporate headshots
const PHOTO_MAPPINGS: Record<string, string> = {
  // Jone Doe (HR)
  'hr@gmail.com': 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=256&h=256&fit=crop&crop=faces',
  // Vikram Malhotra (VP Engineering)
  'manager1@novatech.io': 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=256&h=256&fit=crop&crop=faces',
  // Ananya Roy (Lead Product Designer)
  'ananya.manager@kyadari.com': 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=256&h=256&fit=crop&crop=faces',
  // Maya Patel (Senior Fullstack Engineer)
  'emp2@novatech.io': 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=256&h=256&fit=crop&crop=faces',
  // Rahul Verma (Backend Engineer)
  'rahul.dev@kyadari.com': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=256&h=256&fit=crop&crop=faces',
  // Sneha Nair (QA Engineer)
  'sneha.qa@kyadari.com': 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=256&h=256&fit=crop&crop=faces',
  // Pooja Gupta (Visual Designer)
  'pooja.designer@kyadari.com': 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=256&h=256&fit=crop&crop=faces',
  // Rohit Sharma (Sales Executive)
  'rohit.sales@kyadari.com': 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=256&h=256&fit=crop&crop=faces',
  // Amit Desai (Finance Analyst)
  'amit.finance@kyadari.com': 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=256&h=256&fit=crop&crop=faces',
};

async function main() {
  const admin = await prisma.user.findFirst({
    where: { email: { equals: 'kyadarit@gmail.com', mode: 'insensitive' } },
    include: { company: true },
  });

  if (!admin || !admin.companyId) {
    console.error('Admin user kyadarit@gmail.com not found or has no company!');
    return;
  }

  console.log(`Target Company: [${admin.companyId}] ${admin.company?.name}`);

  const employees = await prisma.user.findMany({
    where: { companyId: admin.companyId },
    select: { id: true, firstName: true, lastName: true, email: true, jobTitle: true, profilePhoto: true },
    orderBy: { id: 'asc' },
  });

  console.log(`Found ${employees.length} employees in company.`);

  for (const emp of employees) {
    const targetEmail = emp.email.toLowerCase();
    
    // If it's the admin and already has a custom uploaded photo, keep it unless it's missing
    if (targetEmail === 'kyadarit@gmail.com' && emp.profilePhoto) {
      console.log(`- [Keep] ${emp.firstName} ${emp.lastName} (${emp.email}): already has custom photo -> ${emp.profilePhoto}`);
      continue;
    }

    const photoUrl = PHOTO_MAPPINGS[targetEmail] || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=256&h=256&fit=crop&crop=faces';
    
    await prisma.user.update({
      where: { id: emp.id },
      data: { profilePhoto: photoUrl },
    });

    console.log(`+ [Updated] ID ${emp.id}: ${emp.firstName} ${emp.lastName} (${emp.jobTitle}) -> ${photoUrl}`);
  }

  const updatedEmployees = await prisma.user.findMany({
    where: { companyId: admin.companyId },
    select: { id: true, firstName: true, lastName: true, email: true, jobTitle: true, profilePhoto: true },
    orderBy: { id: 'asc' },
  });

  console.log('\n--- VERIFICATION OF ALL EMPLOYEES IN COMPANY ---');
  console.log(JSON.stringify(updatedEmployees, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
