import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DriversService } from './drivers.service';
import { CreateDriverDto, UpdateDriverDto } from './dto/driver.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Repartidores')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('api/drivers')
export class DriversController {
  constructor(private svc: DriversService) {}

  @Get()
  @Roles('admin', 'supervisor', 'cashier')
  @ApiOperation({ summary: 'Listar repartidores' })
  findAll() {
    return this.svc.findAll();
  }

  @Get(':id')
  @Roles('admin', 'supervisor')
  @ApiOperation({ summary: 'Obtener repartidor' })
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Post()
  @Roles('admin', 'supervisor')
  @ApiOperation({ summary: 'Crear repartidor' })
  create(@Body() dto: CreateDriverDto) {
    return this.svc.create(dto);
  }

  @Patch(':id')
  @Roles('admin', 'supervisor')
  @ApiOperation({ summary: 'Actualizar repartidor' })
  update(@Param('id') id: string, @Body() dto: UpdateDriverDto) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desactivar repartidor (soft-delete)' })
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
