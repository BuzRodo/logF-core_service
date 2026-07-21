import { filterCostFieldsForRole } from './cost-visibility.util';

describe('filterCostFieldsForRole', () => {
  it('no modifica la respuesta para admin', () => {
    const data = { name: 'Carne', costPerUnit: 80000 };
    expect(filterCostFieldsForRole(data, 'admin')).toEqual(data);
  });

  it('elimina campos de costo de nivel superior para supervisor', () => {
    const data = { name: 'Carne', costPerUnit: 80000, unit: 'GRAM' };
    const result = filterCostFieldsForRole(data, 'supervisor') as any;
    expect(result).toEqual({ name: 'Carne', unit: 'GRAM' });
    expect(result.costPerUnit).toBeUndefined();
  });

  it('elimina campos de costo para cashier', () => {
    const data = { name: 'Carne', costPerUnit: 80000 };
    const result = filterCostFieldsForRole(data, 'cashier') as any;
    expect(result.costPerUnit).toBeUndefined();
  });

  it('elimina costHistory completo (array anidado) para no-admin', () => {
    const data = {
      id: 'ing-1',
      name: 'Carne',
      costHistory: [{ id: 'h1', oldCost: 100, newCost: 200, changedBy: 'u1' }],
    };
    const result = filterCostFieldsForRole(data, 'supervisor') as any;
    expect(result.costHistory).toBeUndefined();
    expect(result.name).toBe('Carne');
  });

  it('filtra costos anidados dentro de recetas (producto → recipeItems → ingredient)', () => {
    const data = {
      productId: 'p1',
      price: 62000,
      totalCost: 12000,
      margin: 50000,
      marginPct: 80.6,
      recipeItems: [
        {
          quantity: 150,
          ingredient: { name: 'Carne', unit: 'GRAM', costPerUnit: 80000 },
        },
      ],
      items: [{ ingredientName: 'Carne', quantity: 150, costPerUnit: 80000, cost: 12000 }],
    };

    const result = filterCostFieldsForRole(data, 'supervisor') as any;

    expect(result.totalCost).toBeUndefined();
    expect(result.margin).toBeUndefined();
    expect(result.marginPct).toBeUndefined();
    expect(result.recipeItems[0].ingredient.costPerUnit).toBeUndefined();
    expect(result.recipeItems[0].ingredient.name).toBe('Carne');
    expect(result.items[0].cost).toBeUndefined();
    expect(result.items[0].costPerUnit).toBeUndefined();
    expect(result.items[0].ingredientName).toBe('Carne');
    // No debe tocar los campos de venta (no son costo)
    expect(result.price).toBe(62000);
  });

  it('filtra arrays de nivel superior (findAll de ingredientes/facturas)', () => {
    const data = [
      { name: 'Carne', costPerUnit: 80000 },
      { name: 'Pan', costPerUnit: 3000 },
    ];
    const result = filterCostFieldsForRole(data, 'cashier') as any;
    expect(result).toEqual([{ name: 'Carne' }, { name: 'Pan' }]);
  });

  it('filtra totalAmount de factura de compra y lineTotal de lotes de stock anidados', () => {
    const data = {
      id: 'inv-1',
      series: 'A',
      number: '001',
      totalAmount: 500000,
      stockEntries: [{ id: 'se-1', quantity: 5000, lineTotal: 500000, note: 'Compra' }],
    };
    const result = filterCostFieldsForRole(data, 'supervisor') as any;
    expect(result.totalAmount).toBeUndefined();
    expect(result.stockEntries[0].lineTotal).toBeUndefined();
    expect(result.stockEntries[0].quantity).toBe(5000);
  });

  it('filtra costAtSale de los ítems de una venta', () => {
    const data = {
      id: 'sale-1',
      total: 67100,
      items: [{ productName: 'Hamburguesa', unitPrice: 62000, quantity: 1, costAtSale: 12000 }],
    };
    const result = filterCostFieldsForRole(data, 'cashier') as any;
    expect(result.items[0].costAtSale).toBeUndefined();
    expect(result.items[0].unitPrice).toBe(62000);
    expect(result.total).toBe(67100);
  });

  it('preserva instancias de Date sin convertirlas en objetos planos', () => {
    const date = new Date('2026-07-20T00:00:00Z');
    const data = { createdAt: date, costPerUnit: 1000 };
    const result = filterCostFieldsForRole(data, 'supervisor') as any;
    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.createdAt.getTime()).toBe(date.getTime());
  });

  it('no modifica valores null/undefined ni primitivos', () => {
    expect(filterCostFieldsForRole(null, 'supervisor')).toBeNull();
    expect(filterCostFieldsForRole(undefined, 'supervisor')).toBeUndefined();
    expect(filterCostFieldsForRole(42, 'supervisor')).toBe(42);
    expect(filterCostFieldsForRole('texto', 'cashier')).toBe('texto');
  });
});
