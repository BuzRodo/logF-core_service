import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import 'dotenv/config';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

/**
 * Seed mínimo: solo los usuarios necesarios para entrar al sistema.
 * El catálogo (categorías, ingredientes, productos), proveedores y stock
 * se cargan desde la app de administración.
 */
async function main() {
  console.log('🌱 Iniciando seed...');

  const adminHash = await bcrypt.hash('admin1234', 10);
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash: adminHash,
      displayName: 'Administrador',
      role: 'admin',
    },
  });

  const cashierHash = await bcrypt.hash('cajero1234', 10);
  await prisma.user.upsert({
    where: { username: 'cajero1' },
    update: {},
    create: {
      username: 'cajero1',
      passwordHash: cashierHash,
      displayName: 'Juan Cajero',
      role: 'cashier',
    },
  });

  console.log('✅ Seed completado: usuarios admin y cajero1');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
