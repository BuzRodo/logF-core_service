import { ConfigService } from '@nestjs/config';
import { FeaturesService } from './features.service';

function buildConfig(values: Record<string, string | undefined>): ConfigService {
  return { get: jest.fn((key: string) => values[key]) } as unknown as ConfigService;
}

describe('FeaturesService', () => {
  it('expone todo en false si ConfigService no tiene ningún FEATURE_* (default v1 "solo gestión")', () => {
    const svc = new FeaturesService(buildConfig({}));
    expect(svc.toPublicDto()).toEqual({
      pos: false,
      cash: false,
      calls: false,
      customers: false,
      salesReports: false,
      recipes: false,
    });
  });

  it('parsea únicamente el string "true" como habilitado', () => {
    const svc = new FeaturesService(
      buildConfig({
        FEATURE_POS: 'true',
        FEATURE_CASH: 'true',
        FEATURE_CALLS: 'false',
        FEATURE_CUSTOMERS: 'true',
        FEATURE_SALES_REPORTS: 'yes', // valor inválido → se trata como false
        FEATURE_RECIPES: 'true',
      }),
    );

    expect(svc.pos).toBe(true);
    expect(svc.cash).toBe(true);
    expect(svc.calls).toBe(false);
    expect(svc.customers).toBe(true);
    expect(svc.salesReports).toBe(false);
    expect(svc.recipes).toBe(true);
  });

  it('isEnabled(feature) refleja el mismo valor que la propiedad correspondiente', () => {
    const svc = new FeaturesService(buildConfig({ FEATURE_POS: 'true' }));
    expect(svc.isEnabled('pos')).toBe(true);
    expect(svc.isEnabled('cash')).toBe(false);
  });

  it('toPublicDto() devuelve solo los 6 booleanos (nada más)', () => {
    const svc = new FeaturesService(buildConfig({ FEATURE_POS: 'true' }));
    expect(Object.keys(svc.toPublicDto()).sort()).toEqual(
      ['calls', 'cash', 'customers', 'pos', 'recipes', 'salesReports'].sort(),
    );
  });
});
