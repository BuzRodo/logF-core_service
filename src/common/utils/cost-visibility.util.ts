import { UserRole } from '../../../generated/prisma/client';

/**
 * Decisión de negocio: los campos de costo/margen NUNCA deben viajar al frontend para
 * supervisor ni cashier (ver MATRIZ_PERMISOS.md) — solo admin los ve. En vez de esparcir
 * `if (role !== 'admin') delete x.costPerUnit` por cada servicio/controller que toca
 * ingredientes, recetas, stock o compras, esta lista central define QUÉ es "costo" y
 * `filterCostFieldsForRole` lo elimina recursivamente de cualquier respuesta (objeto,
 * array, o anidado dentro de relaciones incluidas por Prisma).
 *
 * Si se agrega un campo de costo/margen nuevo en el futuro, hay que sumarlo acá.
 */
const COST_FIELD_NAMES: ReadonlySet<string> = new Set([
  'costPerUnit', // Ingredient.costPerUnit
  'costHistory', // Ingredient.costHistory (IngredientCostHistory[])
  'oldCost', // IngredientCostHistory.oldCost
  'newCost', // IngredientCostHistory.newCost
  'totalCost', // ProductCostBreakdown.totalCost
  'margin', // ProductCostBreakdown.margin
  'marginPct', // ProductCostBreakdown.marginPct
  'cost', // CostLineItem.cost (línea del desglose de receta)
  'totalAmount', // PurchaseInvoice.totalAmount (precio de compra)
  'lineTotal', // StockEntry.lineTotal (importe pagado por el lote)
  'costAtSale', // SaleItem.costAtSale (snapshot de costo al vender)
]);

/** Roles que ven los campos de costo/margen sin filtrar. */
const ROLES_WITH_FULL_COST_VISIBILITY: readonly UserRole[] = ['admin'];

function stripCostFieldsDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripCostFieldsDeep(item)) as unknown as T;
  }
  if (value instanceof Date) return value;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      if (COST_FIELD_NAMES.has(key)) continue;
      out[key] = stripCostFieldsDeep(v);
    }
    return out as T;
  }
  return value;
}

/**
 * Filtra campos de costo/margen de `data` según el rol del usuario autenticado.
 * Admin recibe la respuesta completa; cualquier otro rol la recibe sin los campos
 * listados en COST_FIELD_NAMES, sin importar en qué nivel de anidamiento aparezcan
 * (ej: producto → recipeItems → ingredient → costPerUnit).
 */
export function filterCostFieldsForRole<T>(data: T, role: UserRole): T {
  if (ROLES_WITH_FULL_COST_VISIBILITY.includes(role)) return data;
  return stripCostFieldsDeep(data);
}
