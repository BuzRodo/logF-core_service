// prisma/seed.js es JavaScript plano (sin sintaxis TS, ver el comentario en su
// cabecera): no puede vivir bajo src/ ni importarse con `import`, así que este
// test lo requiere con `require()` y solo ejercita `resolveSeedConfig`, la parte
// pura (sin tocar Postgres ni el cliente de Prisma) que decide qué se siembra.
const { resolveSeedConfig } = require('../../prisma/seed.js');

describe('seed.js — resolveSeedConfig', () => {
  const TENANT_ENV = {
    TENANT_SLUG: 'la-cumbre',
    TENANT_LEGAL_NAME: 'La Cumbre S.A.',
  };

  it('fuera de producción no exige SEED_ADMIN_PASSWORD y cae en el default de desarrollo', () => {
    const config = resolveSeedConfig({ ...TENANT_ENV, NODE_ENV: 'development' });
    expect(config.adminPassword).toBe('admin1234');
    expect(config.seedCashier).toBe(true);
  });

  it('en producción sin SEED_ADMIN_PASSWORD, aborta', () => {
    expect(() => resolveSeedConfig({ ...TENANT_ENV, NODE_ENV: 'production' })).toThrow(
      /SEED_ADMIN_PASSWORD es obligatoria/,
    );
  });

  it('en producción con SEED_ADMIN_PASSWORD, usa esa contraseña y no crea cajero1', () => {
    const config = resolveSeedConfig({
      ...TENANT_ENV,
      NODE_ENV: 'production',
      SEED_ADMIN_PASSWORD: 'un-secreto-largo',
    });
    expect(config.adminPassword).toBe('un-secreto-largo');
    expect(config.seedCashier).toBe(false);
  });

  it('aborta si falta TENANT_SLUG', () => {
    expect(() =>
      resolveSeedConfig({ TENANT_LEGAL_NAME: 'La Cumbre S.A.', NODE_ENV: 'development' }),
    ).toThrow(/TENANT_SLUG/);
  });

  it('aborta si falta TENANT_LEGAL_NAME', () => {
    expect(() => resolveSeedConfig({ TENANT_SLUG: 'la-cumbre', NODE_ENV: 'development' })).toThrow(
      /TENANT_LEGAL_NAME/,
    );
  });
});
