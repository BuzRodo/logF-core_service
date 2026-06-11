import {
  Injectable, NotFoundException, BadRequestException, UnprocessableEntityException, Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { CashSessionsService } from '../cash-sessions/cash-sessions.service';
import { calcItemCost } from '../../catalog/products/products.service';
import { CreateSaleDto, SaleFilterDto } from './dto/sale.dto';
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
        ...(filters.from && { createdAt: { gte: new Date(filters.from) } }),
        ...(filters.to && { createdAt: { lte: new Date(filters.to + 'T23:59:59') } }),
        ...(filters.cashierId && { cashierId: filters.cashierId }),
      },
      include: {
        items: true,
        cashier: { select: { id: true, displayName: true } },
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
      },
    });
    if (!sale) throw new NotFoundException('Venta no encontrada');
    return sale;
  }
}
