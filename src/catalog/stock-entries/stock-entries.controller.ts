import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StockEntriesService } from './stock-entries.service';
import { CreateStockEntryDto, StockEntryFilterDto, ExpiringFilterDto } from './dto/stock-entry.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../auth/decorators/current-user.decorator';

@ApiTags('Entradas de stock')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'supervisor')
@Controller('api/stock-entries')
export class StockEntriesController {
  constructor(private svc: StockEntriesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar entradas de stock (lotes)' })
  findAll(@Query() filters: StockEntryFilterDto) {
    return this.svc.findAll(filters);
  }

  @Get('expiring')
  @ApiOperation({ summary: 'Lotes vencidos o por vencer dentro de N días (default 7)' })
  expiring(@Query() filters: ExpiringFilterDto) {
    return this.svc.expiring(filters.days ?? 7);
  }

  @Post()
  @ApiOperation({ summary: 'Ingresar stock: crea el lote y suma al ingrediente' })
  create(@Body() dto: CreateStockEntryDto, @CurrentUser() user: JwtPayload) {
    return this.svc.create(dto, user.sub);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Eliminar entrada errónea (descuenta lo sumado)' })
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
