import 'dotenv/config';
import bcrypt from 'bcryptjs';
import prisma from '../src/lib/prisma';
import { ROLES } from '../src/types/roles';

const seedUsers = [
  {
    name: 'Admin User',
    email: 'admin@mini-erp.local',
    role: ROLES[0],
    password: 'Admin@123',
  },
  {
    name: 'Sales User',
    email: 'sales@mini-erp.local',
    role: ROLES[1],
    password: 'Sales@123',
  },
  {
    name: 'Warehouse User',
    email: 'warehouse@mini-erp.local',
    role: ROLES[2],
    password: 'Warehouse@123',
  },
  {
    name: 'Accounts User',
    email: 'accounts@mini-erp.local',
    role: ROLES[3],
    password: 'Accounts@123',
  },
] as const;

async function main() {
  const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? '10');
  const passwordHashMap = await Promise.all(
    seedUsers.map(async (user) => ({
      ...user,
      passwordHash: await bcrypt.hash(user.password, Number.isFinite(saltRounds) && saltRounds > 0 ? saltRounds : 10),
    })),
  );

  for (const user of passwordHashMap) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        role: user.role,
        passwordHash: user.passwordHash,
      },
      create: {
        name: user.name,
        email: user.email,
        role: user.role,
        passwordHash: user.passwordHash,
      },
    });
  }

  console.log('Seeded test users for ADMIN, SALES, WAREHOUSE, and ACCOUNTS roles.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });