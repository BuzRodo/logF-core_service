import { NotFoundException, BadRequestException } from '@nestjs/common';
import { StockEntriesService } from './stock-entries.service';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockIngredient = { id: 'ing-1', name: 'Carne vacuna picada', active: true };

const mockPrisma = {
  ingredient: {
    findUnique: jest.fn(),
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
  });

  describe('remove', () => {
    it('elimina el lote y descuenta lo que había sumado', async () => {
      const svc = buildService();
      mockPrisma.stockEntry.findUnique.mockResolvedValue({ id: 'entry-1', ingredientId: 'ing-1', quantity: 5000 });
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
