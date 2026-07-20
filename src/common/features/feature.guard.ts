import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FeaturesService, FeatureName } from './features.service';
import { REQUIRE_FEATURE_KEY } from './require-feature.decorator';

/**
 * Guard genérico que bloquea (403) los endpoints marcados con `@RequireFeature(...)` cuando
 * el flag correspondiente está apagado. Si el handler/controller no tiene metadata de
 * `@RequireFeature`, deja pasar (no afecta rutas sin gating).
 */
@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly features: FeaturesService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<FeatureName[]>(REQUIRE_FEATURE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true;

    const missing = required.filter((feature) => !this.features.isEnabled(feature));
    if (missing.length) {
      throw new ForbiddenException(
        `Funcionalidad deshabilitada por configuración (${missing.join(', ')}). Contactá al administrador para habilitarla.`,
      );
    }
    return true;
  }
}
