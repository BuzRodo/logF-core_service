import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { CreateCustomerDto, UpdateCustomerDto, SearchCustomerDto } from './dto/customer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Clientes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('api/customers')
export class CustomersController {
  constructor(private svc: CustomersService) {}

  @Get()
  @Roles('admin', 'supervisor')
  @ApiOperation({ summary: 'Listar clientes' })
  findAll() {
    return this.svc.findAll();
  }

  @Get('search')
  @Roles('admin', 'supervisor', 'cashier')
  @ApiOperation({ summary: 'Buscar cliente por teléfono' })
  search(@Query() query: SearchCustomerDto) {
    return this.svc.search(query.phone);
  }

  @Get(':id')
  @Roles('admin', 'supervisor')
  @ApiOperation({ summary: 'Obtener cliente' })
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Post()
  @Roles('admin', 'supervisor', 'cashier')
  @ApiOperation({ summary: 'Crear cliente' })
  create(@Body() dto: CreateCustomerDto) {
    return this.svc.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar cliente' })
  update(@Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desactivar cliente (soft-delete)' })
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
