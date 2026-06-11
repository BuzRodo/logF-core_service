import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SalesService } from './sales.service';
import { CreateSaleDto, SaleFilterDto } from './dto/sale.dto';
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

  @Get(':id')
  @Roles('admin', 'supervisor', 'cashier')
  @ApiOperation({ summary: 'Obtener detalle de venta' })
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }
}
