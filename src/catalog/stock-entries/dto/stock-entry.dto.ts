import { IsString, IsInt, IsOptional, IsUUID, IsDateString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateStockEntryDto {
  @ApiProperty({ description: 'ID del ingrediente' })
  @IsUUID()
  ingredientId: string;

  @ApiProperty({ example: 5000, description: 'Cantidad en la unidad del ingrediente (g / ml / unidades)' })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ example: '2026-08-15', description: 'Fecha de caducidad del lote' })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiPropertyOptional({ example: 'Compra semanal Frigorífico Sur' })
  @IsOptional()
  @IsString()
  note?: string;
}

export class StockEntryFilterDto {
  @ApiPropertyOptional({ description: 'Filtrar por ingrediente' })
  @IsOptional()
  @IsUUID()
  ingredientId?: string;
}

export class ExpiringFilterDto {
  @ApiPropertyOptional({ example: 7, description: 'Días hacia adelante (default 7)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  days?: number;
}
