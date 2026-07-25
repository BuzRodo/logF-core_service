import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import {
  CreateUserDto,
  UpdateUserDto,
  ResetPasswordDto,
  SetActiveDto,
  ChangeOwnPasswordDto,
} from './dto/user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';

@ApiTags('Usuarios')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('api/users')
export class UsersController {
  constructor(private svc: UsersService) {}

  // IMPORTANTE: esta ruta estática tiene que declararse ANTES que `:id/...` para que
  // Nest no la matchee como si "me" fuera un id (Express resuelve por orden de registro).
  @Patch('me/password')
  @Roles('admin', 'supervisor', 'cashier')
  @ApiOperation({ summary: 'Cambiar la contraseña propia (requiere la contraseña actual)' })
  changeOwnPassword(@Body() dto: ChangeOwnPasswordDto, @CurrentUser() user: JwtPayload) {
    return this.svc.changeOwnPassword(user.sub, dto.currentPassword, dto.newPassword);
  }

  @Get()
  @ApiOperation({ summary: 'Listar usuarios' })
  findAll() {
    return this.svc.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener usuario por id' })
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear usuario' })
  create(@Body() dto: CreateUserDto) {
    return this.svc.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar usuario (username / nombre / rol)' })
  update(@Param('id') id: string, @Body() dto: UpdateUserDto, @CurrentUser() user: JwtPayload) {
    return this.svc.update(id, dto, user);
  }

  @Patch(':id/password')
  @ApiOperation({ summary: 'Resetear la contraseña de un usuario (no requiere la actual)' })
  resetPassword(@Param('id') id: string, @Body() dto: ResetPasswordDto) {
    return this.svc.resetPassword(id, dto.newPassword);
  }

  @Patch(':id/active')
  @ApiOperation({ summary: 'Activar / desactivar usuario' })
  setActive(@Param('id') id: string, @Body() dto: SetActiveDto, @CurrentUser() user: JwtPayload) {
    return this.svc.setActive(id, dto.active, user);
  }
}
