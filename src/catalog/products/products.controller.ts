import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../auth/decorators/current-user.decorator';
import { filterCostFieldsForRole } from '../../common/utils/cost-visibility.util';

@ApiTags('Productos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/products')
export class ProductsController {
  constructor(private svc: ProductsService) {}

  // Lectura: los 3 roles pueden ver el catálogo de gestión (productos + receta), pero
  // costPerUnit/cost/margin viajan filtrados salvo para admin (ver cost-visibility.util).
  @Get()
  @Roles('admin', 'supervisor', 'cashier')
  @ApiOperation({ summary: 'Listar todos los productos' })
  async findAll(@CurrentUser() user: JwtPayload) {
    return filterCostFieldsForRole(await this.svc.findAll(), user.role);
  }

  @Get(':id')
  @Roles('admin', 'supervisor', 'cashier')
  @ApiOperation({ summary: 'Obtener producto por id' })
  async findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return filterCostFieldsForRole(await this.svc.findOne(id), user.role);
  }

  // Desglose de costo/margen: es 100% información de costo → admin únicamente
  // (a diferencia de findAll/findOne, acá no hay nada "no-costo" que preservar).
  @Get(':id/cost')
  @Roles('admin')
  @ApiOperation({ summary: 'Desglose de costo, margen y receta del producto (solo admin)' })
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
