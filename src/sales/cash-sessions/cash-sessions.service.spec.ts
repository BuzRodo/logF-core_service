import { CashSessionsService } from './cash-sessions.service';

const mockPrisma = {
  cashSession: {
    findUnique: jest.fn(),
  },
  sale: {
    aggregate: jest.fn(),
  },
  cashMovement: {
    groupBy: jest.fn(),
  },
} as any;

function buildService() {
  return new CashSessionsService(mockPrisma);
}

describe('CashSessionsService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('summary', () => {
    it('calcula el efectivo esperado combinando apertura, ventas en efectivo e ingresos/egresos', async () => {
      mockPrisma.cashSession.findUnique.mockResolvedValue({
        id: 'session-1',
        openingAmount: 100000,
        status: 'OPEN',
      });
      mockPrisma.sale.aggregate.mockResolvedValue({ _sum: { total: 250000 } });
      mockPrisma.cashMovement.groupBy.mockResolvedValue([
        { type: 'INGRESO', _sum: { amount: 20000 } },
        { type: 'EGRESO', _sum: { amount: 15000 } },
      ]);

      const svc = buildService();
      const result = await svc.summary('session-1');

      expect(mockPrisma.sale.aggregate).toHaveBeenCalledWith({
        where: { cashSessionId: 'session-1', paymentMethod: 'CASH', voidedAt: null },
        _sum: { total: true },
      });
      expect(mockPrisma.cashMovement.groupBy).toHaveBeenCalledWith({
        by: ['type'],
        where: { cashSessionId: 'session-1' },
        _sum: { amount: true },
      });

      // expected = 100000 + 250000 + 20000 − 15000 = 355000
      expect(result).toEqual({
        openingAmount: 100000,
        cashSales: 250000,
        ingresos: 20000,
        egresos: 15000,
        expected: 355000,
      });
    });

    it('usa 0 por defecto cuando no hay ventas ni movimientos', async () => {
      mockPrisma.cashSession.findUnique.mockResolvedValue({
        id: 'session-2',
        openingAmount: 50000,
        status: 'OPEN',
      });
      mockPrisma.sale.aggregate.mockResolvedValue({ _sum: { total: null } });
      mockPrisma.cashMovement.groupBy.mockResolvedValue([]);

      const svc = buildService();
      const result = await svc.summary('session-2');

      expect(result).toEqual({
        openingAmount: 50000,
        cashSales: 0,
        ingresos: 0,
        egresos: 0,
        expected: 50000,
      });
    });
  });
});
