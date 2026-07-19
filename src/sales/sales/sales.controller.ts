import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SalesService } from './sales.service';
import { CreateSaleDto, SaleFilterDto, SalesSummaryFilterDto, SalesByProductFilterDto, SalesByDriverFilterDto, VoidByInvoiceDto } from './dto/sale.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../auth/decorators/current-user.decorator';

@ApiTags('Ventas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/sales')
export class SalesController {
  constructor(private svc: SalesService) {}

  @Post()
  @Roles('admin', 'supervisor', 'cashier')
  @ApiOperation({ summary: 'Registrar venta (totales calculados server-side)' })
  create(@Body() dto: CreateSaleDto, @CurrentUser() user: JwtPayload) {
    return this.svc.create(dto, user.sub);
  }

  @Get()
  @Roles('admin', 'supervisor')
  @ApiOperation({ summary: 'Listar ventas con filtros opcionales' })
  findAll(@Query() filters: SaleFilterDto) {
    return this.svc.findAll(filters);
  }

  @Get('summary')
  @Roles('admin', 'supervisor')
  @ApiOperation({ summary: 'Serie histórica de ventas por día/semana/mes/año (excluye anuladas)' })
  summary(@Query() filters: SalesSummaryFilterDto) {
    return this.svc.summary(filters);
  }

  @Get('by-product')
  @Roles('admin', 'supervisor')
  @ApiOperation({ summary: 'Ventas por producto agrupadas por categoría (excluye anuladas)' })
  byProduct(@Query() filters: SalesByProductFilterDto) {
    return this.svc.byProduct(filters);
  }

  @Get('by-driver')
  @Roles('admin', 'supervisor')
  @ApiOperation({ summary: 'Ventas agrupadas por repartidor (excluye anuladas)' })
  byDriver(@Query() filters: SalesByDriverFilterDto) {
    return this.svc.byDriver(filters);
  }

  @Get(':id')
  @Roles('admin', 'supervisor', 'cashier')
  @ApiOperation({ summary: 'Obtener detalle de venta' })
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
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
