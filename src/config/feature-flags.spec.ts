import { readFeatureFlags } from './feature-flags';

describe('readFeatureFlags', () => {
  it('devuelve todo en false si no hay ninguna env var seteada (default v1 "solo gestión")', () => {
    expect(readFeatureFlags({})).toEqual({
      pos: false,
      cash: false,
      calls: false,
      customers: false,
      salesReports: false,
      recipes: false,
    });
  });

  it('parsea "true" (string) como true y cualquier otro valor como false', () => {
    expect(
      readFeatureFlags({
        FEATURE_POS: 'true',
        FEATURE_CASH: 'false',
        FEATURE_CALLS: 'TRUE', // no es 'true' exacto → false
        FEATURE_CUSTOMERS: '1',
        FEATURE_SALES_REPORTS: '',
      }),
    ).toEqual({
      pos: true,
      cash: false,
      calls: false,
      customers: false,
      salesReports: false,
      recipes: false,
    });
  });

  it('usa process.env como default cuando no se pasa un objeto explícito', () => {
    const prev = process.env.FEATURE_POS;
    process.env.FEATURE_POS = 'true';
    try {
      expect(readFeatureFlags().pos).toBe(true);
    } finally {
      if (prev === undefined) delete process.env.FEATURE_POS;
      else process.env.FEATURE_POS = prev;
    }
  });

  it('activa todos los flags cuando todas las env vars son "true"', () => {
    expect(
      readFeatureFlags({
        FEATURE_POS: 'true',
        FEATURE_CASH: 'true',
        FEATURE_CALLS: 'true',
        FEATURE_CUSTOMERS: 'true',
        FEATURE_SALES_REPORTS: 'true',
        FEATURE_RECIPES: 'true',
      }),
    ).toEqual({
      pos: true,
      cash: true,
      calls: true,
      customers: true,
      salesReports: true,
      recipes: true,
    });
  });
});
