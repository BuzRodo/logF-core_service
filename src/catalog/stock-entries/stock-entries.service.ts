import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { IvaRate } from '../../../generated/prisma/client';
import { CreateStockEntryDto, StockEntryFilterDto } from './dto/stock-entry.dto';

const INGREDIENT_SELECT = { select: { id: true, name: true, unit: true } };
const INVOICE_SELECT = { select: { id: true, series: true, number: true, voucherType: true } };

@Injectable()
export class StockEntriesService {
  constructor(private prisma: PrismaService) {}

  findAll(filters: StockEntryFilterDto = {}) {
    return this.prisma.stockEntry.findMany({
      where: { ...(filters.ingredientId && { ingredientId: filters.ingredientId }) },
      include: { ingredient: INGREDIENT_SELECT, purchaseInvoice: INVOICE_SELECT },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Lotes vencidos o que vencen dentro de `days` días. */
  expiring(days = 7) {
    const limit = new Date();
    limit.setDate(limit.getDate() + days);
    return this.prisma.stockEntry.findMany({
      where: { expiryDate: { not: null, lte: limit } },
      include: { ingredient: INGREDIENT_SELECT, purchaseInvoice: INVOICE_SELECT },
      orderBy: { expiryDate: 'asc' },
    });
  }

  /**
   * Registra la entrada y suma el stock del ingrediente en la misma transacción.
   *
   * Acepta un ingrediente existente (`ingredientId`) o el alta de uno nuevo al vuelo
   * (`newIngredient`) — exactamente uno de los dos (mismo criterio que
   * `PurchaseInvoicesService.create`, ver ese servicio para el patrón replicado). Con
   * `newIngredient`, el ingrediente se crea con stock 0 y el lote de abajo lo incrementa.
   */
  async create(dto: CreateStockEntryDto, createdBy: string) {
    const hasExisting = !!dto.ingredientId;
    const hasNew = !!dto.newIngredient;
    if (hasExisting === hasNew) {
      throw new BadRequestException(
        'Indicá un insumo existente (ingredientId) o los datos de uno nuevo (newIngredient), no ambos ni ninguno',
      );
    }

    let existingIvaRate: IvaRate | null = null;
    if (dto.newIngredient) {
      const collision = await this.prisma.ingredient.findFirst({
        where: { name: dto.newIngredient.name.trim() },
      });
      if (collision) {
        throw new ConflictException(
          `Ya existe un insumo con ese nombre: ${collision.name}. Seleccionalo de la lista.`,
        );
      }
    } else {
      const ingredient = await this.prisma.ingredient.findUnique({ where: { id: dto.ingredientId } });
      if (!ingredient) throw new NotFoundException('Ingrediente no encontrado');
      if (!ingredient.active) throw new BadRequestException('El ingrediente está inactivo');
      existingIvaRate = ingredient.ivaRate;
    }

    return this.prisma.$transaction(async (tx) => {
      let ingredientId: string;
      let ivaRate: IvaRate | null;

      if (dto.newIngredient) {
        const created = await tx.ingredient.create({
          data: {
            name: dto.newIngredient.name.trim(),
            unit: dto.newIngredient.unit,
            supplier: dto.newIngredient.supplier?.trim() || undefined,
            ivaRate: dto.newIngredient.ivaRate ?? null,
            costPerUnit: 0, // sin dato de costo en este flujo; se completa después en Insumos
            stockGrams: 0, // el lote de abajo lo incrementa
          },
        });
        ingredientId = created.id;
        ivaRate = created.ivaRate;
      } else {
        ingredientId = dto.ingredientId!;
        ivaRate = existingIvaRate;
      }

      const entry = await tx.stockEntry.create({
        data: {
          ingredientId,
          quantity: dto.quantity,
          expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
          ivaRate,
          note: dto.note,
          createdBy,
        },
        include: { ingredient: INGREDIENT_SELECT },
      });
      await tx.ingredient.update({
        where: { id: ingredientId },
        data: { stockGrams: { increment: dto.quantity } },
      });
      return entry;
    });
  }

  /** Elimina la entrada (carga errónea) y descuenta lo que había sumado. */
  async remove(id: string) {
    const entry = await this.prisma.stockEntry.findUnique({
      where: { id },
      include: { purchaseInvoice: { select: { series: true, number: true } } },
    });
    if (!entry) throw new NotFoundException('Entrada de stock no encontrada');

    if (entry.purchaseInvoiceId) {
      const label = entry.purchaseInvoice
        ? `${entry.purchaseInvoice.series}-${entry.purchaseInvoice.number}`
        : entry.purchaseInvoiceId;
      throw new ConflictException(
        `Este lote está vinculado a la factura ${label}; corregilo desde Facturas`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.stockEntry.delete({ where: { id } });
      await tx.ingredient.update({
        where: { id: entry.ingredientId },
        data: { stockGrams: { decrement: entry.quantity } },
      });
      return entry;
    });
  }
}
