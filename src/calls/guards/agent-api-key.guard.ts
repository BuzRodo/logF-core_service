import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';
import { Request } from 'express';

/**
 * Autentica al capturador local (o al simulador de dev) contra el endpoint
 * `POST /api/incoming-calls` comparando el header `X-Agent-Key` con la env `AGENT_API_KEY`.
 *
 * No usa JWT: quien llama a este endpoint es un proceso local (script del capturador de
 * llamadas o el simulador de dev de la UI), no un usuario logueado en el POS.
 */
@Injectable()
export class AgentApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(AgentApiKeyGuard.name);

  constructor(private readonly config: ConfigService) {
    if (!this.config.get<string>('AGENT_API_KEY')) {
      this.logger.warn(
        'AGENT_API_KEY no está configurada: POST /api/incoming-calls rechazará todas las solicitudes hasta que se configure.',
      );
    }
  }

  canActivate(context: ExecutionContext): boolean {
    const expected = this.config.get<string>('AGENT_API_KEY');
    if (!expected) return false;

    const request = context.switchToHttp().getRequest<Request>();
    const provided = request.headers['x-agent-key'];
    if (!provided || typeof provided !== 'string') return false;

    return this.safeCompare(provided, expected);
  }

  /** Comparación en tiempo constante (evita timing attacks) usando crypto.timingSafeEqual. */
  private safeCompare(provided: string, expected: string): boolean {
    const providedBuf = Buffer.from(provided);
    const expectedBuf = Buffer.from(expected);

    // timingSafeEqual exige buffers del mismo largo; si difieren, ya sabemos que no matchean.
    // (la comparación de largo es aceptada como parte del contrato de timingSafeEqual)
    if (providedBuf.length !== expectedBuf.length) return false;

    return timingSafeEqual(providedBuf, expectedBuf);
  }
}
