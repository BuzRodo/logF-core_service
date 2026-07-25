import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FeatureFlags } from '../../config/feature-flags';

export type FeatureName = keyof FeatureFlags;

/**
 * Expone los feature flags ya tipados al resto de la app (vía DI normal, para usar en
 * guards/controllers/servicios). `ConfigService` guarda las env vars como strings (Node no
 * tipa `process.env`), incluso después de que Joi las valide/normalice en
 * `ConfigModule.forRoot` — por eso comparamos contra el string `'true'`, igual que hace
 * `readFeatureFlags` (src/config/feature-flags.ts), fuente de verdad compartida con el
 * registro condicional de módulos en `app.module.ts`.
 */
@Injectable()
export class FeaturesService implements FeatureFlags {
  readonly pos: boolean;
  readonly cash: boolean;
  readonly calls: boolean;
  readonly customers: boolean;
  readonly salesReports: boolean;
  readonly recipes: boolean;

  constructor(private readonly config: ConfigService) {
    this.pos = this.readFlag('FEATURE_POS');
    this.cash = this.readFlag('FEATURE_CASH');
    this.calls = this.readFlag('FEATURE_CALLS');
    this.customers = this.readFlag('FEATURE_CUSTOMERS');
    this.salesReports = this.readFlag('FEATURE_SALES_REPORTS');
    this.recipes = this.readFlag('FEATURE_RECIPES');
  }

  private readFlag(key: string): boolean {
    return String(this.config.get<string>(key) ?? 'false') === 'true';
  }

  isEnabled(feature: FeatureName): boolean {
    return this[feature];
  }

  /** Snapshot público — es exactamente lo que devuelve `GET /api/features`. */
  toPublicDto(): FeatureFlags {
    return {
      pos: this.pos,
      cash: this.cash,
      calls: this.calls,
      customers: this.customers,
      salesReports: this.salesReports,
      recipes: this.recipes,
    };
  }
}
