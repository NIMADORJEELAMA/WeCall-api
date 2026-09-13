import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminPassword = '736182'; // Change this!
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@admin.com' },
    update: {
      password: hashedPassword,
      status: 'ACTIVE',
    },
    create: {
      email: 'admin@admin.com',
      name: 'System Admin',
      password: hashedPassword,
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });

  console.log({ admin });
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
