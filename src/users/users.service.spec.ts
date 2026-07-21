import { ConflictException, ForbiddenException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
} as any;

function buildService() {
  return new UsersService(mockPrisma);
}

const admin = (overrides: Partial<any> = {}) => ({
  id: 'admin-1', username: 'admin', passwordHash: 'hash-admin', displayName: 'Admin',
  role: 'admin', active: true, createdAt: new Date('2026-01-01'), ...overrides,
});

const cashier = (overrides: Partial<any> = {}) => ({
  id: 'cash-1', username: 'cajero1', passwordHash: 'hash-cajero', displayName: 'Cajero',
  role: 'cashier', active: true, createdAt: new Date('2026-01-01'), ...overrides,
});

describe('UsersService', () => {
  beforeEach(() => jest.clearAllMocks());

  // ─── create ─────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('crea el usuario hasheando la contraseña con bcrypt', async () => {
      const svc = buildService();
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.create.mockImplementation(({ data }: any) =>
        Promise.resolve({
          id: 'u-1', username: data.username, displayName: data.displayName,
          role: data.role, active: true, createdAt: new Date(),
        }),
      );

      const dto = { username: 'jperez', displayName: 'Juan Pérez', password: 'password123', role: 'cashier' as const };
      const result = await svc.create(dto);

      expect(result.username).toBe('jperez');
      expect((result as any).passwordHash).toBeUndefined();

      const createCall = mockPrisma.user.create.mock.calls[0][0];
      expect(createCall.data.passwordHash).not.toBe('password123');
      const matches = await bcrypt.compare('password123', createCall.data.passwordHash);
      expect(matches).toBe(true);
    });

    it('default role es cashier si no se especifica', async () => {
      const svc = buildService();
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.create.mockImplementation(({ data }: any) => Promise.resolve({ ...data, id: 'u-1', active: true, createdAt: new Date() }));

      await svc.create({ username: 'nuevo', displayName: 'Nuevo', password: 'password123' } as any);

      expect(mockPrisma.user.create.mock.calls[0][0].data.role).toBe('cashier');
    });

    it('rechaza username duplicado sin importar mayúsculas/minúsculas', async () => {
      const svc = buildService();
      mockPrisma.user.findFirst.mockResolvedValue(admin({ username: 'JPerez' }));

      await expect(
        svc.create({ username: 'jperez', displayName: 'Juan', password: 'password123' } as any),
      ).rejects.toThrow(ConflictException);
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });

    it('busca la unicidad de forma case-insensitive vía Prisma', async () => {
      const svc = buildService();
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(admin());

      await svc.create({ username: 'JPerez', displayName: 'Juan', password: 'password123' } as any);

      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: { username: { equals: 'JPerez', mode: 'insensitive' } },
      });
    });

    it('nunca devuelve passwordHash aunque el resultado de Prisma lo incluya', async () => {
      const svc = buildService();
      mockPrisma.user.findFirst.mockResolvedValue(null);
      // Simula un `select` mal configurado / mock ingenuo que sí trae el hash
      mockPrisma.user.create.mockResolvedValue({
        id: 'u-1', username: 'jperez', displayName: 'Juan', role: 'cashier',
        active: true, createdAt: new Date(), passwordHash: 'super-secreto-hash',
      });

      const result = await svc.create({ username: 'jperez', displayName: 'Juan', password: 'password123' } as any);

      expect(Object.keys(result)).not.toContain('passwordHash');
      expect(JSON.stringify(result)).not.toContain('super-secreto-hash');
    });
  });

  // ─── findAll / findOne ────────────────────────────────────────────────────────

  describe('findAll / findOne', () => {
    it('findAll consulta con select explícito sin passwordHash', async () => {
      const svc = buildService();
      mockPrisma.user.findMany.mockResolvedValue([]);
      await svc.findAll();
      const call = mockPrisma.user.findMany.mock.calls[0][0];
      expect(call.select).toEqual({
        id: true, username: true, displayName: true, role: true, active: true, createdAt: true,
      });
    });

    it('findOne lanza NotFoundException si no existe', async () => {
      const svc = buildService();
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(svc.findOne('missing')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── update: reglas de integridad ────────────────────────────────────────────

  describe('update', () => {
    it('un admin no puede quitarse el rol admin a sí mismo', async () => {
      const svc = buildService();
      mockPrisma.user.findUnique.mockResolvedValue(admin());

      await expect(
        svc.update('admin-1', { role: 'cashier' } as any, { sub: 'admin-1', username: 'admin', role: 'admin' }),
      ).rejects.toThrow(ForbiddenException);
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('permite que un admin cambie su propio username/nombre sin tocar el rol', async () => {
      const svc = buildService();
      mockPrisma.user.findUnique.mockResolvedValue(admin());
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.update.mockResolvedValue(admin({ displayName: 'Admin Nuevo' }));

      const result = await svc.update(
        'admin-1', { displayName: 'Admin Nuevo' } as any, { sub: 'admin-1', username: 'admin', role: 'admin' },
      );
      expect(result.displayName).toBe('Admin Nuevo');
    });

    it('no se puede degradar al último admin activo (lo intenta otro admin)', async () => {
      const svc = buildService();
      mockPrisma.user.findUnique.mockResolvedValue(admin({ id: 'admin-2' }));
      mockPrisma.user.count.mockResolvedValue(0); // no hay otros admins activos

      await expect(
        svc.update('admin-2', { role: 'supervisor' } as any, { sub: 'admin-1', username: 'admin', role: 'admin' }),
      ).rejects.toThrow(ConflictException);
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('permite degradar a un admin si queda al menos otro admin activo', async () => {
      const svc = buildService();
      mockPrisma.user.findUnique.mockResolvedValue(admin({ id: 'admin-2' }));
      mockPrisma.user.count.mockResolvedValue(1); // hay otro admin activo
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.update.mockResolvedValue(admin({ id: 'admin-2', role: 'supervisor' }));

      const result = await svc.update(
        'admin-2', { role: 'supervisor' } as any, { sub: 'admin-1', username: 'admin', role: 'admin' },
      );
      expect(result.role).toBe('supervisor');
    });

    it('rechaza username duplicado al actualizar (case-insensitive, excluyendo el propio id)', async () => {
      const svc = buildService();
      mockPrisma.user.findUnique.mockResolvedValue(cashier());
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'otro-id', username: 'existente' });

      await expect(
        svc.update('cash-1', { username: 'existente' } as any, { sub: 'admin-1', username: 'admin', role: 'admin' }),
      ).rejects.toThrow(ConflictException);
    });

    it('permite conservar el mismo username propio al actualizar otros campos', async () => {
      const svc = buildService();
      mockPrisma.user.findUnique.mockResolvedValue(cashier());
      mockPrisma.user.findFirst.mockResolvedValue(cashier()); // el propio registro
      mockPrisma.user.update.mockResolvedValue(cashier({ displayName: 'Nuevo' }));

      const result = await svc.update(
        'cash-1', { username: 'cajero1', displayName: 'Nuevo' } as any,
        { sub: 'admin-1', username: 'admin', role: 'admin' },
      );
      expect(result.displayName).toBe('Nuevo');
    });
  });

  // ─── setActive: reglas de integridad ─────────────────────────────────────────

  describe('setActive', () => {
    it('un admin no puede desactivarse a sí mismo', async () => {
      const svc = buildService();
      mockPrisma.user.findUnique.mockResolvedValue(admin());

      await expect(
        svc.setActive('admin-1', false, { sub: 'admin-1', username: 'admin', role: 'admin' }),
      ).rejects.toThrow(ForbiddenException);
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('no se puede desactivar al último admin activo', async () => {
      const svc = buildService();
      mockPrisma.user.findUnique.mockResolvedValue(admin({ id: 'admin-2' }));
      mockPrisma.user.count.mockResolvedValue(0);

      await expect(
        svc.setActive('admin-2', false, { sub: 'admin-1', username: 'admin', role: 'admin' }),
      ).rejects.toThrow(ConflictException);
    });

    it('permite desactivar a un admin si queda otro admin activo', async () => {
      const svc = buildService();
      mockPrisma.user.findUnique.mockResolvedValue(admin({ id: 'admin-2' }));
      mockPrisma.user.count.mockResolvedValue(1);
      mockPrisma.user.update.mockResolvedValue(admin({ id: 'admin-2', active: false }));

      const result = await svc.setActive('admin-2', false, { sub: 'admin-1', username: 'admin', role: 'admin' });
      expect(result.active).toBe(false);
    });

    it('permite desactivar a un cashier sin restricciones de "último admin"', async () => {
      const svc = buildService();
      mockPrisma.user.findUnique.mockResolvedValue(cashier());
      mockPrisma.user.update.mockResolvedValue(cashier({ active: false }));

      const result = await svc.setActive('cash-1', false, { sub: 'admin-1', username: 'admin', role: 'admin' });
      expect(result.active).toBe(false);
      expect(mockPrisma.user.count).not.toHaveBeenCalled();
    });

    it('permite reactivar a un admin sin pasar por las reglas de "último admin"', async () => {
      const svc = buildService();
      mockPrisma.user.findUnique.mockResolvedValue(admin({ active: false }));
      mockPrisma.user.update.mockResolvedValue(admin({ active: true }));

      const result = await svc.setActive('admin-1', true, { sub: 'admin-2', username: 'admin2', role: 'admin' });
      expect(result.active).toBe(true);
      expect(mockPrisma.user.count).not.toHaveBeenCalled();
    });
  });

  // ─── resetPassword (admin) ────────────────────────────────────────────────────

  describe('resetPassword', () => {
    it('hashea la nueva contraseña con bcrypt', async () => {
      const svc = buildService();
      mockPrisma.user.findUnique.mockResolvedValue(cashier());
      mockPrisma.user.update.mockImplementation(({ data }: any) =>
        Promise.resolve({ ...cashier(), ...data }),
      );

      await svc.resetPassword('cash-1', 'nuevaClave123');

      const updateCall = mockPrisma.user.update.mock.calls[0][0];
      expect(updateCall.data.passwordHash).not.toBe('nuevaClave123');
      const matches = await bcrypt.compare('nuevaClave123', updateCall.data.passwordHash);
      expect(matches).toBe(true);
    });

    it('lanza NotFoundException si el usuario no existe', async () => {
      const svc = buildService();
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(svc.resetPassword('missing', 'nuevaClave123')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── changeOwnPassword ────────────────────────────────────────────────────────

  describe('changeOwnPassword', () => {
    it('rechaza si la contraseña actual es incorrecta', async () => {
      const svc = buildService();
      const hash = await bcrypt.hash('claveReal123', 10);
      mockPrisma.user.findUnique.mockResolvedValue(cashier({ passwordHash: hash }));

      await expect(
        svc.changeOwnPassword('cash-1', 'claveIncorrecta', 'nuevaClave123'),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('actualiza la contraseña si la actual es correcta', async () => {
      const svc = buildService();
      const hash = await bcrypt.hash('claveReal123', 10);
      mockPrisma.user.findUnique.mockResolvedValue(cashier({ passwordHash: hash }));
      mockPrisma.user.update.mockResolvedValue(cashier());

      await svc.changeOwnPassword('cash-1', 'claveReal123', 'nuevaClave123');

      const updateCall = mockPrisma.user.update.mock.calls[0][0];
      const matches = await bcrypt.compare('nuevaClave123', updateCall.data.passwordHash);
      expect(matches).toBe(true);
    });
  });
});
