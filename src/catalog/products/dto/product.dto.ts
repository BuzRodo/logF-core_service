import {
  IsString, IsInt, IsOptional, IsBoolean, IsEnum, IsArray,
  ValidateNested, Min, ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { ProductType } from '../../../../generated/prisma/client';

export class RecipeItemDto {
  @ApiProperty({ example: 'uuid-del-ingrediente' })
  @IsString()
  ingredientId: string;

  @ApiProperty({ example: 150, description: 'Gramos / ml / unidades según tipo de ingrediente' })
  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateProductDto {
  @ApiProperty({ example: 'HAMB-03' })
  @IsString()
  sku: string;

  @ApiProperty({ example: 'Hamburguesa con Cheddar' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'uuid-de-categoria' })
  @IsString()
  categoryId: string;

  @ApiProperty({ example: 62000, description: 'Precio de venta en centavos' })
  @IsInt()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ enum: ProductType, default: ProductType.ELABORATED })
  @IsOptional()
  @IsEnum(ProductType)
  type?: ProductType;

  @ApiPropertyOptional({ example: 'https://...' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ type: [RecipeItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecipeItemDto)
  recipeItems?: RecipeItemDto[];
}

export class UpdateProductDto extends PartialType(CreateProductDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
