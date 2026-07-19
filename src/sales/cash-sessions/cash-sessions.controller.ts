import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CashSessionsService } from './cash-sessions.service';
import { OpenCashSessionDto, CloseCashSessionDto } from './dto/cash-session.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../auth/decorators/current-user.decorator';

@ApiTags('Caja')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/cash-sessions')
export class CashSessionsController {
  constructor(private svc: CashSessionsService) {}

  @Get()
  @Roles('admin', 'supervisor')
  @ApiOperation({ summary: 'Listar sesiones de caja' })
  findAll() {
    return this.svc.findAll();
  }

  @Get('active/:registerId')
  @Roles('admin', 'supervisor', 'cashier')
  @ApiOperation({ summary: 'Obtener la sesión abierta de una caja (null si no hay)' })
  findActive(@Param('registerId') registerId: string) {
    return this.svc.findActiveByRegister(registerId);
  }

  @Get(':id/summary')
  @Roles('admin', 'supervisor', 'cashier')
  @ApiOperation({ summary: 'Resumen de caja para arqueo (efectivo esperado)' })
  summary(@Param('id') id: string) {
    return this.svc.summary(id);
  }

  @Get(':id')
  @Roles('admin', 'supervisor', 'cashier')
  @ApiOperation({ summary: 'Obtener sesión de caja' })
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Post('open')
  @Roles('admin', 'supervisor', 'cashier')
  @ApiOperation({ summary: 'Abrir caja' })
  open(@Body() dto: OpenCashSessionDto, @CurrentUser() user: JwtPayload) {
    return this.svc.open(dto, user.sub);
  }

  @Post(':id/close')
  @Roles('admin', 'supervisor', 'cashier')
  @ApiOperation({ summary: 'Cerrar caja con arqueo' })
  close(@Param('id') id: string, @Body() dto: CloseCashSessionDto) {
    return this.svc.close(id, dto);
  }
}
