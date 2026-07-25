import {
  IsString, IsInt, IsEnum, IsOptional, IsArray, IsIn, IsUUID,
  ValidateNested, Min, ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod, SaleChannel } from '../../../../generated/prisma/client';

export class SaleItemDto {
  @ApiProperty({ example: 'uuid-del-producto' })
  @IsString()
  productId: string;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ example: 0, description: 'Descuento por ítem en centavos' })
  @IsOptional()
  @IsInt()
  @Min(0)
  discount?: number;
}

export class CreateSaleDto {
  @ApiProperty({ type: [SaleItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SaleItemDto)
  items: SaleItemDto[];

  @ApiProperty({ example: 0, description: 'Descuento global en centavos' })
  @IsInt()
  @Min(0)
  globalDiscount: number;

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiProperty({ example: 'uuid-de-la-sesion-de-caja' })
  @IsString()
  cashSessionId: string;

  @ApiPropertyOptional({ example: 'TRANS-123456', description: 'Requerido si paymentMethod=CARD' })
  @IsOptional()
  @IsString()
  cardTransactionId?: string;

  @ApiPropertyOptional({ example: '123456' })
  @IsOptional()
  @IsString()
  authorizationCode?: string;

  @ApiPropertyOptional({ enum: SaleChannel, description: 'Canal de venta (default LOCAL)' })
  @IsOptional()
  @IsEnum(SaleChannel)
  channel?: SaleChannel;

  @ApiPropertyOptional({ example: 'DL-00123', description: 'Nro de factura/pedido del canal (requerido si channel != LOCAL)' })
  @IsOptional()
  @IsString()
  channelRef?: string;

  @ApiPropertyOptional({ example: 'uuid-del-cliente' })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({ example: 'uuid-del-repartidor' })
  @IsOptional()
  @IsUUID()
  driverId?: string;
}

export type SummaryGranularity = 'day' | 'week' | 'month' | 'year';

export class SalesSummaryFilterDto {
  @ApiPropertyOptional({ enum: ['day', 'week', 'month', 'year'], default: 'day' })
  @IsOptional()
  @IsIn(['day', 'week', 'month', 'year'])
  granularity?: SummaryGranularity;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsString()
  to?: string;
}

export class VoidByInvoiceDto {
  @ApiProperty({ example: 'F-000003' })
  @IsString()
  invoiceNumber: string;
}

export class SaleFilterDto {
  @ApiPropertyOptional({ example: '2026-06-01' })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({ example: '2026-06-30' })
  @IsOptional()
  @IsString()
  to?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cashierId?: string;

  @ApiPropertyOptional({ example: 'F-000003', description: 'Buscar por número de ticket exacto' })
  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @ApiPropertyOptional({ enum: ['LOCAL', 'DELIVERY', 'TELEFONICO', 'WEB', 'PEDIDOS_YA'] })
  @IsOptional()
  @IsIn(['LOCAL', 'DELIVERY', 'TELEFONICO', 'WEB', 'PEDIDOS_YA'])
  channel?: string;
}

export class SalesByProductFilterDto {
  @ApiPropertyOptional({ example: '2026-06-01' })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({ example: '2026-06-30' })
  @IsOptional()
  @IsString()
  to?: string;

  @ApiPropertyOptional({ enum: ['LOCAL', 'DELIVERY', 'TELEFONICO', 'WEB', 'PEDIDOS_YA'] })
  @IsOptional()
  @IsIn(['LOCAL', 'DELIVERY', 'TELEFONICO', 'WEB', 'PEDIDOS_YA'])
  channel?: string;
}

export class SalesByDriverFilterDto {
  @ApiPropertyOptional({ example: '2026-06-01' })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({ example: '2026-06-30' })
  @IsOptional()
  @IsString()
  to?: string;
}
