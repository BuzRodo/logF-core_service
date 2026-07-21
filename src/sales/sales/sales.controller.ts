import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiForbiddenResponse } from '@nestjs/swagger';
import { SalesService } from './sales.service';
import { CreateSaleDto, SaleFilterDto, SalesSummaryFilterDto, SalesByProductFilterDto, SalesByDriverFilterDto, VoidByInvoiceDto } from './dto/sale.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../auth/decorators/current-user.decorator';
import { FeatureGuard } from '../../common/features/feature.guard';
import { RequireFeature } from '../../common/features/require-feature.decorator';
import { filterCostFieldsForRole } from '../../common/utils/cost-visibility.util';

// Todo este controller ya vive detrás de FEATURE_POS (SalesModule solo se monta si
// FEATURE_POS=true, ver app.module.ts). Los tres endpoints de reportes (summary/by-product/
// by-driver) además exigen FEATURE_SALES_REPORTS a nivel de método con FeatureGuard, porque
// comparten controller con la creación/anulación de ventas y no se pueden separar en un
// módulo aparte sin duplicar SalesService.
//
// create/findAll/findOne incluyen los SaleItem con `costAtSale` (costo de receta al
// momento de la venta) → se filtra para supervisor y cashier con el mismo criterio de
// costos que el resto del sistema (ver cost-visibility.util).
@ApiTags('Ventas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, FeatureGuard)
@Controller('api/sales')
export class SalesController {
  constructor(private svc: SalesService) {}

  @Post()
  @Roles('admin', 'supervisor', 'cashier')
  @ApiOperation({ summary: 'Registrar venta (totales calculados server-side)' })
  async create(@Body() dto: CreateSaleDto, @CurrentUser() user: JwtPayload) {
    return filterCostFieldsForRole(await this.svc.create(dto, user.sub), user.role);
  }

  @Get()
  @Roles('admin', 'supervisor')
  @ApiOperation({ summary: 'Listar ventas con filtros opcionales' })
  async findAll(@Query() filters: SaleFilterDto, @CurrentUser() user: JwtPayload) {
    return filterCostFieldsForRole(await this.svc.findAll(filters), user.role);
  }

  @Get('summary')
  @Roles('admin', 'supervisor')
  @RequireFeature('salesReports')
  @ApiForbiddenResponse({ description: 'FEATURE_SALES_REPORTS está deshabilitado por configuración' })
  @ApiOperation({ summary: 'Serie histórica de ventas por día/semana/mes/año (excluye anuladas)' })
  summary(@Query() filters: SalesSummaryFilterDto) {
    return this.svc.summary(filters);
  }

  @Get('by-product')
  @Roles('admin', 'supervisor')
  @RequireFeature('salesReports')
  @ApiForbiddenResponse({ description: 'FEATURE_SALES_REPORTS está deshabilitado por configuración' })
  @ApiOperation({ summary: 'Ventas por producto agrupadas por categoría (excluye anuladas)' })
  byProduct(@Query() filters: SalesByProductFilterDto) {
    return this.svc.byProduct(filters);
  }

  @Get('by-driver')
  @Roles('admin', 'supervisor')
  @RequireFeature('salesReports')
  @ApiForbiddenResponse({ description: 'FEATURE_SALES_REPORTS está deshabilitado por configuración' })
  @ApiOperation({ summary: 'Ventas agrupadas por repartidor (excluye anuladas)' })
  byDriver(@Query() filters: SalesByDriverFilterDto) {
    return this.svc.byDriver(filters);
  }

  @Get(':id')
  @Roles('admin', 'supervisor', 'cashier')
  @ApiOperation({ summary: 'Obtener detalle de venta' })
  async findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return filterCostFieldsForRole(await this.svc.findOne(id), user.role);
  }

  @Post('void-by-invoice')
  @Roles('admin', 'supervisor', 'cashier')
  @ApiOperation({ summary: 'Anular venta por número de ticket (devuelve stock según receta)' })
  voidByInvoice(@Body() dto: VoidByInvoiceDto, @CurrentUser() user: JwtPayload) {
    return this.svc.voidByInvoice(dto.invoiceNumber, user.sub);
  }

  @Post(':id/void')
  @Roles('admin', 'supervisor')
  @ApiOperation({ summary: 'Anular venta (devuelve stock según receta)' })
  void(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.svc.void(id, user.sub);
  }
}
