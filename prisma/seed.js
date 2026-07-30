// Seed mínimo: la fila Tenant (identidad de la base) y los usuarios necesarios
// para entrar al sistema. El catálogo (categorías, ingredientes, productos),
// proveedores y stock se cargan desde la app de administración.
//
// En JavaScript plano (no TS) para poder correr también en la imagen de
// producción, que no instala devDependencies (sin ts-node).

// dotenv es devDependency: en producción las env vars vienen del entorno.
try {
  require('dotenv/config');
} catch {}

/**
 * Junta y valida la configuración del seed a partir del entorno, sin tocar la base.
 * Separada de `main()` para poder testearla sin necesitar Postgres ni el cliente de
 * Prisma generado (ver prisma/seed.spec o src/prisma/seed.spec.ts).
 *
 * Reglas (ver docs/adr/0001-multi-tenancy-base-por-cliente.md y
 * docs/specs/0001-multi-tenant-vps-compartido.md § 1.2):
 * - TENANT_SLUG y TENANT_LEGAL_NAME son obligatorias siempre: sin ellas no hay
 *   fila Tenant que crear, y esa fila es la que `restore.sh` usa para verificar
 *   que un dump no se restaure sobre la base de otro cliente.
 * - SEED_ADMIN_PASSWORD es obligatoria en producción y sin default: motor de
 *   Postgres compartido entre clientes + contraseña hardcodeada conocida
 *   (`admin1234`) es un agujero de seguridad real, no solo teórico.
 * - `cajero1` es un usuario de demo. Crearlo en producción replicaría
 *   credenciales conocidas en la base de cada cliente del motor compartido.
 */
function resolveSeedConfig(env = process.env) {
  const isProduction = env.NODE_ENV === 'production';

  const tenantSlug = env.TENANT_SLUG;
  const tenantLegalName = env.TENANT_LEGAL_NAME;
  if (!tenantSlug || !tenantLegalName) {
    throw new Error(
      'Faltan TENANT_SLUG y/o TENANT_LEGAL_NAME: son obligatorias para poblar la fila ' +
        'Tenant (identidad de la base, ver docs/adr/0001-multi-tenancy-base-por-cliente.md).',
    );
  }

  const adminPassword = env.SEED_ADMIN_PASSWORD;
  if (isProduction && !adminPassword) {
    throw new Error(
      'SEED_ADMIN_PASSWORD es obligatoria con NODE_ENV=production: no hay contraseña ' +
        'por default para no repetir una credencial conocida en todas las bases del motor compartido.',
    );
  }

  return {
    tenantSlug,
    tenantLegalName,
    // Fuera de producción se mantiene el valor histórico para no romper el flujo
    // de desarrollo local (docker-compose.yml de la raíz no define SEED_ADMIN_PASSWORD).
    adminPassword: adminPassword || 'admin1234',
    seedCashier: !isProduction,
  };
}

async function main() {
  const config = resolveSeedConfig();

  // Requires pesados (cliente de Prisma generado + bcrypt) recién acá adentro:
  // así `resolveSeedConfig` se puede testear sin depender de que exista el build
  // (dist/generated/prisma) ni de una conexión real a Postgres.
  const { PrismaClient } = require('../dist/generated/prisma/client');
  const { PrismaPg } = require('@prisma/adapter-pg');
  const bcrypt = require('bcrypt');

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  try {
    console.log('🌱 Iniciando seed...');

    await prisma.tenant.upsert({
      where: { id: 1 },
      update: { slug: config.tenantSlug, legalName: config.tenantLegalName },
      create: { id: 1, slug: config.tenantSlug, legalName: config.tenantLegalName },
    });

    const adminHash = await bcrypt.hash(config.adminPassword, 10);
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

    if (config.seedCashier) {
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
    }

    console.log(
      config.seedCashier
        ? '✅ Seed completado: tenant, admin y cajero1'
        : '✅ Seed completado: tenant y admin (cajero1 omitido en producción)',
    );
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = { resolveSeedConfig };

// Solo corre al ejecutarse directamente (`node prisma/seed.js`, o vía el hook de
// Prisma). Al hacer `require('./seed.js')` desde un test, esta rama no se ejecuta.
if (require.main === module) {
  main().catch((e) => {
    console.error(e.message || e);
    process.exit(1);
  });
}
