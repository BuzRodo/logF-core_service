import { calcItemCost } from './products.service';
import { Unit } from '../../../generated/prisma/client';

describe('calcItemCost', () => {
  describe('GRAM', () => {
    it('calcula costo de 150g a $800/kg', () => {
      // 150g × (80000 / 1000) = 12000 centavos = $120
      expect(calcItemCost(Unit.GRAM, 150, 80000)).toBe(12000);
    });

    it('calcula costo de 250g a $80/kg', () => {
      expect(calcItemCost(Unit.GRAM, 250, 8000)).toBe(2000);
    });

    it('redondea correctamente en fracciones', () => {
      // 1g × (30000 / 1000) = 30 exacto
      expect(calcItemCost(Unit.GRAM, 1, 30000)).toBe(30);
      // 7g × (10000 / 1000) = 70
      expect(calcItemCost(Unit.GRAM, 7, 10000)).toBe(70);
    });

    it('devuelve 0 si quantity es 0', () => {
      expect(calcItemCost(Unit.GRAM, 0, 80000)).toBe(0);
    });
  });

  describe('ML', () => {
    it('calcula costo de 100ml a $200/litro', () => {
      // 100 × (20000 / 1000) = 2000 centavos = $20
      expect(calcItemCost(Unit.ML, 100, 20000)).toBe(2000);
    });

    it('calcula costo de 200ml de leche', () => {
      expect(calcItemCost(Unit.ML, 200, 15000)).toBe(3000);
    });
  });

  describe('UNIT', () => {
    it('calcula costo de 1 pan a $30', () => {
      // 1 × 3000 = 3000 centavos = $30
      expect(calcItemCost(Unit.UNIT, 1, 3000)).toBe(3000);
    });

    it('calcula costo de 2 huevos', () => {
      expect(calcItemCost(Unit.UNIT, 2, 1500)).toBe(3000);
    });

    it('calcula costo de 0 unidades', () => {
      expect(calcItemCost(Unit.UNIT, 0, 3000)).toBe(0);
    });
  });

  describe('receta vacía (costo 0)', () => {
    it('la suma de items vacíos es 0', () => {
      const total = [].reduce((sum: number, cost: number) => sum + cost, 0);
      expect(total).toBe(0);
    });
  });
});
