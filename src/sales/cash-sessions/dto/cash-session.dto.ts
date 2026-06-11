import { IsString, IsInt, Min, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OpenCashSessionDto {
  @ApiProperty({ example: 'CAJA-01', description: 'Identificador físico de la caja' })
  @IsString()
  registerId: string;

  @ApiProperty({ example: 100000, description: 'Monto de apertura en centavos' })
  @IsInt()
  @Min(0)
  openingAmount: number;
}

export class CloseCashSessionDto {
  @ApiProperty({ example: 235000, description: 'Monto contado al cierre en centavos' })
  @IsInt()
  @Min(0)
  closingAmount: number;
}
