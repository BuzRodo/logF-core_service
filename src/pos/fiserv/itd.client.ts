/**
 * FiservITDClient
 *
 * Cliente HTTP que se comunica directamente con el servicio ITD de Fiserv.
 * Encapsula toda la lógica de comunicación: autenticación, manejo de errores,
 * logging y timeout.
 *
 * Reglas del spec ITD v3.5:
 * - Protocolo: HTTPS REST/JSON
 * - Polling mínimo: 3 segundos entre consultas de estado
 * - TransactionId: usar STransactionId (string) para evitar overflow de 64-bit
 * - Timeout máximo de transacción: 300 segundos
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  ProcessFinancialPurchaseRequest,
  ProcessFinancialPurchaseQueryRequest,
  ProcessFinancialPurchaseQueryResponse,
  ProcessConfirmFinancialPurchaseRequest,
  CancelFinancialPurchaseRequest,
  ProcessFinancialReverseRequest,
  ProcessFinancialPurchaseVoidByTicketRequest,
  ProcessFinancialPurchaseRefundRequest,
  ProcessQueryRequest,
  EchoTestRequest,
  ItdBaseResponse,
  ItdTransactionCreatedResponse,
} from './itd.types';

export class ItdCommunicationError extends Error {
  constructor(
    message: string,
    public readonly operation: string,
    public readonly httpStatus?: number,
    public readonly itdResponseCode?: number,
  ) {
    super(message);
    this.name = 'ItdCommunicationError';
  }
}

@Injectable()
export class FiservITDClient {
  private readonly http: AxiosInstance;
  private readonly logger = new Logger(FiservITDClient.name);

  constructor(private readonly config: ConfigService) {
    const baseURL = this.config.getOrThrow<string>('ITD_BASE_URL');
    const timeoutMs = this.config.get<number>('ITD_TIMEOUT_MS', 15_000);

    this.http = axios.create({
      baseURL,
      timeout: timeoutMs,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    this.http.interceptors.request.use((req) => {
      this.logger.debug(`ITD → ${req.method?.toUpperCase()} ${req.url}`);
      return req;
    });

    this.http.interceptors.response.use(
      (res) => {
        this.logger.debug(
          `ITD ← ${res.config.url} [${res.status}] ResponseCode=${(res.data as ItdBaseResponse)?.ResponseCode}`,
        );
        return res;
      },
      (error: AxiosError) => {
        const status = error.response?.status;
        const url = error.config?.url ?? 'unknown';
        const msg = error.message ?? 'Error de red';
        this.logger.error(`ITD ERROR ← ${url} [${status ?? 'no-response'}] ${msg}`);
        throw new ItdCommunicationError(
          `Error comunicando con ITD en ${url}: ${msg}`,
          url,
          status,
        );
      },
    );
  }

  // ─── Helpers privados ─────────────────────────────────────────────────────

  private async post<TReq, TRes>(endpoint: string, body: TReq): Promise<TRes> {
    const { data } = await this.http.post<TRes>(endpoint, body);
    return data;
  }

  // ─── Operaciones ITD ─────────────────────────────────────────────────────

  /** Registra una compra en ITD. Devuelve el STransactionId para el polling. */
  processFinancialPurchase(
    req: ProcessFinancialPurchaseRequest,
  ): Promise<ItdTransactionCreatedResponse> {
    return this.post('/processFinancialPurchase', req);
  }

  /**
   * Consulta el estado de la transacción.
   * Llamar cada 3 segundos como mínimo (requisito del spec ITD).
   * ResponseCode 12 = tarjeta leída por el pinpad.
   */
  processFinancialPurchaseQuery(
    req: ProcessFinancialPurchaseQueryRequest,
  ): Promise<ProcessFinancialPurchaseQueryResponse> {
    return this.post('/processFinancialPurchaseQuery', req);
  }

  /** Confirma/modifica la compra después de leer la tarjeta (NeedToReadCard=true). */
  processConfirmFinancialPurchase(
    req: ProcessConfirmFinancialPurchaseRequest,
  ): Promise<ItdBaseResponse> {
    return this.post('/processConfirmFinancialPurchase', req);
  }

  /** Cancela la transacción antes de que se pase la tarjeta. */
  cancelFinancialPurchase(req: CancelFinancialPurchaseRequest): Promise<ItdBaseResponse> {
    return this.post('/cancelFinancialPurchase', req);
  }

  /** Reverso de una transacción completada. */
  processFinancialReverse(
    req: ProcessFinancialReverseRequest,
  ): Promise<ItdTransactionCreatedResponse> {
    return this.post('/processFinancialReverse', req);
  }

  /** Anulación de una compra dentro del lote actual (por número de ticket). */
  processFinancialPurchaseVoidByTicket(
    req: ProcessFinancialPurchaseVoidByTicketRequest,
  ): Promise<ItdTransactionCreatedResponse> {
    return this.post('/processFinancialPurchaseVoidByTicket', req);
  }

  /** Devolución de una compra después del cierre de lote. */
  processFinancialPurchaseRefund(
    req: ProcessFinancialPurchaseRefundRequest,
  ): Promise<ItdTransactionCreatedResponse> {
    return this.post('/processFinancialPurchaseRefund', req);
  }

  /** Consulta de transacciones por rango de fechas. */
  processQuery(req: ProcessQueryRequest): Promise<unknown> {
    return this.post('/processQuery', req);
  }

  /** Obtiene el ticket HTML de una transacción. */
  async getHTMLTransactionTicket(transactionId: string): Promise<string> {
    const { data } = await this.http.get<string>(`/getHTMLTransactionTicket/${transactionId}`);
    return data;
  }

  /** Health check: verifica conectividad con ITD y el pinpad. */
  echoTest(req: EchoTestRequest): Promise<ItdBaseResponse> {
    return this.post('/echoTest', req);
  }
}
