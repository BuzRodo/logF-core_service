import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StockEntriesService } from './stock-entries.service';
import { CreateStockEntryDto, StockEntryFilterDto, ExpiringFilterDto } from './dto/stock-entry.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../auth/decorators/current-user.decorator';
import { filterCostFieldsForRole } from '../../common/utils/cost-visibility.util';

// Criterio de roles: leer/crear lotes es operación de depósito → admin y supervisor
// (cashier no maneja stock). Eliminar un lote es una corrección contable delicada
// (revierte cantidades ya sumadas) → solo admin. lineTotal (importe pagado del lote)
// se filtra para supervisor con el mismo criterio de costos que ingredientes/facturas.
@ApiTags('Entradas de stock')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'supervisor')
@Controller('api/stock-entries')
export class StockEntriesController {
  constructor(private svc: StockEntriesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar entradas de stock (lotes)' })
  async findAll(@Query() filters: StockEntryFilterDto, @CurrentUser() user: JwtPayload) {
    return filterCostFieldsForRole(await this.svc.findAll(filters), user.role);
  }

  @Get('expiring')
  @ApiOperation({ summary: 'Lotes vencidos o por vencer dentro de N días (default 7)' })
  async expiring(@Query() filters: ExpiringFilterDto, @CurrentUser() user: JwtPayload) {
    return filterCostFieldsForRole(await this.svc.expiring(filters.days ?? 7), user.role);
  }

  @Post()
  @ApiOperation({ summary: 'Ingresar stock: crea el lote y suma al ingrediente' })
  async create(@Body() dto: CreateStockEntryDto, @CurrentUser() user: JwtPayload) {
    return filterCostFieldsForRole(await this.svc.create(dto, user.sub), user.role);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Eliminar entrada errónea (descuenta lo sumado)' })
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
