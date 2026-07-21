import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PurchaseOrdersService } from './purchase-orders.service';
import { CreatePurchaseOrderDto, PurchaseOrderFilterDto } from './dto/purchase-order.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../auth/decorators/current-user.decorator';
import { filterCostFieldsForRole } from '../../common/utils/cost-visibility.util';

@ApiTags('Órdenes de compra')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('api/purchase-orders')
export class PurchaseOrdersController {
  constructor(private svc: PurchaseOrdersService) {}

  // La orden en sí no tiene precio (solo cantidades a pedir), pero trae la factura que la
  // cerró incluida (`invoice.totalAmount`) → se filtra para supervisor.
  @Get()
  @Roles('admin', 'supervisor')
  @ApiOperation({ summary: 'Listar órdenes de compra con filtros opcionales' })
  async findAll(@Query() filters: PurchaseOrderFilterDto, @CurrentUser() user: JwtPayload) {
    return filterCostFieldsForRole(await this.svc.findAll(filters), user.role);
  }

  @Get(':id')
  @Roles('admin', 'supervisor')
  @ApiOperation({ summary: 'Obtener orden de compra con ítems' })
  async findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return filterCostFieldsForRole(await this.svc.findOne(id), user.role);
  }

  @Post()
  @ApiOperation({ summary: 'Crear orden de compra (código correlativo OC-xxxxxx)' })
  create(@Body() dto: CreatePurchaseOrderDto, @CurrentUser() user: JwtPayload) {
    return this.svc.create(dto, user.sub);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancelar orden pendiente' })
  cancel(@Param('id') id: string) {
    return this.svc.cancel(id);
  }
}
