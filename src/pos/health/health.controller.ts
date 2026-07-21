/**
 * HealthController
 * Endpoint para verificar conectividad con el pinpad via ITD (echoTest).
 * Llamar al abrir la caja para confirmar que el pinpad está online.
 */

import { Controller, Post, HttpCode, HttpStatus, Logger, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TransactionsService } from '../transactions/transactions.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

// Hueco de seguridad cerrado: este endpoint no tenía NINGÚN guard (ni JWT), quedaba
// abierto a cualquiera sin autenticar, que podía disparar el echoTest contra Fiserv ITD
// a piacere. No requiere @Roles: cualquier usuario autenticado puede pedir el health
// check del pinpad al abrir caja, sin importar su rol.
@ApiTags('POS - Health')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
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
