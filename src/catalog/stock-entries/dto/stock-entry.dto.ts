import { IsString, IsInt, IsOptional, IsUUID, IsDateString, IsEnum, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Unit } from '../../../../generated/prisma/client';

export class NewIngredientDto {
  @ApiProperty({ example: 'Papel higiénico' })
  @IsString()
  name: string;

  @ApiProperty({ enum: Unit, example: Unit.UNIT })
  @IsEnum(Unit)
  unit: Unit;

  @ApiPropertyOptional({ example: 'Distribuidora Sur' })
  @IsOptional()
  @IsString()
  supplier?: string;
}

export class CreateStockEntryDto {
  @ApiPropertyOptional({ description: 'ID de un ingrediente ya existente' })
  @IsOptional()
  @IsUUID()
  ingredientId?: string;

  @ApiPropertyOptional({ type: NewIngredientDto, description: 'Alta de insumo nuevo desde el ingreso de stock' })
  @IsOptional()
  @ValidateNested()
  @Type(() => NewIngredientDto)
  newIngredient?: NewIngredientDto;

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
