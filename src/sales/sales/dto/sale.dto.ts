import {
  IsString, IsInt, IsEnum, IsOptional, IsArray,
  ValidateNested, Min, ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '../../../../generated/prisma/client';

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
}
