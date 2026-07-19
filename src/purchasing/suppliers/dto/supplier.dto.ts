import { IsString, IsOptional, IsBoolean, IsEmail } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateSupplierDto {
  @ApiProperty({ example: 'Frigorífico Sur' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Marcelo Píriz' })
  @IsOptional()
  @IsString()
  contactName?: string;

  @ApiPropertyOptional({ example: '099 111 222' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'ventas@frigorificosur.uy' })
  @IsOptional()
  @IsEmail()
  email?: string;
}

export class UpdateSupplierDto extends PartialType(CreateSupplierDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
