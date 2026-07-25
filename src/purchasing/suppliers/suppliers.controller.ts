import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto, UpdateSupplierDto } from './dto/supplier.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@ApiTags('Proveedores')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('api/suppliers')
export class SuppliersController {
  constructor(private svc: SuppliersService) {}

  @Get()
  @Roles('admin', 'supervisor')
  @ApiOperation({ summary: 'Listar proveedores' })
  findAll() {
    return this.svc.findAll();
  }

  @Get(':id')
  @Roles('admin', 'supervisor')
  @ApiOperation({ summary: 'Obtener proveedor' })
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear proveedor' })
  create(@Body() dto: CreateSupplierDto) {
    return this.svc.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar proveedor' })
  update(@Param('id') id: string, @Body() dto: UpdateSupplierDto) {
    return this.svc.update(id, dto);
  }

  // Eliminación física (no soft-delete): solo procede si no tiene facturas ni órdenes
  // de compra dependientes — devuelve 409 con un mensaje accionable en caso contrario.
  // Para desactivar (soft-delete) se usa el PATCH genérico de arriba con { active: false }.
  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar proveedor físicamente (falla con 409 si tiene facturas u órdenes dependientes)' })
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
