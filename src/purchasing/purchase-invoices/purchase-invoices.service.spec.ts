import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PurchaseInvoicesService } from './purchase-invoices.service';
import { VoucherType } from '../../../generated/prisma/client';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockSupplier = { id: 'sup-1', name: 'Frigorífico Sur', active: true };

const mockPrisma = {
  supplier: {
    findUnique: jest.fn(),
  },
  ingredient: {
    findMany: jest.fn(),
  },
  purchaseInvoice: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  purchaseOrder: {
    findUnique: jest.fn(),
  },
  $transaction: jest.fn(),
} as any;

// Mocks internos de la transacción, reiniciados en cada test
const tx = {
  purchaseInvoice: { create: jest.fn(), delete: jest.fn() },
  stockEntry: { create: jest.fn(), deleteMany: jest.fn() },
  ingredient: { update: jest.fn(), create: jest.fn() },
  ingredientCostHistory: { create: jest.fn() },
  purchaseOrder: { update: jest.fn() },
};

const validDto = {
  supplierId: 'sup-1',
  voucherType: VoucherType.FACTURA_CONTADO,
  series: 'A',
  number: '0003391',
  deliveryDate: '2026-06-28',
  entryDate: '2026-07-01',
  totalAmount: 9650000,
};

function buildService() {
  return new PurchaseInvoicesService(mockPrisma);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('PurchaseInvoicesService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.$transaction.mockImplementation(async (fn: Function) => fn(tx));
    tx.purchaseInvoice.create.mockResolvedValue({ id: 'inv-1' });
  });

  describe('create', () => {
    it('crea la factura con proveedor activo y serie+número únicos', async () => {
      const svc = buildService();
      mockPrisma.supplier.findUnique.mockResolvedValue(mockSupplier);
      mockPrisma.purchaseInvoice.findUnique.mockResolvedValue(null);

      const result = await svc.create(validDto, 'user-1');

      expect(result.id).toBe('inv-1');
      expect(tx.purchaseInvoice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            supplierId: 'sup-1',
            series: 'A',
            number: '0003391',
            totalAmount: 9650000,
            deliveryDate: new Date('2026-06-28'),
            entryDate: new Date('2026-07-01'),
            createdBy: 'user-1',
          }),
        }),
      );
      expect(tx.stockEntry.create).not.toHaveBeenCalled();
    });

    it('con ítems existentes: crea los lotes vinculados y suma stock de cada ingrediente', async () => {
      const svc = buildService();
      mockPrisma.supplier.findUnique.mockResolvedValue(mockSupplier);
      mockPrisma.purchaseInvoice.findUnique.mockResolvedValue(null);
      mockPrisma.ingredient.findMany.mockResolvedValue([
        { id: 'ing-1', unit: 'GRAM', costPerUnit: 80000 },
        { id: 'ing-2', unit: 'UNIT', costPerUnit: 3000 },
      ]);

      await svc.create(
        {
          ...validDto,
          items: [
            { ingredientId: 'ing-1', quantity: 5000, expiryDate: '2026-08-15' },
            { ingredientId: 'ing-2', quantity: 30 },
          ],
        },
        'user-1',
      );

      expect(tx.stockEntry.create).toHaveBeenCalledTimes(2);
      expect(tx.stockEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ingredientId: 'ing-1',
            quantity: 5000,
            expiryDate: new Date('2026-08-15'),
            purchaseInvoiceId: 'inv-1',
            note: 'Factura A-0003391',
          }),
        }),
      );
      expect(tx.ingredient.update).toHaveBeenCalledWith({
        where: { id: 'ing-1' },
        data: { stockGrams: { increment: 5000 } },
      });
      expect(tx.ingredient.update).toHaveBeenCalledWith({
        where: { id: 'ing-2' },
        data: { stockGrams: { increment: 30 } },
      });
      // sin importe de línea, no toca el costo
      expect(tx.ingredientCostHistory.create).not.toHaveBeenCalled();
    });

    it('ítem nuevo: da de alta el ingrediente con costo derivado del importe', async () => {
      const svc = buildService();
      mockPrisma.supplier.findUnique.mockResolvedValue(mockSupplier);
      mockPrisma.purchaseInvoice.findUnique.mockResolvedValue(null);
      mockPrisma.ingredient.findMany.mockResolvedValue([]); // sin colisiones de nombre
      tx.ingredient.create.mockResolvedValue({ id: 'ing-new' });

      await svc.create(
        {
          ...validDto,
          items: [
            // 3 kg de carne por $2.400 → $800 el kilo (80000 centavos)
            { newIngredient: { name: 'Carne vacuna picada', unit: 'GRAM' as any }, quantity: 3000, lineTotal: 240000 },
          ],
        },
        'user-1',
      );

      expect(tx.ingredient.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Carne vacuna picada',
            unit: 'GRAM',
            costPerUnit: 80000,
            supplier: 'Frigorífico Sur',
            stockGrams: 0,
          }),
        }),
      );
      expect(tx.stockEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ ingredientId: 'ing-new', quantity: 3000 }) }),
      );
      expect(tx.ingredient.update).toHaveBeenCalledWith({
        where: { id: 'ing-new' },
        data: { stockGrams: { increment: 3000 } },
      });
    });

    it('ítem existente con importe: actualiza el costo del insumo y registra historial', async () => {
      const svc = buildService();
      mockPrisma.supplier.findUnique.mockResolvedValue(mockSupplier);
      mockPrisma.purchaseInvoice.findUnique.mockResolvedValue(null);
      mockPrisma.ingredient.findMany.mockResolvedValue([
        { id: 'ing-1', unit: 'GRAM', costPerUnit: 80000 },
      ]);

      await svc.create(
        {
          ...validDto,
          // 2 kg por $1.700 → $850/kg: sube de 80000 a 85000
          items: [{ ingredientId: 'ing-1', quantity: 2000, lineTotal: 170000 }],
        },
        'user-1',
      );

      expect(tx.ingredientCostHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ ingredientId: 'ing-1', oldCost: 80000, newCost: 85000 }),
        }),
      );
      expect(tx.ingredient.update).toHaveBeenCalledWith({
        where: { id: 'ing-1' },
        data: { costPerUnit: 85000 },
      });
    });

    it('ítem con ivaRate: guarda el snapshot en el lote (no toca el costo)', async () => {
      const svc = buildService();
      mockPrisma.supplier.findUnique.mockResolvedValue(mockSupplier);
      mockPrisma.purchaseInvoice.findUnique.mockResolvedValue(null);
      mockPrisma.ingredient.findMany.mockResolvedValue([
        { id: 'ing-1', unit: 'GRAM', costPerUnit: 80000, ivaRate: 'EXENTO' },
      ]);

      await svc.create(
        {
          ...validDto,
          items: [{ ingredientId: 'ing-1', quantity: 2000, ivaRate: 'IVA_22' as any }],
        },
        'user-1',
      );

      expect(tx.stockEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ ivaRate: 'IVA_22' }) }),
      );
    });

    it('ítem sin ivaRate propio: hereda el del insumo existente como snapshot del lote', async () => {
      const svc = buildService();
      mockPrisma.supplier.findUnique.mockResolvedValue(mockSupplier);
      mockPrisma.purchaseInvoice.findUnique.mockResolvedValue(null);
      mockPrisma.ingredient.findMany.mockResolvedValue([
        { id: 'ing-1', unit: 'GRAM', costPerUnit: 80000, ivaRate: 'IVA_10' },
      ]);

      await svc.create(
        { ...validDto, items: [{ ingredientId: 'ing-1', quantity: 2000 }] },
        'user-1',
      );

      expect(tx.stockEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ ivaRate: 'IVA_10' }) }),
      );
    });

    it('ítem sin ivaRate propio y sin dato en el insumo: snapshot queda en null', async () => {
      const svc = buildService();
      mockPrisma.supplier.findUnique.mockResolvedValue(mockSupplier);
      mockPrisma.purchaseInvoice.findUnique.mockResolvedValue(null);
      mockPrisma.ingredient.findMany.mockResolvedValue([
        { id: 'ing-1', unit: 'GRAM', costPerUnit: 80000, ivaRate: null },
      ]);

      await svc.create(
        { ...validDto, items: [{ ingredientId: 'ing-1', quantity: 2000 }] },
        'user-1',
      );

      expect(tx.stockEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ ivaRate: null }) }),
      );
    });

    it('ítem nuevo con ivaRate: lo asigna al ingrediente y al lote', async () => {
      const svc = buildService();
      mockPrisma.supplier.findUnique.mockResolvedValue(mockSupplier);
      mockPrisma.purchaseInvoice.findUnique.mockResolvedValue(null);
      mockPrisma.ingredient.findMany.mockResolvedValue([]);
      tx.ingredient.create.mockResolvedValue({ id: 'ing-new', ivaRate: 'IVA_10' });

      await svc.create(
        {
          ...validDto,
          items: [
            {
              newIngredient: { name: 'Yerba', unit: 'GRAM' as any },
              quantity: 1000,
              lineTotal: 50000,
              ivaRate: 'IVA_10' as any,
            },
          ],
        },
        'user-1',
      );

      expect(tx.ingredient.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ ivaRate: 'IVA_10' }) }),
      );
      expect(tx.stockEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ ivaRate: 'IVA_10' }) }),
      );
    });

    it('rechaza ítem nuevo sin importe de línea', async () => {
      const svc = buildService();
      mockPrisma.supplier.findUnique.mockResolvedValue(mockSupplier);
      mockPrisma.purchaseInvoice.findUnique.mockResolvedValue(null);

      await expect(
        svc.create(
          { ...validDto, items: [{ newIngredient: { name: 'Sal', unit: 'GRAM' as any }, quantity: 1000 }] },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('rechaza ítem nuevo cuyo nombre ya existe como ingrediente', async () => {
      const svc = buildService();
      mockPrisma.supplier.findUnique.mockResolvedValue(mockSupplier);
      mockPrisma.purchaseInvoice.findUnique.mockResolvedValue(null);
      mockPrisma.ingredient.findMany.mockResolvedValue([{ name: 'Carne vacuna picada' }]);

      await expect(
        svc.create(
          {
            ...validDto,
            items: [{ newIngredient: { name: 'Carne vacuna picada', unit: 'GRAM' as any }, quantity: 1000, lineTotal: 80000 }],
          },
          'user-1',
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('rechaza ítems con ingredientes inexistentes o inactivos', async () => {
      const svc = buildService();
      mockPrisma.supplier.findUnique.mockResolvedValue(mockSupplier);
      mockPrisma.purchaseInvoice.findUnique.mockResolvedValue(null);
      mockPrisma.ingredient.findMany.mockResolvedValue([]); // ninguno encontrado

      await expect(
        svc.create({ ...validDto, items: [{ ingredientId: 'ing-x', quantity: 100 }] }, 'user-1'),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('con purchaseOrderId: cierra la orden pendiente como RECIBIDA', async () => {
      const svc = buildService();
      mockPrisma.supplier.findUnique.mockResolvedValue(mockSupplier);
      mockPrisma.purchaseInvoice.findUnique.mockResolvedValue(null);
      mockPrisma.purchaseOrder.findUnique.mockResolvedValue({
        id: 'oc-1', code: 'OC-000001', status: 'PENDIENTE', supplierId: 'sup-1',
      });

      await svc.create({ ...validDto, purchaseOrderId: 'oc-1' }, 'user-1');

      expect(tx.purchaseInvoice.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ purchaseOrderId: 'oc-1' }) }),
      );
      expect(tx.purchaseOrder.update).toHaveBeenCalledWith({
        where: { id: 'oc-1' },
        data: { status: 'RECIBIDA' },
      });
    });

    it('rechaza cerrar una orden de otro proveedor', async () => {
      const svc = buildService();
      mockPrisma.supplier.findUnique.mockResolvedValue(mockSupplier);
      mockPrisma.purchaseInvoice.findUnique.mockResolvedValue(null);
      mockPrisma.purchaseOrder.findUnique.mockResolvedValue({
        id: 'oc-1', code: 'OC-000001', status: 'PENDIENTE', supplierId: 'sup-OTRO',
      });

      await expect(svc.create({ ...validDto, purchaseOrderId: 'oc-1' }, 'user-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('rechaza cerrar una orden que no está pendiente', async () => {
      const svc = buildService();
      mockPrisma.supplier.findUnique.mockResolvedValue(mockSupplier);
      mockPrisma.purchaseInvoice.findUnique.mockResolvedValue(null);
      mockPrisma.purchaseOrder.findUnique.mockResolvedValue({
        id: 'oc-1', code: 'OC-000001', status: 'RECIBIDA', supplierId: 'sup-1',
      });

      await expect(svc.create({ ...validDto, purchaseOrderId: 'oc-1' }, 'user-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('al eliminar una factura vinculada a una OC, la orden vuelve a PENDIENTE', async () => {
      const svc = buildService();
      mockPrisma.purchaseInvoice.findUnique.mockResolvedValue({
        id: 'inv-1',
        purchaseOrderId: 'oc-1',
        stockEntries: [],
      });

      await svc.remove('inv-1');

      expect(tx.purchaseOrder.update).toHaveBeenCalledWith({
        where: { id: 'oc-1' },
        data: { status: 'PENDIENTE' },
      });
    });

    it('al eliminar una factura con lotes, revierte el stock', async () => {
      const svc = buildService();
      mockPrisma.purchaseInvoice.findUnique.mockResolvedValue({
        id: 'inv-1',
        stockEntries: [{ id: 'e1', ingredientId: 'ing-1', quantity: 5000 }],
      });

      await svc.remove('inv-1');

      expect(tx.ingredient.update).toHaveBeenCalledWith({
        where: { id: 'ing-1' },
        data: { stockGrams: { decrement: 5000 } },
      });
      expect(tx.stockEntry.deleteMany).toHaveBeenCalledWith({ where: { purchaseInvoiceId: 'inv-1' } });
      expect(tx.purchaseInvoice.delete).toHaveBeenCalledWith({ where: { id: 'inv-1' } });
    });

    it('rechaza si el proveedor no existe', async () => {
      const svc = buildService();
      mockPrisma.supplier.findUnique.mockResolvedValue(null);

      await expect(svc.create(validDto, 'user-1')).rejects.toThrow(NotFoundException);
      expect(mockPrisma.purchaseInvoice.create).not.toHaveBeenCalled();
    });

    it('rechaza si el proveedor está inactivo', async () => {
      const svc = buildService();
      mockPrisma.supplier.findUnique.mockResolvedValue({ ...mockSupplier, active: false });

      await expect(svc.create(validDto, 'user-1')).rejects.toThrow(BadRequestException);
      expect(mockPrisma.purchaseInvoice.create).not.toHaveBeenCalled();
    });

    it('rechaza duplicado de serie+número para el mismo proveedor', async () => {
      const svc = buildService();
      mockPrisma.supplier.findUnique.mockResolvedValue(mockSupplier);
      mockPrisma.purchaseInvoice.findUnique.mockResolvedValue({ id: 'inv-existente' });

      await expect(svc.create(validDto, 'user-1')).rejects.toThrow(ConflictException);
      expect(mockPrisma.purchaseInvoice.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('aplica filtros de proveedor y rango de fechas de ingreso', async () => {
      const svc = buildService();
      mockPrisma.purchaseInvoice.findMany.mockResolvedValue([]);

      await svc.findAll({ supplierId: 'sup-1', from: '2026-06-01', to: '2026-06-30' });

      expect(mockPrisma.purchaseInvoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            supplierId: 'sup-1',
            entryDate: { gte: new Date('2026-06-01'), lte: new Date('2026-06-30') },
          },
          orderBy: { entryDate: 'desc' },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('lanza NotFound si la factura no existe', async () => {
      const svc = buildService();
      mockPrisma.purchaseInvoice.findUnique.mockResolvedValue(null);

      await expect(svc.findOne('inv-x')).rejects.toThrow(NotFoundException);
    });
  });
});
