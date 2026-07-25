import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateCustomerDto {
  @ApiProperty({ example: '099 111 222' })
  @IsString()
  phone: string;

  @ApiProperty({ example: 'Juan Pérez' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Av. 18 de Julio 1234' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'Apto 302, timbre azul' })
  @IsOptional()
  @IsString()
  addressNotes?: string;
}

export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class SearchCustomerDto {
  @ApiProperty({ example: '099 111 222' })
  @IsString()
  phone: string;
}
