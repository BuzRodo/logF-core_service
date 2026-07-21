import { IsString, IsOptional, IsEnum, IsBoolean, Matches, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../../generated/prisma/client';

/** username: 3-50 caracteres, solo letras/números/guiones (sin espacios ni símbolos). */
const USERNAME_PATTERN = /^[a-zA-Z0-9-]+$/;
const USERNAME_MESSAGE = 'El usuario solo puede contener letras, números y guiones (sin espacios)';

export class CreateUserDto {
  @ApiProperty({ example: 'jperez' })
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  @Matches(USERNAME_PATTERN, { message: USERNAME_MESSAGE })
  username: string;

  @ApiProperty({ example: 'Juan Pérez' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  displayName: string;

  @ApiPropertyOptional({ enum: UserRole, default: UserRole.cashier })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiProperty({ example: 'unaClaveSegura123', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;
}

/**
 * Actualización de datos del usuario (username/nombre/rol). El estado `active` y la
 * contraseña se manejan en endpoints propios (`PATCH /:id/active` y `PATCH /:id/password`)
 * para poder aplicarles sus propias reglas de integridad sin mezclarlas acá.
 */
export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'jperez' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  @Matches(USERNAME_PATTERN, { message: USERNAME_MESSAGE })
  username?: string;

  @ApiPropertyOptional({ example: 'Juan Pérez' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  displayName?: string;

  @ApiPropertyOptional({ enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}

export class SetActiveDto {
  @ApiProperty({ example: false })
  @IsBoolean()
  active: boolean;
}

/** Reseteo de contraseña por un admin — no requiere la contraseña anterior. */
export class ResetPasswordDto {
  @ApiProperty({ example: 'nuevaClaveSegura123', minLength: 8 })
  @IsString()
  @MinLength(8)
  newPassword: string;
}

/** Cambio de la contraseña propia — exige la actual, para cualquier usuario autenticado. */
export class ChangeOwnPasswordDto {
  @ApiProperty()
  @IsString()
  currentPassword: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  newPassword: string;
}
