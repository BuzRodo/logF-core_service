/**
 * HealthController
 * Endpoint para verificar conectividad con el pinpad via ITD (echoTest).
 * Llamar al abrir la caja para confirmar que el pinpad está online.
 */

import { Controller, Post, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TransactionsService } from '../transactions/transactions.service';

@ApiTags('POS - Health')
@Controller('api/pos/health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly transactionsService: TransactionsService) {}

  /**
   * POST /api/pos/health/echo
   * Verifica que el servicio ITD y el pinpad estén accesibles.
   * ResponseCode 0 = todo OK.
   */
  @Post('echo')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Health check del pinpad via ITD (echoTest)' })
  echoTest() {
    this.logger.log('echoTest solicitado');
    return this.transactionsService.echoTest();
  }
}
