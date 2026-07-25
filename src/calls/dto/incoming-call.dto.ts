import { IsString, IsNotEmpty, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Body que envía el capturador local (o el simulador de dev) al reportar una llamada. */
export class CreateIncomingCallDto {
  @ApiProperty({
    example: '099 111 222',
    description: 'Número reportado por el capturador (se normaliza a solo dígitos)',
  })
  @IsString()
  @IsNotEmpty()
  phone: string;
}

/** Query params para listar las últimas llamadas entrantes. */
export class ListIncomingCallsQueryDto {
  @ApiPropertyOptional({ example: 20, description: 'Cantidad de llamadas a devolver (1-100)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
