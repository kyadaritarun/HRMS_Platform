import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://hrms_user:Hrms%402026%23Secure@187.77.188.152:5432/hrms_db?schema=HRMS_prod&connection_limit=1&pool_timeout=5'
    }
  }
});

async function main() {
  try {
    const res = await prisma.$queryRawUnsafe('SELECT 1');
    console.log('hrms_user connected successfully!');
  } catch (err: any) {
    console.error('hrms_user error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();

