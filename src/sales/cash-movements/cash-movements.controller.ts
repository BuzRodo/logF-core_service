import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiForbiddenResponse } from '@nestjs/swagger';
import { CashMovementsService } from './cash-movements.service';
import { CreateCashMovementDto, CashMovementFilterDto } from './dto/cash-movement.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../auth/decorators/current-user.decorator';
import { FeatureGuard } from '../../common/features/feature.guard';
import { RequireFeature } from '../../common/features/require-feature.decorator';

// Mismo criterio que CashSessionsController: FeatureGuard en vez de desmontado (ver nota ahí).
@ApiTags('Caja')
@ApiBearerAuth()
@ApiForbiddenResponse({ description: 'FEATURE_CASH está deshabilitado por configuración' })
@UseGuards(JwtAuthGuard, RolesGuard, FeatureGuard)
@RequireFeature('cash')
@Controller('api/cash-movements')
export class CashMovementsController {
  constructor(private svc: CashMovementsService) {}

  @Post()
  @Roles('admin', 'supervisor', 'cashier')
  @ApiOperation({ summary: 'Registrar movimiento de caja (ingreso o egreso)' })
  create(@Body() dto: CreateCashMovementDto, @CurrentUser() user: JwtPayload) {
    return this.svc.create(dto, user.sub);
  }

  @Get()
  @Roles('admin', 'supervisor')
  @ApiOperation({ summary: 'Listar movimientos de caja con filtros opcionales' })
  findAll(@Query() filters: CashMovementFilterDto) {
    return this.svc.findAll(filters);
  }
}
