/**
 * TransactionsService
 *
 * Orquesta las operaciones de pago: recibe los datos del frontend,
 * enriquece con las credenciales ITD de la configuración del servidor,
 * y delega al FiservITDClient.
 *
 * El frontend solo provee los datos de la transacción (monto, cuotas, etc.).
 * Las credenciales ITD (SystemId, PosID, Branch, ClientAppId) se inyectan
 * aquí desde las variables de entorno — nunca viajan del cliente al servidor.
 */

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FiservITDClient } from '../fiserv/itd.client';
import {
  ProcessFinancialPurchaseRequest,
  ProcessFinancialPurchaseQueryRequest,
  ProcessConfirmFinancialPurchaseRequest,
  CancelFinancialPurchaseRequest,
  ProcessFinancialReverseRequest,
  ProcessFinancialPurchaseVoidByTicketRequest,
  ProcessFinancialPurchaseRefundRequest,
  ProcessQueryRequest,
} from '../fiserv/itd.types';

// ─── DTOs del frontend → backend ────────────────────────────────────────────
// (el frontend envía estos; el backend completa el resto con variables de entorno)

export interface InitPurchaseDto {
  amount: string;
  quotas: number;
  plan: number;
  currency: string;
  taxRefund: number;
  taxableAmount: string;
  invoiceAmount: string;
  invoiceNumber?: string;
  needToReadCard?: boolean;
  tipAmount?: string;
  transactionTimeOut?: number;
  bin?: string;
  issuer?: string;
  specialData?: string;
  cashbackAmount?: string;
}

export interface QueryTransactionDto {
  sTransactionId: string;
  userId: string;
}

export interface ConfirmPurchaseDto {
  sTransactionId: string;
  amount: string;
  quotas: number;
  plan: number;
  currency: string;
  taxRefund: number;
  taxableAmount: string;
  invoiceAmount: string;
  invoiceNumber?: string;
  tipAmount?: string;
}

export interface CancelTransactionDto {
  sTransactionId: string;
}

export interface ReverseTransactionDto {
  sTransactionId: string;
}

export interface VoidByTicketDto {
  ticketNumber: string;
  acquirer?: string;
  bin?: string;
  issuer?: string;
}

export interface RefundDto {
  ticketNumber: string;
  originalTransactionDateyyMMdd: string;
  amount: string;
  quotas: number;
  plan: number;
  currency: string;
  taxRefund: number;
  taxableAmount: string;
  invoiceAmount: string;
  invoiceNumber?: string;
}

export interface SearchTransactionsDto {
  fromDate: string;
  toDate: string;
  onlyConfirmed: boolean;
  posId?: string;
}

// ─── Servicio ────────────────────────────────────────────────────────────────

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    private readonly itdClient: FiservITDClient,
    private readonly config: ConfigService,
  ) {}

  // ─── Config helpers ────────────────────────────────────────────────────────

  private get posId(): string {
    return this.config.getOrThrow<string>('ITD_POS_ID');
  }

  private get systemId(): string {
    return this.config.getOrThrow<string>('ITD_SYSTEM_ID');
  }

  private get branch(): string {
    return this.config.get<string>('ITD_BRANCH', 'SUCURSAL-1');
  }

  private get clientAppId(): string {
    return this.config.get<string>('ITD_CLIENT_APP_ID', 'LOGFOOD-POS');
  }

  /** Genera timestamp en formato ITD: AAAAMMDDHHmmssSSS */
  private now(): string {
    const d = new Date();
    const pad = (n: number, len = 2) => String(n).padStart(len, '0');
    return (
      d.getFullYear() +
      pad(d.getMonth() + 1) +
      pad(d.getDate()) +
      pad(d.getHours()) +
      pad(d.getMinutes()) +
      pad(d.getSeconds()) +
      pad(d.getMilliseconds(), 3)
    );
  }

  /** Base común para todos los requests ITD */
  private baseRequest(userId: string): Pick<
    ProcessFinancialPurchaseRequest,
    'PosID' | 'SystemId' | 'Branch' | 'ClientAppId' | 'UserId' | 'TransactionDateTimeyyyyMMddHHmmssSSS'
  > {
    return {
      PosID: this.posId,
      SystemId: this.systemId,
      Branch: this.branch,
      ClientAppId: this.clientAppId,
      UserId: userId,
      TransactionDateTimeyyyyMMddHHmmssSSS: this.now(),
    };
  }

  // ─── Operaciones ──────────────────────────────────────────────────────────

  async initiatePurchase(dto: InitPurchaseDto, userId: string) {
    this.logger.log(`Iniciando compra: amount=${dto.amount} userId=${userId}`);

    const request: ProcessFinancialPurchaseRequest = {
      ...this.baseRequest(userId),
      Amount: dto.amount,
      Quotas: dto.quotas,
      Plan: dto.plan,
      Currency: dto.currency,
      TaxRefund: dto.taxRefund,
      TaxableAmount: dto.taxableAmount,
      InvoiceAmount: dto.invoiceAmount,
      InvoiceNumber: dto.invoiceNumber,
      NeedToReadCard: dto.needToReadCard ?? false,
      TipAmount: dto.tipAmount,
      TransactionTimeOut: dto.transactionTimeOut ?? 300,
      Bin: dto.bin,
      Issuer: dto.issuer,
      SpecialData: dto.specialData,
      CashbackAmount: dto.cashbackAmount,
    };

    const response = await this.itdClient.processFinancialPurchase(request);
    this.logger.log(
      `Compra iniciada: STransactionId=${response.STransactionId} ResponseCode=${response.ResponseCode}`,
    );
    return response;
  }

  async queryTransaction(dto: QueryTransactionDto) {
    const request: ProcessFinancialPurchaseQueryRequest = {
      ...this.baseRequest(dto.userId),
      STransactionId: dto.sTransactionId,
    };

    return this.itdClient.processFinancialPurchaseQuery(request);
  }

  async confirmPurchase(dto: ConfirmPurchaseDto, userId: string) {
    this.logger.log(`Confirmando compra: STransactionId=${dto.sTransactionId}`);

    const request: ProcessConfirmFinancialPurchaseRequest = {
      ...this.baseRequest(userId),
      STransactionId: dto.sTransactionId,
      Amount: dto.amount,
      Quotas: dto.quotas,
      Plan: dto.plan,
      Currency: dto.currency,
      TaxRefund: dto.taxRefund,
      TaxableAmount: dto.taxableAmount,
      InvoiceAmount: dto.invoiceAmount,
      InvoiceNumber: dto.invoiceNumber,
      TipAmount: dto.tipAmount,
    };

    return this.itdClient.processConfirmFinancialPurchase(request);
  }

  async cancelTransaction(dto: CancelTransactionDto, userId: string) {
    this.logger.log(`Cancelando transacción: STransactionId=${dto.sTransactionId}`);

    const request: CancelFinancialPurchaseRequest = {
      ...this.baseRequest(userId),
      STransactionId: dto.sTransactionId,
    };

    return this.itdClient.cancelFinancialPurchase(request);
  }

  async reverseTransaction(dto: ReverseTransactionDto, userId: string) {
    this.logger.log(`Reversando transacción: STransactionId=${dto.sTransactionId}`);

    const request: ProcessFinancialReverseRequest = {
      ...this.baseRequest(userId),
      STransactionId: dto.sTransactionId,
    };

    return this.itdClient.processFinancialReverse(request);
  }

  async voidByTicket(dto: VoidByTicketDto, userId: string) {
    this.logger.log(`Anulando por ticket: ticketNumber=${dto.ticketNumber}`);

    const request: ProcessFinancialPurchaseVoidByTicketRequest = {
      ...this.baseRequest(userId),
      TicketNumber: dto.ticketNumber,
      Acquirer: dto.acquirer,
      Bin: dto.bin,
      Issuer: dto.issuer,
    };

    return this.itdClient.processFinancialPurchaseVoidByTicket(request);
  }

  async refund(dto: RefundDto, userId: string) {
    this.logger.log(`Devolución: ticketNumber=${dto.ticketNumber} amount=${dto.amount}`);

    const request: ProcessFinancialPurchaseRefundRequest = {
      ...this.baseRequest(userId),
      TicketNumber: dto.ticketNumber,
      OriginalTransactionDateyyMMdd: dto.originalTransactionDateyyMMdd,
      Amount: dto.amount,
      Quotas: dto.quotas,
      Plan: dto.plan,
      Currency: dto.currency,
      TaxRefund: dto.taxRefund,
      TaxableAmount: dto.taxableAmount,
      InvoiceAmount: dto.invoiceAmount,
      InvoiceNumber: dto.invoiceNumber,
    };

    return this.itdClient.processFinancialPurchaseRefund(request);
  }

  async searchTransactions(dto: SearchTransactionsDto) {
    const request: ProcessQueryRequest = {
      SystemId: this.systemId,
      FromDateyyyyMMddHHmmss: dto.fromDate,
      ToDateyyyyMMddHHmmss: dto.toDate,
      OnlyConfirmedTransactions: dto.onlyConfirmed,
      PosID: dto.posId ?? this.posId,
      Branch: this.branch,
      ClientAppId: this.clientAppId,
    };

    return this.itdClient.processQuery(request);
  }

  async getTicketHtml(transactionId: string) {
    return this.itdClient.getHTMLTransactionTicket(transactionId);
  }

  async echoTest() {
    this.logger.log(`EchoTest: PosID=${this.posId}`);
    return this.itdClient.echoTest({
      SystemId: this.systemId,
      PosID: this.posId,
    });
  }
}
