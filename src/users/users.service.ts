import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { UserRole } from '../../generated/prisma/client';
import { JwtPayload } from '../auth/decorators/current-user.decorator';

/** Mismo cost factor que usa `prisma/seed.ts` y el resto del sistema para hashear contraseñas. */
export const BCRYPT_ROUNDS = 10;

/** Campos seguros para devolver al frontend — NUNCA incluye `passwordHash`. */
const SAFE_USER_SELECT = {
  id: true,
  username: true,
  displayName: true,
  role: true,
  active: true,
  createdAt: true,
} as const;

export interface SafeUser {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
  active: boolean;
  createdAt: Date;
}

/**
 * Mapper de salida explícito: arma el DTO seguro campo por campo en vez de hacer
 * `delete user.passwordHash`, para que sea imposible filtrar el hash aunque el objeto
 * de entrada traiga más campos de los esperados (defensa en profundidad respecto del
 * `select` que ya se usa en las consultas a Prisma).
 */
function toSafeUser(user: {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
  active: boolean;
  createdAt: Date;
}): SafeUser {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    active: user.active,
    createdAt: user.createdAt,
  };
}

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  findAll(): Promise<SafeUser[]> {
    return this.prisma.user.findMany({
      select: SAFE_USER_SELECT,
      orderBy: { displayName: 'asc' },
    });
  }

  async findOne(id: string): Promise<SafeUser> {
    const user = await this.prisma.user.findUnique({ where: { id }, select: SAFE_USER_SELECT });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  /** Busca por username ignorando mayúsculas/minúsculas (unicidad case-insensitive). */
  private findByUsernameCI(username: string) {
    return this.prisma.user.findFirst({
      where: { username: { equals: username, mode: 'insensitive' } },
    });
  }

  /** Trae el registro completo (incluye passwordHash) para uso interno del servicio. */
  private async requireFullUser(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  /** Lanza ConflictException si `excludeId` es el único admin activo del sistema. */
  private async assertNotLastActiveAdmin(excludeId: string) {
    const otherActiveAdmins = await this.prisma.user.count({
      where: { role: 'admin', active: true, id: { not: excludeId } },
    });
    if (otherActiveAdmins === 0) {
      throw new ConflictException('No se puede desactivar/degradar al último admin activo del sistema');
    }
  }

  async create(dto: CreateUserDto): Promise<SafeUser> {
    const exists = await this.findByUsernameCI(dto.username);
    if (exists) throw new ConflictException('Ya existe un usuario con ese nombre de usuario');

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        username: dto.username,
        passwordHash,
        displayName: dto.displayName,
        role: dto.role ?? 'cashier',
      },
      select: SAFE_USER_SELECT,
    });
    return toSafeUser(user);
  }

  async update(id: string, dto: UpdateUserDto, currentUser: JwtPayload): Promise<SafeUser> {
    const target = await this.requireFullUser(id);

    if (dto.username !== undefined) {
      const dupe = await this.findByUsernameCI(dto.username);
      if (dupe && dupe.id !== id) {
        throw new ConflictException('Ya existe un usuario con ese nombre de usuario');
      }
    }

    // Un admin no puede quitarse el rol admin a sí mismo (incondicional, aunque haya otros admins).
    if (dto.role !== undefined && dto.role !== 'admin' && target.role === 'admin' && target.id === currentUser.sub) {
      throw new ForbiddenException('No podés quitarte el rol admin a vos mismo');
    }

    // Nadie puede degradar al último admin activo del sistema (así queda siempre uno).
    if (dto.role !== undefined && dto.role !== 'admin' && target.role === 'admin') {
      await this.assertNotLastActiveAdmin(target.id);
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.username !== undefined && { username: dto.username }),
        ...(dto.displayName !== undefined && { displayName: dto.displayName }),
        ...(dto.role !== undefined && { role: dto.role }),
      },
      select: SAFE_USER_SELECT,
    });
    return toSafeUser(user);
  }

  async setActive(id: string, active: boolean, currentUser: JwtPayload): Promise<SafeUser> {
    const target = await this.requireFullUser(id);

    if (!active) {
      // Un admin no puede desactivarse a sí mismo (incondicional).
      if (target.id === currentUser.sub) {
        throw new ForbiddenException('No podés desactivarte a vos mismo');
      }
      // Nadie puede desactivar al último admin activo del sistema.
      if (target.role === 'admin') {
        await this.assertNotLastActiveAdmin(target.id);
      }
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: { active },
      select: SAFE_USER_SELECT,
    });
    return toSafeUser(user);
  }

  /** Resetea la contraseña de un usuario — lo hace un admin, no requiere la contraseña anterior. */
  async resetPassword(id: string, newPassword: string): Promise<SafeUser> {
    await this.requireFullUser(id);
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    const user = await this.prisma.user.update({
      where: { id },
      data: { passwordHash },
      select: SAFE_USER_SELECT,
    });
    return toSafeUser(user);
  }

  /** Cambio de contraseña propia — para cualquier usuario autenticado, exige la actual. */
  async changeOwnPassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.requireFullUser(userId);

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new UnauthorizedException('La contraseña actual es incorrecta');

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  }
}
