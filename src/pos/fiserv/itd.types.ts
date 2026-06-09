/**
 * Tipos de la API Fiserv ITD v3.5 — Backend (NestJS)
 * Espejo tipado de los DTOs del spec para uso interno del servicio.
 */

export enum ItdResponseCode {
  OK = 0,
  TRANSACTION_NOT_FOUND = 2,
  CARD_READ = 12,
  VALIDATION_ERROR = 100,
  INTERNAL_ERROR = 999,
}

export enum ItdCurrency {
  UYU = '858',
  USD = '840',
}

export interface ItdBaseRequest {
  PosID: string;
  SystemId: string;
  Branch: string;
  ClientAppId: string;
  UserId: string;
  TransactionDateTimeyyyyMMddHHmmssSSS: string;
}

export interface ItdBaseResponse {
  ResponseCode: number;
}

export interface ItdTransactionCreatedResponse extends ItdBaseResponse {
  STransactionId: string;
  TransactionId: number;
}

// ── Requests principales ────────────────────────────────────────────────────

export interface ProcessFinancialPurchaseRequest extends ItdBaseRequest {
  Amount: string;
  Quotas: number;
  Plan: number;
  Currency: string;
  TaxRefund: number;
  TaxableAmount: string;
  InvoiceAmount: string;
  InvoiceNumber?: string;
  Merchant?: string;
  Bin?: string;
  Issuer?: string;
  NeedToReadCard?: boolean;
  PinpadInitQuestion?: string;
  TerminalGroup?: string;
  TipAmount?: string;
  CiNoCheckDigit?: string;
  TransactionTimeOut?: number;
  TaxAmount?: string;
  CardAccountType?: string;
  IVAAmount?: string;
  Callback?: string;
  SpecialData?: string;
  CashbackAmount?: string;
}

export interface ProcessFinancialPurchaseQueryRequest extends ItdBaseRequest {
  STransactionId?: string;
  TransactionId?: number;
}

export interface ProcessFinancialPurchaseQueryResponse extends ItdBaseResponse {
  RemainingExpirationTime?: number;
  TransactionType?: string;
  PosID?: string;
  TotalAmount?: string;
  TipAmount?: string;
  TaxAmount?: string;
  Quota?: number;
  Plan?: number;
  Currency?: string;
  InvoiceNumber?: string;
  Ticket?: string;
  Batch?: string;
  AdditionalData?: string;
  AuthorizationCode?: string;
  PosResponseCode?: string;
  PosResponseCodeExtension?: string | null;
  Acquirer?: number;
  Issuer?: number;
  CardNumber?: string;
  ExpirationDate?: string;
  InputMode?: string;
  TransactionDate?: string;
  TransactionHour?: string;
  OriginalTicket?: string;
  CardAccountType?: string;
  CardOwnerName?: string;
  AcquirerTerminal?: string;
  InvoiceAmount?: string;
  Merchant?: string;
  OriginCardType?: string;
  EmvApplicationName?: string;
  EmvApplicationId?: string;
  ShowTextInCashBoxScreen?: string | null;
  POSSignature?: unknown | null;
  VoucherPrintInfo?: {
    MerchantVoucherBehavior: number;
    ClientVoucherBehavior: number;
    RequestSignatureToClient: boolean;
    TextToPrintOnClientVoucher: string;
    TextToPrintOnMerchantVoucher: string;
    TextToPrintOnBothVoucher: string;
  } | null;
  STransactionId?: string;
}

export interface ProcessConfirmFinancialPurchaseRequest extends ItdBaseRequest {
  STransactionId?: string;
  TransactionId?: number;
  Amount: string;
  Quotas: number;
  Plan: number;
  Currency: string;
  TaxRefund: number;
  TaxableAmount: string;
  InvoiceAmount: string;
  InvoiceNumber?: string;
  Merchant?: string;
  TipAmount?: string;
  CiNoCheckDigit?: string;
  TransactionTimeOut?: number;
  TaxAmount?: string;
  CardAccountType?: string;
  IVAAmount?: string;
  CashbackAmount?: string;
}

export interface CancelFinancialPurchaseRequest extends ItdBaseRequest {
  STransactionId?: string;
  TransactionId?: number;
}

export interface ProcessFinancialReverseRequest extends ItdBaseRequest {
  STransactionId?: string;
  TransactionId?: number;
}

export interface ProcessFinancialPurchaseVoidByTicketRequest extends ItdBaseRequest {
  TicketNumber: string;
  Merchant?: string;
  Bin?: string;
  Issuer?: string;
  Acquirer?: string;
  PinpadInitQuestion?: string;
  TerminalGroup?: string;
  CiNoCheckDigit?: string;
  TransactionTimeOut?: number;
  Callback?: string;
  SpecialData?: string;
}

export interface ProcessFinancialPurchaseRefundRequest extends ItdBaseRequest {
  TicketNumber: string;
  OriginalTransactionDateyyMMdd: string;
  Amount: string;
  Quotas: number;
  Plan: number;
  Currency: string;
  TaxRefund: number;
  TaxableAmount: string;
  InvoiceAmount: string;
  InvoiceNumber?: string;
  Merchant?: string;
  Bin?: string;
  Issuer?: string;
  NeedToReadCard?: boolean;
  TipAmount?: string;
  CiNoCheckDigit?: string;
  TransactionTimeOut?: number;
  TaxAmount?: string;
  CardAccountType?: string;
  IVAAmount?: string;
  SpecialData?: string;
}

export interface ProcessQueryRequest {
  SystemId: string;
  FromDateyyyyMMddHHmmss: string;
  ToDateyyyyMMddHHmmss: string;
  OnlyConfirmedTransactions: boolean;
  PosID?: string;
  Branch?: string;
  ClientAppId?: string;
  UserId?: string;
}

export interface EchoTestRequest {
  SystemId: string;
  PosID: string;
}
