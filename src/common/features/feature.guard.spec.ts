import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FeatureGuard } from './feature.guard';
import { FeaturesService } from './features.service';

function buildContext(): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

function buildReflector(required: string[] | undefined): Reflector {
  return { getAllAndOverride: jest.fn().mockReturnValue(required) } as unknown as Reflector;
}

function buildFeatures(enabled: Record<string, boolean>): FeaturesService {
  return { isEnabled: (f: string) => !!enabled[f] } as unknown as FeaturesService;
}

describe('FeatureGuard', () => {
  it('deja pasar si el handler no tiene metadata @RequireFeature', () => {
    const guard = new FeatureGuard(buildReflector(undefined), buildFeatures({}));
    expect(guard.canActivate(buildContext())).toBe(true);
  });

  it('deja pasar si el feature requerido está habilitado', () => {
    const guard = new FeatureGuard(buildReflector(['cash']), buildFeatures({ cash: true }));
    expect(guard.canActivate(buildContext())).toBe(true);
  });

  it('rechaza con 403 (ForbiddenException) si el feature requerido está deshabilitado', () => {
    const guard = new FeatureGuard(buildReflector(['cash']), buildFeatures({ cash: false }));
    expect(() => guard.canActivate(buildContext())).toThrow(ForbiddenException);
  });

  it('rechaza si falta cualquiera de varios features requeridos', () => {
    const guard = new FeatureGuard(
      buildReflector(['pos', 'customers']),
      buildFeatures({ pos: true, customers: false }),
    );
    expect(() => guard.canActivate(buildContext())).toThrow(ForbiddenException);
  });

  it('el mensaje de error menciona el/los feature(s) faltantes', () => {
    const guard = new FeatureGuard(buildReflector(['salesReports']), buildFeatures({ salesReports: false }));
    try {
      guard.canActivate(buildContext());
      fail('debía tirar ForbiddenException');
    } catch (e) {
      expect((e as ForbiddenException).message).toContain('salesReports');
    }
  });

  it('deja pasar si la lista de features requeridos está vacía', () => {
    const guard = new FeatureGuard(buildReflector([]), buildFeatures({}));
    expect(guard.canActivate(buildContext())).toBe(true);
  });
});
