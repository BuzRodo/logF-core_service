import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateDriverDto {
  @ApiProperty({ example: 'Marcelo Píriz' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: '099 111 222' })
  @IsOptional()
  @IsString()
  phone?: string;
}

export class UpdateDriverDto extends PartialType(CreateDriverDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
