import { NotFoundException, ConflictException } from '@nestjs/common';
import { SuppliersService } from './suppliers.service';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockSupplier = {
  id: 'sup-1',
  name: 'Frigorífico Sur',
  contactName: 'Marcelo Píriz',
  phone: '099 111 222',
  email: 'ventas@frigorificosur.uy',
  active: true,
};

const mockPrisma = {
  supplier: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
} as any;

function buildService() {
  return new SuppliersService(mockPrisma);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SuppliersService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('remove', () => {
    it('rechaza si el proveedor no existe', async () => {
      const svc = buildService();
      mockPrisma.supplier.findUnique.mockResolvedValue(null);

      await expect(svc.remove('sup-x')).rejects.toThrow(NotFoundException);
      expect(mockPrisma.supplier.delete).not.toHaveBeenCalled();
    });

    it('borra el proveedor físicamente cuando no tiene facturas ni órdenes (caso limpio)', async () => {
      const svc = buildService();
      mockPrisma.supplier.findUnique.mockResolvedValue({
        ...mockSupplier,
        _count: { invoices: 0, orders: 0 },
      });

      await svc.remove('sup-1');

      expect(mockPrisma.supplier.delete).toHaveBeenCalledWith({ where: { id: 'sup-1' } });
    });

    it('rechaza con 409 si el proveedor tiene facturas registradas', async () => {
      const svc = buildService();
      mockPrisma.supplier.findUnique.mockResolvedValue({
        ...mockSupplier,
        _count: { invoices: 2, orders: 0 },
      });

      await expect(svc.remove('sup-1')).rejects.toThrow(ConflictException);
      await expect(svc.remove('sup-1')).rejects.toThrow(/2 factura/);
      expect(mockPrisma.supplier.delete).not.toHaveBeenCalled();
    });

    it('rechaza con 409 si el proveedor tiene órdenes de compra registradas', async () => {
      const svc = buildService();
      mockPrisma.supplier.findUnique.mockResolvedValue({
        ...mockSupplier,
        _count: { invoices: 0, orders: 1 },
      });

      await expect(svc.remove('sup-1')).rejects.toThrow(ConflictException);
      await expect(svc.remove('sup-1')).rejects.toThrow(/1 orden/);
      expect(mockPrisma.supplier.delete).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('permite desactivar (soft-delete) vía active: false', async () => {
      const svc = buildService();
      mockPrisma.supplier.findUnique.mockResolvedValue(mockSupplier);
      mockPrisma.supplier.update.mockResolvedValue({ ...mockSupplier, active: false });

      await svc.update('sup-1', { active: false });

      expect(mockPrisma.supplier.update).toHaveBeenCalledWith({
        where: { id: 'sup-1' },
        data: { active: false },
      });
    });
  });
});
