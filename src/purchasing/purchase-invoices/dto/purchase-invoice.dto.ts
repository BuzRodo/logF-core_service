import {
  IsString, IsInt, IsOptional, IsEnum, IsUUID, IsDateString, IsArray, ValidateNested, Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType, OmitType } from '@nestjs/swagger';
import { VoucherType, Unit, IvaRate } from '../../../../generated/prisma/client';

export class NewIngredientDto {
  @ApiProperty({ example: 'Carne vacuna picada' })
  @IsString()
  name: string;

  @ApiProperty({ enum: Unit, example: Unit.GRAM })
  @IsEnum(Unit)
  unit: Unit;
}

export class PurchaseInvoiceItemDto {
  @ApiPropertyOptional({ description: 'ID de un ingrediente ya existente' })
  @IsOptional()
  @IsUUID()
  ingredientId?: string;

  @ApiPropertyOptional({ type: NewIngredientDto, description: 'Alta de ingrediente nuevo desde la factura' })
  @IsOptional()
  @ValidateNested()
  @Type(() => NewIngredientDto)
  newIngredient?: NewIngredientDto;

  @ApiProperty({ example: 5000, description: 'Cantidad en unidad base (g / ml / unidades)' })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({
    example: 240000,
    description: 'Importe de la línea en centavos; deriva el costo por kg/litro/unidad del ingrediente',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  lineTotal?: number;

  @ApiPropertyOptional({ enum: IvaRate, example: IvaRate.IVA_22, description: 'Tasa de IVA de la línea (dato; no afecta el costo)' })
  @IsOptional()
  @IsEnum(IvaRate)
  ivaRate?: IvaRate;

  @ApiPropertyOptional({ example: '2026-08-15', description: 'Fecha de caducidad del lote' })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;
}

export class CreatePurchaseInvoiceDto {
  @ApiProperty({ description: 'ID del proveedor' })
  @IsUUID()
  supplierId: string;

  @ApiProperty({ enum: VoucherType, example: VoucherType.FACTURA_CONTADO })
  @IsEnum(VoucherType)
  voucherType: VoucherType;

  @ApiProperty({ example: 'A', description: 'Serie de la factura' })
  @IsString()
  series: string;

  @ApiProperty({ example: '0003391', description: 'Número de serie' })
  @IsString()
  number: string;

  @ApiProperty({ example: '2026-06-28', description: 'Fecha de entrega' })
  @IsDateString()
  deliveryDate: string;

  @ApiProperty({ example: '2026-07-01', description: 'Fecha de ingreso al sistema' })
  @IsDateString()
  entryDate: string;

  @ApiProperty({ example: 9650000, description: 'Importe total en centavos' })
  @IsInt()
  @Min(1)
  totalAmount: number;

  @ApiPropertyOptional({
    type: [PurchaseInvoiceItemDto],
    description: 'Stock que trae la factura: crea lotes y suma al inventario',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseInvoiceItemDto)
  items?: PurchaseInvoiceItemDto[];

  @ApiPropertyOptional({ description: 'Orden de compra pendiente que esta factura cierra (pasa a RECIBIDA)' })
  @IsOptional()
  @IsUUID()
  purchaseOrderId?: string;
}

// La corrección de factura es solo de cabecera; los lotes se manejan en Inventario
export class UpdatePurchaseInvoiceDto extends PartialType(
  OmitType(CreatePurchaseInvoiceDto, ['items'] as const),
) {}

export class PurchaseInvoiceFilterDto {
  @ApiPropertyOptional({ description: 'Filtrar por proveedor' })
  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @ApiPropertyOptional({ example: '2026-06-01', description: 'Fecha de ingreso desde' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ example: '2026-06-30', description: 'Fecha de ingreso hasta' })
  @IsOptional()
  @IsDateString()
  to?: string;
}
