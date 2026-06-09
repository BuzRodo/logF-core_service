/**
 * TransactionsController
 *
 * Expone los endpoints que consume el frontend POS.
 * Rutas base: /api/pos/transactions
 *
 * Seguridad:
 * - Las credenciales ITD (SystemId, PosID, etc.) NUNCA son aceptadas del body
 *   del cliente — siempre se inyectan desde variables de entorno en el servicio.
 * - userId se extrae del token JWT (cuando el guard de auth esté implementado).
 *   Por ahora se acepta del header X-User-Id para desarrollo.
 */

import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
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

@ApiTags('POS - Transacciones')
@Controller('api/pos/transactions')
export class TransactionsController {
  private readonly logger = new Logger(TransactionsController.name);

  constructor(private readonly transactionsService: TransactionsService) {}

  // ── Helper: extrae userId del header (reemplazar por JWT guard) ────────────
  private getUserId(headers: Record<string, string>): string {
    return headers['x-user-id'] ?? 'anonymous';
  }

  /**
   * POST /api/pos/transactions/purchase
   * Inicia una compra con tarjeta. Devuelve STransactionId para el polling.
   */
  @Post('purchase')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar compra con tarjeta (processFinancialPurchase)' })
  @ApiResponse({ status: 200, description: 'Transacción registrada en ITD' })
  initiatePurchase(
    @Body() dto: InitPurchaseDto,
    @Headers() headers: Record<string, string>,
  ) {
    return this.transactionsService.initiatePurchase(dto, this.getUserId(headers));
  }

  /**
   * POST /api/pos/transactions/query
   * Consulta el estado de una transacción (POLLING, mín. cada 3s).
   */
  @Post('query')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Consultar estado de transacción (processFinancialPurchaseQuery)' })
  queryTransaction(
    @Body() dto: QueryTransactionDto,
  ) {
    return this.transactionsService.queryTransaction(dto);
  }

  /**
   * POST /api/pos/transactions/confirm
   * Confirma/modifica la compra después de leer la tarjeta (NeedToReadCard=true).
   */
  @Post('confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirmar compra (processConfirmFinancialPurchase)' })
  confirmPurchase(
    @Body() dto: ConfirmPurchaseDto,
    @Headers() headers: Record<string, string>,
  ) {
    return this.transactionsService.confirmPurchase(dto, this.getUserId(headers));
  }

  /**
   * POST /api/pos/transactions/cancel
   * Cancela la transacción antes de pasar la tarjeta.
   */
  @Post('cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancelar transacción (cancelFinancialPurchase)' })
  cancelTransaction(
    @Body() dto: CancelTransactionDto,
    @Headers() headers: Record<string, string>,
  ) {
    return this.transactionsService.cancelTransaction(dto, this.getUserId(headers));
  }

  /**
   * POST /api/pos/transactions/reverse
   * Reverso de una transacción completada.
   */
  @Post('reverse')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reverso de transacción (processFinancialReverse)' })
  reverseTransaction(
    @Body() dto: ReverseTransactionDto,
    @Headers() headers: Record<string, string>,
  ) {
    return this.transactionsService.reverseTransaction(dto, this.getUserId(headers));
  }

  /**
   * POST /api/pos/transactions/void
   * Anula una compra dentro del lote actual por número de ticket.
   */
  @Post('void')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Anular por ticket (processFinancialPurchaseVoidByTicket)' })
  voidByTicket(
    @Body() dto: VoidByTicketDto,
    @Headers() headers: Record<string, string>,
  ) {
    return this.transactionsService.voidByTicket(dto, this.getUserId(headers));
  }

  /**
   * POST /api/pos/transactions/refund
   * Devolución post-cierre de lote.
   */
  @Post('refund')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Devolución (processFinancialPurchaseRefund)' })
  refund(
    @Body() dto: RefundDto,
    @Headers() headers: Record<string, string>,
  ) {
    return this.transactionsService.refund(dto, this.getUserId(headers));
  }

  /**
   * POST /api/pos/transactions/search
   * Consulta de transacciones por rango de fechas.
   */
  @Post('search')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Buscar transacciones (processQuery)' })
  searchTransactions(@Body() dto: SearchTransactionsDto) {
    return this.transactionsService.searchTransactions(dto);
  }

  /**
   * GET /api/pos/transactions/:transactionId/ticket
   * Obtiene el ticket HTML de una transacción.
   */
  @Get(':transactionId/ticket')
  @ApiOperation({ summary: 'Obtener ticket HTML (getHTMLTransactionTicket)' })
  getTicket(@Param('transactionId') transactionId: string) {
    return this.transactionsService.getTicketHtml(transactionId);
  }
}
