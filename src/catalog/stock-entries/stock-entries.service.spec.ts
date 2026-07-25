import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { StockEntriesService } from './stock-entries.service';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockIngredient = { id: 'ing-1', name: 'Carne vacuna picada', active: true };

const mockPrisma = {
  ingredient: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  stockEntry: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    delete: jest.fn(),
  },
  $transaction: jest.fn(),
} as any;

function buildService() {
  return new StockEntriesService(mockPrisma);
}

const validDto = {
  ingredientId: 'ing-1',
  quantity: 5000,
  expiryDate: '2026-08-15',
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('StockEntriesService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('crea el lote y suma el stock del ingrediente en la transacción', async () => {
      const svc = buildService();
      mockPrisma.ingredient.findUnique.mockResolvedValue(mockIngredient);
      const txEntryCreate = jest.fn().mockResolvedValue({ id: 'entry-1', ...validDto });
      const txIngredientUpdate = jest.fn();
      mockPrisma.$transaction.mockImplementation(async (fn: Function) =>
        fn({
          stockEntry: { create: txEntryCreate },
          ingredient: { update: txIngredientUpdate },
        }),
      );

      await svc.create(validDto, 'user-1');

      expect(txEntryCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ingredientId: 'ing-1',
            quantity: 5000,
            expiryDate: new Date('2026-08-15'),
            createdBy: 'user-1',
          }),
        }),
      );
      expect(txIngredientUpdate).toHaveBeenCalledWith({
        where: { id: 'ing-1' },
        data: { stockGrams: { increment: 5000 } },
      });
    });

    it('rechaza si el ingrediente no existe', async () => {
      const svc = buildService();
      mockPrisma.ingredient.findUnique.mockResolvedValue(null);

      await expect(svc.create(validDto, 'user-1')).rejects.toThrow(NotFoundException);
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('rechaza si el ingrediente está inactivo', async () => {
      const svc = buildService();
      mockPrisma.ingredient.findUnique.mockResolvedValue({ ...mockIngredient, active: false });

      await expect(svc.create(validDto, 'user-1')).rejects.toThrow(BadRequestException);
    });

    it('crea el insumo nuevo y el lote en la misma transacción cuando viene newIngredient', async () => {
      const svc = buildService();
      mockPrisma.ingredient.findFirst.mockResolvedValue(null);
      const txIngredientCreate = jest.fn().mockResolvedValue({ id: 'ing-new' });
      const txEntryCreate = jest.fn().mockResolvedValue({ id: 'entry-1' });
      const txIngredientUpdate = jest.fn();
      mockPrisma.$transaction.mockImplementation(async (fn: Function) =>
        fn({
          ingredient: { create: txIngredientCreate, update: txIngredientUpdate },
          stockEntry: { create: txEntryCreate },
        }),
      );

      const dto = {
        newIngredient: { name: 'Papel higiénico', unit: 'UNIT', supplier: 'Distribuidora Sur' },
        quantity: 24,
      };
      await svc.create(dto as any, 'user-1');

      expect(mockPrisma.ingredient.findUnique).not.toHaveBeenCalled();
      expect(txIngredientCreate).toHaveBeenCalledWith({
        data: {
          name: 'Papel higiénico',
          unit: 'UNIT',
          supplier: 'Distribuidora Sur',
          costPerUnit: 0,
          stockGrams: 0,
        },
      });
      expect(txEntryCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ ingredientId: 'ing-new', quantity: 24, createdBy: 'user-1' }),
        }),
      );
      expect(txIngredientUpdate).toHaveBeenCalledWith({
        where: { id: 'ing-new' },
        data: { stockGrams: { increment: 24 } },
      });
    });

    it('rechaza newIngredient si ya existe un insumo con ese nombre', async () => {
      const svc = buildService();
      mockPrisma.ingredient.findFirst.mockResolvedValue({ id: 'ing-9', name: 'Papel higiénico' });

      const dto = { newIngredient: { name: 'Papel higiénico', unit: 'UNIT' }, quantity: 24 };
      await expect(svc.create(dto as any, 'user-1')).rejects.toThrow(ConflictException);
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('rechaza si vienen ingredientId y newIngredient a la vez', async () => {
      const svc = buildService();
      const dto = {
        ingredientId: 'ing-1',
        newIngredient: { name: 'Papel higiénico', unit: 'UNIT' },
        quantity: 24,
      };
      await expect(svc.create(dto as any, 'user-1')).rejects.toThrow(BadRequestException);
      expect(mockPrisma.ingredient.findUnique).not.toHaveBeenCalled();
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('rechaza si no viene ni ingredientId ni newIngredient', async () => {
      const svc = buildService();
      const dto = { quantity: 24 };
      await expect(svc.create(dto as any, 'user-1')).rejects.toThrow(BadRequestException);
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('elimina el lote y descuenta lo que había sumado', async () => {
      const svc = buildService();
      mockPrisma.stockEntry.findUnique.mockResolvedValue({
        id: 'entry-1', ingredientId: 'ing-1', quantity: 5000, purchaseInvoiceId: null, purchaseInvoice: null,
      });
      const txDelete = jest.fn();
      const txIngredientUpdate = jest.fn();
      mockPrisma.$transaction.mockImplementation(async (fn: Function) =>
        fn({
          stockEntry: { delete: txDelete },
          ingredient: { update: txIngredientUpdate },
        }),
      );

      await svc.remove('entry-1');

      expect(txDelete).toHaveBeenCalledWith({ where: { id: 'entry-1' } });
      expect(txIngredientUpdate).toHaveBeenCalledWith({
        where: { id: 'ing-1' },
        data: { stockGrams: { decrement: 5000 } },
      });
    });

    it('rechaza con 409 si el lote está vinculado a una factura', async () => {
      const svc = buildService();
      mockPrisma.stockEntry.findUnique.mockResolvedValue({
        id: 'entry-1',
        ingredientId: 'ing-1',
        quantity: 5000,
        purchaseInvoiceId: 'inv-1',
        purchaseInvoice: { series: 'A', number: '0003391' },
      });

      await expect(svc.remove('entry-1')).rejects.toThrow(ConflictException);
      await expect(svc.remove('entry-1')).rejects.toThrow(/A-0003391/);
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('rechaza si la entrada no existe', async () => {
      const svc = buildService();
      mockPrisma.stockEntry.findUnique.mockResolvedValue(null);

      await expect(svc.remove('entry-x')).rejects.toThrow(NotFoundException);
    });
  });

  describe('expiring', () => {
    it('consulta lotes con vencimiento dentro del límite', async () => {
      const svc = buildService();
      mockPrisma.stockEntry.findMany.mockResolvedValue([]);

      await svc.expiring(7);

      expect(mockPrisma.stockEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { expiryDate: { not: null, lte: expect.any(Date) } },
          orderBy: { expiryDate: 'asc' },
        }),
      );
    });
  });
});
