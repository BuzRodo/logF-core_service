import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PurchaseInvoicesService } from './purchase-invoices.service';
import {
  CreatePurchaseInvoiceDto,
  UpdatePurchaseInvoiceDto,
  PurchaseInvoiceFilterDto,
} from './dto/purchase-invoice.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../auth/decorators/current-user.decorator';
import { filterCostFieldsForRole } from '../../common/utils/cost-visibility.util';

// La factura de compra ES el precio de compra (totalAmount) y trae los lotes de stock
// que generó (con su lineTotal) → se filtran ambos para supervisor, que igual necesita
// ver proveedor/fechas/estado para su trabajo operativo (recepción de mercadería).
@ApiTags('Facturas de compra')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('api/purchase-invoices')
export class PurchaseInvoicesController {
  constructor(private svc: PurchaseInvoicesService) {}

  @Get()
  @Roles('admin', 'supervisor')
  @ApiOperation({ summary: 'Listar facturas de compra con filtros opcionales' })
  async findAll(@Query() filters: PurchaseInvoiceFilterDto, @CurrentUser() user: JwtPayload) {
    return filterCostFieldsForRole(await this.svc.findAll(filters), user.role);
  }

  @Get(':id')
  @Roles('admin', 'supervisor')
  @ApiOperation({ summary: 'Obtener factura de compra' })
  async findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return filterCostFieldsForRole(await this.svc.findOne(id), user.role);
  }

  @Post()
  @ApiOperation({ summary: 'Registrar factura de compra' })
  create(@Body() dto: CreatePurchaseInvoiceDto, @CurrentUser() user: JwtPayload) {
    return this.svc.create(dto, user.sub);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Corregir factura de compra' })
  update(@Param('id') id: string, @Body() dto: UpdatePurchaseInvoiceDto) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar factura de compra' })
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
