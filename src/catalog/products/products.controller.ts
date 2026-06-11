import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@ApiTags('Productos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/products')
export class ProductsController {
  constructor(private svc: ProductsService) {}

  @Get()
  @Roles('admin', 'supervisor')
  @ApiOperation({ summary: 'Listar todos los productos (admin)' })
  findAll() {
    return this.svc.findAll();
  }

  @Get(':id')
  @Roles('admin', 'supervisor')
  @ApiOperation({ summary: 'Obtener producto por id' })
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Get(':id/cost')
  @Roles('admin', 'supervisor')
  @ApiOperation({ summary: 'Desglose de costo, margen y receta del producto' })
  getCost(@Param('id') id: string) {
    return this.svc.getCostBreakdown(id);
  }

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Crear producto (con receta opcional)' })
  create(@Body() dto: CreateProductDto) {
    return this.svc.create(dto);
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Actualizar producto (reemplaza receta completa si se envía recipeItems)' })
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Desactivar producto (soft-delete)' })
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
