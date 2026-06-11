/**
 * TransactionsController
 *
 * Expone los endpoints que consume el frontend POS.
 * Rutas base: /api/pos/transactions
 *
 * Seguridad:
 * - Las credenciales ITD (SystemId, PosID, etc.) NUNCA son aceptadas del body
 *   del cliente — siempre se inyectan desde variables de entorno en el servicio.
 * - userId se extrae del JWT via @CurrentUser().
 */

import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import {
  TransactionsService,
  InitPurchaseDto,
  QueryTransactionDto,
  ConfirmPurchaseDto,
  CancelTransactionDto,
  ReverseTransactionDto,
  VoidByTicketDto,
  RefundDto,
  SearchTransactionsDto,
} from './transactions.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../auth/decorators/current-user.decorator';

@ApiTags('POS - Transacciones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/pos/transactions')
export class TransactionsController {
  private readonly logger = new Logger(TransactionsController.name);

  constructor(private readonly transactionsService: TransactionsService) {}

  @Post('purchase')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar compra con tarjeta (processFinancialPurchase)' })
  @ApiResponse({ status: 200, description: 'Transacción registrada en ITD' })
  initiatePurchase(@Body() dto: InitPurchaseDto, @CurrentUser() user: JwtPayload) {
    return this.transactionsService.initiatePurchase(dto, user.sub);
  }

  @Post('query')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Consultar estado de transacción (processFinancialPurchaseQuery)' })
  queryTransaction(@Body() dto: QueryTransactionDto) {
    return this.transactionsService.queryTransaction(dto);
  }

  @Post('confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirmar compra (processConfirmFinancialPurchase)' })
  confirmPurchase(@Body() dto: ConfirmPurchaseDto, @CurrentUser() user: JwtPayload) {
    return this.transactionsService.confirmPurchase(dto, user.sub);
  }

  @Post('cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancelar transacción (cancelFinancialPurchase)' })
  cancelTransaction(@Body() dto: CancelTransactionDto, @CurrentUser() user: JwtPayload) {
    return this.transactionsService.cancelTransaction(dto, user.sub);
  }

  @Post('reverse')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reverso de transacción (processFinancialReverse)' })
  reverseTransaction(@Body() dto: ReverseTransactionDto, @CurrentUser() user: JwtPayload) {
    return this.transactionsService.reverseTransaction(dto, user.sub);
  }

  @Post('void')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Anular por ticket (processFinancialPurchaseVoidByTicket)' })
  voidByTicket(@Body() dto: VoidByTicketDto, @CurrentUser() user: JwtPayload) {
    return this.transactionsService.voidByTicket(dto, user.sub);
  }

  @Post('refund')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Devolución (processFinancialPurchaseRefund)' })
  refund(@Body() dto: RefundDto, @CurrentUser() user: JwtPayload) {
    return this.transactionsService.refund(dto, user.sub);
  }

  @Post('search')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Buscar transacciones (processQuery)' })
  searchTransactions(@Body() dto: SearchTransactionsDto) {
    return this.transactionsService.searchTransactions(dto);
  }

  @Get(':transactionId/ticket')
  @ApiOperation({ summary: 'Obtener ticket HTML (getHTMLTransactionTicket)' })
  getTicket(@Param('transactionId') transactionId: string) {
    return this.transactionsService.getTicketHtml(transactionId);
  }
}
