import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PurchaseOrdersService } from './purchase-orders.service';
import { CreatePurchaseOrderDto, PurchaseOrderFilterDto } from './dto/purchase-order.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../auth/decorators/current-user.decorator';

@ApiTags('Órdenes de compra')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('api/purchase-orders')
export class PurchaseOrdersController {
  constructor(private svc: PurchaseOrdersService) {}

  @Get()
  @Roles('admin', 'supervisor')
  @ApiOperation({ summary: 'Listar órdenes de compra con filtros opcionales' })
  findAll(@Query() filters: PurchaseOrderFilterDto) {
    return this.svc.findAll(filters);
  }

  @Get(':id')
  @Roles('admin', 'supervisor')
  @ApiOperation({ summary: 'Obtener orden de compra con ítems' })
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
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
