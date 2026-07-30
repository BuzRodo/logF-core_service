import * as Joi from 'joi';

/**
 * Feature flags de negocio (ver `src/common/features`). Todas apagadas por default para
 * poder liberar una v1 "solo gestión" (catálogo, proveedores, compras, facturas, stock) sin
 * tocar código: basta con no setear estas env vars (o setearlas en `false` explícitamente).
 */
const featureFlagsSchema = {
  FEATURE_POS: Joi.boolean().default(false),
  FEATURE_CASH: Joi.boolean().default(false),
  FEATURE_CALLS: Joi.boolean().default(false),
  FEATURE_CUSTOMERS: Joi.boolean().default(false),
  FEATURE_SALES_REPORTS: Joi.boolean().default(false),
  // Gastronómico opcional: recetas, costo por plato, margen. Sin dependencias con los
  // demás flags (catalog/products no importa nada de sales/pos/customers/calls).
  FEATURE_RECIPES: Joi.boolean().default(false),
};

/**
 * Validación cruzada de dependencias entre flags: falla el arranque (ConfigModule.forRoot
 * tira una excepción síncrona) con un mensaje explícito si la combinación no tiene sentido.
 *
 * Dependencias reales verificadas en el código (ver reporte de la tarea):
 * - `SalesService.create()` (src/sales/sales/sales.service.ts) exige una `CashSession`
 *   abierta antes de registrar una venta, y `SalesModule` importa `CashSessionsModule`
 *   a nivel de código (no se puede separar en runtime) → FEATURE_CASH requiere FEATURE_POS.
 * - `CallsModule` importa `CustomersModule` (matching de caller ID por teléfono) y
 *   `CallsGateway` usa el JWT del login del POS/admin → FEATURE_CALLS requiere
 *   FEATURE_POS y FEATURE_CUSTOMERS.
 * - Los endpoints de reportes de ventas (`GET /api/sales/summary|by-product|by-driver`)
 *   viven en el mismo controller que la creación de ventas, que solo existe si
 *   FEATURE_POS está activo → FEATURE_SALES_REPORTS requiere FEATURE_POS.
 * No se encontraron otras dependencias cruzadas: catalog/purchasing no importan nada de
 * customers/sales/pos/drivers/calls, por lo que la "gestión" funciona con todas en false.
 */
function validateFeatureDependencies(value: Record<string, boolean>, helpers: Joi.CustomHelpers) {
  const errors: string[] = [];

  if (value.FEATURE_CASH && !value.FEATURE_POS) {
    errors.push('FEATURE_CASH=true requiere FEATURE_POS=true (las sesiones de caja son parte del módulo de ventas del POS)');
  }
  if (value.FEATURE_CALLS && (!value.FEATURE_POS || !value.FEATURE_CUSTOMERS)) {
    errors.push('FEATURE_CALLS=true requiere FEATURE_POS=true y FEATURE_CUSTOMERS=true (matching de llamadas por cliente + panel en el POS)');
  }
  if (value.FEATURE_SALES_REPORTS && !value.FEATURE_POS) {
    errors.push('FEATURE_SALES_REPORTS=true requiere FEATURE_POS=true (los reportes de ventas dependen de que existan ventas)');
  }

  if (errors.length) {
    return helpers.message({ custom: errors.join(' | ') });
  }
  return value;
}

export const envValidationSchema = Joi.object({
  DATABASE_URL: Joi.string().required(),
  // Identifica la base a la que corresponde este proceso (ver
  // docs/adr/0001-multi-tenancy-base-por-cliente.md): kebab-case porque de acá se
  // derivan subdominios (DNS no admite `_`), y con tope de 20 caracteres porque el
  // slug también compone nombres de base/rol de Postgres y el alias de red del
  // contenedor. Inmutable una vez asignado: no se deriva del nombre comercial del
  // cliente porque ese sí puede cambiar.
  TENANT_SLUG: Joi.string()
    .pattern(/^[a-z][a-z0-9-]{1,19}$/)
    .required()
    .messages({
      'string.pattern.base':
        'TENANT_SLUG debe ser kebab-case, empezar con una letra minúscula y medir entre 2 y 20 caracteres (a-z, 0-9, guiones)',
      'string.empty': 'TENANT_SLUG es obligatoria',
      'any.required': 'TENANT_SLUG es obligatoria',
    }),
  JWT_SECRET: Joi.string().min(16).required(),
  JWT_ACCESS_EXPIRES: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES: Joi.string().default('7d'),
  TAX_RATE: Joi.number().min(0).max(1).default(0.22),

  // Fiserv ITD (opcionales en dev, requeridas en prod)
  ITD_BASE_URL: Joi.string().allow('').optional(),
  ITD_SYSTEM_ID: Joi.string().allow('').optional(),
  ITD_POS_ID: Joi.string().allow('').optional(),
  ITD_BRANCH: Joi.string().allow('').optional(),
  ITD_CLIENT_APP_ID: Joi.string().allow('').optional(),
  ITD_PASSWORD: Joi.string().allow('').optional(),

  // Caller ID / llamadas entrantes: clave que usa el capturador local para autenticar
  // POST /api/incoming-calls (no es JWT). Opcional a nivel de validación de env porque el
  // guard ya rechaza todo (y loguea warning) si falta; así no se rompe el arranque en dev.
  AGENT_API_KEY: Joi.string().allow('').optional(),

  ...featureFlagsSchema,
})
  // allowUnknown ya lo aplica ConfigModule.forRoot por default (ver getSchemaValidationOptions),
  // así que el resto de las env vars del proceso (PATH, NODE_ENV, etc.) no rompen la validación.
  .custom(validateFeatureDependencies, 'Validación de dependencias entre feature flags');
