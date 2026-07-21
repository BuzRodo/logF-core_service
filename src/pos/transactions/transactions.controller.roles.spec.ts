import { ROLES_KEY } from '../../auth/decorators/roles.decorator';
import { TransactionsController } from './transactions.controller';

function effectiveRoles(methodName: string): string[] | undefined {
  const handler = (TransactionsController.prototype as unknown as Record<string, object>)[methodName];
  return Reflect.getMetadata(ROLES_KEY, handler) ?? Reflect.getMetadata(ROLES_KEY, TransactionsController);
}

describe('Autorización de TransactionsController (pagos con tarjeta)', () => {
  it('el flujo normal de cobro (purchase/query/confirm/cancel) admite los 3 roles', () => {
    for (const method of ['initiatePurchase', 'queryTransaction', 'confirmPurchase', 'cancelTransaction']) {
      expect(effectiveRoles(method)).toEqual(['admin', 'supervisor', 'cashier']);
    }
  });

  it('reverse/void/refund/search rechazan a cashier (deshacen una transacción asentada o auditan)', () => {
    for (const method of ['reverseTransaction', 'voidByTicket', 'refund', 'searchTransactions']) {
      const roles = effectiveRoles(method);
      expect(roles).toEqual(['admin', 'supervisor']);
      expect(roles).not.toContain('cashier');
    }
  });
});
