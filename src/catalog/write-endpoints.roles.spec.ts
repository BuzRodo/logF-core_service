import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { ProductsController } from './products/products.controller';
import { CategoriesController } from './categories/categories.controller';
import { IngredientsController } from './ingredients/ingredients.controller';
import { StockEntriesController } from './stock-entries/stock-entries.controller';

/**
 * Verifica, leyendo la metadata real de los decoradores @Roles (sin levantar un server
 * HTTP — no hay DB disponible en este sandbox), que los endpoints de escritura del
 * catálogo exigen roles concretos y por lo tanto RolesGuard rechazará a cashier/supervisor
 * donde no corresponda. Resuelve la metadata con la misma prioridad que usa RolesGuard
 * (reflector.getAllAndOverride: metadata del método si existe, si no la de la clase).
 */
function effectiveRoles(controller: Function, methodName: string): string[] | undefined {
  const handler = (controller.prototype as Record<string, unknown>)[methodName];
  return (
    Reflect.getMetadata(ROLES_KEY, handler as object) ?? Reflect.getMetadata(ROLES_KEY, controller)
  );
}

describe('Autorización de endpoints de escritura de catálogo', () => {
  const adminOnlyWriteEndpoints: [string, Function, string][] = [
    ['ProductsController.create', ProductsController, 'create'],
    ['ProductsController.update', ProductsController, 'update'],
    ['ProductsController.remove', ProductsController, 'remove'],
    ['CategoriesController.create', CategoriesController, 'create'],
    ['CategoriesController.update', CategoriesController, 'update'],
    ['CategoriesController.remove', CategoriesController, 'remove'],
    ['IngredientsController.create', IngredientsController, 'create'],
    ['IngredientsController.update', IngredientsController, 'update'],
    ['IngredientsController.remove', IngredientsController, 'remove'],
    ['StockEntriesController.remove', StockEntriesController, 'remove'],
  ];

  it.each(adminOnlyWriteEndpoints)('%s exige admin y rechaza cashier/supervisor', (_label, controller, method) => {
    const roles = effectiveRoles(controller, method);
    expect(roles).toEqual(['admin']);
    expect(roles).not.toContain('cashier');
    expect(roles).not.toContain('supervisor');
  });

  it('StockEntriesController.create permite admin y supervisor (operación de depósito) pero rechaza cashier', () => {
    const roles = effectiveRoles(StockEntriesController, 'create');
    expect(roles).toEqual(['admin', 'supervisor']);
    expect(roles).not.toContain('cashier');
  });

  it('ProductsController.getCost (margen) es admin-only', () => {
    expect(effectiveRoles(ProductsController, 'getCost')).toEqual(['admin']);
  });

  it('IngredientsController.costChanges (historial de costo) es admin-only', () => {
    expect(effectiveRoles(IngredientsController, 'costChanges')).toEqual(['admin']);
  });

  it('la lectura de catálogo (findAll/findOne) admite los 3 roles', () => {
    expect(effectiveRoles(ProductsController, 'findAll')).toEqual(['admin', 'supervisor', 'cashier']);
    expect(effectiveRoles(IngredientsController, 'findAll')).toEqual(['admin', 'supervisor', 'cashier']);
  });
});
