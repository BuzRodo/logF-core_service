import {
  IsString, IsInt, IsOptional, IsEnum, IsUUID, IsDateString, IsArray, IsIn, ValidateNested, Min, ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Unit } from '../../../../generated/prisma/client';

export class PurchaseOrderItemDto {
  @ApiPropertyOptional({ description: 'ID de un insumo ya cargado' })
  @IsOptional()
  @IsUUID()
  ingredientId?: string;

  @ApiPropertyOptional({ example: 'Queso rallado', description: 'Nombre libre si el insumo aún no está cargado' })
  @IsOptional()
  @IsString()
  freeName?: string;

  @ApiProperty({ enum: Unit, example: Unit.GRAM })
  @IsEnum(Unit)
  unit: Unit;

  @ApiProperty({ example: 5000, description: 'Cantidad pedida en unidad base (g / ml / unidades)' })
  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreatePurchaseOrderDto {
  @ApiProperty({ description: 'ID del proveedor' })
  @IsUUID()
  supplierId: string;

  @ApiPropertyOptional({ example: '2026-07-10', description: 'Fecha esperada de entrega' })
  @IsOptional()
  @IsDateString()
  expectedDate?: string;

  @ApiPropertyOptional({ example: 'Pedido semanal' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [PurchaseOrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderItemDto)
  items: PurchaseOrderItemDto[];
}

export class PurchaseOrderFilterDto {
  @ApiPropertyOptional({ description: 'Filtrar por proveedor' })
  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @ApiPropertyOptional({ enum: ['PENDIENTE', 'RECIBIDA', 'CANCELADA'] })
  @IsOptional()
  @IsIn(['PENDIENTE', 'RECIBIDA', 'CANCELADA'])
  status?: 'PENDIENTE' | 'RECIBIDA' | 'CANCELADA';
}
