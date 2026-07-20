import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PosModule } from './pos/pos.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CatalogModule } from './catalog/catalog.module';
import { SalesRootModule } from './sales/sales.module';
import { PurchasingModule } from './purchasing/purchasing.module';
import { CustomersModule } from './customers/customers.module';
import { DriversModule } from './drivers/drivers.module';
import { CallsModule } from './calls/calls.module';
import { FeaturesModule } from './common/features/features.module';
import { envValidationSchema } from './config/env.validation';
import { readFeatureFlags } from './config/feature-flags';

// ── Carga de config + feature flags ────────────────────────────────────────────
//
// IMPORTANTE sobre el orden: `ConfigModule.forRoot()` valida las env vars con Joi y vuelca
// los valores (con sus defaults) de vuelta a `process.env` de forma SÍNCRONA como parte de
// su propia ejecución, ANTES de su primer `await` interno (ver `assignVariablesToProcess`
// en @nestjs/config/dist/config.module.js). Por eso alcanza con invocarlo antes de llamar a
// `readFeatureFlags()`: para cuando este archivo llega a esa línea, `process.env.FEATURE_*`
// ya reflejan los valores validados/con default de Joi.
//
// Si una combinación de flags es inválida (ver reglas en env.validation.ts), Joi tira un
// error — pero como `forRoot` es una función `async`, ese throw se convierte en una promesa
// rechazada (no un throw síncrono que frene la carga de este archivo). Esa promesa queda
// como el elemento `configModule` del array `imports`, y Nest la `await`ea recién dentro de
// `NestFactory.create()` (ver main.ts) al resolver el grafo de módulos — ahí es donde
// efectivamente aparece el fail-fast: el arranque del servidor queda rechazado con el
// mensaje de Joi antes de levantar el puerto HTTP.
const configModule = ConfigModule.forRoot({
  isGlobal: true,
  envFilePath: '.env',
  validationSchema: envValidationSchema,
  expandVariables: true,
});

const features = readFeatureFlags();

@Module({
  imports: [
    configModule,
    PrismaModule,
    AuthModule,

    // ─── Gestión (v1): catálogo, proveedores, compras, facturas, stock ───────────
    // Sin dependencias de código hacia customers/sales/pos/drivers/calls (verificado):
    // siempre montado, funciona con todos los flags en false.
    CatalogModule,
    PurchasingModule,

    // GET /api/features (público) + FeatureGuard: siempre montado, no está gateado.
    FeaturesModule,

    // ─── Módulos completamente gateados ──────────────────────────────────────────
    // Técnica: desmontado total (no se registran en el array `imports`) → sus rutas dan
    // 404 con el flag apagado. Se eligió esta técnica porque ninguno de estos módulos es
    // importado por otro módulo activo con el flag apagado (ver reporte de la tarea).
    ...(features.customers ? [CustomersModule, DriversModule] : []), // FEATURE_CUSTOMERS
    ...(features.pos ? [PosModule, SalesRootModule] : []), // FEATURE_POS (incluye ventas y caja)
    ...(features.calls ? [CallsModule] : []), // FEATURE_CALLS (requiere pos + customers, validado en Joi)
  ],
})
export class AppModule {}
