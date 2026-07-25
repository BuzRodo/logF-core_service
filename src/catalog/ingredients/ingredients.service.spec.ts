import { NotFoundException, ConflictException } from '@nestjs/common';
import { IngredientsService } from './ingredients.service';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockIngredient = {
  id: 'ing-1',
  name: 'Carne vacuna picada',
  costPerUnit: 80000,
  active: true,
};

const mockPrisma = {
  ingredient: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  ingredientCostHistory: {
    create: jest.fn(),
    findMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  stockEntry: {
    deleteMany: jest.fn(),
  },
  $transaction: jest.fn(),
} as any;

// Mocks internos de la transacción, reiniciados en cada test
const tx = {
  ingredientCostHistory: { deleteMany: jest.fn() },
  stockEntry: { deleteMany: jest.fn() },
  ingredient: { delete: jest.fn() },
};

function buildService() {
  return new IngredientsService(mockPrisma);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('IngredientsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.$transaction.mockImplementation(async (fn: Function) => fn(tx));
  });

  describe('remove', () => {
    it('rechaza si el ingrediente no existe', async () => {
      const svc = buildService();
      mockPrisma.ingredient.findUnique.mockResolvedValue(null);

      await expect(svc.remove('ing-x')).rejects.toThrow(NotFoundException);
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('borra el insumo junto con su historial de costos y lotes manuales (sin factura)', async () => {
      const svc = buildService();
      mockPrisma.ingredient.findUnique.mockResolvedValue({
        ...mockIngredient,
        _count: { recipeItems: 0, orderItems: 0 },
        stockEntries: [
          { id: 'se-1', purchaseInvoiceId: null },
          { id: 'se-2', purchaseInvoiceId: null },
        ],
      });

      await svc.remove('ing-1');

      expect(tx.ingredientCostHistory.deleteMany).toHaveBeenCalledWith({ where: { ingredientId: 'ing-1' } });
      expect(tx.stockEntry.deleteMany).toHaveBeenCalledWith({ where: { ingredientId: 'ing-1' } });
      expect(tx.ingredient.delete).toHaveBeenCalledWith({ where: { id: 'ing-1' } });
    });

    it('borra el insumo sin lotes ni historial (caso mínimo)', async () => {
      const svc = buildService();
      mockPrisma.ingredient.findUnique.mockResolvedValue({
        ...mockIngredient,
        _count: { recipeItems: 0, orderItems: 0 },
        stockEntries: [],
      });

      await svc.remove('ing-1');

      expect(tx.ingredient.delete).toHaveBeenCalledWith({ where: { id: 'ing-1' } });
    });

    it('rechaza con 409 si el insumo está usado en recetas', async () => {
      const svc = buildService();
      mockPrisma.ingredient.findUnique.mockResolvedValue({
        ...mockIngredient,
        _count: { recipeItems: 2, orderItems: 0 },
        stockEntries: [],
      });

      await expect(svc.remove('ing-1')).rejects.toThrow(ConflictException);
      await expect(svc.remove('ing-1')).rejects.toThrow(/2 receta/);
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('rechaza con 409 si tiene lotes vinculados a una factura', async () => {
      const svc = buildService();
      mockPrisma.ingredient.findUnique.mockResolvedValue({
        ...mockIngredient,
        _count: { recipeItems: 0, orderItems: 0 },
        stockEntries: [{ id: 'se-1', purchaseInvoiceId: 'inv-1' }],
      });

      await expect(svc.remove('ing-1')).rejects.toThrow(ConflictException);
      await expect(svc.remove('ing-1')).rejects.toThrow(/factura/i);
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('rechaza con 409 si está referenciado en ítems de orden de compra', async () => {
      const svc = buildService();
      mockPrisma.ingredient.findUnique.mockResolvedValue({
        ...mockIngredient,
        _count: { recipeItems: 0, orderItems: 1 },
        stockEntries: [],
      });

      await expect(svc.remove('ing-1')).rejects.toThrow(ConflictException);
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('permite desactivar (soft-delete) vía active: false, registrando historial solo si cambia el costo', async () => {
      const svc = buildService();
      mockPrisma.ingredient.findUnique.mockResolvedValue({
        ...mockIngredient,
        costHistory: [],
      });
      mockPrisma.ingredient.update.mockResolvedValue({ ...mockIngredient, active: false });

      await svc.update('ing-1', { active: false }, 'user-1');

      expect(mockPrisma.ingredientCostHistory.create).not.toHaveBeenCalled();
      expect(mockPrisma.ingredient.update).toHaveBeenCalledWith({
        where: { id: 'ing-1' },
        data: { active: false },
      });
    });
  });
});
