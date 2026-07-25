import { envValidationSchema } from './env.validation';

// Env mínimo requerido para que la validación llegue a la parte de feature flags.
const BASE_ENV = {
  DATABASE_URL: 'postgres://user:pass@localhost:5432/logfood',
  JWT_SECRET: 'a'.repeat(32),
};

function validate(extra: Record<string, string> = {}) {
  return envValidationSchema.validate(
    { ...BASE_ENV, ...extra },
    { abortEarly: false, allowUnknown: true },
  );
}

describe('envValidationSchema — feature flags', () => {
  it('no requiere ningún FEATURE_* y por default deja todo en false (v1 "solo gestión")', () => {
    const { error, value } = validate();
    expect(error).toBeUndefined();
    expect(value.FEATURE_POS).toBe(false);
    expect(value.FEATURE_CASH).toBe(false);
    expect(value.FEATURE_CALLS).toBe(false);
    expect(value.FEATURE_CUSTOMERS).toBe(false);
    expect(value.FEATURE_SALES_REPORTS).toBe(false);
  });

  it('acepta explícitamente todas en false', () => {
    const { error } = validate({
      FEATURE_POS: 'false',
      FEATURE_CASH: 'false',
      FEATURE_CALLS: 'false',
      FEATURE_CUSTOMERS: 'false',
      FEATURE_SALES_REPORTS: 'false',
    });
    expect(error).toBeUndefined();
  });

  it('rechaza FEATURE_CASH=true sin FEATURE_POS', () => {
    const { error } = validate({ FEATURE_CASH: 'true' });
    expect(error?.message).toMatch(/FEATURE_CASH=true requiere FEATURE_POS=true/);
  });

  it('acepta FEATURE_CASH=true junto con FEATURE_POS=true', () => {
    const { error } = validate({ FEATURE_POS: 'true', FEATURE_CASH: 'true' });
    expect(error).toBeUndefined();
  });

  it('rechaza FEATURE_CALLS=true sin FEATURE_POS ni FEATURE_CUSTOMERS', () => {
    const { error } = validate({ FEATURE_CALLS: 'true' });
    expect(error?.message).toMatch(/FEATURE_CALLS=true requiere FEATURE_POS=true y FEATURE_CUSTOMERS=true/);
  });

  it('rechaza FEATURE_CALLS=true si solo está FEATURE_POS (falta FEATURE_CUSTOMERS)', () => {
    const { error } = validate({ FEATURE_CALLS: 'true', FEATURE_POS: 'true' });
    expect(error?.message).toMatch(/FEATURE_CALLS=true requiere/);
  });

  it('rechaza FEATURE_CALLS=true si solo está FEATURE_CUSTOMERS (falta FEATURE_POS)', () => {
    const { error } = validate({ FEATURE_CALLS: 'true', FEATURE_CUSTOMERS: 'true' });
    expect(error?.message).toMatch(/FEATURE_CALLS=true requiere/);
  });

  it('acepta FEATURE_CALLS=true con FEATURE_POS y FEATURE_CUSTOMERS en true', () => {
    const { error } = validate({
      FEATURE_CALLS: 'true',
      FEATURE_POS: 'true',
      FEATURE_CUSTOMERS: 'true',
    });
    expect(error).toBeUndefined();
  });

  it('rechaza FEATURE_SALES_REPORTS=true sin FEATURE_POS', () => {
    const { error } = validate({ FEATURE_SALES_REPORTS: 'true' });
    expect(error?.message).toMatch(/FEATURE_SALES_REPORTS=true requiere FEATURE_POS=true/);
  });

  it('acepta FEATURE_SALES_REPORTS=true junto con FEATURE_POS=true', () => {
    const { error } = validate({ FEATURE_POS: 'true', FEATURE_SALES_REPORTS: 'true' });
    expect(error).toBeUndefined();
  });

  it('acumula varios mensajes de error cuando se violan varias reglas a la vez', () => {
    const { error } = validate({ FEATURE_CASH: 'true', FEATURE_SALES_REPORTS: 'true' });
    expect(error?.message).toMatch(/FEATURE_CASH=true requiere/);
    expect(error?.message).toMatch(/FEATURE_SALES_REPORTS=true requiere/);
  });

  it('acepta todos los flags encendidos a la vez (combinación completa válida)', () => {
    const { error } = validate({
      FEATURE_POS: 'true',
      FEATURE_CASH: 'true',
      FEATURE_CALLS: 'true',
      FEATURE_CUSTOMERS: 'true',
      FEATURE_SALES_REPORTS: 'true',
    });
    expect(error).toBeUndefined();
  });
});
