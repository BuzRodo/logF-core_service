import { UnprocessableEntityException, BadRequestException } from '@nestjs/common';
import { SalesService } from './sales.service';
import { PaymentMethod, Unit } from '../../../generated/prisma/client';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockProduct = {
  id: 'prod-1',
  name: 'Hamburguesa Clásica',
  price: 55000,
  active: true,
  recipeItems: [
    {
      quantity: 150,
      ingredientId: 'ing-1',
      ingredient: { unit: Unit.GRAM, costPerUnit: 80000 },
    },
    {
      quantity: 1,
      ingredientId: 'ing-2',
      ingredient: { unit: Unit.UNIT, costPerUnit: 3000 },
    },
  ],
};

const mockPrisma = {
  sale: {
    count: jest.fn().mockResolvedValue(0),
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  product: {
    findMany: jest.fn().mockResolvedValue([mockProduct]),
  },
  ingredient: {
    update: jest.fn(),
  },
  $transaction: jest.fn(),
} as any;

const mockCashSessions = {
  findOne: jest.fn().mockResolvedValue({ id: 'session-1', status: 'OPEN' }),
} as any;

const mockConfig = {
  get: jest.fn().mockReturnValue(0.22),
} as any;

function buildService() {
  return new SalesService(mockPrisma, mockCashSessions, mockConfig);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SalesService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('create — validaciones server-side', () => {
    it('rechaza si el descuento global supera el subtotal', async () => {
      const svc = buildService();
      const dto = {
        items: [{ productId: 'prod-1', quantity: 1 }],
        globalDiscount: 9999999, // descuento absurdo
        paymentMethod: PaymentMethod.CASH,
        cashSessionId: 'session-1',
      };
      await expect(svc.create(dto, 'user-1')).rejects.toThrow(UnprocessableEntityException);
    });

    it('rechaza pago CARD sin cardTransactionId', async () => {
      const svc = buildService();
      mockPrisma.$transaction.mockResolvedValue({ invoiceNumber: 'F-000001', items: [] });
      const dto = {
        items: [{ productId: 'prod-1', quantity: 1 }],
        globalDiscount: 0,
        paymentMethod: PaymentMethod.CARD,
        cashSessionId: 'session-1',
        // sin cardTransactionId
      };
      await expect(svc.create(dto, 'user-1')).rejects.toThrow(BadRequestException);
    });

    it('rechaza si la sesión de caja está cerrada', async () => {
      mockCashSessions.findOne.mockResolvedValueOnce({ id: 'session-1', status: 'CLOSED' });
      const svc = buildService();
      const dto = {
        items: [{ productId: 'prod-1', quantity: 1 }],
        globalDiscount: 0,
        paymentMethod: PaymentMethod.CASH,
        cashSessionId: 'session-1',
      };
      await expect(svc.create(dto, 'user-1')).rejects.toThrow(BadRequestException);
    });

    it('calcula totales correctamente ignorando precio enviado por el cliente', async () => {
      const svc = buildService();
      let capturedData: any;
      mockPrisma.$transaction.mockImplementation(async (fn: Function) => {
        return fn({
          sale: {
            create: jest.fn().mockImplementation(({ data }) => {
              capturedData = data;
              return { ...data, id: 'sale-1', invoiceNumber: 'F-000001', items: [] };
            }),
          },
          ingredient: { update: jest.fn() },
        });
      });

      const dto = {
        items: [{ productId: 'prod-1', quantity: 2 }],
        globalDiscount: 0,
        paymentMethod: PaymentMethod.CASH,
        cashSessionId: 'session-1',
      };

      await svc.create(dto, 'user-1');

      // subtotal = 2 × 55000 = 110000
      expect(capturedData.subtotal).toBe(110000);
      // tax = 110000 × 0.22 = 24200
      expect(capturedData.tax).toBe(24200);
      // total = 110000 + 24200 = 134200
      expect(capturedData.total).toBe(134200);
    });

    it('aplica descuento por ítem antes del descuento global', async () => {
      const svc = buildService();
      let capturedData: any;
      mockPrisma.$transaction.mockImplementation(async (fn: Function) => {
        return fn({
          sale: {
            create: jest.fn().mockImplementation(({ data }) => {
              capturedData = data;
              return { ...data, id: 'sale-1', items: [] };
            }),
          },
          ingredient: { update: jest.fn() },
        });
      });

      // 1 × 55000 − 5000 (desc. ítem) = 50000; global_disc 10000 → 40000
      // tax = 40000 × 0.22 = 8800 → total = 48800
      const dto = {
        items: [{ productId: 'prod-1', quantity: 1, discount: 5000 }],
        globalDiscount: 10000,
        paymentMethod: PaymentMethod.CASH,
        cashSessionId: 'session-1',
      };

      await svc.create(dto, 'user-1');

      expect(capturedData.subtotal).toBe(50000);
      expect(capturedData.globalDiscount).toBe(10000);
      expect(capturedData.tax).toBe(8800);
      expect(capturedData.total).toBe(48800);
    });
  });
});
