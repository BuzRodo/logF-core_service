import { UnprocessableEntityException, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
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
  customer: {
    findUnique: jest.fn(),
  },
  deliveryDriver: {
    findUnique: jest.fn(),
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

    it('crea venta DELIVERY con channelRef y lo persiste', async () => {
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
        items: [{ productId: 'prod-1', quantity: 1 }],
        globalDiscount: 0,
        paymentMethod: PaymentMethod.CASH,
        cashSessionId: 'session-1',
        channel: 'DELIVERY',
        channelRef: 'DL-00123',
      };

      await svc.create(dto as any, 'user-1');

      expect(capturedData.channel).toBe('DELIVERY');
      expect(capturedData.channelRef).toBe('DL-00123');
    });

    it('rechaza DELIVERY sin channelRef con BadRequestException', async () => {
      const svc = buildService();
      const dto = {
        items: [{ productId: 'prod-1', quantity: 1 }],
        globalDiscount: 0,
        paymentMethod: PaymentMethod.CASH,
        cashSessionId: 'session-1',
        channel: 'DELIVERY',
        // sin channelRef
      };
      await expect(svc.create(dto as any, 'user-1')).rejects.toThrow(BadRequestException);
    });

    it('sin channel persiste LOCAL por default', async () => {
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
        items: [{ productId: 'prod-1', quantity: 1 }],
        globalDiscount: 0,
        paymentMethod: PaymentMethod.CASH,
        cashSessionId: 'session-1',
      };

      await svc.create(dto as any, 'user-1');

      expect(capturedData.channel).toBe('LOCAL');
    });

    it('rechaza customerId inexistente con BadRequestException', async () => {
      const svc = buildService();
      mockPrisma.customer.findUnique.mockResolvedValue(null);

      const dto = {
        items: [{ productId: 'prod-1', quantity: 1 }],
        globalDiscount: 0,
        paymentMethod: PaymentMethod.CASH,
        cashSessionId: 'session-1',
        customerId: 'cust-x',
      };

      await expect(svc.create(dto as any, 'user-1')).rejects.toThrow(BadRequestException);
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('con customerId válido persiste el cliente en la venta', async () => {
      const svc = buildService();
      mockPrisma.customer.findUnique.mockResolvedValue({ id: 'cust-1', active: true });
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
        items: [{ productId: 'prod-1', quantity: 1 }],
        globalDiscount: 0,
        paymentMethod: PaymentMethod.CASH,
        cashSessionId: 'session-1',
        customerId: 'cust-1',
      };

      await svc.create(dto as any, 'user-1');

      expect(capturedData.customerId).toBe('cust-1');
    });
  });

  describe('findAll — filtros de fecha', () => {
    it('con from y to aplica ambos límites (gte y lte combinados)', async () => {
      const svc = buildService();
      mockPrisma.sale.findMany.mockResolvedValue([]);

      await svc.findAll({ from: '2026-07-01', to: '2026-07-31' });

      expect(mockPrisma.sale.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: {
              gte: new Date('2026-07-01'),
              lte: new Date('2026-07-31T23:59:59'),
            },
          }),
        }),
      );
    });
  });

  describe('summary — serie histórica', () => {
    it('agrupa por mes y excluye anuladas (filtro voidedAt null)', async () => {
      const svc = buildService();
      mockPrisma.sale.findMany.mockResolvedValue([
        { createdAt: new Date(2026, 5, 10, 12), total: 100 },
        { createdAt: new Date(2026, 5, 25, 18), total: 200 },
        { createdAt: new Date(2026, 6, 1, 9), total: 300 },
      ]);

      const result = await svc.summary({ granularity: 'month' });

      expect(mockPrisma.sale.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ voidedAt: null }) }),
      );
      expect(result.buckets).toEqual([
        { period: '2026-06', total: 300, count: 2 },
        { period: '2026-07', total: 300, count: 1 },
      ]);
    });

    it('agrupa por semana con inicio el lunes', async () => {
      const svc = buildService();
      // 2026-07-01 fue miércoles → su semana arranca el lunes 2026-06-29
      mockPrisma.sale.findMany.mockResolvedValue([
        { createdAt: new Date(2026, 6, 1, 12), total: 100 },
        { createdAt: new Date(2026, 6, 5, 12), total: 50 },  // domingo, misma semana
        { createdAt: new Date(2026, 6, 6, 12), total: 70 },  // lunes siguiente
      ]);

      const result = await svc.summary({ granularity: 'week' });

      expect(result.buckets).toEqual([
        { period: '2026-06-29', total: 150, count: 2 },
        { period: '2026-07-06', total: 70, count: 1 },
      ]);
    });
  });

  describe('void — anulación con reversión de stock', () => {
    const soldSale = {
      id: 'sale-1',
      invoiceNumber: 'F-000001',
      voidedAt: null,
      items: [
        {
          quantity: 2,
          product: {
            recipeItems: [
              { ingredientId: 'ing-1', quantity: 150 },
              { ingredientId: 'ing-2', quantity: 1 },
            ],
          },
        },
      ],
    };

    it('marca la venta anulada y devuelve el stock por receta', async () => {
      const svc = buildService();
      mockPrisma.sale.findUnique.mockResolvedValue(soldSale);
      const txIngredientUpdate = jest.fn();
      mockPrisma.$transaction.mockImplementation(async (fn: Function) =>
        fn({
          sale: { update: jest.fn().mockResolvedValue({ ...soldSale, voidedAt: new Date() }) },
          ingredient: { update: txIngredientUpdate },
        }),
      );

      await svc.void('sale-1', 'user-9');

      // 2 unidades → carne 300g y pan 2 devueltos
      expect(txIngredientUpdate).toHaveBeenCalledWith({
        where: { id: 'ing-1' },
        data: { stockGrams: { increment: 300 } },
      });
      expect(txIngredientUpdate).toHaveBeenCalledWith({
        where: { id: 'ing-2' },
        data: { stockGrams: { increment: 2 } },
      });
    });

    it('rechaza anular una venta ya anulada', async () => {
      const svc = buildService();
      mockPrisma.sale.findUnique.mockResolvedValue({ ...soldSale, voidedAt: new Date() });

      await expect(svc.void('sale-1', 'user-9')).rejects.toThrow(ConflictException);
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('rechaza si la venta no existe', async () => {
      const svc = buildService();
      mockPrisma.sale.findUnique.mockResolvedValue(null);

      await expect(svc.void('sale-x', 'user-9')).rejects.toThrow(NotFoundException);
    });
  });

  describe('byProduct — agrupación por categoría', () => {
    it('agrupa dos items del mismo producto y separa categorías', async () => {
      const svc = buildService();
      mockPrisma.sale.findMany.mockResolvedValue([
        {
          items: [
            {
              productName: 'Hamburguesa Clásica',
              unitPrice: 55000,
              quantity: 2,
              discount: 0,
              product: { id: 'prod-1', name: 'Hamburguesa Clásica', category: { name: 'Comidas' } },
            },
            {
              productName: 'Coca-Cola',
              unitPrice: 8000,
              quantity: 1,
              discount: 0,
              product: { id: 'prod-2', name: 'Coca-Cola', category: { name: 'Bebidas' } },
            },
          ],
        },
        {
          items: [
            {
              productName: 'Hamburguesa Clásica',
              unitPrice: 55000,
              quantity: 1,
              discount: 1000,
              product: { id: 'prod-1', name: 'Hamburguesa Clásica', category: { name: 'Comidas' } },
            },
          ],
        },
      ]);

      const result = await svc.byProduct({});

      expect(mockPrisma.sale.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ voidedAt: null }) }),
      );

      expect(result.categories).toEqual([
        {
          category: 'Bebidas',
          products: [{ productName: 'Coca-Cola', quantity: 1, amount: 8000 }],
          totalQuantity: 1,
          totalAmount: 8000,
        },
        {
          category: 'Comidas',
          products: [
            {
              productName: 'Hamburguesa Clásica',
              quantity: 3,
              // (55000*2 - 0) + (55000*1 - 1000) = 110000 + 54000 = 164000
              amount: 164000,
            },
          ],
          totalQuantity: 3,
          totalAmount: 164000,
        },
      ]);
    });
  });

  describe('byDriver — agrupación por repartidor', () => {
    it('agrupa dos ventas del mismo repartidor', async () => {
      const svc = buildService();
      mockPrisma.sale.findMany.mockResolvedValue([
        { total: 1000, driver: { name: 'Marcelo Píriz' } },
        { total: 2000, driver: { name: 'Marcelo Píriz' } },
        { total: 500, driver: { name: 'Ana Gómez' } },
      ]);

      const result = await svc.byDriver({});

      expect(mockPrisma.sale.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ voidedAt: null, driverId: { not: null } }),
        }),
      );

      expect(result.drivers).toEqual([
        { driver: 'Marcelo Píriz', count: 2, total: 3000 },
        { driver: 'Ana Gómez', count: 1, total: 500 },
      ]);
    });
  });
});
