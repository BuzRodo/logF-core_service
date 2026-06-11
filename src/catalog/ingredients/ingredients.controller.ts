import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IngredientsService } from './ingredients.service';
import { CreateIngredientDto, UpdateIngredientDto } from './dto/ingredient.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../auth/decorators/current-user.decorator';

@ApiTags('Ingredientes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('api/ingredients')
export class IngredientsController {
  constructor(private svc: IngredientsService) {}

  @Get()
  @Roles('admin', 'supervisor')
  @ApiOperation({ summary: 'Listar ingredientes' })
  findAll() {
    return this.svc.findAll();
  }

  @Get(':id')
  @Roles('admin', 'supervisor')
  @ApiOperation({ summary: 'Obtener ingrediente con historial de costos' })
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear ingrediente' })
  create(@Body() dto: CreateIngredientDto) {
    return this.svc.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar ingrediente (registra cambio de costo automáticamente)' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateIngredientDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.svc.update(id, dto, user.sub);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desactivar ingrediente (soft-delete)' })
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
