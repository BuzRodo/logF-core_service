import { ExecutionContext, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AgentApiKeyGuard } from './agent-api-key.guard';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildContext(headers: Record<string, string | undefined>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers }),
    }),
  } as unknown as ExecutionContext;
}

function buildConfig(agentApiKey: string | undefined): ConfigService {
  return { get: jest.fn().mockReturnValue(agentApiKey) } as unknown as ConfigService;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AgentApiKeyGuard', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('acepta la solicitud si el header X-Agent-Key coincide con AGENT_API_KEY', () => {
    const guard = new AgentApiKeyGuard(buildConfig('secreto-123'));
    const ctx = buildContext({ 'x-agent-key': 'secreto-123' });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('rechaza la solicitud si el header X-Agent-Key no coincide', () => {
    const guard = new AgentApiKeyGuard(buildConfig('secreto-123'));
    const ctx = buildContext({ 'x-agent-key': 'otro-valor' });
    expect(guard.canActivate(ctx)).toBe(false);
  });

  it('rechaza la solicitud si falta el header X-Agent-Key', () => {
    const guard = new AgentApiKeyGuard(buildConfig('secreto-123'));
    const ctx = buildContext({});
    expect(guard.canActivate(ctx)).toBe(false);
  });

  it('rechaza siempre y loguea warning al construirse si AGENT_API_KEY no está configurada', () => {
    const guard = new AgentApiKeyGuard(buildConfig(undefined));
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('AGENT_API_KEY'));

    const ctx = buildContext({ 'x-agent-key': 'lo-que-sea' });
    expect(guard.canActivate(ctx)).toBe(false);
  });

  it('compara en tiempo aproximadamente constante (no revienta con largos distintos)', () => {
    const guard = new AgentApiKeyGuard(buildConfig('clave-larga-de-verdad'));
    const ctx = buildContext({ 'x-agent-key': 'x' });
    expect(guard.canActivate(ctx)).toBe(false);
  });
});
