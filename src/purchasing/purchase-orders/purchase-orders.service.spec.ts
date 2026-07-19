import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PurchaseOrdersService } from './purchase-orders.service';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockSupplier = { id: 'sup-1', name: 'Frigorífico Sur', active: true };

const mockPrisma = {
  supplier: { findUnique: jest.fn() },
  ingredient: { findMany: jest.fn() },
  purchaseOrder: {
    count: jest.fn(),
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
} as any;

function buildService() {
  return new PurchaseOrdersService(mockPrisma);
}

const validDto = {
  supplierId: 'sup-1',
  expectedDate: '2026-07-10',
  items: [{ ingredientId: 'ing-1', unit: 'GRAM' as any, quantity: 5000 }],
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('PurchaseOrdersService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('crea la orden con código correlativo y sus ítems', async () => {
      const svc = buildService();
      mockPrisma.supplier.findUnique.mockResolvedValue(mockSupplier);
      mockPrisma.ingredient.findMany.mockResolvedValue([{ id: 'ing-1' }]);
      mockPrisma.purchaseOrder.count.mockResolvedValue(4);
      mockPrisma.purchaseOrder.create.mockResolvedValue({ id: 'oc-1', code: 'OC-000005' });

      const result = await svc.create(validDto, 'user-1');

      expect(result.code).toBe('OC-000005');
      expect(mockPrisma.purchaseOrder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            code: 'OC-000005',
            supplierId: 'sup-1',
            expectedDate: new Date('2026-07-10'),
            createdBy: 'user-1',
            items: {
              create: [{ ingredientId: 'ing-1', freeName: null, unit: 'GRAM', quantity: 5000 }],
            },
          }),
        }),
      );
    });

    it('acepta ítems con nombre libre (insumo aún no cargado)', async () => {
      const svc = buildService();
      mockPrisma.supplier.findUnique.mockResolvedValue(mockSupplier);
      mockPrisma.purchaseOrder.count.mockResolvedValue(0);
      mockPrisma.purchaseOrder.create.mockResolvedValue({ id: 'oc-1', code: 'OC-000001' });

      await svc.create(
        { supplierId: 'sup-1', items: [{ freeName: 'Queso rallado', unit: 'GRAM' as any, quantity: 2000 }] },
        'user-1',
      );

      expect(mockPrisma.purchaseOrder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            items: { create: [{ ingredientId: null, freeName: 'Queso rallado', unit: 'GRAM', quantity: 2000 }] },
          }),
        }),
      );
    });

    it('rechaza ítem con insumo existente y nombre libre a la vez', async () => {
      const svc = buildService();
      mockPrisma.supplier.findUnique.mockResolvedValue(mockSupplier);

      await expect(
        svc.create(
          { supplierId: 'sup-1', items: [{ ingredientId: 'ing-1', freeName: 'Queso', unit: 'GRAM' as any, quantity: 100 }] },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rechaza proveedor inexistente', async () => {
      const svc = buildService();
      mockPrisma.supplier.findUnique.mockResolvedValue(null);

      await expect(svc.create(validDto, 'user-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('cancel', () => {
    it('cancela una orden pendiente', async () => {
      const svc = buildService();
      mockPrisma.purchaseOrder.findUnique.mockResolvedValue({ id: 'oc-1', code: 'OC-000001', status: 'PENDIENTE' });
      mockPrisma.purchaseOrder.update.mockResolvedValue({ id: 'oc-1', status: 'CANCELADA' });

      const result = await svc.cancel('oc-1');

      expect(result.status).toBe('CANCELADA');
      expect(mockPrisma.purchaseOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'oc-1' }, data: { status: 'CANCELADA' } }),
      );
    });

    it('rechaza cancelar una orden ya recibida', async () => {
      const svc = buildService();
      mockPrisma.purchaseOrder.findUnique.mockResolvedValue({ id: 'oc-1', code: 'OC-000001', status: 'RECIBIDA' });

      await expect(svc.cancel('oc-1')).rejects.toThrow(ConflictException);
      expect(mockPrisma.purchaseOrder.update).not.toHaveBeenCalled();
    });
  });
});
