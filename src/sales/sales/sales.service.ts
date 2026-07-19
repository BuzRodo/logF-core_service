import {
  Injectable, NotFoundException, BadRequestException, UnprocessableEntityException, ConflictException, Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { CashSessionsService } from '../cash-sessions/cash-sessions.service';
import { calcItemCost } from '../../catalog/products/products.service';
import { CreateSaleDto, SaleFilterDto, SalesSummaryFilterDto, SalesByProductFilterDto, SummaryGranularity } from './dto/sale.dto';
import { PaymentMethod } from '../../../generated/prisma/client';

@Injectable()
export class SalesService {
  private readonly logger = new Logger(SalesService.name);
  private readonly taxRate: number;

  constructor(
    private prisma: PrismaService,
    private cashSessions: CashSessionsService,
    private config: ConfigService,
  ) {
    this.taxRate = this.config.get<number>('TAX_RATE') ?? 0.22;
  }

  /** Filtro de rango de fechas: combina gte/lte en un solo objeto (no se pisan). */
  private createdAtRange(from?: string, to?: string) {
    if (!from && !to) return {};
    return {
      createdAt: {
        ...(from && { gte: new Date(from) }),
        ...(to && { lte: new Date(to + 'T23:59:59') }),
      },
    };
  }

  // ─── Número de factura secuencial ────────────────────────────────────────
  private async nextInvoiceNumber(): Promise<string> {
    const count = await this.prisma.sale.count();
    return `F-${String(count + 1).padStart(6, '0')}`;
  }

  async create(dto: CreateSaleDto, cashierId: string) {
    // 1. Validar sesión de caja
    const session = await this.cashSessions.findOne(dto.cashSessionId);
    if (session.status !== 'OPEN') {
      throw new BadRequestException('La sesión de caja no está abierta');
    }

    // 2. Cargar productos desde la DB (no confiar en precios del cliente)
    const productIds = dto.items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, active: true },
      include: { recipeItems: { include: { ingredient: true } } },
    });

    if (products.length !== productIds.length) {
      const found = products.map((p) => p.id);
      const missing = productIds.filter((id) => !found.includes(id));
      throw new BadRequestException(`Productos no encontrados o inactivos: ${missing.join(', ')}`);
    }

    const productMap = new Map(products.map((p) => [p.id, p]));

    // 3. Calcular totales server-side
    let subtotal = 0;
    const lineItems = dto.items.map((item) => {
      const product = productMap.get(item.productId)!;
      const discount = item.discount ?? 0;
      const lineTotal = product.price * item.quantity - discount;
      subtotal += lineTotal;

      const costAtSale = product.recipeItems.reduce((sum, ri) => {
        return sum + calcItemCost(ri.ingredient.unit, ri.quantity, ri.ingredient.costPerUnit);
      }, 0) * item.quantity;

      return {
        productId: item.productId,
        productName: product.name,
        unitPrice: product.price,
        quantity: item.quantity,
        discount,
        costAtSale,
      };
    });

    const afterGlobalDiscount = subtotal - dto.globalDiscount;
    if (afterGlobalDiscount < 0) {
      throw new UnprocessableEntityException('El descuento global supera el subtotal');
    }

    const tax = Math.round(afterGlobalDiscount * this.taxRate);
    const total = afterGlobalDiscount + tax;

    // 4. Pago con tarjeta: verificar que venga el transactionId
    if (dto.paymentMethod === PaymentMethod.CARD && !dto.cardTransactionId) {
      throw new BadRequestException('Se requiere cardTransactionId para pagos con tarjeta');
    }

    // 4b. Canal distinto de LOCAL requiere referencia (nro de factura/pedido del canal)
    if (dto.channel && dto.channel !== 'LOCAL' && !dto.channelRef) {
      throw new BadRequestException(`El canal ${dto.channel} requiere el número de factura/pedido`);
    }

    // 4c. Cliente opcional: si viene, debe existir y estar activo
    if (dto.customerId) {
      const customer = await this.prisma.customer.findUnique({ where: { id: dto.customerId } });
      if (!customer || !customer.active) {
        throw new BadRequestException('Cliente no encontrado o inactivo');
      }
    }

    // 4d. Repartidor opcional: si viene, debe existir y estar activo
    if (dto.driverId) {
      const driver = await this.prisma.deliveryDriver.findUnique({ where: { id: dto.driverId } });
      if (!driver || !driver.active) {
        throw new BadRequestException('Repartidor no encontrado o inactivo');
      }
    }

    // 5. Persistir venta + ítems en una transacción de DB
    const invoiceNumber = await this.nextInvoiceNumber();

    const sale = await this.prisma.$transaction(async (tx) => {
      const newSale = await tx.sale.create({
        data: {
          invoiceNumber,
          subtotal,
          globalDiscount: dto.globalDiscount,
          tax,
          total,
          paymentMethod: dto.paymentMethod,
          cardTransactionId: dto.cardTransactionId,
          authorizationCode: dto.authorizationCode,
          channel: dto.channel ?? 'LOCAL',
          channelRef: dto.channelRef ?? null,
          customerId: dto.customerId ?? null,
          driverId: dto.driverId ?? null,
          cashSessionId: dto.cashSessionId,
          cashierId,
          items: { create: lineItems },
        },
        include: { items: true },
      });

      // 6. Descontar stock de ingredientes según receta
      for (const item of dto.items) {
        const product = productMap.get(item.productId)!;
        for (const ri of product.recipeItems) {
          await tx.ingredient.update({
            where: { id: ri.ingredientId },
            data: { stockGrams: { decrement: ri.quantity * item.quantity } },
          });
        }
      }

      return newSale;
    });

    this.logger.log(`Venta registrada: ${sale.invoiceNumber} — total: ${sale.total} — método: ${sale.paymentMethod}`);
    return sale;
  }

  async findAll(filters: SaleFilterDto) {
    return this.prisma.sale.findMany({
      where: {
        ...this.createdAtRange(filters.from, filters.to),
        ...(filters.cashierId && { cashierId: filters.cashierId }),
        ...(filters.invoiceNumber && { invoiceNumber: filters.invoiceNumber }),
        ...(filters.channel && { channel: filters.channel as any }),
      },
      include: {
        items: true,
        cashier: { select: { id: true, displayName: true } },
        customer: { select: { id: true, name: true, phone: true, address: true } },
        driver: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const sale = await this.prisma.sale.findUnique({
      where: { id },
      include: {
        items: { include: { product: { select: { id: true, sku: true } } } },
        cashier: { select: { id: true, displayName: true } },
        cashSession: true,
        customer: { select: { id: true, name: true, phone: true, address: true } },
        driver: { select: { id: true, name: true } },
      },
    });
    if (!sale) throw new NotFoundException('Venta no encontrada');
    return sale;
  }

  /** Clave del bucket temporal en hora local del servidor. */
  private bucketKey(date: Date, granularity: SummaryGranularity): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    switch (granularity) {
      case 'year':
        return String(date.getFullYear());
      case 'month':
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
      case 'week': {
        // Semana que arranca el lunes
        const d = new Date(date);
        const day = (d.getDay() + 6) % 7; // lunes=0 … domingo=6
        d.setDate(d.getDate() - day);
        return ymd(d);
      }
      default:
        return ymd(date);
    }
  }

  /** Serie histórica de ventas agrupada por período (excluye anuladas). */
  async summary(filters: SalesSummaryFilterDto) {
    const granularity: SummaryGranularity = filters.granularity ?? 'day';
    const sales = await this.prisma.sale.findMany({
      where: {
        voidedAt: null,
        ...this.createdAtRange(filters.from, filters.to),
      },
      select: { createdAt: true, total: true },
      orderBy: { createdAt: 'asc' },
    });

    const buckets = new Map<string, { period: string; total: number; count: number }>();
    for (const sale of sales) {
      const key = this.bucketKey(sale.createdAt, granularity);
      const bucket = buckets.get(key) ?? { period: key, total: 0, count: 0 };
      bucket.total += sale.total;
      bucket.count += 1;
      buckets.set(key, bucket);
    }
    return { granularity, buckets: [...buckets.values()] };
  }

  /** Anula por número de ticket (para el POS, que no puede listar ventas). */
  async voidByInvoice(invoiceNumber: string, userId: string) {
    const sale = await this.prisma.sale.findUnique({ where: { invoiceNumber } });
    if (!sale) throw new NotFoundException(`No existe la venta ${invoiceNumber}`);
    return this.void(sale.id, userId);
  }

  /** Anula la venta y devuelve el stock de ingredientes según la receta vigente. */
  async void(id: string, userId: string) {
    const sale = await this.prisma.sale.findUnique({
      where: { id },
      include: {
        items: { include: { product: { include: { recipeItems: true } } } },
      },
    });
    if (!sale) throw new NotFoundException('Venta no encontrada');
    if (sale.voidedAt) throw new ConflictException(`La venta ${sale.invoiceNumber} ya está anulada`);

    const voided = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.sale.update({
        where: { id },
        data: { voidedAt: new Date(), voidedBy: userId },
      });

      for (const item of sale.items) {
        for (const ri of item.product.recipeItems) {
          await tx.ingredient.update({
            where: { id: ri.ingredientId },
            data: { stockGrams: { increment: ri.quantity * item.quantity } },
          });
        }
      }

      return updated;
    });

    this.logger.log(`Venta anulada: ${voided.invoiceNumber} — por usuario ${userId}`);
    return voided;
  }

  /** Ventas por producto agrupadas por categoría (excluye anuladas). */
  async byProduct(filters: { from?: string; to?: string; channel?: string }) {
    const sales = await this.prisma.sale.findMany({
      where: {
        voidedAt: null,
        ...this.createdAtRange(filters.from, filters.to),
        ...(filters.channel && { channel: filters.channel as any }),
      },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, category: { select: { name: true } } } },
          },
        },
      },
    });

    const categoryMap = new Map<string, Map<string, { productName: string; quantity: number; amount: number }>>();

    for (const sale of sales) {
      for (const item of sale.items) {
        const categoryName = item.product.category?.name ?? 'Sin categoría';
        const amount = item.unitPrice * item.quantity - item.discount;

        if (!categoryMap.has(categoryName)) categoryMap.set(categoryName, new Map());
        const productsMap = categoryMap.get(categoryName)!;

        const existing = productsMap.get(item.productName) ?? {
          productName: item.productName,
          quantity: 0,
          amount: 0,
        };
        existing.quantity += item.quantity;
        existing.amount += amount;
        productsMap.set(item.productName, existing);
      }
    }

    const categories = [...categoryMap.entries()]
      .map(([category, productsMap]) => {
        const products = [...productsMap.values()].sort((a, b) => b.amount - a.amount);
        const totalQuantity = products.reduce((sum, p) => sum + p.quantity, 0);
        const totalAmount = products.reduce((sum, p) => sum + p.amount, 0);
        return { category, products, totalQuantity, totalAmount };
      })
      .sort((a, b) => a.category.localeCompare(b.category));

    return { categories };
  }

  /** Ventas por repartidor (excluye anuladas, solo ventas con repartidor asignado). */
  async byDriver(filters: { from?: string; to?: string }) {
    const sales = await this.prisma.sale.findMany({
      where: {
        voidedAt: null,
        driverId: { not: null },
        ...this.createdAtRange(filters.from, filters.to),
      },
      include: {
        driver: { select: { name: true } },
      },
    });

    const driverMap = new Map<string, { driver: string; count: number; total: number }>();
    for (const sale of sales) {
      const driverName = sale.driver?.name ?? 'Sin nombre';
      const existing = driverMap.get(driverName) ?? { driver: driverName, count: 0, total: 0 };
      existing.count += 1;
      existing.total += sale.total;
      driverMap.set(driverName, existing);
    }

    const drivers = [...driverMap.values()].sort((a, b) => b.total - a.total);
    return { drivers };
  }
}
