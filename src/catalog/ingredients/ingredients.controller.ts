import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiForbiddenResponse } from '@nestjs/swagger';
import { IngredientsService } from './ingredients.service';
import { CreateIngredientDto, UpdateIngredientDto } from './dto/ingredient.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../auth/decorators/current-user.decorator';
import { FeatureGuard } from '../../common/features/feature.guard';
import { RequireFeature } from '../../common/features/require-feature.decorator';
import { filterCostFieldsForRole } from '../../common/utils/cost-visibility.util';

// CRUD de ingredientes/insumos: siempre disponible (no depende de FEATURE_RECIPES, es
// gestión de catálogo/stock). Solo GET /cost-changes (historial de costos, insumo de
// "Análisis de costos" gastronómico) exige FEATURE_RECIPES a nivel de método.
@ApiTags('Ingredientes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, FeatureGuard)
@Roles('admin')
@Controller('api/ingredients')
export class IngredientsController {
  constructor(private svc: IngredientsService) {}

  // Lectura: los 3 roles pueden ver el listado (nombre/unidad/stock para armar recetas o
  // cargar stock), pero costPerUnit viaja filtrado salvo para admin.
  @Get()
  @Roles('admin', 'supervisor', 'cashier')
  @ApiOperation({ summary: 'Listar ingredientes' })
  async findAll(@CurrentUser() user: JwtPayload) {
    return filterCostFieldsForRole(await this.svc.findAll(), user.role);
  }

  // Historial de cambios de costo: es 100% información de costo → admin únicamente.
  // Requiere FEATURE_RECIPES (gastronómico opcional): sin el flag responde 403.
  @Get('cost-changes')
  @Roles('admin')
  @RequireFeature('recipes')
  @ApiForbiddenResponse({ description: 'FEATURE_RECIPES está deshabilitado por configuración' })
  @ApiOperation({ summary: 'Últimos cambios de costo de insumos (30 días, solo admin)' })
  costChanges() {
    return this.svc.recentCostChanges();
  }

  @Get(':id')
  @Roles('admin', 'supervisor', 'cashier')
  @ApiOperation({ summary: 'Obtener ingrediente (el historial de costos solo lo ve admin)' })
  async findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return filterCostFieldsForRole(await this.svc.findOne(id), user.role);
  }

  @Post()
  @ApiOperation({ summary: 'Crear ingrediente' })
  create(@Body() dto: CreateIngredientDto) {
    return this.svc.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar ingrediente (registra cambio de costo automáticamente)' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateIngredientDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.svc.update(id, dto, user.sub);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desactivar ingrediente (soft-delete)' })
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
