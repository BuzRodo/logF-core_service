import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

function buildContext(role: string | undefined): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user: role ? { sub: 'u-1', username: 'u', role } : undefined }),
    }),
  } as unknown as ExecutionContext;
}

function buildReflector(required: string[] | undefined): Reflector {
  return { getAllAndOverride: jest.fn().mockReturnValue(required) } as unknown as Reflector;
}

describe('RolesGuard', () => {
  it('deja pasar si el handler no tiene metadata @Roles (endpoint abierto a cualquier autenticado)', () => {
    const guard = new RolesGuard(buildReflector(undefined));
    expect(guard.canActivate(buildContext('cashier'))).toBe(true);
  });

  it('deja pasar si el rol del usuario está en la lista requerida', () => {
    const guard = new RolesGuard(buildReflector(['admin', 'supervisor']));
    expect(guard.canActivate(buildContext('supervisor'))).toBe(true);
  });

  it('rechaza a cashier si el endpoint requiere admin', () => {
    const guard = new RolesGuard(buildReflector(['admin']));
    expect(guard.canActivate(buildContext('cashier'))).toBe(false);
  });

  it('rechaza a supervisor si el endpoint requiere admin', () => {
    const guard = new RolesGuard(buildReflector(['admin']));
    expect(guard.canActivate(buildContext('supervisor'))).toBe(false);
  });

  it('rechaza a cashier si el endpoint requiere admin o supervisor (ej: reverse/void/refund de tarjeta)', () => {
    const guard = new RolesGuard(buildReflector(['admin', 'supervisor']));
    expect(guard.canActivate(buildContext('cashier'))).toBe(false);
  });

  it('deja pasar a admin siempre que su rol esté en la lista', () => {
    const guard = new RolesGuard(buildReflector(['admin']));
    expect(guard.canActivate(buildContext('admin'))).toBe(true);
  });
});
