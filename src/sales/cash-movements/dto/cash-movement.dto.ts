import { IsString, IsInt, IsEnum, IsOptional, IsUUID, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CashMovementType } from '../../../../generated/prisma/client';

export class CreateCashMovementDto {
  @ApiProperty({ example: 'uuid-de-la-sesion-de-caja' })
  @IsUUID()
  cashSessionId: string;

  @ApiProperty({ enum: CashMovementType })
  @IsEnum(CashMovementType)
  type: CashMovementType;

  @ApiProperty({ example: 'Cambio', description: 'Motivo del movimiento' })
  @IsString()
  concept: string;

  @ApiProperty({ example: 50000, description: 'Monto en centavos, siempre positivo' })
  @IsInt()
  @Min(1)
  amount: number;
}

export class CashMovementFilterDto {
  @ApiPropertyOptional({ example: 'uuid-de-la-sesion-de-caja' })
  @IsOptional()
  @IsUUID()
  cashSessionId?: string;

  @ApiPropertyOptional({ example: '2026-06-01' })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({ example: '2026-06-30' })
  @IsOptional()
  @IsString()
  to?: string;
}
