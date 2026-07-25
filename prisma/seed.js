// Seed mínimo: solo los usuarios necesarios para entrar al sistema.
// El catálogo (categorías, ingredientes, productos), proveedores y stock
// se cargan desde la app de administración.
//
// En JavaScript plano (no TS) para poder correr también en la imagen de
// producción, que no instala devDependencies (sin ts-node).

// dotenv es devDependency: en producción las env vars vienen del entorno.
try {
  require('dotenv/config');
} catch {}

// El cliente de Prisma se genera como TypeScript (generated/prisma/client.ts);
// node solo puede requerir la versión compilada, que queda en dist/ tras `npm run build`.
const { PrismaClient } = require('../dist/generated/prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const bcrypt = require('bcrypt');

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

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
