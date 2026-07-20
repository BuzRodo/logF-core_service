/**
 * Lectura "cruda" de los feature flags directamente desde `process.env`.
 *
 * Se usa en dos lugares:
 * 1. `app.module.ts`, para decidir qué módulos registrar en el array `imports` de
 *    `@Module`. Esa decisión se toma cuando la clase `AppModule` se evalúa (import-time),
 *    ANTES de que exista contenedor de DI — por eso no se puede resolver vía
 *    `ConfigService` inyectado y hace falta leer `process.env` a pelo.
 * 2. `FeaturesService` (src/common/features), que expone los mismos valores ya tipados
 *    al resto de la app a través de DI normal, reutilizando este mismo parser.
 *
 * IMPORTANTE: `ConfigModule.forRoot({ validationSchema: envValidationSchema, ... })` vuelca
 * los valores validados (con sus defaults Joi) de vuelta a `process.env` de forma SÍNCRONA
 * como parte de su propia ejecución (ver `assignVariablesToProcess` en
 * @nestjs/config/dist/config.module.js) — el único `await` de `forRoot` ocurre después de
 * eso. Por eso, mientras `ConfigModule.forRoot(...)` se invoque antes de llamar a
 * `readFeatureFlags()` dentro del mismo array `imports`, los defaults/validaciones de Joi ya
 * están aplicados cuando este helper lee `process.env`.
 */
export interface FeatureFlags {
  pos: boolean;
  cash: boolean;
  calls: boolean;
  customers: boolean;
  salesReports: boolean;
}

const parseBool = (value: string | undefined): boolean => value === 'true';

export function readFeatureFlags(env: NodeJS.ProcessEnv = process.env): FeatureFlags {
  return {
    pos: parseBool(env.FEATURE_POS),
    cash: parseBool(env.FEATURE_CASH),
    calls: parseBool(env.FEATURE_CALLS),
    customers: parseBool(env.FEATURE_CUSTOMERS),
    salesReports: parseBool(env.FEATURE_SALES_REPORTS),
  };
}
