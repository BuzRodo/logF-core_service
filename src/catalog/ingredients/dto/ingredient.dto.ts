import { IsString, IsInt, IsOptional, IsBoolean, IsEnum, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Unit } from '../../../../generated/prisma/client';

export class CreateIngredientDto {
  @ApiProperty({ example: 'Carne vacuna picada' })
  @IsString()
  name: string;

  @ApiProperty({ enum: Unit, example: Unit.GRAM })
  @IsEnum(Unit)
  unit: Unit;

  @ApiProperty({ example: 80000, description: 'Centavos por kg/litro/unidad' })
  @IsInt()
  @Min(0)
  costPerUnit: number;

  @ApiPropertyOptional({ example: 'Frigorífico Sur' })
  @IsOptional()
  @IsString()
  supplier?: string;

  @ApiPropertyOptional({ example: 5000, description: 'Stock actual en la misma unidad' })
  @IsOptional()
  @IsInt()
  @Min(0)
  stockGrams?: number;
}

export class UpdateIngredientDto extends PartialType(CreateIngredientDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
