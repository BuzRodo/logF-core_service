import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@ApiTags('Categorías')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/categories')
export class CategoriesController {
  constructor(private svc: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar categorías' })
  findAll() {
    return this.svc.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener categoría por id' })
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Crear categoría' })
  create(@Body() dto: CreateCategoryDto) {
    return this.svc.create(dto);
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Actualizar categoría' })
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Desactivar categoría (soft-delete)' })
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
