import { SetMetadata } from '@nestjs/common';
import { FeatureName } from './features.service';

export const REQUIRE_FEATURE_KEY = 'requireFeature';

/**
 * Decorator para controllers o métodos cuyo módulo NO se puede desmontar por completo
 * (porque otro módulo lo importa a nivel de código), pero cuyos endpoints sí deben
 * responder 403 cuando el feature flag correspondiente está apagado.
 *
 * Usar junto con `FeatureGuard` en `@UseGuards(...)`. Puede aplicarse a nivel de clase
 * (todos los endpoints del controller) o de método (un endpoint puntual dentro de un
 * controller que mezcla rutas gateadas y no gateadas, p. ej. los reportes de ventas dentro
 * de `SalesController`).
 */
export const RequireFeature = (...features: FeatureName[]) => SetMetadata(REQUIRE_FEATURE_KEY, features);
